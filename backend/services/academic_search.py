"""
Serviço de busca acadêmica usando OpenAlex API.
Foco em encontrar referências e metadados, evitando plágio.
"""

import httpx
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class AcademicSearchService:
    BASE_URL = "https://api.openalex.org/works"
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Normaex/1.0 (mailto:contato@normaex.com.br)"
        }

    async def search_works(
        self, 
        query: str, 
        limit: int = 5,
        year_min: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Busca trabalhos acadêmicos no OpenAlex.
        """
        try:
            params = {
                "search": query,
                "per-page": limit,
                "sort": "relevance_score:desc",
                "filter": "has_abstract:true,type:article|book|dissertation|thesis"
            }
            
            if year_min:
                params["filter"] += f",publication_year:>{year_min}"

            async with httpx.AsyncClient() as client:
                response = await client.get(self.BASE_URL, params=params, headers=self.headers)
                
                if response.status_code != 200:
                    logger.error(f"Erro OpenAlex: {response.status_code}")
                    return []
                
                data = response.json()
                results = []
                
                for item in data.get("results", []):
                    # Processar autores
                    authors = []
                    for authorship in item.get("authorships", []):
                        author_name = authorship.get("author", {}).get("display_name")
                        if author_name:
                            authors.append(author_name)
                    
                    # Tipo de trabalho (em português)
                    work_type_map = {
                        "article": "Artigo",
                        "book": "Livro",
                        "dissertation": "Dissertação",
                        "thesis": "Tese",
                        "book-chapter": "Capítulo de Livro"
                    }
                    work_type = item.get("type", "unknown")
                    type_pt = work_type_map.get(work_type, "Trabalho Acadêmico")

                    result = {
                        "id": item.get("id"),
                        "title": item.get("title"),
                        "authors": authors,
                        "year": item.get("publication_year"),
                        "type": type_pt,
                        "doi": item.get("doi"),
                        "url": item.get("doi") or item.get("primary_location", {}).get("landing_page_url"),
                        "abstract": self._clean_abstract(item.get("abstract_inverted_index")),
                        "journal": item.get("primary_location", {}).get("source", {}).get("display_name"),
                        "cited_by_count": item.get("cited_by_count", 0)
                    }
                    results.append(result)
                
                return results
                
        except Exception as e:
            logger.error(f"Erro na busca acadêmica: {str(e)}")
            return []

    def _clean_abstract(self, inverted_index: Optional[Dict]) -> str:
        """Reconstrói o abstract a partir do índice invertido usado pelo OpenAlex"""
        if not inverted_index:
            return ""
            
        # Reconstruir texto
        try:
            word_list = []
            for word, positions in inverted_index.items():
                for pos in positions:
                    word_list.append((pos, word))
            
            word_list.sort()
            return " ".join([w[1] for w in word_list])
        except:
            return ""

    def format_reference(self, work: Dict[str, Any], norm: str = "abnt") -> str:
        """
        Formata a referência bibliográfica de acordo com a norma.
        """
        norm = norm.lower()
        title = work.get("title", "")
        year = work.get("year", "")
        authors = work.get("authors", [])
        url = work.get("url", "")
        journal = work.get("journal", "")
        
        if not authors:
            author_text = "AUTOR DESCONHECIDO"
        else:
            # Pegar sobrenome do primeiro autor
            first_author = authors[0]
            parts = first_author.split()
            last_name = parts[-1].upper()
            initials = "".join([p[0].upper() + "." for p in parts[:-1]])
            
            if len(authors) > 3 and norm == "abnt":
                author_text = f"{last_name}, {initials} et al."
            elif len(authors) > 1:
                 author_text = f"{last_name}, {initials} et al." # Simplificado para exemplo
            else:
                author_text = f"{last_name}, {initials}"

        if norm == "abnt":
            # SILVA, J. Título em negrito. Revista, Ano. Disponível em: <url>. Acesso em: data.
            today = datetime.now().strftime("%d %b. %Y")
            ref = f"**{author_text}**. {title}"
            if journal:
                ref += f". *{journal}*"
            ref += f", {year}."
            if url:
                ref += f" Disponível em: <{url}>. Acesso em: {today}."
            return ref
            
        elif norm == "apa":
            # Silva, J. (Ano). Title in italic. Journal.
            ref = f"{authors[0] if authors else 'Unknown'} ({year}). *{title}*."
            if journal:
                ref += f" {journal}."
            if url:
                ref += f" {url}"
            return ref
            
        elif norm == "ieee":
            # [1] J. Silva, "Title," Journal, Year.
            initials_last = f"{parts[0][0]}. {parts[-1]}" if authors else "Anon"
            ref = f"{initials_last}, \"{title},\""
            if journal:
                ref += f" *{journal}*,"
            ref += f" {year}."
            return ref
            
        elif norm == "vancouver":
            # Silva J. Title. Journal. Year;Vol(Issue):Pages.
            vanc_auth = f"{parts[-1]} {parts[0][0]}" if authors else "Anon"
            ref = f"{vanc_auth}. {title}."
            if journal:
                ref += f" {journal}."
            ref += f" {year}."
            return ref

        return f"{title} ({year})"

# Instância singleton
academic_search = AcademicSearchService()
