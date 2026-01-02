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
        
        # Initialize Supabase for logging
        self.supabase: Client = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception as e:
                print(f"Supabase Init Error: {e}")

    # ------------------------------------------------------------------
    # LOGGING
    # ------------------------------------------------------------------
    def log_execution(self, node_id, node_type, inputs, output, status="success"):
        """Writes execution details to Supabase."""
        if not self.supabase or not self.user_id: return

        try:
            log_entry = {
                "user_id": self.user_id,
                "flow_id": self.flow_id,
                "node_id": node_id,
                "node_type": node_type,
                "inputs": inputs, 
                "outputs": str(output)[:2000], # Truncate large outputs
                "status": status,
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
            raise e # Raise to top level to show in UI
        
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

        # 1. Models
        if node_type == 'groqModel':
            key = data.get('apiKey') or self.keys.get('groq_api_key')
            return Groq(id=data.get('model', "llama-3.3-70b-versatile"), api_key=key)
        
        if node_type == 'openaiModel':
            key = data.get('apiKey') or self.keys.get('openai_api_key')
            return OpenAIChat(id=data.get('model', "gpt-4o"), api_key=key)

        # 2. Tools
        if node_type == 'webSearchNode': return DuckDuckGoTools()
        if node_type == 'gmailNode':
            return SimpleGmailTools(sender_email=data.get('email'), app_password=data.get('password')) if SimpleGmailTools else None

        # 3. Agents (FIXED LOGIC HERE)
        if node_type == 'agentNode':
            # Collect ALL predecessors executed
            predecessors_results = []
            for u in self.graph.predecessors(node.id):
                res = self.execute_node(u)
                if res: predecessors_results.append(res)

            # INTELLIGENT SORTING
            model = None
            tools = []
            knowledge = None

            for res in predecessors_results:
                # Check if it's a Model
                if isinstance(res, (Groq, OpenAIChat)):
                    model = res
                # Check if it's a Tool (DuckDuckGo, etc)
                elif hasattr(res, 'register') or isinstance(res, (DuckDuckGoTools, YFinanceTools)):
                    tools.append(res)
                # Check if it's a Knowledge Base
                elif hasattr(res, 'vector_db') or hasattr(res, 'search'):
                    knowledge = res
            
            # If no model found, we rely on Agno default or error out
            # To fix your specific error, we ensure model is passed if found
            return Agent(
                model=model, # Will be None if not found, triggering Agno default (OpenAI)
                tools=tools,
                knowledge=knowledge,
                description=data.get('systemPrompt', "You are a helpful AI."),
                markdown=True
            )

        # 4. RAG Components
        if node_type == 'vectorStore':
            pass # RAG logic typically handled by manager, or return KB object here if connected

        # 5. I/O
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
        
        # Also look for Model Nodes if Agent is missing (Simple LLM Flow)
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
            
            # CASE B: Simple Model Flow (No Agent Node)
            if model_node:
                model_instance = self.execute_node(model_node.id)
                if hasattr(model_instance, 'id'): 
                    temp_agent = Agent(model=model_instance, markdown=True)
                    return temp_agent.run(message).content
                return str(model_instance)

            # CASE C: Custom Component
            if custom_node:
                res = self.execute_node(custom_node.id)
                return str(res)

            return "Error: No valid Agent or Custom Logic found."

        except Exception as e:
            traceback.print_exc()
            return f"Execution Error: {str(e)}"