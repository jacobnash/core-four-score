/**
 * Backfill Migration Script
 * Add tournamentId to existing renegs that lack it
 * 
 * Run with: node backfill-renegs.js
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

async function backfillRenegs() {
    console.log('=== STARTING RENEG BACKFILL ===\n');

    try {
        // Fetch all renegs
        const renegSnapshot = await db.collection('renegs').get();
        console.log(`Found ${renegSnapshot.size} total renegs\n`);

        let updated = 0;
        let skipped = 0;

        for (const doc of renegSnapshot.docs) {
            const data = doc.data();

            // If tournamentId already exists, skip
            if (data.tournamentId) {
                skipped++;
                continue;
            }

            // Update with tournamentId (for now, assume 'default-tournament')
            // In a more complex scenario, you'd join with games to find the tournament
            await doc.ref.update({
                tournamentId: 'default-tournament'
            });
            updated++;
            console.log(`✓ Updated reneg ${doc.id}`);
        }

        console.log(`\n=== BACKFILL COMPLETE ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Already had tournamentId: ${skipped}\n`);

    } catch (error) {
        console.error('✗ Error during backfill:', error);
    }

    process.exit(0);
}

backfillRenegs();
