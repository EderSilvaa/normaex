/**
 * Tipos TypeScript para comunicação com a API do Normaex
 * Espelham os models Pydantic do backend
 */

// ============================================
// ENUMS
// ============================================

export type FormatType = 'abnt' | 'juridico' | 'profissional';

export type SectionType =
  | 'introducao'
  | 'desenvolvimento'
  | 'metodologia'
  | 'resultados'
  | 'conclusao'
  | 'referencias'
  | 'resumo'
  | 'abstract'
  | 'geral';

export type IssueSeverity = 'error' | 'warning' | 'info';

// ============================================
// DOCUMENT CONTENT
// ============================================

export interface ParagraphData {
  text: string;
  style?: string | null;
  font_name?: string | null;
  font_size?: number | null;
  alignment?: string | null;
  line_spacing?: number | null;
  first_line_indent?: number | null;
  is_bold?: boolean;
  is_italic?: boolean;
}

export interface DocumentContent {
  paragraphs: ParagraphData[];
  metadata?: Record<string, unknown>;
  format_type?: FormatType;
  full_text?: string;
}

export interface SelectionContent {
  text: string;
  start_index?: number;
  end_index?: number;
  paragraph_index?: number;
}

// ============================================
// ANALYSIS
// ============================================

export interface Issue {
  code: string;
  message: string;
  severity: IssueSeverity;
  location?: string | null;
  suggestion?: string | null;
  paragraph_index?: number | null;
  auto_fix?: string | null;
}

export interface AnalysisResponse {
  score: number;
  issues: Issue[];
  suggestions: string[];
  compliance_details: Record<string, unknown>;
  summary: string;
}

// ============================================
// FORMAT
// ============================================

export interface FormatAction {
  action_type: string;
  target: string;
  params: Record<string, unknown>;
}

export interface FormatResponse {
  actions: FormatAction[];
  summary: string;
  estimated_changes: number;
}

// ============================================
// WRITE/GENERATE
// ============================================

export interface WriteRequest {
  instruction: string;
  section_type?: SectionType;
  context?: string;
  format_type?: FormatType;
  max_words?: number;
  tone?: string;
}

export interface WriteChunk {
  text: string;
  is_final: boolean;
  formatting?: Record<string, unknown>;
  error?: string;
}

export interface WriteResponse {
  text: string;
  word_count: number;
  formatting?: Record<string, unknown>;
}

// ============================================
// CHAT
// ============================================

export interface ChatRequest {
  message: string;
  context?: string;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

// ============================================
// IMPROVE
// ============================================

export interface ImproveRequest {
  text: string;
  improvement_type?: string;
  format_type?: FormatType;
}

export interface ImproveResponse {
  improved_text: string;
  changes_summary: string;
  original_word_count: number;
  improved_word_count: number;
}

// ============================================
// HEALTH
// ============================================

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}
