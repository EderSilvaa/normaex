import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiService } from '../../services/ApiService';
import { InlineReviewResponse } from '../../types/api.types';
import { theme } from '../../styles/theme';

interface InlineReviewPanelProps {
    formatType?: 'abnt' | 'apa' | 'vancouver' | 'ieee';
}

const InlineReviewPanel: React.FC<InlineReviewPanelProps> = ({ formatType = 'abnt' }) => {
    const [selectedText, setSelectedText] = useState<string>('');
    const [instruction, setInstruction] = useState<string>('');
    const [result, setResult] = useState<InlineReviewResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar seleção atual ao montar
    useEffect(() => {
        loadSelection();
    }, []);

    const loadSelection = async () => {
        try {
            setError(null);
            await Word.run(async (context) => {
                const selection = context.document.getSelection();
                selection.load('text');
                await context.sync();

                const text = selection.text;
                if (!text || text.trim() === '') {
                    setSelectedText('');
                    setError('Selecione um texto no documento para revisar.');
                } else {
                    setSelectedText(text);
                }
            });
        } catch (e) {
            console.error(e);
            setError('Erro ao ler seleção.');
        }
    };

    const handleReview = async () => {
        if (!selectedText) {
            await loadSelection();
            if (!selectedText) return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await ApiService.reviewSelection({
                selected_text: selectedText,
                instruction: instruction,
                format_type: formatType
            });
            setResult(response);
        } catch (e) {
            console.error(e);
            setError('Erro ao processar revisão. Verifique a conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!result) return;

        try {
            await Word.run(async (context) => {
                const selection = context.document.getSelection();
                selection.insertText(result.corrected_text, Word.InsertLocation.replace);
                await context.sync();
            });
            // Resetar após aplicar
            setResult(null);
            setSelectedText('');
            setInstruction('');
            // Recarregar seleção (que agora é o texto novo)
            loadSelection();
        } catch (e) {
            setError('Erro ao aplicar correção.');
        }
    };

    const handleReject = () => {
        setResult(null);
        setInstruction('');
    };

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ paddingBottom: '8px', borderBottom: `1px solid ${theme.colors.border}` }}>
                <h3 style={{ margin: 0, fontSize: theme.typography.sizes.lg, color: theme.colors.text.primary }}>
                    Revisão Inline
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>
                    Melhore trechos específicos do seu texto.
                </p>
            </div>

            {/* Seleção Atual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: theme.typography.sizes.sm, fontWeight: 500 }}>Texto Selecionado</label>
                    <button
                        onClick={loadSelection}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: theme.colors.primary,
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline'
                        }}
                    >
                        Atualizar Seleção
                    </button>
                </div>

                <div style={{
                    padding: '8px',
                    background: theme.colors.surfaceHighlight,
                    borderRadius: '4px',
                    border: `1px solid ${theme.colors.border}`,
                    maxHeight: '100px',
                    overflowY: 'auto',
                    fontSize: '13px',
                    color: selectedText ? theme.colors.text.primary : theme.colors.text.secondary,
                    fontStyle: selectedText ? 'normal' : 'italic'
                }}>
                    {selectedText || "Nenhum texto selecionado..."}
                </div>
            </div>

            {/* Instrução Opcional */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: theme.typography.sizes.sm, fontWeight: 500 }}>Instrução (Opcional)</label>
                <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ex: Deixe mais formal, corrija a concordância..."
                    style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.colors.border}`,
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
            </div>

            {!result && (
                <button
                    onClick={handleReview}
                    disabled={loading || !selectedText}
                    style={{
                        background: theme.colors.primary,
                        color: 'white',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '4px',
                        cursor: (loading || !selectedText) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        opacity: (loading || !selectedText) ? 0.7 : 1
                    }}
                >
                    {loading ? 'Analisando...' : 'Analisar Seleção'}
                </button>
            )}

            {error && (
                <div style={{
                    padding: '8px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Resultado da Revisão */}
            {result && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '12px',
                    border: `1px solid ${theme.colors.primary}`,
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>✨</span>
                        <span style={{ fontWeight: 600, color: theme.colors.primary }}>Sugestão de Melhoria</span>
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500, color: theme.colors.text.primary }}>
                            Texto Sugerido:
                        </div>
                        <div style={{
                            padding: '8px',
                            background: 'white',
                            borderRadius: '4px',
                            border: `1px solid ${theme.colors.border}`
                        }}>
                            {result.corrected_text}
                        </div>
                    </div>

                    <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
                        <strong>Por que mudou?</strong> {result.explanation}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                            onClick={handleApply}
                            style={{
                                flex: 1,
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Aceitar
                        </button>
                        <button
                            onClick={handleReject}
                            style={{
                                flex: 1,
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Rejeitar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineReviewPanel;
