/**
 * The input events that mark a visit as `engaged` for the cookieless beacon.
 *
 * Lives apart from `traffic-truth.ts` because that module imports node
 * `crypto` and this list is needed by a client component. The reasoning is
 * documented there, beside the re-export.
 */
export const ENGAGEMENT_EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown'] as const;
