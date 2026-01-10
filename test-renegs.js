/**
 * Test script to verify reneg queries work correctly
 * Run with: node test-renegs.js
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

async function testRenegQueries() {
    try {
        console.log('=== Testing Reneg Queries ===\n');

        // Test 1: Get all renegs
        console.log('Test 1: Fetching all renegs...');
        const allRenegs = await db.collection('renegs').orderBy('timestamp', 'desc').get();
        console.log(`✓ Found ${allRenegs.size} total renegs`);

        if (allRenegs.size > 0) {
            const sample = allRenegs.docs[0].data();
            console.log('Sample reneg:', {
                id: allRenegs.docs[0].id,
                playerId: sample.playerId,
                excuse: sample.excuse,
                timestamp: sample.timestamp?.toDate()
            });
        }

        // Test 2: Get renegs for Grace (WDzkjttsK9g4Uobrywwe8o2nbtN2)
        console.log('\nTest 2: Querying renegs for Grace (UID: WDzkjttsK9g4Uobrywwe8o2nbtN2)...');
        const graceRenegs = await db.collection('renegs')
            .where('playerId', '==', 'WDzkjttsK9g4Uobrywwe8o2nbtN2')
            .get();
        console.log(`✓ Found ${graceRenegs.size} renegs for Grace`);
        if (graceRenegs.size > 0) {
            graceRenegs.docs.slice(0, 3).forEach(doc => {
                const data = doc.data();
                console.log(`  - "${data.excuse}" on ${data.timestamp?.toDate()?.toLocaleDateString()}`);
            });
        }

        // Test 3: Get user profiles to verify UIDs
        console.log('\nTest 3: Fetching user profiles...');
        const users = await db.collection('users').limit(10).get();
        console.log(`✓ Found ${users.size} users`);
        users.docs.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.displayName} (uid: ${doc.id}, renegs: ${data.stats?.renegs || 0})`);
        });

        // Test 4: Get tournament members
        console.log('\nTest 4: Fetching tournament members...');
        const tournament = await db.collection('tournaments').doc('the-core-four').get();
        if (tournament.exists) {
            const tourData = tournament.data();
            console.log(`Tournament: ${tourData.name}`);
            console.log(`Member UIDs: ${tourData.memberIds.join(', ')}`);

            // Fetch each member and check their reneg count
            for (const uid of tourData.memberIds) {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const renegCount = await db.collection('renegs').where('playerId', '==', uid).get();
                    console.log(`  - ${userData.displayName}: ${renegCount.size} renegs in DB (stats says: ${userData.stats?.renegs || 0})`);
                }
            }
        } else {
            console.log('Tournament not found');
        }

    } catch (error) {
        console.error('✗ Error:', error);
    }

    process.exit(0);
}

testRenegQueries();
