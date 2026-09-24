import "server-only";
import { z } from "zod";

// Helpers shared by the public widget endpoints (/api/widget/*, /r/*).

// Slot and swap ids are cuids.
export const publicId = z.string().regex(/^[a-z0-9]{20,32}$/);

// The widget runs on other sites, so its config must be readable cross-origin. Beacons are
// sent as text/plain via navigator.sendBeacon, which needs no preflight.
export const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export const NO_STORE = { "Cache-Control": "private, no-store" };

// Empty 204 for beacons: the widget never reads the response.
export function accepted() {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...NO_STORE } });
}

// Parses a small JSON body (beacons are tiny). Returns null for anything unexpected.
export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > 2000) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Host of the page the widget is running on, from the browser-set Origin or Referer header.
// Falls back to the host the widget reports, for sites whose referrer policy hides both.
export function pageHost(request: Request, reportedHost?: string) {
  for (const value of [request.headers.get("origin"), request.headers.get("referer")]) {
    if (!value || value === "null") continue;
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      // try the next one
    }
  }
  return reportedHost?.toLowerCase() || null;
}
