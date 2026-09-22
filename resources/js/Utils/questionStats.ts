import type { QuestionItem } from '@/Components/Writeup/types';

export type QuestionOverallStatus = 'none' | 'open' | 'progress' | 'completed';

export interface QuestionStats {
    total: number;
    solved: number;
    inProgress: number;
    unsolved: number;
    percent: number;
    status: QuestionOverallStatus;
}

/**
 * Hitung progress Question/Objective dari daftar questions (pure, tanpa state).
 * - total 0            → status 'none'
 * - semua solved       → 'completed'
 * - ada solved/berjalan → 'progress'
 * - selain itu         → 'open'
 */
export function questionStats(questions: QuestionItem[]): QuestionStats {
    const solved = questions.filter((q) => q.status === 'solved').length;
    const inProgress = questions.filter((q) => q.status === 'in_progress').length;
    const total = questions.length;

    const percent = total > 0 ? Math.round((solved / total) * 100) : 0;

    const status: QuestionOverallStatus =
        total === 0
            ? 'none'
            : solved === total
              ? 'completed'
              : solved > 0 || inProgress > 0
                ? 'progress'
                : 'open';

    return {
        total,
        solved,
        inProgress,
        unsolved: total - solved - inProgress,
        percent,
        status,
    };
}