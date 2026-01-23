import os
import shutil
import traceback
import hashlib
from typing import Optional

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
    Required by PgVector.insert() in newer Agno versions.
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

        return PgVector(
            table_name=table_name,
            db_url=self.db_url,
            search_type=SearchType.hybrid,
            embedder=OpenAIEmbedder(
                id="text-embedding-3-small",
                api_key=openai_key
            )
        )

    # --------------------------------------------------------
    # EMBED DOCUMENT
    # --------------------------------------------------------
    def embed_document(
        self,
        file_path: str,
        table_name: str,
        openai_key: str,
        document_id: str
    ) -> bool:
        print(f"\n📝 Starting embedding for ID: {document_id}")

        try:
            # 1️⃣ Validate file
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found on server: {file_path}")

            # 2️⃣ Generate content hash (required)
            content_hash = generate_content_hash(file_path)
            print(f"   -> Content hash: {content_hash[:12]}...")

            # 3️⃣ Init vector DB
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

            # 6️⃣ Inject metadata
            print("   -> Injecting document metadata...")
            for doc in documents:
                doc.meta_data["document_id"] = document_id
                doc.meta_data["file_path"] = file_path
                doc.meta_data["file_name"] = os.path.basename(file_path)

            print(f"   -> Extracted {len(documents)} chunks")

            # 7️⃣ Insert into PgVector (correct signature)
            print(f"   -> Embedding {len(documents)} chunks...")
            vector_db.insert(
                documents,
                content_hash=content_hash
            )

            print("✅ Embedding completed successfully.\n")
            return True

        except Exception as e:
            print(f"\n❌ Embedding Failed: {e}")
            traceback.print_exc()
            raise

    # --------------------------------------------------------
    # KNOWLEDGE BASE FOR AGENT / FLOW
    # --------------------------------------------------------
    def get_knowledge_base(
        self,
        table_name: str,
        openai_key: str,
        document_id_filter: Optional[str] = None
    ) -> Optional[Knowledge]:
        """
        Returns a Knowledge object for retrieval.
        Compatible with latest Agno Knowledge API.
        """
        try:
            vector_db = self.get_vector_db(table_name, openai_key)

            # 🔒 Apply metadata filter directly to PgVector
            if document_id_filter:
                vector_db.filter = {"document_id": document_id_filter}
                print(f"🔒 Knowledge Base restricted to ID: {document_id_filter}")

            # ✅ ONLY supported argument
            return Knowledge(vector_db=vector_db)

        except Exception as e:
            print(f"❌ Failed to retrieve Knowledge Base: {e}")
            return None
