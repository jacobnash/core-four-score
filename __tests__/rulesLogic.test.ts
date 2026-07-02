import {
    APPROVAL_THRESHOLD,
    APPROVAL_WINDOW_MS,
    computeNextApprovals,
    isAcceptedRule,
    isHouseRule,
    isProposalExpired,
    isVisibleRule,
    shouldExpireProposal,
} from '../utils/rules';

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

    test('never expires pre-agreed house rules', () => {
        const oldDate = makeDateAgo(APPROVAL_WINDOW_MS + 1_000);
        expect(isProposalExpired(oldDate, 0, 1_700_000_000_000, 'system')).toBe(false);
    });
});

describe('shouldExpireProposal', () => {
    const oldDate = makeDateAgo(APPROVAL_WINDOW_MS + 1_000);

    test('only expires unapproved user proposals past the window', () => {
        expect(shouldExpireProposal(oldDate, ['u1'], 1_700_000_000_000, 'user-a')).toBe(true);
    });

    test('does not expire house rules', () => {
        expect(shouldExpireProposal(oldDate, [], 1_700_000_000_000, 'system')).toBe(false);
    });

    test('does not expire accepted proposals', () => {
        const accepted = Array.from({ length: APPROVAL_THRESHOLD }, (_, i) => `u${i}`);
        expect(shouldExpireProposal(oldDate, accepted, 1_700_000_000_000, 'user-a')).toBe(false);
    });
});

describe('isVisibleRule', () => {
    test('shows house rules even if status is expired', () => {
        expect(isVisibleRule({ author: 'system', status: 'expired' })).toBe(true);
    });

    test('shows accepted proposals even if status is expired', () => {
        expect(isVisibleRule({
            author: 'user-a',
            approvals: ['u1', 'u2', 'u3'],
            status: 'expired',
        })).toBe(true);
    });

    test('hides expired unapproved proposals', () => {
        expect(isVisibleRule({ author: 'user-a', approvals: ['u1'], status: 'expired' })).toBe(false);
    });

    test('shows pending proposals still in voting window', () => {
        expect(isVisibleRule({ author: 'user-a', approvals: ['u1'], status: undefined })).toBe(true);
    });
});

describe('isHouseRule / isAcceptedRule', () => {
    test('isHouseRule identifies system author', () => {
        expect(isHouseRule('system')).toBe(true);
        expect(isHouseRule('user-a')).toBe(false);
    });

    test('isAcceptedRule requires threshold approvals', () => {
        expect(isAcceptedRule(['a', 'b'])).toBe(false);
        expect(isAcceptedRule(['a', 'b', 'c'])).toBe(true);
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
