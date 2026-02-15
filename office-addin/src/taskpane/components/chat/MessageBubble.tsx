import * as React from 'react';
import { useMemo, useState } from 'react';
import { marked } from 'marked';
import { theme } from '../../../styles/theme';
import { Message, DetailedReview, ProactiveSuggestion } from '../../../types/chat.types';
import RubricCard from './RubricCard';

interface MessageBubbleProps {
    message: Message;
    onInsertText?: (messageId: string, content: string, generatedText: string) => Promise<void>;
    onSuggestionClick?: (action: string, sectionType: string) => void;
    onApplyReview?: (id: string, correctedText: string) => void;
    onRejectReview?: (id: string) => void;
}

const renderMarkdown = (text: string) => {
    try {
        const result = marked.parse(text || '');
        // handle potential Promise return if async (defensive)
        return typeof result === 'string' ? result : text;
    } catch (e) {
        return text;
    }
};

const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    onInsertText,
    onSuggestionClick,
    onApplyReview,
    onRejectReview
}) => {
    const isUser = message.role === 'user';
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInserting, setIsInserting] = useState(false);
    const [isInserted, setIsInserted] = useState(false);

    // Memoize markdown rendering
    const htmlContent = useMemo(() => {
        if (isUser) return null;
        return renderMarkdown(message.content);
    }, [message.content, isUser]);

    const generatedHtml = useMemo(() => {
        if (!message.generatedContent) return null;
        return renderMarkdown(message.generatedContent);
    }, [message.generatedContent]);

    const handleInsertClick = async () => {
        if (!onInsertText || !message.generatedContent) return;
        setIsInserting(true);
        try {
            await onInsertText(message.id, message.content, message.generatedContent);
            setIsInserted(true);
            setTimeout(() => setIsInserted(false), 3000);
        } catch (e) {
            console.error("Failed to insert text", e);
        } finally {
            setIsInserting(false);
        }
    };

    return (
        <div style={{
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '16px',
        }}>
            {/* Main Bubble */}
            <div style={{
                padding: theme.spacing.sm,
                borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: isUser ? theme.colors.primary : theme.colors.surfaceHighlight,
                color: isUser ? theme.colors.text.inverse : theme.colors.text.primary,
                boxShadow: theme.shadows.sm,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Image Indicator */}
                {message.image && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '11px', opacity: 0.8 }}>
                        🖼️ {message.image.figureNumber ? `Figura ${message.image.figureNumber}` : 'Imagem'}
                    </div>
                )}

                {/* Content */}
                {isUser ? (
                    <p style={{ margin: 0, fontSize: theme.typography.sizes.sm, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {message.content}
                    </p>
                ) : (
                    <div
                        style={{ margin: 0, fontSize: theme.typography.sizes.sm, lineHeight: 1.5 }}
                        className="chat-markdown"
                        dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
                    />
                )}
            </div>

            {/* Timestamp */}
            <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, marginTop: '4px' }}>
                {formatTime(new Date(message.timestamp))}
            </span>

            {/* Proactive Suggestions */}
            {message.proactiveSuggestions && message.proactiveSuggestions.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '8px',
                    width: '100%'
                }}>
                    {message.proactiveSuggestions.map((suggestion, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px' }}>💡</span>
                                <span style={{ color: '#e2e8f0' }}>{suggestion.message}</span>
                            </div>
                            <button
                                onClick={() => onSuggestionClick && onSuggestionClick(suggestion.action, suggestion.section_type)}
                                style={{
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 10px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 500
                                }}
                            >
                                {suggestion.action}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Generated Content Card */}
            {message.generatedContent && onInsertText && (
                <div style={{
                    marginTop: '8px',
                    width: '100%',
                    maxWidth: '100%',
                    background: '#111',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: '#1a1a1a',
                            borderBottom: `1px solid ${theme.colors.border}`,
                            cursor: 'pointer',
                        }}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px' }}>📝</span>
                            <span style={{ fontSize: '11px', color: theme.colors.text.secondary, fontWeight: 500 }}>
                                Texto gerado
                            </span>
                            <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, background: '#222', padding: '1px 6px', borderRadius: '8px' }}>
                                {message.generatedContent.split(/\s+/).length} palavras
                            </span>
                        </div>
                        <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </div>

                    {/* Body */}
                    {isExpanded && (
                        <div style={{ position: 'relative' }}>
                            <div
                                style={{
                                    padding: '14px 16px',
                                    maxHeight: '350px',
                                    overflowY: 'auto',
                                    fontSize: '12px',
                                    lineHeight: 1.7,
                                    color: '#ccc',
                                }}
                                className="content-card-body"
                                dangerouslySetInnerHTML={{ __html: generatedHtml || '' }}
                            />
                        </div>
                    )}

                    {/* Insert Button */}
                    <div style={{ padding: '8px 12px', borderTop: isExpanded ? `1px solid ${theme.colors.border}` : 'none' }}>
                        <button
                            onClick={handleInsertClick}
                            disabled={isInserting}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isInserted ? '#22c55e' : theme.colors.primary,
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: isInserting ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                opacity: isInserting ? 0.7 : 1,
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {isInserting ? '⏳ Inserindo...' : isInserted ? '✅ Inserido!' : '📄 Inserir no Word'}
                        </button>
                    </div>
                </div>
            )}

            {/* Detailed Review / Rubric Card */}
            {message.detailedReview && (
                <div style={{ width: '100%', marginTop: '8px' }}>
                    <RubricCard review={message.detailedReview} />
                </div>
            )}

            {/* Review Result (Inline Corrections) */}
            {message.reviewResult && !message.reviewResult.applied && (
                <div style={{
                    marginTop: '8px',
                    background: '#111',
                    border: `1px solid ${theme.colors.primary}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    width: '100%'
                }}>
                    <div style={{ padding: '10px 14px', background: '#1a1a1a', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', gap: '6px' }}>
                        <span>✨</span>
                        <span style={{ fontSize: '11px', color: theme.colors.text.secondary, fontWeight: 500 }}>Sugestão de Melhoria</span>
                    </div>
                    <div style={{ padding: '12px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', color: theme.colors.text.tertiary }}>Original:</span>
                            <div style={{
                                fontSize: '12px', color: theme.colors.text.secondary,
                                textDecoration: 'line-through', opacity: 0.6,
                                padding: '6px', background: theme.colors.surface,
                                borderRadius: '4px', marginTop: '4px',
                                maxHeight: '80px', overflowY: 'auto'
                            }}>
                                {message.reviewResult.originalText}
                            </div>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', color: theme.colors.primary }}>Sugerido:</span>
                            <div style={{
                                fontSize: '12px', color: theme.colors.text.primary,
                                padding: '6px', background: theme.colors.surfaceHighlight,
                                borderRadius: '4px', borderLeft: `2px solid ${theme.colors.primary}`,
                                marginTop: '4px', maxHeight: '120px', overflowY: 'auto'
                            }}>
                                {message.reviewResult.correctedText}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button
                                onClick={() => onApplyReview && onApplyReview(message.id, message.reviewResult!.correctedText)}
                                style={{ flex: 1, padding: '6px', background: '#16a34a', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px' }}
                            >
                                Aceitar
                            </button>
                            <button
                                onClick={() => onRejectReview && onRejectReview(message.id)}
                                style={{ flex: 1, padding: '6px', background: '#dc2626', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px' }}
                            >
                                Rejeitar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Result */}
            {message.analysisResult && (
                <div style={{
                    marginTop: '8px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.text.primary }}>Resultado da Análise</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: message.analysisResult.score >= 70 ? '#22c55e' : '#eab308' }}>
                            {message.analysisResult.score}/100
                        </span>
                    </div>
                    <p style={{ fontSize: '11px', color: theme.colors.text.secondary, margin: 0 }}>
                        {message.analysisResult.summary}
                    </p>
                </div>
            )}

        </div>
    );
};

export default MessageBubble;
