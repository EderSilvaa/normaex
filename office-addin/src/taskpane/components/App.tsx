import * as React from 'react';
import { useState, useEffect } from 'react';

interface AppProps {
  title: string;
}

interface Issue {
  code: string;
  message: string;
  severity: string;
  suggestion?: string;
}

interface AnalysisResult {
  score: number;
  issues: Issue[];
  suggestions: string[];
  summary: string;
}

const API_BASE = 'http://localhost:8080/api/addin';

const App: React.FC<AppProps> = ({ title }) => {
  const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'write' | 'chat'>('analysis');
  const [writeInstruction, setWriteInstruction] = useState('');

  useEffect(() => {
    setIsOfficeInitialized(true);
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const getDocumentContent = async (): Promise<{ text: string; paragraphs: any[] }> => {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        const body = context.document.body;
        const paragraphs = body.paragraphs;

        body.load('text');
        paragraphs.load('items');

        await context.sync();

        const paragraphData = paragraphs.items.map((p) => {
          p.load('text,style,font');
          return p;
        });

        await context.sync();

        const formattedParagraphs = paragraphData.map((p) => ({
          text: p.text,
          style: p.style || 'Normal',
          font_name: p.font?.name || null,
          font_size: p.font?.size || null,
          alignment: null
        }));

        resolve({
          text: body.text,
          paragraphs: formattedParagraphs
        });
      }).catch(reject);
    });
  };

  const analyzeDocument = async () => {
    setIsLoading(true);
    setMessage('');
    setAnalysis(null);

    try {
      const { text, paragraphs } = await getDocumentContent();

      if (!text.trim()) {
        setMessage('O documento está vazio. Adicione conteúdo para analisar.');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/analyze-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraphs,
          full_text: text,
          format_type: 'abnt'
        })
      });

      if (!response.ok) throw new Error('Erro na análise');

      const result: AnalysisResult = await response.json();
      setAnalysis(result);
      setMessage(result.summary);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateText = async () => {
    if (!writeInstruction.trim()) {
      setMessage('Digite uma instrução para gerar o texto.');
      return;
    }

    setIsLoading(true);
    setMessage('Gerando texto...');

    try {
      // Get document context
      const { text } = await getDocumentContent();

      const response = await fetch(`${API_BASE}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: writeInstruction,
          section_type: 'geral',
          context: text.substring(0, 1000),
          format_type: 'abnt'
        })
      });

      if (!response.ok) throw new Error('Erro na geração');

      const result = await response.json();

      // Insert generated text into Word
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(result.text, Word.InsertLocation.replace);
        await context.sync();
      });

      setMessage(`Texto gerado e inserido! (${result.word_count} palavras)`);
      setWriteInstruction('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;

    setIsLoading(true);
    setChatResponse('');

    try {
      const { text } = await getDocumentContent();

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          context: text.substring(0, 2000)
        })
      });

      if (!response.ok) throw new Error('Erro no chat');

      const result = await response.json();
      setChatResponse(result.message);
      setChatInput('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setChatResponse(`Erro: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

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
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: getScoreColor(analysis.score),
              textShadow: `0 0 20px ${getScoreColor(analysis.score)}40`
            }}>
              {analysis.score}
            </div>
            <p style={{ color: '#888', marginTop: '8px' }}>Score ABNT</p>
            {analysis.issues.length > 0 && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
                {analysis.issues.length} problema{analysis.issues.length > 1 ? 's' : ''} encontrado{analysis.issues.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('analysis')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'analysis' ? '#Eebb4d' : '#1a1a1a',
              color: activeTab === 'analysis' ? '#0a0a0a' : '#888',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Analisar
          </button>
          <button
            onClick={() => setActiveTab('write')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'write' ? '#Eebb4d' : '#1a1a1a',
              color: activeTab === 'write' ? '#0a0a0a' : '#888',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Escrever
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'chat' ? '#Eebb4d' : '#1a1a1a',
              color: activeTab === 'chat' ? '#0a0a0a' : '#888',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Chat
          </button>
        </div>

        {/* Tab Content */}
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
                <h4 style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>PROBLEMAS ENCONTRADOS</h4>
                {analysis.issues.slice(0, 5).map((issue, i) => (
                  <div key={i} style={{
                    background: '#1a1a1a',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                    borderLeft: `3px solid ${issue.severity === 'error' ? '#ef4444' : issue.severity === 'warning' ? '#f59e0b' : '#3b82f6'}`
                  }}>
                    <p style={{ color: '#fff', fontSize: '13px', margin: 0 }}>{issue.message}</p>
                    {issue.suggestion && (
                      <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>{issue.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'write' && (
          <div className="actions-section">
            <textarea
              value={writeInstruction}
              onChange={(e) => setWriteInstruction(e.target.value)}
              placeholder="Ex: Escreva uma introdução sobre inteligência artificial na educação..."
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
                marginBottom: '12px'
              }}
            />
            <button
              className="action-button primary"
              onClick={generateText}
              disabled={isLoading || !writeInstruction.trim()}
            >
              {isLoading ? '⏳ Gerando...' : '✨ Gerar Texto com IA'}
            </button>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="actions-section">
            {chatResponse && (
              <div style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
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
                  fontSize: '14px'
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
                  cursor: 'pointer'
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
            <span className={`status-indicator ${backendStatus === 'online' ? 'online' : 'offline'}`}></span>
            <span>Backend: {backendStatus === 'online' ? 'Conectado' : backendStatus === 'checking' ? 'Verificando...' : 'Desconectado'}</span>
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
          Powered by <strong>Normaex</strong> |
          FastAPI + Gemini AI
        </p>
      </footer>
    </div>
  );
};

export default App;
