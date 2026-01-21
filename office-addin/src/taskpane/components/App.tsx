import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

// Services
import { ApiService, DocumentService, StreamingService } from '../../services';

// Types
import { AnalysisResponse, Issue } from '../../types';

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
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'write' | 'chat'>('analysis');
  const [writeInstruction, setWriteInstruction] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);

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
  const generateText = useCallback(async () => {
    if (!writeInstruction.trim()) {
      setMessage('Digite uma instrução para gerar o texto.');
      return;
    }

    setIsLoading(true);
    setMessage('Gerando texto...');

    try {
      const content = await DocumentService.getDocumentContent();

      const result = await ApiService.writeText({
        instruction: writeInstruction,
        section_type: 'geral',
        context: content.full_text?.substring(0, 1000),
        format_type: 'abnt',
      });

      await DocumentService.insertText(result.text);
      setMessage(`Texto gerado e inserido! (${result.word_count} palavras)`);
      setWriteInstruction('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [writeInstruction]);

  // Gerar texto com streaming
  const generateTextStreaming = useCallback(async () => {
    if (!writeInstruction.trim()) {
      setMessage('Digite uma instrução para gerar o texto.');
      return;
    }

    setIsStreaming(true);
    setStreamProgress(0);
    setMessage('Gerando texto...');

    try {
      const content = await DocumentService.getDocumentContent();

      const fullText = await StreamingService.streamWriteToDocument(
        {
          instruction: writeInstruction,
          section_type: 'geral',
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
      setWriteInstruction('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsStreaming(false);
      setStreamProgress(0);
    }
  }, [writeInstruction]);

  // Chat
  const sendChat = useCallback(async () => {
    if (!chatInput.trim()) return;

    setIsLoading(true);
    setChatResponse('');

    try {
      const content = await DocumentService.getDocumentContent();

      const result = await ApiService.chat({
        message: chatInput,
        context: content.full_text?.substring(0, 2000),
      });

      setChatResponse(result.message);
      setChatInput('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setChatResponse(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [chatInput]);

  // Cores do score
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Cor da severidade
  const getSeverityColor = (severity: Issue['severity']) => {
    if (severity === 'error') return '#ef4444';
    if (severity === 'warning') return '#f59e0b';
    return '#3b82f6';
  };

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
          <div className="welcome-card" style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: getScoreColor(analysis.score),
                textShadow: `0 0 20px ${getScoreColor(analysis.score)}40`,
              }}
            >
              {analysis.score}
            </div>
            <p style={{ color: '#888', marginTop: '8px' }}>Score ABNT</p>
            {analysis.issues.length > 0 && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
                {analysis.issues.length} problema{analysis.issues.length > 1 ? 's' : ''} encontrado
                {analysis.issues.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['analysis', 'write', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === tab ? '#Eebb4d' : '#1a1a1a',
                color: activeTab === tab ? '#0a0a0a' : '#888',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'analysis' ? 'Analisar' : tab === 'write' ? 'Escrever' : 'Chat'}
            </button>
          ))}
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

            {analysis && analysis.issues.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>
                  PROBLEMAS ENCONTRADOS
                </h4>
                {analysis.issues.slice(0, 5).map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#1a1a1a',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '8px',
                      borderLeft: `3px solid ${getSeverityColor(issue.severity)}`,
                    }}
                  >
                    <p style={{ color: '#fff', fontSize: '13px', margin: 0 }}>{issue.message}</p>
                    {issue.suggestion && (
                      <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
                        {issue.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Write */}
        {activeTab === 'write' && (
          <div className="actions-section">
            <textarea
              value={writeInstruction}
              onChange={(e) => setWriteInstruction(e.target.value)}
              placeholder="Ex: Escreva uma introdução sobre inteligência artificial na educação..."
              disabled={isStreaming}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #333',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '12px',
              }}
            />

            {/* Progress bar */}
            {isStreaming && (
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#1a1a1a',
                  borderRadius: '2px',
                  marginBottom: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${streamProgress}%`,
                    height: '100%',
                    background: '#Eebb4d',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="action-button primary"
                onClick={generateText}
                disabled={isLoading || isStreaming || !writeInstruction.trim()}
                style={{ flex: 1 }}
              >
                {isLoading ? '⏳ Gerando...' : '✨ Gerar'}
              </button>
              <button
                className="action-button secondary"
                onClick={generateTextStreaming}
                disabled={isLoading || isStreaming || !writeInstruction.trim()}
                style={{ flex: 1 }}
              >
                {isStreaming ? '⏳ Streaming...' : '🚀 Streaming'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Chat */}
        {activeTab === 'chat' && (
          <div className="actions-section">
            {chatResponse && (
              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                  {chatResponse}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Pergunte sobre seu documento..."
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={sendChat}
                disabled={isLoading || !chatInput.trim()}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#Eebb4d',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isLoading ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
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
