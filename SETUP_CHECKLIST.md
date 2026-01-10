# ✅ Setup Checklist

Use this checklist to ensure your Core Four Score app is fully configured and ready to use.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Google account (for Firebase)
- [ ] Code editor (VS Code recommended)
- [ ] For iOS: Mac with Xcode or Expo Go app
- [ ] For Android: Android Studio or Expo Go app

## Phase 1: Initial Setup

### 1. Dependencies
- [ ] Run `npm install`
- [ ] All packages installed without errors
- [ ] No peer dependency warnings

### 2. Firebase Project
- [ ] Created Firebase project at console.firebase.google.com
- [ ] Project name: ________________
- [ ] Project ID: ________________

### 3. Firestore Database
- [ ] Enabled Firestore Database
- [ ] Region selected: ________________
- [ ] Created `users` collection
- [ ] Created `tournaments` collection
- [ ] Created `games` collection
- [ ] Created `renegs` collection

### 4. Firestore Security Rules
- [ ] Copied security rules from FIREBASE_SETUP.md
- [ ] Rules published
- [ ] Rules tested in Firebase Console

### 5. Firebase Authentication
- [ ] Enabled Authentication
- [ ] Enabled Google Sign-In provider
- [ ] Added support email

### 6. Firebase Configuration
- [ ] Copied Firebase config from Project Settings
- [ ] Updated `services/firebase.ts` with:
  - [ ] apiKey
  - [ ] authDomain
  - [ ] projectId
  - [ ] storageBucket
  - [ ] messagingSenderId
  - [ ] appId

## Phase 2: Google OAuth Setup

### Web OAuth
- [ ] Opened Google Cloud Console
- [ ] Found Web Client ID in Credentials
- [ ] Web Client ID: ________________

### iOS OAuth (if building for iOS)
- [ ] Created iOS OAuth Client ID
- [ ] Bundle ID matches app.json: `com.corefour.score`
- [ ] iOS Client ID: ________________

### Android OAuth (if building for Android)
- [ ] Created Android OAuth Client ID
- [ ] Package name matches app.json: `com.corefour.score`
- [ ] Got SHA-1 fingerprint with keytool
- [ ] Android Client ID: ________________

### Update Code
- [ ] Updated `contexts/AuthContext.tsx` with all Client IDs
- [ ] Saved file

## Phase 3: First Run

### Start Development Server
- [ ] Run `npm start`
- [ ] Metro bundler starts without errors
- [ ] QR code appears in terminal

### Test on Web
- [ ] Run `npm run web` or press 'w' in terminal
- [ ] Browser opens to localhost:8081
- [ ] App loads without errors
- [ ] See login screen with "Sign In with Google" button

### Test on Mobile (Optional)
- [ ] Install Expo Go on phone
- [ ] Scan QR code
- [ ] App loads on phone
- [ ] See login screen

## Phase 4: Authentication Testing

### Sign In
- [ ] Click "Sign In with Google"
- [ ] Google sign-in popup appears
- [ ] Select your Google account
- [ ] Authentication succeeds
- [ ] See "Ope'Land" home screen
- [ ] Your name appears in welcome message

### Check Firestore
- [ ] Open Firebase Console → Firestore
- [ ] See new document in `users` collection
- [ ] Document ID matches your User UID
- [ ] Document has fields: displayName, email, stats

### Your User UID
- [ ] Open Firebase Console → Authentication
- [ ] Find your account
- [ ] Copy your User UID: ________________

## Phase 5: Tournament Setup

### Create Default Tournament
- [ ] Open Firebase Console → Firestore
- [ ] Click `tournaments` collection
- [ ] Add document with ID: `default-tournament`
- [ ] Add fields:
  ```
  name: "The Core Four"
  memberIds: [array]
  createdAt: [timestamp now]
  updatedAt: [timestamp now]
  ```
- [ ] Save document

### Add Members
- [ ] Add your User UID to `memberIds` array
- [ ] Add other players' UIDs as they sign up
- [ ] Save changes

### Add Other Players
- [ ] Have each player sign in to the app
- [ ] Note their User UIDs from Authentication tab
- [ ] Add their UIDs to tournament `memberIds`

## Phase 6: Feature Testing

### Ope'Land (Home)
- [ ] Can see leaderboard (empty at first)
- [ ] "START NEW GAME" button appears
- [ ] Pull-to-refresh works
- [ ] Sign Out button works


## Phase 7: Build Testing (Optional)

### Web Build
- [ ] Run `npm run build:web`
- [ ] Build completes without errors
- [ ] `dist` folder created
- [ ] Can preview with `npx serve dist`

### iOS Build (Mac only)
- [ ] Run `npm run ios`
- [ ] Simulator opens
- [ ] App loads correctly

### Android Build
- [ ] Run `npm run android`
- [ ] Emulator starts
- [ ] App loads correctly

## Troubleshooting

If you checked a box but it's not working:

### Firebase Connection Issues
- [ ] Verified config in services/firebase.ts
- [ ] Checked browser console for errors
- [ ] Verified Firestore security rules
- [ ] Tried clearing cache: `npx expo start -c`

### Authentication Issues
- [ ] Verified OAuth Client IDs in contexts/AuthContext.tsx
- [ ] Checked authorized domains in Firebase Console
- [ ] Tested in incognito mode (to rule out cookies)
- [ ] Checked browser console for specific errors

### Team Generator Issues
- [ ] Verified you're added to tournament memberIds
- [ ] Confirmed tournament ID is 'default-tournament'
- [ ] Checked that other users have signed in at least once

### Build Issues
- [ ] Ran `rm -rf node_modules && npm install`
- [ ] Ran `npx expo start -c` to clear cache
- [ ] Checked for TypeScript errors in VS Code
- [ ] Updated Expo CLI: `npm install -g expo-cli@latest`

## Configuration Record

Keep this for reference:

**Firebase Project**
- Project ID: ________________
- Region: ________________

**OAuth Client IDs**
- Web: ________________
- iOS: ________________
- Android: ________________

**Tournament**
- Tournament ID: default-tournament
- Member UIDs: 
  1. ________________
  2. ________________
  3. ________________
  4. ________________

**First Test Date**: ________________

## Next Steps After Setup

Once everything is checked off:

1. [ ] Read [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for overview
2. [ ] Review [README.md](./README.md) for full documentation
3. [ ] Plan Phase 2 features (Score Keeping, Renegs)
4. [ ] Add more tournament members
5. [ ] Start tracking games!

---

**Setup Status**: ⬜ Not Started | 🟨 In Progress | ✅ Complete

Mark this document as you go!
