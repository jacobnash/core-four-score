/**
 * Integration test: each dev player only sees tournaments they belong to or are invited to.
 *
 * Prerequisites: emulators running + seeded (npm run emulators, npm run dev:seed)
 *
 * Usage: USE_EMULATOR=true node ./scripts/dev/test-tournament-visibility.js
 */

const admin = require('firebase-admin');
const { initAdminForEmulator } = require('./emulator-env');
const {
    ALL_DEV_PLAYERS,
    MOCK_TOURNAMENTS,
} = require('./mock-multiplayer-data');

function isMember(t, uid) {
    return (t.memberIds || []).includes(uid);
}

function isInvited(t, uid) {
    return (t.inviteIds || []).includes(uid);
}

function canAccess(t, uid) {
    return isMember(t, uid) || isInvited(t, uid);
}

function expectedForUser(uid) {
    const member = [];
    const invited = [];
    for (const row of MOCK_TOURNAMENTS) {
        const t = { id: row.id, ...row.data };
        if (isMember(t, uid)) member.push(t.id);
        else if (isInvited(t, uid)) invited.push(t.id);
    }
    return { member, invited };
}

async function fetchAllTournaments(db) {
    const snap = await db.collection('tournaments').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function partition(all, uid) {
    const member = all.filter(t => isMember(t, uid));
    const invited = all.filter(t => isInvited(t, uid) && !isMember(t, uid));
    return { member, invited };
}

async function main() {
    initAdminForEmulator(admin);
    const db = admin.firestore();
    const all = await fetchAllTournaments(db);

    if (all.length === 0) {
        console.error('No tournaments in emulator — run: npm run dev:seed');
        process.exit(1);
    }

    let failures = 0;
    const mockIds = new Set(MOCK_TOURNAMENTS.map(t => t.id));

    console.log('\n=== Tournament visibility integration test ===\n');
    console.log(`Loaded ${all.length} tournaments from emulator\n`);

    for (const player of ALL_DEV_PLAYERS) {
        const { member, invited } = partition(all, player.uid);
        const expected = expectedForUser(player.uid);
        const memberIds = member.map(t => t.id).filter(id => mockIds.has(id)).sort();
        const invitedIds = invited.map(t => t.id).filter(id => mockIds.has(id)).sort();
        const expectedMember = [...expected.member].sort();
        const expectedInvited = [...expected.invited].sort();

        const memberOk = JSON.stringify(memberIds) === JSON.stringify(expectedMember);
        const invitedOk = JSON.stringify(invitedIds) === JSON.stringify(expectedInvited);

        const leaks = all.filter(t => mockIds.has(t.id) && !canAccess(t, player.uid));
        const visibleSet = new Set([...memberIds, ...invitedIds]);
        const falseVisible = [...visibleSet].filter(id => !canAccess(
            all.find(t => t.id === id),
            player.uid
        ));

        if (memberOk && invitedOk && falseVisible.length === 0) {
            console.log(`  ✓ ${player.displayName}: ${memberIds.length} member, ${invitedIds.length} invited`);
        } else {
            failures++;
            console.log(`  ✗ ${player.displayName}`);
            if (!memberOk) {
                console.log(`      member expected [${expectedMember.join(', ')}] got [${memberIds.join(', ')}]`);
            }
            if (!invitedOk) {
                console.log(`      invited expected [${expectedInvited.join(', ')}] got [${invitedIds.join(', ')}]`);
            }
            if (falseVisible.length) {
                console.log(`      false visible: ${falseVisible.join(', ')}`);
            }
            console.log(`      should NOT see: ${leaks.map(t => t.id).join(', ') || '(none)'}`);
        }
    }

    console.log('');
    if (failures > 0) {
        console.error(`❌ ${failures} player(s) failed visibility checks\n`);
        process.exit(1);
    }
    console.log(`✅ All ${ALL_DEV_PLAYERS.length} players passed tournament visibility checks\n`);
}

main().catch(err => {
    console.error('Test failed:', err.message || err);
    process.exit(1);
});
