import Badge from '@/Components/UI/Badge';
import { cn } from '@/Utils/cn';
import { EvidenceKind, ExperimentStatus, HypothesisStatus, QuestionStatus, StepType } from '@/Components/Writeup/types';

export type BadgeTone = 'success' | 'warning' | 'info' | 'purple' | 'danger' | 'neutral';

const TONE_CLASS: Record<BadgeTone, string> = {
    success: 'bg-success/10 text-success ring-success/25',
    warning: 'bg-warning/10 text-warning ring-warning/25',
    info: 'bg-accent/10 text-accent ring-accent/25',
    purple: 'bg-purple-500/10 text-purple-700 ring-purple-500/25 dark:text-purple-400',
    danger: 'bg-danger/10 text-danger ring-danger/25',
    neutral: 'bg-faint/10 text-faint ring-faint/25',
};

/** Tone per kategori — FACT ≠ HYPOTHESIS harus terlihat jelas. */
export function stepTypeTone(type: StepType): BadgeTone {
    switch (type) {
        case 'hypothesis':
            return 'warning';
        case 'fact':
            return 'success';
        case 'result':
            return 'purple';
        case 'test':
        default:
            return 'info';
    }
}

export function hypothesisStatusTone(status: HypothesisStatus): BadgeTone {
    switch (status) {
        case 'verified':
            return 'success';
        case 'rejected':
            return 'danger';
        default:
            return 'warning';
    }
}

export function experimentStatusTone(status: ExperimentStatus): BadgeTone {
    switch (status) {
        case 'successful':
            return 'success';
        case 'failed':
            return 'danger';
        default:
            return 'warning';
    }
}

export function evidenceKindTone(kind: EvidenceKind): BadgeTone {
    switch (kind) {
        case 'error':
            return 'danger';
        case 'log':
            return 'neutral';
        case 'output':
            return 'purple';
        case 'command':
        case 'request':
        case 'response':
        default:
            return 'info';
    }
}

export function questionStatusTone(status: QuestionStatus): BadgeTone {
    switch (status) {
        case 'solved':
            return 'success';
        case 'in_progress':
            return 'warning';
        default:
            return 'neutral';
    }
}

const LABEL: Record<string, string> = {
    hypothesis: 'HYPOTHESIS',
    verified: 'VERIFIED',
    rejected: 'REJECTED',
    test: 'TEST',
    fact: 'FACT',
    result: 'RESULT',
    successful: 'SUCCESSFUL',
    failed: 'FAILED',
    inconclusive: 'INCONCLUSIVE',
    command: 'CMD',
    output: 'OUTPUT',
    request: 'REQ',
    response: 'RESP',
    error: 'ERROR',
    log: 'LOG',
    lainya: 'LAINYA',
    unsolved: 'UNSOLVED',
    in_progress: 'IN PROGRESS',
    solved: 'SOLVED',
};

/**
 * Badge tipografi untuk membedakan FACT vs HYPOTHESIS (dan status lain)
 * di seluruh Writeup — dipakai baik di editor maupun view.
 */
export default function StatusBadge({
    value,
    tone = 'neutral',
    className,
}: {
    value: string;
    tone?: BadgeTone;
    className?: string;
}) {
    return (
        <Badge variant="outline" className={cn('uppercase tracking-wide font-mono text-[10px] px-1.5 py-0.5', TONE_CLASS[tone], className)}>
            {LABEL[value] ?? value}
        </Badge>
    );
}