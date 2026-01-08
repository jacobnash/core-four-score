/**
 * Data Migration Script
 * Import historical game data into Firestore
 * 
 * Run with: node import-data.js
 */

const fs = require('fs');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const serviceAccountPath = process.env.SERVICE_ACCOUNT || './serviceAccountKey.json';
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at ${serviceAccountPath}. Set SERVICE_ACCOUNT or place serviceAccountKey.json at project root.`);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

// Historical game data
const games = [
    { date: '9/2/22', games: 2, cait: 0, dylan: 2, grace: 0, jacob: 2, location: 'Tahoe' },
    { date: '9/3/22', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Tahoe' },
    { date: '9/4/22', games: 4, cait: 3, dylan: 1, grace: 2, jacob: 2, location: 'Tahoe' },
    { date: '9/5/22', games: 3, cait: 1, dylan: 3, grace: 1, jacob: 1, location: 'Tahoe' },
    { date: '9/14/22', games: 2, cait: 0, dylan: 2, grace: 1, jacob: 1, location: 'Temescal Brewing' },
    { date: '9/21/22', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: '2P' },
    { date: '10/12/22', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: '2P' },
    { date: '11/18/22', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/4/23', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/5/23', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/12/23', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/16/23', games: 2, cait: 1, dylan: 1, grace: 0, jacob: 2, location: 'Restlehold Oak' },
    { date: '1/29/23', games: 2, cait: 0, dylan: 2, grace: 1, jacob: 1, location: 'Sante Adarius' },
    // Add more as needed...
];

// Player mappings (you'll need to replace these with actual Firebase UIDs after first sign-in)
const players = {
    cait: { name: 'Cait', uid: 'SvmJSd43QveWNKw8w1qEh0zulTm1', email: 'caitlynn.nash@gmail.com' },
    dylan: { name: 'Dylan', uid: 'dylan-placeholder', email: 'dylan@example.com' },
    grace: { name: 'Grace', uid: 'WDzkjttsK9g4Uobrywwe8o2nbtN2', email: 'grace.studden@gmail.com' },
    jacob: { name: 'Jacob', uid: 'lkW4ipmG1FM8MYtWI0JlUpqutzv1', email: 'jacobloydnash@gmail.com' },
};

// Calculate totals from your spreadsheet
const totals = {
    cait: { wins: 58, games: 140, renegs: 12 },
    dylan: { wins: 80, games: 140, renegs: 6 },
    grace: { wins: 62, games: 140, renegs: 6 },
    jacob: { wins: 82, games: 140, renegs: 3 },
};

// Historical renegs with excuses
const renegs = [
    { date: '11/29/23', player: 'dylan', excuse: 'I was distracted and was playing from the kitty' },
    { date: '12/6/23', player: 'cait', excuse: 'Excitement / Chestnuts' },
    { date: '12/29/23', player: 'dylan', excuse: "None I'm stupid" },
    { date: '1/23/24', player: 'cait', excuse: 'I was just too excited' },
    { date: '2/27/24', player: 'grace', excuse: 'I forgot that I dealt' },
    { date: '3/10/24', player: 'cait', excuse: "My whole brain isn't working today. I don't know. The food was so spicy." },
    { date: '8/21/24', player: 'dylan', excuse: 'I was queuing up Billy Joel and I had one too many Vieux Carres' },
    { date: '9/18/24', player: 'grace', excuse: 'Irish setter commercial' },
    { date: '9/23/24', player: 'jacob', excuse: "Randall Restle is supposed to have a good website, and obviously 'Cait, radio shacks don't exist anymore'" },
    { date: '9/29/24', player: 'cait', excuse: "I grabbed the wrong hand. It's not an excuse but it's all that I have" },
    { date: '11/14/24', player: 'cait', excuse: 'No excuse. I just forgot that I had a heart - Heartless Cait' },
    { date: '12/10/24', player: 'cait', excuse: "I thought we were playing clubs. Jake didn't argue it hard enough" },
    { date: '6/13/25', player: 'cait', excuse: 'I thought it was my lead' },
    { date: '10/30/25', player: 'grace', excuse: 'There was a cat eating canned cat food on the table next to us' },
    { date: '10/3/25', player: 'dylan', excuse: "I don't know. I finally had good cards" },
];

async function importData() {
    console.log('=== STARTING DATA IMPORT ===\n');

    try {
        // Step 1: Create tournament
        console.log('Creating tournament...');
        const tournamentRef = db.collection('tournaments').doc('default-tournament');
        await tournamentRef.set({
            name: 'The Core Four',
            memberIds: Object.values(players).map(p => p.uid),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log('✓ Tournament created\n');

        // Step 2: Create user profiles with stats
        console.log('Creating user profiles...');
        for (const [key, player] of Object.entries(players)) {
            const userRef = db.collection('users').doc(player.uid);
            await userRef.set({
                displayName: player.name,
                email: player.email,
                photoURL: null,
                stats: {
                    wins: totals[key].wins,
                    renegs: totals[key].renegs,
                    gamesPlayed: totals[key].games
                },
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            console.log(`✓ Created profile for ${player.name}: ${totals[key].wins} wins in ${totals[key].games} games`);
        }
        console.log('');

        // Step 3: Import sample games (just a few for demonstration)
        console.log('Importing sample games...');
        let importCount = 0;
        for (const game of games.slice(0, 10)) { // Import first 10 for demo
            const gameRef = db.collection('games').doc();

            // Parse date
            const [month, day, year] = game.date.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            const gameDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

            // Create game document (simplified - one per entry)
            await gameRef.set({
                timestamp: Timestamp.fromDate(gameDate),
                location: game.location,
                teams: [
                    {
                        playerIds: [players.cait.uid, players.dylan.uid],
                        score: Math.max(game.cait, game.dylan),
                        isWinner: (game.cait + game.dylan) > (game.grace + game.jacob)
                    },
                    {
                        playerIds: [players.grace.uid, players.jacob.uid],
                        score: Math.max(game.grace, game.jacob),
                        isWinner: (game.grace + game.jacob) > (game.cait + game.dylan)
                    }
                ],
                tags: [],
                notes: `Historical game from ${game.date}`,
                tournamentId: 'default-tournament'
            });

            importCount++;
        }
        console.log(`✓ Imported ${importCount} sample games\n`);

        // Step 4: Import renegs (The Wall of Shame!)
        console.log('Importing renegs (Wall of Shame)...');
        for (const reneg of renegs) {
            const renegRef = db.collection('renegs').doc();

            // Parse date
            const [month, day, year] = reneg.date.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            const renegDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

            await renegRef.set({
                playerId: players[reneg.player].uid,
                gameId: 'historical',
                excuse: reneg.excuse,
                timestamp: Timestamp.fromDate(renegDate)
            });
        }
        console.log(`✓ Imported ${renegs.length} renegs with excuses\n`);

        console.log('=== IMPORT COMPLETE ===\n');
        console.log('Next steps:');
        console.log('1. Have each player sign in with their real Google account');
        console.log('2. Get their Firebase UIDs from Authentication tab');
        console.log('3. Update the tournament memberIds with real UIDs');
        console.log('4. Delete placeholder users and re-import if needed\n');

    } catch (error) {
        console.error('✗ Error during import:', error);
    }

    process.exit(0);
}

importData();
