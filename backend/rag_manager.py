import os
import shutil
from agno.knowledge.knowledge import Knowledge
from agno.knowledge.reader.pdf_reader import PDFReader
from agno.vectordb.pgvector import PgVector, SearchType
from agno.knowledge.embedder.openai import OpenAIEmbedder

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class RAGManager:
    def __init__(self, db_url: str):
        self.db_url = db_url

    def save_file(self, file, filename):
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    def get_vector_db(self, table_name: str, openai_key: str):
        if not openai_key:
             # For demo purposes, we might need a fallback or error
             raise ValueError("OpenAI Key required")
             
        return PgVector(
            table_name=table_name,
            db_url=self.db_url,
            search_type=SearchType.hybrid,
            embedder=OpenAIEmbedder(api_key=openai_key)
        )

    def embed_document(self, file_path: str, table_name: str, openai_key: str):
        """
        Reads a file and loads it into the Vector DB.
        """
        vector_db = self.get_vector_db(table_name, openai_key)
        
        knowledge_base = Knowledge(vector_db=vector_db)
        reader = PDFReader(chunk=True)
        
        # This triggers the actual parsing and embedding
        knowledge_base.load(recreate=False) 
        knowledge_base.add_content(path=file_path, reader=reader)
        return True

    def get_knowledge_base(self, table_name: str, openai_key: str):
        """Returns the KB object for the Agent to use during inference."""
        vector_db = self.get_vector_db(table_name, openai_key)
        return Knowledge(vector_db=vector_db)