import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Owner-only preview. Our login cookie can't be read on the founder's own site, so the
// product page hands out a short-lived signed token ("<expiry>.<signature>") bound to one slot.

const TTL_SECONDS = 60 * 60;

function sign(slotId: string, expires: number) {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`widget-preview:${slotId}:${expires}`)
    .digest("base64url");
}

export function createPreviewToken(slotId: string) {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return `${expires}.${sign(slotId, expires)}`;
}

export function isValidPreviewToken(slotId: string, token: string | null) {
  const match = token?.match(/^(\d{10})\.([\w-]{43})$/);
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(slotId, expires));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
