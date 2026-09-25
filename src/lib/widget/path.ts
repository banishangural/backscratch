// Shared by the server and the widget bundle (widget/src), so keep it free of imports.
// Page paths are stored without query string or fragment, and with number/ID-like segments
// replaced by ":id" (e.g. "/invoices/:id"), so they never hold personal or unique data.
// The path comes from the browser, so it's only a label: it never affects any count.
const MAX_SEGMENTS = 8;
const MAX_SEGMENT_LENGTH = 60;

export function normalizePath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const segments = value
    .split(/[?#]/, 1)[0]
    .split("/")
    .filter(Boolean)
    .slice(0, MAX_SEGMENTS)
    .map((segment) => (isIdLike(segment) ? ":id" : segment.toLowerCase()));
  return `/${segments.join("/")}`;
}

function isIdLike(segment: string) {
  if (segment.length > MAX_SEGMENT_LENGTH) return true;
  if (/^\d+$/.test(segment)) return true; // 42, 2024
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true; // UUID
  if (/^[0-9a-f]{8,}$/i.test(segment) && /\d/.test(segment)) return true; // hex ids and hashes
  // Tokens like cuids and nanoids: long, letters mixed with digits, and not a readable slug.
  if (segment.length >= 16 && /\d/.test(segment) && /[a-z]/i.test(segment) && !isSlug(segment)) return true;
  if (/[@%]/.test(segment)) return true; // emails, encoded data
  return false;
}

// "how-we-grew-to-10k-in-2024": at least 3 dash-separated parts, mostly plain words.
function isSlug(segment: string) {
  const parts = segment.split("-");
  return parts.length >= 3 && parts.filter((part) => /^[a-z]+$/i.test(part)).length * 2 >= parts.length;
}
