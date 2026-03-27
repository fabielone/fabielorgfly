import { createSupabaseServiceClient } from "~/lib/supabase.server";

export async function getActivePayingSubscriptionCount(): Promise<number> {
  const admin = createSupabaseServiceClient();
  if (!admin) return 0;
  const { count, error } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "past_due"]);
  if (error) return 0;
  return count ?? 0;
}
