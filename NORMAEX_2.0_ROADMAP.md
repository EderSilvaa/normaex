# 🚀 NORMAEX 2.0 - ROADMAP
## De Editor ABNT para Word + IA Completo

---

## 📋 VISÃO GERAL

### Estado Atual (v1.0)
- ✅ Upload de documentos DOCX/PDF
- ✅ Análise de conformidade ABNT
- ✅ Aplicação de formatação básica (margens, fontes, espaçamento)
- ✅ Chat com IA sobre o documento
- ✅ Geração de texto acadêmico
- ✅ Preview live do documento

### Visão Futura (v2.0)
**NORMAEX = Word + IA com compreensão estrutural completa**

Um sistema que:
- 🧠 **Entende** completamente a estrutura do documento
- 👁️ **Enxerga** visualmente o layout (PDF)
- 🤖 **Analisa** inteligentemente com IA
- ⚙️ **Executa** formatações precisas
- ✅ **Valida** resultados visualmente

---

## 🏗️ ARQUITETURA NORMAEX 2.0

```
┌─────────────────┐
│  DOCX Document  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  COMPLETE VISION ENGINE     │
│  - Extract everything       │
│  - Map to JSON structure    │
│  - PyMuPDF for coordinates  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  STRUCTURED JSON            │
│  {                          │
│    paragraphs: [...],       │
│    styles: {...},           │
│    hierarchy: [...],        │
│    layout: {...},           │
│    visual: {...}            │
│  }                          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  AI STRUCTURAL ANALYZER     │
│  - Gemini 2.0 Flash         │
│  - Understands structure    │
│  - Detects issues           │
│  - Generates action plan    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  PYTHON EXECUTOR            │
│  - Apply styles             │
│  - Fix hierarchy            │
│  - Adjust spacing           │
│  - Format precisely         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  VISUAL VALIDATOR           │
│  - Convert to PDF           │
│  - Analyze with PyMuPDF     │
│  - Compare before/after     │
│  - Verify all changes       │
└─────────────────────────────┘
```

---

## 📦 FASE 1: VISÃO COMPLETA DO DOCUMENTO

### Objetivo
Extrair TODA a informação estrutural do documento e mapear para JSON

### Tecnologias
- `python-docx` - Estrutura lógica do DOCX
- `PyMuPDF (fitz)` - Análise visual do PDF
- `docx2pdf` ou `unoconv` - Conversão DOCX → PDF

### Tarefas

#### 1.1 - Extrator Estrutural Completo
**Arquivo**: `backend/services/document_vision.py`

```python
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
import fitz  # PyMuPDF

def extract_complete_structure(docx_path: str) -> dict:
    """
    Extrai TODA a estrutura do documento em JSON
    """
    doc = Document(docx_path)

    structure = {
        "metadata": extract_metadata(doc),
        "sections": extract_sections(doc),
        "paragraphs": extract_paragraphs(doc),
        "styles": extract_all_styles(doc),
        "hierarchy": detect_hierarchy(doc),
        "layout": extract_layout_info(doc),
    }

    return structure

def extract_paragraphs(doc: Document) -> list:
    """
    Extrai cada parágrafo com todos os detalhes
    """
    paragraphs = []

    for idx, para in enumerate(doc.paragraphs):
        para_info = {
            "index": idx,
            "text": para.text,
            "style": {
                "name": para.style.name,
                "font": {
                    "name": para.style.font.name,
                    "size": para.style.font.size.pt if para.style.font.size else None,
                    "bold": para.style.font.bold,
                    "italic": para.style.font.italic,
                },
                "alignment": str(para.alignment),
                "spacing": {
                    "before": para.paragraph_format.space_before,
                    "after": para.paragraph_format.space_after,
                    "line_spacing": para.paragraph_format.line_spacing,
                },
                "indent": {
                    "left": para.paragraph_format.left_indent,
                    "right": para.paragraph_format.right_indent,
                    "first_line": para.paragraph_format.first_line_indent,
                }
            },
            "runs": []
        }

        # Extrair runs (trechos de texto com formatação)
        for run in para.runs:
            run_info = {
                "text": run.text,
                "bold": run.bold,
                "italic": run.italic,
                "underline": run.underline,
                "font_name": run.font.name,
                "font_size": run.font.size.pt if run.font.size else None,
            }
            para_info["runs"].append(run_info)

        paragraphs.append(para_info)

    return paragraphs

def extract_sections(doc: Document) -> list:
    """
    Extrai informações de seções (margens, orientação)
    """
    sections = []

    for idx, section in enumerate(doc.sections):
        section_info = {
            "index": idx,
            "margins": {
                "top": section.top_margin.cm if section.top_margin else None,
                "bottom": section.bottom_margin.cm if section.bottom_margin else None,
                "left": section.left_margin.cm if section.left_margin else None,
                "right": section.right_margin.cm if section.right_margin else None,
            },
            "page_size": {
                "width": section.page_width.cm if section.page_width else None,
                "height": section.page_height.cm if section.page_height else None,
            },
            "orientation": str(section.orientation),
        }
        sections.append(section_info)

    return sections

def detect_hierarchy(doc: Document) -> list:
    """
    Detecta hierarquia do documento (títulos, subtítulos)
    """
    hierarchy = []

    for idx, para in enumerate(doc.paragraphs):
        if para.style.name.startswith('Heading'):
            level = int(para.style.name.replace('Heading ', ''))
            hierarchy.append({
                "paragraph_index": idx,
                "level": level,
                "text": para.text,
                "style": para.style.name
            })

    return hierarchy
```

#### 1.2 - Integração PyMuPDF (Visão Visual)
```python
def extract_visual_layout(pdf_path: str) -> dict:
    """
    Usa PyMuPDF para extrair coordenadas reais e layout visual
    """
    doc = fitz.open(pdf_path)
    visual_data = {
        "pages": [],
        "total_pages": len(doc)
    }

    for page_num in range(len(doc)):
        page = doc[page_num]

        page_data = {
            "page_number": page_num + 1,
            "size": {
                "width": page.rect.width,
                "height": page.rect.height
            },
            "text_blocks": [],
            "images": []
        }

        # Extrair blocos de texto com coordenadas
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" in block:  # Bloco de texto
                for line in block["lines"]:
                    for span in line["spans"]:
                        text_info = {
                            "text": span["text"],
                            "bbox": span["bbox"],  # [x0, y0, x1, y1]
                            "font": span["font"],
                            "size": span["size"],
                            "color": span["color"]
                        }
                        page_data["text_blocks"].append(text_info)

        visual_data["pages"].append(page_data)

    doc.close()
    return visual_data

def merge_docx_and_pdf_data(docx_structure: dict, pdf_visual: dict) -> dict:
    """
    Combina dados estruturais do DOCX com dados visuais do PDF
    """
    complete_vision = {
        "structure": docx_structure,
        "visual": pdf_visual,
        "mapping": map_paragraphs_to_coordinates(
            docx_structure["paragraphs"],
            pdf_visual["pages"]
        )
    }
    return complete_vision
```

#### 1.3 - Endpoint de Visão Completa
**Arquivo**: `backend/routers/document.py`

```python
@router.get("/complete-vision/{filename}")
async def get_complete_vision(filename: str):
    """
    Retorna a visão completa estrutural + visual do documento
    """
    docx_path = f"{UPLOAD_DIR}/{filename}"

    if not os.path.exists(docx_path):
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Converter DOCX para PDF temporário
    pdf_path = docx_path.replace(".docx", "_temp.pdf")
    convert_docx_to_pdf(docx_path, pdf_path)

    # Extrair estrutura completa
    docx_structure = extract_complete_structure(docx_path)
    pdf_visual = extract_visual_layout(pdf_path)

    # Combinar ambos
    complete_vision = merge_docx_and_pdf_data(docx_structure, pdf_visual)

    # Limpar PDF temporário
    os.remove(pdf_path)

    return complete_vision
```

---

## 🤖 FASE 2: IA ESTRUTURAL

### Objetivo
Fazer a IA entender e analisar a estrutura do documento

### Tarefas

#### 2.1 - Prompt Engineering para Estrutura
**Arquivo**: `backend/services/ai_structural.py`

```python
import google.generativeai as genai

def analyze_document_structure(complete_vision: dict) -> dict:
    """
    Envia estrutura completa para IA analisar
    """
    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    prompt = f"""
Você é um especialista em análise estrutural de documentos acadêmicos ABNT.

Analise este documento em formato JSON estrutural:

```json
{json.dumps(complete_vision, indent=2, ensure_ascii=False)}
```

TAREFA:
1. **Classifique cada parágrafo** em:
   - title (título principal)
   - subtitle (subtítulo/seção)
   - body (corpo de texto)
   - citation (citação)
   - reference (referência)
   - header (cabeçalho)
   - footer (rodapé)

2. **Detecte hierarquia**:
   - Identifique níveis de títulos (1, 2, 3...)
   - Verifique consistência de estilos
   - Detecte quebras na hierarquia

3. **Identifique problemas ABNT**:
   - Margens incorretas (deve ser 3cm topo/esq, 2cm baixo/dir)
   - Fonte incorreta (deve ser Arial ou Times 12pt)
   - Espaçamento incorreto (deve ser 1.5 entre linhas)
   - Recuo incorreto (deve ser 1.25cm primeira linha)
   - Alinhamento incorreto (deve ser justificado)

4. **Gere plano de ação**:
   Para cada problema, gere um comando Python executável:
   ```python
   {{
     "action": "fix_margin",
     "target": "section_0",
     "params": {{"top": 3, "left": 3, "bottom": 2, "right": 2}}
   }}
   ```

Retorne no formato JSON:
```json
{{
  "classifications": [...],
  "hierarchy": [...],
  "issues": [...],
  "action_plan": [...]
}}
```
"""

    response = model.generate_content(prompt)
    return json.loads(response.text)
```

#### 2.2 - Sistema de Classificação Inteligente
```python
def classify_paragraph_by_ai(paragraph: dict, context: list) -> str:
    """
    Usa IA para classificar tipo de parágrafo baseado em contexto
    """
    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    prompt = f"""
Classifique este parágrafo acadêmico:

PARÁGRAFO:
Texto: "{paragraph['text']}"
Fonte: {paragraph['style']['font']['name']} {paragraph['style']['font']['size']}pt
Negrito: {paragraph['style']['font']['bold']}
Alinhamento: {paragraph['style']['alignment']}

CONTEXTO (parágrafos anteriores):
{json.dumps(context[-3:], indent=2, ensure_ascii=False)}

CLASSIFICAÇÃO (escolha UMA):
- title: Título principal do trabalho
- subtitle: Subtítulo ou seção
- body: Corpo de texto normal
- citation: Citação direta
- reference: Referência bibliográfica
- header: Cabeçalho de página
- footer: Rodapé

Responda apenas com a classificação.
"""

    response = model.generate_content(prompt)
    return response.text.strip().lower()
```

#### 2.3 - Detecção Inteligente de Inconsistências
```python
def detect_style_inconsistencies(complete_vision: dict) -> list:
    """
    Detecta inconsistências de estilo usando IA
    """
    paragraphs = complete_vision["structure"]["paragraphs"]
    issues = []

    # Agrupar parágrafos por tipo
    body_paragraphs = [p for p in paragraphs if p.get("classification") == "body"]

    # Verificar consistência de fonte
    fonts_used = {}
    for para in body_paragraphs:
        font_key = f"{para['style']['font']['name']}_{para['style']['font']['size']}"
        fonts_used[font_key] = fonts_used.get(font_key, 0) + 1

    if len(fonts_used) > 1:
        issues.append({
            "type": "inconsistent_font",
            "description": f"Múltiplas fontes encontradas: {list(fonts_used.keys())}",
            "severity": "high",
            "affected_paragraphs": [p["index"] for p in body_paragraphs]
        })

    return issues
```

---

## ⚙️ FASE 3: EXECUTOR AVANÇADO

### Objetivo
Executar formatações precisas baseadas no plano da IA

### Tarefas

#### 3.1 - Sistema de Ações Executáveis
**Arquivo**: `backend/services/executor.py`

```python
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

class DocumentExecutor:
    """
    Executa ações de formatação no documento
    """

    def __init__(self, doc_path: str):
        self.doc = Document(doc_path)
        self.actions_log = []

    def execute_action_plan(self, action_plan: list) -> list:
        """
        Executa todas as ações do plano
        """
        results = []

        for action in action_plan:
            try:
                result = self.execute_single_action(action)
                results.append({
                    "action": action,
                    "status": "success",
                    "result": result
                })
            except Exception as e:
                results.append({
                    "action": action,
                    "status": "error",
                    "error": str(e)
                })

        return results

    def execute_single_action(self, action: dict) -> str:
        """
        Executa uma ação individual
        """
        action_type = action["action"]

        if action_type == "fix_margin":
            return self.fix_margin(action["target"], action["params"])

        elif action_type == "fix_font":
            return self.fix_font(action["target"], action["params"])

        elif action_type == "fix_spacing":
            return self.fix_spacing(action["target"], action["params"])

        elif action_type == "fix_alignment":
            return self.fix_alignment(action["target"], action["params"])

        elif action_type == "fix_indent":
            return self.fix_indent(action["target"], action["params"])

        else:
            raise ValueError(f"Ação desconhecida: {action_type}")

    def fix_margin(self, target: str, params: dict) -> str:
        """
        Corrige margens de uma seção
        """
        section_idx = int(target.split("_")[1])
        section = self.doc.sections[section_idx]

        section.top_margin = Cm(params.get("top", 3))
        section.bottom_margin = Cm(params.get("bottom", 2))
        section.left_margin = Cm(params.get("left", 3))
        section.right_margin = Cm(params.get("right", 2))

        return f"Margens corrigidas na seção {section_idx}"

    def fix_font(self, target: str, params: dict) -> str:
        """
        Corrige fonte de parágrafos
        """
        if target == "all_body":
            count = 0
            for para in self.doc.paragraphs:
                if not para.style.name.startswith("Heading"):
                    for run in para.runs:
                        run.font.name = params.get("name", "Arial")
                        run.font.size = Pt(params.get("size", 12))
                    count += 1
            return f"{count} parágrafos corrigidos"

        else:
            para_idx = int(target.split("_")[1])
            para = self.doc.paragraphs[para_idx]
            for run in para.runs:
                run.font.name = params.get("name", "Arial")
                run.font.size = Pt(params.get("size", 12))
            return f"Fonte corrigida no parágrafo {para_idx}"

    def fix_spacing(self, target: str, params: dict) -> str:
        """
        Corrige espaçamento entre linhas
        """
        if target == "all_body":
            count = 0
            for para in self.doc.paragraphs:
                if not para.style.name.startswith("Heading"):
                    para.paragraph_format.line_spacing = params.get("line_spacing", 1.5)
                    count += 1
            return f"Espaçamento corrigido em {count} parágrafos"

        else:
            para_idx = int(target.split("_")[1])
            para = self.doc.paragraphs[para_idx]
            para.paragraph_format.line_spacing = params.get("line_spacing", 1.5)
            return f"Espaçamento corrigido no parágrafo {para_idx}"

    def fix_alignment(self, target: str, params: dict) -> str:
        """
        Corrige alinhamento
        """
        alignment_map = {
            "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
            "left": WD_ALIGN_PARAGRAPH.LEFT,
            "center": WD_ALIGN_PARAGRAPH.CENTER,
            "right": WD_ALIGN_PARAGRAPH.RIGHT,
        }

        if target == "all_body":
            count = 0
            for para in self.doc.paragraphs:
                if not para.style.name.startswith("Heading"):
                    para.alignment = alignment_map[params.get("alignment", "justify")]
                    count += 1
            return f"Alinhamento corrigido em {count} parágrafos"

        else:
            para_idx = int(target.split("_")[1])
            para = self.doc.paragraphs[para_idx]
            para.alignment = alignment_map[params.get("alignment", "justify")]
            return f"Alinhamento corrigido no parágrafo {para_idx}"

    def fix_indent(self, target: str, params: dict) -> str:
        """
        Corrige recuo da primeira linha
        """
        if target == "all_body":
            count = 0
            for para in self.doc.paragraphs:
                if not para.style.name.startswith("Heading"):
                    para.paragraph_format.first_line_indent = Cm(params.get("first_line", 1.25))
                    count += 1
            return f"Recuo corrigido em {count} parágrafos"

        else:
            para_idx = int(target.split("_")[1])
            para = self.doc.paragraphs[para_idx]
            para.paragraph_format.first_line_indent = Cm(params.get("first_line", 1.25))
            return f"Recuo corrigido no parágrafo {para_idx}"

    def save(self, output_path: str):
        """
        Salva documento modificado
        """
        self.doc.save(output_path)
```

#### 3.2 - Endpoint de Execução Inteligente
```python
@router.post("/smart-format")
async def smart_format(request: ApplyRequest):
    """
    Aplica formatação usando IA + Executor
    """
    file_path = f"{UPLOAD_DIR}/{request.filename}"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    # 1. Obter visão completa
    complete_vision = extract_complete_structure(file_path)

    # 2. IA analisa e gera plano
    analysis = analyze_document_structure(complete_vision)
    action_plan = analysis["action_plan"]

    # 3. Executor aplica plano
    executor = DocumentExecutor(file_path)
    results = executor.execute_action_plan(action_plan)

    # 4. Salvar documento
    output_path = f"{PROCESSED_DIR}/smart_formatted_{request.filename}"
    executor.save(output_path)

    return {
        "success": True,
        "analysis": analysis,
        "execution_results": results,
        "output_filename": f"smart_formatted_{request.filename}"
    }
```

---

## ✅ FASE 4: VALIDAÇÃO VISUAL

### Objetivo
Validar resultados comparando PDFs antes/depois

### Tarefas

#### 4.1 - Sistema de Validação PDF
**Arquivo**: `backend/services/validator.py`

```python
import fitz  # PyMuPDF

class DocumentValidator:
    """
    Valida formatação usando análise visual de PDF
    """

    def validate_formatting(self, original_pdf: str, formatted_pdf: str) -> dict:
        """
        Compara dois PDFs e valida mudanças
        """
        original = fitz.open(original_pdf)
        formatted = fitz.open(formatted_pdf)

        validation_result = {
            "margins": self.validate_margins(original, formatted),
            "fonts": self.validate_fonts(original, formatted),
            "spacing": self.validate_spacing(original, formatted),
            "alignment": self.validate_alignment(original, formatted),
            "overall": "pending"
        }

        # Calcular resultado geral
        all_valid = all([
            validation_result["margins"]["valid"],
            validation_result["fonts"]["valid"],
            validation_result["spacing"]["valid"],
            validation_result["alignment"]["valid"]
        ])

        validation_result["overall"] = "valid" if all_valid else "invalid"

        original.close()
        formatted.close()

        return validation_result

    def validate_margins(self, original: fitz.Document, formatted: fitz.Document) -> dict:
        """
        Valida se margens foram aplicadas corretamente
        """
        # Pegar primeira página do documento formatado
        page = formatted[0]

        # Pegar primeiro bloco de texto
        blocks = page.get_text("dict")["blocks"]
        if not blocks:
            return {"valid": False, "reason": "Nenhum texto encontrado"}

        text_blocks = [b for b in blocks if "lines" in b]
        if not text_blocks:
            return {"valid": False, "reason": "Nenhum bloco de texto encontrado"}

        first_block = text_blocks[0]
        bbox = first_block["bbox"]  # [x0, y0, x1, y1]

        # Calcular margens em cm (72 points = 1 inch = 2.54 cm)
        left_margin_cm = (bbox[0] / 72) * 2.54
        top_margin_cm = (bbox[1] / 72) * 2.54

        # Validar (tolerância de 0.2cm)
        valid_left = abs(left_margin_cm - 3.0) < 0.2
        valid_top = abs(top_margin_cm - 3.0) < 0.2

        return {
            "valid": valid_left and valid_top,
            "measured": {
                "left": round(left_margin_cm, 2),
                "top": round(top_margin_cm, 2)
            },
            "expected": {
                "left": 3.0,
                "top": 3.0
            }
        }

    def validate_fonts(self, original: fitz.Document, formatted: fitz.Document) -> dict:
        """
        Valida se fontes foram aplicadas corretamente
        """
        page = formatted[0]
        blocks = page.get_text("dict")["blocks"]

        fonts_found = set()
        sizes_found = set()

        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        fonts_found.add(span["font"])
                        sizes_found.add(round(span["size"], 1))

        # Verificar se Arial está presente e 12pt
        has_arial = any("Arial" in font for font in fonts_found)
        has_12pt = 12.0 in sizes_found

        return {
            "valid": has_arial and has_12pt,
            "fonts_found": list(fonts_found),
            "sizes_found": list(sizes_found),
            "expected": {
                "font": "Arial",
                "size": 12.0
            }
        }

    def validate_spacing(self, original: fitz.Document, formatted: fitz.Document) -> dict:
        """
        Valida espaçamento entre linhas
        """
        page = formatted[0]
        blocks = page.get_text("dict")["blocks"]

        line_spacings = []

        for block in blocks:
            if "lines" in block:
                lines = block["lines"]
                for i in range(len(lines) - 1):
                    y1 = lines[i]["bbox"][3]  # Bottom of first line
                    y2 = lines[i + 1]["bbox"][1]  # Top of second line
                    spacing = y2 - y1
                    line_spacings.append(spacing)

        if not line_spacings:
            return {"valid": False, "reason": "Não foi possível medir espaçamento"}

        avg_spacing = sum(line_spacings) / len(line_spacings)

        # Espaçamento 1.5 em 12pt = aproximadamente 18 points
        expected_spacing = 18.0
        valid = abs(avg_spacing - expected_spacing) < 3.0

        return {
            "valid": valid,
            "measured": round(avg_spacing, 2),
            "expected": expected_spacing
        }

    def validate_alignment(self, original: fitz.Document, formatted: fitz.Document) -> dict:
        """
        Valida alinhamento justificado
        """
        page = formatted[0]
        page_width = page.rect.width
        blocks = page.get_text("dict")["blocks"]

        left_margins = []
        right_margins = []

        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    bbox = line["bbox"]
                    left_margins.append(bbox[0])
                    right_margins.append(page_width - bbox[2])

        if not left_margins:
            return {"valid": False, "reason": "Nenhuma linha encontrada"}

        # Verificar consistência de margens (justificado)
        left_std = self.calculate_std(left_margins)
        right_std = self.calculate_std(right_margins)

        # Se margens são consistentes, texto está justificado
        valid = left_std < 5.0 and right_std < 5.0

        return {
            "valid": valid,
            "left_margin_std": round(left_std, 2),
            "right_margin_std": round(right_std, 2)
        }

    def calculate_std(self, values: list) -> float:
        """
        Calcula desvio padrão
        """
        if not values:
            return 0.0

        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5
```

#### 4.2 - Endpoint de Validação
```python
@router.post("/validate")
async def validate_formatting(request: ApplyRequest):
    """
    Valida formatação comparando PDFs
    """
    original_docx = f"{UPLOAD_DIR}/{request.filename}"
    formatted_docx = f"{PROCESSED_DIR}/smart_formatted_{request.filename}"

    if not os.path.exists(formatted_docx):
        raise HTTPException(status_code=404, detail="Documento formatado não encontrado")

    # Converter ambos para PDF
    original_pdf = original_docx.replace(".docx", "_original.pdf")
    formatted_pdf = formatted_docx.replace(".docx", "_formatted.pdf")

    convert_docx_to_pdf(original_docx, original_pdf)
    convert_docx_to_pdf(formatted_docx, formatted_pdf)

    # Validar
    validator = DocumentValidator()
    validation_result = validator.validate_formatting(original_pdf, formatted_pdf)

    # Limpar PDFs temporários
    os.remove(original_pdf)
    os.remove(formatted_pdf)

    return validation_result
```

---

## ✍️ FASE 5: ESCRITA INTELIGENTE

### Objetivo
IA que escreve e formata ao mesmo tempo

### Tarefas

#### 5.1 - Escritor Estrutural
**Arquivo**: `backend/services/ai_writer.py`

```python
def write_with_structure(
    document_context: str,
    instruction: str,
    section_type: str,
    document_structure: dict
) -> dict:
    """
    IA escreve texto já formatado estruturalmente
    """
    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    prompt = f"""
Você é um escritor acadêmico especialista em ABNT.

CONTEXTO DO DOCUMENTO:
```json
{json.dumps(document_structure, indent=2, ensure_ascii=False)}
```

INSTRUÇÃO DO USUÁRIO:
{instruction}

TIPO DE SEÇÃO: {section_type}

TAREFA:
Escreva o texto solicitado E especifique a formatação estrutural.

Retorne no formato JSON:
```json
{{
  "content": "O texto escrito aqui...",
  "structure": {{
    "type": "body",  // ou "subtitle", "title", etc.
    "formatting": {{
      "font": "Arial",
      "size": 12,
      "bold": false,
      "italic": false,
      "alignment": "justify",
      "spacing": 1.5,
      "indent": 1.25
    }},
    "insertion_point": "after_paragraph_15",
    "action_plan": [
      {{
        "action": "insert_paragraph",
        "params": {{
          "text": "...",
          "position": "after_paragraph_15",
          "style": "Normal"
        }}
      }}
    ]
  }}
}}
```
"""

    response = model.generate_content(prompt)
    result = json.loads(response.text)

    return result

def execute_write_with_structure(
    doc_path: str,
    output_path: str,
    write_result: dict
) -> str:
    """
    Executa a escrita estruturada no documento
    """
    doc = Document(doc_path)
    action_plan = write_result["structure"]["action_plan"]

    executor = DocumentExecutor(doc_path)

    for action in action_plan:
        if action["action"] == "insert_paragraph":
            # Inserir parágrafo na posição correta
            position = action["params"]["position"]
            text = action["params"]["text"]
            style = action["params"]["style"]

            # Lógica de inserção
            para_idx = int(position.split("_")[1])

            # Inserir novo parágrafo
            new_para = doc.add_paragraph(text, style=style)

            # Aplicar formatação
            formatting = write_result["structure"]["formatting"]
            for run in new_para.runs:
                run.font.name = formatting["font"]
                run.font.size = Pt(formatting["size"])
                run.bold = formatting["bold"]
                run.italic = formatting["italic"]

            new_para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY if formatting["alignment"] == "justify" else WD_ALIGN_PARAGRAPH.LEFT
            new_para.paragraph_format.line_spacing = formatting["spacing"]
            new_para.paragraph_format.first_line_indent = Cm(formatting["indent"])

    doc.save(output_path)
    return f"Texto inserido com sucesso"
```

#### 5.2 - Endpoint de Escrita Inteligente
```python
@router.post("/intelligent-write")
async def intelligent_write(request: WriteRequest):
    """
    Escreve texto com formatação estrutural automática
    """
    file_path = f"{UPLOAD_DIR}/{request.filename}"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Obter estrutura do documento
    document_structure = extract_complete_structure(file_path)
    document_context = extract_text_from_docx(file_path)

    # IA escreve com estrutura
    write_result = write_with_structure(
        document_context=document_context,
        instruction=request.instruction,
        section_type=request.section_type,
        document_structure=document_structure
    )

    # Executar escrita estruturada
    output_path = f"{PROCESSED_DIR}/intelligent_edited_{request.filename}"
    execute_write_with_structure(file_path, output_path, write_result)

    return {
        "success": True,
        "generated_content": write_result["content"],
        "structure_applied": write_result["structure"],
        "output_filename": f"intelligent_edited_{request.filename}"
    }
```

---

## 📦 DEPENDÊNCIAS NECESSÁRIAS

### Backend (Python)
```bash
# Já instaladas
fastapi
uvicorn
python-docx
google-generativeai
pdf2docx
mammoth

# NOVAS para v2.0
pip install PyMuPDF  # Para análise visual de PDF
pip install docx2pdf  # Conversão DOCX -> PDF (Windows)
# OU
pip install unoconv  # Conversão DOCX -> PDF (Linux/Mac)
```

### Frontend (Next.js)
```bash
# Já instaladas
docx-preview
axios
lucide-react

# Nenhuma nova dependência necessária para v2.0
```

---

## 📅 CRONOGRAMA SUGERIDO

### Sprint 1 (1-2 semanas) - FASE 1
- [ ] Implementar `document_vision.py`
- [ ] Integrar PyMuPDF
- [ ] Criar endpoint `/complete-vision`
- [ ] Testar extração completa com documentos reais

### Sprint 2 (1-2 semanas) - FASE 2
- [ ] Implementar `ai_structural.py`
- [ ] Criar sistema de classificação de parágrafos
- [ ] Implementar detecção de inconsistências
- [ ] Ajustar prompts da IA

### Sprint 3 (1-2 semanas) - FASE 3
- [ ] Implementar `executor.py`
- [ ] Criar sistema de ações executáveis
- [ ] Endpoint `/smart-format`
- [ ] Testar execução de planos complexos

### Sprint 4 (1 semana) - FASE 4
- [ ] Implementar `validator.py`
- [ ] Sistema de comparação PDF
- [ ] Endpoint `/validate`
- [ ] Dashboard de validação no frontend

### Sprint 5 (1-2 semanas) - FASE 5
- [ ] Implementar `ai_writer.py`
- [ ] Escrita com formatação estrutural
- [ ] Endpoint `/intelligent-write`
- [ ] Interface de escrita no frontend

### Sprint 6 (1 semana) - INTEGRAÇÃO FINAL
- [ ] Conectar todos os módulos
- [ ] Testes end-to-end
- [ ] UI/UX polish
- [ ] Deploy

**TOTAL ESTIMADO: 6-9 semanas**

---

## 🎯 CRITÉRIOS DE SUCESSO

### Fase 1 - Visão Completa ✅
- [ ] Sistema extrai 100% da estrutura do DOCX
- [ ] PyMuPDF retorna coordenadas corretas
- [ ] JSON estrutural está completo e navegável

### Fase 2 - IA Estrutural ✅
- [ ] IA classifica parágrafos com 95%+ de acurácia
- [ ] Detecta todos os problemas ABNT
- [ ] Gera planos de ação executáveis

### Fase 3 - Executor ✅
- [ ] Todas as ações são executadas sem erros
- [ ] Documento formatado mantém integridade
- [ ] Log de ações é completo

### Fase 4 - Validação ✅
- [ ] Sistema valida margens com precisão
- [ ] Detecta fontes e tamanhos corretamente
- [ ] Valida espaçamento e alinhamento

### Fase 5 - Escrita Inteligente ✅
- [ ] IA escreve texto formatado corretamente
- [ ] Inserção não quebra estrutura do documento
- [ ] Texto gerado segue ABNT

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **AGORA**: Instalar PyMuPDF
   ```bash
   cd backend
   pip install PyMuPDF
   ```

2. **HOJE**: Criar arquivo `backend/services/document_vision.py`
   - Implementar `extract_complete_structure()`
   - Testar com um documento real

3. **AMANHÃ**: Integrar PyMuPDF
   - Implementar `extract_visual_layout()`
   - Testar conversão DOCX → PDF

4. **ESSA SEMANA**: Endpoint `/complete-vision`
   - Criar endpoint no `document.py`
   - Testar no Postman/Thunder Client
   - Ver JSON estrutural completo

---

## 💡 INSIGHTS IMPORTANTES

### Por que isso vai funcionar?

1. **Visão Completa**: Nunca mais "às cegas" - você vê TUDO do documento
2. **IA Estrutural**: Gemini 2.0 consegue entender JSON complexo perfeitamente
3. **Executor Preciso**: Python-docx + planos da IA = formatação perfeita
4. **Validação Visual**: PyMuPDF garante que mudanças foram aplicadas
5. **Escrita + Formato**: IA escreve já pensando na estrutura

### Diferenciais do Normaex 2.0

- ✨ **Único no mercado**: Nenhuma ferramenta ABNT tem IA estrutural
- 🎯 **Precisão**: Validação visual garante qualidade
- 🧠 **Inteligente**: IA entende contexto, não só aplica regras
- ⚡ **Completo**: Word + IA = sistema all-in-one
- 🔄 **Autovalidação**: Sistema se valida sozinho

---

## 📚 RECURSOS ADICIONAIS

### Documentação
- [python-docx docs](https://python-docx.readthedocs.io/)
- [PyMuPDF docs](https://pymupdf.readthedocs.io/)
- [Gemini API docs](https://ai.google.dev/docs)
- [ABNT NBR 14724](https://www.abnt.org.br/)

### Inspirações
- Overleaf (LaTeX online)
- Grammarly (análise estrutural)
- Notion (AI writing)
- Microsoft Word (formatação)

---

## ✨ VISÃO FINAL

**NORMAEX 2.0 = O PRIMEIRO "WORD + IA" DO MUNDO**

Um sistema que:
- 👁️ **VÊ** o documento completamente
- 🧠 **ENTENDE** a estrutura e contexto
- ⚙️ **EXECUTA** formatações precisas
- ✅ **VALIDA** resultados visualmente
- ✍️ **ESCREVE** texto já formatado

**Resultado**: O TCC perfeito, sem esforço.

---

**Desenvolvido com 💛 para revolucionar a formatação acadêmica**

*Última atualização: 2025-12-03*
