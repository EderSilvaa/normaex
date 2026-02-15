import type { ChartType } from '../services';

export interface ChartConfig {
    type: ChartType;
    title: string;
    labels: string;
    values: string;
    xLabel: string;
    yLabel: string;
    source: string;
}

export interface ContextInfo {
    has_pdf_context: boolean;
    project_name?: string | null;
    pdf_count: number;
    pdf_names: string[];
    total_words: number;
}

export interface RubricCriterion {
    name: string;
    score: number;
    feedback: string;
}

export interface DetailedReview {
    total_score: number;
    criteria: RubricCriterion[];
    summary: string;
}

export interface ProactiveSuggestion {
    type: string;
    message: string;
    action: string;
    section_type: string;
}

export interface ChatResponseData {
    message: string;
    suggestions?: string[];
    context_info?: ContextInfo | null;
    generated_content?: string | null;
    was_reviewed?: boolean | null;
    review_score?: number | null;
    detailed_review?: DetailedReview | null;
    proactive_suggestions?: ProactiveSuggestion[];
}

export interface ImageAttachment {
    type: 'upload' | 'url';
    data: string; // base64 ou URL
    preview: string; // URL para preview
    caption: string;
    source?: string;
}

export interface AnalysisResultData {
    score: number;
    issues: any[];
    summary: string;
    compliance_details?: any;
    suggestions?: string[];
}

export interface FormatResultData {
    success: boolean;
    actionsApplied: number;
    message: string;
}

export interface ReviewResultData {
    originalText: string;
    correctedText: string;
    explanation: string;
    changes: string[];
    applied?: boolean;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    hasGeneratedText?: boolean;
    generatedContent?: string | null;
    contextInfo?: ContextInfo | null;
    image?: { caption: string; figureNumber?: number };
    wasReviewed?: boolean | null;
    reviewScore?: number | null;
    proactiveSuggestions?: ProactiveSuggestion[];
    analysisResult?: AnalysisResultData;
    formatResult?: FormatResultData;
    reviewResult?: ReviewResultData;
    detailedReview?: DetailedReview | null;
}

export interface SearchResult {
    id: string;
    url: string;
    thumbUrl: string;
    description: string;
    author: string;
}
