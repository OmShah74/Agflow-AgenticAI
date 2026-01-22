from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class NodeData(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]

class EdgeData(BaseModel):
    source: str
    target: str
    targetHandle: Optional[str] = None
    sourceHandle: Optional[str] = None
    
    class Config:
        extra = "ignore"

class FlowRequest(BaseModel):
    nodes: List[NodeData]
    edges: List[EdgeData]
    message: str
    openai_api_key: Optional[str] = None # Crucial for RAG
    groq_api_key: Optional[str] = None
    user_id: Optional[str] = None
    flow_id: Optional[str] = None
    dataset: Optional[Dict[str, Any]] = None