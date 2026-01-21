/**
 * ComplianceScore - Componente de score circular animado
 * Exibe o score ABNT com animação e cores dinâmicas - Responsivo
 */

import * as React from 'react';
import { useEffect, useState } from 'react';

interface ComplianceScoreProps {
  score: number;
  issueCount?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animate?: boolean;
}

const ComplianceScore: React.FC<ComplianceScoreProps> = ({
  score,
  issueCount = 0,
  size = 'medium',
  showLabel = true,
  animate = true,
}) => {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);

  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }

    const duration = 800;
    const steps = 40;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animate]);

  const getScoreColor = (s: number): string => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (s: number): string => {
    if (s >= 90) return 'Excelente';
    if (s >= 80) return 'Muito Bom';
    if (s >= 70) return 'Bom';
    if (s >= 60) return 'Regular';
    if (s >= 40) return 'Melhorar';
    return 'Crítico';
  };

  // Tamanhos responsivos (menores)
  const sizes = {
    small: { container: 60, font: 18, label: 9, ring: 5 },
    medium: { container: 80, font: 26, label: 10, ring: 6 },
    large: { container: 100, font: 32, label: 11, ring: 7 },
  };

  const s = sizes[size];
  const color = getScoreColor(displayScore);
  const circumference = (s.container - s.ring) * Math.PI;
  const progress = (displayScore / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {/* Círculo SVG */}
      <div style={{ position: 'relative', width: s.container, height: s.container }}>
        <svg width={s.container} height={s.container} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={s.container / 2}
            cy={s.container / 2}
            r={(s.container - s.ring) / 2}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={s.ring}
          />
          <circle
            cx={s.container / 2}
            cy={s.container / 2}
            r={(s.container - s.ring) / 2}
            fill="none"
            stroke={color}
            strokeWidth={s.ring}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition: animate ? 'stroke-dashoffset 0.8s ease-out' : 'none',
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>

        {/* Número central */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: s.font,
            fontWeight: 700,
            color: color,
            textShadow: `0 0 12px ${color}40`,
            lineHeight: 1,
          }}>
            {displayScore}
          </span>
          {showLabel && size !== 'small' && (
            <span style={{ fontSize: s.label - 2, color: '#666', marginTop: '1px' }}>
              ABNT
            </span>
          )}
        </div>
      </div>

      {/* Label de status */}
      {showLabel && (
        <span style={{
          fontSize: s.label,
          fontWeight: 600,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}>
          {getScoreLabel(displayScore)}
        </span>
      )}

      {/* Contador de problemas */}
      {issueCount > 0 && (
        <span style={{ fontSize: s.label - 1, color: '#666' }}>
          {issueCount} problema{issueCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

export default ComplianceScore;
