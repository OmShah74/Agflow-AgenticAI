import os
import networkx as nx
from typing import Dict, Any, List
import traceback
import json
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
        
        # Initialize Supabase
        self.supabase: Client = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                print("✅ Executor: Supabase connected for logging.")
            except Exception as e:
                print(f"❌ Executor: Supabase Connection Failed: {e}")
        else:
            print("⚠️ Executor: SUPABASE_URL or SUPABASE_KEY missing in backend/.env. Logging Disabled.")

    def log_execution(self, node_id, node_type, inputs, output, status="success"):
        """Writes execution details to Supabase."""
        if not self.supabase:
            print(f"⚠️ Skipping Log (No Supabase): {node_type}")
            return
        
        if not self.user_id: 
            print(f"⚠️ Skipping Log (No User ID): {node_type}")
            return

        try:
            log_entry = {
                "user_id": self.user_id,
                "flow_id": self.flow_id,
                "node_id": node_id,
                "node_type": node_type,
                "inputs": inputs, 
                "outputs": str(output)[:2000], 
                "status": status,
                "timestamp": datetime.now().isoformat()
            }
            self.supabase.table("run_logs").insert(log_entry).execute()
            print(f"📝 Log Saved: {node_type} ({status})")
            
        except Exception as e:
            print(f"❌ Logging Insert Failed: {e}")

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
            # We map target_handle to correctly route inputs for custom nodes
            G.add_edge(edge.source, edge.target, target_handle=edge.targetHandle)
        return G

    # ------------------------------------------------------------------
    # INPUT RESOLUTION
    # ------------------------------------------------------------------
    def resolve_node_input(self, node_id, arg_name=None):
        """Finds executed result of a predecessor node."""
        predecessors = list(self.graph.in_edges(node_id, data=True))
        
        # 1. Match specific handle (for Custom Components)
        if arg_name:
            for u, v, data in predecessors:
                if data.get('target_handle') == arg_name:
                    return self.execute_node(u)
        
        # 2. Match generic dependencies (Model -> Agent)
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
            
            # ROUTING: Custom Code vs Standard Logic
            if node.data.get('isCustom') and node.data.get('code'):
                result = self.run_custom_code(node)
            else:
                result = self.run_standard_logic(node)
            
        except Exception as e:
            status = "error"
            result = str(e)
            traceback.print_exc()
            # Don't re-raise here if we want to log the error, 
            # but usually better to let the main loop handle it.
            # We return the error string so the flow can continue or fail gracefully.
        
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
        
        # Auto-inject API keys if the code variable requests them
        if 'api_key' in code and 'api_key' not in inputs:
            inputs['api_key'] = self.keys.get('groq_api_key') or self.keys.get('openai_api_key')

        local_scope = {}
        try:
            exec(code, globals(), local_scope)
            ComponentClass = local_scope.get('CustomComponent')
            if not ComponentClass: return f"Error: Class CustomComponent not found"
            
            instance = ComponentClass()
            
            # Filter inputs to match signature
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

        # Models
        if node_type == 'groqModel':
            key = data.get('apiKey') or self.keys.get('groq_api_key')
            return Groq(id=data.get('model', "llama-3.3-70b-versatile"), api_key=key)
        
        if node_type == 'openaiModel':
            key = data.get('apiKey') or self.keys.get('openai_api_key')
            return OpenAIChat(id=data.get('model', "gpt-4o"), api_key=key)

        # Tools
        if node_type == 'webSearchNode': return DuckDuckGoTools()
        if node_type == 'gmailNode':
            return SimpleGmailTools(sender_email=data.get('email'), app_password=data.get('password')) if SimpleGmailTools else None

        # Agents
        if node_type == 'agentNode':
            model = self.resolve_node_input(node.id)
            # Find tools in predecessors
            tools = []
            for u in self.graph.predecessors(node.id):
                res = self.execute_node(u)
                # Naive check for tools
                if hasattr(res, 'register') or isinstance(res, DuckDuckGoTools) or isinstance(res, YFinanceTools):
                    tools.append(res)
            
            # RAG Knowledge Base
            knowledge = None
            # Check if any predecessor returned a Knowledge object (from VectorStore node)
            for u in self.graph.predecessors(node.id):
                res = self.execute_node(u)
                # Check for Agno Knowledge Base type (or duck typing)
                if hasattr(res, 'vector_db') or hasattr(res, 'search'): 
                    knowledge = res

            return Agent(
                model=model if hasattr(model, 'id') else None,
                tools=tools,
                knowledge=knowledge,
                description=data.get('systemPrompt', "You are a helpful AI."),
                markdown=True
            )

        # RAG Components
        if node_type == 'vectorStore':
            # This logic mimics RAGManager but inside the graph flow
            # Requires predecessors: PDF Loader
            # Note: This is complex in standard logic without the manager instance passed around
            # For standard nodes, we might rely on the Custom Code Template for VectorStore which is more robust
            pass 

        # I/O
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
        
        # 1. Identify Key Nodes
        agent_node = next((n for n in self.nodes.values() if n.type == 'agentNode'), None)
        
        # FIX: Also look for Model Nodes if Agent is missing (Simple LLM Flow)
        model_node = next((n for n in self.nodes.values() if n.type in ['groqModel', 'openaiModel']), None)
        
        custom_node = next((n for n in self.nodes.values() if n.data.get('isCustom')), None)
        
        # Inject Chat Input
        chat_input_node = next((n for n in self.nodes.values() if n.type == 'chatInput'), None)
        if chat_input_node:
            self.execution_cache[chat_input_node.id] = message
            self.log_execution(chat_input_node.id, 'chatInput', {}, message)

        try:
            # CASE A: Standard Agent Flow
            if agent_node:
                agent_instance = self.execute_node(agent_node.id)
                if isinstance(agent_instance, Agent):
                    return agent_instance.run(message).content
                return str(agent_instance)
            
            # CASE B: Simple Model Flow (No Agent Node) - FIX APPLIED HERE
            if model_node:
                model_instance = self.execute_node(model_node.id)
                # If we got a Model object back, wrap it in a temporary agent
                if hasattr(model_instance, 'id'): 
                    temp_agent = Agent(model=model_instance, markdown=True)
                    return temp_agent.run(message).content
                return str(model_instance)

            # CASE C: Custom Component Execution (if main)
            if custom_node:
                # If a custom node exists and we haven't returned yet, try running it
                # We assume the last custom node is the output
                # In a real graph, we'd find the node with no out-edges
                res = self.execute_node(custom_node.id)
                return str(res)

            return "Error: No valid Agent or Custom Logic found."

        except Exception as e:
            traceback.print_exc()
            return f"Execution Error: {str(e)}"