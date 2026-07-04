/**
 * Seed the local Firebase Emulator with dev data.
 *
 * Prerequisites: emulators running (npm run emulators)
 *
 * Usage:
 *   npm run dev:seed
 *   npm run dev:seed -- backups/2026-07-02T143022   # from a backup
 *
 * Priority:
 *   1. Backup path argument (if provided)
 *   2. Latest folder in backups/
 *   3. Historical import-data.js sample dataset
 *
 * Also creates Auth emulator users so you can sign in without Google OAuth.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const admin = require('firebase-admin');
const { initAdminForEmulator } = require('./emulator-env');
const { ALL_DEV_PLAYERS } = require('./mock-multiplayer-data');
const { seedMockMultiplayerData } = require('./seed-multiplayer-mock');

const DEV_PASSWORD = 'core-four-dev';

async function waitForEmulator(retries = 10) {
    const db = admin.firestore();
    for (let i = 0; i < retries; i++) {
        try {
            await db.collection('_ping').doc('seed').set({ ts: Date.now() });
            await db.collection('_ping').doc('seed').delete();
            return;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log('  Waiting for emulator...');
            await new Promise(r => setTimeout(r, 1500));
        }
    }
}

async function seedAuthUsers() {
    console.log('Creating Auth emulator users...');
    const auth = admin.auth();
    for (const player of ALL_DEV_PLAYERS) {
        try {
            await auth.getUser(player.uid);
            await auth.updateUser(player.uid, {
                email: player.email,
                displayName: player.displayName,
                password: DEV_PASSWORD,
            });
            console.log(`  ✓ updated ${player.displayName}`);
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                await auth.createUser({
                    uid: player.uid,
                    email: player.email,
                    displayName: player.displayName,
                    password: DEV_PASSWORD,
                    emailVerified: true,
                });
                console.log(`  ✓ created ${player.displayName}`);
            } else {
                throw err;
            }
        }
    }
}

function findLatestBackup() {
    const backupsDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupsDir)) return null;
    const dirs = fs.readdirSync(backupsDir)
        .filter(d => fs.statSync(path.join(backupsDir, d)).isDirectory())
        .sort()
        .reverse();
    if (!dirs.length) return null;
    const candidate = path.join(backupsDir, dirs[0]);
    return fs.existsSync(path.join(candidate, 'manifest.json')) ? candidate : null;
}

function runRestore(backupPath) {
    const restoreScript = path.resolve(__dirname, '../export/restore-firestore.js');
    execSync(`USE_EMULATOR=true node "${restoreScript}" "${backupPath}"`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..'),
    });
}

function runImport() {
    const importScript = path.resolve(__dirname, '../../import-data.js');
    execSync(`USE_EMULATOR=true node "${importScript}"`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..'),
    });
}

async function main() {
    console.log('\n=== Seed Local Firebase Emulator ===\n');

    initAdminForEmulator(admin);
    await waitForEmulator();
    await seedAuthUsers();

    const backupArg = process.argv[2];
    if (backupArg) {
        const resolved = path.resolve(backupArg);
        console.log(`\nRestoring from backup: ${resolved}\n`);
        runRestore(resolved);
    } else {
        const latest = findLatestBackup();
        if (latest) {
            console.log(`\nRestoring from latest backup: ${latest}\n`);
            runRestore(latest);
        } else {
            console.log('\nNo backup found — importing historical sample data...\n');
            runImport();
        }
    }

    await seedMockMultiplayerData(admin.firestore(), admin);

    const { backfillRulesTournamentId } = require('../backfill-rules-tournament');
    console.log('\nBackfilling rules.tournamentId (Core Four)...');
    const rulesResult = await backfillRulesTournamentId(admin.firestore());
    console.log(`  ✓ ${rulesResult.updated} rules tagged, ${rulesResult.skipped} already set`);

    console.log('\n✅ Emulator seeded!\n');
    console.log('Dev sign-in — Core Four:');
    for (const p of ALL_DEV_PLAYERS.filter(x => x.group === 'core-four')) {
        console.log(`  • ${p.displayName} — ${p.email}`);
    }
    console.log('\nDev sign-in — Mock guests:');
    for (const p of ALL_DEV_PLAYERS.filter(x => x.group === 'mock')) {
        console.log(`  • ${p.displayName} — ${p.email}`);
    }
    console.log(`\n  Password (all): ${DEV_PASSWORD}\n`);
    console.log('Mock tournaments: Deer Camp Alumni, Friday Progressive, Lake House Open, Speed Night');
    console.log('Start the app: npm run dev:web');
    console.log('Emulator UI:  http://localhost:4000\n');
}

main().catch((err) => {
    console.error('\n❌ Seed failed:', err.message || err);
    console.error('Make sure emulators are running: npm run emulators\n');
    process.exit(1);
});
