import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
    browserLocalPersistence,
    browserSessionPersistence,
    signOut as firebaseSignOut,
    User as FirebaseUser,
    getRedirectResult,
    GoogleAuthProvider,
    inMemoryPersistence,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    signInWithCustomToken,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { DEV_AUTH_PASSWORD, DEV_AUTH_HELPER_URL, DEV_PLAYERS, MOCK_DEV_PLAYERS, USE_FIREBASE_EMULATOR } from '../constants/devConfig';
import { connectFirebaseEmulators, getAuthInstance } from '../services/firebase';
import { userService } from '../services/firestore';
import { User } from '../types';

// For Expo Auth Session
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInAsDevUser: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    isEmulator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const KNOWN_DEV_BY_UID = Object.fromEntries(
    [...DEV_PLAYERS, ...MOCK_DEV_PLAYERS].map(p => [p.uid, p])
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Google Auth for mobile (Expo)
    const [, response, promptAsync] = Google.useAuthRequest({
        webClientId: '605611128312-pklemnjv3thmsmqv3kurcgv51t4ufd23.apps.googleusercontent.com',
        iosClientId: 'YOUR_IOS_CLIENT_ID',
        androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    });

    // Handle Google sign in response for mobile
    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            handleGoogleSignIn(authentication?.accessToken);
        }
    }, [response]);

    // Listen to auth state changes
    useEffect(() => {
        connectFirebaseEmulators();
        const unsubscribe = onAuthStateChanged(getAuthInstance(), async (firebaseUser) => {
            if (firebaseUser) {
                await handleFirebaseUser(firebaseUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Handle possible redirect results on web to avoid "missing initial state" noise
    useEffect(() => {
        if (Platform.OS === 'web') {
            (async () => {
                try {
                    const cred = await getRedirectResult(getAuthInstance());
                    if (cred?.user) {
                        await handleFirebaseUser(cred.user);
                    }
                } catch (e) {
                    // Ignore redirect-related errors when no state exists
                    console.debug('No redirect result to process:', e);
                }
            })();
        }
    }, []);

    const handleFirebaseUser = async (
        firebaseUser: FirebaseUser,
        devHint?: { email: string; displayName: string }
    ) => {
        connectFirebaseEmulators();
        let userData: User | null = null;

        try {
            userData = await userService.getUser(firebaseUser.uid);

            if (!userData && firebaseUser.email && firebaseUser.displayName) {
                userData = await userService.createUser(
                    firebaseUser.uid,
                    firebaseUser.displayName,
                    firebaseUser.email,
                    firebaseUser.photoURL || undefined
                );
            }

            if (!userData && USE_FIREBASE_EMULATOR) {
                const known =
                    KNOWN_DEV_BY_UID[firebaseUser.uid] ??
                    (devHint
                        ? {
                              uid: firebaseUser.uid,
                              displayName: devHint.displayName,
                              email: devHint.email,
                          }
                        : null);
                if (known) {
                    userData = await userService.createUser(
                        known.uid,
                        known.displayName,
                        known.email
                    );
                }
            }
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            console.error('Failed to load Firestore profile for', firebaseUser.uid, err);
            if (code === 'permission-denied') {
                throw new Error(
                    USE_FIREBASE_EMULATOR
                        ? 'Firestore permission denied — hard refresh (Cmd+Shift+R) and ensure emulators are running (npm run dev:local).'
                        : 'Firestore permission denied — this account may not exist in production yet.'
                );
            }
            throw err;
        }

        if (!userData) {
            console.warn('Signed in but no Firestore profile for', firebaseUser.uid);
        }

        setUser(userData);
    };

    const handleGoogleSignIn = async (accessToken?: string) => {
        // This is called after successful OAuth on mobile
        // In production, you'd exchange the token for Firebase credentials
        console.log('Google sign in with token:', accessToken);
    };

    const signInWithGoogle = async () => {
        try {
            if (Platform.OS === 'web') {
                // Web: configure persistence, then try popup with graceful fallbacks
                try {
                    await setPersistence(getAuthInstance(), browserLocalPersistence);
                } catch {
                    try {
                        await setPersistence(getAuthInstance(), browserSessionPersistence);
                    } catch {
                        await setPersistence(getAuthInstance(), inMemoryPersistence);
                    }
                }
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                try {
                    const result = await signInWithPopup(getAuthInstance(), provider);
                    await handleFirebaseUser(result.user);
                } catch (err: any) {
                    // If popup is blocked or storage unsupported, fallback to redirect
                    const code = err?.code as string | undefined;
                    if (code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported' || code === 'auth/operation-not-supported-in-this-environment') {
                        await signInWithRedirect(getAuthInstance(), provider);
                        return;
                    }
                    throw err;
                }
            } else {
                // Mobile: Use Expo Auth Session
                promptAsync();
            }
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const signInAsDevUser = async (email: string) => {
        if (!USE_FIREBASE_EMULATOR) {
            throw new Error('Dev sign-in is only available with the Firebase Emulator');
        }
        connectFirebaseEmulators();

        const normalizedEmail = email.trim().toLowerCase();

        try {
            const result = await signInWithEmailAndPassword(getAuthInstance(), normalizedEmail, DEV_AUTH_PASSWORD);
            await handleFirebaseUser(result.user);
            return;
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            if (code !== 'auth/user-not-found' && code !== 'auth/invalid-credential') {
                throw err;
            }
        }

        // Admin-seeded emulator users need a custom token (email/password index is unreliable).
        let tokenResponse: Response;
        try {
            tokenResponse = await fetch(
                `${DEV_AUTH_HELPER_URL}/dev-token?email=${encodeURIComponent(normalizedEmail)}`
            );
        } catch {
            throw new Error(
                'Dev auth helper is not running. Start it with: node scripts/dev/dev-auth-server.js (or npm run dev:local)'
            );
        }

        if (!tokenResponse.ok) {
            throw new Error(
                'Dev account not found. Run npm run dev:seed with emulators running, then try again.'
            );
        }

        const { token, displayName } = (await tokenResponse.json()) as {
            token: string;
            displayName?: string;
            uid?: string;
            email?: string;
        };
        const result = await signInWithCustomToken(getAuthInstance(), token);
        await handleFirebaseUser(result.user, {
            email: normalizedEmail,
            displayName: displayName || normalizedEmail.split('@')[0],
        });
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(getAuthInstance());
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInAsDevUser, signOut, isEmulator: USE_FIREBASE_EMULATOR }}>
            {children}
        </AuthContext.Provider>
    );
};
