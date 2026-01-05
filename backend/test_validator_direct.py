"""
Teste direto do sistema de validação (sem precisar do servidor HTTP)
"""
import sys
import os

# Adicionar backend ao path
sys.path.insert(0, os.path.dirname(__file__))

from services.validator import DocumentValidator, validate_document_quality
from services.document_vision import convert_docx_to_pdf
import json

print("=" * 70)
print("TESTE DIRETO DA VALIDAÇÃO - NORMAEX 2.0 FASE 4")
print("=" * 70)

# Arquivo para testar
filename = "formatted_tcc de teste.docx"
file_path = f"../processed/{filename}"

if not os.path.exists(file_path):
    print(f"\nERRO: Arquivo não encontrado: {file_path}")
    sys.exit(1)

print(f"\nArquivo: {filename}")
print(f"Caminho: {file_path}")

# 1. Converter para PDF
print("\n" + "=" * 70)
print("ETAPA 1: Convertendo DOCX para PDF...")
print("=" * 70)

pdf_path = file_path.replace(".docx", "_validation_test.pdf")
conversion_success = convert_docx_to_pdf(file_path, pdf_path)

if not conversion_success or not os.path.exists(pdf_path):
    print("ERRO: Conversão para PDF falhou")
    sys.exit(1)

print(f"✓ PDF criado: {pdf_path}")

# 2. Validar documento
print("\n" + "=" * 70)
print("ETAPA 2: Executando validação visual...")
print("=" * 70)

try:
    validation_result = validate_document_quality(pdf_path)

    print("\n" + "=" * 70)
    print("RESULTADOS DA VALIDAÇÃO")
    print("=" * 70)

    print(f"\n📊 SCORE GERAL: {validation_result['overall_score']:.2f}/100")

    if validation_result['overall_score'] >= 85:
        print("✅ Documento CONFORME com ABNT!")
    else:
        print("⚠️ Documento NÃO conforme com ABNT")

    print("\n" + "-" * 70)
    print("DETALHES POR CATEGORIA:")
    print("-" * 70)

    # Margens
    margins = validation_result['margins']
    emoji = "✅" if margins['valid'] else "❌"
    print(f"\n{emoji} MARGENS - Score: {margins['score']:.2f}/100")
    print(f"   Medido: {margins['measured']}")
    print(f"   Esperado: {margins['expected']}")

    # Fontes
    fonts = validation_result['fonts']
    emoji = "✅" if fonts['valid'] else "❌"
    print(f"\n{emoji} FONTES - Score: {fonts['score']:.2f}/100")
    print(f"   Fonte principal: {fonts['main_font']}")
    print(f"   Tamanho principal: {fonts['main_size']}pt")

    # Espaçamento
    spacing = validation_result['spacing']
    emoji = "✅" if spacing['valid'] else "❌"
    print(f"\n{emoji} ESPAÇAMENTO - Score: {spacing['score']:.2f}/100")
    print(f"   Espaçamento médio: {spacing.get('avg_spacing_ratio', 'N/A')}")

    # Alinhamento
    alignment = validation_result['alignment']
    emoji = "✅" if alignment['valid'] else "❌"
    print(f"\n{emoji} ALINHAMENTO - Score: {alignment['score']:.2f}/100")
    print(f"   Margem esquerda (desvio padrão): {alignment.get('left_margin_std', 'N/A')}")
    print(f"   Margem direita (desvio padrão): {alignment.get('right_margin_std', 'N/A')}")

    # Issues
    if validation_result['all_issues']:
        print("\n" + "-" * 70)
        print("PROBLEMAS ENCONTRADOS:")
        print("-" * 70)
        for i, issue in enumerate(validation_result['all_issues'], 1):
            severity_emoji = "🔴" if issue['severity'] == 'critical' else "🟡"
            print(f"{severity_emoji} {i}. [{issue['severity'].upper()}] {issue['category']}")
            print(f"   {issue['description']}")
    else:
        print("\n✅ Nenhum problema encontrado!")

    # Salvar JSON completo
    json_path = pdf_path.replace(".pdf", "_validation_result.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(validation_result, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 70)
    print(f"Resultado completo salvo em: {json_path}")
    print("=" * 70)

except Exception as e:
    import traceback
    print(f"\nERRO durante validação:")
    print(traceback.format_exc())
finally:
    # Limpar PDF temporário
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
            print(f"\n✓ PDF temporário removido")
        except:
            print(f"\n⚠️ Não foi possível remover PDF temporário: {pdf_path}")

print("\n" + "=" * 70)
print("TESTE CONCLUÍDO!")
print("=" * 70)
