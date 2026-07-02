import { initializeApp } from 'firebase/app';
import {
    Auth,
    connectAuthEmulator,
    getAuth,
    initializeAuth
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import {
    AUTH_EMULATOR_PORT,
    EMULATOR_HOST,
    FIRESTORE_EMULATOR_PORT,
    USE_FIREBASE_EMULATOR,
} from '../constants/devConfig';

const firebaseConfig = {
    apiKey: "AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY",
    authDomain: "core-four-score.firebaseapp.com",
    projectId: "core-four-score",
    storageBucket: "core-four-score.firebasestorage.app",
    messagingSenderId: "605611128312",
    appId: "1:605611128312:web:3a723fa2f74aa9cc18920d"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    auth = initializeAuth(app);
}

if (USE_FIREBASE_EMULATOR) {
    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, { disableWarnings: true });
    if (__DEV__) {
        console.log(`[dev] Firebase Emulator — Firestore ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}, Auth :${AUTH_EMULATOR_PORT}`);
    }
}

export { auth };
export default app;
