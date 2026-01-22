"""
Router para endpoints do Office Add-in
Esses endpoints recebem conteúdo JSON diretamente (não arquivos)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from typing import AsyncGenerator
import json
import asyncio
import re

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
    ImproveRequest,
    ImproveResponse
)

from services.ai import (
    chat_with_document,
    generate_academic_text,
    generate_academic_text_stream
)
from services.ai_structural import analyze_document_with_ai
from services.ai_writer import write_structured_streaming

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
                if font_lower not in ["times new roman", "arial", "calibri"]:
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
            if count > 2:  # Só reportar se houver mais de 2 parágrafos
                issues.append(Issue(
                    code="ABNT_004",
                    message=f"{count} parágrafos não estão justificados",
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

        # 3. Verificar estrutura básica
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
    Gera instruções de formatação ABNT para o documento.

    - Analisa o documento e identifica o que precisa ser formatado
    - Retorna lista de ações que o Add-in deve aplicar via Office.js
    """
    try:
        actions = []

        # Ação global: definir fonte padrão
        actions.append(FormatAction(
            action_type="set_font",
            target="all",
            params={
                "font_name": "Times New Roman",
                "font_size": 12
            }
        ))

        # Ação global: definir espaçamento
        actions.append(FormatAction(
            action_type="set_spacing",
            target="all",
            params={
                "line_spacing": 1.5,
                "space_after": 0,
                "space_before": 0
            }
        ))

        # Ação global: justificar texto
        actions.append(FormatAction(
            action_type="set_alignment",
            target="body",
            params={
                "alignment": "justified"
            }
        ))

        # Ações específicas por parágrafo
        for i, para in enumerate(content.paragraphs):
            # Se é um título (heading), centralizar
            if para.style and "heading" in para.style.lower():
                actions.append(FormatAction(
                    action_type="set_alignment",
                    target=f"paragraph_{i}",
                    params={
                        "alignment": "center"
                    }
                ))

                # Títulos em negrito
                actions.append(FormatAction(
                    action_type="set_bold",
                    target=f"paragraph_{i}",
                    params={
                        "bold": True
                    }
                ))

            # Recuo da primeira linha para parágrafos normais
            if para.style and para.style.lower() == "normal":
                actions.append(FormatAction(
                    action_type="set_indent",
                    target=f"paragraph_{i}",
                    params={
                        "first_line_indent": 1.25  # 1.25 cm conforme ABNT
                    }
                ))

        # Ação para margens
        actions.append(FormatAction(
            action_type="set_margins",
            target="document",
            params={
                "top": 3.0,      # 3 cm
                "bottom": 2.0,   # 2 cm
                "left": 3.0,     # 3 cm
                "right": 2.0     # 2 cm
            }
        ))

        return FormatResponse(
            actions=actions,
            summary=f"Geradas {len(actions)} ações de formatação ABNT",
            estimated_changes=len(actions)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na formatação: {str(e)}")


# ============================================
# WRITE STREAM (SSE)
# ============================================

@router.post("/write-stream")
async def write_stream(request: WriteRequest):
    """
    Gera texto acadêmico via streaming (Server-Sent Events).

    - Recebe instrução do usuário
    - Gera texto em chunks
    - Retorna via SSE para inserção gradual no Word
    """

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # Preparar contexto e instrução
            context = request.context[:1000] if request.context else ""
            instruction = f"""{request.instruction}

Tom: {request.tone or 'academico'}
Formato: {request.format_type.value}
{f'Limite: aproximadamente {request.max_words} palavras.' if request.max_words else ''}"""

            # Usar o serviço de streaming com os 3 argumentos corretos
            async for chunk in generate_academic_text_stream(
                document_context=context,
                instruction=instruction,
                section_type=request.section_type.value
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
            section_type=request.section_type.value
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
# CHAT
# ============================================

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat contextualizado com o documento.

    - Recebe mensagem do usuário e contexto do documento
    - Retorna resposta da IA com conhecimento do documento
    """
    try:
        # Construir contexto para a IA
        context = request.context or "Documento sem conteúdo fornecido."

        # Usar serviço de chat existente (adaptado)
        # Nota: chat_with_document é síncrono, então não usamos await
        response = chat_with_document(
            document_text=context,
            user_message=request.message
        )

        # Gerar sugestões de perguntas relacionadas
        suggestions = [
            "Como posso melhorar este texto?",
            "O que está faltando no documento?",
            "Verifique se há erros de formatação"
        ]

        return ChatResponse(
            message=response,
            suggestions=suggestions
        )

    except Exception as e:
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
