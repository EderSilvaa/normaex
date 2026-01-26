import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../../styles/theme';

// Services
import { ApiService, DocumentService } from '../../services';

// Types
import { AnalysisResponse, Issue } from '../../types';

// Components
import ComplianceScore from './ComplianceScore';
import IssuesList from './IssuesList';
import ChatPanel from './ChatPanel';
import TabNavigation from './TabNavigation';
import FormatControls from './FormatControls';
import NormSelector, { WorkConfig } from './NormSelector';
import ProjectSelector from './ProjectSelector';

import { getNormConfig, NormConfig } from '../../config/norms.config';

type TabId = 'abnt' | 'chat';

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);


  // Chat - retorna resposta completa com context_info
  const handleChat = useCallback(async (userMessage: string) => {
    const content = await DocumentService.getDocumentContent();

    const result = await ApiService.chat({
      message: userMessage,
      context: content.full_text?.substring(0, 2000),
      project_id: selectedProjectId || undefined,
      format_type: workConfig.norm,
      work_type: workConfig.workType,
      knowledge_area: workConfig.area,
    });

    return {
      message: result.message,
      suggestions: result.suggestions,
      context_info: result.context_info,
    };
  }, [selectedProjectId]);

  // Inserir texto no documento (usado pelo ChatPanel)
  const handleInsertTextFromChat = useCallback(async (text: string) => {
    try {
      await DocumentService.insertText(text);
      setMessage('Texto inserido no documento!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro ao inserir: ${errorMessage}`);
    }
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

  // Formatação automática
  const handleAutoFormat = useCallback(async () => {
    setIsLoading(true);
    setMessage(`Aplicando formatação ${currentNormConfig.name}...`);

    try {
      const result = await DocumentService.applyABNTFormatting();

      if (result.applied.length > 0) {
        setMessage(`Formatação aplicada: ${result.applied.join(', ')}`);
      }

      if (result.errors.length > 0) {
        console.warn('Format errors:', result.errors);
      }

      // Re-analisar após formatação
      if (analysis) {
        await analyzeDocument();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [analysis, analyzeDocument]);

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


      {/* Main Content */}
      <main className="app-main" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: '10px', paddingTop: '16px' }}>



        {/* Tabs */}
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as TabId)}
            variant="default"
            size="small"
          />
        </div>

        {/* ... (Tab Content mantido igual, apenas garantindo o render dentro do main) */}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Tab: ABNT */}
          {activeTab === 'abnt' && (
            <div className="actions-section">
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
              />
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
