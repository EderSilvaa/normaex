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

        # 2. Verificar parágrafos
        paragraphs = content.paragraphs

        for i, para in enumerate(paragraphs):
            # Verificar fonte
            if para.font_name and para.font_name.lower() not in ["times new roman", "arial"]:
                issues.append(Issue(
                    code="ABNT_002",
                    message=f"Fonte não recomendada: {para.font_name}",
                    severity=IssueSeverity.WARNING,
                    paragraph_index=i,
                    suggestion="Use Times New Roman ou Arial conforme ABNT"
                ))
                score -= 3

            # Verificar tamanho da fonte
            if para.font_size and para.font_size != 12:
                issues.append(Issue(
                    code="ABNT_003",
                    message=f"Tamanho de fonte incorreto: {para.font_size}pt",
                    severity=IssueSeverity.INFO,
                    paragraph_index=i,
                    suggestion="Use fonte tamanho 12pt para texto normal"
                ))
                score -= 2

            # Verificar alinhamento do corpo do texto
            if para.alignment and para.alignment.lower() not in ["justified", "justify", "both"]:
                if para.style and "heading" not in para.style.lower():
                    issues.append(Issue(
                        code="ABNT_004",
                        message="Texto deve ser justificado",
                        severity=IssueSeverity.INFO,
                        paragraph_index=i,
                        suggestion="Aplique alinhamento justificado ao texto"
                    ))
                    score -= 1

            # Verificar espaçamento entre linhas
            if para.line_spacing and para.line_spacing != 1.5:
                issues.append(Issue(
                    code="ABNT_005",
                    message=f"Espaçamento incorreto: {para.line_spacing}",
                    severity=IssueSeverity.INFO,
                    paragraph_index=i,
                    suggestion="Use espaçamento de 1,5 entre linhas"
                ))
                score -= 1

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
            # Construir prompt baseado na instrução
            prompt = f"""Você é um assistente acadêmico especializado em escrita de documentos.

Instrução do usuário: {request.instruction}

Tipo de seção: {request.section_type.value}
Tipo de documento: {request.format_type.value}
Tom: {request.tone or 'academico'}

{f'Contexto do documento: {request.context[:1000]}...' if request.context else ''}

Gere o texto solicitado seguindo as normas de escrita acadêmica.
Seja claro, objetivo e mantenha a formalidade apropriada.
{f'Limite: aproximadamente {request.max_words} palavras.' if request.max_words else ''}"""

            # Usar o serviço de streaming existente
            async for chunk in generate_academic_text_stream(prompt):
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
        prompt = f"""Você é um assistente acadêmico especializado em escrita de documentos.

Instrução do usuário: {request.instruction}

Tipo de seção: {request.section_type.value}
Tipo de documento: {request.format_type.value}

{f'Contexto: {request.context[:1000]}...' if request.context else ''}

Gere o texto solicitado seguindo as normas de escrita acadêmica."""

        text = await generate_academic_text(prompt)
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
        prompt = f"""Você é um revisor acadêmico especialista.

Texto original:
{request.text}

Tipo de melhoria: {request.improvement_type}
Formato: {request.format_type.value}

Melhore este texto mantendo o significado original mas aprimorando:
- Clareza e objetividade
- Formalidade acadêmica
- Coesão e coerência
- Correção gramatical

Retorne apenas o texto melhorado, sem explicações."""

        improved = await generate_academic_text(prompt)

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
