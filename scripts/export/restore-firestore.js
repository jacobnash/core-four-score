/**
 * Firestore restore script — import a local backup into Firebase.
 *
 * Usage:
 *   npm run restore -- backups/2026-07-02T143022
 *   npm run restore:dry -- backups/2026-07-02T143022
 *   USE_EMULATOR=true npm run restore -- backups/...   # local emulator
 *
 * Environment variables:
 *   USE_EMULATOR      Target local Firebase Emulator (no service account needed)
 *   SERVICE_ACCOUNT   Path to service account JSON (production/cloud)
 *   DRY_RUN           Set to "true" to preview without writing
 *   REPLACE           Set to "true" to overwrite existing docs (default: merge/set)
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { deserializeValue } = require('./serialize');

const USE_EMULATOR = String(process.env.USE_EMULATOR || 'false').toLowerCase() === 'true';
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const REPLACE = String(process.env.REPLACE || 'false').toLowerCase() === 'true';

const backupPath = process.argv[2];
if (!backupPath) {
    console.error('\nUsage: npm run restore -- backups/YYYY-MM-DDTHHMMSS\n');
    process.exit(1);
}

const resolvedBackup = path.resolve(backupPath);
if (!fs.existsSync(resolvedBackup)) {
    console.error(`Backup folder not found: ${resolvedBackup}`);
    process.exit(1);
}

let projectId = 'core-four-score';

if (USE_EMULATOR) {
    const { initAdminForEmulator, PROJECT_ID } = require('../dev/emulator-env');
    initAdminForEmulator(admin);
    projectId = PROJECT_ID;
} else {
    const serviceAccountPath = process.env.SERVICE_ACCOUNT || path.resolve(__dirname, '../../serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`Service account file not found at ${serviceAccountPath}`);
        console.error('For local emulator: USE_EMULATOR=true npm run restore -- backups/...');
        process.exit(1);
    }
    const serviceAccount = require(serviceAccountPath);
    projectId = serviceAccount.project_id;
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
    });
}

const db = admin.firestore();

function loadCollection(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function restoreCollection(collectionName, docs) {
    if (!docs || docs.length === 0) {
        console.log(`  Skipping ${collectionName} (empty or missing)`);
        return 0;
    }

    console.log(`  Restoring ${collectionName} (${docs.length} docs)...`);
    let count = 0;
    const batchSize = 400;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of docs) {
        const { id, ...data } = doc;
        const ref = db.collection(collectionName).doc(id);
        const payload = deserializeValue(data, admin, db);

        if (DRY_RUN) {
            count++;
            continue;
        }

        if (REPLACE) {
            batch.set(ref, payload);
        } else {
            batch.set(ref, payload, { merge: true });
        }

        batchCount++;
        count++;

        if (batchCount >= batchSize) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
    }

    console.log(`  ✓ ${collectionName}: ${count} documents ${DRY_RUN ? '(dry run)' : 'restored'}`);
    return count;
}

async function main() {
    const manifestPath = path.join(resolvedBackup, 'manifest.json');
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }

    console.log('\n=== Core Four Score — Firestore Restore ===\n');
    console.log(`Target:   ${USE_EMULATOR ? 'Local Emulator' : 'Cloud'}`);
    console.log(`Project:  ${projectId}`);
    console.log(`Backup:   ${resolvedBackup}`);
    console.log(`Mode:     ${DRY_RUN ? 'DRY RUN (no writes)' : REPLACE ? 'REPLACE (overwrite)' : 'MERGE (set with merge)'}`);
    if (manifest) {
        console.log(`Exported: ${manifest.exportedAt}`);
    }
    console.log('');

    if (!DRY_RUN && !USE_EMULATOR && projectId === 'core-four-score') {
        console.warn('⚠️  WARNING: You are restoring to the LIVE project (core-four-score).');
        console.warn('   For local dev use: USE_EMULATOR=true npm run restore -- ...\n');
    }

    const collectionFiles = fs.readdirSync(resolvedBackup)
        .filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'auth-users.json');

    let total = 0;
    for (const file of collectionFiles) {
        const collectionName = file.replace('.json', '');
        const docs = loadCollection(path.join(resolvedBackup, file));
        total += await restoreCollection(collectionName, docs);
    }

    const authPath = path.join(resolvedBackup, 'auth-users.json');
    if (fs.existsSync(authPath)) {
        console.log('  Note: auth-users.json is exported for reference only.');
        console.log('        For emulator auth, run: npm run dev:seed\n');
    }

    console.log(`\n✅ Restore ${DRY_RUN ? 'preview' : 'complete'}: ${total} documents\n`);
}

main().catch((err) => {
    console.error('\n❌ Restore failed:', err.message || err);
    process.exit(1);
});
