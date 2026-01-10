Import scripts

This folder contains utility scripts for importing historical data into Firestore.

Files:
- import-data.js — imports historical games and renegs. Set `DRY_RUN=true` to validate without writing.
- import-photos.js — uploads player photos from the `Deck/` folder.
- import-rules.js — loads built-in rules into `rules` collection.
- clear-data.js — deletes `games`, `renegs`, and `tournaments` collections (keeps users).
- refresh-imports.js — orchestrator: runs `clear-data.js` then re-runs the import scripts.

Usage examples:

```bash
# Dry-run the data import:
DRY_RUN=true node ./scripts/import/import-data.js

# Full refresh (clears then imports):
node ./scripts/import/refresh-imports.js
```

Notes:
- These scripts expect a `serviceAccountKey.json` at the project root or set `SERVICE_ACCOUNT` to its path.
- `import-data.js` and `import-photos.js` reference relative paths to the project root; run from repo root or adjust `SERVICE_ACCOUNT`.
