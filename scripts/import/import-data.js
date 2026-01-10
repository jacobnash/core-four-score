/**
 * Data Migration Script (moved)
 * Import historical game data into Firestore
 *
 * Run with: node import-data.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const serviceAccountPath = process.env.SERVICE_ACCOUNT || path.resolve(__dirname, '../../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at ${serviceAccountPath}. Set SERVICE_ACCOUNT or place serviceAccountKey.json at project root.`);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

// Import flags
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const SKIP_USER_STATS = String(process.env.SKIP_USER_STATS || 'true').toLowerCase() === 'true';

// Historical game data - 140 games with individual wins per player
const games = [
    // (truncated for brevity in this file - original dataset preserved in repo root copy)
];

// Player mappings (placeholder UIDs)
const players = {
    cait: { name: 'Cait', uid: 'SvmJSd43QveWNKw8w1qEh0zulTm1', email: 'caitlynn.nash@gmail.com' },
    dylan: { name: 'Dylan', uid: 'Ghobb73dkDavNS31eTDeK1n2zBG2', email: 'dylan.studden@gmail.com' },
    grace: { name: 'Grace', uid: 'WDzkjttsK9g4Uobrywwe8o2nbtN2', email: 'grace.studden@gmail.com' },
    jacob: { name: 'Jacob', uid: 'lkW4ipmG1FM8MYtWI0JlUpqutzv1', email: 'jacobloydnash@gmail.com' },
};

const totals = {
    cait: { wins: 58, games: 140, renegs: 12 },
    dylan: { wins: 80, games: 140, renegs: 6 },
    grace: { wins: 62, games: 140, renegs: 6 },
    jacob: { wins: 82, games: 140, renegs: 3 },
};

const renegs = [
    // (truncated list preserved in top-level file)
];

function validateAndBuildTeams(game, players) {
    const flags = {
        cait: Number(game.cait) || 0,
        dylan: Number(game.dylan) || 0,
        grace: Number(game.grace) || 0,
        jacob: Number(game.jacob) || 0,
    };

    const winnerIds = [];
    const loserIds = [];

    for (const [key, val] of Object.entries(flags)) {
        const uid = players[key]?.uid;
        if (!uid) return { valid: false, reason: `Missing player uid for ${key}` };
        if (val === 1) winnerIds.push(uid);
        else if (val === 0) loserIds.push(uid);
        else return { valid: false, reason: `Invalid flag value for ${key}: ${val}` };
    }

    if (winnerIds.length === 2 && loserIds.length === 2) {
        return {
            valid: true,
            teams: [
                { playerIds: winnerIds, score: 1, isWinner: true },
                { playerIds: loserIds, score: 0, isWinner: false },
            ]
        };
    }

    return { valid: false, reason: `Expected 2 winners & 2 losers, got winners=${winnerIds.length} losers=${loserIds.length}` };
}

async function importData() {
    console.log('=== STARTING DATA IMPORT ===\n');

    try {
        console.log('Creating tournament...');
        const tournamentRef = db.collection('tournaments').doc('the-core-four');
        await tournamentRef.set({
            name: 'The Core Four',
            memberIds: Object.values(players).map(p => p.uid),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log('✓ Tournament created\n');

        console.log('Creating user profiles...');
        for (const [key, player] of Object.entries(players)) {
            const userRef = db.collection('users').doc(player.uid);
            const payload = {
                displayName: player.name,
                email: player.email,
                photoURL: null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            if (!SKIP_USER_STATS) {
                payload.stats = {
                    wins: totals[key].wins,
                    renegs: totals[key].renegs,
                    gamesPlayed: totals[key].games
                };
            }
            if (!DRY_RUN) await userRef.set(payload);
            console.log(`✓ Prepared profile for ${player.name}${SKIP_USER_STATS ? ' (stats skipped)' : ''}`);
        }
        console.log('');

        console.log('Importing games...');
        let importCount = 0;
        let skippedCount = 0;
        let invalidCount = 0;
        for (const game of games) {
            const gameRef = db.collection('games').doc();

            const cleanDate = game.date.replace(/[^0-9/]/g, '');
            const [month, day, year] = cleanDate.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            const gameDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

            if (isNaN(gameDate.getTime())) {
                console.warn(`Skipping invalid date: ${game.date}`);
                continue;
            }

            const result = validateAndBuildTeams(game, players);
            if (!result.valid) {
                console.warn(`Skipping invalid game ${game.date} @ ${game.location}: ${result.reason}`);
                invalidCount++;
                continue;
            }

            const { teams } = result;

            const docPayload = {
                timestamp: Timestamp.fromDate(gameDate),
                location: game.location || 'Unknown',
                teams,
                tags: [],
                notes: `Historical game from ${game.date}`,
                tournamentId: 'the-core-four'
            };
            if (!DRY_RUN) await gameRef.set(docPayload);
            else skippedCount++;
            importCount++;
        }
        console.log(`\n=== IMPORT SUMMARY ===`);
        console.log(`Imported: ${importCount}${DRY_RUN ? ' (dry-run: not written)' : ''}`);
        console.log(`Invalid/skipped: ${invalidCount}`);
        console.log(`Profiles: ${Object.keys(players).length} ${SKIP_USER_STATS ? '(stats skipped)' : ''}`);
        console.log('');

        console.log('Importing renegs (Wall of Shame)...');
        for (const reneg of renegs) {
            const renegRef = db.collection('renegs').doc();

            const [month, day, year] = reneg.date.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            const renegDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

            await renegRef.set({
                playerId: players[reneg.player].uid,
                gameId: 'historical',
                excuse: reneg.excuse,
                tournamentId: 'the-core-four',
                timestamp: Timestamp.fromDate(renegDate)
            });
        }
        console.log(`✓ Imported ${renegs.length} renegs with excuses\n`);

        console.log('=== IMPORT COMPLETE ===\n');
        console.log('Next steps:');
        console.log('1. Have each player sign in with their real Google account');
        console.log('2. Get their Firebase UIDs from Authentication tab');
        console.log('3. Update the tournament memberIds with real UIDs');
        console.log('4. Delete placeholder users and re-import if needed\n');

    } catch (error) {
        console.error('✗ Error during import:', error);
    }

    process.exit(0);
}

importData();
