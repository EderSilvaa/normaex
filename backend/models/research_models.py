from pydantic import BaseModel, Field
from typing import List, Optional

class SearchRequest(BaseModel):
    query: str
    norm: str = "abnt"  # abnt, apa, vancouver, ieee
    year_min: Optional[int] = None
    limit: int = 5

class SearchResult(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: Optional[int]
    type: str
    abstract: str
    reference: str  # Referência já formatada
    url: Optional[str]
    citation_count: int

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_found: int
    message: str

class StructureRequest(BaseModel):
    theme: str
    work_type: str = "tcc"
    knowledge_area: str = "geral"
    norm: str = "abnt"

class StructureResponse(BaseModel):
    structure: str
    message: str
