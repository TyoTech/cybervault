/**
 * Tipe data & helper untuk structured Writeup (Challenge workspace).
 *
 * Bentuk ini MIRROR schema `writeup.json` yang dinormalisasi backend
 * (App\Services\ChallengeWriteupService::normalize).
 */

export type HypothesisStatus = 'hypothesis' | 'verified' | 'rejected';
export type StepType = 'hypothesis' | 'test' | 'fact' | 'result';
export type ExperimentStatus = 'successful' | 'failed' | 'inconclusive';
export type EvidenceKind = 'command' | 'output' | 'request' | 'response' | 'error' | 'log';

export interface GoalSection {
    problem: string;
    objective: string;
    proof: string;
}

export interface EnvironmentSection {
    target: string;
    environment: string;
    host: string;
    application: string;
    os: string;
    tools: string;
    scope: string;
}

export interface HypothesisItem {
    id: string;
    text: string;
    status: HypothesisStatus;
}

export interface StepItem {
    id: string;
    title: string;
    question: string;
    goal: string;
    approach: string;
    command: string;
    output: string;
    result: string;
    interpretation: string;
    type: StepType;
}

export interface ExperimentItem {
    id: string;
    status: ExperimentStatus;
    hypothesis: string;
    approach: string;
    command: string;
    expected: string;
    actual: string;
    error: string;
    whyFailed: string;
    changed: string;
    interpretation: string;
}

export interface EvidenceItem {
    id: string;
    label: string;
    kind: EvidenceKind;
    content: string;
}

export interface TextItem {
    id: string;
    text: string;
}

export interface LessonLearnedSection {
    learned: string;
    patterns: string;
    mistakes: string;
    concepts: string;
    different: string;
    relevance: string;
}

export interface WriteupData {
    goal: GoalSection;
    environment: EnvironmentSection;
    hypotheses: HypothesisItem[];
    steps: StepItem[];
    experiments: ExperimentItem[];
    evidence: EvidenceItem[];
    strategyChanges: TextItem[];
    riskImpact: string;
    recommendations: TextItem[];
    lessonLearned: LessonLearnedSection;
    references: string;
    notes: string;
}

export function uid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function emptyWriteup(): WriteupData {
    return {
        goal: { problem: '', objective: '', proof: '' },
        environment: {
            target: '',
            environment: '',
            host: '',
            application: '',
            os: '',
            tools: '',
            scope: '',
        },
        hypotheses: [],
        steps: [],
        experiments: [],
        evidence: [],
        strategyChanges: [],
        riskImpact: '',
        recommendations: [],
        lessonLearned: {
            learned: '',
            patterns: '',
            mistakes: '',
            concepts: '',
            different: '',
            relevance: '',
        },
        references: '',
        notes: '',
    };
}

/**
 * Bungkus nilai mentah dari Inertia (yang mungkin berisi kunci asing / null)
 * menjadi WriteupData yang aman untuk editor.
 */
export function writeupFromRaw(raw: unknown): WriteupData {
    const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const str = (v: unknown): string => (typeof v === 'string' ? v : '');

    const nested = (v: unknown): Record<string, unknown> =>
        v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

    const textItems = (v: unknown): TextItem[] =>
        Array.isArray(v)
            ? v
                  .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
                  .map((i) => ({ id: str(i.id) || uid(), text: str(i.text) }))
            : [];

    const items = <T,>(v: unknown, map: (i: Record<string, unknown>) => T | null): T[] =>
        Array.isArray(v)
            ? v
                  .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
                  .map(map)
                  .filter((i): i is T => i !== null)
            : [];

    const goal = nested(source.goal);
    const environment = nested(source.environment);
    const lessonLearned = nested(source.lessonLearned);
    const ll = lessonLearned;

    return {
        goal: {
            problem: str(goal.problem),
            objective: str(goal.objective),
            proof: str(goal.proof),
        },
        environment: {
            target: str(environment.target),
            environment: str(environment.environment),
            host: str(environment.host),
            application: str(environment.application),
            os: str(environment.os),
            tools: str(environment.tools),
            scope: str(environment.scope),
        },
        hypotheses: items<HypothesisItem>(source.hypotheses, (i) => {
            const status = ['verified', 'rejected'].includes(str(i.status)) ? (str(i.status) as HypothesisStatus) : 'hypothesis';
            return { id: str(i.id) || uid(), text: str(i.text), status };
        }),
        steps: items<StepItem>(source.steps, (i) => {
            const type = ['hypothesis', 'fact', 'result'].includes(str(i.type)) ? (str(i.type) as StepType) : 'test';
            return {
                id: str(i.id) || uid(),
                title: str(i.title),
                question: str(i.question),
                goal: str(i.goal),
                approach: str(i.approach),
                command: str(i.command),
                output: str(i.output),
                result: str(i.result),
                interpretation: str(i.interpretation),
                type,
            };
        }),
        experiments: items<ExperimentItem>(source.experiments, (i) => {
            const status = ['successful', 'failed'].includes(str(i.status)) ? (str(i.status) as ExperimentStatus) : 'inconclusive';
            return {
                id: str(i.id) || uid(),
                status,
                hypothesis: str(i.hypothesis),
                approach: str(i.approach),
                command: str(i.command),
                expected: str(i.expected),
                actual: str(i.actual),
                error: str(i.error),
                whyFailed: str(i.whyFailed),
                changed: str(i.changed),
                interpretation: str(i.interpretation),
            };
        }),
        evidence: items<EvidenceItem>(source.evidence, (i) => {
            const kind = ['command', 'output', 'request', 'response', 'error', 'log'].includes(str(i.kind))
                ? (str(i.kind) as EvidenceKind)
                : 'log';
            return { id: str(i.id) || uid(), label: str(i.label), kind, content: str(i.content) };
        }),
        strategyChanges: textItems(source.strategyChanges),
        riskImpact: str(source.riskImpact),
        recommendations: textItems(source.recommendations),
        lessonLearned: {
            learned: str(ll.learned),
            patterns: str(ll.patterns),
            mistakes: str(ll.mistakes),
            concepts: str(ll.concepts),
            different: str(ll.different),
            relevance: str(ll.relevance),
        },
        references: str(source.references),
        notes: str(source.notes),
    };
}