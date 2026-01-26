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
    description: 'Padrão brasileiro para trabalhos acadêmicos',
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
        'Citações diretas com mais de 3 linhas: recuo de 4cm, fonte 10pt, sem aspas',
        'Espaçamento simples em citações longas, legendas e notas',
        'Títulos de seção primária em negrito e maiúsculas',
        'Folha de rosto obrigatória com natureza do trabalho',
    ],
};

// Configuração APA
export const APA_CONFIG: NormConfig = {
    id: 'apa',
    name: 'APA',
    fullName: 'American Psychological Association',
    description: 'Padrão internacional para Psicologia e Educação',
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
        alignment: 'left',
        margins: { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 },
        firstLineIndent: 1.27,
        quoteLongFormat: { minWords: 40, fontSize: 12, indent: 1.27 },
    },
    referenceOrder: 'alphabetical',
    specificRules: [
        'Cabeçalho com título resumido e número de página',
        'Citações em bloco com mais de 40 palavras: recuo de 0.5" sem aspas',
        'Títulos com 5 níveis de hierarquia bem definidos',
        'Abstract obrigatório em inglês',
        'Espaçamento duplo em todo o documento',
    ],
};

// Configuração Vancouver
export const VANCOUVER_CONFIG: NormConfig = {
    id: 'vancouver',
    name: 'Vancouver',
    fullName: 'International Committee of Medical Journals',
    description: 'Padrão para Medicina e Ciências da Saúde',
    icon: '⚕️',
    areas: ['medicina', 'enfermagem'],
    citationStyle: {
        type: 'numeric',
        format: '(número) ou [número]',
        example: '...conforme estudo anterior (1) ou ...anterior¹',
    },
    formatting: {
        fontName: 'Arial',
        fontSize: 12,
        lineSpacing: 1.5,
        alignment: 'justified',
        margins: { top: 3, bottom: 2, left: 3, right: 2 },
        firstLineIndent: 0,
        quoteLongFormat: { minWords: 40, fontSize: 10, indent: 2.5 },
    },
    referenceOrder: 'appearance',
    specificRules: [
        'Citações numéricas na ordem de aparição no texto',
        'Referências numeradas sequencialmente',
        'Até 6 autores: listar todos. Mais de 6: primeiros 6 + et al.',
        'Abreviações de periódicos conforme Index Medicus',
        'Formato IMRAD recomendado (Introdução, Métodos, Resultados, Discussão)',
    ],
};

// Configuração IEEE
export const IEEE_CONFIG: NormConfig = {
    id: 'ieee',
    name: 'IEEE',
    fullName: 'Institute of Electrical and Electronics Engineers',
    description: 'Padrão para Engenharias e Tecnologia',
    icon: '⚡',
    areas: ['engenharia', 'computacao'],
    citationStyle: {
        type: 'numeric',
        format: '[número]',
        example: '...como demonstrado em [1], [2]...',
    },
    formatting: {
        fontName: 'Times New Roman',
        fontSize: 10,
        lineSpacing: 1.0,
        alignment: 'justified',
        margins: { top: 2.54, bottom: 2.54, left: 1.75, right: 1.75 },
        firstLineIndent: 0.5,
        quoteLongFormat: { minWords: 40, fontSize: 9, indent: 1 },
    },
    referenceOrder: 'appearance',
    specificRules: [
        'Citações numéricas entre colchetes [1]',
        'Referências na ordem de aparição',
        'Formato de duas colunas comum em artigos',
        'Títulos de seção em números romanos',
        'Equações numeradas à direita',
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
