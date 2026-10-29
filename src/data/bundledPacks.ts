import mat1903 from './packs/mat1903-calc.json';

/** Bump whenever a bundled pack changes so existing installs pick up the new content. */
export const BUNDLED_VERSION = 4;

/** Packs installed automatically on first launch and refreshed on upgrade. */
export const BUNDLED_PACKS: unknown[] = [mat1903];

/**
 * Retired placeholder packs: purged on upgrade if still installed in their original form.
 * `signature` is a question id unique to the retired pack, so a user's own pack with the same id is left alone.
 */
export const RETIRED_PACKS = [{ id: 'MAT1903', signature: 'chain-2' }];
