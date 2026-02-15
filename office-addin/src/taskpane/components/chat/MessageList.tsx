import * as React from 'react';
import { useRef, useEffect } from 'react';
import { Message } from '../../../types/chat.types';
import MessageBubble from './MessageBubble';
import { theme } from '../../../styles/theme';

interface MessageListProps {
    messages: Message[];
    isLoading?: boolean;
    onInsertText?: (messageId: string, content: string, generatedText: string) => Promise<void>;
    onSuggestionClick?: (action: string, sectionType: string) => void;
    onApplyReview?: (id: string, correctedText: string) => void;
    onRejectReview?: (id: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    isLoading,
    onInsertText,
    onSuggestionClick,
    onApplyReview,
    onRejectReview
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: theme.spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.md,
        }}>
            {messages.map((msg) => (
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    onInsertText={onInsertText}
                    onSuggestionClick={onSuggestionClick}
                    onApplyReview={onApplyReview}
                    onRejectReview={onRejectReview}
                />
            ))}

            {isLoading && (
                <div style={{
                    padding: '8px 12px',
                    background: theme.colors.surfaceHighlight,
                    borderRadius: '12px',
                    width: 'fit-content',
                    alignSelf: 'flex-start',
                    color: theme.colors.text.secondary,
                    fontSize: '12px'
                }}>
                    Digitando...
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
