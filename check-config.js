/**
 * Simple diagnostic script
 * Run with: node check-config.js
 */

// Simulate the config from your firebase.ts
const firebaseConfig = {
    apiKey: "AIzaSyA2hN4pECNQfFEkXXjMHBSd1vwZ1ZCxvlY",
    authDomain: "core-four-score.firebaseapp.com",
    projectId: "core-four-score",
    storageBucket: "core-four-score.firebasestorage.app",
    messagingSenderId: "605611128312",
    appId: "1:605611128312:web:3a723fa2f74aa9cc18920d"
};

const webClientId = '605611128312-pklemnjv3thmsmqv3kurcgv51t4ufd23.apps.googleusercontent.com';

console.log('=== CONFIGURATION CHECK ===\n');

console.log('✓ Firebase Config:');
console.log(`  API Key: ${firebaseConfig.apiKey.substring(0, 15)}...`);
console.log(`  Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`  Project ID: ${firebaseConfig.projectId}`);
console.log(`  App ID: ${firebaseConfig.appId}`);

console.log('\n✓ Google OAuth:');
console.log(`  Web Client ID: ${webClientId}`);

console.log('\n=== VALIDATION ===\n');

const checks = [];

// Check 1: Firebase config is not placeholder
checks.push({
    name: 'Firebase config updated',
    pass: firebaseConfig.apiKey !== 'YOUR_API_KEY',
    value: firebaseConfig.apiKey !== 'YOUR_API_KEY' ? '✓ YES' : '✗ NO - Still has placeholder'
});

// Check 2: Project ID matches
checks.push({
    name: 'Project ID correct',
    pass: firebaseConfig.projectId === 'core-four-score',
    value: firebaseConfig.projectId
});

// Check 3: Web Client ID is valid format
checks.push({
    name: 'Web Client ID format',
    pass: webClientId.includes('apps.googleusercontent.com') && !webClientId.includes('YOUR_'),
    value: webClientId.includes('YOUR_') ? '✗ Still placeholder' : '✓ Valid'
});

// Check 4: Auth domain matches project
checks.push({
    name: 'Auth domain matches',
    pass: firebaseConfig.authDomain.includes('core-four-score'),
    value: firebaseConfig.authDomain
});

checks.forEach(check => {
    const status = check.pass ? '✓' : '✗';
    console.log(`${status} ${check.name}: ${check.value}`);
});

const allPassed = checks.every(c => c.pass);

console.log('\n=== RESULT ===\n');

if (allPassed) {
    console.log('✓ All checks passed! Configuration looks good.');
    console.log('\nNext steps:');
    console.log('1. Make sure you enabled Google Sign-in in Firebase Console');
    console.log('2. Add localhost to authorized domains (Firebase → Authentication → Settings)');
    console.log('3. Restart your dev server: npx expo start -c');
    console.log('4. Open in web browser and try signing in');
} else {
    console.log('✗ Some checks failed. Review the configuration above.');
}

console.log('\n=========================\n');
