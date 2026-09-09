import { CatanExpansion } from '../types';

export type CatanTileResource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore' | 'desert';
export type CatanPortType = 'generic' | 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';

export const CATAN_RESOURCE_LABELS: Record<CatanTileResource, string> = {
    wood: 'Wood',
    brick: 'Brick',
    wheat: 'Wheat',
    sheep: 'Sheep',
    ore: 'Ore',
    desert: 'Desert',
};

export const CATAN_PORT_LABELS: Record<CatanPortType, string> = {
    generic: '3:1',
    wood: '2:1 Wood',
    brick: '2:1 Brick',
    wheat: '2:1 Wheat',
    sheep: '2:1 Sheep',
    ore: '2:1 Ore',
};

export interface CatanBoardTile {
    row: number;
    col: number;
    resource: CatanTileResource;
    number: number | null;
}

export interface CatanBoard {
    expansion: CatanExpansion;
    rowLengths: number[];
    tiles: CatanBoardTile[];
    ports: CatanPortType[];
}

/**
 * Row lengths for the classic pointy-top hex island shape: each row is one
 * tile longer than the last up to the middle, then one shorter back down.
 * Base is the standard 19-hex board; extended is the 30-hex 5-6 Player
 * Extension board (both official Catan Studio layouts).
 */
const ROW_LENGTHS: Record<CatanExpansion, number[]> = {
    base: [3, 4, 5, 4, 3],
    extended: [3, 4, 5, 6, 5, 4, 3],
};

/** Official terrain hex counts (catan.com 5-6 Player Extension rulebook). */
const TILE_POOLS: Record<CatanExpansion, CatanTileResource[]> = {
    base: [
        ...Array(4).fill('wood'),
        ...Array(4).fill('wheat'),
        ...Array(4).fill('sheep'),
        ...Array(3).fill('brick'),
        ...Array(3).fill('ore'),
        'desert',
    ],
    extended: [
        ...Array(6).fill('wood'),
        ...Array(6).fill('wheat'),
        ...Array(6).fill('sheep'),
        ...Array(5).fill('brick'),
        ...Array(5).fill('ore'),
        ...Array(2).fill('desert'),
    ],
};

/** Official number-token counts — combined set for the whole board. */
const NUMBER_POOLS: Record<CatanExpansion, number[]> = {
    base: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    extended: [
        2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12,
    ],
};

/** Official harbor counts — extension adds one generic 3:1 and a second 2:1 sheep port. */
const PORT_POOLS: Record<CatanExpansion, CatanPortType[]> = {
    base: ['generic', 'generic', 'generic', 'generic', 'wood', 'brick', 'wheat', 'sheep', 'ore'],
    extended: [
        'generic', 'generic', 'generic', 'generic', 'generic',
        'wood', 'brick', 'wheat', 'sheep', 'sheep', 'ore',
    ],
};

/** The two "red" numbers — highest roll probability, never allowed to touch. */
const RED_NUMBERS = new Set([6, 8]);

function shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Flat tile index for a (row, col) position, given each row's length. */
function tileIndex(rowLengths: number[], row: number, col: number): number {
    let idx = 0;
    for (let r = 0; r < row; r++) idx += rowLengths[r];
    return idx + col;
}

/**
 * Adjacency list for the row-offset hex layout used above: within a row,
 * neighbors are left/right; between rows, a hex connects to the one or two
 * hexes in the adjacent (longer or shorter) row that sit beneath its edges.
 */
export function buildAdjacency(rowLengths: number[]): number[][] {
    const total = rowLengths.reduce((a, b) => a + b, 0);
    const adjacency: number[][] = Array.from({ length: total }, () => []);

    const link = (a: number, b: number) => {
        adjacency[a].push(b);
        adjacency[b].push(a);
    };

    for (let row = 0; row < rowLengths.length; row++) {
        const len = rowLengths[row];
        for (let col = 0; col < len; col++) {
            const idx = tileIndex(rowLengths, row, col);
            if (col + 1 < len) link(idx, tileIndex(rowLengths, row, col + 1));

            if (row + 1 < rowLengths.length) {
                const nextLen = rowLengths[row + 1];
                const targets = nextLen === len + 1 ? [col, col + 1] : [col - 1, col];
                for (const c of targets) {
                    if (c >= 0 && c < nextLen) link(idx, tileIndex(rowLengths, row + 1, c));
                }
            }
        }
    }
    return adjacency;
}

/** Random resource placement + a number placement that keeps 6s and 8s apart. */
export function generateCatanBoard(expansion: CatanExpansion): CatanBoard {
    const rowLengths = ROW_LENGTHS[expansion];
    const adjacency = buildAdjacency(rowLengths);
    const tiles = shuffle(TILE_POOLS[expansion]);

    const numberPool = NUMBER_POOLS[expansion];
    const nonDesertIndices = tiles.map((r, i) => (r === 'desert' ? -1 : i)).filter(i => i >= 0);

    // ponytail: full-reshuffle-and-retry rather than a constraint solver — with
    // only 4-6 "red" tiles among 18-28 slots the constraint is easy to satisfy,
    // so this converges in a handful of attempts. If it somehow never does,
    // fall back to the last attempt rather than looping forever.
    let numbers: number[] = [];
    for (let attempt = 0; attempt < 500; attempt++) {
        numbers = shuffle(numberPool);
        const assignment = new Map<number, number>();
        nonDesertIndices.forEach((tileIdx, i) => assignment.set(tileIdx, numbers[i]));

        const hasRedConflict = nonDesertIndices.some(tileIdx => {
            const n = assignment.get(tileIdx)!;
            if (!RED_NUMBERS.has(n)) return false;
            return adjacency[tileIdx].some(neighbor => RED_NUMBERS.has(assignment.get(neighbor) ?? -1));
        });
        if (!hasRedConflict) break;
    }

    const tileResults: CatanBoardTile[] = [];
    for (let row = 0; row < rowLengths.length; row++) {
        for (let col = 0; col < rowLengths[row]; col++) {
            const idx = tileIndex(rowLengths, row, col);
            const resource = tiles[idx];
            const number = resource === 'desert' ? null : numbers[nonDesertIndices.indexOf(idx)];
            tileResults.push({ row, col, resource, number });
        }
    }

    return {
        expansion,
        rowLengths,
        tiles: tileResults,
        ports: shuffle(PORT_POOLS[expansion]),
    };
}
