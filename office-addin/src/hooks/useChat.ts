import { useState, useCallback } from 'react';
import { ApiService } from '../services/ApiService';
import { Message, ChatResponseData } from '../types/chat.types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

interface UseChatProps {
    initialMessages?: Message[];
}

import { ChatRequest } from '../types/api.types';

export const useChat = ({ initialMessages = [] }: UseChatProps = {}) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addMessage = useCallback((role: 'user' | 'assistant', content: string, extra?: Partial<Message>) => {
        const newMessage: Message = {
            id: generateId(),
            role,
            content,
            timestamp: new Date(),
            ...extra,
        };
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
    }, []);

    const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
        setMessages((prev) =>
            prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
        );
    }, []);

    const sendMessage = useCallback(async (
        content: string,
        context: any, // Typed as any for flexibility, can be refined based on usage
        extraParams?: Partial<ChatRequest>
    ): Promise<ChatResponseData | null> => {
        setIsLoading(true);
        setError(null);

        // Add user message
        addMessage('user', content);

        try {
            const request: ChatRequest = {
                message: content,
                context: typeof context === 'string' ? context : undefined,
                ...extraParams
            };

            const response = await ApiService.chat(request);

            // Update assistant message
            const assistantMsg: Message = {
                id: generateId(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                hasGeneratedText: !!response.generated_content,
                generatedContent: response.generated_content,
                contextInfo: response.context_info,
                wasReviewed: response.was_reviewed,
                reviewScore: response.review_score,
                detailedReview: response.detailed_review,
                proactiveSuggestions: response.proactive_suggestions,
            };

            setMessages((prev) => [...prev, assistantMsg]);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            addMessage('assistant', `Error: ${errorMessage}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [addMessage]);

    return {
        messages,
        setMessages,
        isLoading,
        error,
        sendMessage,
        addMessage,
        updateMessage
    };
};
