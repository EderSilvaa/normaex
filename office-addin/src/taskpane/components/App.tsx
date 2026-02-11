import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../../styles/theme';

// Services
import { ApiService, DocumentService } from '../../services';

// Types
import { AnalysisResponse, Issue, ProjectMemory } from '../../types';

// Components
import ComplianceScore from './ComplianceScore';
import IssuesList from './IssuesList';
import ChatPanel from './ChatPanel';
import InlineReviewPanel from './InlineReviewPanel';
import TabNavigation from './TabNavigation';
import FormatControls from './FormatControls';
import NormSelector, { WorkConfig } from './NormSelector';
import ProjectSelector from './ProjectSelector';

import { getNormConfig, NormConfig } from '../../config/norms.config';

type TabId = 'abnt' | 'chat' | 'review';

interface AppProps {
  title: string;
}

const App: React.FC<AppProps> = ({ title }) => {
  // Estado simplificado
  const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<TabId>('abnt');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectInfo, setSelectedProjectInfo] = useState<{ name: string; pdfCount: number } | null>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);

  // Memória do Projeto e Eventos (Phase 10)
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
      // Limpar eventos ao trocar de projeto
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

  // Helper para registrar eventos
  const logEvent = useCallback((event: string) => {
    setEvents(prev => [...prev.slice(-9), event]); // Manter apenas últimos 10
  }, []);

  // Configuração da norma selecionada
  const [workConfig, setWorkConfig] = useState<WorkConfig>(() => {
    // Tentar carregar do localStorage
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

  // Tabs: ABNT (análise + formatação), Chat (conversa + escrita + imagens), Config (configurações)
  const tabs = [
    { id: 'abnt', label: currentNormConfig.name, icon: currentNormConfig.icon, badge: analysis?.issues.length },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'review', label: 'Revisão', icon: '✨' },
  ];

  // Inicialização
  useEffect(() => {
    setIsOfficeInitialized(true);
    checkBackendStatus();
  }, []);

  // Salvar configuração quando mudar
  const handleWorkConfigChange = useCallback((config: WorkConfig) => {
    setWorkConfig(config);
    if (typeof window !== 'undefined') {
      localStorage.setItem('normaex_work_config', JSON.stringify(config));
    }
    setMessage(`Configuração salva: ${getNormConfig(config.norm).name}`);
  }, []);

  // Verificar status do backend
  const checkBackendStatus = useCallback(async () => {
    try {
      await ApiService.checkHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  // Analisar documento
  const analyzeDocument = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    setAnalysis(null);

    try {
      logEvent(`Iniciou análise do documento (Norma: ${workConfig.norm.toUpperCase()})`);
      // Usar versão com margens para análise completa
      const content = await DocumentService.getDocumentContentWithMargins();

      // Aplicar configuração selecionada
      content.format_type = workConfig.norm;
      if (!content.metadata) content.metadata = {};
      content.metadata.work_type = workConfig.workType;
      content.metadata.knowledge_area = workConfig.area;

      if (!content.full_text?.trim()) {
        setMessage('O documento está vazio. Adicione conteúdo para analisar.');
        setIsLoading(false);
        return;
      }

      const result = await ApiService.analyzeContent(content);
      setAnalysis(result);
      setMessage(result.summary);
      logEvent(`Análise concluída. Score: ${result.score}/100. Problemas: ${result.issues.length}.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);


  // Chat - retorna resposta completa com context_info
  // Chat - retorna resposta completa com context_info
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

  // Inserir texto no documento (usado pelo ChatPanel)
  const handleInsertTextFromChat = useCallback(async (text: string, isHtml: boolean = false) => {
    try {
      if (isHtml) {
        // Aplicar estilos da norma ativa ao HTML antes de inserir
        const fmt = currentNormConfig.formatting;
        const lineHeightPt = fmt.lineSpacing === 1.5 ? '18pt' : fmt.lineSpacing === 2.0 ? '24pt' : `${fmt.lineSpacing * 12}pt`;
        const textAlign = fmt.alignment === 'justified' ? 'justify' : fmt.alignment;
        const textIndent = fmt.firstLineIndent > 0 ? `${fmt.firstLineIndent}cm` : '0';

        const baseStyle = `font-family: '${fmt.fontName}', serif; font-size: ${fmt.fontSize}pt; line-height: ${lineHeightPt}; text-align: ${textAlign};`;
        const pStyle = `${baseStyle} text-indent: ${textIndent}; margin-bottom: 0;`;

        // Aplicar estilos por elemento: <p> recebe indent, outros recebem base
        let styledHtml = text
          .replace(/<p>/g, `<p style="${pStyle}">`)
          .replace(/<li>/g, `<li style="${baseStyle}">`)
          .replace(/<h([1-6])>/g, `<h$1 style="${baseStyle} font-weight: bold;">`);

        // Se não contém tags <p>, envolver tudo num div com estilo base
        if (!text.includes('<p>') && !text.includes('<h')) {
          styledHtml = `<div style="${pStyle}">${text}</div>`;
        }

        await DocumentService.insertHtml(styledHtml);
      } else {
        await DocumentService.insertText(text);
      }
      setMessage('Texto inserido no documento!');
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
      // Evitar duplicatas simples
      if (refs.some(r => r.id === reference.id || r.title === reference.title)) {
        setMessage('Referência já está salva.');
        return prev;
      }

      logEvent(`Salvou referência: ${reference.title.substring(0, 30)}...`);
      return { ...prev, saved_references: [...refs, reference] };
    });
    setMessage('Referência salva na memória!');
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
        setMessage(`Navegou para o parágrafo ${issue.paragraph_index + 1}`);
      } catch (error) {
        console.error('Error navigating to paragraph:', error);
      }
    } else if (issue.location) {
      // Tentar buscar pelo texto da localização
      try {
        const found = await DocumentService.findAndSelect(issue.location.substring(0, 50));
        if (found) {
          setMessage('Localização encontrada');
        }
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
        setMessage('Correção aplicada!');
        await analyzeDocument();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setMessage(`Erro ao aplicar correção: ${errorMessage}`);
      }
    }
  }, [analyzeDocument]);

  // Formatação automática (Generic)
  const handleAutoFormat = useCallback(async () => {
    setIsLoading(true);
    setMessage(`Solicitando formatação ${currentNormConfig.name}...`);

    try {
      // 1. Obter conteúdo do documento
      const content = await DocumentService.getDocumentContent();
      content.format_type = workConfig.norm; // ABNT, APA, etc.

      // 2. Pedir ações de formatação ao backend
      const response = await ApiService.formatContent(content);

      if (response.actions && response.actions.length > 0) {
        setMessage(`Aplicando ${response.actions.length} ações de formatação...`);

        // 3. Executar ações via Office.js
        const appliedCount = await DocumentService.applyFormatting(response.actions);

        setMessage(`Sucesso! ${appliedCount} formatações aplicadas (${currentNormConfig.name}).`);
      } else {
        setMessage('O documento já parece estar formatado corretamente.');
      }

      // Re-analisar após formatação
      if (analysis) {
        await analyzeDocument();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro ao formatar: ${errorMessage}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [workConfig, currentNormConfig, analysis, analyzeDocument]);

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


      {/* Sticky Tab Bar + Norm Badge */}
      <div style={{
        flexShrink: 0,
        padding: '8px 16px',
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{ flex: 1 }}>
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as TabId)}
            variant="default"
            size="small"
          />
        </div>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: theme.colors.primary,
            background: theme.colors.primaryAlpha,
            padding: '3px 8px',
            borderRadius: '10px',
            border: `1px solid ${theme.colors.primary}`,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          onClick={() => setShowConfigModal(true)}
          title="Clique para alterar norma"
        >
          {currentNormConfig.name}
        </div>
      </div>

      {/* Main Content */}
      <main className="app-main" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: '10px', paddingTop: '10px' }}>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Tab: ABNT */}
          {activeTab === 'abnt' && (
            <div className="actions-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <NormSelector
                currentConfig={workConfig}
                onConfigChange={handleWorkConfigChange}
              />
              <Button
                variant="primary"
                onClick={analyzeDocument}
                isLoading={isLoading}
                fullWidth
                leftIcon={<span>📊</span>}
              >
                Analisar Documento
              </Button>

              {analysis && (
                <div style={{ marginTop: theme.spacing.md }}>
                  <Card noPadding style={{ background: theme.colors.surfaceHighlight, overflow: 'hidden' }}>
                    <div style={{ padding: theme.spacing.md, display: 'flex', justifyContent: 'center' }}>
                      <ComplianceScore
                        score={analysis.score}
                        issueCount={analysis.issues.length}
                        size="medium"
                        animate={true}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {message && (
                <div style={{
                  marginTop: theme.spacing.md,
                  padding: theme.spacing.sm,
                  background: theme.colors.surfaceHighlight,
                  borderLeft: `3px solid ${theme.colors.primary}`,
                  borderRadius: theme.borderRadius.sm
                }}>
                  <p style={{ margin: 0, fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}>{message}</p>
                </div>
              )}

              {analysis && (
                <div style={{ marginTop: '16px' }}>
                  <IssuesList
                    issues={analysis.issues}
                    maxVisible={5}
                    onIssueClick={handleIssueClick}
                    onApplyFix={handleApplyFix}
                  />
                </div>
              )}

              <div style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px' }}>
                <FormatControls
                  onAutoFormat={handleAutoFormat}
                  isLoading={isLoading}
                  normName={currentNormConfig.name}
                />
              </div>
            </div>
          )}

          {/* Tab: Chat */}
          {activeTab === 'chat' && (
            <div className="actions-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <ChatPanel
                onSendMessage={handleChat}
                onInsertText={handleInsertTextFromChat}
                isLoading={isLoading}
                placeholder="Pergunte ou peça para escrever algo..."
                welcomeMessage="Olá! Posso responder perguntas sobre ABNT ou escrever textos acadêmicos."
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
              />
            </div>
          )}

          {/* Tab: Review */}
          {activeTab === 'review' && (
            <div className="actions-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <InlineReviewPanel formatType={workConfig.norm as any} />
            </div>
          )}
        </div>


      </main>

      {/* Footer com Status */}
      <footer className="app-footer" style={{
        flexShrink: 0,
        padding: '8px 16px',
        borderTop: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        color: theme.colors.text.tertiary
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: backendStatus === 'online' ? theme.colors.success : theme.colors.error
            }} />
            <span>Backend</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: theme.colors.success
            }} />
            <span>Word API</span>
          </div>
        </div>

        <div
          onClick={() => setShowConfigModal(true)}
          style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
          title="Configurações"
        >
          ⚙️
        </div>
      </footer >

      {/* Modal de Configuração */}
      {
        showConfigModal && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
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
        )
      }
    </div >
  );
};

export default App;
