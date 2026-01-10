/**
 * Photo Import Script
 * Upload player photos from ./Deck directory to user profiles
 * 
 * Run with: node import-photos.js
 */

const fs = require('fs');
const path = require('path');
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

// Map photo files to players
const photoMap = {
    'AC.jpg': {
        uid: 'SvmJSd43QveWNKw8w1qEh0zulTm1',
        name: 'Cait'
    },
    'AD.jpg': {
        uid: 'Ghobb73dkDavNS31eTDeK1n2zBG2',
        name: 'Dylan'
    },
    'AH.jpg': {
        uid: 'WDzkjttsK9g4Uobrywwe8o2nbtN2',
        name: 'Grace'
    },
    'AS.jpg': {
        uid: 'lkW4ipmG1FM8MYtWI0JlUpqutzv1',
        name: 'Jacob'
    }
};

async function importPhotos() {
    console.log('=== STARTING PHOTO IMPORT ===\n');

    const deckDir = './Deck';

    // Check if Deck directory exists
    if (!fs.existsSync(deckDir)) {
        console.error(`✗ Deck directory not found at ${deckDir}`);
        process.exit(1);
    }

    try {
        let updated = 0;
        let skipped = 0;

        for (const [filename, playerInfo] of Object.entries(photoMap)) {
            const filepath = path.join(deckDir, filename);

            // Check if file exists
            if (!fs.existsSync(filepath)) {
                console.warn(`⚠ Photo not found: ${filepath}`);
                skipped++;
                continue;
            }

            // Read the image file
            const imageBuffer = fs.readFileSync(filepath);
            const base64Image = imageBuffer.toString('base64');
            const dataURI = `data:image/jpeg;base64,${base64Image}`;

            // Update user profile with photo
            const userRef = db.collection('users').doc(playerInfo.uid);
            await userRef.update({
                photoURL: dataURI,
                updatedAt: admin.firestore.Timestamp.now()
            });

            console.log(`✓ Updated ${playerInfo.name}'s photo from ${filename}`);
            updated++;
        }

        console.log(`\n=== PHOTO IMPORT COMPLETE ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}\n`);

    } catch (error) {
        console.error('✗ Error during photo import:', error);
    }

    process.exit(0);
}

importPhotos();
