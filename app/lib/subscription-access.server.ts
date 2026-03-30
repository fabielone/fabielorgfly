export type SubscriptionAccessRow = {
  status: string;
  grace_period_ends_at: string | null;
};

/** True when the user should be treated as a paying member (active or past_due still inside grace). */
export function hasActiveSubscriberAccess(sub: SubscriptionAccessRow | null): boolean {
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "past_due" && sub.grace_period_ends_at) {
    return new Date(sub.grace_period_ends_at) > new Date();
  }
  return false;
}
