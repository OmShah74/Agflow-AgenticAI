export const NODE_PYTHON_TEMPLATES: Record<string, string> = {
  // ------------------------------------------------------------------
  // MODELS
  // ------------------------------------------------------------------
  groqModel: `from agno.models.groq import Groq

class CustomComponent:
    def build(self, model: str = "llama-3.3-70b-versatile", api_key: str = "") -> object:
        return Groq(id=model, api_key=api_key)`,

  openaiModel: `from agno.models.openai import OpenAIChat

class CustomComponent:
    def build(self, model: str = "gpt-4o", api_key: str = "") -> object:
        return OpenAIChat(id=model, api_key=api_key)`,

  // ------------------------------------------------------------------
  // AGENTS
  // ------------------------------------------------------------------
  agentNode: `from agno.agent import Agent

class CustomComponent:
    def build(self, model: object = None, tools: list = [], system_prompt: str = "You are a helpful assistant") -> object:
        # 'tools' input receives a list of tools from connected nodes
        return Agent(
            model=model,
            tools=tools if tools else None,
            description=system_prompt,
            markdown=True,
            show_tool_calls=True
        )`,

  // ------------------------------------------------------------------
  // PROMPTS & LOGIC
  // ------------------------------------------------------------------
  promptTemplate: `class CustomComponent:
    def build(self, template: str, **kwargs) -> str:
        # Automatically formats inputs connected to dynamic handles
        try:
            return template.format(**kwargs)
        except Exception as e:
            return f"Error formatting template: {str(e)}"` ,

  promptBuilder: `class CustomComponent:
    def build(self, template: str, **kwargs) -> str:
        # Advanced builder logic can go here
        return template.format(**kwargs)`,

  // ------------------------------------------------------------------
  // INPUTS / OUTPUTS
  // ------------------------------------------------------------------
  chatInput: `class CustomComponent:
    def build(self, message: str) -> str:
        # This node acts as an entry point
        # You can preprocess the user message here
        return message`,

  chatOutput: `class CustomComponent:
    def build(self, text: str) -> str:
        # This node acts as an exit point
        # You can post-process the final response here
        return text`,

  textInput: `class CustomComponent:
    def build(self, value: str) -> str:
        return value`,

  // ------------------------------------------------------------------
  // TOOLS
  // ------------------------------------------------------------------
  webSearchNode: `from agno.tools.duckduckgo import DuckDuckGoTools

class CustomComponent:
    def build(self) -> object:
        # Returns an initialized tool object
        return DuckDuckGoTools()`,

  gmailNode: `from tools import SimpleGmailTools # Assumes local tools.py exists

class CustomComponent:
    def build(self, email: str, password: str) -> object:
        try:
            return SimpleGmailTools(sender_email=email, app_password=password)
        except ImportError:
            return "Error: SimpleGmailTools not found in backend"`,

  calculator: `from agno.tools.calculator import CalculatorTools

class CustomComponent:
    def build(self) -> object:
        return CalculatorTools()`,

  // ------------------------------------------------------------------
  // RAG & DATA
  // ------------------------------------------------------------------
  pdfLoader: `class CustomComponent:
    def build(self, file_path: str) -> str:
        # Passes the file path string to the Vector Store
        return file_path`,

  vectorStore: `from agno.knowledge.knowledge import Knowledge
from agno.vectordb.pgvector import PgVector
from agno.knowledge.embedder.openai import OpenAIEmbedder
import os

class CustomComponent:
    def build(self, table_name: str, file_path: str, openai_key: str) -> object:
        # Initialize Vector DB connection
        db_url = os.getenv("DB_URL", "postgresql+psycopg://postgres:postgres@localhost:54322/postgres")
        
        vector_db = PgVector(
            table_name=table_name,
            db_url=db_url,
            embedder=OpenAIEmbedder(api_key=openai_key)
        )
        
        # Return Knowledge Base for Agent
        return Knowledge(vector_db=vector_db)`,

  textSplitter: `class CustomComponent:
    def build(self, chunk_size: int = 1000, chunk_overlap: int = 200) -> dict:
        return {
            "chunk_size": int(chunk_size), 
            "chunk_overlap": int(chunk_overlap)
        }`,

  // ------------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------------
  htmlRenderer: `class CustomComponent:
    def build(self, html_content: str) -> str:
        # Returns HTML string for the frontend to render
        return html_content`,
        
  chatMemory: `class CustomComponent:
    def build(self, session_id: str = "default") -> dict:
        return {"session_id": session_id, "type": "postgres_history"}`
};