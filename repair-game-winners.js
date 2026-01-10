/**
 * Repair Script: Set isWinner on game teams based on scores when missing
 *
 * Run with: node repair-game-winners.js
 * Optionally set SERVICE_ACCOUNT env to path of serviceAccountKey.json
 */

const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccountPath = process.env.SERVICE_ACCOUNT || './serviceAccountKey.json';
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at ${serviceAccountPath}. Set SERVICE_ACCOUNT or place serviceAccountKey.json at project root.`);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function repairGameWinners() {
    console.log('=== STARTING GAME WINNER REPAIR ===');

    const snapshot = await db.collection('games').get();
    console.log(`Found ${snapshot.size} games`);

    let updated = 0;
    let skipped = 0;
    let anomalies = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const teams = Array.isArray(data.teams) ? data.teams : [];

        const explicitWinner = teams.find(t => t && t.isWinner === true);
        if (explicitWinner) {
            skipped++;
            continue; // already has a winner
        }

        const numericTeams = teams.filter(t => t && typeof t.score === 'number');
        if (numericTeams.length >= 2) {
            const scores = numericTeams.map(t => t.score);
            const max = Math.max(...scores);
            const maxTeams = numericTeams.filter(t => t.score === max);

            if (maxTeams.length === 1) {
                // set isWinner on the team with max score, clear on others
                const winnerRef = maxTeams[0];
                const updatedTeams = teams.map(t => ({
                    ...t,
                    isWinner: t === winnerRef
                }));
                await doc.ref.update({ teams: updatedTeams });
                updated++;
                console.log(`✓ Updated isWinner for game ${doc.id} (score-based)`);
            } else {
                anomalies++;
                console.warn(`! Tie or invalid scores in game ${doc.id}:`, scores);
            }
        } else {
            anomalies++;
            console.warn(`! Cannot infer winner (missing numeric scores) in game ${doc.id}`);
        }
    }

    console.log('\n=== REPAIR COMPLETE ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had winner): ${skipped}`);
    console.log(`Anomalies (manual review): ${anomalies}`);
}

repairGameWinners().catch(err => {
    console.error('Repair failed:', err);
    process.exit(1);
});
