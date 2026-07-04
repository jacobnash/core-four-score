/** Web app origin for invite links (override with EXPO_PUBLIC_APP_URL). */
export function getAppBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(/\/$/, '');
    }
    const fromEnv = process.env.EXPO_PUBLIC_APP_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    return 'https://core-four-score.web.app';
}

export function buildTournamentInviteUrl(tournamentId: string): string {
    const id = tournamentId.trim();
    return `${getAppBaseUrl()}/join/${encodeURIComponent(id)}`;
}

/** Safe return paths after login (invite links only). */
export function sanitizePostLoginPath(path: string | null | undefined): string | null {
    if (!path || typeof path !== 'string') return null;
    if (!path.startsWith('/join/')) return null;
    if (path.includes('..') || path.includes('//')) return null;
    return path;
}

export function parseJoinPath(path: string): string | null {
    const match = path.match(/^\/join\/([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
}
