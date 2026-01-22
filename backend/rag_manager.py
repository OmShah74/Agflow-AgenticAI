import os
import shutil
import traceback
import hashlib

from agno.knowledge.knowledge import Knowledge
from agno.knowledge.reader.pdf_reader import PDFReader
from agno.vectordb.pgvector import PgVector, SearchType
from agno.knowledge.embedder.openai import OpenAIEmbedder

# ============================================================
# CONFIG
# ============================================================

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ============================================================
# UTILS
# ============================================================

def generate_content_hash(file_path: str) -> str:
    """
    Generates a stable SHA256 hash for a file.
    Required by PgVector.insert() for deduplication.
    """
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

# ============================================================
# RAG MANAGER
# ============================================================

class RAGManager:
    def __init__(self, db_url: str):
        if not db_url:
            raise ValueError("DB_URL is missing. Please check your backend .env file.")
        self.db_url = db_url

    # --------------------------------------------------------
    # FILE SAVE
    # --------------------------------------------------------
    def save_file(self, file, filename: str) -> str:
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    # --------------------------------------------------------
    # VECTOR DB INITIALIZATION
    # --------------------------------------------------------
    def get_vector_db(self, table_name: str, openai_key: str) -> PgVector:
        if not openai_key:
            raise ValueError("OpenAI API Key is required for RAG embeddings.")

        try:
            return PgVector(
                table_name=table_name,
                db_url=self.db_url,
                search_type=SearchType.hybrid,
                embedder=OpenAIEmbedder(
                    id="text-embedding-3-small",
                    api_key=openai_key
                )
            )
        except Exception as e:
            print(f"❌ Critical Error initializing PgVector: {e}")
            raise

    # --------------------------------------------------------
    # EMBED DOCUMENT
    # --------------------------------------------------------
    def embed_document(self, file_path: str, table_name: str, openai_key: str) -> bool:
        print(f"\n📝 Starting embedding for: {file_path}")

        try:
            # 1️⃣ Validate file
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found on server: {file_path}")

            # 2️⃣ Generate content hash (🔥 REQUIRED 🔥)
            content_hash = generate_content_hash(file_path)
            print(f"   -> Content hash: {content_hash[:12]}...")

            # 3️⃣ Initialize Vector DB
            vector_db = self.get_vector_db(table_name, openai_key)

            # 4️⃣ Ensure table exists
            print("   -> Checking/Creating database table...")
            vector_db.create()

            # 5️⃣ Read & chunk PDF
            print("   -> Reading PDF...")
            reader = PDFReader(chunk=True)
            documents = reader.read(file_path)

            if not documents:
                raise ValueError("No text extracted from PDF. Possibly a scanned image.")

            print(f"   -> Extracted {len(documents)} chunks")

            # 6️⃣ Insert into PgVector (✅ FINAL FIX)
            print(f"   -> Embedding {len(documents)} chunks...")
            vector_db.insert(
                documents=documents,
                content_hash=content_hash
            )

            print("✅ Embedding completed successfully.\n")
            return True

        except Exception as e:
            print(f"\n❌ Embedding Failed: {e}")
            traceback.print_exc()
            raise

    # --------------------------------------------------------
    # KNOWLEDGE BASE FOR AGENT
    # --------------------------------------------------------
    def get_knowledge_base(self, table_name: str, openai_key: str) -> Knowledge:
        try:
            vector_db = self.get_vector_db(table_name, openai_key)
            return Knowledge(vector_db=vector_db)
        except Exception as e:
            print(f"❌ Failed to retrieve Knowledge Base: {e}")
            return None
