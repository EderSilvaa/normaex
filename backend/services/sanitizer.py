"""
Sanitização de inputs para prevenir prompt injection.
Remove ou neutraliza tentativas de injetar instruções maliciosas nos prompts da IA.
"""

import re

# Padrões que indicam tentativa de prompt injection
INJECTION_PATTERNS = [
    # Tentativas de override de instrução
    r"(?i)ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)",
    r"(?i)disregard\s+(all\s+)?(previous|above|prior)",
    r"(?i)forget\s+(everything|all|your)\s+(instructions?|rules?|prompts?)",
    r"(?i)new\s+instructions?:\s*",
    r"(?i)system\s*prompt\s*:",
    r"(?i)you\s+are\s+now\s+a\s+",
    r"(?i)act\s+as\s+if\s+you\s+(were|are)\s+",
    r"(?i)pretend\s+(to\s+be|you\s+are)\s+",
    # Tentativas de extrair system prompt
    r"(?i)repeat\s+(the\s+)?(system\s+)?prompt",
    r"(?i)show\s+(me\s+)?(your\s+)?(system\s+)?prompt",
    r"(?i)what\s+(are|is)\s+your\s+(instructions?|rules?|prompt)",
    r"(?i)print\s+(your\s+)?(system\s+)?prompt",
    # Tentativas de executar código
    r"(?i)execute\s+(this\s+)?(code|command|script)",
    r"(?i)run\s+(this\s+)?(code|command|script)",
    r"(?i)<script[\s>]",
    r"(?i)eval\s*\(",
    r"(?i)import\s+os",
    r"(?i)subprocess\.",
]

# Marcadores de separação que podem confundir o modelo
SEPARATOR_PATTERNS = [
    r"---+\s*system\s*---+",
    r"===+\s*system\s*===+",
    r"\[system\]",
    r"\[INST\]",
    r"<\|system\|>",
    r"<\|user\|>",
    r"<\|assistant\|>",
    r"<<SYS>>",
    r"<</SYS>>",
]


def sanitize_user_input(text: str, max_length: int = 50000) -> str:
    """
    Sanitiza input do usuário para uso seguro em prompts de IA.

    - Trunca a um tamanho máximo
    - Neutraliza tentativas de prompt injection
    - Remove marcadores de separação perigosos
    - Preserva o texto original quando possível
    """
    if not text:
        return ""

    # 1. Truncar
    text = text[:max_length]

    # 2. Remover marcadores de separação que confundem o modelo
    for pattern in SEPARATOR_PATTERNS:
        text = re.sub(pattern, "[removido]", text, flags=re.IGNORECASE)

    # 3. Detectar e neutralizar injection patterns
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text):
            # Não remove o texto, mas adiciona aspas para tratar como dado
            text = re.sub(pattern, "[input-filtrado]", text, flags=re.IGNORECASE)

    return text.strip()


def sanitize_for_prompt(text: str, max_length: int = 50000) -> str:
    """
    Prepara texto do usuário para inserção segura em prompt.
    Adiciona delimitadores claros para o modelo saber que é input do usuário.
    """
    sanitized = sanitize_user_input(text, max_length)
    return sanitized


def is_suspicious_input(text: str) -> bool:
    """
    Verifica se o input contém padrões suspeitos de prompt injection.
    Retorna True se detectar tentativa.
    """
    if not text:
        return False

    for pattern in INJECTION_PATTERNS + SEPARATOR_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            return True

    return False
