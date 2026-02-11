"""
Models Pydantic para o Office Add-in
Esses models definem a estrutura de dados trocada entre o Add-in e o Backend
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


# ============================================
# ENUMS
# ============================================

class FormatType(str, Enum):
    ABNT = "abnt"
    APA = "apa"
    VANCOUVER = "vancouver"
    IEEE = "ieee"
    JURIDICO = "juridico"
    PROFISSIONAL = "profissional"


class SectionType(str, Enum):
    INTRODUCAO = "introducao"
    DESENVOLVIMENTO = "desenvolvimento"
    METODOLOGIA = "metodologia"
    RESULTADOS = "resultados"
    CONCLUSAO = "conclusao"
    REFERENCIAS = "referencias"
    RESUMO = "resumo"
    ABSTRACT = "abstract"
    GERAL = "geral"


class IssueSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


# ============================================
# DOCUMENT CONTENT MODELS
# ============================================

class ParagraphData(BaseModel):
    """Representa um parágrafo do documento Word"""
    text: str = Field(..., description="Conteúdo textual do parágrafo")
    style: Optional[str] = Field(None, description="Nome do estilo aplicado (Normal, Heading 1, etc)")
    font_name: Optional[str] = Field(None, description="Nome da fonte")
    font_size: Optional[float] = Field(None, description="Tamanho da fonte em pontos")
    alignment: Optional[str] = Field(None, description="Alinhamento: left, center, right, justified")
    line_spacing: Optional[float] = Field(None, description="Espaçamento entre linhas")
    first_line_indent: Optional[float] = Field(None, description="Recuo da primeira linha em cm")
    is_bold: Optional[bool] = Field(False, description="Se o texto está em negrito")
    is_italic: Optional[bool] = Field(False, description="Se o texto está em itálico")


class PageMargins(BaseModel):
    """Margens da página em centímetros"""
    top_cm: float = Field(default=3.0, description="Margem superior em cm")
    bottom_cm: float = Field(default=2.0, description="Margem inferior em cm")
    left_cm: float = Field(default=3.0, description="Margem esquerda em cm")
    right_cm: float = Field(default=2.0, description="Margem direita em cm")


class PageSetup(BaseModel):
    """Configurações de página do documento"""
    margins: PageMargins = Field(default_factory=PageMargins, description="Margens da página")
    page_size: str = Field(default="A4", description="Tamanho da página")
    orientation: str = Field(default="portrait", description="Orientação: portrait ou landscape")


class DocumentContent(BaseModel):
    """Conteúdo completo do documento enviado pelo Add-in"""
    paragraphs: List[ParagraphData] = Field(..., description="Lista de parágrafos do documento")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadados do documento")
    format_type: FormatType = Field(default=FormatType.ABNT, description="Tipo de formatação desejada")
    full_text: Optional[str] = Field(None, description="Texto completo concatenado")
    page_setup: Optional[PageSetup] = Field(None, description="Configurações de página (margens, tamanho)")


class SelectionContent(BaseModel):
    """Conteúdo selecionado pelo usuário no Word"""
    text: str = Field(..., description="Texto selecionado")
    start_index: Optional[int] = Field(None, description="Índice inicial da seleção")
    end_index: Optional[int] = Field(None, description="Índice final da seleção")
    paragraph_index: Optional[int] = Field(None, description="Índice do parágrafo selecionado")


# ============================================
# ANALYSIS MODELS
# ============================================

class Issue(BaseModel):
    """Representa um problema encontrado no documento"""
    code: str = Field(..., description="Código do problema (ex: ABNT_001)")
    message: str = Field(..., description="Descrição do problema")
    severity: IssueSeverity = Field(..., description="Gravidade: error, warning, info")
    location: Optional[str] = Field(None, description="Localização no documento")
    suggestion: Optional[str] = Field(None, description="Sugestão de correção")
    paragraph_index: Optional[int] = Field(None, description="Índice do parágrafo com problema")


class AnalysisResponse(BaseModel):
    """Resposta da análise de conformidade do documento"""
    score: int = Field(..., ge=0, le=100, description="Score de conformidade (0-100)")
    issues: List[Issue] = Field(default_factory=list, description="Lista de problemas encontrados")
    suggestions: List[str] = Field(default_factory=list, description="Sugestões gerais de melhoria")
    compliance_details: Dict[str, Any] = Field(default_factory=dict, description="Detalhes de conformidade por categoria")
    summary: str = Field("", description="Resumo da análise")


# ============================================
# FORMAT MODELS
# ============================================

class FormatAction(BaseModel):
    """Uma ação de formatação a ser aplicada"""
    action_type: str = Field(..., description="Tipo de ação: set_font, set_alignment, etc")
    target: str = Field(..., description="Alvo: all, paragraph_0, selection, etc")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parâmetros da ação")


class FormatResponse(BaseModel):
    """Resposta com instruções de formatação para o Add-in aplicar"""
    actions: List[FormatAction] = Field(default_factory=list, description="Lista de ações de formatação")
    summary: str = Field("", description="Resumo das alterações")
    estimated_changes: int = Field(0, description="Número estimado de alterações")


# ============================================
# WRITE/GENERATE MODELS
# ============================================

class WriteRequest(BaseModel):
    """Solicitação de geração de texto com IA"""
    instruction: str = Field(..., description="Instrução do usuário (ex: 'escreva uma introdução sobre IA')")
    section_type: SectionType = Field(default=SectionType.GERAL, description="Tipo de seção")
    context: Optional[str] = Field(None, description="Contexto do documento atual")
    format_type: FormatType = Field(default=FormatType.ABNT, description="Tipo de formatação")
    max_words: Optional[int] = Field(None, description="Limite de palavras")
    tone: Optional[str] = Field("academico", description="Tom do texto: academico, formal, tecnico")
    work_type: Optional[str] = Field(None, description="Tipo de trabalho: tcc, artigo...")
    knowledge_area: Optional[str] = Field(None, description="Área: psicologia, direito...")


class WriteChunk(BaseModel):
    """Um chunk de texto gerado via streaming"""
    text: str = Field(..., description="Fragmento de texto gerado")
    is_final: bool = Field(False, description="Se é o último chunk")
    formatting: Optional[Dict[str, Any]] = Field(None, description="Formatação sugerida para o chunk")


class WriteResponse(BaseModel):
    """Resposta completa de geração de texto (não streaming)"""
    text: str = Field(..., description="Texto gerado completo")
    word_count: int = Field(0, description="Contagem de palavras")
    formatting: Optional[Dict[str, Any]] = Field(None, description="Formatação sugerida")


# ============================================
# CHAT MODELS
# ============================================

class ProjectMemory(BaseModel):
    """Memória persistente do projeto do usuário"""
    structure: Optional[str] = Field(None, description="Estrutura gerada para o trabalho")
    saved_references: List[Dict[str, Any]] = Field(default_factory=list, description="Referências salvas pelo usuário")


class ChatRequest(BaseModel):
    """Solicitação de chat com contexto do documento"""
    message: str = Field(..., description="Mensagem do usuário")
    context: Optional[str] = Field(None, description="Contexto do documento (texto selecionado ou documento completo)")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Histórico de mensagens")
    
    # Novos campos de memória
    project_memory: Optional[ProjectMemory] = Field(default_factory=ProjectMemory, description="Memória persistente do projeto")
    events: Optional[List[str]] = Field(default_factory=list, description="Lista de eventos recentes do sistema")

    project_id: Optional[str] = Field(None, description="ID do projeto para incluir contexto de PDFs")
    format_type: FormatType = Field(default=FormatType.ABNT, description="Tipo de formatação")
    work_type: Optional[str] = Field(None, description="Tipo de trabalho: tcc, artigo...")
    knowledge_area: Optional[str] = Field(None, description="Área: psicologia, direito...")


class ContextInfo(BaseModel):
    """Informações sobre o contexto de PDFs usado na resposta"""
    has_pdf_context: bool = Field(False, description="Se há contexto de PDFs sendo usado")
    project_name: Optional[str] = Field(None, description="Nome do projeto")
    pdf_count: int = Field(0, description="Número de PDFs usados como contexto")
    pdf_names: List[str] = Field(default_factory=list, description="Nomes dos PDFs")
    total_words: int = Field(0, description="Total de palavras nos PDFs")


class ChatResponse(BaseModel):
    """Resposta do chat"""
    message: str = Field(..., description="Resposta da IA")
    suggestions: Optional[List[str]] = Field(None, description="Sugestões de perguntas relacionadas")
    context_info: Optional[ContextInfo] = Field(None, description="Info sobre contexto de PDFs usado")
    generated_content: Optional[str] = Field(None, description="Conteúdo limpo gerado para inserção")


# ============================================
# IMPROVE TEXT MODELS
# ============================================

class ImproveRequest(BaseModel):
    """Solicitação de melhoria de texto"""
    text: str = Field(..., description="Texto a ser melhorado")
    improvement_type: Optional[str] = Field("geral", description="Tipo: geral, clareza, formalidade, concisao")
    format_type: FormatType = Field(default=FormatType.ABNT, description="Tipo de formatação")


class ImproveResponse(BaseModel):
    """Resposta de melhoria de texto"""
    improved_text: str = Field(..., description="Texto melhorado")
    changes_summary: str = Field("", description="Resumo das alterações feitas")
    original_word_count: int = Field(0, description="Contagem de palavras original")
    improved_word_count: int = Field(0, description="Contagem de palavras após melhoria")


# ============================================
# VALIDATION MODELS (WebSocket)
# ============================================

class ValidationMessage(BaseModel):
    """Mensagem enviada via WebSocket para validação em tempo real"""
    content: str = Field(..., description="Conteúdo a ser validado")
    format_type: FormatType = Field(default=FormatType.ABNT, description="Tipo de formatação")


class ValidationResult(BaseModel):
    """Resultado da validação em tempo real"""
    score: int = Field(..., ge=0, le=100, description="Score atual")
    issues_count: int = Field(0, description="Número de problemas")
    quick_issues: List[str] = Field(default_factory=list, description="Lista rápida de problemas principais")


# ============================================
# CHART MODELS
# ============================================

class ChartType(str, Enum):
    BAR = "bar"
    BAR_HORIZONTAL = "bar_horizontal"
    LINE = "line"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"


class ChartDataSeries(BaseModel):
    """Uma série de dados para gráficos multi-série"""
    name: str = Field(..., description="Nome da série")
    values: List[float] = Field(..., description="Valores da série")


class ChartRequest(BaseModel):
    """Solicitação de geração de gráfico"""
    chart_type: ChartType = Field(..., description="Tipo de gráfico")
    labels: List[str] = Field(..., description="Rótulos dos dados (eixo X ou categorias)")
    values: List[float] = Field(..., description="Valores numéricos")
    title: Optional[str] = Field(None, description="Título do gráfico")
    x_label: Optional[str] = Field(None, description="Rótulo do eixo X")
    y_label: Optional[str] = Field(None, description="Rótulo do eixo Y")
    colors: Optional[List[str]] = Field(None, description="Cores personalizadas (hex)")
    series: Optional[List[ChartDataSeries]] = Field(None, description="Múltiplas séries (para gráficos comparativos)")


class ChartResponse(BaseModel):
    """Resposta com gráfico gerado"""
    success: bool = Field(..., description="Se a geração foi bem-sucedida")
    base64: Optional[str] = Field(None, description="Imagem do gráfico em base64")
    error: Optional[str] = Field(None, description="Mensagem de erro se falhou")
