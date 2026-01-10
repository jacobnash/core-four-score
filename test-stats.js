/**
 * Test script to verify stats calculation
 * Run with: node test-stats.js
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

async function testStats() {
    try {
        console.log('=== Testing Stats Calculation ===\n');

        const TOURNAMENT_ID = 'the-core-four';
        const GRACE_UID = 'WDzkjttsK9g4Uobrywwe8o2nbtN2';

        // Test 1: Count all games in tournament
        console.log(`Test 1: Counting games in tournament "${TOURNAMENT_ID}"...`);
        const allGames = await db.collection('games').where('tournamentId', '==', TOURNAMENT_ID).get();
        console.log(`✓ Found ${allGames.size} games in tournament`);

        // Test 2: Count games where Grace participated
        console.log(`\nTest 2: Finding games where Grace (${GRACE_UID}) participated...`);
        let graceGamesCount = 0;
        let graceWinsCount = 0;

        for (const gameDoc of allGames.docs) {
            const gameData = gameDoc.data();
            const teams = gameData.teams || [];

            // Check if Grace is in any team
            const isInGame = teams.some(team => team.playerIds?.includes(GRACE_UID));
            if (isInGame) {
                graceGamesCount++;

                // Check if she won
                const winningTeam = teams.find(team => team.isWinner);
                if (winningTeam?.playerIds?.includes(GRACE_UID)) {
                    graceWinsCount++;
                }
            }
        }

        console.log(`✓ Grace participated in ${graceGamesCount} games`);
        console.log(`✓ Grace won ${graceWinsCount} games`);
        console.log(`✓ Grace's win percentage: ${graceGamesCount > 0 ? (graceWinsCount / graceGamesCount * 100).toFixed(1) : 0}%`);

        // Test 3: Check team structure
        console.log(`\nTest 3: Checking team structure in first game...`);
        const firstGame = allGames.docs[0];
        if (firstGame) {
            const gameData = firstGame.data();
            console.log(`Game ID: ${firstGame.id}`);
            console.log(`Tournament: ${gameData.tournamentId}`);
            console.log(`Timestamp: ${gameData.timestamp?.toDate()}`);
            console.log(`Teams:`);
            gameData.teams?.forEach((team, idx) => {
                console.log(`  Team ${idx + 1}:`);
                console.log(`    Player IDs: ${team.playerIds?.join(', ')}`);
                console.log(`    Score: ${team.score}`);
                console.log(`    Is Winner: ${team.isWinner}`);
            });
        }

        // Test 4: Count games per player
        console.log(`\nTest 4: Games played per player...`);
        const playerGames = {};
        const playerWins = {};

        for (const gameDoc of allGames.docs) {
            const gameData = gameDoc.data();
            const teams = gameData.teams || [];

            for (const team of teams) {
                for (const playerId of team.playerIds || []) {
                    playerGames[playerId] = (playerGames[playerId] || 0) + 1;
                    if (team.isWinner) {
                        playerWins[playerId] = (playerWins[playerId] || 0) + 1;
                    }
                }
            }
        }

        const userDocs = await db.collection('users').get();
        for (const userDoc of userDocs.docs) {
            const userData = userDoc.data();
            const uid = userDoc.id;
            const games = playerGames[uid] || 0;
            const wins = playerWins[uid] || 0;
            const pct = games > 0 ? (wins / games * 100).toFixed(1) : 0;
            console.log(`  ${userData.displayName}: ${wins} wins in ${games} games (${pct}%)`);
        }

    } catch (error) {
        console.error('✗ Error:', error);
    }

    process.exit(0);
}

testStats();
