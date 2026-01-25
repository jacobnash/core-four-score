const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to load service account JSON from project root if present
const keyPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');
let credentials = null;
if (fs.existsSync(keyPath)) {
  credentials = require(keyPath);
}

if (!admin.apps.length) {
  if (credentials) {
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
  } else {
    // Fallback to application default credentials if available
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function backfill() {
  console.log('Starting tournaments backfill using firebase-admin...');
  const snap = await db.collection('tournaments').get();
  console.log(`Found ${snap.size} tournament documents`);
  let updated = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (!data.tournamentId) {
      console.log(`Backfilling ${d.id}`);
      await db.collection('tournaments').doc(d.id).set({ tournamentId: d.id }, { merge: true });
      updated++;
    }
  }

  console.log(`Backfill complete. Updated ${updated} documents.`);
}

backfill().catch(err => {
  console.error('Backfill failed', err);
  process.exit(1);
});
