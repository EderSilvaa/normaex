"""
Router para gerenciamento de Projetos e PDFs de Contexto
Endpoints para CRUD de projetos e upload/remoção de PDFs
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from models.project_models import (
    CreateProjectRequest,
    UpdateProjectRequest,
    ProjectResponse,
    ProjectListResponse,
    PDFUploadResponse,
    PDFSummary,
    ProjectContextResponse,
)
from services.project_service import project_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


# ============================================
# CRUD de Projetos
# ============================================

@router.post("", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """
    Cria um novo projeto para agrupar PDFs de contexto.

    Args:
        request: Nome e descrição do projeto

    Returns:
        Projeto criado com ID gerado
    """
    try:
        project = project_service.create_project(request)
        return ProjectResponse(
            project=project,
            message=f"Projeto '{project.name}' criado com sucesso!"
        )
    except Exception as e:
        logger.error(f"Erro ao criar projeto: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=ProjectListResponse)
async def list_projects(include_inactive: bool = False):
    """
    Lista todos os projetos.

    Args:
        include_inactive: Se True, inclui projetos inativos

    Returns:
        Lista de projetos com resumo
    """
    try:
        projects = project_service.list_projects(include_inactive)
        return ProjectListResponse(
            projects=projects,
            total=len(projects)
        )
    except Exception as e:
        logger.error(f"Erro ao listar projetos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """
    Obtém detalhes de um projeto específico.

    Args:
        project_id: ID do projeto

    Returns:
        Detalhes completos do projeto incluindo PDFs
    """
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    return ProjectResponse(project=project, message="")


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, request: UpdateProjectRequest):
    """
    Atualiza um projeto existente.

    Args:
        project_id: ID do projeto
        request: Campos a atualizar

    Returns:
        Projeto atualizado
    """
    project = project_service.update_project(project_id, request)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    return ProjectResponse(
        project=project,
        message="Projeto atualizado com sucesso!"
    )


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """
    Deleta um projeto e todos os seus PDFs.

    Args:
        project_id: ID do projeto

    Returns:
        Confirmação de exclusão
    """
    success = project_service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    return {"message": "Projeto deletado com sucesso!", "deleted": True}


# ============================================
# Upload e Gerenciamento de PDFs
# ============================================

@router.post("/{project_id}/pdfs", response_model=PDFUploadResponse)
async def upload_pdf(
    project_id: str,
    file: UploadFile = File(...),
):
    """
    Faz upload de um PDF para um projeto.

    O PDF será processado automaticamente para extrair o texto
    que será usado como contexto no chat.

    Args:
        project_id: ID do projeto
        file: Arquivo PDF

    Returns:
        Informações do PDF processado
    """
    # Validar projeto
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Validar arquivo
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome do arquivo não fornecido")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    # Ler conteúdo
    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB limite
            raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 50MB)")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo: {e}")

    # Adicionar ao projeto
    pdf = project_service.add_pdf_to_project(project_id, file.filename, content)
    if not pdf:
        raise HTTPException(status_code=500, detail="Erro ao processar PDF")

    return PDFUploadResponse(
        pdf=PDFSummary(
            id=pdf.id,
            filename=pdf.filename,
            status=pdf.status,
            page_count=pdf.page_count,
            word_count=pdf.word_count,
            upload_date=pdf.upload_date,
        ),
        message=f"PDF '{pdf.filename}' processado com sucesso!" if pdf.status.value == "ready" else f"Erro: {pdf.error_message}",
        project_id=project_id,
    )


@router.delete("/{project_id}/pdfs/{pdf_id}")
async def remove_pdf(project_id: str, pdf_id: str):
    """
    Remove um PDF de um projeto.

    Args:
        project_id: ID do projeto
        pdf_id: ID do PDF

    Returns:
        Confirmação de remoção
    """
    success = project_service.remove_pdf_from_project(project_id, pdf_id)
    if not success:
        raise HTTPException(status_code=404, detail="PDF não encontrado")

    return {"message": "PDF removido com sucesso!", "deleted": True}


@router.get("/{project_id}/pdfs/{pdf_id}")
async def get_pdf_details(project_id: str, pdf_id: str):
    """
    Obtém detalhes de um PDF específico.

    Args:
        project_id: ID do projeto
        pdf_id: ID do PDF

    Returns:
        Detalhes do PDF (sem o texto extraído completo)
    """
    pdf = project_service.get_pdf(project_id, pdf_id)
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF não encontrado")

    return PDFSummary(
        id=pdf.id,
        filename=pdf.filename,
        status=pdf.status,
        page_count=pdf.page_count,
        word_count=pdf.word_count,
        upload_date=pdf.upload_date,
    )


# ============================================
# Contexto para Chat
# ============================================

@router.get("/{project_id}/context", response_model=ProjectContextResponse)
async def get_project_context(project_id: str, max_chars: int = 10000):
    """
    Obtém o contexto combinado de todos os PDFs de um projeto.

    Útil para verificar o que será enviado ao chat.

    Args:
        project_id: ID do projeto
        max_chars: Máximo de caracteres a retornar

    Returns:
        Texto combinado dos PDFs
    """
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    context = project_service.get_project_context(project_id, max_chars)
    info = project_service.get_project_context_info(project_id)

    return ProjectContextResponse(
        project_id=project_id,
        project_name=project.name,
        context=context or "",
        source_count=info.get("pdf_count", 0) if info else 0,
        total_chars=len(context) if context else 0,
    )
