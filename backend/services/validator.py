"""
NORMAEX 2.0 - Document Validator
Sistema de validação visual comparando PDFs antes/depois
"""

import fitz  # PyMuPDF
import os
from typing import Dict, Any, List
import statistics


class DocumentValidator:
    """
    Validador de formatação usando análise visual de PDF
    """

    def __init__(self):
        """Inicializa o validador"""
        self.tolerance_cm = 0.3  # Tolerância de 0.3cm para margens
        self.tolerance_pt = 2.0  # Tolerância de 2pt para tamanhos

    def validate_formatting(self, original_pdf: str, formatted_pdf: str) -> Dict[str, Any]:
        """
        Compara dois PDFs e valida mudanças de formatação

        Args:
            original_pdf: Caminho do PDF original
            formatted_pdf: Caminho do PDF formatado

        Returns:
            dict: Resultado da validação completa
        """
        if not os.path.exists(original_pdf):
            raise FileNotFoundError(f"PDF original não encontrado: {original_pdf}")

        if not os.path.exists(formatted_pdf):
            raise FileNotFoundError(f"PDF formatado não encontrado: {formatted_pdf}")

        original = fitz.open(original_pdf)
        formatted = fitz.open(formatted_pdf)

        validation_result = {
            "margins": self.validate_margins(formatted),
            "fonts": self.validate_fonts(formatted),
            "spacing": self.validate_spacing(formatted),
            "alignment": self.validate_alignment(formatted),
            "comparison": self.compare_documents(original, formatted),
            "overall_score": 0
        }

        # Calcular score geral
        scores = []
        if validation_result["margins"]["valid"]:
            scores.append(100)
        else:
            scores.append(validation_result["margins"].get("score", 0))

        if validation_result["fonts"]["valid"]:
            scores.append(100)
        else:
            scores.append(validation_result["fonts"].get("score", 0))

        if validation_result["spacing"]["valid"]:
            scores.append(100)
        else:
            scores.append(validation_result["spacing"].get("score", 0))

        if validation_result["alignment"]["valid"]:
            scores.append(100)
        else:
            scores.append(validation_result["alignment"].get("score", 0))

        validation_result["overall_score"] = round(sum(scores) / len(scores), 1)
        validation_result["overall_valid"] = validation_result["overall_score"] >= 90

        original.close()
        formatted.close()

        return validation_result

    def validate_margins(self, pdf: fitz.Document) -> Dict[str, Any]:
        """
        Valida se margens estão corretas (3cm topo/esq, 2cm baixo/dir)

        Args:
            pdf: Documento PDF a validar

        Returns:
            dict: Resultado da validação de margens
        """
        if len(pdf) == 0:
            return {"valid": False, "reason": "Documento vazio", "score": 0}

        page = pdf[0]
        blocks = page.get_text("dict")["blocks"]

        text_blocks = [b for b in blocks if "lines" in b]
        if not text_blocks:
            return {"valid": False, "reason": "Nenhum texto encontrado", "score": 0}

        # Pegar coordenadas dos blocos de texto
        left_positions = []
        top_positions = []
        right_positions = []
        bottom_positions = []

        page_width = page.rect.width
        page_height = page.rect.height

        for block in text_blocks:
            bbox = block["bbox"]
            left_positions.append(bbox[0])
            top_positions.append(bbox[1])
            right_positions.append(bbox[2])
            bottom_positions.append(bbox[3])

        # Calcular margens em cm (72 points = 1 inch = 2.54 cm)
        left_margin_cm = (min(left_positions) / 72) * 2.54 if left_positions else 0
        top_margin_cm = (min(top_positions) / 72) * 2.54 if top_positions else 0
        right_margin_cm = ((page_width - max(right_positions)) / 72) * 2.54 if right_positions else 0
        bottom_margin_cm = ((page_height - max(bottom_positions)) / 72) * 2.54 if bottom_positions else 0

        # ABNT: 3cm topo/esq, 2cm baixo/dir
        expected = {
            "left": 3.0,
            "top": 3.0,
            "right": 2.0,
            "bottom": 2.0
        }

        measured = {
            "left": round(left_margin_cm, 2),
            "top": round(top_margin_cm, 2),
            "right": round(right_margin_cm, 2),
            "bottom": round(bottom_margin_cm, 2)
        }

        # Validar com tolerância
        valid_left = abs(left_margin_cm - expected["left"]) <= self.tolerance_cm
        valid_top = abs(top_margin_cm - expected["top"]) <= self.tolerance_cm
        valid_right = abs(right_margin_cm - expected["right"]) <= self.tolerance_cm
        valid_bottom = abs(bottom_margin_cm - expected["bottom"]) <= self.tolerance_cm

        all_valid = valid_left and valid_top and valid_right and valid_bottom

        # Calcular score parcial
        deviations = [
            abs(left_margin_cm - expected["left"]),
            abs(top_margin_cm - expected["top"]),
            abs(right_margin_cm - expected["right"]),
            abs(bottom_margin_cm - expected["bottom"])
        ]
        avg_deviation = sum(deviations) / len(deviations)
        score = max(0, 100 - (avg_deviation * 30))  # Penalizar 30 pontos por cm de desvio

        issues = []
        if not valid_left:
            issues.append(f"Margem esquerda: {measured['left']}cm (esperado: {expected['left']}cm)")
        if not valid_top:
            issues.append(f"Margem superior: {measured['top']}cm (esperado: {expected['top']}cm)")
        if not valid_right:
            issues.append(f"Margem direita: {measured['right']}cm (esperado: {expected['right']}cm)")
        if not valid_bottom:
            issues.append(f"Margem inferior: {measured['bottom']}cm (esperado: {expected['bottom']}cm)")

        return {
            "valid": all_valid,
            "measured": measured,
            "expected": expected,
            "tolerance_cm": self.tolerance_cm,
            "issues": issues,
            "score": round(score, 1)
        }

    def validate_fonts(self, pdf: fitz.Document) -> Dict[str, Any]:
        """
        Valida se fontes estão corretas (Arial ou Times 12pt)

        Args:
            pdf: Documento PDF a validar

        Returns:
            dict: Resultado da validação de fontes
        """
        if len(pdf) == 0:
            return {"valid": False, "reason": "Documento vazio", "score": 0}

        fonts_found = {}
        sizes_found = {}
        total_spans = 0

        # Analisar primeiras 3 páginas
        for page_num in range(min(3, len(pdf))):
            page = pdf[page_num]
            blocks = page.get_text("dict")["blocks"]

            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            font = span["font"]
                            size = round(span["size"], 1)

                            fonts_found[font] = fonts_found.get(font, 0) + 1
                            sizes_found[size] = sizes_found.get(size, 0) + 1
                            total_spans += 1

        if total_spans == 0:
            return {"valid": False, "reason": "Nenhum texto encontrado", "score": 0}

        # Fonte mais usada
        main_font = max(fonts_found, key=fonts_found.get) if fonts_found else "Desconhecida"
        main_size = max(sizes_found, key=sizes_found.get) if sizes_found else 0

        # Verificar se Arial ou Times está presente
        has_arial = any("Arial" in font for font in fonts_found.keys())
        has_times = any("Times" in font for font in fonts_found.keys())
        has_correct_font = has_arial or has_times

        # Verificar tamanho 12pt
        has_12pt = abs(main_size - 12.0) <= self.tolerance_pt

        all_valid = has_correct_font and has_12pt

        # Calcular score
        font_score = 50 if has_correct_font else 0
        size_score = 50 if has_12pt else max(0, 50 - abs(main_size - 12.0) * 5)
        score = font_score + size_score

        issues = []
        if not has_correct_font:
            issues.append(f"Fonte principal '{main_font}' não é Arial ou Times New Roman")
        if not has_12pt:
            issues.append(f"Tamanho principal {main_size}pt (esperado: 12pt)")

        return {
            "valid": all_valid,
            "main_font": main_font,
            "main_size": main_size,
            "fonts_found": dict(sorted(fonts_found.items(), key=lambda x: x[1], reverse=True)[:5]),
            "sizes_found": dict(sorted(sizes_found.items(), key=lambda x: x[1], reverse=True)[:5]),
            "expected": {
                "font": "Arial ou Times New Roman",
                "size": 12.0
            },
            "issues": issues,
            "score": round(score, 1)
        }

    def validate_spacing(self, pdf: fitz.Document) -> Dict[str, Any]:
        """
        Valida espaçamento entre linhas (deve ser ~1.5)

        Args:
            pdf: Documento PDF a validar

        Returns:
            dict: Resultado da validação de espaçamento
        """
        if len(pdf) == 0:
            return {"valid": False, "reason": "Documento vazio", "score": 0}

        line_spacings = []

        # Analisar primeira página
        page = pdf[0]
        blocks = page.get_text("dict")["blocks"]

        for block in blocks:
            if "lines" in block:
                lines = block["lines"]
                for i in range(len(lines) - 1):
                    y1 = lines[i]["bbox"][3]  # Bottom da primeira linha
                    y2 = lines[i + 1]["bbox"][1]  # Top da segunda linha

                    # Altura da linha (aproximação)
                    line_height = lines[i]["bbox"][3] - lines[i]["bbox"][1]

                    if line_height > 0:
                        # Calcular espaçamento relativo
                        spacing_ratio = (y2 - y1) / line_height
                        line_spacings.append(spacing_ratio)

        if not line_spacings:
            return {"valid": False, "reason": "Não foi possível medir espaçamento", "score": 0}

        avg_spacing = statistics.mean(line_spacings)
        median_spacing = statistics.median(line_spacings)

        # Espaçamento 1.5 = ~0.5 de gap entre linhas
        expected_ratio = 0.5
        valid = abs(avg_spacing - expected_ratio) <= 0.3

        # Calcular score
        deviation = abs(avg_spacing - expected_ratio)
        score = max(0, 100 - (deviation * 150))  # Penalizar proporcionalmente

        issues = []
        if not valid:
            issues.append(f"Espaçamento médio {round(avg_spacing, 2)} (esperado: ~{expected_ratio})")

        return {
            "valid": valid,
            "avg_spacing_ratio": round(avg_spacing, 3),
            "median_spacing_ratio": round(median_spacing, 3),
            "expected_ratio": expected_ratio,
            "sample_size": len(line_spacings),
            "issues": issues,
            "score": round(score, 1)
        }

    def validate_alignment(self, pdf: fitz.Document) -> Dict[str, Any]:
        """
        Valida alinhamento justificado

        Args:
            pdf: Documento PDF a validar

        Returns:
            dict: Resultado da validação de alinhamento
        """
        if len(pdf) == 0:
            return {"valid": False, "reason": "Documento vazio", "score": 0}

        page = pdf[0]
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
            return {"valid": False, "reason": "Nenhuma linha encontrada", "score": 0}

        # Calcular desvio padrão das margens
        left_std = statistics.stdev(left_margins) if len(left_margins) > 1 else 0
        right_std = statistics.stdev(right_margins) if len(right_margins) > 1 else 0

        # Margens consistentes = texto justificado
        # Tolerância: desvio < 10pt
        valid_left = left_std < 10.0
        valid_right = right_std < 10.0
        all_valid = valid_left and valid_right

        # Calcular score
        score = 100
        if left_std > 10:
            score -= min(40, (left_std - 10) * 2)
        if right_std > 10:
            score -= min(40, (right_std - 10) * 2)
        score = max(0, score)

        issues = []
        if not valid_left:
            issues.append(f"Margem esquerda inconsistente (desvio: {round(left_std, 2)}pt)")
        if not valid_right:
            issues.append(f"Margem direita inconsistente (desvio: {round(right_std, 2)}pt)")

        return {
            "valid": all_valid,
            "left_margin_std": round(left_std, 2),
            "right_margin_std": round(right_std, 2),
            "expected": "Margens consistentes (justificado)",
            "issues": issues,
            "score": round(score, 1)
        }

    def compare_documents(self, original: fitz.Document, formatted: fitz.Document) -> Dict[str, Any]:
        """
        Compara documentos original e formatado

        Args:
            original: PDF original
            formatted: PDF formatado

        Returns:
            dict: Comparação entre os documentos
        """
        return {
            "original_pages": len(original),
            "formatted_pages": len(formatted),
            "pages_changed": len(original) != len(formatted),
            "comparison": "Documentos comparados com sucesso"
        }

    def calculate_std(self, values: List[float]) -> float:
        """
        Calcula desvio padrão

        Args:
            values: Lista de valores

        Returns:
            float: Desvio padrão
        """
        if not values or len(values) < 2:
            return 0.0

        return statistics.stdev(values)


def validate_document_quality(pdf_path: str) -> Dict[str, Any]:
    """
    Valida qualidade de um único documento

    Args:
        pdf_path: Caminho para o PDF

    Returns:
        dict: Resultado da validação
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF não encontrado: {pdf_path}")

    validator = DocumentValidator()
    pdf = fitz.open(pdf_path)

    result = {
        "margins": validator.validate_margins(pdf),
        "fonts": validator.validate_fonts(pdf),
        "spacing": validator.validate_spacing(pdf),
        "alignment": validator.validate_alignment(pdf),
    }

    # Calcular score geral
    scores = [
        result["margins"]["score"],
        result["fonts"]["score"],
        result["spacing"]["score"],
        result["alignment"]["score"]
    ]

    result["overall_score"] = round(sum(scores) / len(scores), 1)
    result["overall_valid"] = result["overall_score"] >= 90

    # Compilar todos os issues com estrutura completa
    all_issues = []
    for category in ["margins", "fonts", "spacing", "alignment"]:
        category_issues = result[category].get("issues", [])
        for issue_text in category_issues:
            # Determinar severidade baseado no score da categoria
            category_score = result[category]["score"]
            if category_score < 50:
                severity = "critical"
            elif category_score < 80:
                severity = "warning"
            else:
                severity = "info"

            all_issues.append({
                "category": category,
                "severity": severity,
                "description": issue_text,
                "score_impact": round(100 - category_score, 1)
            })

    result["total_issues"] = len(all_issues)
    result["all_issues"] = all_issues

    pdf.close()

    return result
