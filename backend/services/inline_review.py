"""
Serviço de Correção Inline (Revisão Pontual).
Focado em correções rápidas de gramática, estilo e clareza para trechos selecionados.
"""

import google.generativeai as genai
import os
import json
from services.ai import get_model

def review_selection(
    text: str, 
    instruction: str = "", 
    format_type: str = "abnt"
) -> dict:
    """
    Revisa um trecho de texto selecionado.
    Retorna JSON com correção e explicação.
    """
    try:
        model = get_model()
        
        prompt = f"""Atue como um editor acadêmico sênior (Norma {format_type.upper()}).
Sua tarefa é melhorar o seguinte trecho de texto selecionado pelo usuário.
Foque em: Clareza, Coesão, Gramática e Tom Acadêmico.

TRECHO ORIGINAL:
"{text}"

INSTRUÇÃO EXTRA DO USUÁRIO: "{instruction}" (se houver)

Retorne APENAS um JSON com o seguinte formato:
{{
  "corrected_text": "Texto aprimorado aqui",
  "explanation": "Breve justificativa das mudanças (máx 2 frases)",
  "changes": ["lista", "de", "principais", "alterações"]
}}

Se o texto já estiver excelente, retorne o texto original e explique que não precisa de alterações.
"""

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 2048,
            "temperature": 0.2, # Baixa temperatura para preservação do sentido
        })

        result_text = response.text.strip()
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            
        result_json = json.loads(result_text)
        result_json["original_text"] = text
        return result_json

    except Exception as e:
        print(f"[InlineReview] Erro: {e}")
        return {
            "original_text": text,
            "corrected_text": text,
            "explanation": f"Erro na revisão: {str(e)}",
            "changes": []
        }
