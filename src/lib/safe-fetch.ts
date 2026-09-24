import "server-only";
import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

// Fetches a page from a founder's site without letting them point us at our own network
// (SSRF). Every connection is checked against private/reserved IP ranges at connect time,
// so DNS tricks can't slip past. Only GET, small bodies, short timeouts, few redirects.

// Separate lists: Node's BlockList matches IPv4 addresses against IPv4-mapped IPv6 rules,
// so mixing families in one list would block everything.
const blockedV4 = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
] as const) blockedV4.addSubnet(net, prefix, "ipv4");
const blockedV6 = new BlockList();
for (const [net, prefix] of [
  ["::", 127], ["64:ff9b::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blockedV6.addSubnet(net, prefix, "ipv6");

export function isBlockedAddress(address: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return isBlockedAddress(mapped[1]);
  const family = isIP(address);
  if (family === 4) return blockedV4.check(address, "ipv4");
  if (family === 6) return address.toLowerCase().startsWith("::ffff:") || blockedV6.check(address, "ipv6");
  return true;
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const allowed = addresses.filter((a) => !isBlockedAddress(a.address));
    if (allowed.length === 0) {
      return callback(new Error("That site resolves to a private address."), "", 0);
    }
    if (options.all) return callback(null, allowed as never, 0);
    callback(null, allowed[0].address, allowed[0].family);
  });
};

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

export type SafeFetchResult = { url: string; status: number; body: string };

export async function safeFetchText(
  startUrl: string,
  isAllowedHost: (host: string) => boolean,
): Promise<SafeFetchResult> {
  let url = new URL(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported protocol.");
    // Node skips `lookup` for IP-literal hosts, so those are refused outright.
    if (isIP(url.hostname.replace(/^\[|\]$/g, ""))) throw new Error("IP addresses aren't allowed.");
    if (!isAllowedHost(url.hostname)) throw new Error(`Redirected away from the product's domain (${url.hostname}).`);

    const res = await getOnce(url);
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url);
      continue;
    }
    return { url: url.toString(), status: res.status, body: res.body };
  }
  throw new Error("Too many redirects.");
}

function getOnce(url: URL): Promise<{ status: number; location?: string; body: string }> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      {
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": "BackscratchVerifier/1.0", Accept: "text/html" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, body: "" });
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            // Enough to find a <meta> tag in <head>; stop reading.
            res.destroy();
            return resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("The site took too long to respond.")));
    req.on("error", reject);
  });
}
