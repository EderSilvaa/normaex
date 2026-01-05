import requests
import json

# Testar endpoint de escrita inteligente
BASE_URL = "http://localhost:8000/api/documents"

print("=" * 70)
print("TESTE: NORMAEX 2.0 - FASE 5: ESCRITA INTELIGENTE")
print("=" * 70)

# Dados do teste
test_request = {
    "filename": "tcc de teste.docx",
    "instruction": "Escreva uma introducao sobre a importancia da inteligencia artificial na educacao, com foco em personalizacao do ensino e analise de dados educacionais",
    "section_type": "introducao",
    "position": "fim"
}

print(f"\nDocumento: {test_request['filename']}")
print(f"Instrucao: {test_request['instruction'][:100]}...")
print(f"Secao: {test_request['section_type']}")
print(f"Posicao: {test_request['position']}")

print("\n" + "=" * 70)
print("Enviando requisicao para /intelligent-write...")
print("=" * 70)

try:
    response = requests.post(
        f"{BASE_URL}/intelligent-write",
        json=test_request,
        timeout=60  # 60 segundos para IA gerar
    )

    print(f"\nStatus: {response.status_code}")

    if response.status_code == 200:
        result = response.json()

        print("\n" + "=" * 70)
        print("SUCESSO! RESULTADO DA ESCRITA INTELIGENTE")
        print("=" * 70)

        print(f"\nMensagem: {result.get('message')}")
        print(f"Arquivo gerado: {result.get('output_filename')}")
        print(f"URL de download: {result.get('download_url')}")

        # Estatísticas
        stats = result.get('stats', {})
        print("\n" + "-" * 70)
        print("ESTATISTICAS:")
        print("-" * 70)
        print(f"Total de palavras: {stats.get('total_words')}")
        print(f"Total de caracteres: {stats.get('total_characters')}")
        print(f"Paragrafos inseridos: {stats.get('paragraphs_inserted')}")

        # Estrutura aplicada
        structure = result.get('structure_applied', {})
        print("\n" + "-" * 70)
        print("ESTRUTURA APLICADA:")
        print("-" * 70)
        print(f"Tipo: {structure.get('type')}")
        print(f"Secao: {structure.get('section')}")

        formatting = structure.get('formatting', {})
        print(f"\nFormatacao:")
        print(f"  Fonte: {formatting.get('font')} {formatting.get('size')}pt")
        print(f"  Alinhamento: {formatting.get('alignment')}")
        print(f"  Espacamento: {formatting.get('spacing')}")
        print(f"  Recuo: {formatting.get('indent')}cm")

        # Plano de ação
        action_plan = result.get('action_plan', [])
        print(f"\n" + "-" * 70)
        print(f"PLANO DE ACAO ({len(action_plan)} acoes):")
        print("-" * 70)
        for i, action in enumerate(action_plan[:3], 1):  # Mostrar primeiras 3
            print(f"{i}. {action.get('description')}")

        # Conteúdo gerado (primeiros 500 caracteres)
        content = result.get('generated_content', '')
        print("\n" + "-" * 70)
        print("CONTEUDO GERADO (preview):")
        print("-" * 70)
        print(content[:500] + "..." if len(content) > 500 else content)

        # Resultado da execução
        exec_result = result.get('execution_result', {})
        print("\n" + "-" * 70)
        print("RESULTADO DA EXECUCAO:")
        print("-" * 70)
        print(f"Sucesso: {exec_result.get('success')}")
        print(f"Paragrafos inseridos: {exec_result.get('paragraphs_inserted')}")

        # Comparação com /write normal
        print("\n" + "=" * 70)
        print("DIFERENCA /write vs /intelligent-write:")
        print("=" * 70)
        print("[/write]             IA escreve -> Usuario formata (2 etapas)")
        print("[/intelligent-write] IA escreve + formata (1 etapa integrada)")
        print("\nVantagens:")
        print("  - Formatacao automatica ABNT")
        print("  - Estrutura ja aplicada")
        print("  - Menos passos para o usuario")
        print("  - Consistencia garantida")

    else:
        print(f"\nERRO: {response.status_code}")
        print(f"Detalhes: {response.text}")

except requests.exceptions.Timeout:
    print("\nERRO: Timeout na requisicao (IA demorou muito)")
except requests.exceptions.ConnectionError:
    print("\nERRO: Nao foi possivel conectar ao servidor")
    print("Certifique-se de que o servidor esta rodando em http://localhost:8000")
except Exception as e:
    print(f"\nERRO: {e}")

print("\n" + "=" * 70)
print("TESTE CONCLUIDO")
print("=" * 70)
