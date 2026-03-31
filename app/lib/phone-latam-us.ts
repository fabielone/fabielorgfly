/**
 * Dial codes for U.S., Canada, and Latin America (job apply form).
 * Stored value is the numeric prefix including "+".
 */
export type PhoneCountryOption = { value: string; label: string };

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { value: "", label: "— No phone —" },
  { value: "+1", label: "United States / Canada (+1)" },
  { value: "+52", label: "Mexico (+52)" },
  { value: "+54", label: "Argentina (+54)" },
  { value: "+591", label: "Bolivia (+591)" },
  { value: "+55", label: "Brazil (+55)" },
  { value: "+56", label: "Chile (+56)" },
  { value: "+57", label: "Colombia (+57)" },
  { value: "+506", label: "Costa Rica (+506)" },
  { value: "+53", label: "Cuba (+53)" },
  { value: "+593", label: "Ecuador (+593)" },
  { value: "+503", label: "El Salvador (+503)" },
  { value: "+502", label: "Guatemala (+502)" },
  { value: "+504", label: "Honduras (+504)" },
  { value: "+505", label: "Nicaragua (+505)" },
  { value: "+507", label: "Panama (+507)" },
  { value: "+595", label: "Paraguay (+595)" },
  { value: "+51", label: "Peru (+51)" },
  { value: "+598", label: "Uruguay (+598)" },
  { value: "+58", label: "Venezuela (+58)" },
];

export const ALLOWED_PHONE_DIAL_CODES = new Set(
  PHONE_COUNTRY_OPTIONS.map((o) => o.value).filter(Boolean),
);

const DIAL_CODES_LONGEST_FIRST = [...ALLOWED_PHONE_DIAL_CODES].sort((a, b) => b.length - a.length);

/** Split a stored E.164 value (e.g. +525551234567) into dial code + national digits for form prefills. */
export function parseE164ToDialAndNational(
  e164: string | null | undefined,
): { dial: string; national: string } {
  if (!e164 || typeof e164 !== "string") return { dial: "", national: "" };
  const t = e164.trim();
  if (!t.startsWith("+")) return { dial: "", national: t.replace(/\D/g, "") };
  for (const code of DIAL_CODES_LONGEST_FIRST) {
    if (t.startsWith(code)) {
      return { dial: code, national: t.slice(code.length).replace(/\D/g, "") };
    }
  }
  return { dial: "", national: t.slice(1).replace(/\D/g, "") };
}

const NATIONAL_MIN = 8;
const NATIONAL_MAX = 14;

/**
 * If the user enters any phone digits, they must pick a country code.
 * Returns E.164-style string (e.g. +525551234567) or null when omitted.
 */
export function normalizeApplicationPhone(
  dialRaw: unknown,
  nationalRaw: unknown,
): { ok: true; phone: string | null } | { ok: false; error: string } {
  const dial = String(dialRaw ?? "").trim();
  const nationalDigits = String(nationalRaw ?? "").replace(/\D/g, "");

  if (!dial && !nationalDigits) {
    return { ok: true, phone: null };
  }

  if (!dial) {
    return { ok: false, error: "Select a country code for your phone number." };
  }

  if (!ALLOWED_PHONE_DIAL_CODES.has(dial)) {
    return { ok: false, error: "Invalid country code for phone." };
  }

  if (!nationalDigits) {
    return { ok: false, error: "Enter your phone number (digits only, no country code)." };
  }

  if (nationalDigits.length < NATIONAL_MIN || nationalDigits.length > NATIONAL_MAX) {
    return {
      ok: false,
      error: `Phone number should be between ${NATIONAL_MIN} and ${NATIONAL_MAX} digits (after country code).`,
    };
  }

  return { ok: true, phone: `${dial}${nationalDigits}` };
}
