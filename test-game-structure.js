const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testGames() {
    const snapshot = await db.collection('games').limit(1).get();
    console.log('Sample game:');
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(JSON.stringify(data, null, 2));
    });
    process.exit(0);
}

testGames().catch(e => { console.error(e); process.exit(1); });
