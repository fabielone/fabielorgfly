import { randomUUID } from "node:crypto";

import { assertCvFileAllowed, cvEffectiveMimeType } from "~/lib/cv-constraints";
import { createSupabaseServiceClient } from "~/lib/supabase.server";

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").slice(0, 120);
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return cleaned || "cv.pdf";
}

export async function uploadApplicationCv(
  jobId: string,
  file: File,
): Promise<{ ok: true; path: string; originalName: string } | { ok: false; error: string }> {
  const validationError = assertCvFileAllowed(file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return { ok: false, error: "File upload is not configured (missing service role key)." };
  }

  const mime = cvEffectiveMimeType(file);
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
