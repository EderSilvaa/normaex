"""
Serviço de geração de gráficos usando matplotlib.
Retorna imagens em base64 para inserção no Word.
"""

import matplotlib
matplotlib.use('Agg')  # Backend não-interativo para servidor

import matplotlib.pyplot as plt
import io
import base64
from typing import Optional

# Configuração para melhor qualidade e estilo acadêmico
plt.rcParams['figure.dpi'] = 150
plt.rcParams['savefig.dpi'] = 150
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['axes.labelsize'] = 10


def generate_chart(
    chart_type: str,
    labels: list[str],
    values: list[float],
    title: Optional[str] = None,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    colors: Optional[list[str]] = None
) -> str:
    """
    Gera um gráfico e retorna como base64.

    Args:
        chart_type: Tipo de gráfico ('bar', 'bar_horizontal', 'line', 'pie', 'area')
        labels: Rótulos dos dados
        values: Valores numéricos
        title: Título do gráfico (opcional)
        x_label: Rótulo do eixo X (opcional)
        y_label: Rótulo do eixo Y (opcional)
        colors: Lista de cores (opcional)

    Returns:
        String base64 da imagem PNG
    """
    # Cores padrão em tons profissionais
    default_colors = [
        '#2563eb',  # Azul
        '#dc2626',  # Vermelho
        '#16a34a',  # Verde
        '#ca8a04',  # Amarelo escuro
        '#9333ea',  # Roxo
        '#0891b2',  # Ciano
        '#ea580c',  # Laranja
        '#4b5563',  # Cinza
    ]

    chart_colors = colors or default_colors[:len(values)]

    # Criar figura
    fig, ax = plt.subplots(figsize=(8, 5))

    if chart_type == 'bar':
        # Gráfico de barras verticais
        bars = ax.bar(labels, values, color=chart_colors, edgecolor='white', linewidth=0.7)

        # Adicionar valores acima das barras
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.annotate(f'{value:.1f}' if isinstance(value, float) else str(value),
                       xy=(bar.get_x() + bar.get_width() / 2, height),
                       xytext=(0, 3),
                       textcoords="offset points",
                       ha='center', va='bottom', fontsize=9)

    elif chart_type == 'bar_horizontal':
        # Gráfico de barras horizontais
        bars = ax.barh(labels, values, color=chart_colors, edgecolor='white', linewidth=0.7)

        # Adicionar valores ao lado das barras
        for bar, value in zip(bars, values):
            width = bar.get_width()
            ax.annotate(f'{value:.1f}' if isinstance(value, float) else str(value),
                       xy=(width, bar.get_y() + bar.get_height() / 2),
                       xytext=(3, 0),
                       textcoords="offset points",
                       ha='left', va='center', fontsize=9)

    elif chart_type == 'line':
        # Gráfico de linhas
        ax.plot(labels, values, marker='o', color=chart_colors[0], linewidth=2, markersize=8)
        ax.fill_between(labels, values, alpha=0.1, color=chart_colors[0])

        # Grade sutil
        ax.grid(True, linestyle='--', alpha=0.3)

    elif chart_type == 'pie':
        # Gráfico de pizza
        wedges, texts, autotexts = ax.pie(
            values,
            labels=labels,
            colors=chart_colors,
            autopct='%1.1f%%',
            startangle=90,
            explode=[0.02] * len(values)
        )

        # Melhorar legibilidade
        for autotext in autotexts:
            autotext.set_fontsize(9)
            autotext.set_color('white')
            autotext.set_fontweight('bold')

        ax.axis('equal')

    elif chart_type == 'area':
        # Gráfico de área
        ax.fill_between(labels, values, alpha=0.4, color=chart_colors[0])
        ax.plot(labels, values, color=chart_colors[0], linewidth=2)
        ax.grid(True, linestyle='--', alpha=0.3)

    elif chart_type == 'scatter':
        # Gráfico de dispersão (usa labels como eixo X numérico se possível)
        try:
            x_values = [float(l) for l in labels]
        except ValueError:
            x_values = list(range(len(labels)))

        ax.scatter(x_values, values, c=chart_colors[0], s=100, alpha=0.7, edgecolors='white')
        ax.grid(True, linestyle='--', alpha=0.3)

    else:
        raise ValueError(f"Tipo de gráfico não suportado: {chart_type}")

    # Configurar título e rótulos
    if title:
        ax.set_title(title, fontweight='bold', pad=15)
    if x_label and chart_type != 'pie':
        ax.set_xlabel(x_label)
    if y_label and chart_type != 'pie':
        ax.set_ylabel(y_label)

    # Rotacionar labels do eixo X se necessário
    if chart_type in ['bar', 'line', 'area'] and len(labels) > 4:
        plt.xticks(rotation=45, ha='right')

    # Ajustar layout
    plt.tight_layout()

    # Converter para base64
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png', bbox_inches='tight',
                facecolor='white', edgecolor='none')
    buffer.seek(0)

    base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')

    # Fechar figura para liberar memória
    plt.close(fig)

    return base64_image


def generate_multi_series_chart(
    chart_type: str,
    labels: list[str],
    series: list[dict],  # [{"name": "Serie 1", "values": [1,2,3]}, ...]
    title: Optional[str] = None,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None
) -> str:
    """
    Gera um gráfico com múltiplas séries de dados.

    Args:
        chart_type: 'bar' ou 'line'
        labels: Rótulos do eixo X
        series: Lista de dicionários com name e values
        title, x_label, y_label: Rótulos opcionais

    Returns:
        String base64 da imagem PNG
    """
    colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea']

    fig, ax = plt.subplots(figsize=(10, 6))

    if chart_type == 'bar':
        # Barras agrupadas
        x = range(len(labels))
        width = 0.8 / len(series)

        for i, s in enumerate(series):
            offset = (i - len(series)/2 + 0.5) * width
            bars = ax.bar([xi + offset for xi in x], s['values'],
                         width, label=s['name'], color=colors[i % len(colors)])

    elif chart_type == 'line':
        # Múltiplas linhas
        for i, s in enumerate(series):
            ax.plot(labels, s['values'], marker='o', label=s['name'],
                   color=colors[i % len(colors)], linewidth=2)
        ax.grid(True, linestyle='--', alpha=0.3)

    # Configurações
    if title:
        ax.set_title(title, fontweight='bold', pad=15)
    if x_label:
        ax.set_xlabel(x_label)
    if y_label:
        ax.set_ylabel(y_label)

    if chart_type == 'bar':
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels)

    ax.legend()

    if len(labels) > 4:
        plt.xticks(rotation=45, ha='right')

    plt.tight_layout()

    # Converter para base64
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png', bbox_inches='tight',
                facecolor='white', edgecolor='none')
    buffer.seek(0)

    base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
    plt.close(fig)

    return base64_image
