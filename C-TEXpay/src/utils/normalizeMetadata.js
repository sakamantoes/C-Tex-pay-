/** Normalize JSON metadata from current object values or legacy JSON strings. */
export function normalizeMetadata(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
