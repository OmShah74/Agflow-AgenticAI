import os
import networkx as nx
from typing import Dict, Any, List
import traceback
import textwrap

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
            G.add_edge(edge.source, edge.target, target_handle=edge.targetHandle) # Store handle ID for mapping
        return G

    def get_predecessors_with_handles(self, node_id):
        """Returns list of (node, handle_id_it_connected_to)"""
        predecessors = []
        for u, v, data in self.graph.in_edges(node_id, data=True):
            predecessors.append((self.nodes[u], data.get('target_handle')))
        return predecessors

    # -------------------------------------------------------------------------
    # CUSTOM COMPONENT EXECUTION ENGINE
    # -------------------------------------------------------------------------
    def execute_custom_node(self, node):
        """
        1. Compiles the Python code from the node.
        2. Resolves inputs from the graph.
        3. Runs the 'build' method.
        """
        code = node.data.get('code')
        if not code:
            return "Error: No code found in custom component."

        # 1. Resolve Inputs
        # We need to map incoming edges to the 'build' method arguments
        # The Edge 'targetHandle' corresponds to the argument name in CustomComponentNode
        inputs = {}
        incoming = self.get_predecessors_with_handles(node.id)
        
        for pred_node, input_arg_name in incoming:
            # Recursively build/execute the predecessor
            # Note: This is a simplification. For complex graphs, we need full topological sort execution.
            # Here we assume predecessors are simple Inputs or Models.
            if pred_node.type in ['textInput', 'promptTemplate']:
                inputs[input_arg_name] = pred_node.data.get('value') or pred_node.data.get('template')
            elif pred_node.type == 'chatInput':
                # This input is injected from the root run request
                pass 
            elif 'Model' in pred_node.type:
                # If a model is connected, we might pass the config or the object
                # For this implementation, we pass the API Key or Model ID string
                inputs[input_arg_name] = pred_node.data.get('apiKey') 

        # If 'input_text' or 'prompt' is missing, inject the main message
        # This allows the chat input to flow into the custom node even if not explicitly connected via handle
        if 'input_text' not in inputs and 'prompt' not in inputs:
             inputs['input_text'] = "User Message Placeholder" # In real run, this comes from 'execute' args

        # 2. Dynamic Execution Sandbox
        local_scope = {}
        try:
            # Execute the class definition
            exec(code, globals(), local_scope)
            
            # Find the class that was defined
            component_class = None
            for name, obj in local_scope.items():
                if isinstance(obj, type) and hasattr(obj, 'build'):
                    component_class = obj
                    break
            
            if not component_class:
                return "Error: No class with a 'build' method found in code."

            # Instantiate and Run
            instance = component_class()
            
            # We filter inputs to only pass what the build method actually expects
            import inspect
            sig = inspect.signature(instance.build)
            valid_inputs = {k: v for k, v in inputs.items() if k in sig.parameters}
            
            # Execute build
            result = instance.build(**valid_inputs)
            return result

        except Exception as e:
            traceback.print_exc()
            return f"Custom Code Error: {str(e)}"

    # -------------------------------------------------------------------------
    # MAIN EXECUTION
    # -------------------------------------------------------------------------
    def execute(self, message: str):
        print("--- Execution Started ---")
        try:
            # 1. Find the Primary Node (Agent OR Custom Component)
            agent_node = next((n for n in self.nodes.values() if n.type == 'agentNode'), None)
            custom_node = next((n for n in self.nodes.values() if n.type == 'customComponent'), None)
            model_node = next((n for n in self.nodes.values() if 'Model' in n.type), None)

            # --- CASE A: Custom Component is the "Main" Node ---
            if custom_node and not agent_node:
                # We need to manually inject the 'message' into the inputs
                # We re-run the logic inside execute_custom_node but specifically for this request
                code = custom_node.data.get('code')
                
                # Resolve static inputs
                incoming = self.get_predecessors_with_handles(custom_node.id)
                inputs = {}
                for pred_node, arg_name in incoming:
                    if pred_node.type == 'textInput':
                        inputs[arg_name] = pred_node.data.get('value')
                    elif 'Model' in pred_node.type:
                        inputs[arg_name] = pred_node.data.get('apiKey') # Naive passing of key

                # Resolve dynamic input (The Chat Message)
                # We assume the argument named 'input_text', 'prompt', or 'message' receives the chat input
                for possible_arg in ['input_text', 'prompt', 'message', 'query']:
                    inputs[possible_arg] = message

                # Run Code
                local_scope = {}
                exec(code, globals(), local_scope)
                
                # Find Class
                CompClass = next((obj for name, obj in local_scope.items() if isinstance(obj, type) and hasattr(obj, 'build')), None)
                if not CompClass: return "Error: No class with 'build' found."
                
                instance = CompClass()
                
                # Filter args
                import inspect
                sig = inspect.signature(instance.build)
                final_args = {k: v for k, v in inputs.items() if k in sig.parameters}
                
                result = instance.build(**final_args)
                return str(result)

            # --- CASE B: Standard Agent Execution ---
            target_node = agent_node if agent_node else model_node
            if not target_node: return "Error: No Agent, Model, or Custom Component found."

            model = self.build_model(target_node)
            if isinstance(model, str): return model

            tools = self.build_tools(agent_node) if agent_node else []
            knowledge_base = self.build_knowledge_base(agent_node) if agent_node else None
            
            system_prompt = "You are a helpful AI assistant."
            if agent_node:
                system_prompt = agent_node.data.get("systemPrompt") or system_prompt

            agent = Agent(
                model=model,
                tools=tools,
                knowledge=knowledge_base,
                description=system_prompt,
                markdown=True,
            )

            response = agent.run(message)
            return response.content

        except Exception as e:
            traceback.print_exc()
            return f"Backend Execution Error: {str(e)}"

    def build_model(self, target_node):
        try:
            node_type = target_node.type
            if node_type == 'agentNode':
                inputs = [self.nodes[n] for n in self.graph.predecessors(target_node.id)]
                model_node = next((n for n in inputs if 'Model' in n.type), None)
                if model_node: return self.build_model(model_node)
                else:
                    key = self.keys.get('groq_api_key')
                    if not key: return "Error: Groq API Key missing."
                    return Groq(id="llama-3.3-70b-versatile", api_key=key)

            config = target_node.data
            api_key = config.get('apiKey') or self.keys.get('groq_api_key')
            
            if not api_key: return "Error: API Key missing."

            if node_type == 'openaiModel':
                return OpenAIChat(id=config.get('model', 'gpt-4o'), api_key=api_key)
            elif node_type == 'groqModel':
                return Groq(id=config.get('model', 'llama-3.3-70b-versatile'), api_key=api_key)
            
            return Groq(id="llama-3.3-70b-versatile", api_key=api_key)
        except Exception as e:
            return f"Model Error: {str(e)}"

    def build_tools(self, agent_node):
        if not agent_node: return []
        inputs = [self.nodes[n] for n in self.graph.predecessors(agent_node.id)]
        tools = []
        for node in inputs:
            if node.type == 'webSearchNode':
                tools.append(DuckDuckGoTools())
            elif node.type == 'gmailNode':
                if SimpleGmailTools:
                    tools.append(SimpleGmailTools(
                        sender_email=node.data.get('email'),
                        app_password=node.data.get('password')
                    ))
        return tools

    def build_knowledge_base(self, agent_node):
        if not agent_node: return None
        inputs = [self.nodes[n] for n in self.graph.predecessors(agent_node.id)]
        vector_node = next((n for n in inputs if n.type == 'vectorStore'), None)
        if not vector_node: return None

        vector_inputs = [self.nodes[n] for n in self.graph.predecessors(vector_node.id)]
        file_node = next((n for n in vector_inputs if n.type == 'pdfLoader'), None)
        if not file_node: return None

        manager = self.get_rag_manager()
        if not manager: return None

        file_path = file_node.data.get('filePath')
        if not file_path or not os.path.exists(file_path): return None 

        openai_key = self.keys.get('openai_api_key') 
        return manager.get_knowledge_base(
            file_path=file_path,
            table_name=vector_node.data.get('tableName', 'demo_rag'),
            openai_key=openai_key
        )