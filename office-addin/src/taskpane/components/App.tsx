import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { theme } from '../../styles/theme';

// Services
import { ApiService, DocumentService } from '../../services';

// Types
import { Issue, ProjectMemory } from '../../types';

// Components
import ChatPanel from './ChatPanel';
import NormSelector, { WorkConfig } from './NormSelector';

import { getNormConfig, NormConfig } from '../../config/norms.config';

interface AppProps {
  title: string;
}

const App: React.FC<AppProps> = ({ title }) => {
  const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectInfo, setSelectedProjectInfo] = useState<{ name: string; pdfCount: number } | null>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);

  // Memória do Projeto e Eventos
  const [projectMemory, setProjectMemory] = useState<ProjectMemory>({ structure: null, saved_references: [] });
  const [events, setEvents] = useState<string[]>([]);

  // Carregar memória do localStorage ao iniciar ou mudar projeto
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = selectedProjectId ? `normaex_memory_${selectedProjectId}` : 'normaex_memory_default';
      const savedMemory = localStorage.getItem(storageKey);
      if (savedMemory) {
        try {
          setProjectMemory(JSON.parse(savedMemory));
        } catch (e) {
          console.error("Erro ao carregar memória", e);
        }
      } else {
        setProjectMemory({ structure: null, saved_references: [] });
      }
      setEvents([]);
    }
  }, [selectedProjectId]);

  // Salvar memória sempre que mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = selectedProjectId ? `normaex_memory_${selectedProjectId}` : 'normaex_memory_default';
      localStorage.setItem(storageKey, JSON.stringify(projectMemory));
    }
  }, [projectMemory, selectedProjectId]);

  const logEvent = useCallback((event: string) => {
    setEvents(prev => [...prev.slice(-9), event]);
  }, []);

  // Configuração da norma selecionada
  const [workConfig, setWorkConfig] = useState<WorkConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('normaex_work_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return { norm: 'abnt', area: 'outras', workType: 'tcc' };
  });

  const currentNormConfig: NormConfig = getNormConfig(workConfig.norm);

  // Inicialização
  useEffect(() => {
    setIsOfficeInitialized(true);
    checkBackendStatus();
  }, []);

  const handleWorkConfigChange = useCallback((config: WorkConfig) => {
    setWorkConfig(config);
    if (typeof window !== 'undefined') {
      localStorage.setItem('normaex_work_config', JSON.stringify(config));
    }
    setMessage(`Configuração salva: ${getNormConfig(config.norm).name}`);
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      await ApiService.checkHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  // === CALLBACKS PARA O CHAT ===

  // Analisar documento (retorna dados para o chat)
  const handleAnalyzeForChat = useCallback(async () => {
    setIsLoading(true);
    try {
      logEvent(`Iniciou análise do documento (Norma: ${workConfig.norm.toUpperCase()})`);
      const content = await DocumentService.getDocumentContentWithMargins();
      content.format_type = workConfig.norm;
      if (!content.metadata) content.metadata = {};
      content.metadata.work_type = workConfig.workType;
      content.metadata.knowledge_area = workConfig.area;

      if (!content.full_text?.trim()) {
        return { score: 0, issues: [], summary: 'O documento está vazio. Adicione conteúdo para analisar.' };
      }

      const result = await ApiService.analyzeContent(content);
      logEvent(`Análise concluída. Score: ${result.score}/100. Problemas: ${result.issues.length}.`);
      return { score: result.score, issues: result.issues, summary: result.summary };
    } finally {
      setIsLoading(false);
    }
  }, [workConfig, logEvent]);

  // Formatar documento (retorna dados para o chat)
  const handleFormatForChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const content = await DocumentService.getDocumentContent();
      content.format_type = workConfig.norm;
      const response = await ApiService.formatContent(content);

      if (response.actions && response.actions.length > 0) {
        const appliedCount = await DocumentService.applyFormatting(response.actions);
        logEvent(`Formatação aplicada: ${appliedCount} ações (${currentNormConfig.name}).`);
        return {
          success: true,
          actionsApplied: appliedCount,
          message: `${appliedCount} formatações ${currentNormConfig.name} aplicadas com sucesso!`,
        };
      } else {
        return {
          success: true,
          actionsApplied: 0,
          message: 'O documento já parece estar formatado corretamente.',
        };
      }
    } finally {
      setIsLoading(false);
    }
  }, [workConfig, currentNormConfig, logEvent]);

  // Revisar seleção (retorna dados para o chat)
  const handleReviewForChat = useCallback(async () => {
    setIsLoading(true);
    try {
      let selectedText = '';
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load('text');
        await context.sync();
        selectedText = selection.text;
      });

      if (!selectedText?.trim()) {
        throw new Error('Selecione um texto no documento para revisar.');
      }

      const response = await ApiService.reviewSelection({
        selected_text: selectedText,
        instruction: '',
        format_type: workConfig.norm as any,
      });

      logEvent('Revisou seleção inline.');
      return {
        originalText: response.original_text,
        correctedText: response.corrected_text,
        explanation: response.explanation,
        changes: response.changes,
      };
    } finally {
      setIsLoading(false);
    }
  }, [workConfig, logEvent]);

  // Chat handler
  const handleChat = useCallback(async (userMessage: string, history: any[] = []) => {
    const content = await DocumentService.getDocumentContent();
    const result = await ApiService.chat({
      message: userMessage,
      context: content.full_text?.substring(0, 2000),
      project_id: selectedProjectId || undefined,
      format_type: workConfig.norm,
      work_type: workConfig.workType,
      knowledge_area: workConfig.area,
      history: history,
      project_memory: projectMemory,
      events: events
    });
    return {
      message: result.message,
      suggestions: result.suggestions,
      context_info: result.context_info,
      generated_content: result.generated_content,
    };
  }, [selectedProjectId, workConfig, projectMemory, events]);

  // Inserir texto no documento
  const handleInsertTextFromChat = useCallback(async (text: string, isHtml: boolean = false) => {
    try {
      if (isHtml) {
        const fmt = currentNormConfig.formatting;
        const lineHeightPt = fmt.lineSpacing === 1.5 ? '18pt' : fmt.lineSpacing === 2.0 ? '24pt' : `${fmt.lineSpacing * 12}pt`;
        const textAlign = fmt.alignment === 'justified' ? 'justify' : fmt.alignment;
        const textIndent = fmt.firstLineIndent > 0 ? `${fmt.firstLineIndent}cm` : '0';

        const baseStyle = `font-family: '${fmt.fontName}', serif; font-size: ${fmt.fontSize}pt; line-height: ${lineHeightPt}; text-align: ${textAlign};`;
        const pStyle = `${baseStyle} text-indent: ${textIndent}; margin-bottom: 0;`;

        let styledHtml = text
          .replace(/<p>/g, `<p style="${pStyle}">`)
          .replace(/<li>/g, `<li style="${baseStyle}">`)
          .replace(/<h([1-6])>/g, `<h$1 style="${baseStyle} font-weight: bold;">`);

        if (!text.includes('<p>') && !text.includes('<h')) {
          styledHtml = `<div style="${pStyle}">${text}</div>`;
        }

        await DocumentService.insertHtml(styledHtml);
      } else {
        await DocumentService.insertText(text);
      }
      logEvent('Inseriu texto gerado no documento.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro ao inserir: ${errorMessage}`);
    }
  }, [currentNormConfig]);

  // Handlers de Memória
  const handleSaveReference = useCallback((reference: any) => {
    setProjectMemory(prev => {
      const refs = prev.saved_references || [];
      if (refs.some(r => r.id === reference.id || r.title === reference.title)) {
        return prev;
      }
      logEvent(`Salvou referência: ${reference.title.substring(0, 30)}...`);
      return { ...prev, saved_references: [...refs, reference] };
    });
  }, []);

  const handleStructureGenerated = useCallback((structure: string) => {
    setProjectMemory(prev => ({ ...prev, structure }));
    logEvent('Gerou e salvou nova estrutura de TCC.');
  }, []);

  // Click na issue (navegar para localização)
  const handleIssueClick = useCallback(async (issue: Issue) => {
    if (issue.paragraph_index !== undefined && issue.paragraph_index !== null) {
      try {
        await DocumentService.goToParagraph(issue.paragraph_index);
      } catch (error) {
        console.error('Error navigating to paragraph:', error);
      }
    } else if (issue.location) {
      try {
        await DocumentService.findAndSelect(issue.location.substring(0, 50));
      } catch (error) {
        console.error('Error finding location:', error);
      }
    }
  }, []);

  // Aplicar correção automática
  const handleApplyFix = useCallback(async (issue: Issue) => {
    if (issue.auto_fix) {
      try {
        await DocumentService.insertText(issue.auto_fix);
      } catch (error) {
        console.error('Error applying fix:', error);
      }
    }
  }, []);

  // Loading screen
  if (!isOfficeInitialized) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Inicializando Normaex AI...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: theme.colors.background }}>

      {/* Slim Header */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px',
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: 700,
          color: theme.colors.primary,
          letterSpacing: '0.5px',
        }}>
          Normaex
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            onClick={() => setShowConfigModal(true)}
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: theme.colors.primary,
              background: theme.colors.primaryAlpha,
              padding: '3px 8px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.primary}`,
              cursor: 'pointer',
            }}
            title="Clique para alterar norma"
          >
            {currentNormConfig.name}
          </div>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: backendStatus === 'online' ? theme.colors.success : theme.colors.error,
          }} title={backendStatus === 'online' ? 'Backend online' : 'Backend offline'} />
        </div>
      </div>

      {/* Chat - Full Screen */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 8px 8px 8px' }}>
        <ChatPanel
          onSendMessage={handleChat}
          onInsertText={handleInsertTextFromChat}
          isLoading={isLoading}
          placeholder="Pergunte, analise ou escreva..."
          welcomeMessage="Olá! Posso analisar, formatar, revisar ou escrever textos acadêmicos."
          activeProjectName={selectedProjectInfo?.name}
          activePdfCount={selectedProjectInfo?.pdfCount || 0}
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
          onProjectInfoChange={setSelectedProjectInfo}
          onFeedbackMessage={setMessage}
          normName={currentNormConfig.name}
          workType={workConfig.workType}
          knowledgeArea={workConfig.area}
          onSaveReference={handleSaveReference}
          onStructureGenerated={handleStructureGenerated}
          onAnalyzeDocument={handleAnalyzeForChat}
          onFormatDocument={handleFormatForChat}
          onReviewSelection={handleReviewForChat}
          onIssueClick={handleIssueClick}
          onApplyFix={handleApplyFix}
          formatType={workConfig.norm}
        />
      </main>

      {/* Modal de Configuração */}
      {showConfigModal && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfigModal(false);
          }}
        >
          <div
            style={{
              background: '#0d0d0d',
              borderRadius: '12px',
              border: '1px solid #333',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#1a1a1a',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <span style={{ fontWeight: 600, color: '#fff' }}>Configurações</span>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '16px' }}>
              <NormSelector
                currentConfig={workConfig}
                onConfigChange={handleWorkConfigChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
