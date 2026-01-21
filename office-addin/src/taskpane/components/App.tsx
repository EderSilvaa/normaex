import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

// Services
import { ApiService, DocumentService, StreamingService } from '../../services';

// Types
import { AnalysisResponse, Issue } from '../../types';

// Components
import ComplianceScore from './ComplianceScore';
import IssuesList from './IssuesList';
import ChatPanel from './ChatPanel';
import WritingAssistant from './WritingAssistant';
import TabNavigation from './TabNavigation';
import FormatControls from './FormatControls';

type TabId = 'analysis' | 'format' | 'write' | 'chat';
type SectionType = 'introducao' | 'desenvolvimento' | 'conclusao' | 'resumo' | 'abstract' | 'geral';

interface AppProps {
  title: string;
}

const App: React.FC<AppProps> = ({ title }) => {
  // Estado
  const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);

  // Tabs configuration
  const tabs = [
    { id: 'analysis', label: 'Analisar', icon: '📊', badge: analysis?.issues.length },
    { id: 'format', label: 'Formatar', icon: '🎨' },
    { id: 'write', label: 'Escrever', icon: '✨' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ];

  // Inicialização
  useEffect(() => {
    setIsOfficeInitialized(true);
    checkBackendStatus();
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
      const content = await DocumentService.getDocumentContent();

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

  // Gerar texto (não streaming)
  const handleGenerate = useCallback(async (instruction: string, sectionType: SectionType) => {
    setIsLoading(true);
    setMessage('Gerando texto...');

    try {
      const content = await DocumentService.getDocumentContent();

      const result = await ApiService.writeText({
        instruction,
        section_type: sectionType,
        context: content.full_text?.substring(0, 1000),
        format_type: 'abnt',
      });

      await DocumentService.insertText(result.text);
      setMessage(`Texto gerado e inserido! (${result.word_count} palavras)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Gerar texto com streaming
  const handleGenerateStreaming = useCallback(async (instruction: string, sectionType: SectionType) => {
    setIsStreaming(true);
    setStreamProgress(0);
    setMessage('Gerando texto...');

    try {
      const content = await DocumentService.getDocumentContent();

      const fullText = await StreamingService.streamWriteToDocument(
        {
          instruction,
          section_type: sectionType,
          context: content.full_text?.substring(0, 1000),
          format_type: 'abnt',
        },
        {
          onProgress: (progress) => setStreamProgress(progress),
          onError: (error) => setMessage(`Erro: ${error.message}`),
        }
      );

      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      setMessage(`Texto gerado! (${wordCount} palavras)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsStreaming(false);
      setStreamProgress(0);
    }
  }, []);

  // Chat
  const handleChat = useCallback(async (userMessage: string): Promise<string> => {
    const content = await DocumentService.getDocumentContent();

    const result = await ApiService.chat({
      message: userMessage,
      context: content.full_text?.substring(0, 2000),
    });

    return result.message;
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

  // Formatação automática ABNT
  const handleAutoFormat = useCallback(async () => {
    setIsLoading(true);
    setMessage('Aplicando formatação ABNT...');

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

  // Formatação de seleção
  const handleFormatSelection = useCallback(async (options: {
    fontName?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justified';
  }) => {
    try {
      await DocumentService.formatSelection(options);
    } catch (error) {
      console.error('Error formatting selection:', error);
    }
  }, []);

  // Aplicar estilo de título
  const handleApplyHeading = useCallback(async (level: 1 | 2 | 3) => {
    try {
      await DocumentService.applyHeadingStyle(level);
      setMessage(`Estilo Título ${level} aplicado`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    }
  }, []);

  // Aplicar citação em bloco
  const handleApplyBlockQuote = useCallback(async () => {
    try {
      await DocumentService.formatAsBlockQuote();
      setMessage('Formatação de citação aplicada');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
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
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <h1>{title}</h1>
          <span className="version">v2.0.0</span>
        </div>
        <p className="tagline">Assistente de IA para Documentos Acadêmicos</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Score Display */}
        {analysis && (
          <div className="welcome-card">
            <ComplianceScore
              score={analysis.score}
              issueCount={analysis.issues.length}
              size="medium"
              animate={true}
            />
          </div>
        )}

        {/* Tabs */}
        <div style={{ marginBottom: '16px' }}>
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as TabId)}
            variant="default"
            size="small"
          />
        </div>

        {/* Tab: Analysis */}
        {activeTab === 'analysis' && (
          <div className="actions-section">
            <button
              className="action-button primary"
              onClick={analyzeDocument}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Analisando...' : '📊 Analisar Conformidade ABNT'}
            </button>

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
          </div>
        )}

        {/* Tab: Format */}
        {activeTab === 'format' && (
          <div className="actions-section">
            <FormatControls
              onAutoFormat={handleAutoFormat}
              onFormatSelection={handleFormatSelection}
              onApplyHeading={handleApplyHeading}
              onApplyBlockQuote={handleApplyBlockQuote}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Tab: Write */}
        {activeTab === 'write' && (
          <div className="actions-section">
            <WritingAssistant
              onGenerate={handleGenerate}
              onGenerateStreaming={handleGenerateStreaming}
              isLoading={isLoading}
              isStreaming={isStreaming}
              streamProgress={streamProgress}
            />
          </div>
        )}

        {/* Tab: Chat */}
        {activeTab === 'chat' && (
          <div className="actions-section">
            <ChatPanel
              onSendMessage={handleChat}
              isLoading={isLoading}
              placeholder="Pergunte sobre seu documento..."
              welcomeMessage="Olá! Sou o assistente Normaex. Posso ajudar com formatação ABNT e sugestões."
            />
          </div>
        )}

        {/* Message Display */}
        {message && activeTab !== 'chat' && (
          <div className="message-box">
            <p>{message}</p>
          </div>
        )}

        {/* Status */}
        <div className="status-section">
          <div className="status-item">
            <span
              className={`status-indicator ${backendStatus === 'online' ? 'online' : 'offline'}`}
            ></span>
            <span>
              Backend:{' '}
              {backendStatus === 'online'
                ? 'Conectado'
                : backendStatus === 'checking'
                ? 'Verificando...'
                : 'Desconectado'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-indicator online"></span>
            <span>Word API: Ativa</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Powered by <strong>Normaex</strong> | FastAPI + Gemini AI
        </p>
      </footer>
    </div>
  );
};

export default App;
