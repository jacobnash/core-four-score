/**
 * Local emulator mock data for multiplayer / multi-tournament testing.
 * Keep in sync with MOCK_DEV_PLAYERS in constants/devConfig.ts (login UI).
 */

const CORE_FOUR_UIDS = {
    cait: 'SvmJSd43QveWNKw8w1qEh0zulTm1',
    dylan: 'Ghobb73dkDavNS31eTDeK1n2zBG2',
    grace: 'WDzkjttsK9g4Uobrywwe8o2nbtN2',
    jacob: 'lkW4ipmG1FM8MYtWI0JlUpqutzv1',
};

/** Original four — real prod UIDs for emulator parity */
const DEV_PLAYERS = [
    { uid: CORE_FOUR_UIDS.cait, displayName: 'Cait', email: 'caitlynn.nash@gmail.com', group: 'core-four' },
    { uid: CORE_FOUR_UIDS.dylan, displayName: 'Dylan', email: 'dylan.studden@gmail.com', group: 'core-four' },
    { uid: CORE_FOUR_UIDS.grace, displayName: 'Grace', email: 'grace.studden@gmail.com', group: 'core-four' },
    { uid: CORE_FOUR_UIDS.jacob, displayName: 'Jacob', email: 'jacobloydnash@gmail.com', group: 'core-four' },
];

/** Extra guest accounts for local multiplayer testing */
const MOCK_PLAYERS = [
    { uid: 'mock-dev-alex', displayName: 'Alex Kim', email: 'alex.kim@example.com', group: 'mock' },
    { uid: 'mock-dev-sam', displayName: 'Sam Rivera', email: 'sam.rivera@example.com', group: 'mock' },
    { uid: 'mock-dev-jordan', displayName: 'Jordan Lee', email: 'jordan.lee@example.com', group: 'mock' },
    { uid: 'mock-dev-riley', displayName: 'Riley Brooks', email: 'riley.brooks@example.com', group: 'mock' },
    { uid: 'mock-dev-morgan', displayName: 'Morgan Chen', email: 'morgan.chen@example.com', group: 'mock' },
    { uid: 'mock-dev-casey', displayName: 'Casey Walsh', email: 'casey.walsh@example.com', group: 'mock' },
    { uid: 'mock-dev-taylor', displayName: 'Taylor Nguyen', email: 'taylor.nguyen@example.com', group: 'mock' },
    { uid: 'mock-dev-quinn', displayName: 'Quinn Parker', email: 'quinn.parker@example.com', group: 'mock' },
];

const ALL_DEV_PLAYERS = [...DEV_PLAYERS, ...MOCK_PLAYERS];

const { cait, dylan, grace, jacob } = CORE_FOUR_UIDS;
const m = Object.fromEntries(MOCK_PLAYERS.map(p => [p.displayName.split(' ')[0].toLowerCase(), p.uid]));

/** Extra tournaments merged after backup restore (Core Four tourney untouched). */
const MOCK_TOURNAMENTS = [
    {
        id: 'deer-camp-alumni-2026',
        data: {
            tournamentId: 'deer-camp-alumni-2026',
            name: 'Deer Camp Alumni 2026',
            memberIds: [jacob, dylan, grace, cait, m.alex, m.sam, m.jordan, m.riley],
            inviteIds: [],
            status: 'draft',
            createdBy: jacob,
            visibility: 'private',
            schemaVersion: 1,
        },
        preferredFor: [m.alex],
    },
    {
        id: 'friday-progressive-8',
        data: {
            tournamentId: 'friday-progressive-8',
            name: 'Friday Progressive (8 players)',
            memberIds: [m.sam, m.jordan, m.riley, m.morgan, m.casey, m.taylor, m.quinn, m.alex],
            inviteIds: [],
            status: 'active',
            createdBy: m.sam,
            visibility: 'private',
            schemaVersion: 1,
        },
        preferredFor: [grace],
    },
    {
        id: 'lake-house-open',
        data: {
            tournamentId: 'lake-house-open',
            name: 'Lake House Open',
            memberIds: [m.morgan, m.casey, m.taylor, m.quinn],
            inviteIds: [jacob, cait, m.alex],
            status: 'draft',
            createdBy: m.morgan,
            visibility: 'private',
            schemaVersion: 1,
        },
        preferredFor: [],
    },
    {
        id: 'speed-night-6',
        data: {
            tournamentId: 'speed-night-6',
            name: 'Speed Night (6 players)',
            memberIds: [m.alex, m.sam, m.jordan, m.riley, m.morgan, m.casey],
            inviteIds: [dylan],
            status: 'draft',
            createdBy: m.jordan,
            visibility: 'private',
            schemaVersion: 1,
        },
        preferredFor: [],
    },
];

module.exports = {
    CORE_FOUR_UIDS,
    DEV_PLAYERS,
    MOCK_PLAYERS,
    ALL_DEV_PLAYERS,
    MOCK_TOURNAMENTS,
};
