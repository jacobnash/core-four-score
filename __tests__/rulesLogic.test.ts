import { APPROVAL_THRESHOLD, APPROVAL_WINDOW_MS, computeNextApprovals, isProposalExpired } from '../utils/rules';

function makeDateAgo(ms: number): Date {
    return new Date(1_700_000_000_000 - ms); // fixed anchor for deterministic tests
}

describe('isProposalExpired', () => {
    test('expires proposals older than window with fewer than threshold approvals', () => {
        const oldDate = makeDateAgo(APPROVAL_WINDOW_MS + 1_000);
        expect(isProposalExpired(oldDate, APPROVAL_THRESHOLD - 1, 1_700_000_000_000)).toBe(true);
    });

    test('keeps proposals older than window when threshold reached', () => {
        const oldDate = makeDateAgo(APPROVAL_WINDOW_MS + 1_000);
        expect(isProposalExpired(oldDate, APPROVAL_THRESHOLD, 1_700_000_000_000)).toBe(false);
    });

    test('keeps proposals within window even if not approved yet', () => {
        const recent = makeDateAgo(APPROVAL_WINDOW_MS - 10_000);
        expect(isProposalExpired(recent, 0, 1_700_000_000_000)).toBe(false);
    });
});

describe('computeNextApprovals', () => {
    const userA = 'user-a';
    const userB = 'user-b';

    test('toggles approvals below threshold', () => {
        const next = computeNextApprovals({ approvals: [userA] }, userA);
        expect(next).toEqual([]);
    });

    test('prevents removing approvals once threshold reached', () => {
        const baseline = Array.from({ length: APPROVAL_THRESHOLD }, (_, i) => `u${i}`);
        const next = computeNextApprovals({ approvals: baseline }, baseline[0]);
        expect(next).toEqual(baseline);
    });

    test('allows adding new approvers after threshold', () => {
        const baseline = Array.from({ length: APPROVAL_THRESHOLD }, (_, i) => `u${i}`);
        const next = computeNextApprovals({ approvals: baseline }, userB);
        expect(next).toEqual([...baseline, userB]);
    });

    test('deduplicates approvals when toggling', () => {
        const next = computeNextApprovals({ approvals: [userA, userA] }, userB);
        expect(next).toEqual([userA, userB]);
    });
});
