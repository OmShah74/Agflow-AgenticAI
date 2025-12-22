import shutil
import os
import uvicorn
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Local Imports
from models import FlowRequest
from executor import FlowExecutor
from rag_manager import RAGManager # Added to ensure RAG works

# Initialize App
app = FastAPI()

# Data Models
class ProcessDocRequest(BaseModel):
    file_path: str
    table_name: str
    openai_api_key: str

# --- CORS CONFIGURATION ---
# Define allowed origins
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    # FIX: Logic to switch between specific origins in Prod vs "*" in Dev
    allow_origins=origins if os.getenv("ENVIRONMENT") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "Agflow Backend is Running"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "filePath": os.path.abspath(file_path), 
            "filename": file.filename
        }
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/knowledge/process")
async def process_document(request: ProcessDocRequest):
    """
    Triggers the RAG extraction process.
    """
    try:
        # Initialize RAG Manager
        # We import DB_URL here to avoid circular imports if executor imports main
        from executor import DB_URL
        
        rag = RAGManager(DB_URL)
        
        rag.embed_document(
            file_path=request.file_path, 
            table_name=request.table_name,
            openai_key=request.openai_api_key
        )
        return {"status": "success", "message": "Document embedded successfully"}
    except Exception as e:
        print(f"Processing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run_flow")
async def run_flow(request: FlowRequest):
    try:
        # Prepare keys for the executor
        keys = {
            "groq_api_key": request.groq_api_key,
            "openai_api_key": request.openai_api_key
        }
        
        # Initialize Executor
        executor = FlowExecutor(request, keys)
        
        # Run the Graph logic
        result = executor.execute(request.message)
        
        return {"response": result}
        
    except Exception as e:
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Use 8000 for local dev; Render overrides this with the start command
    uvicorn.run(app, host="0.0.0.0", port=8000)