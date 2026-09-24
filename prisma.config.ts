import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Prisma CLI (migrations) needs a direct connection. On Neon, DATABASE_URL is the
  // pooled URL the app uses, and DATABASE_URL_UNPOOLED is the direct one.
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
