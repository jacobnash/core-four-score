/**
 * Backfill tournamentId on rules documents.
 *
 * All existing rules (no tournamentId) are assigned to the Core Four tournament.
 * New tournaments start with their own empty rules set.
 *
 * Usage:
 *   npm run backfill:rules              # production (service account)
 *   USE_EMULATOR=true npm run backfill:rules
 *   DRY_RUN=true npm run backfill:rules
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { initAdminForEmulator } = require('./dev/emulator-env');

const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';
const DRY_RUN = process.env.DRY_RUN === 'true';
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';

function initAdmin() {
    if (USE_EMULATOR) {
        return initAdminForEmulator(admin);
    }
    const keyPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');
    if (!admin.apps.length) {
        if (fs.existsSync(keyPath)) {
            admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
        } else {
            admin.initializeApp();
        }
    }
    return admin;
}

async function backfillRulesTournamentId(db, { dryRun = DRY_RUN } = {}) {
    const snap = await db.collection('rules').get();
    let updated = 0;
    let skipped = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const existing = data.tournamentId?.trim();
        if (existing) {
            skipped++;
            continue;
        }

        const payload = {
            tournamentId: CORE_FOUR_TOURNAMENT_ID,
            schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : 1,
        };

        if (dryRun) {
            console.log(`[dry-run] Would set tournamentId on ${docSnap.id}`);
        } else {
            await docSnap.ref.set(payload, { merge: true });
            console.log(`✓ ${docSnap.id} → ${CORE_FOUR_TOURNAMENT_ID}`);
        }
        updated++;
    }

    return { total: snap.size, updated, skipped };
}

async function main() {
    initAdmin();
    const db = admin.firestore();
    const target = USE_EMULATOR ? 'Local Emulator' : 'Production Firestore';

    console.log(`\n=== Backfill rules.tournamentId (${target}) ===\n`);
    if (DRY_RUN) console.log('DRY_RUN=true — no writes\n');

    const result = await backfillRulesTournamentId(db);
    console.log(`\nDone. ${result.updated} updated, ${result.skipped} already had tournamentId (${result.total} total).\n`);
}

if (require.main === module) {
    main().catch(err => {
        console.error('Backfill failed', err);
        process.exit(1);
    });
}

module.exports = { backfillRulesTournamentId, CORE_FOUR_TOURNAMENT_ID };
