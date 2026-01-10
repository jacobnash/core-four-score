/**
 * Backfill Migration Script
 * Add tournamentId to existing games that lack it
 * 
 * Run with: node backfill-games.js
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

async function backfillGames() {
    console.log('=== STARTING GAMES BACKFILL ===\n');

    try {
        // Fetch all games
        const gameSnapshot = await db.collection('games').get();
        console.log(`Found ${gameSnapshot.size} total games\n`);

        let updated = 0;
        let skipped = 0;

        for (const doc of gameSnapshot.docs) {
            const data = doc.data();

            // If tournamentId already exists, skip
            if (data.tournamentId) {
                skipped++;
                continue;
            }

            // Update with tournamentId
            await doc.ref.update({
                tournamentId: 'default-tournament'
            });
            updated++;
            console.log(`✓ Updated game ${doc.id}`);
        }

        console.log(`\n=== BACKFILL COMPLETE ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Already had tournamentId: ${skipped}\n`);

    } catch (error) {
        console.error('✗ Error during backfill:', error);
    }

    process.exit(0);
}

backfillGames();
