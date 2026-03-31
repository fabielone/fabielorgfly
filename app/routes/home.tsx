import { redirect } from "react-router";

import type { Route } from "./+types/home";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Fabielorg — Remote jobs" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = createSupabaseServerClient(request);
  throw redirect("/jobs", { headers });
}

export default function Home() {
  return null;
}
