import { User } from '../types';

/** Match users by email (exact) or display name (contains). */
export function findUsersForTournamentInvite(
    allUsers: User[],
    query: string,
    excludeMemberIds: string[] = []
): User[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const excluded = new Set(excludeMemberIds);
    const isEmailLike = q.includes('@');

    return allUsers
        .filter(u => !excluded.has(u.uid))
        .filter(u => {
            const email = (u.email || '').toLowerCase();
            const name = (u.displayName || '').toLowerCase();
            if (isEmailLike) return email === q || email.startsWith(q);
            return name.includes(q) || email.includes(q);
        })
        .slice(0, 8);
}

/** Prefer exact email match when adding by typed input. */
export async function resolveInviteLookupUser(
    lookup: (email: string) => Promise<User | null>,
    allUsers: User[],
    query: string,
    excludeMemberIds: string[] = []
): Promise<User | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    if (trimmed.includes('@')) {
        const byEmail = await lookup(trimmed);
        if (byEmail && !excludeMemberIds.includes(byEmail.uid)) return byEmail;
    }

    const matches = findUsersForTournamentInvite(allUsers, trimmed, excludeMemberIds);
    if (matches.length === 1) return matches[0];
    return null;
}
