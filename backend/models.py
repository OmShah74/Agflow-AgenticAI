from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class NodeData(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]

class EdgeData(BaseModel):
    source: str
    target: str
    # React Flow sometimes sends extra edge data, so we allow extra fields
    class Config:
        extra = "ignore" 

class FlowRequest(BaseModel):
    nodes: List[NodeData]
    edges: List[EdgeData]
    message: str
    openai_api_key: Optional[str] = None # For RAG
    groq_api_key: Optional[str] = None   # For Inference