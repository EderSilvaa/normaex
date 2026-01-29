"""
Script para gerar ícones do Normaex para Microsoft AppSource
Tamanhos necessários: 16x16, 32x32, 64x64, 80x80, 128x128
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Diretório de saída
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "office-addin", "assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Cores do Normaex - Novo estilo
GOLD = "#E5A33B"  # Dourado/Amarelo
DARK_BLUE = "#1a1a2e"  # Azul escuro para fundo
WHITE = "#ffffff"

# Tamanhos necessários para AppSource
SIZES = [16, 32, 64, 80, 128]

def create_icon(size: int) -> Image.Image:
    """Cria um ícone quadrado com o logo Normaex - N dourado"""

    # Criar imagem com fundo azul escuro
    img = Image.new("RGBA", (size, size), DARK_BLUE)
    draw = ImageDraw.Draw(img)

    # Margens proporcionais
    margin = size // 8

    # Largura das barras do N
    bar_width = max(2, size // 6)

    # Área útil para o N
    left = margin
    right = size - margin
    top = margin + size // 10
    bottom = size - margin - size // 6  # Deixar espaço para barra inferior

    # Desenhar o "N" estilizado

    # 1. Barra vertical esquerda
    draw.rectangle(
        [left, top, left + bar_width, bottom],
        fill=GOLD
    )

    # 2. Barra vertical direita
    draw.rectangle(
        [right - bar_width, top, right, bottom],
        fill=GOLD
    )

    # 3. Diagonal do N (polígono)
    diagonal_points = [
        (left, top),  # Topo esquerdo
        (left + bar_width, top),  # Topo esquerdo + largura
        (right, bottom),  # Base direita
        (right - bar_width, bottom),  # Base direita - largura
    ]
    draw.polygon(diagonal_points, fill=GOLD)

    # 4. Barra horizontal inferior (assinatura do logo)
    bar_top = size - margin - size // 12
    bar_bottom = size - margin
    draw.rectangle(
        [left, bar_top, right, bar_bottom],
        fill=GOLD
    )

    return img


def main():
    print("Gerando ícones do Normaex...")
    print(f"Diretório de saída: {OUTPUT_DIR}")
    print()

    for size in SIZES:
        icon = create_icon(size)
        filename = f"icon-{size}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        icon.save(filepath, "PNG")
        print(f"[OK] Criado: {filename}")

    print()
    print("Todos os ícones foram gerados!")
    print()
    print("Arquivos criados:")
    for size in SIZES:
        print(f"  - assets/icon-{size}.png")


if __name__ == "__main__":
    main()
