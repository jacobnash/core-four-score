/**
 * Read-only audit: verify Firestore data is compatible with multiplayer / visibility changes.
 *
 * Usage:
 *   node scripts/audit-production-data.js                    # production (service account)
 *   USE_EMULATOR=true node scripts/audit-production-data.js  # local emulator
 *   node scripts/audit-production-data.js backups/20260701T212256  # offline backup folder
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { initAdminForEmulator } = require('./dev/emulator-env');

const CORE_FOUR_MEMBER_IDS = [
    'SvmJSd43QveWNKw8w1qEh0zulTm1',
    'Ghobb73dkDavNS31eTDeK1n2zBG2',
    'WDzkjttsK9g4Uobrywwe8o2nbtN2',
    'lkW4ipmG1FM8MYtWI0JlUpqutzv1',
];
const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';

function initAdmin() {
    if (USE_EMULATOR) return initAdminForEmulator(admin);
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

function loadBackupCollections(backupDir) {
    const load = name => {
        const file = path.join(backupDir, `${name}.json`);
        if (!fs.existsSync(file)) return [];
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    };
    return {
        users: load('users'),
        tournaments: load('tournaments'),
        games: load('games'),
        renegs: load('renegs'),
        rules: load('rules'),
    };
}

async function loadLiveCollections(db) {
    async function loadCol(name) {
        const snap = await db.collection(name).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return {
        users: await loadCol('users'),
        tournaments: await loadCol('tournaments'),
        games: await loadCol('games'),
        renegs: await loadCol('renegs'),
        rules: await loadCol('rules'),
    };
}

function resolveRuleTournamentId(rule) {
    return (rule.tournamentId && String(rule.tournamentId).trim()) || CORE_FOUR_TOURNAMENT_ID;
}

function tournamentDocIds(t) {
    return new Set([t.id, t.tournamentId].filter(Boolean));
}

function audit(data) {
    const { users, tournaments, games, renegs, rules } = data;
    const errors = [];
    const warnings = [];
    const info = [];

    const userIds = new Set(users.map(u => u.id || u.uid));
    const tournamentById = new Map();
    for (const t of tournaments) {
        tournamentById.set(t.id, t);
        if (t.tournamentId) tournamentById.set(t.tournamentId, t);
    }
    const knownTournamentIds = new Set(tournamentById.keys());

    info.push(`${users.length} users, ${tournaments.length} tournaments, ${games.length} games, ${renegs.length} renegs, ${rules.length} rules`);

    for (const t of tournaments) {
        const id = t.id;
        const memberIds = Array.isArray(t.memberIds) ? t.memberIds : null;
        if (!memberIds || memberIds.length === 0) {
            errors.push(`Tournament "${id}" has no memberIds — app will hide it from everyone`);
        }
        if (!t.tournamentId) {
            warnings.push(`Tournament "${id}" missing tournamentId field (app falls back to doc id)`);
        }
        for (const uid of memberIds || []) {
            if (!userIds.has(uid)) {
                warnings.push(`Tournament "${id}" member ${uid} has no users/ doc`);
            }
        }
        if (id === CORE_FOUR_TOURNAMENT_ID || t.tournamentId === CORE_FOUR_TOURNAMENT_ID) {
            const sorted = [...memberIds].sort();
            const expected = [...CORE_FOUR_MEMBER_IDS].sort();
            if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
                errors.push(
                    `Core Four tournament memberIds mismatch — expected exactly the original four UIDs`
                );
            }
        }
    }

    for (const g of games) {
        if (!g.tournamentId) {
            errors.push(`Game ${g.id} missing tournamentId — stats and lists will break`);
            continue;
        }
        if (!knownTournamentIds.has(g.tournamentId)) {
            errors.push(`Game ${g.id} references unknown tournamentId "${g.tournamentId}"`);
        }
    }

    for (const r of renegs) {
        if (!r.tournamentId) {
            errors.push(`Reneg ${r.id} missing tournamentId`);
            continue;
        }
        if (!knownTournamentIds.has(r.tournamentId)) {
            errors.push(`Reneg ${r.id} references unknown tournamentId "${r.tournamentId}"`);
        }
    }

    const rulesMissingTournamentId = rules.filter(r => !r.tournamentId?.trim());
    if (rulesMissingTournamentId.length > 0) {
        warnings.push(
            `${rulesMissingTournamentId.length} rules missing tournamentId — app treats as Core Four; run npm run backfill:rules before relying on per-tournament rules`
        );
    }
    for (const rule of rules) {
        const tid = resolveRuleTournamentId(rule);
        if (!knownTournamentIds.has(tid)) {
            errors.push(`Rule ${rule.id} resolves to unknown tournament "${tid}"`);
        }
    }

    for (const u of users) {
        const uid = u.id || u.uid;
        const pref = u.preferredTournamentId;
        if (!pref) continue;
        const t = tournamentById.get(pref);
        if (!t) {
            warnings.push(`User ${uid} preferredTournamentId "${pref}" not found — auto-select may skip`);
            continue;
        }
        if (!(t.memberIds || []).includes(uid)) {
            warnings.push(`User ${uid} preferredTournamentId "${pref}" but is not a member — setActiveTournament will deny`);
        }
    }

    for (const uid of CORE_FOUR_MEMBER_IDS) {
        const visible = tournaments.filter(t => {
            const members = t.memberIds || [];
            const invites = t.inviteIds || [];
            return members.includes(uid) || invites.includes(uid);
        });
        if (visible.length === 0 && tournaments.some(t => t.id === CORE_FOUR_TOURNAMENT_ID)) {
            errors.push(`Core Four member ${uid} cannot see the-core-four — membership data broken`);
        }
    }

    const legacyOnly = tournaments.length === 1 && tournaments[0].id === CORE_FOUR_TOURNAMENT_ID;
    if (legacyOnly) {
        info.push('Single legacy tournament — existing Core Four stats/games/renegs remain scoped to the-core-four');
    }

    return { errors, warnings, info, ok: errors.length === 0 };
}

async function main() {
    const backupArg = process.argv[2];
    let source;
    let data;

    if (backupArg) {
        const dir = path.resolve(backupArg);
        if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
            console.error(`Not a backup folder: ${dir}`);
            process.exit(1);
        }
        source = `Backup ${dir}`;
        data = loadBackupCollections(dir);
    } else {
        initAdmin();
        const db = admin.firestore();
        source = USE_EMULATOR ? 'Local Emulator' : 'Production Firestore';
        data = await loadLiveCollections(db);
    }

    console.log(`\n=== Production data audit (${source}) ===\n`);

    const { errors, warnings, info, ok } = audit(data);

    for (const line of info) console.log(`  ℹ ${line}`);
    console.log('');
    for (const line of warnings) console.log(`  ⚠ ${line}`);
    if (warnings.length) console.log('');
    for (const line of errors) console.log(`  ✗ ${line}`);

    console.log('');
    if (ok) {
        console.log('✅ No blocking issues — existing Firebase data is compatible with the multiplayer app changes.\n');
        if (warnings.length) {
            console.log('Optional before deploy:');
            console.log('  • npm run backfill:rules   (tag rules with tournamentId)');
            console.log('  • npm run backfill:tournaments   (ensure tournamentId on tournament docs)\n');
        }
        process.exit(0);
    }

    console.error(`❌ ${errors.length} blocking issue(s) — fix before deploying multiplayer changes.\n`);
    process.exit(1);
}

main().catch(err => {
    console.error('Audit failed:', err.message || err);
    process.exit(1);
});
