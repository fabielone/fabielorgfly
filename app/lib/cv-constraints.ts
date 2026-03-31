/** Shared CV rules for apply form (client) and upload (server). */

export const CV_MAX_BYTES = 5 * 1024 * 1024;

export const CV_ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const CV_ALLOWED_EXTENSION_SET = new Set<string>(CV_ALLOWED_EXTENSIONS);

export const CV_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_TO_PRIMARY_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function cvFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  for (const ext of CV_ALLOWED_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext;
  }
  return "";
}

/** When the browser omits `type`, infer from extension (matches server). */
export function cvEffectiveMimeType(file: Pick<File, "type" | "name">): string {
  const ext = cvFileExtension(file.name);
  const raw = file.type?.trim() ?? "";
  if (raw === "application/octet-stream" && ext && EXT_TO_PRIMARY_MIME[ext]) {
    return EXT_TO_PRIMARY_MIME[ext];
  }
  if (raw) return raw;
  return ext ? (EXT_TO_PRIMARY_MIME[ext] ?? "") : "";
}

/** Client-safe validation before submit. */
export function validateCvFileForUpload(file: File): string | null {
  if (file.size === 0) {
    return "Choose a non-empty file.";
  }
  if (file.size > CV_MAX_BYTES) {
    return `CV must be ${CV_MAX_BYTES / (1024 * 1024)} MB or smaller.`;
  }
  const ext = cvFileExtension(file.name);
  if (!ext || !CV_ALLOWED_EXTENSION_SET.has(ext)) {
    return "CV must be a PDF or Word document (.pdf, .doc, .docx).";
  }
  const mime = cvEffectiveMimeType(file);
  if (mime && !CV_ALLOWED_MIME_TYPES.has(mime)) {
    return "This file type is not allowed. Use PDF or Word (.doc, .docx).";
  }
  return null;
}

/** Server-side validation including MIME/extension alignment. */
export function assertCvFileAllowed(file: File): string | null {
  if (file.size === 0) {
    return "CV file is empty.";
  }
  if (file.size > CV_MAX_BYTES) {
    return `CV must be ${CV_MAX_BYTES / (1024 * 1024)} MB or smaller.`;
  }
  const ext = cvFileExtension(file.name);
  if (!ext) {
    return "CV must be a PDF or Word document (.pdf, .doc, .docx).";
  }
  const mime = cvEffectiveMimeType(file);
  if (!CV_ALLOWED_MIME_TYPES.has(mime)) {
    return "CV must be a PDF or Word document (.pdf, .doc, .docx).";
  }
  const expected = EXT_TO_PRIMARY_MIME[ext];
  if (expected && mime !== expected) {
    return "File extension does not match the file type. Use a real PDF or Word document.";
  }
  return null;
}
