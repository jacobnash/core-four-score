/**
 * Rules Import Script
 * Import built-in rules to Firestore database
 * 
 * Run with: node import-rules.js
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

const CORE_FOUR_TOURNAMENT_ID = 'the-core-four';

const BUILT_IN_RULES = [
    { id: 'builtin-1', text: "Thou shall'nt re nor neg; and when thou shall re or neg or re and neg, thou shall't alloweth the opponent" },
    { id: 'builtin-2', text: 'Rules for the farmer: 3 of a kind of 9 or 10. Whoever calls it first gets to swap' },
    { id: 'builtin-3', text: 'If you lead two cards, and do not win both tricks, you lose the lead for the following hand' },
    { id: 'builtin-4', text: 'Screw the dealer' },
    { id: 'builtin-5', text: "When making it next, if a suit is called, as soon as play begins, the called suit cannot be changed" },
    { id: 'builtin-6', text: "You can \"me too\" but you can't \"not me\" during braveheart" },
    { id: 'builtin-7', text: "You can play out of turn if it doesn't effect the result of the hand" },
    { id: 'builtin-8', text: 'A card once laid is a fate sealed.' },
    { id: 'builtin-9', text: "A card once cast from the hand doth lie bare for all to see, yet may be summoned from memory by the rival faction. But mark ye this: both members of the opposing side must, with solemn accord, speak what the card was, else it shall not be branded a reneg." },
    { id: 'builtin-10', text: "You aren't allowed to play a card from any source except your hand. I.e if you play a card from a source that is not your hand, it is a reneg" },
    { id: 'builtin-11', text: 'Not discarding, no matter the circumstances of the hands, is illegal and counts as a misdeal' },
    { id: 'builtin-12', text: 'If multiple cards are played at once, the opponent can decide the order in that the cards were played' },
];

async function importRules() {
    console.log('=== STARTING RULES IMPORT ===\n');

    try {
        let imported = 0;
        let skipped = 0;

        for (const rule of BUILT_IN_RULES) {
            const ruleRef = db.collection('rules').doc(rule.id);
            const snap = await ruleRef.get();

            if (snap.exists) {
                console.log(`⚠ Rule already exists: ${rule.id}`);
                skipped++;
                continue;
            }

            await ruleRef.set({
                text: rule.text,
                author: 'system',
                approvals: [],
                createdAt: Timestamp.now(),
                tournamentId: CORE_FOUR_TOURNAMENT_ID,
                schemaVersion: 1,
            });

            console.log(`✓ Imported rule: ${rule.id}`);
            imported++;
        }

        console.log(`\n=== RULES IMPORT COMPLETE ===`);
        console.log(`Imported: ${imported}`);
        console.log(`Already existed: ${skipped}\n`);

    } catch (error) {
        console.error('✗ Error during import:', error);
    }

    process.exit(0);
}

importRules();
