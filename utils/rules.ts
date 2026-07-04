import { CORE_FOUR_TOURNAMENT_ID } from '../constants/coreFour';

const APPROVAL_THRESHOLD = 3;
const APPROVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function coerceDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
        return (value as any).toDate();
    }
    return null;
}

export function isHouseRule(author?: string): boolean {
    return author === 'system';
}

export function isAcceptedRule(approvals?: string[]): boolean {
    return (approvals?.length ?? 0) >= APPROVAL_THRESHOLD;
}

/** True only for user proposals that never reached the vote threshold and are past the window. */
export function isProposalExpired(
    createdAt: any,
    approvalsCount: number,
    nowMs: number = Date.now(),
    author?: string,
): boolean {
    if (isHouseRule(author)) return false;
    if (approvalsCount >= APPROVAL_THRESHOLD) return false;
    const created = coerceDate(createdAt);
    if (!created) return false;
    return nowMs - created.getTime() > APPROVAL_WINDOW_MS;
}

export function shouldExpireProposal(
    createdAt: any,
    approvals?: string[],
    nowMs: number = Date.now(),
    author?: string,
): boolean {
    if (isHouseRule(author)) return false;
    if (isAcceptedRule(approvals)) return false;
    return isProposalExpired(createdAt, approvals?.length ?? 0, nowMs, author);
}

/** House rules and accepted proposals always show; only failed proposals hide. */
export function isVisibleRule(rule: {
    author?: string;
    approvals?: string[];
    status?: string;
}): boolean {
    if (isHouseRule(rule.author)) return true;
    if (isAcceptedRule(rule.approvals)) return true;
    return rule.status !== 'expired';
}

export function computeNextApprovals(rule: { approvals?: string[] }, userId: string): string[] {
    const current = Array.from(new Set(rule.approvals || []));
    const has = current.includes(userId);
    const atOrAboveThreshold = current.length >= APPROVAL_THRESHOLD;

    // Once a rule is accepted (>= threshold), approvals cannot be removed.
    if (atOrAboveThreshold && has) return current;

    // Accepted rules may still be approved by others (adds only, never removes).
    if (atOrAboveThreshold && !has) return [...current, userId];

    // Below threshold, allow toggle behavior.
    return has ? current.filter(a => a !== userId) : [...current, userId];
}

/** Rules without tournamentId are treated as Core Four legacy documents. */
export function resolveRuleTournamentId(rule: { tournamentId?: string | null }): string {
    return rule.tournamentId?.trim() || CORE_FOUR_TOURNAMENT_ID;
}

export function ruleBelongsToTournament(
    rule: { tournamentId?: string | null },
    tournamentId: string,
): boolean {
    return resolveRuleTournamentId(rule) === tournamentId;
}

export function isBulkSeedRule(rule: { seedMethod?: string | null }): boolean {
    return rule.seedMethod === 'bulk';
}

/** Split a bulk-add textarea into non-empty rule lines. */
export function parseBulkRuleLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/** Pre-accept bulk rules using tournament members (at least APPROVAL_THRESHOLD approvals). */
export function buildBulkRuleApprovals(memberIds: string[], authorUid: string): string[] {
    const unique = Array.from(new Set(memberIds.filter(Boolean)));
    const ordered = [authorUid, ...unique.filter(id => id !== authorUid)];
    const deduped = ordered.filter((id, index) => ordered.indexOf(id) === index);
    if (deduped.length >= APPROVAL_THRESHOLD) {
        return deduped.slice(0, APPROVAL_THRESHOLD);
    }
    return deduped;
}

export function getRuleSourceLabel(
    rule: { author?: string; seedMethod?: string | null },
    uidToName: Record<string, string> = {}
): string {
    if (isHouseRule(rule.author)) return 'House rule (pre-agreed)';
    if (isBulkSeedRule(rule)) return 'Group rule (added at setup)';
    if (rule.author) return `Proposed by ${uidToName[rule.author] || rule.author}`;
    return 'Proposed rule';
}

export { APPROVAL_THRESHOLD, APPROVAL_WINDOW_MS };
