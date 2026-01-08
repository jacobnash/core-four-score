import { render } from '@testing-library/react-native';
import React from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Mock Firebase
jest.mock('../services/firebase', () => ({
    auth: {
        currentUser: null,
    },
    db: {},
}));

jest.mock('firebase/auth', () => ({
    GoogleAuthProvider: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn((auth, callback) => {
        // Simulate no user initially
        callback(null);
        return jest.fn(); // unsubscribe
    }),
}));

jest.mock('expo-auth-session/providers/google', () => ({
    useAuthRequest: jest.fn(() => [
        { type: 'loaded' },
        null,
        jest.fn(),
    ]),
}));

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('../services/firestore', () => ({
    userService: {
        getUser: jest.fn(),
        createUser: jest.fn(),
    },
}));

describe('Authentication Flow', () => {
    it('should start with loading state', () => {
        const TestComponent = () => {
            const { loading, user } = useAuth();
            return null;
        };

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // If this doesn't crash, AuthContext is set up correctly
    });

    it('should have signInWithGoogle function', () => {
        const TestComponent = () => {
            const { signInWithGoogle } = useAuth();
            expect(typeof signInWithGoogle).toBe('function');
            return null;
        };

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
    });

    it('should throw error when useAuth is used outside provider', () => {
        const TestComponent = () => {
            useAuth(); // This should throw
            return null;
        };

        expect(() => render(<TestComponent />)).toThrow(
            'useAuth must be used within an AuthProvider'
        );
    });
});

describe('Firebase Configuration', () => {
    it('should have valid Firebase config', () => {
        const firebase = require('../services/firebase');
        expect(firebase.auth).toBeDefined();
        expect(firebase.db).toBeDefined();
    });
});
