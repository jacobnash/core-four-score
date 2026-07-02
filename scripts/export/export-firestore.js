/**
 * Firestore backup script — run on your Mac before risky changes or on a schedule.
 *
 * READ-ONLY: this script never writes to Firebase.
 *
 * Setup (one time):
 *   1. Download a Firebase service account key from Firebase Console
 *      → Project Settings → Service Accounts → Generate new private key
 *   2. Save it as serviceAccountKey.json in the project root (gitignored)
 *      OR set SERVICE_ACCOUNT=/path/to/your-key.json
 *
 * Usage:
 *   npm run backup
 *   npm run backup:auth          # also export Firebase Auth users
 *   npm run backup:lite          # skip huge base64 photoURL fields
 *
 * Environment variables:
 *   SERVICE_ACCOUNT   Path to service account JSON (default: ./serviceAccountKey.json)
 *   BACKUP_DIR        Output parent folder (default: ./backups)
 *   COLLECTIONS       Comma-separated list (default: users,tournaments,games,renegs,rules)
 *   INCLUDE_AUTH      Set to "true" to export Auth users (same as npm run backup:auth)
 *   STRIP_PHOTOS      Set to "true" to omit photoURL from user docs (smaller files)
 *
 * Output:
 *   backups/2026-07-02T143022/
 *     manifest.json
 *     users.json
 *     tournaments.json
 *     games.json
 *     renegs.json
 *     rules.json
 *     auth-users.json   (if INCLUDE_AUTH=true)
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { serializeValue } = require('./serialize');

const DEFAULT_COLLECTIONS = ['users', 'tournaments', 'games', 'renegs', 'rules'];

const serviceAccountPath = process.env.SERVICE_ACCOUNT || path.resolve(__dirname, '../../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ Service account file not found.');
    console.error(`   Expected: ${serviceAccountPath}`);
    console.error('   Download from Firebase Console → Project Settings → Service Accounts');
    console.error('   Then either:');
    console.error('     • Place it at ./serviceAccountKey.json');
    console.error('     • Or run: SERVICE_ACCOUNT=/path/to/key.json npm run backup\n');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
const projectId = serviceAccount.project_id;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
});

const db = admin.firestore();

const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '../../backups');
const INCLUDE_AUTH = String(process.env.INCLUDE_AUTH || 'false').toLowerCase() === 'true';
const STRIP_PHOTOS = String(process.env.STRIP_PHOTOS || 'false').toLowerCase() === 'true';
const COLLECTIONS = (process.env.COLLECTIONS || DEFAULT_COLLECTIONS.join(','))
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

function timestampFolderName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return [
        d.getFullYear(),
        pad(d.getMonth() + 1),
        pad(d.getDate()),
        'T',
        pad(d.getHours()),
        pad(d.getMinutes()),
        pad(d.getSeconds()),
    ].join('');
}

/** Recursively convert Firestore types to JSON-safe values */
function serializeDoc(doc) {
    return {
        id: doc.id,
        ...serializeValue(doc.data(), admin, { stripPhotos: STRIP_PHOTOS }),
    };
}

async function exportCollection(collectionName) {
    console.log(`  Exporting ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    const docs = snapshot.docs.map(serializeDoc);
    console.log(`  ✓ ${collectionName}: ${docs.length} documents`);
    return docs;
}

async function exportAuthUsers() {
    console.log('  Exporting Firebase Auth users...');
    const users = [];
    let pageToken;

    do {
        const result = await admin.auth().listUsers(1000, pageToken);
        for (const user of result.users) {
            users.push({
                uid: user.uid,
                email: user.email || null,
                displayName: user.displayName || null,
                photoURL: STRIP_PHOTOS ? null : (user.photoURL || null),
                disabled: user.disabled,
                emailVerified: user.emailVerified,
                metadata: {
                    creationTime: user.metadata.creationTime,
                    lastSignInTime: user.metadata.lastSignInTime,
                },
                providerData: user.providerData.map(p => ({
                    providerId: p.providerId,
                    uid: p.uid,
                    email: p.email || null,
                    displayName: p.displayName || null,
                })),
            });
        }
        pageToken = result.pageToken;
    } while (pageToken);

    console.log(`  ✓ auth-users: ${users.length} accounts`);
    return users;
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`  → wrote ${path.basename(filePath)} (${sizeKb} KB)`);
}

async function main() {
    const folderName = timestampFolderName();
    const outDir = path.join(BACKUP_DIR, folderName);

    console.log('\n=== Core Four Score — Firestore Backup ===\n');
    console.log(`Project:     ${projectId}`);
    console.log(`Output:      ${outDir}`);
    console.log(`Collections: ${COLLECTIONS.join(', ')}`);
    console.log(`Auth export: ${INCLUDE_AUTH ? 'yes' : 'no'}`);
    console.log(`Strip photos:${STRIP_PHOTOS ? 'yes' : 'no'}`);
    console.log('');

    fs.mkdirSync(outDir, { recursive: true });

    const counts = {};
    const startedAt = new Date().toISOString();

    for (const name of COLLECTIONS) {
        const docs = await exportCollection(name);
        counts[name] = docs.length;
        writeJson(path.join(outDir, `${name}.json`), docs);
    }

    if (INCLUDE_AUTH) {
        const authUsers = await exportAuthUsers();
        counts['auth-users'] = authUsers.length;
        writeJson(path.join(outDir, 'auth-users.json'), authUsers);
    }

    const manifest = {
        exportedAt: startedAt,
        projectId,
        collections: counts,
        options: {
            includeAuth: INCLUDE_AUTH,
            stripPhotos: STRIP_PHOTOS,
            collections: COLLECTIONS,
        },
        restoreHint: 'To restore, use: npm run restore -- backups/' + folderName,
    };

    writeJson(path.join(outDir, 'manifest.json'), manifest);

    console.log('\n✅ Backup complete!\n');
    console.log(`   Folder: ${outDir}`);
    console.log(`   Total:  ${Object.values(counts).reduce((a, b) => a + b, 0)} records\n`);
    console.log('Keep this folder safe. Do not commit backups/ to git.\n');
}

main().catch((err) => {
    console.error('\n❌ Backup failed:', err.message || err);
    if (err.code === 'auth/insufficient-permission' || err.code === 7) {
        console.error('   Your service account may need Cloud Datastore User or Firebase Admin role.');
    }
    process.exit(1);
});
