/**
 * NormSelector - Componente para seleção de norma acadêmica
 * Permite ao usuário escolher a norma, área e tipo de trabalho
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    NormType,
    WorkType,
    KnowledgeArea,
    ALL_NORMS,
    KNOWLEDGE_AREAS,
    WORK_TYPES,
    getNormConfig,
    suggestNormForArea,
    NormConfig,
} from '../../config/norms.config';

export interface WorkConfig {
    norm: NormType;
    area: KnowledgeArea;
    workType: WorkType;
}

interface NormSelectorProps {
    currentConfig?: WorkConfig;
    onConfigChange: (config: WorkConfig) => void;
    onClose?: () => void;
    compact?: boolean;
}

const NormSelector: React.FC<NormSelectorProps> = ({
    currentConfig,
    onConfigChange,
    onClose,
    compact = false,
}) => {
    const [selectedNorm, setSelectedNorm] = useState<NormType>(currentConfig?.norm || 'abnt');
    const [selectedArea, setSelectedArea] = useState<KnowledgeArea>(currentConfig?.area || 'outras');
    const [selectedWorkType, setSelectedWorkType] = useState<WorkType>(currentConfig?.workType || 'tcc');
    const [showNormDetails, setShowNormDetails] = useState(false);

    const normConfig = getNormConfig(selectedNorm);

    // Quando área muda, sugerir norma apropriada
    const handleAreaChange = (area: KnowledgeArea) => {
        setSelectedArea(area);
        const suggestedNorm = suggestNormForArea(area);
        setSelectedNorm(suggestedNorm);
    };

    const handleSave = () => {
        onConfigChange({
            norm: selectedNorm,
            area: selectedArea,
            workType: selectedWorkType,
        });
        onClose?.();
    };

    // Estilos base
    const styles = {
        container: {
            padding: compact ? '12px' : '16px',
            background: '#141414',
            borderRadius: '12px',
            border: '1px solid #2a2a2a',
        } as React.CSSProperties,
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
        } as React.CSSProperties,
        title: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
        } as React.CSSProperties,
        closeBtn: {
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
        } as React.CSSProperties,
        section: {
            marginBottom: '16px',
        } as React.CSSProperties,
        label: {
            display: 'block',
            color: '#888',
            fontSize: '11px',
            fontWeight: 500,
            marginBottom: '8px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
        } as React.CSSProperties,
        select: {
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #333',
            background: '#0a0a0a',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            appearance: 'none' as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
        } as React.CSSProperties,
        normCards: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
        } as React.CSSProperties,
        normCard: (isSelected: boolean) => ({
            padding: '10px',
            borderRadius: '8px',
            border: `2px solid ${isSelected ? '#Eebb4d' : '#333'}`,
            background: isSelected ? 'rgba(238, 187, 77, 0.1)' : '#0a0a0a',
            cursor: 'pointer',
            transition: 'all 0.2s',
        } as React.CSSProperties),
        normIcon: {
            fontSize: '20px',
            marginBottom: '4px',
        } as React.CSSProperties,
        normName: {
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '2px',
        } as React.CSSProperties,
        normDesc: {
            color: '#666',
            fontSize: '10px',
        } as React.CSSProperties,
        detailsBox: {
            marginTop: '12px',
            padding: '12px',
            background: '#0a0a0a',
            borderRadius: '8px',
            border: '1px solid #333',
        } as React.CSSProperties,
        detailsTitle: {
            color: '#Eebb4d',
            fontSize: '11px',
            fontWeight: 600,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        } as React.CSSProperties,
        detailItem: {
            color: '#888',
            fontSize: '11px',
            marginBottom: '4px',
            paddingLeft: '12px',
            position: 'relative' as const,
        } as React.CSSProperties,
        saveBtn: {
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#Eebb4d',
            color: '#0a0a0a',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '16px',
            transition: 'all 0.2s',
        } as React.CSSProperties,
        infoBtn: {
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        } as React.CSSProperties,
        badge: {
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 600,
            marginLeft: '6px',
        } as React.CSSProperties,
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h3 style={styles.title}>
                    <span>🎓</span>
                    Configuração do Trabalho
                </h3>
                {onClose && (
                    <button style={styles.closeBtn} onClick={onClose}>
                        ✕
                    </button>
                )}
            </div>

            {/* Área de Conhecimento */}
            <div style={styles.section}>
                <label style={styles.label}>📚 Área de Conhecimento</label>
                <select
                    style={styles.select}
                    value={selectedArea}
                    onChange={(e) => handleAreaChange(e.target.value as KnowledgeArea)}
                >
                    {KNOWLEDGE_AREAS.map((area) => (
                        <option key={area.id} value={area.id}>
                            {area.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Seleção de Norma */}
            <div style={styles.section}>
                <label style={styles.label}>📐 Norma Acadêmica</label>
                <div style={styles.normCards}>
                    {ALL_NORMS.map((norm) => (
                        <div
                            key={norm.id}
                            style={styles.normCard(selectedNorm === norm.id)}
                            onClick={() => setSelectedNorm(norm.id)}
                        >
                            <div style={styles.normIcon}>{norm.icon}</div>
                            <div style={styles.normName}>
                                {norm.name}
                                {suggestNormForArea(selectedArea) === norm.id && (
                                    <span style={{ ...styles.badge, background: 'rgba(238, 187, 77, 0.3)', color: '#Eebb4d' }}>
                                        Recomendada
                                    </span>
                                )}
                            </div>
                            <div style={styles.normDesc}>{norm.description}</div>
                        </div>
                    ))}
                </div>

                {/* Botão para ver detalhes */}
                <button
                    style={styles.infoBtn}
                    onClick={() => setShowNormDetails(!showNormDetails)}
                >
                    {showNormDetails ? '▼' : '▶'} Ver regras da {normConfig.name}
                </button>

                {/* Detalhes da norma selecionada */}
                {showNormDetails && (
                    <div style={styles.detailsBox}>
                        <div style={styles.detailsTitle}>
                            {normConfig.icon} {normConfig.fullName}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: '#666', fontSize: '10px' }}>Citação: </span>
                            <span style={{ color: '#fff', fontSize: '11px' }}>{normConfig.citationStyle.example}</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: '#666', fontSize: '10px' }}>Referências: </span>
                            <span style={{ color: '#fff', fontSize: '11px' }}>
                                {normConfig.referenceOrder === 'alphabetical' ? 'Ordem alfabética' : 'Ordem de aparição'}
                            </span>
                        </div>
                        <div style={{ color: '#666', fontSize: '10px', marginTop: '8px' }}>Regras específicas:</div>
                        {normConfig.specificRules.slice(0, 3).map((rule, i) => (
                            <div key={i} style={styles.detailItem}>
                                • {rule}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tipo de Trabalho */}
            <div style={styles.section}>
                <label style={styles.label}>📝 Tipo de Trabalho</label>
                <select
                    style={styles.select}
                    value={selectedWorkType}
                    onChange={(e) => setSelectedWorkType(e.target.value as WorkType)}
                >
                    {WORK_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Resumo da configuração */}
            <div style={{
                padding: '10px',
                background: 'rgba(238, 187, 77, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(238, 187, 77, 0.3)',
            }}>
                <div style={{ color: '#Eebb4d', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                    ✨ Configuração Selecionada
                </div>
                <div style={{ color: '#fff', fontSize: '12px' }}>
                    {normConfig.icon} <strong>{normConfig.name}</strong> • {KNOWLEDGE_AREAS.find(a => a.id === selectedArea)?.label} • {WORK_TYPES.find(w => w.id === selectedWorkType)?.label}
                </div>
            </div>

            {/* Botão Salvar */}
            <button
                style={styles.saveBtn}
                onClick={handleSave}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#d9a63c';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#Eebb4d';
                }}
            >
                Salvar Configuração
            </button>
        </div>
    );
};

export default NormSelector;
