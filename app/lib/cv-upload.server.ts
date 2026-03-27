import { randomUUID } from "node:crypto";

import { createSupabaseServiceClient } from "~/lib/supabase.server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").slice(0, 120);
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return cleaned || "cv.pdf";
}

/** Some browsers omit `type` on file inputs; infer from extension. */
function effectiveMimeType(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "";
}

export async function uploadApplicationCv(
  jobId: string,
  file: File,
): Promise<{ ok: true; path: string; originalName: string } | { ok: false; error: string }> {
  if (file.size === 0) {
    return { ok: false, error: "CV file is empty." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "CV must be 5 MB or smaller." };
  }
  const mime = effectiveMimeType(file);
  if (!ALLOWED_TYPES.has(mime)) {
    return { ok: false, error: "CV must be a PDF or Word document (.doc, .docx)." };
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return { ok: false, error: "File upload is not configured (missing service role key)." };
  }

  const safe = sanitizeFilename(file.name);
  const path = `${jobId}/${randomUUID()}-${safe}`;
  const body = await file.arrayBuffer();

  const { error } = await admin.storage.from("application_cvs").upload(path, body, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    return { ok: false, error: "Could not upload CV. Create the `application_cvs` bucket in Supabase or try again." };
  }

  return { ok: true, path, originalName: file.name };
}
