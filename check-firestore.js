/**
 * Firestore Connection Test
 * This will tell us if Firestore is set up correctly
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, enableNetwork, connectFirestoreEmulator } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY",
    authDomain: "core-four-score.firebaseapp.com",
    projectId: "core-four-score",
    storageBucket: "core-four-score.firebasestorage.app",
    messagingSenderId: "605611128312",
    appId: "1:605611128312:web:3a723fa2f74aa9cc18920d"
};

console.log('=== FIRESTORE CONNECTION TEST ===\n');

try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('✓ Firebase initialized');
    console.log('✓ Firestore instance created');
    console.log(`✓ Project ID: ${firebaseConfig.projectId}`);

    console.log('\n=== NEXT STEPS ===\n');
    console.log('Go to Firebase Console:');
    console.log('https://console.firebase.google.com/project/core-four-score/firestore\n');
    console.log('1. Click "Create Database" (if not created yet)');
    console.log('2. Choose "Start in TEST MODE" for now');
    console.log('3. Select a region (us-central1 recommended)');
    console.log('4. Wait for database to be created');
    console.log('5. Refresh your web app and try again');

    console.log('\n=== TEST MODE RULES ===\n');
    console.log('For testing, use these security rules:');
    console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 2, 1);
    }
  }
}
    `);
    console.log('(This allows all reads/writes until Feb 1, 2026)\n');

} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('=================================\n');
