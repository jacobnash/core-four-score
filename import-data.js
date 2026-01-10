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

// Import flags
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const SKIP_USER_STATS = String(process.env.SKIP_USER_STATS || 'true').toLowerCase() === 'true';

// Historical game data - 140 games with individual wins per player
const games = [
    // Game data with win/loss indicators (1 = won, 0 = lost)
    // Each row represents a single game - players with 1 won, players with 0 lost
    { date: '9/2/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Tahoe' },
    { date: '9/2/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Tahoe' },
    { date: '9/3/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Tahoe' },
    { date: '9/4/2022', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Tahoe' },
    { date: '9/4/2022', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Tahoe' },
    { date: '9/4/2022', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Tahoe' },
    { date: '9/4/2022', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Tahoe' },
    { date: '9/5/2022', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Tahoe' },
    { date: '9/5/2022', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Tahoe' },
    { date: '9/5/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Tahoe' },
    { date: '9/14/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Temescal Brewing' },
    { date: '9/14/2022', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Temescal Brewing' },
    { date: '9/21/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: '2P' },
    { date: '10/12/2022', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: '2P' },
    { date: '11/18/2022', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/4/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/5/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/12/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/16/2023', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/16/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '1/29/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Sante Adarius' },
    { date: '1/29/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Sante Adarius' },
    { date: '3/27/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold Oak' },
    { date: '3/30/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Cellarmaker' },
    { date: '4/5/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Bar near Sotto Mare' },
    { date: '4/12/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Bitter End' },
    { date: '4/15/2023', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Sante Adarius' },
    { date: '5/3/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashhold Oak' },
    { date: '5/18/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Sante Adarius' },
    { date: '7/12/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'OP' },
    { date: '8/9/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '8/15/2023', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Restle Household SF' },
    { date: '9/4/2023', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold SF' },
    { date: '9/13/2023', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Thee Parkside' },
    { date: '9/28/2023', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Harmonic' },
    { date: '9/28/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Harmonic' },
    { date: '9/29/2023', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Toronado' },
    { date: '9/29/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Toronado' },
    { date: '10/10/2026', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Unknown' },
    { date: '10/10/2026', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Unknown' },
    { date: '11/7/2023', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Laughing Monk' },
    { date: '11/7/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Laughing Monk' },
    { date: '11/14/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Church Key' },
    { date: '11/14/2023', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Church Key' },
    { date: '11/15/2023', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold SF' },
    { date: '11/15/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Nashhold SF' },
    { date: '11/29/2023', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Thee Parkside' },
    { date: '11/29/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Thee Parkside' },
    { date: '12/3/2023', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Clif' },
    { date: '12/6/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold SF' },
    { date: '12/6/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Nashhold SF' },
    { date: '12/13/2023', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold SF' },
    { date: '12/20/2023', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Restle hold' },
    {
        date: '12/29/2023', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Restles'
    },
    { date: '12/30/2023', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold SF' },
    { date: '1/3/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold SF' },
    { date: '1/7/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashhold SF' },
    { date: '1/10/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '1/17/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashhold SF' },
    { date: '1/23/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Restle hold' },
    { date: '1/28/2024', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Restle hold' },
    { date: '1/30/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Nash hold' },
    { date: '1/31/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold' },
    { date: '2/7/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Olfactory' },
    { date: '2/7/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '2/21/2024', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Nashhold' },
    { date: '2/23/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold' },
    { date: '2/28/2024', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '2/28/2024', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '2/29/2024', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Restle hold' },
    { date: '2/29/2024', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Restle hold' },
    { date: '3/1/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold' },
    { date: '3/1/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold' },
    { date: '3/6/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold' },
    { date: '3/10/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Restle hold ' },
    { date: '3/15/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '3/20/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Olfactory' },
    { date: '4/3/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Olfactory' },
    { date: '4/10/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Olfactory' },
    { date: '4/17/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '5/15/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Restle hold' },
    { date: '5/26/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold' },
    { date: '5/27/2024', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Blooms' },
    { date: '5/29/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Benders' },
    { date: '6/5/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashhold' },
    { date: '6/12/2024', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '7/10/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Olfactory & Nashhold' },
    { date: '7/13/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'RV in Groveland' },
    { date: '7/26/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Restlehold ' },
    { date: '8/21/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashhold' },
    { date: '9/8/2024', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'RestleHold' },
    { date: '9/11/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Restlehold' },
    { date: '9/18/2024', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Enterprise Brewing' },
    { date: '9/18/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Enterprise Brewing' },
    { date: '9/29/2024', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Nashold' },
    { date: '11/11/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashold' },
    { date: '11/14/2024', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Restlehold' },
    { date: '11/14/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Restlehold' },
    { date: '11/26/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashold' },
    { date: '12/10/2024', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Olfactory' },
    { date: '12/11/2024', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Toronado' },
    { date: '12/15/2024', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Restlehold ' },
    { date: '1/2/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold' },
    { date: '1/3/2025', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '1/3/2025', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Olfactory' },
    { date: '1/16/2025', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Nashold' },
    { date: '1/22/2025', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '1/29/2025', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '2/26/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '3/9/2025', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Espirit Park' },
    { date: '3/19/2025', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Olfactory ' },
    { date: '3/26/2025', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Olfactory' },
    { date: '4/2/2025', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Olfactory' },
    { date: '4/9/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '4/17/2025', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Nashhold' },
    { date: '5/7/2025', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Nashhold' },
    { date: '5/23/2025', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'The Social Study' },
    { date: '5/25/2025', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Blooms' },
    { date: '6/11/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '6/12/2025', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Nashhold' },
    { date: '6/13/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Studhold' },
    { date: '6/25/2025', games: 1, cait: 0, dylan: 1, grace: 1, jacob: 0, location: 'Standard Deviant' },
    { date: '6/28/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Saus -> SF Ferry' },
    { date: '7/2/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Stud hold' },
    { date: '7/23/2025', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Std dev' },
    { date: '8/6/2025', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Olfactory' },
    { date: '8/13/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nash hold' },
    { date: '8/20/2025', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Olfactory' },
    { date: '9/10/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'Nashhold' },
    { date: '9/18/2025', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashhold' },
    { date: '9/19/2025', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Studhold' },
    { date: '9/20/2025', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Studhold' },
    { date: '9/21/2025', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Nashhold' },
    { date: '10/30/2025', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Laughing monk' },
    { date: '10/30/2025', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'Laughing monk' },
    { date: '11/5/2025', games: 1, cait: 1, dylan: 0, grace: 1, jacob: 0, location: 'Nashhold' },
    { date: '11/12/2025', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Studhold' },
    { date: '12/16/2025', games: 1, cait: 0, dylan: 1, grace: 0, jacob: 1, location: 'STD dev' },
    { date: '1/2/2026', games: 1, cait: 1, dylan: 1, grace: 0, jacob: 0, location: 'STD dev' },
    { date: '1/7/2026', games: 1, cait: 0, dylan: 0, grace: 1, jacob: 1, location: 'Restles' },
    { date: '1/7/2026', games: 1, cait: 1, dylan: 0, grace: 0, jacob: 1, location: 'Restles' },
];

// Player mappings (you'll need to replace these with actual Firebase UIDs after first sign-in)
const players = {
    cait: { name: 'Cait', uid: 'SvmJSd43QveWNKw8w1qEh0zulTm1', email: 'caitlynn.nash@gmail.com' },
    dylan: { name: 'Dylan', uid: 'Ghobb73dkDavNS31eTDeK1n2zBG2', email: 'dylan.studden@gmail.com' },
    grace: { name: 'Grace', uid: 'WDzkjttsK9g4Uobrywwe8o2nbtN2', email: 'grace.studden@gmail.com' },
    jacob: { name: 'Jacob', uid: 'lkW4ipmG1FM8MYtWI0JlUpqutzv1', email: 'jacobloydnash@gmail.com' },
};

// Calculate totals from your spreadsheet, we really need to validate this.
const totals = {
    cait: { wins: 58, games: 140, renegs: 12 },
    dylan: { wins: 80, games: 140, renegs: 6 },
    grace: { wins: 62, games: 140, renegs: 6 },
    jacob: { wins: 82, games: 140, renegs: 3 },
};

// Historical renegs with excuses
const renegs = [
    { date: '9/2/2022', player: 'cait', excuse: '', },
    { date: '9/2/2022', player: 'cait', excuse: '', },
    { date: '9/4/2022', player: 'grace', excuse: '', },
    { date: '9/4/2022', player: 'cait', excuse: '', },
    { date: '9/7/2022', player: 'grace', excuse: '', },
    { date: '9/7/2022', player: 'jacob', excuse: '', },
    { date: '9/7/2022', player: 'cait', excuse: '', },
    { date: '1/4/2023', player: 'dylan', excuse: '', },
    { date: '1/16/2023', player: 'grace', excuse: '', },
    { date: '5/3/2023', player: 'dylan', excuse: '', },
    { date: '9/28/2023', player: 'cait', excuse: '', },
    { date: '11/7/2023', player: 'jacob', excuse: '', },
    { date: '11/29/2023', player: 'dylan', excuse: 'I was distracted and was playing from the kitty', },
    { date: '12/6/2023', player: 'cait', excuse: '"Excitement / Chestnuts"', },
    { date: '12/29/2023', player: 'dylan', excuse: 'None I\'m stupid', },
    { date: '1/23/2024', player: 'cait', excuse: '"I was just too excited"', },
    { date: '2/27/2024', player: 'grace', excuse: '"I forgot that I dealt"', },
    { date: '3/10/2024', player: 'cait', excuse: '"My whole brain isn\'t working today. I don\'t know. The food was so spicy." ', },
    { date: '8/21/2024', player: 'dylan', excuse: '"I was queuing up Billy Joel and I had one too many Vieux Carres"', },
    { date: '9/18/2024', player: 'grace', excuse: '"Irish setter commercial"', },
    { date: '9/23/2024', player: 'jacob', excuse: '"Randall Restle is supposed to have a good website, and obviously \'Cait, radio shacks don\'t exist anymore\'l', },
    { date: '9/29/2024', player: 'cait', excuse: '"I grabbed the wrong hand. It\'s not an excuse but it\'s all that I have"', },
    { date: '11/14/2024', player: 'cait', excuse: '"No excuse. I just forgot that I had a heart" - Heartless Cait', },
    { date: '12/10/2024', player: 'cait', excuse: '"I thought we were playing clubs. Jake didn\'t argue it hard enough"', },
    { date: '6/13/2025', player: 'cait', excuse: '"I thought it was my lead"', },
    { date: '10/30/2025', player: 'grace', excuse: 'There was a cat eating eating canned cat food on the table next to us', },
    { date: '10/3/2025', player: 'dylan', excuse: 'I don\'t know. I finally had good cards', },];

function validateAndBuildTeams(game, players) {
    const flags = {
        cait: Number(game.cait) || 0,
        dylan: Number(game.dylan) || 0,
        grace: Number(game.grace) || 0,
        jacob: Number(game.jacob) || 0,
    };

    const winnerIds = [];
    const loserIds = [];

    for (const [key, val] of Object.entries(flags)) {
        const uid = players[key]?.uid;
        if (!uid) return { valid: false, reason: `Missing player uid for ${key}` };
        if (val === 1) winnerIds.push(uid);
        else if (val === 0) loserIds.push(uid);
        else return { valid: false, reason: `Invalid flag value for ${key}: ${val}` };
    }

    if (winnerIds.length === 2 && loserIds.length === 2) {
        return {
            valid: true,
            teams: [
                { playerIds: winnerIds, score: 1, isWinner: true },
                { playerIds: loserIds, score: 0, isWinner: false },
            ]
        };
    }

    // Strict mode: invalid if not exactly 2 winners and 2 losers
    return { valid: false, reason: `Expected 2 winners & 2 losers, got winners=${winnerIds.length} losers=${loserIds.length}` };
}

async function importData() {
    console.log('=== STARTING DATA IMPORT ===\n');

    try {
        // Step 1: Create tournament
        console.log('Creating tournament...');
        const tournamentRef = db.collection('tournaments').doc('the-core-four');
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
            const payload = {
                displayName: player.name,
                email: player.email,
                photoURL: null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            if (!SKIP_USER_STATS) {
                payload.stats = {
                    wins: totals[key].wins,
                    renegs: totals[key].renegs,
                    gamesPlayed: totals[key].games
                };
            }
            if (!DRY_RUN) await userRef.set(payload);
            console.log(`✓ Prepared profile for ${player.name}${SKIP_USER_STATS ? ' (stats skipped)' : ''}`);
        }
        console.log('');

        // Step 3: Import games
        console.log('Importing games...');
        let importCount = 0;
        let skippedCount = 0;
        let invalidCount = 0;
        for (const game of games) { // Import ALL games
            const gameRef = db.collection('games').doc();

            // Parse date - strip any non-numeric suffixes
            const cleanDate = game.date.replace(/[^0-9/]/g, ''); // Remove any 'b' or other chars
            const [month, day, year] = cleanDate.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            const gameDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

            // Validate the date
            if (isNaN(gameDate.getTime())) {
                console.warn(`Skipping invalid date: ${game.date}`);
                continue;
            }

            // Strictly validate and build teams from flags (1 = winners, 0 = losers)
            const result = validateAndBuildTeams(game, players);
            if (!result.valid) {
                console.warn(`Skipping invalid game ${game.date} @ ${game.location}: ${result.reason}`);
                invalidCount++;
                continue;
            }

            const { teams } = result;

            // Create game document (one per entry)
            const docPayload = {
                timestamp: Timestamp.fromDate(gameDate),
                location: game.location || 'Unknown',
                teams,
                tags: [],
                notes: `Historical game from ${game.date}`,
                tournamentId: 'the-core-four'
            };
            if (!DRY_RUN) await gameRef.set(docPayload);
            else skippedCount++;
            importCount++;
        }
        console.log(`\n=== IMPORT SUMMARY ===`);
        console.log(`Imported: ${importCount}${DRY_RUN ? ' (dry-run: not written)' : ''}`);
        console.log(`Invalid/skipped: ${invalidCount}`);
        console.log(`Profiles: ${Object.keys(players).length} ${SKIP_USER_STATS ? '(stats skipped)' : ''}`);
        console.log('');

        // Step 4: Import renegs (The Wall of Shame!)
        console.log('Importing renegs (Wall of Shame)...');
        let importedRenegs = 0;
        let skippedRenegs = 0;
        for (const reneg of renegs) {
            const renegRef = db.collection('renegs').doc();

            // Parse date
            const [month, day, year] = reneg.date.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            const renegDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

            const playerKey = reneg.player;
            const playerObj = players[playerKey];
            if (!playerObj || !playerObj.uid) {
                console.warn(`Skipping reneg for unknown player key: ${playerKey} (date: ${reneg.date})`);
                skippedRenegs++;
                continue;
            }

            if (!DRY_RUN) {
                await renegRef.set({
                    playerId: playerObj.uid,
                    gameId: 'historical',
                    excuse: reneg.excuse,
                    tournamentId: 'the-core-four',
                    timestamp: Timestamp.fromDate(renegDate)
                });
            }
            importedRenegs++;
        }
        console.log(`✓ Imported: ${importedRenegs}${DRY_RUN ? ' (dry-run: not written)' : ''}; Skipped: ${skippedRenegs} renegs\n`);

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
