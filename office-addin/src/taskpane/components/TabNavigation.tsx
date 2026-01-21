/**
 * TabNavigation - Componente de abas reutilizável
 * Navegação com animação e badges - Responsivo
 */

import * as React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'medium',
  compact = false,
}) => {
  // Tamanhos responsivos
  const sizes = {
    small: { padding: '6px 8px', fontSize: '11px', gap: '3px', iconSize: '12px' },
    medium: { padding: '8px 10px', fontSize: '12px', gap: '4px', iconSize: '14px' },
    large: { padding: '10px 14px', fontSize: '14px', gap: '6px', iconSize: '16px' },
  };

  const s = sizes[size];

  // Estilos por variante
  const getTabStyle = (isActive: boolean, isDisabled: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      padding: s.padding,
      fontSize: s.fontSize,
      fontWeight: 600,
      border: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      opacity: isDisabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    };

    switch (variant) {
      case 'pills':
        return {
          ...baseStyle,
          borderRadius: '16px',
          background: isActive ? '#Eebb4d' : 'transparent',
          color: isActive ? '#0a0a0a' : '#888',
        };

      case 'underline':
        return {
          ...baseStyle,
          borderRadius: 0,
          background: 'transparent',
          color: isActive ? '#Eebb4d' : '#888',
          borderBottom: isActive ? '2px solid #Eebb4d' : '2px solid transparent',
        };

      default:
        return {
          ...baseStyle,
          borderRadius: '8px',
          background: isActive ? '#Eebb4d' : '#1a1a1a',
          color: isActive ? '#0a0a0a' : '#888',
        };
    }
  };

  // Estilo do container
  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      gap: '6px',
      width: '100%',
    };

    switch (variant) {
      case 'pills':
        return {
          ...baseStyle,
          background: '#1a1a1a',
          padding: '3px',
          borderRadius: '20px',
        };

      case 'underline':
        return {
          ...baseStyle,
          gap: 0,
          borderBottom: '1px solid #333',
        };

      default:
        return baseStyle;
    }
  };

  return (
    <div style={getContainerStyle()}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          style={getTabStyle(activeTab === tab.id, !!tab.disabled)}
          onMouseEnter={(e) => {
            if (!tab.disabled && activeTab !== tab.id) {
              if (variant === 'default') {
                e.currentTarget.style.background = '#252525';
              } else if (variant === 'pills') {
                e.currentTarget.style.background = '#333';
              }
              e.currentTarget.style.color = '#fff';
            }
          }}
          onMouseLeave={(e) => {
            if (!tab.disabled && activeTab !== tab.id) {
              if (variant === 'default') {
                e.currentTarget.style.background = '#1a1a1a';
              } else if (variant === 'pills') {
                e.currentTarget.style.background = 'transparent';
              }
              e.currentTarget.style.color = '#888';
            }
          }}
        >
          {/* Ícone */}
          {tab.icon && <span style={{ fontSize: s.iconSize }}>{tab.icon}</span>}

          {/* Label - hidden em modo compacto se houver ícone */}
          {(!compact || !tab.icon) && (
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: s.fontSize,
            }}>
              {tab.label}
            </span>
          )}

          {/* Badge */}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span
              style={{
                minWidth: '14px',
                height: '14px',
                padding: '0 4px',
                borderRadius: '7px',
                background: activeTab === tab.id ? '#0a0a0a' : '#ef4444',
                color: activeTab === tab.id ? '#Eebb4d' : '#fff',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
