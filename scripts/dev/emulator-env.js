/**
 * Shared Firebase Emulator environment for Node admin scripts.
 * No service account required — data stays on your Mac.
 */

const EMULATOR_HOST = process.env.EMULATOR_HOST || '127.0.0.1';
const FIRESTORE_PORT = process.env.FIRESTORE_EMULATOR_PORT || '8080';
const AUTH_PORT = process.env.AUTH_EMULATOR_PORT || '9099';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'core-four-score';

function configureEmulatorEnv() {
    process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${FIRESTORE_PORT}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${AUTH_PORT}`;
}

function initAdminForEmulator(admin) {
    configureEmulatorEnv();
    if (!admin.apps.length) {
        admin.initializeApp({ projectId: PROJECT_ID });
    }
    return admin;
}

module.exports = {
    EMULATOR_HOST,
    FIRESTORE_PORT,
    AUTH_PORT,
    PROJECT_ID,
    configureEmulatorEnv,
    initAdminForEmulator,
};
