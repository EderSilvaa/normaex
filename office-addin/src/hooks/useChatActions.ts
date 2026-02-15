import { useState, useCallback } from 'react';
import { Message, AnalysisResultData, FormatResultData, ReviewResultData } from '../types/chat.types';
import { generateId } from './useChat';

interface ActionHandlers {
    onAnalyzeDocument?: () => Promise<AnalysisResultData | null>;
    onFormatDocument?: () => Promise<FormatResultData | null>;
    onReviewSelection?: (instruction?: string) => Promise<{ originalText: string; correctedText: string; explanation: string; changes: string[] } | null>;
}

export const useChatActions = (
    addMessage: (role: 'user' | 'assistant', content: string, extra?: Partial<Message>) => void,
    handlers: ActionHandlers
) => {
    const [actionLoading, setActionLoading] = useState(false);

    const handleAnalyze = useCallback(async () => {
        if (!handlers.onAnalyzeDocument || actionLoading) return;

        addMessage('user', 'Analisar documento');
        setActionLoading(true);

        try {
            const result = await handlers.onAnalyzeDocument();
            if (result) {
                addMessage('assistant', result.summary || `Score: ${result.score}/100 - ${result.issues.length} problemas encontrados.`, {
                    analysisResult: result
                });
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            addMessage('assistant', `Erro ao analisar: ${msg}`);
        } finally {
            setActionLoading(false);
        }
    }, [handlers.onAnalyzeDocument, actionLoading, addMessage]);

    const handleFormat = useCallback(async () => {
        if (!handlers.onFormatDocument || actionLoading) return;

        addMessage('user', 'Formatar documento');
        setActionLoading(true);

        try {
            const result = await handlers.onFormatDocument();
            if (result) {
                addMessage('assistant', result.message, {
                    formatResult: result
                });
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            addMessage('assistant', `Erro ao formatar: ${msg}`);
        } finally {
            setActionLoading(false);
        }
    }, [handlers.onFormatDocument, actionLoading, addMessage]);

    const handleReview = useCallback(async () => {
        if (!handlers.onReviewSelection || actionLoading) return;

        addMessage('user', 'Revisar seleção');
        setActionLoading(true);

        try {
            const result = await handlers.onReviewSelection();
            if (result) {
                // Map to ReviewResultData structure
                const reviewResult: ReviewResultData = {
                    originalText: result.originalText,
                    correctedText: result.correctedText,
                    explanation: result.explanation,
                    changes: result.changes,
                };

                addMessage('assistant', result.explanation, {
                    reviewResult: reviewResult
                });
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            addMessage('assistant', `Erro ao revisar: ${msg}`);
        } finally {
            setActionLoading(false);
        }
    }, [handlers.onReviewSelection, actionLoading, addMessage]);

    return {
        actionLoading,
        handleAnalyze,
        handleFormat,
        handleReview
    };
};
