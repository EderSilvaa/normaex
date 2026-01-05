import requests
import json
from urllib.parse import quote

# Testar endpoint de validação
BASE_URL = "http://localhost:8000/api/documents"

# 1. Testar validação simples
print("=" * 60)
print("TESTE 1: Validação simples de documento formatado")
print("=" * 60)

filename = quote("formatted_tcc de teste.docx")
response = requests.get(f"{BASE_URL}/validate/{filename}")
print(f"Status: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("\n" + "=" * 60)
    print("RESUMO DA VALIDAÇÃO:")
    print("=" * 60)
    print(f"Score Geral: {result['summary']['overall_score']:.2f}/100")
    print(f"Conformidade ABNT: {'✅ SIM' if result['summary']['is_abnt_compliant'] else '❌ NÃO'}")
    print(f"Total de Issues: {result['summary']['total_issues']}")
    print(f"Issues Críticos: {result['summary']['critical_issues']}")
    print(f"Avisos: {result['summary']['warnings']}")
else:
    print(f"Erro: {response.text}")

# 2. Testar comparação
print("\n" + "=" * 60)
print("TESTE 2: Validação com comparação")
print("=" * 60)

filename = quote("formatted_tcc de teste.docx")
response = requests.get(
    f"{BASE_URL}/validate/{filename}",
    params={"compare_with": "tcc de teste.docx"}
)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    result = response.json()

    if result.get("comparison"):
        print("\n" + "=" * 60)
        print("COMPARAÇÃO ANTES vs DEPOIS:")
        print("=" * 60)
        comp = result["comparison"]
        print(f"Score Original: {comp['original_score']:.2f}/100")
        print(f"Score Formatado: {comp['formatted_score']:.2f}/100")
        print(f"Melhoria: {comp['improvement']:+.2f} pontos")

        print("\nMelhorias por Categoria:")
        for category, improvement in comp["improvements_by_category"].items():
            emoji = "✅" if improvement > 0 else "⚠️" if improvement == 0 else "❌"
            print(f"  {emoji} {category.capitalize()}: {improvement:+.2f}")
else:
    print(f"Erro: {response.text}")

print("\n" + "=" * 60)
print("TESTES CONCLUÍDOS!")
print("=" * 60)
