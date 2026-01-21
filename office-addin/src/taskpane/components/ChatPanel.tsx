/**
 * ChatPanel - Painel de chat com histórico
 * Interface de conversação com a IA sobre o documento - Responsivo
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onSendMessage: (message: string) => Promise<string>;
  isLoading?: boolean;
  placeholder?: string;
  welcomeMessage?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = 'Pergunte sobre seu documento...',
  welcomeMessage = 'Olá! Posso ajudar com formatação ABNT e sugestões.',
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSend = async () => {
    if (!input.trim() || sending || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await onSendMessage(userMessage.content);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const quickSuggestions = ['Citações ABNT', 'Margens', 'Revisar texto'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '200px' }}>
      {/* Mensagens */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        background: '#0a0a0a',
        borderRadius: '10px',
        marginBottom: '10px',
        maxHeight: '250px',
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '10px',
            }}
          >
            <div style={{
              maxWidth: '90%',
              padding: '8px 12px',
              borderRadius: message.role === 'user' ? '10px 10px 4px 10px' : '10px 10px 10px 4px',
              background: message.role === 'user' ? '#Eebb4d' : '#1a1a1a',
              color: message.role === 'user' ? '#0a0a0a' : '#fff',
            }}>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                {message.content}
              </p>
            </div>
            <span style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        ))}

        {sending && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '8px 12px',
            background: '#1a1a1a',
            borderRadius: '10px',
            width: 'fit-content',
          }}>
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            <style>{`
              .typing-dot {
                width: 5px;
                height: 5px;
                background: #Eebb4d;
                border-radius: 50%;
                animation: typing 1s infinite ease-in-out;
              }
              @keyframes typing {
                0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                30% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #333',
                borderRadius: '12px',
                background: 'transparent',
                color: '#888',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#Eebb4d';
                e.currentTarget.style.color = '#Eebb4d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.color = '#888';
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          disabled={sending || isLoading}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: '12px',
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#Eebb4d'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#333'; }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || isLoading}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            background: input.trim() && !sending ? '#Eebb4d' : '#333',
            color: input.trim() && !sending ? '#0a0a0a' : '#666',
            fontWeight: 600,
            fontSize: '14px',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {sending ? '...' : '→'}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
