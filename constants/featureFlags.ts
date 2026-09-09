/**
 * Live-app safety switch for data-view improvements.
 * Set to false and redeploy to instantly revert to the previous UI
 * without rolling back the entire branch.
 */
export const ENABLE_IMPROVED_DATA_VIEWS = true;

/** Skeet / sporting clays / 5-stand scoring — off in production until ready. */
export const ENABLE_CLAYS_SCORING =
    process.env.EXPO_PUBLIC_ENABLE_CLAYS_SCORING === 'true' ||
    (typeof __DEV__ !== 'undefined' && __DEV__);

/** Catan game recording + board randomizer — off in production until ready. */
export const ENABLE_CATAN_SCORING =
    process.env.EXPO_PUBLIC_ENABLE_CATAN_SCORING === 'true' ||
    (typeof __DEV__ !== 'undefined' && __DEV__);
