# 🚀 Quick Start Guide

Get The Core Four Score running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version
npm --version

# Install Expo CLI globally (if not installed)
npm install -g expo-cli
```

## 1. Install Dependencies

```bash
cd /Users/jnash/Source/core-score
npm install
```

## 2. Configure Firebase (Required)

### Option A: Quick Test Setup

For testing without Firebase initially, you can run the app but sign-in won't work until Firebase is configured.

### Option B: Full Firebase Setup (Recommended)

Follow the detailed [Firebase Setup Guide](./FIREBASE_SETUP.md) or quick steps:

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication → Google Sign-In
4. Copy your config to `services/firebase.ts`

```typescript
// services/firebase.ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

5. Get Google OAuth Client IDs and update `contexts/AuthContext.tsx`

## 3. Run the App

### Web (Easiest for testing)

```bash
npm run web
```

Opens at [http://localhost:8081](http://localhost:8081)

### iOS Simulator (Mac only)

```bash
npm run ios
```

### Android Emulator

```bash
npm run android
```

### Expo Go (Physical Device)

```bash
npm start
```

Then scan the QR code with:
- iOS: Camera app
- Android: Expo Go app

## 4. Test the App

### Without Firebase (Limited)

- App will load
- UI is visible
- Sign-in will fail (expected)

### With Firebase Configured

1. Click "Sign In with Google"
2. Authenticate with your Google account
3. You should see "The Lodge" home screen
4. Go to "Shake the Hat" tab

### First-Time Setup

After signing in, you need to add yourself to a tournament:

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Create a collection called `tournaments`
4. Add a document with ID: `default-tournament`
5. Add fields:
   ```json
   {
     "name": "The Core Four",
     "memberIds": ["YOUR_USER_UID"],
     "createdAt": [current timestamp],
     "updatedAt": [current timestamp]
   }
   ```
6. Find your User UID in Authentication section
7. Refresh the app

## 5. Common Issues

### "Module not found" errors

```bash
# Clear cache and restart
npx expo start -c
```

### Tailwind styles not working

```bash
# Verify global.css is imported
# Check metro.config.js has NativeWind
# Restart with cache clear
npx expo start -c
```

### Firebase connection errors

- Check `services/firebase.ts` has correct config
- Verify Firestore security rules allow read/write
- Check browser console for detailed errors

### Google Sign-In not working

- Verify OAuth Client IDs in `contexts/AuthContext.tsx`
- For Web: Check authorized domains in Firebase Console
- For Mobile: Verify bundle identifiers match

## 6. Development Tips

### Hot Reload

- Save any file to see changes immediately
- Press `r` in terminal to reload manually
- Press `j` to open debugger

### Viewing Logs

```bash
# In the Expo terminal
# Press `m` to toggle menu
# Or check browser console (web)
```

### Testing on Multiple Devices

Start the server once, then connect multiple devices:

```bash
npm start

# Scan QR code on multiple phones
# Or open localhost:8081 in multiple browsers
```

## 7. Project Structure Quick Reference

```
app/(tabs)/
├── index.tsx          # Home (The Lodge)
└── two.tsx            # Team Generator (Shake the Hat)

components/
├── Button.tsx         # Reusable button
├── LeaderboardCard.tsx # Player stats card
└── PlayerCheckbox.tsx  # Player selection

services/
├── firebase.ts        # Firebase config (EDIT THIS)
└── firestore.ts       # Database operations

contexts/
└── AuthContext.tsx    # Authentication (EDIT FOR OAUTH)
```

## 8. What to Build Next

Now that the foundation is working:

1. ✅ Home Dashboard (The Lodge) - Done
2. ✅ Team Generator (Shake the Hat) - Done
3. 🔲 Score Keeping Screen
4. 🔲 Reneg Modal (Game Warden Citation)
5. 🔲 Wall of Shame Screen
6. 🔲 Game History

## Need Help?

1. Check [README.md](./README.md) for detailed documentation
2. Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase issues
3. Clear cache: `npx expo start -c`
4. Reinstall: `rm -rf node_modules && npm install`

## Success Checklist

- [ ] App starts without errors
- [ ] Can see login screen
- [ ] Firebase is configured
- [ ] Can sign in with Google
- [ ] Home screen shows leaderboard
- [ ] Team generator shows players
- [ ] Can shuffle teams

🎉 You're ready to track Euchre glory!
