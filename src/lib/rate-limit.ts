import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Fixed-window rate limiter backed by the RateLimitBucket table, so it works across
// serverless instances. Returns true when the call is allowed.
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Occasionally clear out old windows so the table stays small.
  if (Math.random() < 0.01) {
    await db.rateLimitBucket.deleteMany({
      where: { windowStart: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  }

  return bucket.count <= limit;
}

// Keyed hash of a value (IP, email) for use in rate-limit keys. Never store the raw value.
export function hashForKey(value: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("hex").slice(0, 32);
}

// Best-effort client IP from the proxy headers set by Vercel (or localhost in dev).
export async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return hashForKey(ip);
}
