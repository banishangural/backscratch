import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

// Emails about the corner badge on active swaps. Offering the badge is standing permission:
// swaps with partners who offer it too start running on the badge, and both founders hear
// about it. Removing it takes it off both sides, so those partners hear about that too.

const person = { select: { name: true, owner: { select: { email: true } } } };

export async function notifyBadgeChange(productId: string, offered: boolean) {
  // Toggling back and forth shouldn't flood partners' inboxes.
  if (!(await rateLimit(`badge-notify:${productId}`, 4, 24 * 60 * 60))) return;

  const swaps = await db.swap.findMany({
    where: { status: "ACTIVE", OR: [{ productAId: productId }, { productBId: productId }] },
    select: {
      productAId: true,
      productA: { select: { offersBadge: true, ...person.select } },
      productB: { select: { offersBadge: true, ...person.select } },
    },
  });

  for (const swap of swaps) {
    const [self, partner] = swap.productAId === productId ? [swap.productA, swap.productB] : [swap.productB, swap.productA];
    if (!partner.offersBadge) continue; // the swap never ran on the badge, and won't now

    const messages = offered
      ? [self, partner].map((product) => ({
          to: product.owner.email,
          subject: `Your swap between ${self.name} and ${partner.name} now includes the corner badge`,
          text:
            `${self.name} now offers the corner badge, and ${partner.name} already does, so your swap runs on both ` +
            `products' corner badges as well as the footer band. It starts once both badges have loaded on your sites ` +
            `within the last 72 hours.\n\nYou can stop offering the badge anytime in your widget settings on ${env.APP_NAME}.`,
        }))
      : [
          {
            to: partner.owner.email,
            subject: `${self.name} removed the corner badge from your swap`,
            text:
              `${self.name} no longer offers the corner badge, so your swap now runs on the footer band only, on both ` +
              `sites. Your badge keeps showing your other partners who offer it.\n\n${env.APP_NAME}: ${env.APP_URL}`,
          },
        ];
    for (const message of messages) {
      await sendEmail(message).catch((error) => console.error("Badge email failed:", error));
    }
  }
}
