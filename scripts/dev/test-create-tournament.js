/**
 * Prove local tournament create + read on the Firebase emulator.
 *
 * Usage (emulators running):
 *   USE_EMULATOR=true node scripts/dev/test-create-tournament.js
 */

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, getDocs, collection, Timestamp } = require('firebase/firestore');
const { initAdminForEmulator } = require('./emulator-env');

const TEST_UID = 'mock-dev-alex';

async function testViaClientSdk(tournamentId) {
    process.env.FIRESTORE_EMULATOR_HOST = `${process.env.EMULATOR_HOST || '127.0.0.1'}:8088`;
    const app = initializeApp({ projectId: 'core-four-score' }, 'create-proof');
    const db = getFirestore(app);

    await setDoc(doc(db, 'tournaments', tournamentId), {
        tournamentId,
        name: 'Client SDK Proof Tournament',
        memberIds: [TEST_UID],
        activityType: 'clays',
        status: 'draft',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: TEST_UID,
        visibility: 'private',
        inviteIds: [],
        schemaVersion: 1,
    });

    const saved = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!saved.exists()) throw new Error('Client SDK write did not persist');

    const all = await getDocs(collection(db, 'tournaments'));
    const found = all.docs.some(d => d.id === tournamentId);
    if (!found) throw new Error('Tournament not in collection listing');

    return saved.data();
}

async function main() {
    initAdminForEmulator(admin);
    const db = admin.firestore();

    const tournamentId = `proof-create-${Date.now()}`;

    console.log('\n=== Tournament create proof (emulator) ===\n');

    await db.collection('tournaments').doc(tournamentId).set({
        tournamentId,
        name: 'Admin SDK Proof Tournament',
        memberIds: [TEST_UID],
        activityType: 'euchre',
        status: 'draft',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: TEST_UID,
        visibility: 'private',
        inviteIds: [],
        schemaVersion: 1,
    });

    const adminSnap = await db.collection('tournaments').doc(tournamentId).get();
    if (!adminSnap.exists) throw new Error('Admin SDK create failed');
    console.log('✓ Admin SDK create:', adminSnap.data().name);

    const clientId = `proof-client-${Date.now()}`;
    const clientData = await testViaClientSdk(clientId);
    console.log('✓ Client SDK create (same path as app):', clientData.name);

    const memberQuery = await db
        .collection('tournaments')
        .where('memberIds', 'array-contains', TEST_UID)
        .get();
    console.log(`✓ mock-dev-alex is member of ${memberQuery.size} tournament(s) in emulator`);

    console.log('\n✅ Tournament create works on local emulator.\n');
}

main().catch(err => {
    console.error('\n❌ Failed:', err.message);
    console.error('   Start emulators: npm run emulators\n');
    process.exit(1);
});
