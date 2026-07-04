/**
 * Seed mock players + tournaments only (emulator must already be running).
 * Usage: npm run dev:seed:mock
 */

const admin = require('firebase-admin');
const { initAdminForEmulator } = require('./emulator-env');
const { ALL_DEV_PLAYERS } = require('./mock-multiplayer-data');
const { seedMockMultiplayerData } = require('./seed-multiplayer-mock');

const DEV_PASSWORD = 'core-four-dev';

async function seedAuthUsers() {
    console.log('Ensuring Auth emulator users exist...');
    const auth = admin.auth();
    for (const player of ALL_DEV_PLAYERS) {
        try {
            await auth.getUser(player.uid);
            await auth.updateUser(player.uid, {
                email: player.email,
                displayName: player.displayName,
                password: DEV_PASSWORD,
            });
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                await auth.createUser({
                    uid: player.uid,
                    email: player.email,
                    displayName: player.displayName,
                    password: DEV_PASSWORD,
                    emailVerified: true,
                });
            } else {
                throw err;
            }
        }
    }
    console.log(`  ✓ ${ALL_DEV_PLAYERS.length} auth accounts ready`);
}

async function main() {
    initAdminForEmulator(admin);
    await seedAuthUsers();
    await seedMockMultiplayerData(admin.firestore(), admin);
    console.log('\n✅ Mock multiplayer data ready.\n');
}

main().catch(err => {
    console.error('\n❌ Mock seed failed:', err.message || err);
    process.exit(1);
});
