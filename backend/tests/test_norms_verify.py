
import asyncio
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.addin_models import DocumentContent, ParagraphData, FormatType, PageSetup
from routers.addin import analyze_content

async def run_test():
    print("=== TESTE DE VERIFICAÇÃO DE NORMAS ===")

    # 1. Criar um documento genérico
    # Texto com espaçamento 1.5 e justificado (Bom para ABNT, Ruim para APA)
    paragraphs = [
        ParagraphData(
            text="Introdução ao tema.",
            style="Heading 1",
            font_name="Arial",
            font_size=14,
            alignment="Left",
            line_spacing=1.5
        ),
        ParagraphData(
            text="Este é um parágrafo de texto normal. Ele está formatado com espaçamento 1.5 e alinhamento justificado. Isso é ideal para ABNT mas incorreto para APA (que exige espaçamento duplo e alinhamento à esquerda).",
            style="Normal",
            font_name="Arial",
            font_size=12,
            alignment="Justified",
            line_spacing=1.5
        ),
        ParagraphData(
            text="Conclusão e considerações finais.",
            style="Heading 1",
            font_name="Arial",
            font_size=14,
            alignment="Left",
            line_spacing=1.5
        ),
        ParagraphData(
            text="Referências Bibliográficas",
            style="Heading 1",
            font_name="Arial",
            font_size=14,
            alignment="Left",
            line_spacing=1.5
        )
    ]
    
    page_setup = PageSetup(
        margins={"top_cm": 3.0, "bottom_cm": 2.0, "left_cm": 3.0, "right_cm": 2.0}, # ABNT margins
        page_size="A4",
        orientation="Portrait"
    )

    # --- TESTE ABNT ---
    print("\n[1] Testando com ABNT (Espera-se ALTA conformidade)...")
    doc_abnt = DocumentContent(
        paragraphs=paragraphs,
        format_type=FormatType.ABNT,
        full_text="\n".join([p.text for p in paragraphs]),
        page_setup=page_setup
    )
    result_abnt = await analyze_content(doc_abnt)
    print(f"Score ABNT: {result_abnt.score}")
    print(f"Issues ABNT: {len(result_abnt.issues)}")
    for issue in result_abnt.issues:
        print(f" - {issue.code}: {issue.message}")

    # --- TESTE APA ---
    print("\n[2] Testando com APA (Espera-se BAIXA conformidade)...")
    # APA exige espaçamento 2.0, alinhamento Left, e margens 2.54
    doc_apa = DocumentContent(
        paragraphs=paragraphs,
        format_type=FormatType.APA,
        full_text="\n".join([p.text for p in paragraphs]),
        page_setup=page_setup
    )
    result_apa = await analyze_content(doc_apa)
    print(f"Score APA: {result_apa.score}")
    print(f"Issues APA: {len(result_apa.issues)}")
    # Esperamos issues de Alinhamento, Espaçamento e Margem
    expected_issues = ["ALIGNMENT", "SPACING", "MARGINS"]
    found_issues = [issue.code for issue in result_apa.issues]
    print(f"Issues encontrados: {found_issues}")
    
    if any(code in found_issues for code in expected_issues):
        print("✅ SUCESSO: APA detectou erros de formatação (correto)!")
    else:
        print("❌ FALHA: APA não detectou erros esperados.")

    # --- TESTE IEEE ---
    print("\n[3] Testando com IEEE (Espera-se BAIXA conformidade - Margens distintas)...")
    doc_ieee = DocumentContent(
        paragraphs=paragraphs,
        format_type=FormatType.IEEE,
        full_text="\n".join([p.text for p in paragraphs]),
        page_setup=page_setup
    )
    result_ieee = await analyze_content(doc_ieee)
    print(f"Score IEEE: {result_ieee.score}")
    print(f"Issues IEEE: {len(result_ieee.issues)}")
    for issue in result_ieee.issues:
        print(f" - {issue.code}: {issue.message}")

if __name__ == "__main__":
    asyncio.run(run_test())
