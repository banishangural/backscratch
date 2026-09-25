import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Anonymous visitor identity for deduping views and clicks. No cookies, no fingerprinting:
// a hash of IP + user agent with a random salt that changes every day. Salts are deleted
// after two days, so old hashes can't be linked or reversed. Raw IPs are never stored.

export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10); // "2026-09-24"
}

const saltCache = new Map<string, string>();

async function dailySalt(day: string) {
  const cached = saltCache.get(day);
  if (cached) return cached;

  const date = new Date(`${day}T00:00:00Z`);
  let row = await db.dailySalt.findUnique({ where: { day: date } });
  if (!row) {
    try {
      row = await db.dailySalt.create({ data: { day: date, salt: randomBytes(32).toString("hex") } });
      // First request of a new day: drop salts older than yesterday.
      await db.dailySalt.deleteMany({ where: { day: { lt: new Date(date.getTime() - 24 * 60 * 60 * 1000) } } });
    } catch (error) {
      // Another request created today's salt at the same moment.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      row = await db.dailySalt.findUniqueOrThrow({ where: { day: date } });
    }
  }
  saltCache.clear(); // only ever keep the current day
  saltCache.set(day, row.salt);
  return row.salt;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
  );
}

// Same visitor + same scope (a slot) + same day = same hash.
export async function visitorHash(request: Request, scope: string) {
  const day = utcDay();
  const salt = await dailySalt(day);
  const ua = request.headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${salt}|${clientIp(request)}|${ua}|${scope}`).digest("hex");
}

// Crawlers, link previewers, monitoring, and HTTP libraries. Their views and clicks aren't counted.
const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|slack|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|httpclient|scrapy/i;

export function isBot(request: Request) {
  const ua = request.headers.get("user-agent");
  return !ua || BOT_UA.test(ua);
}
