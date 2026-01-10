/**
 * Clear Games Script
 * Delete all documents in the `games` collection. Respects DRY_RUN env var.
 *
 * Run with: node clear-games.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = process.env.SERVICE_ACCOUNT || path.resolve(__dirname, '../../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at ${serviceAccountPath}. Set SERVICE_ACCOUNT or place serviceAccountKey.json at project root.`);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

async function clearGames() {
    console.log('=== STARTING GAMES CLEAR ===\n');

    try {
        const gameSnapshot = await db.collection('games').get();
        console.log(`Found ${gameSnapshot.size} games${DRY_RUN ? ' (dry-run)' : ''} to delete`);
        let deletedGames = 0;
        for (const doc of gameSnapshot.docs) {
            if (!DRY_RUN) await doc.ref.delete();
            deletedGames++;
            if (deletedGames % 10 === 0) console.log(`  ...processed ${deletedGames} games`);
        }
        console.log(`✓ Processed ${deletedGames} games\n`);
    } catch (error) {
        console.error('✗ Error during games clear:', error);
    }

    process.exit(0);
}

clearGames();
