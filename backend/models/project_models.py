"""
Models Pydantic para Projetos e PDFs de Contexto
Permite organizar PDFs por projeto para fornecer contexto ao chat
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
import uuid


# ============================================
# ENUMS
# ============================================

class PDFStatus(str, Enum):
    PENDING = "pending"      # Aguardando processamento
    PROCESSING = "processing"  # Em processamento
    READY = "ready"          # Pronto para uso
    ERROR = "error"          # Erro no processamento


# ============================================
# PDF MODELS
# ============================================

class PDFDocument(BaseModel):
    """Representa um documento PDF associado a um projeto"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="ID único do PDF")
    filename: str = Field(..., description="Nome original do arquivo")
    file_path: str = Field(..., description="Caminho do arquivo no servidor")
    status: PDFStatus = Field(default=PDFStatus.PENDING, description="Status do processamento")
    extracted_text: Optional[str] = Field(None, description="Texto extraído do PDF")
    page_count: int = Field(0, description="Número de páginas")
    word_count: int = Field(0, description="Contagem de palavras extraídas")
    upload_date: datetime = Field(default_factory=datetime.now, description="Data de upload")
    error_message: Optional[str] = Field(None, description="Mensagem de erro se houver falha")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PDFSummary(BaseModel):
    """Resumo de um PDF para listagem"""
    id: str
    filename: str
    status: PDFStatus
    page_count: int
    word_count: int
    upload_date: datetime


# ============================================
# PROJECT MODELS
# ============================================

class Project(BaseModel):
    """Representa um projeto que agrupa PDFs de contexto"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="ID único do projeto")
    name: str = Field(..., min_length=1, max_length=100, description="Nome do projeto")
    description: Optional[str] = Field(None, max_length=500, description="Descrição do projeto")
    pdfs: List[PDFDocument] = Field(default_factory=list, description="PDFs associados ao projeto")
    created_at: datetime = Field(default_factory=datetime.now, description="Data de criação")
    updated_at: datetime = Field(default_factory=datetime.now, description="Data de última atualização")
    is_active: bool = Field(default=True, description="Se o projeto está ativo")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    def get_combined_context(self, max_chars: int = 10000) -> str:
        """Retorna o texto combinado de todos os PDFs prontos"""
        texts = []
        total_chars = 0

        for pdf in self.pdfs:
            if pdf.status == PDFStatus.READY and pdf.extracted_text:
                remaining = max_chars - total_chars
                if remaining <= 0:
                    break
                text = pdf.extracted_text[:remaining]
                texts.append(f"[Fonte: {pdf.filename}]\n{text}")
                total_chars += len(text)

        return "\n\n---\n\n".join(texts)


class ProjectSummary(BaseModel):
    """Resumo de um projeto para listagem"""
    id: str
    name: str
    description: Optional[str]
    pdf_count: int
    total_words: int
    created_at: datetime
    is_active: bool


# ============================================
# REQUEST MODELS
# ============================================

class CreateProjectRequest(BaseModel):
    """Requisição para criar um novo projeto"""
    name: str = Field(..., min_length=1, max_length=100, description="Nome do projeto")
    description: Optional[str] = Field(None, max_length=500, description="Descrição opcional")


class UpdateProjectRequest(BaseModel):
    """Requisição para atualizar um projeto"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Novo nome")
    description: Optional[str] = Field(None, max_length=500, description="Nova descrição")
    is_active: Optional[bool] = Field(None, description="Status ativo/inativo")


# ============================================
# RESPONSE MODELS
# ============================================

class ProjectResponse(BaseModel):
    """Resposta com detalhes completos do projeto"""
    project: Project
    message: str = Field("", description="Mensagem de status")


class ProjectListResponse(BaseModel):
    """Resposta com lista de projetos"""
    projects: List[ProjectSummary]
    total: int


class PDFUploadResponse(BaseModel):
    """Resposta do upload de PDF"""
    pdf: PDFSummary
    message: str
    project_id: str


class ProjectContextResponse(BaseModel):
    """Resposta com contexto combinado do projeto"""
    project_id: str
    project_name: str
    context: str
    source_count: int
    total_chars: int
