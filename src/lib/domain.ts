import { isIP } from "node:net";

// Turns a founder-entered URL into { url, domain }. The domain is the lowercase host
// without "www.", e.g. "https://www.Example.com/pricing" -> "example.com".
// Returns null for anything that isn't a public http(s) website address.
export function parseProductUrl(input: string): { url: string; domain: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.username || parsed.password || parsed.port) return null;

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const domain = host.startsWith("www.") ? host.slice(4) : host;
  if (!domain.includes(".") || isIP(domain) || domain.endsWith(".localhost")) return null;

  parsed.hash = "";
  return { url: parsed.toString(), domain };
}
