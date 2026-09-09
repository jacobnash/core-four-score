import { buildAdjacency, generateCatanBoard } from '../utils/catanBoardGenerator';

function countBy<T extends string>(items: T[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
    return counts;
}

describe('buildAdjacency', () => {
    it('is symmetric and produces the classic 19-hex corner/interior degrees', () => {
        const adjacency = buildAdjacency([3, 4, 5, 4, 3]);
        expect(adjacency).toHaveLength(19);

        for (let i = 0; i < adjacency.length; i++) {
            for (const j of adjacency[i]) {
                expect(adjacency[j]).toContain(i);
            }
        }

        // Row 2 (length 5) col 2 is the board's center tile — full 6 neighbors.
        const centerIdx = 3 + 4 + 2; // row0(3) + row1(4) + col2
        expect(adjacency[centerIdx]).toHaveLength(6);

        // Row 0 col 0 is a corner — only 3 neighbors.
        expect(adjacency[0]).toHaveLength(3);
    });

    it('produces 30 tiles for the extended row pattern', () => {
        const adjacency = buildAdjacency([3, 4, 5, 6, 5, 4, 3]);
        expect(adjacency).toHaveLength(30);
        for (const neighbors of adjacency) {
            expect(neighbors.length).toBeGreaterThanOrEqual(3);
            expect(neighbors.length).toBeLessThanOrEqual(6);
        }
    });
});

describe('generateCatanBoard', () => {
    it('base board has the official 19-tile resource mix', () => {
        const board = generateCatanBoard('base');
        expect(board.tiles).toHaveLength(19);
        expect(countBy(board.tiles.map(t => t.resource))).toEqual({
            wood: 4,
            wheat: 4,
            sheep: 4,
            brick: 3,
            ore: 3,
            desert: 1,
        });
        expect(countBy(board.ports)).toEqual({ generic: 4, wood: 1, brick: 1, wheat: 1, sheep: 1, ore: 1 });
    });

    it('extended board has the official 30-tile resource mix', () => {
        const board = generateCatanBoard('extended');
        expect(board.tiles).toHaveLength(30);
        expect(countBy(board.tiles.map(t => t.resource))).toEqual({
            wood: 6,
            wheat: 6,
            sheep: 6,
            brick: 5,
            ore: 5,
            desert: 2,
        });
        expect(countBy(board.ports)).toEqual({ generic: 5, wood: 1, brick: 1, wheat: 1, sheep: 2, ore: 1 });
    });

    it('desert tiles never get a number, every other tile does', () => {
        const board = generateCatanBoard('base');
        for (const tile of board.tiles) {
            if (tile.resource === 'desert') expect(tile.number).toBeNull();
            else expect(tile.number).not.toBeNull();
        }
    });

    it('never places two red (6/8) numbers on adjacent tiles, across many shuffles', () => {
        for (const expansion of ['base', 'extended'] as const) {
            for (let i = 0; i < 25; i++) {
                const board = generateCatanBoard(expansion);
                const adjacency = buildAdjacency(board.rowLengths);
                const numberByIndex = board.tiles.map(t => t.number);

                for (let idx = 0; idx < numberByIndex.length; idx++) {
                    const n = numberByIndex[idx];
                    if (n !== 6 && n !== 8) continue;
                    for (const neighbor of adjacency[idx]) {
                        expect([6, 8]).not.toContain(numberByIndex[neighbor]);
                    }
                }
            }
        }
    });
});
