export type UpdatesContactPreference = "email" | "phone" | "both";

export const UPDATES_CONTACT_OPTIONS: { value: UpdatesContactPreference; label: string; hint: string }[] = [
  { value: "email", label: "Email", hint: "Application updates to my inbox" },
  { value: "phone", label: "Phone", hint: "Text or call when it matters" },
  { value: "both", label: "Email and phone", hint: "Do not miss anything important" },
];

export function parseUpdatesContactPreference(raw: unknown): UpdatesContactPreference {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "email" || s === "phone" || s === "both") return s;
  return "both";
}

export function updatesContactPreferenceFromForm(formData: FormData): UpdatesContactPreference {
  return parseUpdatesContactPreference(formData.get("updatesContactPreference"));
}
