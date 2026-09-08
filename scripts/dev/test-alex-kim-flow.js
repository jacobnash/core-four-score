/**
 * Prove Alex Kim dev sign-in + Firestore read/write on the emulator.
 * Mirrors the browser path: custom token → getUser → createTournament.
 *
 * Usage (emulators + dev-auth-helper running):
 *   USE_EMULATOR=true node ./scripts/dev/test-alex-kim-flow.js
 */

const admin = require('firebase-admin');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithCustomToken } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');
const { EMULATOR_HOST, FIRESTORE_PORT, AUTH_PORT, initAdminForEmulator } = require('./emulator-env');

const ALEX = {
    uid: 'mock-dev-alex',
    email: 'alex.kim@example.com',
    displayName: 'Alex Kim',
};

async function fetchDevToken() {
    const res = await fetch(
        `http://127.0.0.1:9199/dev-token?email=${encodeURIComponent(ALEX.email)}`
    );
    if (!res.ok) throw new Error(`dev-auth helper failed (${res.status})`);
    return res.json();
}

async function runBrowserPath() {
    const { token } = await fetchDevToken();

    const app = initializeApp(
        {
            apiKey: 'AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY',
            projectId: 'core-four-score',
        },
        'alex-kim-proof'
    );

    const auth = getAuth(app);
    const db = getFirestore(app);
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, Number(FIRESTORE_PORT));

    const cred = await signInWithCustomToken(auth, token);
    if (cred.user.uid !== ALEX.uid) {
        throw new Error(`Expected uid ${ALEX.uid}, got ${cred.user.uid}`);
    }
    console.log('✓ Alex Kim signed in (auth emulator)');

    const userSnap = await getDoc(doc(db, 'users', ALEX.uid));
    if (!userSnap.exists()) {
        throw new Error('Alex Kim user doc missing in emulator — run npm run dev:seed');
    }
    console.log('✓ Firestore read users/mock-dev-alex:', userSnap.data().displayName);

    // Same fields as tournamentService.createTournament
    const tournamentId = `alex-proof-${Date.now()}`;
    await setDoc(doc(db, 'tournaments', tournamentId), {
        tournamentId,
        name: 'Alex Proof Tournament',
        memberIds: [ALEX.uid],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'draft',
        activityType: 'euchre',
        createdBy: ALEX.uid,
        visibility: 'private',
        inviteIds: [],
        schemaVersion: 1,
    });
    console.log('✓ Firestore write createTournament:', tournamentId);

    const saved = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!saved.exists()) {
        throw new Error('Tournament write did not persist');
    }
    if (!saved.data().memberIds.includes(ALEX.uid)) {
        throw new Error('Alex not in memberIds after create');
    }
    console.log('✓ Tournament verified in emulator:', saved.data().name);

    await deleteApp(app);
    return tournamentId;
}

async function main() {
    initAdminForEmulator(admin);

    console.log('\n=== Alex Kim emulator flow proof ===\n');

    await runBrowserPath();

    const memberQuery = await admin
        .firestore()
        .collection('tournaments')
        .where('memberIds', 'array-contains', ALEX.uid)
        .get();
    console.log(`✓ Alex Kim is member of ${memberQuery.size} tournament(s) in emulator`);

    console.log('\n✅ Alex Kim sign-in + Firestore read/write works on local emulator.\n');
}

main().catch(err => {
    console.error('\n❌ Failed:', err.message);
    console.error('   Start full dev stack: npm run dev:local\n');
    process.exit(1);
});
