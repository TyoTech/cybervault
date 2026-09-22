import { describe, expect, it } from 'vitest';
import { emptyWriteup, QuestionItem, writeupFromRaw } from '@/Components/Writeup/types';
import { questionStats } from '@/Utils/questionStats';

function q(overrides: Partial<QuestionItem> = {}): QuestionItem {
    return {
        id: 'q1',
        order: 1,
        question: 'Soal',
        notes: '',
        status: 'unsolved',
        result: '',
        steps: [],
        evidence: [],
        ...overrides,
    };
}

describe('questionStats', () => {
    it('tanpa question → status none, percent 0', () => {
        const stats = questionStats([]);
        expect(stats).toEqual({
            total: 0,
            solved: 0,
            inProgress: 0,
            unsolved: 0,
            percent: 0,
            status: 'none',
        });
    });

    it('menghitung solved/total dan percent (progress)', () => {
        const stats = questionStats([
            q({ id: '1', status: 'solved' }),
            q({ id: '2', status: 'solved' }),
            q({ id: '3', status: 'unsolved' }),
            q({ id: '4', status: 'in_progress' }),
            q({ id: '5', status: 'unsolved' }),
        ]);

        expect(stats.total).toBe(5);
        expect(stats.solved).toBe(2);
        expect(stats.inProgress).toBe(1);
        expect(stats.unsolved).toBe(2);
        expect(stats.percent).toBe(40);
        expect(stats.status).toBe('progress');
    });

    it('semua solved → completed, percent 100', () => {
        const stats = questionStats([q({ id: '1', status: 'solved' }), q({ id: '2', status: 'solved' })]);
        expect(stats.percent).toBe(100);
        expect(stats.status).toBe('completed');
    });

    it('ada is tapi belum ada yang solved → open', () => {
        const stats = questionStats([q({ status: 'unsolved' }), q({ id: '2', status: 'unsolved' })]);
        expect(stats.status).toBe('open');
        expect(stats.percent).toBe(0);
    });
});

describe('writeupFromRaw questions parsing', () => {
    it('data lama tanpa questions → array kosong (backward compatible)', () => {
        const w = writeupFromRaw({ notes: 'lama' });
        expect(w.questions).toEqual([]);
        expect(w.notes).toBe('lama');
    });

    it('memparsing questions beserta steps/evidence nested', () => {
        const w = writeupFromRaw({
            questions: [
                {
                    question: 'Soal pertama',
                    notes: 'Analisis',
                    status: 'solved',
                    result: 'FLAG{x}',
                    steps: [{ title: 'Scan', type: 'bogus', command: 'nmap -sV' }],
                    evidence: [{ label: 'Bukti', kind: 'lainya', content: 'isi' }],
                },
            ],
        });

        expect(w.questions).toHaveLength(1);
        const item = w.questions[0];
        expect(item.question).toBe('Soal pertama');
        expect(item.status).toBe('solved');
        expect(item.result).toBe('FLAG{x}');
        // id kosong digenerate supaya key React stabil
        expect(item.id).not.toBe('');
        expect(item.steps).toHaveLength(1);
        expect(item.steps[0].type).toBe('test'); // invalid → default
        expect(item.evidence[0].kind).toBe('lainya');
    });

    it('status tidak dikenal → unsolved', () => {
        const w = writeupFromRaw({ questions: [{ question: 'x', status: 'wow' }] });
        expect(w.questions[0].status).toBe('unsolved');
    });

    it('writeup tetap berisi field lama setelah ditambah questions', () => {
        const base = emptyWriteup();
        const w = writeupFromRaw({ ...base, questions: [] });
        expect(w.goal).toEqual(base.goal);
        expect(w.questions).toEqual([]);
    });
});