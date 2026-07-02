/**
 * Local development config — Firebase Emulator on your Mac.
 * Enable with: EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
 */

export const USE_FIREBASE_EMULATOR =
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

export const EMULATOR_HOST =
    process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1';

export const FIRESTORE_EMULATOR_PORT = 8080;
export const AUTH_EMULATOR_PORT = 9099;

/** Shared password for all seeded dev accounts (emulator only) */
export const DEV_AUTH_PASSWORD = 'core-four-dev';

/** Seeded dev players — must match scripts/dev/seed-emulator.js */
export const DEV_PLAYERS = [
    { uid: 'SvmJSd43QveWNKw8w1qEh0zulTm1', displayName: 'Cait', email: 'caitlynn.nash@gmail.com' },
    { uid: 'Ghobb73dkDavNS31eTDeK1n2zBG2', displayName: 'Dylan', email: 'dylan.studden@gmail.com' },
    { uid: 'WDzkjttsK9g4Uobrywwe8o2nbtN2', displayName: 'Grace', email: 'grace.studden@gmail.com' },
    { uid: 'lkW4ipmG1FM8MYtWI0JlUpqutzv1', displayName: 'Jacob', email: 'jacobloydnash@gmail.com' },
] as const;
