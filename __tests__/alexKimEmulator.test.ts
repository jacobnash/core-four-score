/**
 * Jest wrapper — proves Alex Kim emulator flow via node script.
 * Skips if emulators are not running.
 */

import { execSync } from 'child_process';

const EMULATOR_CHECK = 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8088';

describe('Alex Kim emulator integration', () => {
    it('sign-in + Firestore read + tournament create on emulator', () => {
        let code: string;
        try {
            code = execSync(EMULATOR_CHECK, { encoding: 'utf8' }).trim();
        } catch {
            console.warn('Firestore emulator not running — skipping integration proof');
            return;
        }
        if (code !== '200') {
            console.warn(`Firestore emulator returned ${code} — skipping integration proof`);
            return;
        }

        const out = execSync('USE_EMULATOR=true node ./scripts/dev/test-alex-kim-flow.js', {
            encoding: 'utf8',
            cwd: process.cwd(),
        });
        expect(out).toContain('Alex Kim signed in');
        expect(out).toContain('Firestore read users/mock-dev-alex');
        expect(out).toContain('Firestore write createTournament');
        expect(out).toContain('✅ Alex Kim sign-in');
    });
});
