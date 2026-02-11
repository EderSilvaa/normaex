"""
Router para endpoints do Office Add-in
Esses endpoints recebem conteúdo JSON diretamente (não arquivos)
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
import httpx
import base64
from sse_starlette.sse import EventSourceResponse
from typing import AsyncGenerator
import json
import asyncio
import re
# Rate limiter is configured in main.py

from models.addin_models import (
    DocumentContent,
    SelectionContent,
    AnalysisResponse,
    Issue,
    IssueSeverity,
    FormatResponse,
    FormatAction,
    WriteRequest,
    WriteResponse,
    ChatRequest,
    ChatResponse,
    ContextInfo,
    ImproveRequest,
    ImproveResponse,
    ChartRequest,
    ChartResponse,
    InlineReviewRequest,
    InlineReviewResponse
)

from services.inline_review import review_selection

from services.ai import (
    chat_with_document,
    generate_academic_text,
    generate_academic_text_stream
)
from services.ai_structural import analyze_document_with_ai
from services.ai_writer import write_structured_streaming
from services.project_service import project_service
from services.chart_service import generate_chart, generate_multi_series_chart

router = APIRouter(prefix="/addin", tags=["Office Add-in"])


# ============================================
# ANALYZE CONTENT
# ============================================

@router.post("/analyze-content", response_model=AnalysisResponse)
async def analyze_content(content: DocumentContent):
    """
    Analisa o conteúdo do documento e retorna score de conformidade ABNT.

    - Recebe o texto do documento do Word via Office.js
    - Analisa formatação, estrutura e conteúdo
    - Retorna score 0-100 e lista de problemas
    """
    try:
        # Concatenar texto dos parágrafos se full_text não foi fornecido
        full_text = content.full_text or "\n".join([p.text for p in content.paragraphs])

        if not full_text.strip():
            return AnalysisResponse(
                score=0,
                issues=[Issue(
                    code="EMPTY_DOC",
                    message="O documento está vazio",
                    severity=IssueSeverity.ERROR,
                    suggestion="Adicione conteúdo ao documento"
                )],
                suggestions=["Adicione conteúdo ao documento para análise"],
                summary="Documento vazio - não foi possível analisar"
            )

        # Analisar documento
        issues = []
        score = 100

        # Verificações básicas de conformidade ABNT
        word_count = len(full_text.split())

        # 1. Verificar tamanho mínimo
        if word_count < 100:
            issues.append(Issue(
                code="ABNT_001",
                message="Documento muito curto para análise completa",
                severity=IssueSeverity.WARNING,
                suggestion="Adicione mais conteúdo para uma análise mais precisa"
            ))
            score -= 5

        # 2. Verificar parágrafos (com filtros inteligentes)
        paragraphs = content.paragraphs

        # Contadores para agrupar issues similares
        font_issues = {"wrong_font": [], "wrong_size": []}
        alignment_issues = []
        spacing_issues = []

        # Tamanhos de fonte permitidos (12pt normal, 10pt para citações/notas, 14pt para títulos)
        allowed_sizes = [10, 10.0, 11, 11.0, 12, 12.0, 14, 14.0, 16, 16.0, 18, 18.0]

        for i, para in enumerate(paragraphs):
            # FILTRO 1: Ignorar parágrafos vazios ou só com espaços
            text_content = para.text.strip() if para.text else ""
            if len(text_content) < 3:  # Menos de 3 caracteres = ignorar
                continue

            # FILTRO 2: Ignorar linhas separadoras (---, ___, ===, ***, etc.)
            clean_text = text_content.replace(" ", "").replace("\t", "").replace("\n", "")
            # Detectar padrões de separadores (caracteres repetidos)
            if re.match(r'^[-_=*~.•·]{2,}$', clean_text):
                continue
            # Detectar apenas pontuação isolada
            if clean_text in ["", ".", ",", "-", "—", "–", ":", ";", "..."]:
                continue

            # FILTRO 3: Contar palavras reais no parágrafo (mínimo 3 caracteres por palavra)
            words_in_para = len([w for w in text_content.split() if len(w) >= 3 and w.isalpha()])
            if words_in_para < 2:  # Menos de 2 palavras reais = ignorar
                continue

            # FILTRO 4: Identificar tipo de parágrafo pelo estilo
            style_lower = para.style.lower() if para.style else ""
            is_heading = "heading" in style_lower or "título" in style_lower
            is_title = "title" in style_lower
            is_footnote = "footnote" in style_lower or "nota de rodapé" in style_lower or "nota" in style_lower
            is_caption = "caption" in style_lower or "legenda" in style_lower
            is_quote = "quote" in style_lower or "citação" in style_lower or "block" in style_lower

            # FILTRO 5: Detectar notas de rodapé pelo conteúdo (começa com número/símbolo)
            if re.match(r'^[\d¹²³⁴⁵⁶⁷⁸⁹⁰]+\s', text_content):
                is_footnote = True

            # FILTRO 6: Detectar citações longas (recuo + fonte menor geralmente)
            if para.font_size and para.font_size <= 11 and para.first_line_indent and para.first_line_indent > 30:
                is_quote = True

            # Verificar fonte (apenas para texto normal, não títulos/notas)
            if para.font_name and not is_heading and not is_title:
                font_lower = para.font_name.lower()
                if font_lower not in ["times new roman", "arial"]:
                    font_issues["wrong_font"].append({
                        "index": i,
                        "font": para.font_name,
                        "preview": text_content[:50]
                    })

            # Verificar tamanho da fonte (com exceções inteligentes)
            if para.font_size:
                size = float(para.font_size)

                # Pular verificação de tamanho para elementos especiais
                skip_size_check = (
                    is_footnote or is_caption or is_quote or  # Notas/citações podem ter 10pt
                    is_heading or is_title  # Títulos podem ter tamanhos maiores
                )

                if not skip_size_check:
                    # Para texto normal: só reportar tamanhos muito fora do padrão
                    # Aceitar: 10pt (citação), 11pt, 12pt (normal)
                    if size < 10 or size > 12.5:
                        font_issues["wrong_size"].append({
                            "index": i,
                            "size": para.font_size,
                            "expected": "12pt",
                            "preview": text_content[:50]
                        })

            # Verificar alinhamento (apenas texto normal)
            if para.alignment and not is_heading and not is_title:
                align = para.alignment.lower()
                if align not in ["justified", "justify", "both"]:
                    alignment_issues.append({
                        "index": i,
                        "alignment": para.alignment,
                        "preview": text_content[:50]
                    })

            # Verificar espaçamento (apenas texto normal)
            if para.line_spacing and not is_footnote and not is_quote:
                if para.line_spacing != 1.5 and para.line_spacing not in [1.0, 1.15, 2.0]:
                    spacing_issues.append({
                        "index": i,
                        "spacing": para.line_spacing,
                        "preview": text_content[:50]
                    })

        # Criar issues agrupadas (máximo 3 por tipo para não poluir)
        if font_issues["wrong_font"]:
            unique_fonts = list(set([f["font"] for f in font_issues["wrong_font"]]))
            count = len(font_issues["wrong_font"])
            issues.append(Issue(
                code="ABNT_002",
                message=f"Fonte não recomendada em {count} parágrafo(s): {', '.join(unique_fonts[:3])}",
                severity=IssueSeverity.WARNING,
                paragraph_index=font_issues["wrong_font"][0]["index"],
                suggestion="Use Times New Roman ou Arial conforme ABNT"
            ))
            score -= min(count * 2, 10)  # Máximo -10 pontos

        if font_issues["wrong_size"]:
            sizes = list(set([str(f["size"]) + "pt" for f in font_issues["wrong_size"]]))
            count = len(font_issues["wrong_size"])
            issues.append(Issue(
                code="ABNT_003",
                message=f"Tamanho de fonte incorreto em {count} parágrafo(s): {', '.join(sizes[:3])}",
                severity=IssueSeverity.INFO,
                paragraph_index=font_issues["wrong_size"][0]["index"],
                suggestion="Use 12pt para texto normal, 10pt para citações longas"
            ))
            score -= min(count, 5)  # Máximo -5 pontos

        if alignment_issues:
            count = len(alignment_issues)
            if count >= 1:  # Reportar qualquer parágrafo não justificado
                issues.append(Issue(
                    code="ABNT_004",
                    message=f"{count} parágrafo(s) não está(ão) justificado(s)",
                    severity=IssueSeverity.INFO,
                    paragraph_index=alignment_issues[0]["index"],
                    suggestion="Aplique alinhamento justificado ao corpo do texto"
                ))
                score -= min(count, 5)

        if spacing_issues:
            count = len(spacing_issues)
            spacings = list(set([str(s["spacing"]) for s in spacing_issues]))
            issues.append(Issue(
                code="ABNT_005",
                message=f"Espaçamento de {', '.join(spacings[:2])} em {count} parágrafo(s)",
                severity=IssueSeverity.INFO,
                paragraph_index=spacing_issues[0]["index"],
                suggestion="Use espaçamento de 1,5 entre linhas para texto normal"
            ))
            score -= min(count, 5)

        # 3. Verificar margens do documento (ABNT: 3cm sup/esq, 2cm inf/dir)
        if content.page_setup and content.page_setup.margins:
            margins = content.page_setup.margins
            margin_issues = []

            # Tolerância de 0.3cm para variações
            tolerance = 0.3

            # Verificar margem superior (deve ser 3cm)
            if abs(margins.top_cm - 3.0) > tolerance:
                margin_issues.append(f"superior ({margins.top_cm}cm, deveria ser 3cm)")

            # Verificar margem inferior (deve ser 2cm)
            if abs(margins.bottom_cm - 2.0) > tolerance:
                margin_issues.append(f"inferior ({margins.bottom_cm}cm, deveria ser 2cm)")

            # Verificar margem esquerda (deve ser 3cm)
            if abs(margins.left_cm - 3.0) > tolerance:
                margin_issues.append(f"esquerda ({margins.left_cm}cm, deveria ser 3cm)")

            # Verificar margem direita (deve ser 2cm)
            if abs(margins.right_cm - 2.0) > tolerance:
                margin_issues.append(f"direita ({margins.right_cm}cm, deveria ser 2cm)")

            if margin_issues:
                issues.append(Issue(
                    code="ABNT_006",
                    message=f"Margens fora do padrão ABNT: {', '.join(margin_issues[:2])}{'...' if len(margin_issues) > 2 else ''}",
                    severity=IssueSeverity.WARNING,
                    suggestion="Configure as margens: 3cm (superior/esquerda) e 2cm (inferior/direita)"
                ))
                score -= min(len(margin_issues) * 3, 10)

        # 4. Verificar estrutura básica
        text_lower = full_text.lower()

        has_intro = any(term in text_lower for term in ["introdução", "introducao", "1. introdução", "1 introdução"])
        has_conclusion = any(term in text_lower for term in ["conclusão", "conclusao", "considerações finais"])
        has_references = any(term in text_lower for term in ["referências", "referencias", "bibliografia"])

        if not has_intro:
            issues.append(Issue(
                code="STRUCT_001",
                message="Seção de Introdução não identificada",
                severity=IssueSeverity.WARNING,
                suggestion="Adicione uma seção de Introdução"
            ))
            score -= 5

        if not has_conclusion:
            issues.append(Issue(
                code="STRUCT_002",
                message="Seção de Conclusão não identificada",
                severity=IssueSeverity.WARNING,
                suggestion="Adicione uma seção de Conclusão ou Considerações Finais"
            ))
            score -= 5

        if not has_references:
            issues.append(Issue(
                code="STRUCT_003",
                message="Seção de Referências não identificada",
                severity=IssueSeverity.WARNING,
                suggestion="Adicione uma seção de Referências Bibliográficas"
            ))
            score -= 5

        # Garantir score mínimo de 0
        score = max(0, score)

        # Gerar sugestões
        suggestions = []
        if score < 70:
            suggestions.append("Revise a formatação do documento conforme normas ABNT")
        if score < 50:
            suggestions.append("Considere usar o assistente de formatação automática")
        if not has_intro or not has_conclusion:
            suggestions.append("Complete a estrutura básica do documento acadêmico")

        # Resumo
        if score >= 80:
            summary = f"Documento bem formatado! Score: {score}/100"
        elif score >= 60:
            summary = f"Documento precisa de ajustes. Score: {score}/100"
        else:
            summary = f"Documento precisa de revisão significativa. Score: {score}/100"

        return AnalysisResponse(
            score=score,
            issues=issues,
            suggestions=suggestions,
            compliance_details={
                "word_count": word_count,
                "paragraph_count": len(paragraphs),
                "has_introduction": has_intro,
                "has_conclusion": has_conclusion,
                "has_references": has_references,
                "format_type": content.format_type.value
            },
            summary=summary
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


# ============================================
# FORMAT CONTENT
# ============================================

@router.post("/format-content", response_model=FormatResponse)
async def format_content(content: DocumentContent):
    """
    Gera instruções de formatação para o documento baseadas na norma solicitada.
    Suporta: ABNT, APA, IEEE, Vancouver.
    """
    try:
        actions = []
        norm = content.format_type or "abnt"
        
        # ==========================================
        # CONFIGURAÇÕES ESPECÍFICAS POR NORMA
        # ==========================================
        
        if norm == "apa":
            # --- APA 7th Edition ---
            # Fonte: Times New Roman 12
            actions.append(FormatAction(action_type="set_font", target="all", 
                                      params={"font_name": "Times New Roman", "font_size": 12}))
            
            # Espaçamento: Duplo (2.0)
            actions.append(FormatAction(action_type="set_spacing", target="all", 
                                      params={"line_spacing": 2.0, "space_after": 0, "space_before": 0}))
            
            # Alinhamento: Esquerda (Ragged right)
            actions.append(FormatAction(action_type="set_alignment", target="body", 
                                      params={"alignment": "left"}))
            
            # Margens: 2.54cm (1 polegada) em tudo
            actions.append(FormatAction(action_type="set_margins", target="document", 
                                      params={"top": 2.54, "bottom": 2.54, "left": 2.54, "right": 2.54}))
            
            # Recuo: 1.27cm (0.5 pol) apenas na primeira linha
            for i, para in enumerate(content.paragraphs):
                # Títulos centralizados e negrito (Nível 1)
                if para.style and "heading 1" in para.style.lower():
                    actions.append(FormatAction(action_type="set_alignment", target=f"paragraph_{i}", params={"alignment": "center"}))
                    actions.append(FormatAction(action_type="set_bold", target=f"paragraph_{i}", params={"bold": True}))
                # Texto normal com recuo
                elif para.style and para.style.lower() == "normal":
                     actions.append(FormatAction(action_type="set_indent", target=f"paragraph_{i}", params={"first_line_indent": 1.27}))

        elif norm == "ieee":
            # --- IEEE ---
            # Fonte: Times New Roman 10 (ou 12 para draft)
            actions.append(FormatAction(action_type="set_font", target="all", 
                                      params={"font_name": "Times New Roman", "font_size": 12})) # Usando 12 para facilitar leitura em drafts
            
            # Espaçamento: Simples (1.0)
            actions.append(FormatAction(action_type="set_spacing", target="all", 
                                      params={"line_spacing": 1.0, "space_after": 6, "space_before": 0}))
            
            # Alinhamento: Justificado
            actions.append(FormatAction(action_type="set_alignment", target="body", 
                                      params={"alignment": "justified"}))
            
            # Margens IEEE: top 2.54cm (1"), bottom 1.59cm (0.625"), left/right 1.78cm (0.7")
            actions.append(FormatAction(action_type="set_margins", target="document", 
                                      params={"top": 2.54, "bottom": 1.59, "left": 1.78, "right": 1.78}))
            
            # Títulos à esquerda
            for i, para in enumerate(content.paragraphs):
                 if para.style and "heading" in para.style.lower():
                    actions.append(FormatAction(action_type="set_alignment", target=f"paragraph_{i}", params={"alignment": "left"}))
                    actions.append(FormatAction(action_type="set_bold", target=f"paragraph_{i}", params={"bold": True}))

        elif norm == "vancouver":
            # --- Vancouver ---
            # Similar a ABNT/APA mas com especificidades médicas
            actions.append(FormatAction(action_type="set_font", target="all", 
                                      params={"font_name": "Times New Roman", "font_size": 12}))
            actions.append(FormatAction(action_type="set_spacing", target="all", 
                                      params={"line_spacing": 1.5, "space_after": 0, "space_before": 0}))
            actions.append(FormatAction(action_type="set_alignment", target="body", 
                                      params={"alignment": "justified"}))
            actions.append(FormatAction(action_type="set_margins", target="document", 
                                      params={"top": 2.54, "bottom": 2.54, "left": 2.54, "right": 2.54}))

        else:
            # --- ABNT (Default) ---
            actions.append(FormatAction(action_type="set_font", target="all", 
                                      params={"font_name": "Times New Roman", "font_size": 12}))
            actions.append(FormatAction(action_type="set_spacing", target="all", 
                                      params={"line_spacing": 1.5, "space_after": 0, "space_before": 0}))
            actions.append(FormatAction(action_type="set_alignment", target="body", 
                                      params={"alignment": "justified"}))
            # Margens ABNT: 3, 3, 2, 2
            actions.append(FormatAction(action_type="set_margins", target="document", 
                                      params={"top": 3.0, "bottom": 2.0, "left": 3.0, "right": 2.0}))
            
            # Ações por parágrafo (Recuo 1.25cm)
            for i, para in enumerate(content.paragraphs):
                if para.style and "heading" in para.style.lower():
                    actions.append(FormatAction(action_type="set_alignment", target=f"paragraph_{i}", params={"alignment": "left"})) # Títulos à esquerda na ABNT mais recente (algumas variações aceitam centralizado)
                    actions.append(FormatAction(action_type="set_bold", target=f"paragraph_{i}", params={"bold": True}))
                elif para.style and para.style.lower() == "normal":
                    actions.append(FormatAction(action_type="set_indent", target=f"paragraph_{i}", params={"first_line_indent": 1.25}))

        return FormatResponse(
            actions=actions,
            summary=f"Geradas {len(actions)} ações para norma {norm.upper()}",
            estimated_changes=len(actions)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na formatação: {str(e)}")


# ============================================
# WRITE STREAM (SSE)
# ============================================

@router.post("/write-stream")
async def write_stream(write_request: WriteRequest):
    """
    Gera texto acadêmico via streaming (Server-Sent Events).

    - Recebe instrução do usuário
    - Gera texto em chunks
    - Retorna via SSE para inserção gradual no Word
    - Rate limit: 10 requisições por minuto
    """

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # Preparar contexto e instrução
            context = write_request.context[:1000] if write_request.context else ""
            instruction = f"""{write_request.instruction}

Tom: {write_request.tone or 'academico'}
Formato: {write_request.format_type.value}
{f'Limite: aproximadamente {write_request.max_words} palavras.' if write_request.max_words else ''}"""

            # Usar o serviço de streaming com os argumentos corretos
            async for chunk in generate_academic_text_stream(
                document_context=context,
                instruction=instruction,
                section_type=write_request.section_type.value,
                format_type=write_request.format_type.value,
                knowledge_area=write_request.knowledge_area or 'geral',
                work_type=write_request.work_type or 'acadêmico'
            ):
                if chunk:
                    yield json.dumps({
                        "text": chunk,
                        "is_final": False
                    })
                    await asyncio.sleep(0.01)  # Pequeno delay para suavizar

            # Chunk final
            yield json.dumps({
                "text": "",
                "is_final": True
            })

        except Exception as e:
            yield json.dumps({
                "error": str(e),
                "is_final": True
            })

    return EventSourceResponse(generate_stream())


# ============================================
# WRITE (NON-STREAMING)
# ============================================

@router.post("/write", response_model=WriteResponse)
async def write_text(request: WriteRequest):
    """
    Gera texto acadêmico (versão não streaming).
    """
    try:
        # Preparar contexto do documento
        context = request.context[:1000] if request.context else ""

        # Chamar função de geração (síncrona)
        text = generate_academic_text(
            document_context=context,
            instruction=request.instruction,
            section_type=request.section_type.value,
            format_type=request.format_type.value,
            knowledge_area=request.knowledge_area or 'geral',
            work_type=request.work_type or 'acadêmico'
        )
        word_count = len(text.split())

        return WriteResponse(
            text=text,
            word_count=word_count,
            formatting={
                "font": "Times New Roman",
                "size": 12,
                "alignment": "justified",
                "line_spacing": 1.5
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na geração: {str(e)}")


# ============================================
# CHAT (com detecção de escrita integrada)
# ============================================

def detect_write_intent(message: str) -> tuple[bool, str, str]:
    """
    Detecta se o usuário quer gerar texto usando IA.
    Fallback para keywords se a IA falhar.
    Retorna: (is_write_intent, instruction, section_type)
    """
    from services.ai import detect_write_intent_ai

    # Usar IA para detecção semântica
    result = detect_write_intent_ai(message)
    
    is_write = result.get("is_write", False)
    section_type = result.get("section_type", "geral")
    instruction = result.get("refined_instruction", message) or message

    return is_write, instruction, section_type


@router.post("/chat", response_model=ChatResponse)
async def chat(chat_request: ChatRequest):
    """
    Chat contextualizado com o documento.
    Detecta automaticamente quando o usuário quer gerar texto.

    - Recebe mensagem do usuário e contexto do documento
    - Se project_id fornecido, inclui contexto dos PDFs do projeto
    - Se detectar intenção de escrita, gera o texto
    - Caso contrário, responde como assistente
    - Rate limit: 20 requisições por minuto
    """
    try:
        context = chat_request.context or "Documento sem conteúdo fornecido."
        has_pdf_context = False
        pdf_info = None
        context_info = None

        # Incluir contexto do projeto (PDFs) se fornecido
        if chat_request.project_id:
            pdf_info = project_service.get_project_context_info(chat_request.project_id)
            project_context = project_service.get_project_context(chat_request.project_id, max_chars=30000)
            if project_context and pdf_info:
                has_pdf_context = True
                # Construir info de contexto para retornar ao frontend
                context_info = ContextInfo(
                    has_pdf_context=True,
                    project_name=pdf_info.get('project_name'),
                    pdf_count=pdf_info.get('pdf_count', 0),
                    pdf_names=pdf_info.get('pdf_names', []),
                    total_words=pdf_info.get('total_words', 0)
                )
                context = f"""=== DOCUMENTOS DE REFERÊNCIA DO PROJETO "{pdf_info.get('project_name', 'Projeto')}" ===
Você tem acesso aos seguintes documentos para usar como base e referência:
{', '.join(pdf_info.get('pdf_names', []))}

CONTEÚDO EXTRAÍDO DOS DOCUMENTOS DE REFERÊNCIA:
{project_context}

=== DOCUMENTO ATUAL DO USUÁRIO (Word) ===
{chat_request.context or 'Nenhum conteúdo do documento atual.'}

=== INSTRUÇÕES ===
1. Use os documentos de referência como base para suas respostas
2. Você pode citar, parafrasear, expandir ou basear suas respostas no conteúdo desses documentos
3. Quando o usuário pedir para escrever algo, use as informações dos documentos como fonte
4. Mantenha coerência com o estilo e tema dos documentos anexados
5. Se o usuário perguntar sobre algo específico dos documentos, busque a informação relevante"""

        # Detectar se é uma solicitação de escrita
        is_write, instruction, section_type = detect_write_intent(chat_request.message)

        if is_write:
            # Modo de escrita: gerar texto acadêmico usando contexto expandido
            # Usar mais contexto quando há PDFs de referência
            context_limit = 20000 if has_pdf_context else 2000
            
            # Se for referências/citações, usar pipeline de citações reais
            if section_type in ("referencias", "referencial"):
                from services.ai import generate_citations_with_real_sources
                generated_text = await generate_citations_with_real_sources(
                    document_context=context[:context_limit],
                    instruction=instruction,
                    format_type=chat_request.format_type.value,
                    knowledge_area=chat_request.knowledge_area or 'geral',
                    num_refs=8
                )
            else:
                generated_text = generate_academic_text(
                    document_context=context[:context_limit],
                    instruction=instruction,
                    section_type=section_type,
                    format_type=chat_request.format_type.value,
                    knowledge_area=chat_request.knowledge_area or 'geral',
                    work_type=chat_request.work_type or 'acadêmico',
                    history=chat_request.history
                )

            # Auto-revisão do texto gerado
            from services.ai import review_generated_text
            review = review_generated_text(
                text=generated_text,
                section_type=section_type,
                format_type=chat_request.format_type.value,
                instruction=instruction
            )
            
            # Se a revisão corrigiu o texto, usar a versão corrigida
            final_text = review["corrected_text"]
            review_score = review["score"]
            was_reviewed = review_score >= 0  # -1 = erro na revisão

            word_count = len(final_text.split())

            # Resposta conversacional natural
            docs_note = ""
            if has_pdf_context and pdf_info:
                docs_note = f", baseado em {pdf_info.get('pdf_count', 0)} documento(s) de referência"

            section_labels = {
                "introducao": "uma introdução",
                "conclusao": "uma conclusão",
                "metodologia": "uma seção de metodologia",
                "resultados": "uma seção de resultados",
                "resumo": "um resumo",
                "desenvolvimento": "um desenvolvimento",
                "referencias": "referências",
                "referencial": "um referencial teórico",
                "geral": "o texto solicitado"
            }
            section_label = section_labels.get(section_type, "o texto solicitado")

            # Montar mensagem com info de revisão
            review_note = ""
            if was_reviewed and review_score >= 7:
                review_note = f" ✅ Revisado (nota {review_score}/10)."
            elif was_reviewed and review["was_corrected"]:
                review_note = f" ✏️ Revisado e aprimorado (nota {review_score}→ melhorado)."

            response_msg = f"Pronto! Gerei {section_label} com **{word_count} palavras**{docs_note}.{review_note} Confira abaixo e insira no documento quando desejar."

            return ChatResponse(
                message=response_msg,
                context_info=context_info,
                generated_content=final_text,
                was_reviewed=was_reviewed,
                review_score=review_score if was_reviewed else None
            )

        else:
            # Modo chat normal (Assistente)
            # Passar objetos de memória (converter Pydantic para dict se necessário)
            proj_mem_dict = chat_request.project_memory.dict() if chat_request.project_memory else None

            response_text = chat_with_document(
                document_text=context[:50000],
                user_message=chat_request.message,
                format_type=chat_request.format_type.value,
                knowledge_area=chat_request.knowledge_area or 'geral',
                work_type=chat_request.work_type or 'acadêmico',
                history=chat_request.history,
                project_memory=proj_mem_dict,
                events=chat_request.events
            )

            # Análise proativa (apenas se tiver contexto suficiente)
            proactive_suggestions = []
            if len(context) > 500 and "Erro" not in response_text:
                try:
                    from services.ai import analyze_document_gaps
                    gaps = analyze_document_gaps(context, norm=chat_request.format_type.value)
                    
                    for gap in gaps:
                        proactive_suggestions.append(ProactiveSuggestion(
                            type=gap["type"],
                            message=gap["message"],
                            action=gap["action"],
                            section_type=gap["section_type"]
                        ))
                except Exception as e:
                    print(f"Erro na análise proativa: {e}")

            # Sugestões contextualizadas
            suggestions = []
            if has_pdf_context:
                suggestions = [
                    "Escreva uma introdução baseada nos documentos",
                    "Resuma os documentos anexados",
                    "Use os PDFs para criar um tópico"
                ]
            else:
                suggestions = [
                    "Escreva uma introdução",
                    "Como melhorar a estrutura?",
                    f"Verifique a formatação {chat_request.format_type.value.upper()}"
                ]

            return ChatResponse(
                message=response_text,
                suggestions=suggestions,
                context_info=context_info,
                proactive_suggestions=proactive_suggestions if proactive_suggestions else None
            )

    except Exception as e:
        import traceback
        print(f"[ERROR] Chat endpoint error:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro no chat: {str(e)}")


# ============================================
# IMPROVE TEXT
# ============================================

@router.post("/improve", response_model=ImproveResponse)
async def improve_text(request: ImproveRequest):
    """
    Melhora o texto selecionado pelo usuário.

    - Recebe texto selecionado no Word
    - Aplica melhorias de clareza, concisão e formalidade
    - Retorna texto melhorado
    """
    try:
        # Instrução para melhorar o texto
        instruction = f"""Melhore este texto mantendo o significado original:
Tipo de melhoria: {request.improvement_type}

Texto original:
{request.text}

Aprimore: clareza, objetividade, formalidade acadêmica, coesão e correção gramatical.
Retorne apenas o texto melhorado, sem explicações."""

        # Chamar função de geração (síncrona)
        improved = generate_academic_text(
            document_context=request.text,
            instruction=instruction,
            section_type="geral"
        )

        return ImproveResponse(
            improved_text=improved.strip(),
            changes_summary="Texto revisado e aprimorado para maior clareza e formalidade acadêmica",
            original_word_count=len(request.text.split()),
            improved_word_count=len(improved.split())
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na melhoria: {str(e)}")


# ============================================
# HEALTH CHECK
# ============================================

@router.get("/health")
async def health_check():
    """Verifica se o serviço do Add-in está funcionando."""
    return {
        "status": "ok",
        "service": "normaex-addin",
        "version": "1.0.0"
    }


# ============================================
# IMAGE PROXY (para evitar CORS)
# ============================================

@router.get("/image-proxy")
async def image_proxy(url: str):
    """
    Proxy para buscar imagens externas e retornar em base64.
    Necessário para evitar problemas de CORS no Office Add-in.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

            content_type = response.headers.get('content-type', 'image/jpeg')
            image_data = response.content
            base64_data = base64.b64encode(image_data).decode('utf-8')

            return {
                "success": True,
                "base64": base64_data,
                "content_type": content_type
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao buscar imagem")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Erro ao buscar imagem")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no proxy de imagem: {str(e)}")


# ============================================
# CHART GENERATION (Gráficos)
# ============================================

@router.post("/generate-chart", response_model=ChartResponse)
async def generate_chart_endpoint(request: ChartRequest):
    """
    Gera um gráfico e retorna como imagem base64.

    Tipos suportados:
    - bar: Barras verticais
    - bar_horizontal: Barras horizontais
    - line: Linhas
    - pie: Pizza
    - area: Área
    - scatter: Dispersão
    """
    try:
        # Validar dados
        if len(request.labels) != len(request.values):
            raise HTTPException(
                status_code=400,
                detail="Número de labels deve ser igual ao número de valores"
            )

        if len(request.labels) < 2:
            raise HTTPException(
                status_code=400,
                detail="Necessário pelo menos 2 pontos de dados"
            )

        # Verificar se é multi-série
        if request.series and len(request.series) > 0:
            # Gráfico multi-série
            series_data = [{"name": s.name, "values": s.values} for s in request.series]
            base64_image = generate_multi_series_chart(
                chart_type=request.chart_type.value,
                labels=request.labels,
                series=series_data,
                title=request.title,
                x_label=request.x_label,
                y_label=request.y_label
            )
        else:
            # Gráfico simples
            base64_image = generate_chart(
                chart_type=request.chart_type.value,
                labels=request.labels,
                values=request.values,
                title=request.title,
                x_label=request.x_label,
                y_label=request.y_label,
                colors=request.colors
            )

        return ChartResponse(
            success=True,
            base64=base64_image
        )

    except ValueError as e:
        return ChartResponse(
            success=False,
            error=str(e)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar gráfico: {str(e)}")
@router.post("/review-selection", response_model=InlineReviewResponse)
async def review_selection_endpoint(request: InlineReviewRequest):
    """
    Revisa um trecho de texto selecionado (gramática, estilo, clareza).
    """
    result = review_selection(
        text=request.selected_text,
        instruction=request.instruction,
        format_type=request.format_type.value
    )
    return InlineReviewResponse(**result)
