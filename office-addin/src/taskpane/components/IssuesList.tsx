/**
 * IssuesList - Lista de problemas encontrados
 * Exibe issues com filtro por severidade e ações
 */

import * as React from 'react';
import { useState } from 'react';
import { Issue } from '../../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { theme } from '../../styles/theme';

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
  const [expandedIssueIndex, setExpandedIssueIndex] = useState<number | null>(null);

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
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'info': return theme.colors.info;
      default: return theme.colors.text.secondary;
    }
  };

  // Ícones por severidade
  const getSeverityIcon = (severity: Issue['severity']): string => {
    switch (severity) {
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  };

  if (issues.length === 0) {
    return (
      <Card style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
        <span style={{ fontSize: '24px' }}>✓</span>
        <p style={{ color: theme.colors.success, margin: '8px 0 0', fontWeight: 600 }}>
          Nenhum problema encontrado!
        </p>
        <p style={{ color: theme.colors.text.secondary, fontSize: theme.typography.sizes.xs, margin: '4px 0 0' }}>
          Seu documento está em conformidade com as normas.
        </p>
      </Card>
    );
  }

  return (
    <div>
      {/* Header com filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
        <h4 style={{ color: theme.colors.text.tertiary, fontSize: theme.typography.sizes.xs, margin: 0, textTransform: 'uppercase' }}>
          Problemas
        </h4>

        {/* Filtros em forma de pills */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'error', 'warning', 'info'] as SeverityFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                background: filter === f ? theme.colors.surfaceHighlight : 'transparent',
                color: filter === f ? theme.colors.text.primary : theme.colors.text.tertiary,
                transition: theme.transitions.fast,
              }}
            >
              {f === 'all' ? 'Todos' : f === 'error' ? `${counts.error}` : f === 'warning' ? `${counts.warning}` : `${counts.info}`}
              <span style={{ marginLeft: '4px', opacity: 0.5 }}>
                {f === 'error' && counts.error > 0 ? '✕' : f === 'warning' && counts.warning > 0 ? '⚠' : f === 'info' && counts.info > 0 ? 'ℹ' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de issues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visibleIssues.map((issue, index) => {
          const isExpanded = expandedIssueIndex === index;
          const severityColor = getSeverityColor(issue.severity);

          return (
            <Card
              key={index}
              onClick={() => {
                setExpandedIssueIndex(isExpanded ? null : index);
                onIssueClick?.(issue);
              }}
              style={{
                cursor: 'pointer',
                borderLeft: `3px solid ${severityColor}`,
                padding: '10px',
                borderColor: isExpanded ? theme.colors.primary : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: severityColor, fontSize: '14px', lineHeight: 1 }}>
                  {getSeverityIcon(issue.severity)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.sizes.sm,
                    margin: 0,
                    overflow: 'hidden',
                    whiteSpace: isExpanded ? 'normal' : 'nowrap',
                    textOverflow: 'ellipsis'
                  }}>
                    {issue.message}
                  </p>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '8px', paddingLeft: '22px', borderTop: `1px solid ${theme.colors.border}`, paddingTop: '8px' }}>
                  {issue.location && (
                    <p style={{ color: theme.colors.text.tertiary, fontSize: '11px', margin: '0 0 4px 0' }}>
                      📍 {issue.location}
                    </p>
                  )}

                  {issue.suggestion && (
                    <p style={{ color: theme.colors.text.secondary, fontSize: '11px', margin: '4px 0 8px 0', fontStyle: 'italic' }}>
                      💡 {issue.suggestion}
                    </p>
                  )}

                  {issue.auto_fix && onApplyFix && (
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFix(issue);
                      }}
                    >
                      ⚡ Corrigir Automaticamente
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Botão para ver mais */}
      {hasMore && (
        <Button
          size="sm"
          variant="ghost"
          fullWidth
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: '8px' }}
        >
          {expanded
            ? '▲ Mostrar menos'
            : `▼ Ver mais ${filteredIssues.length - maxVisible} problema${filteredIssues.length - maxVisible > 1 ? 's' : ''}`}
        </Button>
      )}
    </div>
  );
};

export default IssuesList;
