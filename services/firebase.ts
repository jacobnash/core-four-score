import { initializeApp } from 'firebase/app';
import {
    Auth,
    getAuth,
    initializeAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// TODO: Replace with your Firebase configuration
// Get this from Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY",
    authDomain: "core-four-score.firebaseapp.com",
    projectId: "core-four-score",
    storageBucket: "core-four-score.firebasestorage.app",
    messagingSenderId: "605611128312",
    appId: "1:605611128312:web:3a723fa2f74aa9cc18920d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth with proper persistence
let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    // Some firebase versions include getReactNativePersistence, others do not.
    // Use initializeAuth without explicit persistence here; platform will default.
    auth = initializeAuth(app);
}

export { auth };
export default app;
