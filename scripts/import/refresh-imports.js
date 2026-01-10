/**
 * Refresh orchestrator
 * Clears data and re-runs imports. Supports DRY_RUN to validate without writes.
 *
 * Usage:
 * DRY_RUN=true node refresh-imports.js
 */

const { spawnSync } = require('child_process');
const path = require('path');

function run(command, args, env = {}) {
    const res = spawnSync(command, args, { stdio: 'inherit', env: Object.assign({}, process.env, env), cwd: path.resolve(__dirname) });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with ${res.status}`);
}

async function main() {
    const dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
    console.log(`Starting refresh-imports (dryRun=${dryRun})`);

    try {
        // Step 1: Clear existing data (will respect DRY_RUN in a future enhancement)
        console.log('\n-- Running clear-data.js --');
        run('node', ['clear-data.js'], { DRY_RUN: String(dryRun) });

        // Step 2: Re-run data import
        console.log('\n-- Running import-data.js --');
        run('node', ['import-data.js'], { DRY_RUN: String(dryRun), SKIP_USER_STATS: 'true' });

        // Step 3: Rules
        console.log('\n-- Running import-rules.js --');
        run('node', ['import-rules.js'], { DRY_RUN: String(dryRun) });

        // Step 4: Photos (optional)
        console.log('\n-- Running import-photos.js --');
        run('node', ['import-photos.js'], { DRY_RUN: String(dryRun) });

        console.log('\nRefresh complete.');
    } catch (err) {
        console.error('Refresh failed:', err);
        process.exit(1);
    }
}

main();
