import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)

def get_model():
    if not API_KEY:
        raise Exception("GEMINI_API_KEY not found in environment variables.")
    # Usar gemini-2.5-flash que está disponível e é rápido
    return genai.GenerativeModel('gemini-2.5-flash')


def organize_references_ai(text_content: str) -> str:
    """
    Receives raw reference text and returns it organized according to ABNT.
    """
    try:
        model = get_model()
        prompt = f"""
        Você é um especialista em normas ABNT.
        Abaixo está uma lista de referências bibliográficas desorganizada.
        Sua tarefa é:
        1. Identificar cada referência.
        2. Corrigir a formatação de cada uma para o padrão ABNT (negrito no título, ordem correta autor/ano, etc).
        3. Ordená-las alfabeticamente.
        4. Retornar APENAS a lista formatada, separada por quebras de linha, sem introduções ou explicações.

        Texto original:
        {text_content}
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Erro na IA: {e}")
        return text_content


def chat_with_document(document_text: str, user_message: str) -> str:
    try:
        model = get_model()
        # Aumentado limite para 150.000 caracteres (~50-60 páginas de documento acadêmico)
        prompt = f"""
        Você é um assistente acadêmico especializado em ABNT e escrita científica.
        O usuário enviou um documento (TCC/Artigo). Use o conteúdo abaixo como contexto para responder.

        CONTEXTO DO DOCUMENTO:
        {document_text[:150000]}

        PERGUNTA DO USUÁRIO:
        {user_message}

        Responda de forma útil, direta e em português. Use APENAS informações do documento acima.
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Erro ao processar mensagem: {str(e)}"


def generate_academic_text(document_context: str, instruction: str, section_type: str) -> str:
    """
    Gera texto acadêmico seguindo normas ABNT baseado no contexto do documento.
    """
    try:
        model = get_model()

        section_guidelines = {
            "introducao": """
                - Apresente o tema de forma clara e objetiva
                - Contextualize o problema de pesquisa
                - Apresente os objetivos (geral e específicos)
                - Justifique a relevância do estudo
                - Descreva brevemente a estrutura do trabalho
            """,
            "desenvolvimento": """
                - Desenvolva os argumentos de forma lógica e coesa
                - Use parágrafos bem estruturados (tópico frasal + desenvolvimento + conclusão)
                - Cite autores relevantes quando necessário (use formato: Autor (ANO))
                - Mantenha linguagem formal e impessoal
                - Conecte as ideias com palavras de transição
            """,
            "conclusao": """
                - Retome os objetivos do trabalho
                - Sintetize os principais resultados/argumentos
                - Apresente as contribuições do estudo
                - Sugira trabalhos futuros se pertinente
                - NÃO introduza novas informações
            """,
            "metodologia": """
                - Descreva o tipo de pesquisa (qualitativa, quantitativa, etc.)
                - Explique os procedimentos metodológicos
                - Descreva os instrumentos de coleta de dados
                - Explique como os dados serão analisados
                - Use verbos no passado ou futuro conforme apropriado
            """,
            "referencial": """
                - Apresente os conceitos teóricos principais
                - Cite autores relevantes da área
                - Relacione as teorias com o tema do trabalho
                - Use citações diretas e indiretas adequadamente
                - Mantenha coerência entre os autores citados
            """,
            "geral": """
                - Use linguagem formal e acadêmica
                - Evite primeira pessoa do singular
                - Seja objetivo e claro
                - Use parágrafos bem estruturados
            """
        }

        guidelines = section_guidelines.get(section_type.lower(), section_guidelines["geral"])

        prompt = f"""
        Você é um especialista em escrita acadêmica e normas ABNT.

        CONTEXTO DO DOCUMENTO DO USUÁRIO:
        {document_context[:20000]}

        INSTRUÇÃO DO USUÁRIO:
        {instruction}

        TIPO DE SEÇÃO: {section_type}

        DIRETRIZES PARA ESTA SEÇÃO:
        {guidelines}

        REGRAS OBRIGATÓRIAS (ABNT):
        1. Use linguagem formal, impessoal e objetiva
        2. Parágrafos com no mínimo 3-4 frases
        3. Use conectivos para ligar ideias (Além disso, Portanto, Contudo, Nesse sentido...)
        4. Se citar autores, use o formato: Sobrenome (ANO) ou (SOBRENOME, ANO)
        5. Evite gírias, coloquialismos e primeira pessoa do singular
        6. Mantenha coerência com o restante do documento

        IMPORTANTE:
        - Retorne APENAS o texto gerado, sem explicações ou comentários
        - O texto deve estar pronto para ser inserido no documento
        - Mantenha o mesmo estilo e tom do documento original

        Gere o texto solicitado:
        """

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Erro ao gerar texto: {str(e)}"


async def generate_academic_text_stream(document_context: str, instruction: str, section_type: str):
    """
    Gera texto acadêmico com streaming para feedback em tempo real.
    """
    model = get_model()

    section_guidelines = {
        "introducao": """
            - Apresente o tema de forma clara e objetiva
            - Contextualize o problema de pesquisa
            - Apresente os objetivos (geral e específicos)
            - Justifique a relevância do estudo
        """,
        "desenvolvimento": """
            - Desenvolva os argumentos de forma lógica e coesa
            - Use parágrafos bem estruturados
            - Cite autores relevantes quando necessário
            - Mantenha linguagem formal e impessoal
        """,
        "conclusao": """
            - Retome os objetivos do trabalho
            - Sintetize os principais resultados
            - Apresente as contribuições do estudo
            - NÃO introduza novas informações
        """,
        "metodologia": """
            - Descreva o tipo de pesquisa
            - Explique os procedimentos metodológicos
            - Descreva os instrumentos de coleta de dados
        """,
        "referencial": """
            - Apresente os conceitos teóricos principais
            - Cite autores relevantes da área
            - Relacione as teorias com o tema do trabalho
        """,
        "geral": """
            - Use linguagem formal e acadêmica
            - Evite primeira pessoa do singular
            - Seja objetivo e claro
        """
    }

    guidelines = section_guidelines.get(section_type.lower(), section_guidelines["geral"])

    prompt = f"""
    Você é um especialista em escrita acadêmica e normas ABNT.

    CONTEXTO DO DOCUMENTO:
    {document_context[:15000]}

    INSTRUÇÃO: {instruction}

    TIPO DE SEÇÃO: {section_type}

    DIRETRIZES:
    {guidelines}

    REGRAS ABNT:
    1. Linguagem formal, impessoal e objetiva
    2. Parágrafos com no mínimo 3-4 frases
    3. Use conectivos (Além disso, Portanto, Contudo...)
    4. Citações: Sobrenome (ANO) ou (SOBRENOME, ANO)
    5. Evite gírias e primeira pessoa

    Retorne APENAS o texto gerado, sem explicações.
    """

    response = model.generate_content(prompt, stream=True)

    for chunk in response:
        if chunk.text:
            yield chunk.text


def detect_write_intent(message: str) -> dict:
    """
    Detecta se o usuário quer escrever algo no documento e extrai informações.
    """
    try:
        model = get_model()
        prompt = f"""
        Analise a mensagem do usuário e determine se ele quer que você ESCREVA/GERE texto para o documento.

        MENSAGEM: {message}

        Responda APENAS em formato JSON válido:
        {{
            "is_write_request": true/false,
            "section_type": "introducao" | "desenvolvimento" | "conclusao" | "metodologia" | "referencial" | "geral",
            "instruction": "o que o usuário quer que seja escrito",
            "position": "inicio" | "fim" | "apos_secao" | "substituir"
        }}

        Exemplos:
        - "escreva uma introdução sobre..." -> is_write_request: true, section_type: "introducao"
        - "adicione um parágrafo sobre..." -> is_write_request: true, section_type: "desenvolvimento"
        - "o que você acha do meu texto?" -> is_write_request: false
        - "reescreva a conclusão" -> is_write_request: true, section_type: "conclusao"

        Retorne APENAS o JSON, sem markdown ou explicações.
        """

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Limpar markdown se presente
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]

        import json
        return json.loads(text)
    except Exception as e:
        return {
            "is_write_request": False,
            "section_type": "geral",
            "instruction": message,
            "position": "fim"
        }
