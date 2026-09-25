// Local test data. Wipes the database, then creates users, products, swaps, and events.
// Run with: npm run db:seed
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { CategoryKey } from "../src/config/categories";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed in production.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000);

// Deterministic pseudo-random numbers so every seed run produces the same data.
let state = 42;
function random() {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
}
const randomInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const fakeHash = (value: string) => createHash("sha256").update(value).digest("hex");
const pairKey = (a: string, b: string) => [a, b].sort().join(":");

async function wipe() {
  // Deleting users cascades to products, slots, swaps, events, snapshots, and reports.
  await db.user.deleteMany();
  await db.verificationToken.deleteMany();
  await db.dailySalt.deleteMany();
  await db.rateLimitBucket.deleteMany();
}

async function createUsers() {
  const adminEmail = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() || "admin@example.com";
  const [admin, ana, ben] = await Promise.all([
    db.user.create({ data: { email: adminEmail.toLowerCase(), name: "Admin" } }),
    db.user.create({ data: { email: "ana@example.com", name: "Ana (founder)" } }),
    db.user.create({ data: { email: "ben@example.com", name: "Ben (founder)" } }),
  ]);
  return { admin, ana, ben };
}

type ProductSeed = {
  ownerId: string;
  name: string;
  domain: string;
  pitch: string;
  category: CategoryKey;
  audience: string;
  status: Prisma.ProductCreateInput["status"];
  statusReason?: string;
  verified: boolean;
  lastSeenHoursAgo?: number; // when the widget last loaded on the product's site
  offersBadge?: boolean;
};

// Pages where seeded widgets have loaded (enough distinct pages to go live).
const SEEN_PATHS = ["/", "/pricing", "/blog", "/blog/:id"];

async function createProduct(seed: ProductSeed) {
  const listed = seed.status === "APPROVED" && seed.verified && (seed.lastSeenHoursAgo ?? 999) < 72;
  return db.product.create({
    data: {
      owner: { connect: { id: seed.ownerId } },
      name: seed.name,
      url: `https://${seed.domain}`,
      domain: seed.domain,
      verifiedDomain: seed.verified ? seed.domain : null,
      pitch: seed.pitch,
      category: seed.category,
      audience: seed.audience,
      status: seed.status,
      statusReason: seed.statusReason,
      listedAt: listed ? daysAgo(20) : null,
      showSwapStats: true,
      showRevenue: seed.name === "Invoicely",
      verification: {
        create: {
          method: seed.verified ? "META_TAG" : null,
          token: `bs-verify-${randomBytes(8).toString("hex")}`,
          verifiedAt: seed.verified ? daysAgo(25) : null,
          lastCheckedAt: daysAgo(25),
        },
      },
      offersBadge: seed.offersBadge ?? false,
      slot: { create: slotData(seed) },
    },
    include: { slot: true },
  });
}

function slotData(seed: ProductSeed): Prisma.SlotCreateWithoutProductInput {
  if (seed.lastSeenHoursAgo === undefined) return {};
  const seenAt = hoursAgo(seed.lastSeenHoursAgo);
  const pages: Prisma.PlacementPageCreateWithoutSlotInput[] = SEEN_PATHS.map((path) => ({ placement: "BAND", path, host: seed.domain, lastSeenAt: seenAt }));
  if (seed.offersBadge) pages.push(...pages.map((page) => ({ ...page, placement: "BADGE" as const })));
  return {
    bandLastSeenAt: seenAt,
    bandLastSeenHost: seed.domain,
    bandSpreadAt: seenAt,
    ...(seed.offersBadge && { badgeLastSeenAt: seenAt, badgeLastSeenHost: seed.domain }),
    pages: { create: pages },
  };
}

async function createProducts(owners: { ana: string; ben: string }) {
  const invoicely = await createProduct({
    ownerId: owners.ana,
    name: "Invoicely",
    domain: "invoicely.example",
    pitch: "Send beautiful invoices and get paid twice as fast.",
    category: "invoicing",
    audience: "Freelancers and small agencies",
    status: "APPROVED",
    verified: true,
    lastSeenHoursAgo: 1,
    offersBadge: true,
  });
  const formForge = await createProduct({
    ownerId: owners.ana,
    name: "FormForge",
    domain: "formforge.example",
    pitch: "Drag-and-drop forms that feel like a conversation.",
    category: "forms",
    audience: "Marketers and indie makers",
    status: "APPROVED",
    verified: true,
    lastSeenHoursAgo: 2,
  });
  const mailPilot = await createProduct({
    ownerId: owners.ben,
    name: "MailPilot",
    domain: "mailpilot.example",
    pitch: "Email campaigns for SaaS founders, without the bloat.",
    category: "email-marketing",
    audience: "Early-stage SaaS founders",
    status: "APPROVED",
    verified: true,
    lastSeenHoursAgo: 3,
    offersBadge: true,
  });
  const chartNest = await createProduct({
    ownerId: owners.ben,
    name: "ChartNest",
    domain: "chartnest.example",
    pitch: "Privacy-first product analytics in one script tag.",
    category: "analytics",
    audience: "Product teams at small SaaS companies",
    status: "APPROVED",
    verified: true,
    lastSeenHoursAgo: 96, // widget missing for 4 days -> not listed, swap auto-paused
  });
  await createProduct({
    ownerId: owners.ben,
    name: "ShipLog",
    domain: "shiplog.example",
    pitch: "A public changelog your users will actually read.",
    category: "changelog",
    audience: "SaaS teams shipping weekly",
    status: "PENDING",
    verified: true,
  });
  await createProduct({
    ownerId: owners.ana,
    name: "RankRocket",
    domain: "rankrocket.example",
    pitch: "Guaranteed #1 Google ranking in 7 days!!!",
    category: "seo",
    audience: "Everyone",
    status: "REJECTED",
    statusReason: "Pitch makes guarantees we can't verify. Please describe what the product does.",
    verified: true,
  });
  const shadyLeads = await createProduct({
    ownerId: owners.ben,
    name: "LeadBlaster",
    domain: "leadblaster.example",
    pitch: "10,000 verified leads for $9.",
    category: "lead-gen",
    audience: "Sales teams",
    status: "SUSPENDED",
    statusReason: "Suspended after reports of scraped contact data.",
    verified: true,
    lastSeenHoursAgo: 10,
  });
  return { invoicely, formForge, mailPilot, chartNest, shadyLeads };
}

type SeededProduct = Awaited<ReturnType<typeof createProduct>>;

async function createSwaps(p: Awaited<ReturnType<typeof createProducts>>) {
  const swap = (a: SeededProduct, b: SeededProduct, data: Omit<Prisma.SwapUncheckedCreateInput, "productAId" | "productBId" | "pairKey">) =>
    db.swap.create({ data: { productAId: a.id, productBId: b.id, pairKey: pairKey(a.id, b.id), ...data } });

  const active = await swap(p.invoicely, p.mailPilot, {
    status: "ACTIVE",
    message: "Our users send invoices, yours send newsletters. Want to swap?",
    startsAt: daysAgo(14),
    endsAt: daysAgo(14 - 30),
    respondedAt: daysAgo(14),
  });
  await swap(p.formForge, p.chartNest, {
    status: "PAUSED",
    message: "Forms + analytics feels like a natural fit.",
    startsAt: daysAgo(10),
    endsAt: daysAgo(10 - 30),
    respondedAt: daysAgo(10),
    pausedAt: hoursAgo(24),
    pauseReason: "HEARTBEAT",
  });
  await swap(p.formForge, p.mailPilot, {
    status: "REQUESTED",
    message: "Hi Ben, would love to recommend MailPilot on our site.",
  });
  await swap(p.chartNest, p.invoicely, {
    status: "ENDED",
    startsAt: daysAgo(70),
    endsAt: daysAgo(40),
    respondedAt: daysAgo(70),
    endedAt: daysAgo(40),
  });
  await swap(p.mailPilot, p.formForge, {
    status: "DECLINED",
    message: "Quick swap?",
    respondedAt: daysAgo(5), // still inside the 14-day re-request cooldown
  });
  return active;
}

// Page paths for seeded events: "/blog" most often, then "/", then the rest.
const PATH_WEIGHTS = ["/blog", "/blog", "/blog", "/blog/:id", "/blog/:id", "/", "/", "/pricing"];

// ~14 days of views, clicks, and conversions in both directions of one active swap.
async function createEvents(swapId: string, a: SeededProduct, b: SeededProduct) {
  const events: Prisma.EventCreateManyInput[] = [];
  const directions = [
    { source: a, destination: b, dailyViews: [40, 70] as const },
    { source: b, destination: a, dailyViews: [25, 50] as const },
  ];

  for (let day = 13; day >= 0; day--) {
    const dayKey = daysAgo(day).toISOString().slice(0, 10);
    for (const { source, destination, dailyViews } of directions) {
      const slotId = source.slot!.id;
      const views = randomInt(dailyViews[0], dailyViews[1]);
      for (let v = 0; v < views; v++) {
        const visitorHash = fakeHash(`${dayKey}:${source.id}:${v}`);
        const at = new Date(daysAgo(day).getTime() - randomInt(0, 20) * 60 * 60 * 1000);
        // Both products offer the badge, so the swap runs on the band and the badge.
        const placement = random() < 0.6 ? ("BAND" as const) : ("BADGE" as const);
        const pagePath = PATH_WEIGHTS[randomInt(0, PATH_WEIGHTS.length - 1)];
        const base = { swapId, sourceProductId: source.id, destinationProductId: destination.id, visitorHash };
        const tag = placement === "BADGE" ? "g" : "b";
        events.push({ ...base, type: "VIEW", slotId, placement, pagePath, dedupeKey: `v:${slotId}:${tag}:${swapId}:${visitorHash}:${dayKey}`, createdAt: at });

        if (random() < 0.04) {
          const clickId = randomBytes(10).toString("hex");
          events.push({ ...base, type: "CLICK", slotId, placement, pagePath, clickId, createdAt: at });
          if (random() < 0.2) {
            events.push({
              ...base,
              type: "CONVERSION",
              convertedClickId: clickId,
              dedupeKey: `c:${clickId}`,
              createdAt: new Date(at.getTime() + 10 * 60 * 1000),
            });
          }
        }
      }
    }
  }

  await db.event.createMany({ data: events });
  return events.length;
}

async function main() {
  await wipe();
  const users = await createUsers();
  const products = await createProducts({ ana: users.ana.id, ben: users.ben.id });
  const activeSwap = await createSwaps(products);
  const eventCount = await createEvents(activeSwap.id, products.invoicely, products.mailPilot);

  await db.metricSnapshot.create({
    data: {
      productId: products.invoicely.id,
      source: "STRIPE",
      revenueBand: "$1k–$5k MRR",
      activeSubscriptions: 142,
      customerCount: 187,
      fetchedAt: hoursAgo(6),
    },
  });

  await db.report.create({
    data: {
      reporterId: users.ana.id,
      productId: products.shadyLeads.id,
      reason: "misleading",
      details: "Their leads list contained my personal email.",
    },
  });

  console.log(`Seeded 3 users, 7 products, 5 swaps, ${eventCount} events.`);
  console.log(`Admin login email: ${users.admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
