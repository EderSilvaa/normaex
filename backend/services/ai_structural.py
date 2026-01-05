"""
NORMAEX 2.0 - AI Structural Analysis
IA que entende e analisa a estrutura completa do documento
"""

import google.generativeai as genai
import json
import os
from typing import Dict, List, Any, Optional


def get_model():
    """Inicializa o modelo Gemini"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY não configurada")

    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


def analyze_document_structure(complete_vision: Dict[str, Any]) -> Dict[str, Any]:
    """
    Envia estrutura completa para IA analisar profundamente

    Args:
        complete_vision: Visão completa do documento (estrutura + visual)

    Returns:
        dict: Análise estrutural completa com classificações e plano de ação
    """
    model = get_model()

    # Preparar dados para IA (simplificar para não exceder limite)
    simplified_structure = {
        "paragraphs_count": len(complete_vision["structure"]["paragraphs"]),
        "sections": complete_vision["structure"]["sections"],
        "hierarchy": complete_vision["structure"]["hierarchy"],
        "statistics": complete_vision["structure"]["statistics"],
        "sample_paragraphs": complete_vision["structure"]["paragraphs"][:10],  # Primeiros 10
    }

    prompt = f"""
Você é um especialista em análise estrutural de documentos acadêmicos ABNT.

Analise este documento em formato JSON:

```json
{json.dumps(simplified_structure, indent=2, ensure_ascii=False)}
```

TAREFAS:

1. **CLASSIFICAR PARÁGRAFOS** (baseado na amostra):
   Para cada parágrafo da amostra, classifique em:
   - "title": Título principal do trabalho
   - "subtitle": Subtítulo ou seção
   - "body": Corpo de texto normal
   - "citation": Citação direta
   - "reference": Referência bibliográfica
   - "header": Cabeçalho
   - "footer": Rodapé
   - "abstract": Resumo/Abstract

2. **ANALISAR HIERARQUIA**:
   - Níveis de títulos estão consistentes?
   - Há quebras na hierarquia?
   - Numeração está correta?

3. **IDENTIFICAR PROBLEMAS ABNT**:
   MARGENS:
   - Top deve ser 3cm
   - Left deve ser 3cm
   - Bottom deve ser 2cm
   - Right deve ser 2cm

   FONTE:
   - Deve ser Arial ou Times New Roman
   - Tamanho deve ser 12pt
   - Corpo do texto não deve ter negrito/itálico excessivo

   ESPAÇAMENTO:
   - Entre linhas deve ser 1.5
   - Parágrafos devem ter recuo de 1.25cm

   ALINHAMENTO:
   - Corpo do texto deve ser justificado

4. **GERAR PLANO DE AÇÃO**:
   Para cada problema, gere um comando executável:

   Exemplo para margem:
   {{
     "action": "fix_margin",
     "target": "section_0",
     "params": {{"top": 3, "left": 3, "bottom": 2, "right": 2}},
     "description": "Ajustar margens para padrão ABNT"
   }}

   Exemplo para fonte:
   {{
     "action": "fix_font",
     "target": "all_body",
     "params": {{"name": "Arial", "size": 12}},
     "description": "Padronizar fonte para Arial 12pt"
   }}

   Exemplo para espaçamento:
   {{
     "action": "fix_spacing",
     "target": "all_body",
     "params": {{"line_spacing": 1.5}},
     "description": "Ajustar espaçamento entre linhas"
   }}

   Exemplo para alinhamento:
   {{
     "action": "fix_alignment",
     "target": "all_body",
     "params": {{"alignment": "justify"}},
     "description": "Justificar corpo de texto"
   }}

   Exemplo para recuo:
   {{
     "action": "fix_indent",
     "target": "all_body",
     "params": {{"first_line": 1.25}},
     "description": "Adicionar recuo de primeira linha"
   }}

IMPORTANTE: Retorne APENAS um JSON válido no formato:

```json
{{
  "classifications": [
    {{
      "paragraph_index": 0,
      "text_preview": "primeiras 50 caracteres...",
      "classification": "title",
      "confidence": 0.95,
      "reasoning": "Texto em negrito, centralizado, maior que outros"
    }}
  ],
  "hierarchy_analysis": {{
    "is_consistent": true,
    "levels_found": [1, 2, 3],
    "issues": []
  }},
  "abnt_issues": [
    {{
      "category": "margins",
      "severity": "high",
      "description": "Margem superior está em 2.5cm, deveria ser 3cm",
      "affected_elements": ["section_0"]
    }}
  ],
  "action_plan": [
    {{
      "action": "fix_margin",
      "target": "section_0",
      "params": {{"top": 3, "left": 3, "bottom": 2, "right": 2}},
      "description": "Ajustar margens para padrão ABNT",
      "priority": 1
    }}
  ],
  "summary": {{
    "total_issues": 5,
    "critical_issues": 2,
    "compliance_score": 65
  }}
}}
```

Retorne APENAS o JSON, sem explicações adicionais.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Extrair JSON da resposta (remover markdown se houver)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        analysis = json.loads(text)
        return analysis

    except json.JSONDecodeError as e:
        print(f"Erro ao parsear JSON da IA: {e}")
        print(f"Resposta recebida: {response.text}")
        return {
            "error": "Falha ao parsear resposta da IA",
            "raw_response": response.text[:500]
        }
    except Exception as e:
        print(f"Erro na análise estrutural: {e}")
        return {
            "error": str(e)
        }


def classify_paragraph_by_ai(
    paragraph: Dict[str, Any],
    context: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Usa IA para classificar tipo de parágrafo baseado em contexto

    Args:
        paragraph: Parágrafo a ser classificado
        context: Parágrafos anteriores para contexto

    Returns:
        dict: Classificação e confiança
    """
    model = get_model()

    # Preparar contexto simplificado
    context_text = "\n".join([
        f"[{p['index']}] {p['text'][:100]}..."
        for p in context[-3:]  # Últimos 3 parágrafos
    ])

    prompt = f"""
Classifique este parágrafo acadêmico:

PARÁGRAFO ATUAL:
Texto: "{paragraph['text']}"
Estilo: {paragraph['style']['name']}
Fonte: {paragraph['style']['font']['name']} {paragraph['style']['font']['size']}pt
Negrito: {paragraph['style']['font']['bold']}
Alinhamento: {paragraph['style']['alignment']}

CONTEXTO (parágrafos anteriores):
{context_text}

CLASSIFICAÇÃO (escolha UMA):
- title: Título principal do trabalho
- subtitle: Subtítulo ou seção
- body: Corpo de texto normal
- citation: Citação direta
- reference: Referência bibliográfica
- header: Cabeçalho de página
- footer: Rodapé
- abstract: Resumo/Abstract

Retorne um JSON:
{{
  "classification": "body",
  "confidence": 0.9,
  "reasoning": "Explicação breve"
}}
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)
        return result

    except Exception as e:
        return {
            "classification": "unknown",
            "confidence": 0.0,
            "reasoning": f"Erro: {str(e)}"
        }


def detect_style_inconsistencies(complete_vision: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Detecta inconsistências de estilo usando análise inteligente

    Args:
        complete_vision: Visão completa do documento

    Returns:
        list: Lista de inconsistências encontradas
    """
    issues = []
    paragraphs = complete_vision["structure"]["paragraphs"]

    # Filtrar parágrafos de corpo (não-headings)
    body_paragraphs = [
        p for p in paragraphs
        if not p['style']['name'].lower().startswith('heading')
        and not p['style']['name'].lower().startswith('título')
    ]

    if not body_paragraphs:
        return issues

    # 1. Verificar consistência de fontes
    fonts_used = {}
    for para in body_paragraphs:
        for run in para['runs']:
            if run['font']['name']:
                font_key = f"{run['font']['name']}_{run['font']['size']}"
                fonts_used[font_key] = fonts_used.get(font_key, 0) + 1

    if len(fonts_used) > 2:  # Mais de 2 fontes diferentes = inconsistência
        issues.append({
            "type": "inconsistent_fonts",
            "severity": "high",
            "description": f"Múltiplas fontes encontradas: {list(fonts_used.keys())}",
            "recommendation": "Padronizar para Arial 12pt",
            "affected_count": len(body_paragraphs)
        })

    # 2. Verificar alinhamento inconsistente
    alignments = {}
    for para in body_paragraphs:
        alignment = para['style']['alignment']
        alignments[alignment] = alignments.get(alignment, 0) + 1

    if len(alignments) > 1:
        issues.append({
            "type": "inconsistent_alignment",
            "severity": "medium",
            "description": f"Múltiplos alinhamentos: {list(alignments.keys())}",
            "recommendation": "Justificar todo corpo de texto",
            "affected_count": len(body_paragraphs)
        })

    # 3. Verificar espaçamento inconsistente
    spacings = {}
    for para in body_paragraphs:
        spacing = para['style']['spacing']['line_spacing']
        if spacing:
            spacings[spacing] = spacings.get(spacing, 0) + 1

    if len(spacings) > 1:
        issues.append({
            "type": "inconsistent_spacing",
            "severity": "high",
            "description": f"Múltiplos espaçamentos entre linhas: {list(spacings.keys())}",
            "recommendation": "Padronizar para 1.5",
            "affected_count": len(body_paragraphs)
        })

    # 4. Verificar recuo inconsistente
    has_indent = 0
    no_indent = 0

    for para in body_paragraphs:
        indent = para['style']['indent']['first_line']
        if indent and indent > 0:
            has_indent += 1
        else:
            no_indent += 1

    if has_indent > 0 and no_indent > 0:
        issues.append({
            "type": "inconsistent_indent",
            "severity": "medium",
            "description": f"{no_indent} parágrafos sem recuo, {has_indent} com recuo",
            "recommendation": "Adicionar recuo de 1.25cm em todos",
            "affected_count": no_indent
        })

    return issues


def generate_action_plan_from_issues(
    abnt_issues: List[Dict[str, Any]],
    inconsistencies: List[Dict[str, Any]],
    structure: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Gera plano de ação executável baseado nos problemas encontrados

    Args:
        abnt_issues: Problemas ABNT detectados
        inconsistencies: Inconsistências de estilo
        structure: Estrutura do documento

    Returns:
        list: Plano de ação com comandos executáveis
    """
    action_plan = []
    priority = 1

    # 1. Corrigir margens (prioridade máxima)
    sections = structure.get("sections", [])
    if sections:
        margins = sections[0]["margins"]

        needs_margin_fix = (
            margins["top"] != 3.0 or
            margins["left"] != 3.0 or
            margins["bottom"] != 2.0 or
            margins["right"] != 2.0
        )

        if needs_margin_fix:
            action_plan.append({
                "action": "fix_margin",
                "target": "section_0",
                "params": {
                    "top": 3.0,
                    "left": 3.0,
                    "bottom": 2.0,
                    "right": 2.0
                },
                "description": "Ajustar margens para padrão ABNT (3cm topo/esq, 2cm baixo/dir)",
                "priority": priority
            })
            priority += 1

    # 2. Corrigir fontes inconsistentes
    font_issue = next((i for i in inconsistencies if i["type"] == "inconsistent_fonts"), None)
    if font_issue:
        action_plan.append({
            "action": "fix_font",
            "target": "all_body",
            "params": {
                "name": "Arial",
                "size": 12
            },
            "description": "Padronizar fonte para Arial 12pt em todo corpo de texto",
            "priority": priority
        })
        priority += 1

    # 3. Corrigir espaçamento
    spacing_issue = next((i for i in inconsistencies if i["type"] == "inconsistent_spacing"), None)
    if spacing_issue:
        action_plan.append({
            "action": "fix_spacing",
            "target": "all_body",
            "params": {
                "line_spacing": 1.5
            },
            "description": "Padronizar espaçamento entre linhas para 1.5",
            "priority": priority
        })
        priority += 1

    # 4. Corrigir alinhamento
    alignment_issue = next((i for i in inconsistencies if i["type"] == "inconsistent_alignment"), None)
    if alignment_issue:
        action_plan.append({
            "action": "fix_alignment",
            "target": "all_body",
            "params": {
                "alignment": "justify"
            },
            "description": "Justificar todo corpo de texto",
            "priority": priority
        })
        priority += 1

    # 5. Corrigir recuo
    indent_issue = next((i for i in inconsistencies if i["type"] == "inconsistent_indent"), None)
    if indent_issue:
        action_plan.append({
            "action": "fix_indent",
            "target": "all_body",
            "params": {
                "first_line": 1.25
            },
            "description": "Adicionar recuo de 1.25cm na primeira linha de todos os parágrafos",
            "priority": priority
        })
        priority += 1

    return action_plan


def analyze_document_with_ai(complete_vision: Dict[str, Any]) -> Dict[str, Any]:
    """
    Análise completa do documento usando IA + análise programática

    Args:
        complete_vision: Visão completa do documento

    Returns:
        dict: Análise completa com classificações, issues e plano de ação
    """
    # 1. Análise estrutural com IA
    ai_analysis = analyze_document_structure(complete_vision)

    # 2. Detectar inconsistências programaticamente
    inconsistencies = detect_style_inconsistencies(complete_vision)

    # 3. Gerar plano de ação unificado
    abnt_issues = ai_analysis.get("abnt_issues", [])
    action_plan = generate_action_plan_from_issues(
        abnt_issues,
        inconsistencies,
        complete_vision["structure"]
    )

    # 4. Combinar tudo
    complete_analysis = {
        "ai_analysis": ai_analysis,
        "inconsistencies": inconsistencies,
        "action_plan": action_plan,
        "summary": {
            "total_issues": len(abnt_issues) + len(inconsistencies),
            "ai_issues": len(abnt_issues),
            "style_inconsistencies": len(inconsistencies),
            "actions_required": len(action_plan),
            "estimated_fixes": len(action_plan),
            "compliance_score": calculate_compliance_score(
                len(abnt_issues),
                len(inconsistencies)
            )
        }
    }

    return complete_analysis


def calculate_compliance_score(abnt_issues_count: int, inconsistencies_count: int) -> int:
    """
    Calcula score de conformidade ABNT (0-100)

    Args:
        abnt_issues_count: Número de problemas ABNT
        inconsistencies_count: Número de inconsistências

    Returns:
        int: Score de 0 a 100
    """
    total_issues = abnt_issues_count + inconsistencies_count

    if total_issues == 0:
        return 100
    elif total_issues <= 2:
        return 90
    elif total_issues <= 5:
        return 75
    elif total_issues <= 10:
        return 60
    elif total_issues <= 15:
        return 45
    else:
        return 30


def classify_all_paragraphs(
    complete_vision: Dict[str, Any],
    use_ai: bool = False
) -> List[Dict[str, Any]]:
    """
    Classifica todos os parágrafos do documento

    Args:
        complete_vision: Visão completa do documento
        use_ai: Se True, usa IA para cada parágrafo (mais lento)

    Returns:
        list: Parágrafos com classificações
    """
    paragraphs = complete_vision["structure"]["paragraphs"]
    classified = []

    for idx, para in enumerate(paragraphs):
        # Classificação básica por estilo
        style_name = para['style']['name'].lower()

        if 'heading' in style_name or 'título' in style_name:
            classification = "subtitle"
        elif len(para['text']) < 10:
            classification = "other"
        elif para['text'].isupper() and len(para['text']) < 100:
            classification = "title"
        else:
            classification = "body"

        # Se usar IA, obter classificação mais precisa
        if use_ai and idx < 10:  # Apenas primeiros 10 para economizar
            context = paragraphs[max(0, idx-3):idx]
            ai_result = classify_paragraph_by_ai(para, context)
            classification = ai_result.get("classification", classification)

        classified.append({
            "index": idx,
            "text_preview": para['text'][:80] + "..." if len(para['text']) > 80 else para['text'],
            "classification": classification,
            "style": para['style']['name']
        })

    return classified
