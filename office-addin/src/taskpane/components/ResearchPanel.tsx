/**
 * ResearchPanel - Painel de pesquisa acadêmica
 * Permite buscar referências e TCCs para usar como base
 */

import * as React from 'react';
import { useState } from 'react';
import { ApiService, DocumentService } from '../../services';
import { SearchResult } from '../../types/api.types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { theme } from '../../styles/theme';

interface ResearchPanelProps {
    normName: string;
    workType?: string;
    knowledgeArea?: string;
    onInsertReference?: (text: string) => void;
    onStructureGenerated?: (structure: string) => void;
    mode?: 'inline' | 'modal';
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({
    normName,
    workType = 'trabalho',
    knowledgeArea = 'geral',
    onInsertReference,
    onStructureGenerated,
    mode = 'inline'
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [generatedStructure, setGeneratedStructure] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleGenerateStructure = async () => {
        if (!query.trim()) {
            setError('Digite um tema para gerar a estrutura.');
            return;
        }

        setIsGeneratingStructure(true);
        setError(null);
        setGeneratedStructure(null);

        try {
            const response = await ApiService.generateStructure({
                theme: query,
                norm: normName,
                work_type: workType,
                knowledge_area: knowledgeArea
            });

            if (onStructureGenerated) {
                onStructureGenerated(response.structure);
            } else {
                setGeneratedStructure(response.structure);
            }
        } catch (err) {
            console.error('Erro detalhado:', err);
            setError('Erro ao gerar estrutura. Verifique o console.');
        } finally {
            setIsGeneratingStructure(false);
        }
    };

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        setGeneratedStructure(null);

        try {
            const response = await ApiService.searchWorks({
                query: query,
                norm: normName,
                limit: 10
            });

            setResults(response.results);
            if (response.results.length === 0) {
                setError('Nenhum resultado encontrado.');
            }
        } catch (err) {
            setError('Erro ao buscar. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleCopyReference = async (ref: string) => {
        try {
            if (onInsertReference) {
                onInsertReference(ref);
            } else {
                await DocumentService.insertText(ref + '\n');
            }
        } catch (e) {
            console.error('Erro ao inserir', e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: mode === 'modal' ? 0 : theme.spacing.md, gap: theme.spacing.md }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
                <Input
                    placeholder={`Tema do ${workType} (${normName})...`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ marginBottom: 0 }}
                />
                <Button
                    variant="secondary"
                    onClick={handleSearch}
                    isLoading={isLoading}
                    disabled={isLoading || isGeneratingStructure}
                    title="Buscar Artigos e TCCs"
                >
                    🔍
                </Button>
                <Button
                    variant="primary"
                    onClick={handleGenerateStructure}
                    isLoading={isGeneratingStructure}
                    disabled={isLoading || isGeneratingStructure}
                    title="Gerar Estrutura Ideal"
                >
                    💡
                </Button>
            </div>

            {error && <div style={{ color: theme.colors.error, fontSize: theme.typography.sizes.sm, textAlign: 'center' }}>{error}</div>}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>

                {/* Structure Card */}
                {generatedStructure && (
                    <Card
                        title={`💡 Sugestão de Estrutura para "${query}"`}
                        variant="highlight"
                        actions={
                            <Button size="sm" variant="ghost" onClick={() => handleCopyReference(generatedStructure)}>
                                📋 Copiar
                            </Button>
                        }
                    >
                        <div style={{
                            fontSize: theme.typography.sizes.sm,
                            color: theme.colors.text.secondary,
                            whiteSpace: 'pre-wrap',
                            maxHeight: '250px',
                            overflowY: 'auto',
                            padding: theme.spacing.sm,
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: theme.borderRadius.sm
                        }}>
                            {generatedStructure}
                        </div>
                    </Card>
                )}

                {/* Results List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                    {results.map((item) => {
                        const isExpanded = expandedId === item.id;
                        return (
                            <Card
                                key={item.id}
                                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                style={{ cursor: 'pointer', borderColor: isExpanded ? theme.colors.primary : theme.colors.border }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px', color: theme.colors.primary, fontWeight: 700, textTransform: 'uppercase' }}>
                                                {item.type} • {item.year}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary, lineHeight: 1.3 }}>
                                            {item.title}
                                        </div>
                                        <div style={{ fontSize: '11px', color: theme.colors.text.tertiary, marginTop: '2px' }}>
                                            {item.authors[0]} {item.authors.length > 1 ? ` et al.` : ''}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: '8px', opacity: 0.5 }}>
                                        <span style={{ fontSize: '12px', color: theme.colors.text.tertiary }}>
                                            {isExpanded ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTop: `1px solid ${theme.colors.border}` }} onClick={(e) => e.stopPropagation()}>
                                        {/* Reference Box */}
                                        <div style={{
                                            background: theme.colors.background,
                                            padding: theme.spacing.sm,
                                            borderRadius: theme.borderRadius.sm,
                                            fontSize: '11px',
                                            color: theme.colors.text.secondary,
                                            fontFamily: 'monospace',
                                            border: `1px solid ${theme.colors.border}`,
                                            marginBottom: theme.spacing.sm
                                        }}>
                                            {item.reference}
                                        </div>

                                        {/* Abstract if available */}
                                        {item.abstract && (
                                            <div style={{ fontSize: '11px', color: theme.colors.text.secondary, marginBottom: theme.spacing.sm, lineHeight: 1.5 }}>
                                                {item.abstract.substring(0, 300)}...
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Button size="sm" fullWidth variant="primary" onClick={() => handleCopyReference(item.reference)}>
                                                📋 Inserir Referência
                                            </Button>
                                            {item.url && (
                                                <Button size="sm" variant="secondary" onClick={() => window.open(item.url, '_blank')}>
                                                    🔗 Ver Original
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}

                    {results.length > 0 && (
                        <div style={{
                            padding: theme.spacing.md,
                            background: theme.colors.surface,
                            borderRadius: theme.borderRadius.md,
                            fontSize: theme.typography.sizes.xs,
                            color: theme.colors.text.tertiary,
                            textAlign: 'center'
                        }}>
                            ⚠️ Use estas referências com responsabilidade. Evite plágio.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResearchPanel;
