import { shuffleArray } from './helpers';

export interface TeamSplit {
    team1: string[];
    team2: string[];
}

export function pickMatchupPlayerIds(memberUids: string[]): string[] {
    if (memberUids.length === 0) return [];
    if (memberUids.length <= 4) return shuffleArray([...memberUids]);
    return shuffleArray([...memberUids]).slice(0, 4);
}

export function randomTeamSplit(playerIds: string[]): TeamSplit {
    const shuffled = shuffleArray(playerIds);
    const midpoint = Math.ceil(shuffled.length / 2);
    return {
        team1: shuffled.slice(0, midpoint),
        team2: shuffled.slice(midpoint),
    };
}

/** Build 4–6 random team frames; the last frame is the final deal. */
export function buildSpinSequence(playerIds: string[]): {
    frames: TeamSplit[];
    team1: string[];
    team2: string[];
    spinCount: number;
} {
    const spinCount = 4 + Math.floor(Math.random() * 3);
    const frames = Array.from({ length: spinCount }, () => randomTeamSplit(playerIds));
    const last = frames[frames.length - 1];
    return {
        frames,
        team1: last.team1,
        team2: last.team2,
        spinCount,
    };
}

export function reelNamesFromSplit(
    split: TeamSplit,
    nameMap: Record<string, string>,
    slotCount: number = 4,
): string[] {
    const ordered = [
        ...split.team1,
        ...split.team2,
    ];
    const labels = ordered.map(id => nameMap[id] || '???');
    while (labels.length < slotCount) {
        labels.push('—');
    }
    return labels.slice(0, slotCount);
}
