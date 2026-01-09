# 🦌 The Core Four Score - Deer Camp Edition

A Euchre tournament companion app built with React Native (Expo) featuring a rustic "Midwest Deer Camp" theme. Track stats, wins, and the infamous "Wall of Shame" (renegs) for your Euchre tournaments.

## 🎯 Features

- **The Lodge (Home Dashboard)**: Leaderboard with wins, win percentage, and reneg counts
- **Google Authentication**: Secure sign-in with Google accounts
- **Real-time Stats**: Firebase Firestore backend for live data sync
- **Cross-Platform**: Works on iOS, Android (Expo Go), and Web (PWA)

## 🎨 Theme

- **Blaze Orange** (#FF6700): Primary actions and highlights
- **Forest Green** (#013220): Backgrounds and cards
- **Cream/Parchment** (#F5F5DC): Text and borders

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on your phone

### Installation

1. **Clone and install dependencies**
   ```bash
   cd core-score
   npm install
   ```

2. **Configure Firebase**
   
   a. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   
   b. Enable Firestore Database
   
   c. Enable Authentication → Google Sign-In
   
   d. Update [services/firebase.ts](services/firebase.ts) with your Firebase config:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Configure Google Sign-In**

   a. Get OAuth 2.0 Client IDs from [Google Cloud Console](https://console.cloud.google.com)
   
   b. Update [contexts/AuthContext.tsx](contexts/AuthContext.tsx):
   ```typescript
   const [request, response, promptAsync] = Google.useAuthRequest({
     webClientId: 'YOUR_WEB_CLIENT_ID',
     iosClientId: 'YOUR_IOS_CLIENT_ID',
     androidClientId: 'YOUR_ANDROID_CLIENT_ID',
   });
   ```

4. **Set up Firestore Collections**

   Create these collections in Firebase Console:
   
   - `users`: User profiles and stats
   - `tournaments`: Tournament information
   - `games`: Game records
   - `renegs`: The Wall of Shame

   Sample Firestore rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth.uid == userId;
       }
       match /tournaments/{tournamentId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       match /games/{gameId} {
         allow read, write: if request.auth != null;
       }
       match /renegs/{renegId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### Running the App

#### Development Mode

```bash
# Start the development server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android

# Run on Web
npm run web
```

#### Using Expo Go

1. Install Expo Go on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Run `npm start`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

### Building for Production

#### Web (PWA)

```bash
# Build for web
npm run build:web

# Preview the build
npx serve dist

# Deploy to Firebase Hosting
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### iOS/Android (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas login
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

## 📁 Project Structure

```
core-score/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home (The Lodge)
│   └── _layout.tsx        # Root layout with AuthProvider
├── components/            # Reusable UI components
│   ├── Button.tsx
│   ├── LeaderboardCard.tsx
│   └── PlayerCheckbox.tsx
├── contexts/              # React Context providers
│   └── AuthContext.tsx    # Authentication state
├── services/              # Firebase services
│   ├── firebase.ts        # Firebase config
│   └── firestore.ts       # Firestore CRUD operations
├── types/                 # TypeScript interfaces
│   └── index.ts
├── hooks/                 # Custom React hooks
├── global.css             # Tailwind CSS
├── tailwind.config.js     # Tailwind configuration
└── app.json               # Expo configuration
```

## 🎮 Usage

### First-Time Setup

1. Sign in with your Google account
2. The app will create your user profile automatically
3. Create a tournament or join an existing one (requires Firebase setup)

### Playing Games

1. Start the game and track scores
2. Log renegs with the "Game Warden Citation" modal

### Viewing Stats

- The Lodge displays the leaderboard with:
  - Rank
  - Wins
  - Win percentage
  - Total games played
  - Reneg count (Wall of Shame indicator)

## 🔧 Configuration

### Tournament Setup

Update the `TOURNAMENT_ID` constant in:
- [app/(tabs)/index.tsx](app/(tabs)/index.tsx)
- [app/(tabs)/two.tsx](app/(tabs)/two.tsx)

Or create a tournament selection screen to allow users to switch between tournaments.

### Customizing Colors

Edit [tailwind.config.js](tailwind.config.js):

```javascript
colors: {
  'brand-orange': '#FF6700',  // Blaze Orange
  'forest-green': '#013220',   // Forest Green
  'cream': '#F5F5DC',          // Parchment/Cream
}
```

## 🧪 Testing

### Unit Tests

```bash
# Run unit tests (when implemented)
npm test
```

### Manual Testing Checklist

- [ ] Google Sign-In works on Web
- [ ] Google Sign-In works on Mobile
- [ ] Leaderboard displays correctly
- [ ] Team generator shuffles randomly
- [ ] Stats update after games
- [ ] Reneg logging works
- [ ] Auth persists on app restart

## 🐛 Troubleshooting

### Firebase Connection Issues

- Verify your Firebase config in `services/firebase.ts`
- Check Firestore security rules
- Ensure collections exist in Firebase Console

### Google Sign-In Not Working

- Verify OAuth 2.0 Client IDs in Google Cloud Console
- Add authorized domains in Firebase Authentication settings
- For iOS: Add URL scheme to `app.json`

### NativeWind/Tailwind Not Working

- Ensure `global.css` is imported in `app/_layout.tsx`
- Clear Metro bundler cache: `npx expo start -c`
- Verify `nativewind-env.d.ts` exists

### Build Errors

- Clear cache: `npx expo start -c`
- Clean install: `rm -rf node_modules && npm install`
- Update dependencies: `npx expo install --fix`

## 📦 Dependencies

### Core

- `expo`: ~52.0.0
- `expo-router`: Latest
- `react-native`: Latest
- `firebase`: ^10.0.0

### UI/Styling

- `nativewind`: Latest
- `tailwindcss`: Latest

### Authentication

- `@react-native-google-signin/google-signin`: Latest
- `expo-auth-session`: Latest
- `expo-crypto`: Latest
- `expo-web-browser`: Latest

### Storage

- `@react-native-async-storage/async-storage`: Latest

## 🚧 Future Enhancements

- [ ] Score Keeping Screen ("The Blind")
- [ ] Reneg Modal ("Game Warden Citation")
- [ ] Wall of Shame Screen
- [ ] Game History
- [ ] Player Profiles
- [ ] Unwritten Rules Collection
- [ ] Push Notifications
- [ ] Offline Support
- [ ] Buffalo Check Pattern Headers
- [ ] GSP/Irish Setter Mascot Integration

## 📝 License

Private project for The Core Four tournament group.

## 🤝 Contributing

This is a private tournament app. Contact the project owner for collaboration.

---

Built with ❤️ for The Core Four
