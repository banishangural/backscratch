import "server-only";
import { z } from "zod";

// Server-side environment, validated once at startup. Import `env` instead of reading process.env.
// Keys for later phases are optional here and become required when their phase lands.

const csv = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("Backscratch"),
  APP_URL: z.url(),
  DATABASE_URL: z.url(),

  AUTH_SECRET: z.string().optional(),
  AUTH_RESEND_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_EMAILS: csv,

  ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  MAX_ACTIVE_SWAPS_PER_PRODUCT: z.coerce.number().int().positive().default(5),
  SWAP_DEFAULT_DAYS: z.coerce.number().int().positive().default(30),
  SWAP_RENEWAL_REMINDER_DAYS: z.coerce.number().int().positive().default(5),
  SWAP_REREQUEST_COOLDOWN_DAYS: z.coerce.number().int().nonnegative().default(14),
  HEARTBEAT_PAUSE_HOURS: z.coerce.number().int().positive().default(72),
  MARKETPLACE_MIN_MONTHLY_VISITORS: z.coerce.number().int().nonnegative().default(0),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Only the names of invalid keys are printed, never their values.
  const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment variables: ${keys}. See .env.example.`);
}

export const env = parsed.data;
