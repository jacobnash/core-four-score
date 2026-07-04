/** Original Core Four member Firebase Auth UIDs (production + dev emulator). */
export const CORE_FOUR_MEMBER_IDS = [
    'SvmJSd43QveWNKw8w1qEh0zulTm1', // Cait
    'Ghobb73dkDavNS31eTDeK1n2zBG2', // Dylan
    'WDzkjttsK9g4Uobrywwe8o2nbtN2', // Grace
    'lkW4ipmG1FM8MYtWI0JlUpqutzv1', // Jacob
] as const;

/** Legacy deer-camp tournament document ids that stay Core Four only. */
export const LEGACY_CORE_FOUR_TOURNAMENT_IDS = [
    'the-core-four',
] as const;

/** Primary Core Four tournament id (house rules, legacy stats). */
export const CORE_FOUR_TOURNAMENT_ID = LEGACY_CORE_FOUR_TOURNAMENT_IDS[0];

export type CoreFourMemberId = (typeof CORE_FOUR_MEMBER_IDS)[number];
