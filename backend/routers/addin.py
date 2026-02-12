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
from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter compartilhado (registrado no main.py)
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")

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
@limiter.limit("10/minute")
async def analyze_content(request: Request, content: DocumentContent):
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

        # Determinar norma e regras
        norm_key = content.format_type.value.lower() if content.format_type else "abnt"
        
        # Configuração de Regras por Norma
        rules_map = {
            "abnt": {
                "name": "ABNT",
                "fonts": ["times new roman", "arial"],
                "sizes": {"normal": [11, 12], "quote": [10, 11], "min": 10, "max": 12.5},
                "alignment": ["justified", "justify", "both"],
                "spacing": [1.5],
                "margins": {"top": 3.0, "left": 3.0, "bottom": 2.0, "right": 2.0},
                "msg_spacing": "1.5",
                "msg_align": "justificado"
            },
            "apa": {
                "name": "APA",
                "fonts": ["times new roman", "arial", "calibri", "georgia", "lucida sans unicode", "computer modern"],
                "sizes": {"normal": [10, 11, 12], "quote": [10, 11, 12], "min": 10, "max": 12.5},
                "alignment": ["left"], # Alinhamento à esquerda (não justificado)
                "spacing": [2.0],
                "margins": {"top": 2.54, "left": 2.54, "bottom": 2.54, "right": 2.54}, # 1 polegada
                "msg_spacing": "duplo (2.0)",
                "msg_align": "alinhado à esquerda"
            },
            "vancouver": {
                "name": "Vancouver",
                "fonts": ["times new roman", "arial", "calibri"], 
                "sizes": {"normal": [11, 12], "quote": [10, 11], "min": 10, "max": 12.5},
                "alignment": ["justified", "justify", "both"], # Comum, mas não obrigatório
                "spacing": [1.5, 2.0], # Varia por journal
                "margins": {"top": 2.5, "left": 2.5, "bottom": 2.5, "right": 2.5}, # Geralmente 1 polegada
                "msg_spacing": "1.5 ou duplo",
                "msg_align": "justificado"
            },
            "ieee": {
                "name": "IEEE",
                "fonts": ["times new roman", "arial"], 
                "sizes": {"normal": [10, 11, 12], "quote": [9, 10], "min": 9, "max": 12.5},
                "alignment": ["justified", "left"],
                "spacing": [1.0, 1.15, 1.5], # Simples é comum em papers finais
                "margins": {"top": 1.9, "left": 1.3, "bottom": 1.9, "right": 1.3},
                "msg_spacing": "simples",
                "msg_align": "justificado"
            }
        }
        
        rules = rules_map.get(norm_key, rules_map["abnt"])

        # Analisar documento
        issues = []
        score = 100
        
        # 1. Verificar tamanho mínimo
        word_count = len(full_text.split())
        if word_count < 100:
            issues.append(Issue(
                code="DOC_SIZE",
                message="Documento muito curto para análise completa",
                severity=IssueSeverity.WARNING,
                suggestion="Adicione mais conteúdo para uma análise mais precisa"
            ))
            score -= 5

        # 2. Verificar parágrafos
        paragraphs = content.paragraphs
        font_issues = {"wrong_font": [], "wrong_size": []}
        alignment_issues = []
        spacing_issues = []

        for i, para in enumerate(paragraphs):
            # --- FILTROS (mesmos da original) ---
            text_content = para.text.strip() if para.text else ""
            if len(text_content) < 3: continue
            
            clean_text = text_content.replace(" ", "").replace("\t", "").replace("\n", "")
            if re.match(r'^[-_=*~.•·]{2,}$', clean_text): continue
            if clean_text in ["", ".", ",", "-", "—", "–", ":", ";", "..."]: continue
            
            words_in_para = len([w for w in text_content.split() if len(w) >= 3 and w.isalpha()])
            if words_in_para < 2: continue

            # --- IDENTIFICAÇÃO DE ESTILO ---
            style_lower = para.style.lower() if para.style else ""
            is_heading = "heading" in style_lower or "título" in style_lower
            is_title = "title" in style_lower
            is_footnote = "footnote" in style_lower or "nota" in style_lower and re.match(r'^[\d¹²³]+\s', text_content)
            is_quote = "quote" in style_lower or "citação" in style_lower
            
            # Detecção heurística de citação
            if para.font_size and para.font_size <= rules["sizes"]["quote"][-1] and para.first_line_indent and para.first_line_indent > 25:
                is_quote = True

            # --- VALIDAÇÕES ---
            
            # Fonte
            if para.font_name and not is_heading and not is_title:
                font_lower = para.font_name.lower()
                if font_lower not in rules["fonts"]:
                    font_issues["wrong_font"].append({"index": i, "font": para.font_name})

            # Tamanho
            if para.font_size:
                size = float(para.font_size)
                skip_size_check = is_footnote or is_heading or is_title
                
                if is_quote:
                    if size not in rules["sizes"]["quote"] and (size < rules["sizes"]["min"] or size > rules["sizes"]["max"]):
                         font_issues["wrong_size"].append({"index": i, "size": size, "expected": str(rules["sizes"]["quote"])})
                
                elif not skip_size_check:
                    if size < rules["sizes"]["min"] or size > rules["sizes"]["max"]:
                        font_issues["wrong_size"].append({"index": i, "size": size, "expected": str(rules["sizes"]["normal"])})

            # Alinhamento
            if para.alignment and not is_heading and not is_title:
                align = para.alignment.lower()
                if align not in rules["alignment"]:
                    alignment_issues.append({"index": i, "alignment": para.alignment})

            # Espaçamento
            if para.line_spacing and not is_footnote and not is_quote and not is_heading:
                # Tolerância pequena para float
                is_valid_spacing = any(abs(para.line_spacing - valid) < 0.1 for valid in rules["spacing"])
                if not is_valid_spacing:
                    spacing_issues.append({"index": i, "spacing": para.line_spacing})

        # --- REPORTAR ISSUES ---
        
        # Fontes
        if font_issues["wrong_font"]:
            unique = list(set([f["font"] for f in font_issues["wrong_font"]]))
            count = len(font_issues["wrong_font"])
            issues.append(Issue(
                code="FONT_STYLE",
                message=f"Fonte não recomendada para {rules['name']} em {count} parágrafo(s): {', '.join(unique[:3])}",
                severity=IssueSeverity.WARNING,
                paragraph_index=font_issues["wrong_font"][0]["index"],
                suggestion=f"Use uma das fontes permitidas: {', '.join(rules['fonts'][:2]).title()}"
            ))
            score -= min(count * 2, 10)

        # Tamanho
        if font_issues["wrong_size"]:
            count = len(font_issues["wrong_size"])
            issues.append(Issue(
                code="FONT_SIZE",
                message=f"Tamanho de fonte incorreto para norma {rules['name']} em {count} parágrafo(s)",
                severity=IssueSeverity.INFO,
                paragraph_index=font_issues["wrong_size"][0]["index"],
                suggestion=f"Verifique tamanhos (Texto: {rules['sizes']['normal']}, Citação: {rules['sizes']['quote']})"
            ))
            score -= min(count, 5)

        # Alinhamento
        if alignment_issues:
            count = len(alignment_issues)
            issues.append(Issue(
                code="ALIGNMENT",
                message=f"Alinhamento incorreto em {count} parágrafo(s) para {rules['name']}",
                severity=IssueSeverity.INFO,
                paragraph_index=alignment_issues[0]["index"],
                suggestion=f"Use alinhamento {rules['msg_align']}"
            ))
            score -= min(count, 5)

        # Espaçamento
        if spacing_issues:
            count = len(spacing_issues)
            issues.append(Issue(
                code="SPACING",
                message=f"Espaçamento de linha incorreto em {count} parágrafos",
                severity=IssueSeverity.INFO,
                paragraph_index=spacing_issues[0]["index"],
                suggestion=f"A norma {rules['name']} geralmente usa espaçamento {rules['msg_spacing']}"
            ))
            score -= min(count, 5)

        # 3. Verificar margens (com a configuração específica da norma)
        if content.page_setup and content.page_setup.margins:
            margins = content.page_setup.margins
            target_margins = rules["margins"]
            margin_issues = []
            tolerance = 0.3

            for side in ["top", "bottom", "left", "right"]:
                actual = getattr(margins, f"{side}_cm", 0)
                expected = target_margins[side]
                if abs(actual - expected) > tolerance:
                    margin_issues.append(f"{side} ({actual}cm, deveria {expected}cm)")

            if margin_issues:
                issues.append(Issue(
                    code="MARGINS",
                    message=f"Margens fora do padrão {rules['name']}: {', '.join(margin_issues[:2])}",
                    severity=IssueSeverity.WARNING,
                    suggestion=f"Ajuste as margens: Sup/Esq {target_margins['top']}cm, Inf/Dir {target_margins['bottom']}cm (valores aproximados)"
                ))
                score -= min(len(margin_issues) * 3, 10)

        # 4. Verificar estrutura básica (comum a todas, mas flexível)
        text_lower = full_text.lower()
        has_intro = any(term in text_lower for term in ["introdução", "introducao", "introduction"])
        has_conclusion = any(term in text_lower for term in ["conclusão", "conclusao", "considerações", "conclusion"])
        has_references = any(term in text_lower for term in ["referências", "referencias", "references", "bibliografia"])

        if not has_intro:
            issues.append(Issue(code="STRUCT_MISSING", message="Introdução não identificada", severity=IssueSeverity.WARNING, suggestion="Adicione uma seção introdutória"))
            score -= 3
        if not has_conclusion:
            issues.append(Issue(code="STRUCT_MISSING", message="Conclusão não identificada", severity=IssueSeverity.WARNING, suggestion="Adicione uma conclusão"))
            score -= 3
        if not has_references:
            issues.append(Issue(code="STRUCT_MISSING", message="Referências não identificadas", severity=IssueSeverity.WARNING, suggestion="Adicione as referências bibliográficas"))
            score -= 5

        # Garantir score de 0 a 100
        score = max(0, min(100, score))

        # Gerar sugestões finais
        suggestions = []
        if score < 100:
            suggestions.append(f"Revise a formatação conforme normas {rules['name']}")
        
        summary = f"Análise {rules['name']} completa. Score: {score}/100"

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
                "format_type": norm_key
            },
            summary=summary
        )

    except Exception as e:
        import traceback
        print(f"[ERROR] analyze-content: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno na análise do documento")


# ============================================
# FORMAT CONTENT
# ============================================

@router.post("/format-content", response_model=FormatResponse)
@limiter.limit("10/minute")
async def format_content(request: Request, content: DocumentContent):
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
        import traceback
        print(f"[ERROR] format-content: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno na formatação do documento")


# ============================================
# WRITE STREAM (SSE)
# ============================================

@router.post("/write-stream")
@limiter.limit("10/minute")
async def write_stream(request: Request, write_request: WriteRequest):
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
            print(f"[ERROR] write-stream: {e}")
            yield json.dumps({
                "error": "Erro na geração de texto",
                "is_final": True
            })

    return EventSourceResponse(generate_stream())


# ============================================
# WRITE (NON-STREAMING)
# ============================================

@router.post("/write", response_model=WriteResponse)
@limiter.limit("10/minute")
async def write_text(request: Request, write_request: WriteRequest):
    """
    Gera texto acadêmico (versão não streaming).
    """
    try:
        # Preparar contexto do documento
        context = write_request.context[:1000] if write_request.context else ""

        # Chamar função de geração (síncrona)
        text = generate_academic_text(
            document_context=context,
            instruction=write_request.instruction,
            section_type=write_request.section_type.value,
            format_type=write_request.format_type.value,
            knowledge_area=write_request.knowledge_area or 'geral',
            work_type=write_request.work_type or 'acadêmico'
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
        import traceback
        print(f"[ERROR] write: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno na geração de texto")


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
@limiter.limit("20/minute")
async def chat(request: Request, chat_request: ChatRequest):
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
            was_reviewed = review.get("was_corrected", False)
            detailed_review_data = review.get("detailed_review")

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
                review_score=review_score if was_reviewed else None,
                detailed_review=detailed_review_data
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
        print(f"[ERROR] chat: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno no chat")


# ============================================
# IMPROVE TEXT
# ============================================

@router.post("/improve", response_model=ImproveResponse)
@limiter.limit("15/minute")
async def improve_text(request: Request, improve_request: ImproveRequest):
    """
    Melhora o texto selecionado pelo usuário.

    - Recebe texto selecionado no Word
    - Aplica melhorias de clareza, concisão e formalidade
    - Retorna texto melhorado
    """
    try:
        # Instrução para melhorar o texto
        instruction = f"""Melhore este texto mantendo o significado original:
Tipo de melhoria: {improve_request.improvement_type}

Texto original:
{improve_request.text}

Aprimore: clareza, objetividade, formalidade acadêmica, coesão e correção gramatical.
Retorne apenas o texto melhorado, sem explicações."""

        # Chamar função de geração (síncrona)
        improved = generate_academic_text(
            document_context=improve_request.text,
            instruction=instruction,
            section_type="geral"
        )

        return ImproveResponse(
            improved_text=improved.strip(),
            changes_summary="Texto revisado e aprimorado para maior clareza e formalidade acadêmica",
            original_word_count=len(improve_request.text.split()),
            improved_word_count=len(improved.split())
        )

    except Exception as e:
        import traceback
        print(f"[ERROR] improve: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno na melhoria do texto")


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

# Domínios permitidos para o image proxy (previne SSRF)
ALLOWED_IMAGE_DOMAINS = [
    "source.unsplash.com",
    "images.unsplash.com",
    "plus.unsplash.com",
    "upload.wikimedia.org",
    "commons.wikimedia.org",
    "i.imgur.com",
    "pixabay.com",
    "cdn.pixabay.com",
    "pexels.com",
    "images.pexels.com",
]

# Tamanho máximo de imagem: 10MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024


@router.get("/image-proxy")
@limiter.limit("30/minute")
async def image_proxy(request: Request, url: str):
    """
    Proxy para buscar imagens externas e retornar em base64.
    Necessário para evitar problemas de CORS no Office Add-in.
    Apenas domínios na allowlist são permitidos.
    """
    try:
        from urllib.parse import urlparse
        import ipaddress

        parsed = urlparse(url)

        # Validar protocolo (apenas HTTPS)
        if parsed.scheme not in ("https", "http"):
            raise HTTPException(status_code=400, detail="Apenas URLs HTTP/HTTPS são permitidas")

        hostname = parsed.hostname or ""

        # Bloquear IPs privados/internos (anti-SSRF)
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                raise HTTPException(status_code=403, detail="Acesso a IPs internos não permitido")
        except ValueError:
            pass  # hostname não é IP, continuar com validação de domínio

        # Verificar se o domínio está na allowlist
        domain_allowed = any(
            hostname == domain or hostname.endswith(f".{domain}")
            for domain in ALLOWED_IMAGE_DOMAINS
        )
        if not domain_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Domínio não permitido. Domínios aceitos: {', '.join(ALLOWED_IMAGE_DOMAINS[:5])}"
            )

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, max_redirects=3) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Validar content-type
            content_type = response.headers.get('content-type', '')
            if not content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="URL não retornou uma imagem válida")

            # Validar tamanho
            image_data = response.content
            if len(image_data) > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=413, detail="Imagem excede o limite de 10MB")

            base64_data = base64.b64encode(image_data).decode('utf-8')

            return {
                "success": True,
                "base64": base64_data,
                "content_type": content_type
            }
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao buscar imagem")
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Erro ao buscar imagem do servidor externo")
    except Exception:
        raise HTTPException(status_code=500, detail="Erro interno no proxy de imagem")


# ============================================
# CHART GENERATION (Gráficos)
# ============================================

@router.post("/generate-chart", response_model=ChartResponse)
@limiter.limit("15/minute")
async def generate_chart_endpoint(request: Request, chart_request: ChartRequest):
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
        if len(chart_request.labels) != len(chart_request.values):
            raise HTTPException(
                status_code=400,
                detail="Número de labels deve ser igual ao número de valores"
            )

        if len(chart_request.labels) < 2:
            raise HTTPException(
                status_code=400,
                detail="Necessário pelo menos 2 pontos de dados"
            )

        # Verificar se é multi-série
        if chart_request.series and len(chart_request.series) > 0:
            # Gráfico multi-série
            series_data = [{"name": s.name, "values": s.values} for s in chart_request.series]
            base64_image = generate_multi_series_chart(
                chart_type=chart_request.chart_type.value,
                labels=chart_request.labels,
                series=series_data,
                title=chart_request.title,
                x_label=chart_request.x_label,
                y_label=chart_request.y_label
            )
        else:
            # Gráfico simples
            base64_image = generate_chart(
                chart_type=chart_request.chart_type.value,
                labels=chart_request.labels,
                values=chart_request.values,
                title=chart_request.title,
                x_label=chart_request.x_label,
                y_label=chart_request.y_label,
                colors=chart_request.colors
            )

        return ChartResponse(
            success=True,
            base64=base64_image
        )

    except ValueError as e:
        return ChartResponse(
            success=False,
            error="Dados inválidos para geração do gráfico"
        )
    except Exception as e:
        import traceback
        print(f"[ERROR] generate-chart: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno na geração do gráfico")
@router.post("/review-selection", response_model=InlineReviewResponse)
@limiter.limit("15/minute")
async def review_selection_endpoint(request: Request, review_request: InlineReviewRequest):
    """
    Revisa um trecho de texto selecionado (gramática, estilo, clareza).
    """
    result = review_selection(
        text=review_request.selected_text,
        instruction=review_request.instruction,
        format_type=review_request.format_type.value
    )
    return InlineReviewResponse(**result)
