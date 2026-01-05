import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

print(f"API Key encontrada: {API_KEY[:20]}..." if API_KEY else "NENHUMA API KEY")
print()

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)

        # Listar modelos disponíveis
        print("=== MODELOS DISPONIVEIS ===")
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                print(f"[OK] {model.name}")
        print()

        # Testar modelo específico
        print("=== TESTANDO MODELO ===")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content("Diga apenas: OK")
        print(f"Resposta: {response.text}")
        print("[OK] API Key funcionando!")

    except Exception as e:
        print(f"[ERRO]: {e}")
        print()
        print("POSSÍVEIS CAUSAS:")
        print("1. API Key inválida ou expirada")
        print("2. Projeto Google Cloud sem billing ativado")
        print("3. API Gemini não habilitada no projeto")
        print("4. Quota excedida (limite gratuito atingido)")
        print()
        print("SOLUÇÃO:")
        print("- Acesse: https://aistudio.google.com/app/apikey")
        print("- Crie uma nova API key")
        print("- Verifique se o billing está ativado (pode exigir cartão de crédito)")
