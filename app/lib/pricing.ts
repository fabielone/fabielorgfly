/**
 * New subscribers pay the tier derived from how many paying members already exist.
 * Anyone already subscribed keeps `locked_monthly_mxn` from signup (stored in DB).
 *
 * Rule: first 50 subscribers → 20 MXN; each additional block of 50 adds 10 MXN for new signups only.
 */

/** Shown crossed out in marketing (“usual” public list price). */
export const STANDARD_LIST_PRICE_MXN = 599;

export const BASE_NEW_SUBSCRIBER_MXN = 20;
export const TIER_STEP_SUBSCRIBERS = 50;
export const TIER_INCREMENT_MXN = 10;

export function newSubscriberMonthlyMxn(activePayingCount: number): number {
  const tiersAboveBase = Math.floor(activePayingCount / TIER_STEP_SUBSCRIBERS);
  return BASE_NEW_SUBSCRIBER_MXN + tiersAboveBase * TIER_INCREMENT_MXN;
}

/** Slots until the next +TIER_INCREMENT_MXN bump for brand-new signups (illustrative UI helper). */
export function spotsUntilNextPriceBump(activePayingCount: number): number {
  if (activePayingCount === 0) return TIER_STEP_SUBSCRIBERS;
  const rem = activePayingCount % TIER_STEP_SUBSCRIBERS;
  return rem === 0 ? TIER_STEP_SUBSCRIBERS : TIER_STEP_SUBSCRIBERS - rem;
}
