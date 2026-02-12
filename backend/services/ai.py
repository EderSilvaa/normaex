import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

# Validação no startup - falha rápido se não configurado
if not API_KEY:
    print("=" * 60)
    print("ERRO CRÍTICO: GEMINI_API_KEY não configurada!")
    print("Configure a variável de ambiente ou crie um arquivo .env")
    print("Exemplo: GEMINI_API_KEY=sua_chave_aqui")
    print("=" * 60)
    # Em produção, descomentar para forçar falha:
    # sys.exit(1)
else:
    genai.configure(api_key=API_KEY)
    print("[OK] Gemini API configurada com sucesso")

def get_model():
    if not API_KEY:
        raise Exception("GEMINI_API_KEY não configurada. Verifique seu arquivo .env")
    return genai.GenerativeModel('gemini-2.5-flash')


def organize_references_ai(text_content: str, format_type: str = "abnt") -> str:
    """
    Receives raw reference text and returns it organized according to the specified norm.
    """
    try:
        model = get_model()
        norm_rules = get_norm_rules(format_type)
        
        prompt = f"""
        Você é um especialista em normas acadêmicas, especificamente {format_type.upper()}.
        Abaixo está uma lista de referências bibliográficas desorganizada.
        
        REGRAS DA NORMA {format_type.upper()}:
        {norm_rules}

        Sua tarefa é:
        1. Identificar cada referência.
        2. Corrigir a formatação de cada uma para o padrão {format_type.upper()}.
        3. Ordená-las conforme a norma (alfabética ou numérica de aparição e.g. Vancouver/IEEE - se não tiver ordem, use alfabética).
        4. Retornar APENAS a lista formatada, separada por quebras de linha, sem introduções ou explicações.

        Texto original:
        {text_content}
        """

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 4096,
            "temperature": 0.3,
        })
        return response.text
    except Exception as e:
        print(f"Erro na IA: {e}")
        return text_content



def detect_write_intent(message: str) -> str:
    """
    Detecta se o usuário quer que a IA escreva um texto.
    Retorna 'write' ou 'chat'.
    """
    try:
        model = get_model()
        prompt = f"""
        Classifique a intenção do usuário em 'write' (escrever texto, gerar conteúdo, criar capítulo) ou 'chat' (pergunta, dúvida, conversa).
        
        Exemplos:
        "Escreva uma introdução sobre IA" -> write
        "Gere um resumo deste texto" -> write
        "Como cito ABNT?" -> chat
        "O que é metodologia?" -> chat
        "Crie um tópico sobre resultados" -> write

        Mensagem: "{message}"
        
        Responda APENAS 'write' ou 'chat'.
        """
        response = model.generate_content(prompt)
        intent = response.text.strip().lower()
        return intent if intent in ['write', 'chat'] else 'chat'
    except:
        return 'chat'


def chat_with_document(
    document_text: str, 
    user_message: str, 
    format_type: str = "abnt",
    knowledge_area: str = "geral",
    work_type: str = "acadêmico",
    history: list = None,
    project_memory: dict = None,
    events: list = None
) -> str:
    """
    Chat contextualizado com o documento.
    Usa RAG se o documento for muito grande (> 30k caracteres).
    """
    try:
        model = get_model()

        # 1. Preparar Histórico
        history_context = ""
        if history:
            recent_history = history[-10:]
            history_text = ""
            for msg in recent_history:
                role = "USUÁRIO" if msg.get('role') == 'user' else "ASSISTENTE"
                history_text += f"{role}: {msg.get('content', '')}\n"
            history_context = f"\n[HISTÓRICO DA CONVERSA]\n{history_text}\n"

        # 2. Memória do Projeto (Rico)
        memory_context = ""
        if project_memory:
            structure = project_memory.get('structure', '')
            saved_refs = project_memory.get('saved_references', [])
            
            memory_lines = [
                f"- Objetivo: {project_memory.get('core_objective', 'Não definido')}",
                f"- Estilo: {project_memory.get('tone_style', 'Formal')}",
                f"- Preferências: {project_memory.get('user_preferences', 'Nenhuma')}"
            ]
            
            if structure:
                memory_lines.append(f"\n[ESTRUTURA DO PROJETO]\n{structure}")
            
            if saved_refs:
                refs_text = "\n".join([f"- {r.get('citation', '')}: {r.get('title', '')}" for r in saved_refs])
                memory_lines.append(f"\n[REFERÊNCIAS SALVAS]\n{refs_text}")
                
            memory_context = "\nMEMÓRIA DO PROJETO:\n" + "\n".join(memory_lines)

        # 3. Eventos Recentes
        events_context = ""
        if events:
            recent_events = events[-5:]
            events_list = "\n".join([f"- {e.get('type')}: {e.get('description')}" for e in recent_events])
            events_context = f"\nEVENTOS RECENTES:\n{events_list}"

        # 4. Lógica de RAG para documentos grandes
        context_to_use = document_text[:50000] # Default safe limit
        use_rag = len(document_text) > 30000
        rag_note = ""

        if use_rag:
            # Verificar se é pedido de resumo (RAG é ruim para resumos globais)
            is_summary_request = any(term in user_message.lower() for term in ["resuma", "resumo", "analise", "visão geral", "do que se trata"])
            
            if not is_summary_request:
                try:
                    from services.rag import rag_service
                    # Chunking (rápido se já estiver em cache)
                    rag_service.chunk_document(document_text)
                    
                    # Recuperar trechos relevantes
                    chunks = rag_service.retrieve(user_message, top_k=5)
                    
                    if chunks:
                        context_to_use = "\n---\n".join(chunks)
                        rag_note = "[Modo RAG: Analisando trechos relevantes do documento]"
                        print(f"[Chat] Usando RAG. Contexto reduzido de {len(document_text)} para {len(context_to_use)} chars.")
                except Exception as e:
                    print(f"[Chat] Falha no RAG, usando texto completo: {e}")

        # Construir o prompt
        norm_rules = get_norm_rules(format_type)
        prompt = f"""Você é um assistente acadêmico especializado em normas {format_type.upper()}.
Mantenha tom formal e acadêmico. {rag_note}

REGRAS ESPECÍFICAS DA NORMA {format_type.upper()}:
{norm_rules}

{memory_context}
{events_context}

CONTEXTO DO DOCUMENTO:
{context_to_use}

{history_context}

[PERGUNTA ATUAL DO USUÁRIO]
{user_message}

Responda de forma útil, direta e em português.
Use as informações de memória e histórico para dar respostas contextualizadas.
"""

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 4096,
            "temperature": 0.6,
        })
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


async def generate_citations_with_real_sources(
    document_context: str,
    instruction: str,
    format_type: str = "abnt",
    knowledge_area: str = "geral",
    num_refs: int = 8
) -> str:
    """
    Gera citações usando papers REAIS buscados em APIs acadêmicas.
    Nunca inventa referências.
    """
    try:
        model = get_model()

        # 1. Extrair keywords de busca do contexto e instrução
        keywords_prompt = f"""Extraia 2-3 termos de busca acadêmica (em inglês, separados por vírgula) baseados no contexto abaixo.
Os termos devem ser relevantes para encontrar papers acadêmicos sobre o tema.

CONTEXTO DO DOCUMENTO: {document_context[:3000]}
INSTRUÇÃO: {instruction}
ÁREA: {knowledge_area}

Responda APENAS com os termos separados por vírgula, sem explicações. Ex: "artificial intelligence education, machine learning higher education"
"""
        keywords_response = model.generate_content(keywords_prompt, generation_config={
            "max_output_tokens": 100,
            "temperature": 0.3,
        })
        search_query = keywords_response.text.strip().strip('"')
        print(f"[Citations] Keywords extraídas: {search_query}")

        # 2. Buscar papers reais
        from services.academic_search import academic_search
        papers = await academic_search.search_all_sources(search_query, limit=num_refs)

        if not papers:
            # Fallback: tentar com query mais simples
            simple_query = knowledge_area.replace("geral", instruction[:50])
            papers = await academic_search.search_all_sources(simple_query, limit=num_refs)

        if not papers:
            return "Não foi possível encontrar referências reais para o tema. Tente refinar o tema ou a área de conhecimento."

        # 3. Formatar com IA usando dados REAIS
        papers_text = academic_search.format_papers_for_prompt(papers)

        norm_rules = get_norm_rules(format_type)
        format_prompt = f"""Formate as referências abaixo no padrão {format_type.upper()}.
        Use APENAS os dados fornecidos. NÃO invente ou altere nenhum dado (autores, anos, títulos, DOIs).
        
        PAPERS REAIS ENCONTRADOS:
        {papers_text}
        
        REGRAS ESPECÍFICAS DA NORMA {format_type.upper()}:
        {norm_rules}
        
        REGRAS GERAIS:
        1. Use EXATAMENTE os nomes dos autores, títulos e anos fornecidos
        2. Formate segundo a norma {format_type.upper()} e as regras acima
        3. Ordene alfabeticamente pelo sobrenome do primeiro autor (ou numérico se a norma exigir)
        4. Mantenha os DOIs como links
        5. NÃO adicione papers que não estão na lista acima
        6. Retorne APENAS as referências formatadas, uma por linha
        
        Formate agora:"""

        format_response = model.generate_content(format_prompt, generation_config={
            "max_output_tokens": 4096,
            "temperature": 0.2,
        })

        result = format_response.text.strip()
        print(f"[Citations] Geradas {len(papers)} referências reais")
        return result

    except Exception as e:
        print(f"[Citations] Erro: {e}")
        return f"Erro ao buscar referências: {str(e)}"


def generate_academic_text(
    document_context: str, 
    instruction: str, 
    section_type: str,
    format_type: str = "abnt",
    knowledge_area: str = "geral",
    work_type: str = "acadêmico",
    history: list = None
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

        # Limites dinâmicos por tipo de seção
        section_token_limits = {
            "introducao": 4096,
            "conclusao": 4096,
            "resumo": 2048,
            "metodologia": 6144,
            "resultados": 8192,
            "desenvolvimento": 16384,
            "referencial": 8192,
            "referencias": 4096,
            "geral": 8192,
        }
        max_tokens = section_token_limits.get(section_type.lower(), 8192)

        # Construir histórico de conversa para evitar repetições
        history_context = ""
        if history:
            recent = history[-10:] if len(history) > 10 else history
            history_text = ""
            for msg in recent:
                role = "USUÁRIO" if msg.get('role') == 'user' else "ASSISTENTE"
                content = msg.get('content', '')
                # Truncar mensagens longas no histórico
                if len(content) > 500:
                    content = content[:500] + "..."
                history_text += f"{role}: {content}\n"
            history_context = f"""
        HISTÓRICO DA CONVERSA (para contexto - NÃO repita textos já gerados):
        {history_text}
        """

        prompt = f"""
        Você é um especialista em escrita acadêmica seguindo normas {format_type.upper()}.
        Área de Conhecimento: {knowledge_area}
        Tipo de Trabalho: {work_type}

        CONTEXTO DO DOCUMENTO DO USUÁRIO:
        {document_context[:20000]}
        {history_context}

        INSTRUÇÃO ATUAL DO USUÁRIO:
        {instruction}

        TIPO DE SEÇÃO: {section_type}

        DIRETRIZES PARA ESTA SEÇÃO:
        {guidelines}

        REGRAS DE FORMATAÇÃO ({format_type.upper()}):
        {norm_rules}
        
        REGRAS ADICIONAIS:
        1. Mantenha coerência com o restante do documento
        2. Adapte o tom para a área de {knowledge_area}
        3. NÃO repita textos já gerados anteriormente na conversa
        4. Gere conteúdo NOVO e diferente do que já foi produzido

        IMPORTANTE:
        - Retorne APENAS o texto gerado, sem explicações ou comentários
        - O texto deve estar pronto para ser inserido no documento
        - Mantenha o mesmo estilo e tom do documento original
        - Foque especificamente no que o usuário pediu AGORA

        Gere o texto solicitado:
        """

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": max_tokens,
            "temperature": 0.7,
        })
        return response.text.strip()
    except Exception as e:
        return f"Erro ao gerar texto: {str(e)}"


def analyze_document_gaps(document_text: str, norm: str = "abnt") -> list[dict]:
    """
    Analisa o documento e sugere melhorias proativas.
    Retorna lista de sugestões: [{type, message, action, section_type}]
    """
    if len(document_text) < 100:
        return []

    try:
        model = get_model()
        prompt = f"""Analise este texto acadêmico ({norm.upper()}) e identifique 3 melhorias críticas.
Foque em estrutura, conteúdo faltando ou pouco desenvolvido.

TEXTO DO DOCUMENTO:
{document_text[:15000]}

Responda APENAS com JSON válido, sem markdown:
[
  {{"type": "missing_section" | "weak_content" | "citation_needed" | "formatting", 
    "message": "Explicação curta do problema", 
    "action": "Ação sugerida curta (ex: 'Expandir Conclusão')", 
    "section_type": "introducao" | "desenvolvimento" | "conclusao" | "referencias"}}
]

Exemplos:
- Conclusão muito curta -> {{"type": "weak_content", "message": "Conclusão muito breve", "action": "Expandir Conclusão", "section_type": "conclusao"}}
- Sem citações -> {{"type": "citation_needed", "message": "Faltam citações no texto", "action": "Adicionar Citações", "section_type": "referencias"}}
"""

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 1024,
            "temperature": 0.2,
        })

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        import json
        suggestions = json.loads(text)
        # Limitar a 3 e validar estrutura
        return [s for s in suggestions if isinstance(s, dict) and "message" in s][:3]

    except Exception as e:
        print(f"[GapAnalysis] Erro: {e}")
        return []


def review_generated_text(
    text: str,
    section_type: str,
    format_type: str = "abnt",
    instruction: str = ""
) -> dict:
    """
    Auto-revisa texto gerado pela IA antes de entregar ao usuário.
    Retorna: {score, issues, corrected_text, was_corrected}
    """
    try:
        model = get_model()
        prompt = f"""Você é um revisor acadêmico rigoroso. Avalie o texto abaixo que foi gerado para a seção "{section_type}" de um trabalho acadêmico seguindo normas {format_type.upper()}.

INSTRUÇÃO ORIGINAL DO USUÁRIO: {instruction}

TEXTO GERADO:
{text[:8000]}

Avalie os seguintes critérios (0-10 cada):
1. Coerência e fluxo lógico
2. Tom acadêmico e formalidade
3. Ausência de repetições
4. Adequação à seção ({section_type})
5. Aderência à norma {format_type.upper()}

Responda APENAS com JSON válido, sem markdown:
{{"score": <média 0-10>, "issues": ["problema1", "problema2"], "corrected_text": "<texto corrigido se score < 7, senão string vazia>"}}

REGRAS:
- Se score >= 7: texto está bom, retorne "corrected_text": ""
- Se score < 7: corrija os problemas e retorne o texto melhorado em "corrected_text"
- "issues" deve listar problemas encontrados (pode ser vazio se score >= 9)
- Seja objetivo nas issues, máximo 3 itens"""

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 8192,
            "temperature": 0.2,
        })
        
        result_text = response.text.strip()
        
        # Limpar markdown se presente
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1]
            result_text = result_text.rsplit("```", 1)[0].strip()

        import json
        result = json.loads(result_text)
        
        score = result.get("score", 10)
        corrected = result.get("corrected_text", "")
        was_corrected = bool(corrected and score < 7)
        
        print(f"[Auto-Review] section={section_type}, score={score}, issues={len(result.get('issues', []))}, corrected={was_corrected}")
        
        return {
            "score": score,
            "issues": result.get("issues", []),
            "corrected_text": corrected if was_corrected else text,
            "was_corrected": was_corrected
        }
    except Exception as e:
        print(f"[Auto-Review] Erro: {e}")
        return {
            "score": -1,
            "issues": [],
            "corrected_text": text,
            "was_corrected": False
        }


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

    # Limites dinâmicos por tipo de seção
    section_token_limits = {
        "introducao": 4096,
        "conclusao": 4096,
        "resumo": 2048,
        "metodologia": 6144,
        "resultados": 8192,
        "desenvolvimento": 16384,
        "referencial": 8192,
        "geral": 8192,
    }
    max_tokens = section_token_limits.get(section_type.lower(), 8192)

    response = model.generate_content(prompt, generation_config={
        "max_output_tokens": max_tokens,
        "temperature": 0.7,
    }, stream=True)

    for chunk in response:
        if chunk.text:
            yield chunk.text


def detect_write_intent_ai(message: str) -> dict:
    """
    Usa IA para detectar se o usuário quer escrever algo e classificar o tipo de seção.
    Retorna dict com is_write_request, section_type, instruction.
    """
    try:
        model = get_model()
        prompt = f"""Classifique a intenção do usuário. Ele está pedindo para GERAR/ESCREVER texto acadêmico para inserir no documento, ou está apenas CONVERSANDO/PERGUNTANDO?

MENSAGEM: "{message}"

Responda APENAS com JSON válido, sem markdown:
{{"is_write": true/false, "section_type": "...", "refined_instruction": "..."}}

Valores de section_type: "introducao", "desenvolvimento", "conclusao", "metodologia", "resultados", "resumo", "referencial", "referencias", "geral"

Exemplos:
- "escreva uma introdução sobre IA" → {{"is_write": true, "section_type": "introducao", "refined_instruction": "Escrever introdução sobre Inteligência Artificial"}}
- "me ajude com as citações" → {{"is_write": true, "section_type": "referencias", "refined_instruction": "Gerar citações e referências bibliográficas"}}
- "preciso de um referencial teórico sobre machine learning" → {{"is_write": true, "section_type": "referencial", "refined_instruction": "Escrever referencial teórico sobre machine learning"}}
- "como formatar as margens na ABNT?" → {{"is_write": false, "section_type": "geral", "refined_instruction": ""}}
- "o que achou do meu texto?" → {{"is_write": false, "section_type": "geral", "refined_instruction": ""}}
- "adicione um parágrafo sobre os riscos" → {{"is_write": true, "section_type": "desenvolvimento", "refined_instruction": "Escrever parágrafo sobre os riscos"}}
- "faz a conclusão pra mim" → {{"is_write": true, "section_type": "conclusao", "refined_instruction": "Escrever a conclusão do trabalho"}}
- "qual a diferença entre citação direta e indireta?" → {{"is_write": false, "section_type": "geral", "refined_instruction": ""}}
- "reescreva esse trecho de forma mais formal" → {{"is_write": true, "section_type": "geral", "refined_instruction": "Reescrever trecho de forma mais formal"}}
- "gere os resultados baseado nos dados" → {{"is_write": true, "section_type": "resultados", "refined_instruction": "Gerar seção de resultados baseado nos dados"}}"""

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 256,
            "temperature": 0.1,
        })
        text = response.text.strip()

        # Limpar markdown se presente
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0].strip()

        import json
        result = json.loads(text)
        print(f"[AI Intent] message='{message[:50]}...' → is_write={result.get('is_write')}, section={result.get('section_type')}")
        return result
    except Exception as e:
        print(f"[AI Intent] Erro: {e}")
        return {
            "is_write": False,
            "section_type": "geral",
            "refined_instruction": message
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

        response = model.generate_content(prompt, generation_config={
            "max_output_tokens": 4096,
            "temperature": 0.7,
        })
        return response.text.strip()
    except Exception as e:
        return f"Erro ao gerar estrutura: {str(e)}"
