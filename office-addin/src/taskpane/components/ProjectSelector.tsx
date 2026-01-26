/**
 * ProjectSelector - Componente para selecionar e gerenciar projetos
 * Permite criar, selecionar projetos e fazer upload de PDFs
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService } from '../../services';
import { ProjectSummary, PDFSummary } from '../../types';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onProjectInfoChange?: (info: { name: string; pdfCount: number } | null) => void;
  onMessage?: (message: string) => void;
  mode?: 'inline' | 'modal';
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onProjectSelect,
  onProjectInfoChange,
  onMessage,
  mode = 'inline',
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(mode === 'modal');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectPDFs, setProjectPDFs] = useState<PDFSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar projetos
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.listProjects();
      setProjects(response.projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar PDFs do projeto selecionado
  const loadProjectPDFs = useCallback(async (projectId: string) => {
    try {
      const response = await ApiService.getProject(projectId);
      setProjectPDFs(response.project.pdfs || []);
    } catch (error) {
      console.error('Error loading project PDFs:', error);
      setProjectPDFs([]);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectPDFs(selectedProjectId);
    } else {
      setProjectPDFs([]);
      onProjectInfoChange?.(null);
    }
  }, [selectedProjectId, loadProjectPDFs, onProjectInfoChange]);

  // Notificar parent quando PDFs ou projeto selecionado mudam
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project) {
        onProjectInfoChange?.({
          name: project.name,
          pdfCount: projectPDFs.length,
        });
      }
    }
  }, [selectedProjectId, projectPDFs.length, projects, onProjectInfoChange]);

  // Criar novo projeto
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsLoading(true);
    try {
      const response = await ApiService.createProject({ name: newProjectName.trim() });
      setProjects((prev) => [
        {
          id: response.project.id,
          name: response.project.name,
          description: response.project.description,
          pdf_count: 0,
          total_words: 0,
          created_at: response.project.created_at,
          is_active: true,
        },
        ...prev,
      ]);
      onProjectSelect(response.project.id);
      setNewProjectName('');
      setShowNewProject(false);
      onMessage?.('Projeto criado!');
    } catch (error) {
      onMessage?.(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de PDF
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      onMessage?.('Apenas arquivos PDF são aceitos');
      return;
    }

    setIsUploading(true);
    try {
      const response = await ApiService.uploadPDF(selectedProjectId, file);
      setProjectPDFs((prev) => [...prev, response.pdf]);
      onMessage?.(response.message);
      loadProjects(); // Atualizar contagem
    } catch (error) {
      onMessage?.(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remover PDF
  const handleRemovePDF = async (pdfId: string) => {
    if (!selectedProjectId) return;

    try {
      await ApiService.removePDF(selectedProjectId, pdfId);
      setProjectPDFs((prev) => prev.filter((p) => p.id !== pdfId));
      onMessage?.('PDF removido');
      loadProjects();
    } catch (error) {
      onMessage?.(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Deletar projeto
  const handleDeleteProject = async (projectId: string) => {
    try {
      await ApiService.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProjectId === projectId) {
        onProjectSelect(null);
      }
      onMessage?.('Projeto deletado');
    } catch (error) {
      onMessage?.(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div style={{ marginBottom: mode === 'modal' ? 0 : '12px' }}>
      {/* Header com seleção - Apenas se não for modal ou se quisermos mostrar o atual */}
      {mode === 'inline' && (
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: selectedProjectId ? '#1a2f1a' : '#1a1a1a',
            borderRadius: '8px',
            cursor: 'pointer',
            border: `1px solid ${selectedProjectId ? '#2d5a2d' : '#333'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📚</span>
            <div>
              <span style={{ fontSize: '12px', color: '#888' }}>Projeto: </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: selectedProjectId ? '#6fbf6f' : '#888' }}>
                {selectedProject?.name || 'Nenhum selecionado'}
              </span>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: '#666' }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      )}

      {/* Painel expandido */}
      {isExpanded && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            background: '#0d0d0d',
            borderRadius: '8px',
            border: '1px solid #222',
          }}
        >
          {/* Lista de projetos */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>Selecionar projeto:</div>

            {/* Opção: Nenhum projeto */}
            <div
              onClick={() => onProjectSelect(null)}
              style={{
                padding: '8px 10px',
                background: !selectedProjectId ? '#1a1a1a' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '4px',
                fontSize: '12px',
                color: !selectedProjectId ? '#fff' : '#888',
              }}
            >
              Sem projeto (chat sem contexto de PDFs)
            </div>

            {/* Lista de projetos existentes */}
            {isLoading ? (
              <div style={{ padding: '8px', color: '#666', fontSize: '11px' }}>Carregando...</div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: selectedProjectId === project.id ? '#1a2f1a' : 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                  }}
                >
                  <div onClick={() => onProjectSelect(project.id)} style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>{project.name}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {project.pdf_count} PDF(s) • {project.total_words.toLocaleString()} palavras
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '12px',
                    }}
                    title="Deletar projeto"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Criar novo projeto */}
          {showNewProject ? (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="Nome do projeto..."
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontSize: '12px',
                }}
                autoFocus
              />
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isLoading}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#Eebb4d',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowNewProject(false);
                  setNewProjectName('');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: 'transparent',
                  color: '#888',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px dashed #333',
                background: 'transparent',
                color: '#888',
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              + Criar novo projeto
            </button>
          )}

          {/* PDFs do projeto selecionado */}
          {selectedProjectId && (
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                PDFs do projeto ({projectPDFs.length}):
              </div>

              {projectPDFs.length === 0 ? (
                <div style={{ padding: '8px', color: '#555', fontSize: '11px', fontStyle: 'italic' }}>
                  Nenhum PDF adicionado ainda
                </div>
              ) : (
                projectPDFs.map((pdf) => (
                  <div
                    key={pdf.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: '#111',
                      borderRadius: '4px',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          color: pdf.status === 'ready' ? '#6fbf6f' : '#888',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        📄 {pdf.filename}
                      </div>
                      <div style={{ fontSize: '10px', color: '#555' }}>
                        {pdf.page_count} pág • {pdf.word_count.toLocaleString()} palavras
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePDF(pdf.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '10px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}

              {/* Upload de PDF */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px dashed #333',
                  background: 'transparent',
                  color: isUploading ? '#555' : '#888',
                  fontSize: '11px',
                  cursor: isUploading ? 'wait' : 'pointer',
                  marginTop: '8px',
                }}
              >
                {isUploading ? '⏳ Enviando...' : '📎 Adicionar PDF'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
