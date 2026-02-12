from fastapi import APIRouter, HTTPException
from models.research_models import SearchRequest, SearchResponse, SearchResult, StructureRequest, StructureResponse
from services.academic_search import academic_search
from services.ai import suggest_structure

router = APIRouter()

@router.post("/structure", response_model=StructureResponse)
async def generate_structure_endpoint(request: StructureRequest):
    """
    Gera uma sugestão de estrutura (sumário) baseada no tema e área.
    """
    try:
        structure = suggest_structure(
            theme=request.theme,
            work_type=request.work_type,
            knowledge_area=request.knowledge_area,
            norm=request.norm
        )
        
        return StructureResponse(
            structure=structure,
            message="Estrutura gerada com sucesso baseada em modelos da área."
        )
    except Exception as e:
        print(f"[ERROR] structure: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao gerar estrutura")

@router.post("/search", response_model=SearchResponse)
async def search_academic_works(request: SearchRequest):
    """
    Busca trabalhos acadêmicos e retorna com referências formatadas.
    """
    try:
        results = await academic_search.search_works(
            query=request.query,
            limit=request.limit,
            year_min=request.year_min
        )
        
        formatted_results = []
        for item in results:
            # Gerar referência na norma solicitada
            reference = academic_search.format_reference(item, norm=request.norm)
            
            formatted_results.append(SearchResult(
                id=str(item.get("id")),
                title=item.get("title") or "Sem título",
                authors=item.get("authors") or [],
                year=item.get("year"),
                type=item.get("type") or "Outro",
                abstract=item.get("abstract") or "",
                reference=reference,
                url=item.get("url"),
                citation_count=item.get("cited_by_count", 0)
            ))
            
        return SearchResponse(
            results=formatted_results,
            total_found=len(formatted_results),
            message=f"Encontrados {len(formatted_results)} resultados para '{request.query}'"
        )
        
    except Exception as e:
        print(f"[ERROR] search: {e}")
        raise HTTPException(status_code=500, detail="Erro interno na busca acadêmica")
