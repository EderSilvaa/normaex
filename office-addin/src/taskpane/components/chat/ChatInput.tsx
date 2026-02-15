import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { theme } from '../../../styles/theme';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    onActionsClick?: () => void;
    isMenuOpen?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    onActionsClick,
    isMenuOpen,
    isLoading,
    disabled,
    placeholder = 'Digite sua mensagem...'
}) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSend = () => {
        if (!input.trim() || isLoading || disabled) return;
        onSendMessage(input);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{
            padding: '6px 8px',
            background: '#1a1a1a',
            borderTop: `1px solid ${theme.colors.border}`,
            display: 'flex',
            gap: '6px',
            alignItems: 'flex-end',
            position: 'relative'
        }}>
            {onActionsClick && (
                <button
                    onClick={onActionsClick}
                    style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        border: `1px solid ${isMenuOpen ? theme.colors.primary : '#333'}`,
                        background: isMenuOpen ? theme.colors.primary : '#2a2a2a',
                        color: isMenuOpen ? '#000' : '#888',
                        fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                    }}
                >
                    +
                </button>
            )}

            <div style={{
                flex: 1,
                background: '#0a0a0a',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '18px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                minHeight: '32px'
            }}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isLoading ? 'Aguarde...' : placeholder}
                    disabled={isLoading || disabled}
                    rows={1}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: '13px',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                        lineHeight: '1.4',
                        maxHeight: '100px',
                        overflowY: 'auto',
                        padding: 0,
                    }}
                />
            </div>

            <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || disabled}
                style={{
                    height: '28px',
                    width: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    border: 'none',
                    flexShrink: 0,
                    background: (!input.trim() || isLoading || disabled) ? '#333' : theme.colors.primary,
                    color: (!input.trim() || isLoading || disabled) ? '#666' : '#000',
                    cursor: (!input.trim() || isLoading || disabled) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                }}
            >
                {isLoading ? '...' : '➤'}
            </button>
        </div>
    );
};

export default ChatInput;
