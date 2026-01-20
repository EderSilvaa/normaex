import * as React from 'react';
import { useState, useEffect } from 'react';

interface AppProps {
  title: string;
}

const App: React.FC<AppProps> = ({ title }) => {
  const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setIsOfficeInitialized(true);
  }, []);

  const insertText = async () => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(
          'Olá do Normaex AI! 🚀\n\nEste é um texto inserido pelo Office Add-in.',
          Word.InsertLocation.replace
        );
        await context.sync();
        setMessage('Texto inserido com sucesso!');
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
      console.error(error);
    }
  };

  const getDocumentInfo = async () => {
    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        body.load('text');
        await context.sync();

        const paragraphCount = body.text.split('\n').length;
        const wordCount = body.text.split(/\s+/).length;

        setMessage(`Parágrafos: ${paragraphCount} | Palavras: ${wordCount}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro: ${errorMessage}`);
      console.error(error);
    }
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
          <span className="version">v1.0.0</span>
        </div>
        <p className="tagline">Assistente de IA para Documentos Acadêmicos</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Welcome Message */}
        <div className="welcome-card">
          <h2>🎉 Bem-vindo ao Normaex AI!</h2>
          <p>
            Seu assistente inteligente para formatação ABNT e escrita acadêmica
            está pronto para uso.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="actions-section">
          <h3>Ações Rápidas</h3>

          <button
            className="action-button primary"
            onClick={insertText}
          >
            📝 Inserir Texto de Teste
          </button>

          <button
            className="action-button secondary"
            onClick={getDocumentInfo}
          >
            📊 Analisar Documento
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className="message-box">
            <p>{message}</p>
          </div>
        )}

        {/* Status */}
        <div className="status-section">
          <div className="status-item">
            <span className="status-indicator online"></span>
            <span>Backend: Conectado</span>
          </div>
          <div className="status-item">
            <span className="status-indicator online"></span>
            <span>Word API: Ativa</span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="info-card">
          <h4>🚀 Próximos Passos</h4>
          <ul>
            <li>✅ Add-in instalado com sucesso</li>
            <li>⏳ Integração com backend (Fase 2)</li>
            <li>⏳ Chat com IA (Fase 4)</li>
            <li>⏳ Templates inteligentes (Fase 6)</li>
          </ul>
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
