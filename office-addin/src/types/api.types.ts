/**
 * Tipos TypeScript para comunicação com a API do Normaex
 * Espelham os models Pydantic do backend
 */

// ============================================
// ENUMS
// ============================================

export type FormatType = 'abnt' | 'apa' | 'vancouver' | 'ieee' | 'juridico' | 'profissional';

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

export interface PageSetup {
  margins: {
    top_cm: number;
    bottom_cm: number;
    left_cm: number;
    right_cm: number;
  };
  page_size: string;
  orientation: string;
}

export interface DocumentContent {
  paragraphs: ParagraphData[];
  metadata?: Record<string, unknown>;
  format_type?: FormatType;
  full_text?: string;
  page_setup?: PageSetup;
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
  project_id?: string;
  format_type?: FormatType;
  work_type?: string;
  knowledge_area?: string;
}

export interface ContextInfo {
  has_pdf_context: boolean;
  project_name?: string | null;
  pdf_count: number;
  pdf_names: string[];
  total_words: number;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  context_info?: ContextInfo | null;
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

// ============================================
// PROJECTS
// ============================================

export type PDFStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface PDFSummary {
  id: string;
  filename: string;
  status: PDFStatus;
  page_count: number;
  word_count: number;
  upload_date: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  pdfs: PDFSummary[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  pdf_count: number;
  total_words: number;
  created_at: string;
  is_active: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ProjectResponse {
  project: Project;
  message: string;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
  total: number;
}

export interface PDFUploadResponse {
  pdf: PDFSummary;
  message: string;
  project_id: string;
}
