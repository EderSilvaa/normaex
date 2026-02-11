/**
 * Configurações de Normas Acadêmicas
 * Define as regras e características de cada norma suportada
 */

export type NormType = 'abnt' | 'apa' | 'vancouver' | 'ieee';

export type WorkType = 'tcc' | 'artigo' | 'dissertacao' | 'tese' | 'relatorio';

export type KnowledgeArea =
    | 'psicologia'
    | 'educacao'
    | 'direito'
    | 'medicina'
    | 'enfermagem'
    | 'engenharia'
    | 'computacao'
    | 'administracao'
    | 'economia'
    | 'ciencias_sociais'
    | 'letras'
    | 'historia'
    | 'outras';

export interface CitationStyle {
    type: 'author-date' | 'numeric';
    format: string;
    example: string;
}

export interface FormattingRules {
    fontName: string;
    fontSize: number;
    lineSpacing: number;
    alignment: 'justified' | 'left' | 'center';
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    firstLineIndent: number;
    quoteLongFormat: {
        minWords: number;
        fontSize: number;
        indent: number;
    };
}

export interface NormConfig {
    id: NormType;
    name: string;
    fullName: string;
    description: string;
    icon: string;
    areas: KnowledgeArea[];
    citationStyle: CitationStyle;
    formatting: FormattingRules;
    referenceOrder: 'alphabetical' | 'appearance';
    specificRules: string[];
}

// Configuração ABNT
export const ABNT_CONFIG: NormConfig = {
    id: 'abnt',
    name: 'ABNT',
    fullName: 'Associação Brasileira de Normas Técnicas',
    description: 'Padrão brasileiro (NBR 14724)',
    icon: '🇧🇷',
    areas: ['direito', 'administracao', 'economia', 'letras', 'historia', 'ciencias_sociais', 'outras'],
    citationStyle: {
        type: 'author-date',
        format: '(SOBRENOME, ano)',
        example: '(SILVA, 2024) ou Silva (2024)',
    },
    formatting: {
        fontName: 'Times New Roman',
        fontSize: 12,
        lineSpacing: 1.5,
        alignment: 'justified',
        margins: { top: 3, bottom: 2, left: 3, right: 2 },
        firstLineIndent: 1.25,
        quoteLongFormat: { minWords: 40, fontSize: 10, indent: 4 },
    },
    referenceOrder: 'alphabetical',
    specificRules: [
        'Citações diretas > 3 linhas: recuo 4cm, fonte 10, simples',
        'Títulos: Negrito, caixa alta para primários',
        'Espaçamento 1.5 no texto, simples em citações/notas',
        'Margens: 3cm sup/esq, 2cm inf/dir',
    ],
};

// Configuração APA (7th Edition)
export const APA_CONFIG: NormConfig = {
    id: 'apa',
    name: 'APA',
    fullName: 'American Psychological Association (7ª Ed.)',
    description: 'Padrão internacional (Psicologia, Educação)',
    icon: '🧠',
    areas: ['psicologia', 'educacao', 'ciencias_sociais'],
    citationStyle: {
        type: 'author-date',
        format: '(Sobrenome, ano)',
        example: '(Silva, 2024) ou Silva (2024)',
    },
    formatting: {
        fontName: 'Times New Roman',
        fontSize: 12,
        lineSpacing: 2.0,
        alignment: 'left', // APA prefere alinhado à esquerda (ragged right)
        margins: { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }, // 1 polegada
        firstLineIndent: 1.27, // 0.5 polegada
        quoteLongFormat: { minWords: 40, fontSize: 12, indent: 1.27 }, // Mantém fonte 12, recuo 0.5"
    },
    referenceOrder: 'alphabetical',
    specificRules: [
        'Espaçamento duplo em todo o documento (inclusive ref.)',
        'Sem justificação (alinhado à esquerda)',
        'Citações longas (>40 palavras): recuo 1.27cm, sem aspas',
        'Cabeçalho: Apenas número da página (Student) ou Running Head (Pro)',
    ],
};

// Configuração Vancouver
export const VANCOUVER_CONFIG: NormConfig = {
    id: 'vancouver',
    name: 'Vancouver',
    fullName: 'Vancouver Style (ICMJE)',
    description: 'Padrão biomédico e saúde',
    icon: '⚕️',
    areas: ['medicina', 'enfermagem'],
    citationStyle: {
        type: 'numeric',
        format: '(1) ou [1] ou sobrescrito¹',
        example: '...conforme estudo (1).',
    },
    formatting: {
        fontName: 'Times New Roman', // Muito comum, embora não estrito
        fontSize: 12,
        lineSpacing: 1.5, // Comum, mas pode variar por journal
        alignment: 'justified',
        margins: { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 },
        firstLineIndent: 0, // Geralmente sem recuo ou recuo padrão
        quoteLongFormat: { minWords: 40, fontSize: 11, indent: 2.5 },
    },
    referenceOrder: 'appearance',
    specificRules: [
        'Citações numéricas sequenciais',
        'Referências listadas por ordem de citação',
        'Títulos de periódicos abreviados (NLM)',
        'Até 6 autores cita todos, >6 et al.',
    ],
};

// Configuração IEEE
export const IEEE_CONFIG: NormConfig = {
    id: 'ieee',
    name: 'IEEE',
    fullName: 'IEEE Style',
    description: 'Engenharias e Computação',
    icon: '⚡',
    areas: ['engenharia', 'computacao'],
    citationStyle: {
        type: 'numeric',
        format: '[1]',
        example: '...como visto em [1].',
    },
    formatting: {
        fontName: 'Times New Roman',
        fontSize: 10, // IEEE usa fonte menor geralmente (duas colunas) ou 12 (draft)
        lineSpacing: 1.0, // Simples
        alignment: 'justified',
        margins: { top: 1.9, bottom: 1.9, left: 1.3, right: 1.3 }, // Margens menores (variável)
        firstLineIndent: 0.5,
        quoteLongFormat: { minWords: 40, fontSize: 9, indent: 1 },
    },
    referenceOrder: 'appearance',
    specificRules: [
        'Citações sempre entre colchetes [1]',
        'Texto geralmente em duas colunas (papers)',
        'Referências numeradas [1] Author...',
        'Títulos de figuras abaixo, tabelas acima',
    ],
};

// Lista de todas as normas
export const ALL_NORMS: NormConfig[] = [
    ABNT_CONFIG,
    APA_CONFIG,
    VANCOUVER_CONFIG,
    IEEE_CONFIG,
];

// Áreas de conhecimento com labels
export const KNOWLEDGE_AREAS: { id: KnowledgeArea; label: string; suggestedNorm: NormType }[] = [
    { id: 'psicologia', label: 'Psicologia', suggestedNorm: 'apa' },
    { id: 'educacao', label: 'Educação', suggestedNorm: 'apa' },
    { id: 'medicina', label: 'Medicina', suggestedNorm: 'vancouver' },
    { id: 'enfermagem', label: 'Enfermagem', suggestedNorm: 'vancouver' },
    { id: 'engenharia', label: 'Engenharias', suggestedNorm: 'ieee' },
    { id: 'computacao', label: 'Computação', suggestedNorm: 'ieee' },
    { id: 'direito', label: 'Direito', suggestedNorm: 'abnt' },
    { id: 'administracao', label: 'Administração', suggestedNorm: 'abnt' },
    { id: 'economia', label: 'Economia', suggestedNorm: 'abnt' },
    { id: 'ciencias_sociais', label: 'Ciências Sociais', suggestedNorm: 'abnt' },
    { id: 'letras', label: 'Letras', suggestedNorm: 'abnt' },
    { id: 'historia', label: 'História', suggestedNorm: 'abnt' },
    { id: 'outras', label: 'Outras', suggestedNorm: 'abnt' },
];

// Tipos de trabalho
export const WORK_TYPES: { id: WorkType; label: string }[] = [
    { id: 'tcc', label: 'TCC / Monografia' },
    { id: 'artigo', label: 'Artigo Científico' },
    { id: 'dissertacao', label: 'Dissertação de Mestrado' },
    { id: 'tese', label: 'Tese de Doutorado' },
    { id: 'relatorio', label: 'Relatório Técnico' },
];

// Helper para obter configuração da norma
export function getNormConfig(normType: NormType): NormConfig {
    return ALL_NORMS.find(n => n.id === normType) || ABNT_CONFIG;
}

// Helper para sugerir norma baseada na área
export function suggestNormForArea(area: KnowledgeArea): NormType {
    const areaConfig = KNOWLEDGE_AREAS.find(a => a.id === area);
    return areaConfig?.suggestedNorm || 'abnt';
}
