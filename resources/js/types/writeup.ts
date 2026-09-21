export type HypothesisStatus = 'unverified' | 'confirmed' | 'rejected';
export type AttemptStatus = 'successful' | 'failed' | 'inconclusive';
export type EvidenceType = 'command' | 'output' | 'error' | 'request' | 'response' | 'log' | 'note';

export interface Hypothesis {
    text: string;
    status: HypothesisStatus;
}

export interface AnalysisStepContent {
    title: string;
    objective: string;
    approach: string;
    command: string;
    output: string;
    result: string;
    interpretation: string;
}

export interface Attempt {
    hypothesis: string;
    approach: string;
    command: string;
    expected: string;
    actual: string;
    error: string;
    status: AttemptStatus;
    lesson: string;
}

export interface EvidenceBlock {
    type: EvidenceType;
    label: string;
    content: string;
}

export interface LessonLearned {
    learned: string;
    patterns: string;
    mistakes: string;
    revisit: string;
    relevance: string;
}

export interface WriteupContent {
    goal: string;
    scope: string;
    hypotheses: Hypothesis[];
    steps: AnalysisStepContent[];
    attempts: Attempt[];
    evidence: EvidenceBlock[];
    interpretation: string;
    risk_impact: string;
    recommendations: string;
    strategy_changes: string;
    lesson_learned: LessonLearned;
}

export const emptyStep = (): AnalysisStepContent => ({
    title: '', objective: '', approach: '', command: '',
    output: '', result: '', interpretation: '',
});

export const emptyAttempt = (): Attempt => ({
    hypothesis: '', approach: '', command: '', expected: '',
    actual: '', error: '', status: 'inconclusive', lesson: '',
});

export const emptyEvidence = (): EvidenceBlock => ({
    type: 'output', label: '', content: '',
});

export const emptyWriteup = (): WriteupContent => ({
    goal: '',
    scope: '',
    hypotheses: [],
    steps: [emptyStep()],
    attempts: [],
    evidence: [],
    interpretation: '',
    risk_impact: '',
    recommendations: '',
    strategy_changes: '',
    lesson_learned: { learned: '', patterns: '', mistakes: '', revisit: '', relevance: '' },
});

export interface WriteupNote {
    id: string;
    title: string;
    kind: 'note' | 'writeup';
    content_json?: Partial<WriteupContent> | null;
}
