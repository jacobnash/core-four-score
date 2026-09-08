/**
 * Local-only dev auth helper for Firebase Emulator.
 *
 * Admin-seeded accounts (fixed UIDs for mock Firestore data) cannot use
 * email/password on the Auth emulator client API — custom tokens work.
 *
 * Usage (with emulators running):
 *   node scripts/dev/dev-auth-server.js
 *
 * GET http://127.0.0.1:9199/dev-token?email=alex.kim@example.com
 */

const http = require('http');
const admin = require('firebase-admin');
const { initAdminForEmulator } = require('./emulator-env');
const { ALL_DEV_PLAYERS } = require('./mock-multiplayer-data');

const PORT = Number(process.env.DEV_AUTH_PORT || 9199);
const HOST = process.env.EMULATOR_HOST || '127.0.0.1';

initAdminForEmulator(admin);

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'GET' || !req.url?.startsWith('/dev-token')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
    }

    try {
        const url = new URL(req.url, `http://${HOST}:${PORT}`);
        const email = (url.searchParams.get('email') || '').trim().toLowerCase();
        const player = ALL_DEV_PLAYERS.find(p => p.email.toLowerCase() === email);

        if (!player) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unknown dev email' }));
            return;
        }

        const token = await admin.auth().createCustomToken(player.uid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token, uid: player.uid, displayName: player.displayName }));
    } catch (err) {
        console.error('[dev-auth]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Token error' }));
    }
});

server.listen(PORT, HOST, () => {
    console.log(`[dev-auth] Custom token helper http://${HOST}:${PORT}/dev-token?email=...`);
});
