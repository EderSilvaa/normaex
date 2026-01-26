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


def chat_with_document(
    document_text: str, 
    user_message: str,
    format_type: str = "abnt",
    knowledge_area: str = "geral",
    work_type: str = "acadêmico"
) -> str:
    try:
        model = get_model()
        # Aumentado limite para 150.000 caracteres (~50-60 páginas de documento acadêmico)
        prompt = f"""
        Você é um assistente acadêmico especializado em normas {format_type.upper()} e escrita científica.
        Área: {knowledge_area}
        Tipo: {work_type}
        
        O usuário enviou um documento (TCC/Artigo). Use o conteúdo abaixo como contexto para responder.

        CONTEXTO DO DOCUMENTO:
        {document_text[:150000]}

        PERGUNTA DO USUÁRIO:
        {user_message}

        Responda de forma útil, direta e em português. Use APENAS informações do documento acima.
        Se for sobre formatação, use as regras da norma {format_type.upper()}.
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Erro ao processar mensagem: {str(e)}"


def get_norm_rules(format_type: str) -> str:
    """Retorna regras específicas de escrita para cada norma"""
    rules = {
        "apa": """
        1. Use linguagem objetiva e precisa
        2. Citações: (Sobrenome, Ano) - ex: (Silva, 2024)
        3. Foco em clareza e redução de viés
        4. Evite adjetivos desnecessários
        5. Use voz ativa quando possível
        """,
        "vancouver": """
        1. Linguagem extremamente concisa e técnica
        2. Citações numéricas: [1] ou (1)
        3. Priorize dados e evidências
        4. Estrutura IMRAD (Introdução, Métodos, Resultados, Discussão)
        """,
        "ieee": """
        1. Linguagem técnica e direta
        2. Citações numéricas entre colchetes: [1]
        3. Foco em implementação e resultados
        4. Use terminologia técnica precisa da área
        """,
        "abnt": """
        1. Use linguagem formal, impessoal e objetiva
        2. Parágrafos com no mínimo 3-4 frases
        3. Use conectivos para ligar ideias (Além disso, Portanto...)
        4. Se citar autores, use o formato: Sobrenome (ANO) ou (SOBRENOME, ANO)
        5. Evite gírias, coloquialismos e primeira pessoa do singular
        """
    }
    return rules.get(format_type.lower(), rules["abnt"])

def generate_academic_text(
    document_context: str, 
    instruction: str, 
    section_type: str,
    format_type: str = "abnt",
    knowledge_area: str = "geral",
    work_type: str = "acadêmico"
) -> str:
    """
    Gera texto acadêmico seguindo normas especificadas baseado no contexto do documento.
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
                - Cite autores relevantes quando necessário
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
        norm_rules = get_norm_rules(format_type)

        prompt = f"""
        Você é um especialista em escrita acadêmica seguindo normas {format_type.upper()}.
        Área de Conhecimento: {knowledge_area}
        Tipo de Trabalho: {work_type}

        CONTEXTO DO DOCUMENTO DO USUÁRIO:
        {document_context[:20000]}

        INSTRUÇÃO DO USUÁRIO:
        {instruction}

        TIPO DE SEÇÃO: {section_type}

        DIRETRIZES PARA ESTA SEÇÃO:
        {guidelines}

        REGRAS DE FORMATAÇÃO ({format_type.upper()}):
        {norm_rules}
        
        REGRAS ADICIONAIS:
        1. Mantenha coerência com o restante do documento
        2. Adapte o tom para a área de {knowledge_area}

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


async def generate_academic_text_stream(
    document_context: str, 
    instruction: str, 
    section_type: str,
    format_type: str = "abnt",
    knowledge_area: str = "geral",
    work_type: str = "acadêmico"
):
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
    norm_rules = get_norm_rules(format_type)

    prompt = f"""
    Você é um especialista em escrita acadêmica seguindo normas {format_type.upper()}.
    Área: {knowledge_area}
    Tipo: {work_type}

    CONTEXTO DO DOCUMENTO:
    {document_context[:15000]}

    INSTRUÇÃO: {instruction}

    TIPO DE SEÇÃO: {section_type}

    DIRETRIZES:
    {guidelines}

    REGRAS DE FORMATAÇÃO ({format_type.upper()}):
    {norm_rules}

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

def suggest_structure(theme: str, work_type: str, knowledge_area: str, norm: str) -> str:
    """
    Gera uma sugestão de estrutura (sumário) baseada em projetos da área.
    """
    try:
        model = get_model()
        prompt = f"""
        Atue como um orientador acadêmico sênior na área de {knowledge_area}.
        Seu aluno vai escrever um(a) {work_type} sobre o tema: "{theme}".
        A norma a ser seguida é: {norm.upper()}.

        Com base na estrutura comum de projetos APROVADOS e de EXCELÊNCIA nesta área ({knowledge_area}),
        Sugira uma estrutura de capítulos (Sumário) ideal.

        Considere as particularidades da área:
        - Direito: Foco em legislação, doutrina, jurisprudência.
        - Engenharia: Foco em método, experimento, resultados.
        - Saúde: Estrutura rígida (IMRAD), ética.
        - Humanas: Revisão teórica profunda, contexto histórico.

        Gere a saída no seguinte formato MARCKDOWN limpo:

        # Sugestão de Estrutura para {work_type}
        
        ## 1. Introdução
        - O que abordar: ...
        - Dica: ...

        ## 2. [Nome Sugerido para o Cap 2]
        ...

        (Continue para todos os capítulos necessários)

        ## Dicas Específicas para {knowledge_area}
        - ...
        """

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Erro ao gerar estrutura: {str(e)}"
