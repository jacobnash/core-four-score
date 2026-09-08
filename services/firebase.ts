import { initializeApp } from 'firebase/app';
import {
    Auth,
    connectAuthEmulator,
    getAuth,
    initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import {
    AUTH_EMULATOR_PORT,
    EMULATOR_HOST,
    FIRESTORE_EMULATOR_PORT,
    USE_FIREBASE_EMULATOR,
} from '../constants/devConfig';

// The apiKey below is a public Firebase project identifier, not a secret (Google's own
// docs say not to try to keep it secret — access control lives in firestore.rules instead).
// It's still read from env first so rotating it doesn't mean hunting down every copy.
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'core-four-score.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'core-four-score',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'core-four-score.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '605611128312',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:605611128312:web:3a723fa2f74aa9cc18920d',
};

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);

let firestoreInstance: Firestore | undefined;
let authInstance: Auth | undefined;
let emulatorsConnected = false;

function ensureEmulatorsConnected(): void {
    if (!USE_FIREBASE_EMULATOR || emulatorsConnected || typeof window === 'undefined') return;

    if (!firestoreInstance) {
        firestoreInstance = getFirestore(app);
    }
    if (!authInstance) {
        authInstance = Platform.OS === 'web' ? getAuth(app) : initializeAuth(app);
    }

    try {
        connectFirestoreEmulator(firestoreInstance, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('already')) throw err;
    }

    try {
        connectAuthEmulator(authInstance, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
            disableWarnings: true,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('already')) throw err;
    }

    emulatorsConnected = true;
    if (__DEV__) {
        console.log(
            `[dev] Firebase Emulator — Firestore ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}, Auth :${AUTH_EMULATOR_PORT}`
        );
    }
}

/** Client-only Firestore — never init during SSR/static render. */
export function getDb(): Firestore {
    if (typeof window === 'undefined') {
        throw new Error('Firestore is not available during SSR');
    }
    if (!firestoreInstance) {
        ensureEmulatorsConnected();
    }
    return firestoreInstance!;
}

export function getAuthInstance(): Auth {
    if (typeof window === 'undefined') {
        throw new Error('Auth is not available during SSR');
    }
    if (!authInstance) {
        ensureEmulatorsConnected();
    }
    return authInstance!;
}

export function isFirebaseEmulatorConnected(): boolean {
    return emulatorsConnected;
}

export function connectFirebaseEmulators(): void {
    if (typeof window === 'undefined') return;
    ensureEmulatorsConnected();
}

export default app;
