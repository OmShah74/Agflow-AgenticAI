import os
import networkx as nx
from typing import Dict, Any, List
import traceback
import sys

# --- Agno Framework Imports ---
from agno.agent import Agent
from agno.models.groq import Groq
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.yfinance import YFinanceTools

# --- Local Modules ---
try:
    from tools import SimpleGmailTools 
except ImportError:
    print("Warning: tools.py not found.")
    SimpleGmailTools = None

from rag_manager import RAGManager

DB_URL = os.getenv("DB_URL", "postgresql+psycopg://postgres:postgres@localhost:54322/postgres")

class FlowExecutor:
    def __init__(self, flow_data, user_keys: Dict[str, str]):
        self.nodes = {n.id: n for n in flow_data.nodes}
        self.edges = flow_data.edges
        self.keys = user_keys
        self.graph = self.build_graph()
        self.rag_manager = None
        self.execution_cache = {} # Cache node results to avoid re-running

    def get_rag_manager(self):
        if self.rag_manager is None:
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
            # We map: source_node -> target_node
            # But crucially, we need to know WHICH input handle the edge connects to
            G.add_edge(edge.source, edge.target, target_handle=edge.targetHandle)
        return G

    # ------------------------------------------------------------------
    # INPUT RESOLUTION
    # ------------------------------------------------------------------
    
    def resolve_node_input(self, node_id, arg_name=None):
        """
        Looks for the node connected to 'node_id' at the specific 'arg_name' handle.
        Returns the EXECUTED result of that predecessor node.
        """
        predecessors = list(self.graph.in_edges(node_id, data=True))
        
        # 1. Specific Handle Match (for Custom Components)
        if arg_name:
            for u, v, data in predecessors:
                if data.get('target_handle') == arg_name:
                    return self.execute_node(u)
        
        # 2. General Fallback (Standard Logic)
        # If we just want "the model" or "the tools", we filter by type
        results = []
        for u, v, data in predecessors:
            res = self.execute_node(u)
            if res is not None:
                results.append(res)
        
        if not results: return None
        return results[0] if len(results) == 1 else results

    def resolve_all_inputs(self, node_id):
        """Returns a dict of {handle_name: value} for custom execution"""
        inputs = {}
        for u, v, data in self.graph.in_edges(node_id, data=True):
            handle = data.get('target_handle')
            if handle:
                inputs[handle] = self.execute_node(u)
        return inputs

    # ------------------------------------------------------------------
    # MAIN EXECUTION DISPATCHER
    # ------------------------------------------------------------------

    def execute_node(self, node_id):
        """
        Recursively executes a node.
        1. Checks Cache.
        2. Checks if Custom Code exists -> run sandbox.
        3. Else -> run Standard Logic.
        """
        if node_id in self.execution_cache:
            return self.execution_cache[node_id]

        node = self.nodes[node_id]
        result = None

        # --- A. CUSTOM CODE EXECUTION ---
        if node.data.get('isCustom') and node.data.get('code'):
            result = self.run_custom_code(node)
        
        # --- B. STANDARD HARDCODED LOGIC ---
        else:
            result = self.run_standard_logic(node)

        self.execution_cache[node_id] = result
        return result

    def run_custom_code(self, node):
        code = node.data.get('code')
        inputs = self.resolve_all_inputs(node.id)
        
        # Inject API Keys if missing
        if 'api_key' in code and 'api_key' not in inputs:
            inputs['api_key'] = self.keys.get('groq_api_key') or self.keys.get('openai_api_key')

        local_scope = {}
        try:
            exec(code, globals(), local_scope)
            ComponentClass = local_scope.get('CustomComponent')
            if not ComponentClass: return f"Error: Class CustomComponent not found"
            
            instance = ComponentClass()
            
            # Filter args to match build signature
            import inspect
            sig = inspect.signature(instance.build)
            valid_args = {k: v for k, v in inputs.items() if k in sig.parameters}
            
            return instance.build(**valid_args)
        except Exception as e:
            traceback.print_exc()
            return f"Custom Code Error: {e}"

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
        if node_type == 'webSearchNode':
            return DuckDuckGoTools()
        
        if node_type == 'gmailNode':
            if SimpleGmailTools:
                return SimpleGmailTools(sender_email=data.get('email'), app_password=data.get('password'))
            return None

        # 3. Agents
        if node_type == 'agentNode':
            # Resolve dependencies
            model = self.resolve_node_input(node.id) # Will pick up any model node
            
            # Gather all tools connected
            tools = []
            for u in self.graph.predecessors(node.id):
                res = self.execute_node(u)
                # Check if it's a tool (DuckDuckGoTools is not easily checkable by type if imported differently, so we check capability)
                if hasattr(res, 'register') or isinstance(res, DuckDuckGoTools) or isinstance(res, YFinanceTools):
                    tools.append(res)
            
            return Agent(
                model=model if hasattr(model, 'id') else None,
                tools=tools,
                description=data.get('systemPrompt', "You are a helpful AI."),
                markdown=True
            )

        # 4. Inputs
        if node_type == 'chatInput':
            # This value is injected at the root execute() call
            return None # Placeholder

        if node_type == 'textInput' or node_type == 'promptTemplate':
            return data.get('value') or data.get('template')

        return None

    # ------------------------------------------------------------------
    # ENTRY POINT
    # ------------------------------------------------------------------

    def execute(self, message: str):
        print("--- Pipeline Started ---")
        self.execution_cache = {} # Reset cache
        
        # 1. Find the target node (Agent or Custom Component that returns a string)
        # Strategy: Find the node that has NO successors (The End Node)
        # Or specifically look for AgentNode / ChatOutputNode
        
        agent_node = next((n for n in self.nodes.values() if n.type == 'agentNode'), None)
        
        # Inject Chat Input into the graph manually
        chat_input_node = next((n for n in self.nodes.values() if n.type == 'chatInput'), None)
        if chat_input_node:
            self.execution_cache[chat_input_node.id] = message

        try:
            if agent_node:
                agent_instance = self.execute_node(agent_node.id)
                if isinstance(agent_instance, Agent):
                    print("Running Agent...")
                    return agent_instance.run(message).content
                return str(agent_instance)
            
            # Fallback: Just run whatever models/custom nodes are there
            # If a custom component is used as the 'main' logic
            custom_nodes = [n for n in self.nodes.values() if n.data.get('isCustom')]
            if custom_nodes:
                # Naive: execute the last added custom node
                res = self.execute_node(custom_nodes[-1].id)
                return str(res)

            return "Error: No valid Agent or Custom Logic found to execute."

        except Exception as e:
            traceback.print_exc()
            return f"Execution Error: {str(e)}"