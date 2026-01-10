/**
 * Test the leaderboard calculation
 * Run with: node test-leaderboard.js
 */

const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccountPath = process.env.SERVICE_ACCOUNT || './serviceAccountKey.json';
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at ${serviceAccountPath}`);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function getUserStats(uid, tournamentId) {
    // Get all games in tournament
    const gamesSnapshot = await db.collection('games')
        .where('tournamentId', '==', tournamentId)
        .get();

    // Count games where this user was on a winning team
    let wins = 0;
    let gamesPlayed = 0;

    for (const gameDoc of gamesSnapshot.docs) {
        const gameData = gameDoc.data();
        const teams = gameData.teams || [];

        // Check if user is in any team
        const isInGame = teams.some(team => team.playerIds?.includes(uid));
        if (isInGame) {
            gamesPlayed++;

            // Check if user is in a winning team
            const winningTeam = teams.find(team => team.isWinner);
            if (winningTeam?.playerIds?.includes(uid)) {
                wins++;
            }
        }
    }

    // Count renegs for this user
    const renegsSnapshot = await db.collection('renegs')
        .where('playerId', '==', uid)
        .where('tournamentId', '==', tournamentId)
        .get();
    const renegs = renegsSnapshot.size;

    return { wins, renegs, gamesPlayed };
}

async function testLeaderboard() {
    try {
        console.log('=== Testing Leaderboard Calculation ===\n');

        const TOURNAMENT_ID = 'the-core-four';

        // Get tournament
        const tournamentDoc = await db.collection('tournaments').doc(TOURNAMENT_ID).get();
        const tournament = tournamentDoc.data();
        if (!tournament) {
            console.error('Tournament not found');
            process.exit(1);
        }
        console.log(`Tournament: ${tournament.name}`);
        console.log(`Members: ${tournament.memberIds.length}\n`);

        // Get members
        const members = await Promise.all(
            tournament.memberIds.map(uid => db.collection('users').doc(uid).get())
        );

        // Calculate stats for each
        const entries = [];
        for (const memberDoc of members) {
            if (!memberDoc.exists) continue;

            const user = memberDoc.data();
            const uid = memberDoc.id;
            const stats = await getUserStats(uid, TOURNAMENT_ID);

            entries.push({
                userId: uid,
                displayName: user.displayName,
                wins: stats.wins,
                winPercentage: stats.gamesPlayed > 0
                    ? (stats.wins / stats.gamesPlayed) * 100
                    : 0,
                totalRenegs: stats.renegs,
                gamesPlayed: stats.gamesPlayed
            });
        }

        // Sort by wins
        entries.sort((a, b) => b.wins - a.wins);

        console.log('Leaderboard (sorted by wins):');
        console.log('─'.repeat(80));
        entries.forEach((entry, idx) => {
            const rank = idx + 1;
            console.log(
                `${rank}. ${entry.displayName.padEnd(12)} | ` +
                `Wins: ${String(entry.wins).padStart(2)} | ` +
                `Games: ${String(entry.gamesPlayed).padStart(3)} | ` +
                `Win %: ${entry.winPercentage.toFixed(1).padStart(5)}% | ` +
                `Renegs: ${entry.totalRenegs}`
            );
        });

    } catch (error) {
        console.error('✗ Error:', error);
    }

    process.exit(0);
}

testLeaderboard();
