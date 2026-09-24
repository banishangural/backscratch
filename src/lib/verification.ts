import "server-only";
import { randomBytes } from "node:crypto";
import { Resolver } from "node:dns/promises";
import { safeFetchText } from "@/lib/safe-fetch";

// Domain ownership checks. The founder proves control of their domain by adding either
// a meta tag to their homepage or a TXT record to the root domain.

export const META_NAME = "backscratch-verification";
export const TXT_PREFIX = "backscratch-verification=";

export const newVerificationToken = () => randomBytes(16).toString("hex");
export const metaTagFor = (token: string) => `<meta name="${META_NAME}" content="${token}">`;
export const txtRecordFor = (token: string) => `${TXT_PREFIX}${token}`;

export type CheckResult =
  | { ok: true; method: "META_TAG" | "DNS_TXT" }
  | { ok: false; meta: string; dns: string };

export async function checkOwnership(domain: string, token: string): Promise<CheckResult> {
  const [dns, meta] = await Promise.all([checkDnsTxt(domain, token), checkMetaTag(domain, token)]);
  if (dns === true) return { ok: true, method: "DNS_TXT" };
  if (meta === true) return { ok: true, method: "META_TAG" };
  return { ok: false, meta, dns };
}

// Returns true or a plain-English reason it failed.
async function checkDnsTxt(domain: string, token: string): Promise<true | string> {
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  try {
    const records = (await resolver.resolveTxt(domain)).map((chunks) => chunks.join("").trim());
    if (records.includes(txtRecordFor(token))) return true;
    const ours = records.filter((r) => r.startsWith(TXT_PREFIX));
    return ours.length > 0
      ? "Found a verification TXT record, but the token doesn't match. Copy it again."
      : "No matching TXT record yet. DNS changes can take up to an hour to show up.";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND") {
      return "No TXT records found. DNS changes can take up to an hour to show up.";
    }
    return "Couldn't look up DNS for this domain right now. Try again in a minute.";
  }
}

async function checkMetaTag(domain: string, token: string): Promise<true | string> {
  const sameSite = (host: string) => {
    const h = host.toLowerCase();
    return h === domain || h === `www.${domain}`;
  };
  // Report the https failure: it's the one founders care about. http is only a fallback.
  let firstError = "";
  for (const url of [`https://${domain}/`, `http://${domain}/`]) {
    try {
      const page = await safeFetchText(url, sameSite);
      if (page.status >= 400) {
        firstError ||= `${page.url} returned HTTP ${page.status}.`;
        continue;
      }
      const found = findMetaContents(page.body);
      if (found.includes(token)) return true;
      return found.length > 0
        ? `Found the meta tag on ${page.url}, but the token doesn't match. Copy it again.`
        : `The meta tag wasn't found on ${page.url}. Put it inside <head> and redeploy.`;
    } catch (error) {
      firstError ||= `Couldn't load ${url}: ${(error as Error).message}`;
    }
  }
  return firstError;
}

// All `content` values of <meta name="backscratch-verification"> tags in the HTML.
export function findMetaContents(html: string): string[] {
  const results: string[] = [];
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries(
      [...tag.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)].map((m) => [
        m[1].toLowerCase(),
        (m[2] ?? m[3] ?? m[4] ?? "").trim(),
      ]),
    );
    if (attrs.name?.toLowerCase() === META_NAME && attrs.content) results.push(attrs.content);
  }
  return results;
}
