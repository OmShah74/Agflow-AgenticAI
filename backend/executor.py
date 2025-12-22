import os
import networkx as nx
from typing import Dict, Any, List
import traceback

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
    print("Warning: tools.py not found. Gmail tools will not work.")
    SimpleGmailTools = None

from rag_manager import RAGManager

# --- DB Configuration ---
DB_URL = os.getenv("DB_URL", "postgresql+psycopg://postgres:postgres@localhost:54322/postgres")

class FlowExecutor:
    def __init__(self, flow_data, user_keys: Dict[str, str]):
        self.nodes = {n.id: n for n in flow_data.nodes}
        self.edges = flow_data.edges
        self.keys = user_keys
        self.graph = self.build_graph()
        self.rag_manager = None 

    def get_rag_manager(self):
        """Initializes RAG Manager only when needed."""
        if self.rag_manager is None:
            print(f"Initializing RAG Manager with DB_URL: {DB_URL}")
            try:
                self.rag_manager = RAGManager(DB_URL)
            except Exception as e:
                print(f"Failed to connect to Database: {e}")
                return None
        return self.rag_manager

    def build_graph(self):
        G = nx.DiGraph()
        for node in self.nodes.values():
            G.add_node(node.id, type=node.type, config=node.data)
        for edge in self.edges:
            G.add_edge(edge.source, edge.target)
        return G

    def get_connected_nodes(self, node_id, direction="predecessors"):
        if direction == "predecessors":
            return [self.nodes[n] for n in self.graph.predecessors(node_id)]
        return [self.nodes[n] for n in self.graph.successors(node_id)]

    def execute(self, message: str):
        print("--- Execution Started ---")
        try:
            # 1. Strategy: Find Agent Node OR Model Node
            agent_node = next((n for n in self.nodes.values() if n.type == 'agentNode'), None)
            model_node = next((n for n in self.nodes.values() if 'Model' in n.type), None)
            
            if not agent_node and not model_node:
                return "Error: Flow execution failed. Please add an 'Agno Agent' or a 'Model' node to the canvas."

            # 2. Build Components
            target_node = agent_node if agent_node else model_node
            
            # Build Model
            model = self.build_model(target_node)
            if isinstance(model, str): 
                return model

            # Build Tools (Only if Agent)
            tools = self.build_tools(agent_node) if agent_node else []
            
            # Build Knowledge Base (Only if Agent)
            knowledge_base = self.build_knowledge_base(agent_node) if agent_node else None
            
            # System Prompt
            system_prompt = "You are a helpful AI assistant."
            if agent_node:
                system_prompt = agent_node.data.get("systemPrompt") or agent_node.data.get("description") or system_prompt

            # 3. Configure Agent
            print(f"Creating Agent with Model: {type(model).__name__}")
            
            # --- FIX: Removed 'show_tool_calls' as it causes errors in newer Agno versions ---
            agent = Agent(
                model=model,
                tools=tools,
                knowledge=knowledge_base,
                description=system_prompt,
                markdown=True,
                # add_references_to_prompt=True if knowledge_base else False, 
            )

            # 4. Run Inference
            print("Running Agent Inference...")
            response = agent.run(message)
            return response.content

        except Exception as e:
            traceback.print_exc()
            return f"Backend Execution Error: {str(e)}"

    def build_model(self, target_node):
        try:
            node_type = target_node.type
            
            # CASE 1: Node is an Agent -> Look for connected model
            if node_type == 'agentNode':
                inputs = self.get_connected_nodes(target_node.id)
                model_node = next((n for n in inputs if 'Model' in n.type), None)
                if model_node:
                    return self.build_model(model_node) 
                else:
                    key = self.keys.get('groq_api_key')
                    if not key: return "Error: Groq API Key missing."
                    return Groq(id="llama-3.3-70b-versatile", api_key=key)

            # CASE 2: Node is explicitly a Model Node
            config = target_node.data
            api_key = config.get('apiKey') or self.keys.get('groq_api_key')
            
            if not api_key:
                return "Error: API Key missing in Model Node configuration."

            if node_type == 'openaiModel':
                return OpenAIChat(id=config.get('model', 'gpt-4o'), api_key=api_key)
            
            elif node_type == 'groqModel':
                return Groq(id=config.get('model', 'llama-3.3-70b-versatile'), api_key=api_key)
            
            return Groq(id="llama-3.3-70b-versatile", api_key=api_key)
            
        except Exception as e:
            traceback.print_exc()
            return f"Model Build Error: {str(e)}"

    def build_tools(self, agent_node):
        if not agent_node: return []
        inputs = self.get_connected_nodes(agent_node.id)
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
        inputs = self.get_connected_nodes(agent_node.id)
        vector_node = next((n for n in inputs if n.type == 'vectorStore'), None)
        if not vector_node: return None

        vector_inputs = self.get_connected_nodes(vector_node.id)
        file_node = next((n for n in vector_inputs if n.type == 'pdfLoader'), None)
        if not file_node: return None

        manager = self.get_rag_manager()
        if not manager:
            print("Error: RAG Manager could not be initialized (Check DB connection).")
            return None

        file_path = file_node.data.get('filePath')
        if not file_path or not os.path.exists(file_path): return None 

        openai_key = self.keys.get('openai_api_key') 
        return manager.get_knowledge_base(
            file_path=file_path,
            table_name=vector_node.data.get('tableName', 'demo_rag'),
            openai_key=openai_key
        )