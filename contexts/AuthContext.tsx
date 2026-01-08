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
    signInWithPopup,
    signInWithRedirect
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth } from '../services/firebase';
import { userService } from '../services/firestore';
import { User } from '../types';

// For Expo Auth Session
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Google Auth for mobile (Expo)
    const [request, response, promptAsync] = Google.useAuthRequest({
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
                    const cred = await getRedirectResult(auth);
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

    const handleFirebaseUser = async (firebaseUser: FirebaseUser) => {
        // Check if user exists in Firestore
        let userData = await userService.getUser(firebaseUser.uid);

        // If not, create the user
        if (!userData && firebaseUser.email && firebaseUser.displayName) {
            userData = await userService.createUser(
                firebaseUser.uid,
                firebaseUser.displayName,
                firebaseUser.email,
                firebaseUser.photoURL || undefined
            );
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
                    await setPersistence(auth, browserLocalPersistence);
                } catch {
                    try {
                        await setPersistence(auth, browserSessionPersistence);
                    } catch {
                        await setPersistence(auth, inMemoryPersistence);
                    }
                }
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                try {
                    const result = await signInWithPopup(auth, provider);
                    await handleFirebaseUser(result.user);
                } catch (err: any) {
                    // If popup is blocked or storage unsupported, fallback to redirect
                    const code = err?.code as string | undefined;
                    if (code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported' || code === 'auth/operation-not-supported-in-this-environment') {
                        await signInWithRedirect(auth, provider);
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

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
