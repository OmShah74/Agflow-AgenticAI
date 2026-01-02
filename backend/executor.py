import os
import networkx as nx
from typing import Dict, Any, List
import traceback
import json
import re  # Added for Regex redaction
from datetime import datetime
from supabase import create_client, Client 

# --- Agno Framework Imports ---
from agno.agent import Agent
from agno.models.groq import Groq
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.yfinance import YFinanceTools

# --- Local Imports ---
try:
    from tools import SimpleGmailTools 
except ImportError:
    SimpleGmailTools = None

from rag_manager import RAGManager

# --- Environment Variables ---
DB_URL = os.getenv("DB_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class FlowExecutor:
    def __init__(self, flow_data, user_keys: Dict[str, str]):
        self.nodes = {n.id: n for n in flow_data.nodes}
        self.edges = flow_data.edges
        self.keys = user_keys
        
        # Logging Metadata
        self.user_id = getattr(flow_data, 'user_id', None)
        self.flow_id = getattr(flow_data, 'flow_id', None)
        
        self.graph = self.build_graph()
        self.rag_manager = None
        self.execution_cache = {}
        
        # Initialize Supabase for logging
        self.supabase: Client = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception as e:
                print(f"Supabase Init Error: {e}")

    # ------------------------------------------------------------------
    # SANITIZATION & LOGGING
    # ------------------------------------------------------------------
    def _sanitize_data(self, data: Any) -> Any:
        """
        Recursively removes sensitive keys from dicts and 
        uses Regex to scrub api_key='...' patterns from strings.
        """
        # 1. Handle Dictionaries
        if isinstance(data, dict):
            clean_dict = {}
            for k, v in data.items():
                if any(secret in k.lower() for secret in ['api_key', 'password', 'secret', 'token']):
                    clean_dict[k] = "********"
                else:
                    clean_dict[k] = self._sanitize_data(v)
            return clean_dict
        
        # 2. Handle Lists
        if isinstance(data, list):
            return [self._sanitize_data(item) for item in data]
        
        # 3. Handle Strings (The most important part for Object reprs)
        if isinstance(data, str):
            # Regex to catch api_key='xyz' or api_key="xyz" or api_key: "xyz"
            # Captures the key name and replaces the value
            pattern = r"(api_key|password|secret|token)\s*(=|:)\s*(['\"])(.*?)(\3)"
            return re.sub(pattern, r"\1\2\3********\5", data, flags=re.IGNORECASE)

        return data

    def log_execution(self, node_id, node_type, inputs, output, status="success"):
        """Writes sanitized execution details to Supabase."""
        if not self.supabase or not self.user_id: return

        # 1. Detect Error in Output String (JSON errors or Exception strings)
        final_status = status
        str_output = str(output)
        
        if "error" in str_output.lower():
            # Check for common error signatures
            if '"type":' in str_output and '"code":' in str_output: # JSON Error
                final_status = "error"
            elif str_output.startswith("Error:") or "traceback" in str_output.lower():
                final_status = "error"
            elif "invalid_api_key" in str_output.lower():
                final_status = "error"

        # 2. Sanitize Inputs and Outputs
        safe_inputs = self._sanitize_data(inputs)
        safe_output = self._sanitize_data(str_output)

        try:
            log_entry = {
                "user_id": self.user_id,
                "flow_id": self.flow_id,
                "node_id": node_id,
                "node_type": node_type,
                "inputs": safe_inputs, 
                "outputs": safe_output[:5000], # Allow larger logs
                "status": final_status,
                "timestamp": datetime.now().isoformat()
            }
            self.supabase.table("run_logs").insert(log_entry).execute()
        except Exception as e:
            print(f"Logging failed: {e}")

    # ------------------------------------------------------------------
    # GRAPH & RESOURCES
    # ------------------------------------------------------------------
    def get_rag_manager(self):
        if self.rag_manager is None and DB_URL:
            try:
                self.rag_manager = RAGManager(DB_URL)
            except Exception as e:
                print(f"DB Error: {e}")
                return None
        return self.rag_manager

    def build_graph(self):
        G = nx.DiGraph()
        for node in self.nodes.values():
            G.add_node(node.id, type=node.type, config=node.data)
        for edge in self.edges:
            G.add_edge(edge.source, edge.target, target_handle=edge.targetHandle)
        return G

    # ------------------------------------------------------------------
    # INPUT RESOLUTION
    # ------------------------------------------------------------------
    def resolve_node_input(self, node_id, arg_name=None):
        """Finds executed result of a predecessor node."""
        predecessors = list(self.graph.in_edges(node_id, data=True))
        
        if arg_name:
            for u, v, data in predecessors:
                if data.get('target_handle') == arg_name:
                    return self.execute_node(u)
        
        results = []
        for u, v, data in predecessors:
            res = self.execute_node(u)
            if res is not None:
                results.append(res)
        
        if not results: return None
        return results[0] if len(results) == 1 else results

    def resolve_all_inputs(self, node_id):
        """Map all incoming edges to their target handle names."""
        inputs = {}
        for u, v, data in self.graph.in_edges(node_id, data=True):
            handle = data.get('target_handle')
            if handle:
                inputs[handle] = self.execute_node(u)
        return inputs

    # ------------------------------------------------------------------
    # NODE EXECUTION DISPATCHER
    # ------------------------------------------------------------------
    def execute_node(self, node_id):
        if node_id in self.execution_cache:
            return self.execution_cache[node_id]

        node = self.nodes[node_id]
        result = None
        status = "success"
        inputs_log = {}

        try:
            inputs_log = self.resolve_all_inputs(node_id)
            
            # ROUTING
            if node.data.get('isCustom') and node.data.get('code'):
                result = self.run_custom_code(node)
            else:
                result = self.run_standard_logic(node)
            
        except Exception as e:
            status = "error"
            result = f"Error: {str(e)}"
            # traceback.print_exc() # Optional: Print to console for debugging
        
        finally:
            self.log_execution(node_id, node.type, inputs_log, result, status)

        self.execution_cache[node_id] = result
        return result

    # ------------------------------------------------------------------
    # LOGIC: CUSTOM
    # ------------------------------------------------------------------
    def run_custom_code(self, node):
        code = node.data.get('code')
        inputs = self.resolve_all_inputs(node.id)
        
        if 'api_key' in code and 'api_key' not in inputs:
            inputs['api_key'] = self.keys.get('groq_api_key') or self.keys.get('openai_api_key')

        local_scope = {}
        try:
            exec(code, globals(), local_scope)
            ComponentClass = local_scope.get('CustomComponent')
            if not ComponentClass: return f"Error: Class CustomComponent not found"
            
            instance = ComponentClass()
            
            import inspect
            sig = inspect.signature(instance.build)
            valid_args = {k: v for k, v in inputs.items() if k in sig.parameters}
            
            return instance.build(**valid_args)
        except Exception as e:
            raise e

    # ------------------------------------------------------------------
    # LOGIC: STANDARD
    # ------------------------------------------------------------------
    def run_standard_logic(self, node):
        data = node.data
        node_type = node.type

        if node_type == 'groqModel':
            key = data.get('apiKey') or self.keys.get('groq_api_key')
            return Groq(id=data.get('model', "llama-3.3-70b-versatile"), api_key=key)
        
        if node_type == 'openaiModel':
            key = data.get('apiKey') or self.keys.get('openai_api_key')
            return OpenAIChat(id=data.get('model', "gpt-4o"), api_key=key)

        if node_type == 'webSearchNode': return DuckDuckGoTools()
        if node_type == 'gmailNode':
            return SimpleGmailTools(sender_email=data.get('email'), app_password=data.get('password')) if SimpleGmailTools else None

        if node_type == 'agentNode':
            predecessors_results = []
            for u in self.graph.predecessors(node.id):
                res = self.execute_node(u)
                if res: predecessors_results.append(res)

            model = None
            tools = []
            knowledge = None

            for res in predecessors_results:
                if isinstance(res, (Groq, OpenAIChat)):
                    model = res
                elif hasattr(res, 'register') or isinstance(res, (DuckDuckGoTools, YFinanceTools)):
                    tools.append(res)
                elif hasattr(res, 'vector_db') or hasattr(res, 'search'):
                    knowledge = res
            
            return Agent(
                model=model,
                tools=tools,
                knowledge=knowledge,
                description=data.get('systemPrompt', "You are a helpful AI."),
                markdown=True
            )

        if node_type == 'vectorStore':
            pass 

        if node_type == 'chatInput': return None
        if node_type == 'textInput' or node_type == 'promptTemplate':
            return data.get('value') or data.get('template')

        return None

    # ------------------------------------------------------------------
    # EXECUTION ENTRY POINT
    # ------------------------------------------------------------------
    def execute(self, message: str):
        print("--- Pipeline Started ---")
        self.execution_cache = {} 
        
        agent_node = next((n for n in self.nodes.values() if n.type == 'agentNode'), None)
        model_node = next((n for n in self.nodes.values() if n.type in ['groqModel', 'openaiModel']), None)
        custom_node = next((n for n in self.nodes.values() if n.data.get('isCustom')), None)
        
        chat_input_node = next((n for n in self.nodes.values() if n.type == 'chatInput'), None)
        if chat_input_node:
            self.execution_cache[chat_input_node.id] = message
            self.log_execution(chat_input_node.id, 'chatInput', {}, message)

        try:
            if agent_node:
                agent_instance = self.execute_node(agent_node.id)
                if isinstance(agent_instance, Agent):
                    return agent_instance.run(message).content
                return str(agent_instance)
            
            if model_node:
                model_instance = self.execute_node(model_node.id)
                if hasattr(model_instance, 'id'): 
                    temp_agent = Agent(model=model_instance, markdown=True)
                    return temp_agent.run(message).content
                return str(model_instance)

            if custom_node:
                res = self.execute_node(custom_node.id)
                return str(res)

            return "Error: No valid Agent or Custom Logic found."

        except Exception as e:
            # We catch it here to return it to the frontend, but we also log it as an error
            err_msg = f"Execution Error: {str(e)}"
            # Log the final failure
            self.log_execution("root", "pipeline", {}, err_msg, status="error")
            return err_msg