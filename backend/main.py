import shutil
import os
import uvicorn
import requests
import pandas as pd
from bs4 import BeautifulSoup
import io
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv # NEW IMPORT
from supabase import create_client, Client # NEW IMPORT

# 1. Load Environment Variables
load_dotenv()

# Local Imports
from models import FlowRequest
from executor import FlowExecutor
from rag_manager import RAGManager 

# Initialize App
app = FastAPI()

# Data Models
class ProcessDocRequest(BaseModel):
    file_path: str
    table_name: str
    openai_api_key: str

class ScrapeRequest(BaseModel):
    url: str

# --- CORS ---
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if os.getenv("ENVIRONMENT") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- SUPABASE CLIENT (FOR FETCHING LOGS) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Backend Supabase Client Connected")
    except Exception as e:
        print(f"❌ Backend Supabase Init Error: {e}")

# --- ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "Agflow Backend is Running"}

@app.get("/logs/{user_id}")
async def get_logs(user_id: str):
    """Fetch logs for a specific user."""
    if not supabase:
        print("❌ Logs Request Failed: Supabase not initialized")
        return []
    
    try:
        print(f"Fetching logs for user: {user_id}")
        response = supabase.table("run_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("timestamp", desc=True)\
            .limit(50)\
            .execute()
        return response.data
    except Exception as e:
        print(f"❌ Error fetching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filePath": os.path.abspath(file_path), "filename": file.filename}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/knowledge/process")
async def process_document(request: ProcessDocRequest):
    try:
        # Pass DB_URL explicitly if needed, or RAGManager loads from env
        from executor import DB_URL 
        rag = RAGManager(DB_URL)
        rag.embed_document(request.file_path, request.table_name, request.openai_api_key)
        return {"status": "success", "message": "Document embedded successfully"}
    except Exception as e:
        print(f"Processing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape")
async def scrape_url(request: ScrapeRequest):
    try:
        # Simple table scraping
        response = requests.get(request.url, headers={"User-Agent": "Mozilla/5.0"})
        if response.status_code != 200:
            raise Exception(f"Failed to fetch URL: {response.status_code}")
            
        # Try pandas read_html first
        try:
            dfs = pd.read_html(io.StringIO(response.text))
            if dfs:
                df = dfs[0] # Take first table
                # Clean up
                df = df.fillna("")
                return {
                    "data": df.to_dict(orient="records"),
                    "columns": list(df.columns)
                }
        except Exception:
            pass # Fallback
            
        # Fallback: Just return text content (not ideal for visualization but valid data)
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()[:5000] # Limit size
        return {
            "data": [{"content": text}],
            "columns": ["content"]
        }
    except Exception as e:
        print(f"Scrape Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run_flow")
async def run_flow(request: FlowRequest):
    try:
        keys = { "groq_api_key": request.groq_api_key, "openai_api_key": request.openai_api_key }
        executor = FlowExecutor(request, keys)
        result = executor.execute(request.message)
        return {"response": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)