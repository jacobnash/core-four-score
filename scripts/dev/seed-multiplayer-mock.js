/**
 * Merge mock Firestore users + extra tournaments into the local emulator.
 * Safe to run after backup restore — uses merge writes.
 */

const { ALL_DEV_PLAYERS, MOCK_TOURNAMENTS } = require('./mock-multiplayer-data');

async function seedMockMultiplayerData(db, admin) {
    const now = admin.firestore.Timestamp.now();
    let userCount = 0;
    let tournamentCount = 0;

    console.log('\nSeeding mock multiplayer data...');

    for (const player of ALL_DEV_PLAYERS) {
        await db.collection('users').doc(player.uid).set(
            {
                displayName: player.displayName,
                email: player.email,
                createdAt: now,
                updatedAt: now,
                preferredTournamentId: null,
                lastActiveTournamentId: null,
            },
            { merge: true }
        );
        userCount++;
    }

    const preferredUpdates = new Map();

    for (const t of MOCK_TOURNAMENTS) {
        await db.collection('tournaments').doc(t.id).set(
            {
                ...t.data,
                createdAt: now,
                updatedAt: now,
            },
            { merge: true }
        );
        tournamentCount++;
        for (const uid of t.preferredFor || []) {
            preferredUpdates.set(uid, t.id);
        }
    }

    // Preserve Core Four preferred tournament from backup when already set
    for (const [uid, preferredTournamentId] of preferredUpdates) {
        await db.collection('users').doc(uid).set(
            {
                preferredTournamentId,
                updatedAt: now,
            },
            { merge: true }
        );
    }

    console.log(`  ✓ ${userCount} user profiles (merge)`);
    console.log(`  ✓ ${tournamentCount} mock tournaments`);
    console.log(`  ✓ ${preferredUpdates.size} preferred-tournament shortcuts for mock users`);
}

module.exports = { seedMockMultiplayerData };
