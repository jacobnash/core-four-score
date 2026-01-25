# 🔥 Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Name it "Core Four Score" (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create Project"

## Step 2: Enable Firestore Database

1. In Firebase Console, click "Firestore Database" in the left menu
2. Click "Create Database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select your preferred Cloud Firestore location (choose closest to your users)
5. Click "Enable"

## Step 3: Set Up Collections

### Create Initial Structure

In Firestore, create these collections (they can be empty for now):

1. **users** collection
   - Auto-populated when users sign in
   - Structure: `{ displayName, email, photoURL, stats: { wins, renegs, gamesPlayed } }`

2. **tournaments** collection
   - Create a document with ID `default-tournament`
   - Fields:
     ```json
     {
       "name": "The Core Four",
       "memberIds": ["USER_UID_1", "USER_UID_2", "USER_UID_3", "USER_UID_4"],
       "createdAt": [TIMESTAMP],
       "updatedAt": [TIMESTAMP]
     }
     ```

3. **games** collection
   - Auto-populated when games are recorded

4. **renegs** collection
   - Auto-populated when renegs are logged

### Security Rules

> Policy: Never delete data. Use archival fields and status transitions instead of deletes.

Replace the default rules with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read all user profiles, but only write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Tournament members can read tournaments they belong to
    match /tournaments/{tournamentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.memberIds;
    }
    
    // All authenticated users can read and write games
    match /games/{gameId} {
      allow read, write: if request.auth != null;
    }
    
    // All authenticated users can read and write renegs
    match /renegs/{renegId} {
      allow read, write: if request.auth != null;
    }
    
    // Optional: Rules collection (read-only)
    match /rules/{ruleId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins via Firebase Console
    }
  }
}
```

## Step 4: Enable Authentication

1. In Firebase Console, click "Authentication" in the left menu
2. Click "Get Started"
3. Click "Sign-in method" tab
4. Click "Google"
5. Toggle "Enable"
6. Set a project support email
7. Click "Save"

## Step 5: Get Firebase Configuration

1. In Firebase Console, click the gear icon (⚙️) → "Project Settings"
2. Scroll down to "Your apps"
3. Click the Web icon (`</>`) to add a web app
4. Register app name: "Core Four Score Web"
5. Copy the Firebase configuration object

### Update Your Code

Open `services/firebase.ts` and replace the config:

```typescript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

## Step 6: Configure Google OAuth

### For Web

1. Firebase automatically creates OAuth credentials for Web
2. Find them in [Google Cloud Console](https://console.cloud.google.com)
3. Navigate to: APIs & Services → Credentials
4. Note the Web Client ID

### For iOS

1. In Google Cloud Console → Credentials
2. Create OAuth 2.0 Client ID
3. Type: iOS
4. Bundle ID: `com.corefour.score` (or your bundle ID from app.json)
5. Copy the iOS Client ID

### For Android

1. In Google Cloud Console → Credentials
2. Create OAuth 2.0 Client ID
3. Type: Android
4. Package name: `com.corefour.score`
5. Get SHA-1 certificate fingerprint:
   ```bash
   # Debug certificate
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
6. Copy the Android Client ID

### Update Your Code

Open `contexts/AuthContext.tsx` and replace:

```typescript
const [request, response, promptAsync] = Google.useAuthRequest({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
});
```

## Step 7: Authorized Domains

1. Firebase Console → Authentication → Settings
2. Scroll to "Authorized domains"
3. Add your domains:
   - `localhost` (for development)
   - Your custom domain (for production)

## Step 8: Initialize Tournament Data

Create a test tournament and add your user:

1. Sign in to the app with Google
2. Note your User UID from Firebase Console → Authentication
3. Go to Firestore → tournaments → default-tournament
4. Update `memberIds` array with your UID
5. Add other player UIDs as they sign in

## Testing Checklist

- [ ] Can sign in with Google
- [ ] User profile is created in Firestore
- [ ] Can view Ope'Land (leaderboard)
- [ ] Can generate teams
- [ ] Security rules prevent unauthorized access

## Troubleshooting

### "Missing or insufficient permissions"

- Check Firestore security rules
- Ensure user is authenticated
- Verify user UID is in tournament memberIds

### Google Sign-In fails on mobile

- Verify Client IDs are correct
- For iOS: Add URL scheme to app.json
- For Android: Verify SHA-1 fingerprint

### Collections not showing up

- Create at least one document in each collection
- Firestore doesn't show empty collections

## Next Steps

1. ✅ Basic authentication working
2. ✅ Firestore collections created
3. ✅ Security rules applied
4. 🔲 Add more tournament members
5. 🔲 Create first game
6. 🔲 Test leaderboard updates
