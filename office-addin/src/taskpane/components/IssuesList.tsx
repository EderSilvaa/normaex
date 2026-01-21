/**
 * IssuesList - Lista de problemas encontrados
 * Exibe issues com filtro por severidade e ações
 */

import * as React from 'react';
import { useState } from 'react';
import { Issue } from '../../types';

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';

interface IssuesListProps {
  issues: Issue[];
  maxVisible?: number;
  onIssueClick?: (issue: Issue) => void;
  onApplyFix?: (issue: Issue) => void;
}

const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  maxVisible = 5,
  onIssueClick,
  onApplyFix,
}) => {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [expanded, setExpanded] = useState(false);

  // Filtrar issues
  const filteredIssues = issues.filter((issue) => {
    if (filter === 'all') return true;
    return issue.severity === filter;
  });

  // Limitar quantidade visível
  const visibleIssues = expanded ? filteredIssues : filteredIssues.slice(0, maxVisible);
  const hasMore = filteredIssues.length > maxVisible;

  // Contadores por severidade
  const counts = {
    error: issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  };

  // Cores por severidade
  const getSeverityColor = (severity: Issue['severity']): string => {
    switch (severity) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#666';
    }
  };

  // Ícones por severidade
  const getSeverityIcon = (severity: Issue['severity']): string => {
    switch (severity) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  if (issues.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          background: '#0d1f0d',
          borderRadius: '12px',
          border: '1px solid #10b98133',
        }}
      >
        <span style={{ fontSize: '24px' }}>✓</span>
        <p style={{ color: '#10b981', margin: '8px 0 0', fontWeight: 600 }}>
          Nenhum problema encontrado!
        </p>
        <p style={{ color: '#666', fontSize: '12px', margin: '4px 0 0' }}>
          Seu documento está em conformidade com as normas ABNT.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header com filtros */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h4 style={{ color: '#999', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>
          Problemas Encontrados
        </h4>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'error', 'warning', 'info'] as SeverityFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: filter === f ? '#333' : 'transparent',
                color: filter === f ? '#fff' : '#666',
                transition: 'all 0.2s',
              }}
            >
              {f === 'all' ? 'Todos' : f === 'error' ? `Erros (${counts.error})` : f === 'warning' ? `Avisos (${counts.warning})` : `Info (${counts.info})`}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de issues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleIssues.map((issue, index) => (
          <div
            key={index}
            onClick={() => onIssueClick?.(issue)}
            style={{
              background: '#1a1a1a',
              borderRadius: '8px',
              padding: '12px',
              borderLeft: `3px solid ${getSeverityColor(issue.severity)}`,
              cursor: onIssueClick ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (onIssueClick) {
                e.currentTarget.style.background = '#222';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a1a';
            }}
          >
            {/* Header da issue */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span
                style={{
                  color: getSeverityColor(issue.severity),
                  fontSize: '14px',
                  lineHeight: 1,
                }}
              >
                {getSeverityIcon(issue.severity)}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                  {issue.message}
                </p>

                {/* Localização */}
                {issue.location && (
                  <p style={{ color: '#666', fontSize: '11px', margin: '4px 0 0' }}>
                    📍 {issue.location}
                  </p>
                )}

                {/* Sugestão */}
                {issue.suggestion && (
                  <p style={{ color: '#888', fontSize: '11px', margin: '6px 0 0', fontStyle: 'italic' }}>
                    💡 {issue.suggestion}
                  </p>
                )}
              </div>
            </div>

            {/* Botão de correção automática */}
            {issue.auto_fix && onApplyFix && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyFix(issue);
                }}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  background: '#Eebb4d22',
                  color: '#Eebb4d',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#Eebb4d33';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#Eebb4d22';
                }}
              >
                ⚡ Corrigir automaticamente
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Botão para ver mais */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '10px',
            fontSize: '12px',
            fontWeight: 500,
            border: '1px dashed #333',
            borderRadius: '8px',
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
          {expanded
            ? '▲ Mostrar menos'
            : `▼ Ver mais ${filteredIssues.length - maxVisible} problema${filteredIssues.length - maxVisible > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
};

export default IssuesList;
