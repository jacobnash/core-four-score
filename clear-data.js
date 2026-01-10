/**
 * Clear Script
 * Delete all games, renegs, and tournaments (but keep users)
 * 
 * Run with: node clear-data.js
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

async function clearData() {
    console.log('=== STARTING DATA CLEAR ===\n');

    try {
        // Clear games
        console.log('Clearing games...');
        const gameSnapshot = await db.collection('games').get();
        console.log(`Found ${gameSnapshot.size} games to delete`);
        let deletedGames = 0;
        for (const doc of gameSnapshot.docs) {
            await doc.ref.delete();
            deletedGames++;
            if (deletedGames % 10 === 0) console.log(`  ...deleted ${deletedGames} games`);
        }
        console.log(`✓ Deleted ${gameSnapshot.size} games\n`);

        // Clear renegs
        console.log('Clearing renegs...');
        const renegSnapshot = await db.collection('renegs').get();
        console.log(`Found ${renegSnapshot.size} renegs to delete`);
        let deletedRenegs = 0;
        for (const doc of renegSnapshot.docs) {
            await doc.ref.delete();
            deletedRenegs++;
            if (deletedRenegs % 10 === 0) console.log(`  ...deleted ${deletedRenegs} renegs`);
        }
        console.log(`✓ Deleted ${renegSnapshot.size} renegs\n`);

        // Clear tournaments
        console.log('Clearing tournaments...');
        const tournamentSnapshot = await db.collection('tournaments').get();
        console.log(`Found ${tournamentSnapshot.size} tournaments to delete`);
        let deletedTournaments = 0;
        for (const doc of tournamentSnapshot.docs) {
            await doc.ref.delete();
            deletedTournaments++;
        }
        console.log(`✓ Deleted ${tournamentSnapshot.size} tournaments\n`);

        console.log('=== DATA CLEAR COMPLETE ===');
        console.log('Users have been preserved.\n');

    } catch (error) {
        console.error('✗ Error during clear:', error);
    }

    process.exit(0);
}

clearData();
