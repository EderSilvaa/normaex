"""
Serviço de busca acadêmica real usando múltiplas APIs públicas.
Busca papers reais no OpenAlex, Crossref e Semantic Scholar.
"""

import httpx
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import asyncio

logger = logging.getLogger(__name__)


class AcademicSearchService:
    OPENALEX_URL = "https://api.openalex.org/works"
    CROSSREF_URL = "https://api.crossref.org/works"
    SEMANTIC_SCHOLAR_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

    def __init__(self):
        self.headers = {
            "User-Agent": "Normaex/1.0 (mailto:contato@normaex.com.br)"
        }

    # ============================================
    # BUSCA MULTI-FONTE
    # ============================================

    async def search_all_sources(
        self,
        query: str,
        limit: int = 8,
        year_min: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Busca papers em todas as fontes simultaneamente e deduplica.
        """
        results = await asyncio.gather(
            self.search_openalex(query, limit=limit, year_min=year_min),
            self.search_crossref(query, limit=limit),
            self.search_semantic_scholar(query, limit=limit),
            return_exceptions=True
        )

        all_papers = []
        for result in results:
            if isinstance(result, list):
                all_papers.extend(result)

        # Deduplicar por DOI
        seen_dois = set()
        unique_papers = []
        for paper in all_papers:
            doi = paper.get("doi", "")
            if doi and doi in seen_dois:
                continue
            if doi:
                seen_dois.add(doi)
            unique_papers.append(paper)

        # Ordenar por completeness + citações
        def sort_key(p):
            score = 0
            if p.get("authors"): score += 2
            if p.get("year"): score += 2
            if p.get("journal"): score += 1
            if p.get("doi"): score += 1
            score += min(p.get("cited_by_count", 0) / 100, 3)  # Bonus citações
            return score

        unique_papers.sort(key=sort_key, reverse=True)
        final = unique_papers[:limit]
        print(f"[AcademicSearch] Total: {len(final)} papers únicos para '{query[:40]}'")
        return final

    # ============================================
    # OPENALEX
    # ============================================

    async def search_openalex(
        self,
        query: str,
        limit: int = 5,
        year_min: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Busca no OpenAlex (gratuito, sem key)."""
        try:
            params = {
                "search": query,
                "per-page": limit,
                "sort": "relevance_score:desc",
                "filter": "type:article|book|dissertation|thesis"
            }
            if year_min:
                params["filter"] += f",publication_year:>{year_min}"

            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(self.OPENALEX_URL, params=params, headers=self.headers)
                if response.status_code != 200:
                    return []

                data = response.json()
                papers = []
                for item in data.get("results", []):
                    authors = []
                    for authorship in item.get("authorships", []):
                        name = authorship.get("author", {}).get("display_name")
                        if name:
                            parts = name.split()
                            if len(parts) >= 2:
                                authors.append(f"{parts[-1].upper()}, {' '.join(parts[:-1])}")
                            else:
                                authors.append(name.upper())

                    papers.append({
                        "title": item.get("title", ""),
                        "authors": authors,
                        "year": item.get("publication_year"),
                        "doi": (item.get("doi") or "").replace("https://doi.org/", ""),
                        "journal": (item.get("primary_location", {}) or {}).get("source", {}).get("display_name", ""),
                        "cited_by_count": item.get("cited_by_count", 0),
                        "abstract": self._clean_abstract(item.get("abstract_inverted_index")),
                        "source_api": "openalex"
                    })

                print(f"[OpenAlex] {len(papers)} papers para '{query[:40]}'")
                return papers
        except Exception as e:
            logger.error(f"[OpenAlex] Erro: {e}")
            return []

    # ============================================
    # CROSSREF
    # ============================================

    async def search_crossref(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Busca no Crossref (gratuito, sem key)."""
        try:
            params = {
                "query": query,
                "rows": limit,
                "sort": "relevance",
                "select": "DOI,title,author,published-print,published-online,container-title,type,is-referenced-by-count"
            }
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(self.CROSSREF_URL, params=params, headers=self.headers)
                if response.status_code != 200:
                    return []

                data = response.json()
                papers = []
                for item in data.get("message", {}).get("items", []):
                    authors = []
                    for author in item.get("author", []):
                        family = author.get("family", "")
                        given = author.get("given", "")
                        if family:
                            authors.append(f"{family.upper()}, {given}")

                    date_parts = (
                        item.get("published-print", {}).get("date-parts", [[None]]) or
                        item.get("published-online", {}).get("date-parts", [[None]])
                    )
                    year = date_parts[0][0] if date_parts and date_parts[0] else None

                    title_list = item.get("title", [])
                    title = title_list[0] if title_list else "Sem título"
                    container = item.get("container-title", [])

                    papers.append({
                        "title": title,
                        "authors": authors,
                        "year": year,
                        "doi": item.get("DOI", ""),
                        "journal": container[0] if container else "",
                        "cited_by_count": item.get("is-referenced-by-count", 0),
                        "source_api": "crossref"
                    })

                print(f"[Crossref] {len(papers)} papers para '{query[:40]}'")
                return papers
        except Exception as e:
            logger.error(f"[Crossref] Erro: {e}")
            return []

    # ============================================
    # SEMANTIC SCHOLAR
    # ============================================

    async def search_semantic_scholar(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Busca no Semantic Scholar (gratuito, sem key)."""
        try:
            params = {
                "query": query,
                "limit": limit,
                "fields": "title,authors,year,externalIds,journal,citationCount"
            }
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(self.SEMANTIC_SCHOLAR_URL, params=params)
                if response.status_code != 200:
                    return []

                data = response.json()
                papers = []
                for item in data.get("data", []):
                    authors = []
                    for author in item.get("authors", []):
                        name = author.get("name", "")
                        if name:
                            parts = name.split()
                            if len(parts) >= 2:
                                authors.append(f"{parts[-1].upper()}, {' '.join(parts[:-1])}")
                            else:
                                authors.append(name.upper())

                    doi = (item.get("externalIds") or {}).get("DOI", "")
                    journal_info = item.get("journal") or {}

                    papers.append({
                        "title": item.get("title", "Sem título"),
                        "authors": authors,
                        "year": item.get("year"),
                        "doi": doi,
                        "journal": journal_info.get("name", ""),
                        "cited_by_count": item.get("citationCount", 0),
                        "source_api": "semantic_scholar"
                    })

                print(f"[SemanticScholar] {len(papers)} papers para '{query[:40]}'")
                return papers
        except Exception as e:
            logger.error(f"[SemanticScholar] Erro: {e}")
            return []

    # ============================================
    # FORMATAÇÃO
    # ============================================

    def format_reference(self, paper: Dict[str, Any], norm: str = "abnt") -> str:
        """Formata uma referência no padrão da norma."""
        norm = norm.lower()
        title = paper.get("title", "")
        year = paper.get("year", "s.d.")
        authors = paper.get("authors", [])
        doi = paper.get("doi", "")
        journal = paper.get("journal", "")

        if not authors:
            author_text = "AUTOR DESCONHECIDO"
        elif len(authors) > 3:
            author_text = "; ".join(authors[:3]) + " et al."
        else:
            author_text = "; ".join(authors)

        if norm == "abnt":
            ref = f"{author_text}. {title}."
            if journal:
                ref += f" **{journal}**,"
            ref += f" {year}."
            if doi:
                ref += f" DOI: https://doi.org/{doi}."
            return ref

        elif norm == "apa":
            if len(authors) > 1:
                apa_authors = ", ".join(authors[:-1]) + f", & {authors[-1]}"
            else:
                apa_authors = authors[0] if authors else "Unknown"
            ref = f"{apa_authors} ({year}). {title}."
            if journal:
                ref += f" *{journal}*."
            if doi:
                ref += f" https://doi.org/{doi}"
            return ref

        elif norm == "ieee":
            if authors:
                parts = authors[0].split(", ")
                initials_last = f"{parts[1][0]}. {parts[0]}" if len(parts) > 1 else authors[0]
            else:
                initials_last = "Anon"
            ref = f'{initials_last}, "{title},"'
            if journal:
                ref += f" *{journal}*,"
            ref += f" {year}."
            return ref

        elif norm == "vancouver":
            if authors:
                parts = authors[0].split(", ")
                vanc = f"{parts[0]} {parts[1][0]}" if len(parts) > 1 else authors[0]
            else:
                vanc = "Anon"
            ref = f"{vanc}. {title}."
            if journal:
                ref += f" {journal}."
            ref += f" {year}."
            return ref

        return f"{title} ({year})"

    def format_papers_for_prompt(self, papers: List[Dict]) -> str:
        """Formata papers como texto para inserir em prompts da IA."""
        if not papers:
            return "Nenhum paper encontrado."

        lines = []
        for i, p in enumerate(papers, 1):
            authors = ", ".join(p.get("authors", [])[:3])
            year = p.get("year", "?")
            title = p.get("title", "")
            journal = p.get("journal", "")
            doi = p.get("doi", "")
            cited = p.get("cited_by_count", 0)
            lines.append(f"{i}. {authors} ({year}). \"{title}\". {journal}. DOI: {doi}. Citado {cited}x")

        return "\n".join(lines)

    # ============================================
    # HELPERS
    # ============================================

    def _clean_abstract(self, inverted_index: Optional[Dict]) -> str:
        """Reconstrói abstract do índice invertido do OpenAlex."""
        if not inverted_index:
            return ""
        try:
            word_list = []
            for word, positions in inverted_index.items():
                for pos in positions:
                    word_list.append((pos, word))
            word_list.sort()
            return " ".join([w[1] for w in word_list])
        except:
            return ""


# Instância singleton
academic_search = AcademicSearchService()
