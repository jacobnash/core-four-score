const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const src = path.join(repoRoot, 'Deck', 'thumbnail.png');
const destDir = path.join(repoRoot, 'dist');

function copy(srcPath, destPath) {
    try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${srcPath} -> ${destPath}`);
    } catch (e) {
        console.error(`Failed to copy ${srcPath} -> ${destPath}: ${e.message}`);
        process.exitCode = 1;
    }
}

if (!fs.existsSync(src)) {
    console.error('Source thumbnail not found at ' + src);
    process.exitCode = 1;
} else {
    copy(src, path.join(destDir, 'thumbnail.png'));
    copy(src, path.join(destDir, 'favicon.png'));
    copy(src, path.join(destDir, 'Deck', 'thumbnail.png'));
}
