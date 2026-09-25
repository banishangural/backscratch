import Link from "next/link";
import { InstallSnippet } from "@/components/install-snippet";
import { WidgetSettingsForm } from "@/components/widget-settings-form";
import { LIVE_WINDOW_HOURS, MIN_BAND_PAGES } from "@/config/widget";
import { timeAgo } from "@/lib/time-ago";
import { liveSince } from "@/lib/widget/go-live";
import { createPreviewToken } from "@/lib/widget/preview-token";

type Slot = {
  id: string;
  theme: string;
  layout: string;
  bandLastSeenAt: Date | null;
  bandLastSeenHost: string | null;
  badgeLastSeenAt: Date | null;
  badgeLastSeenHost: string | null;
};
type Props = {
  product: { id: string; url: string; domain: string; offersBadge: boolean; badgeCorner: string };
  slot: Slot;
  bandPages: { path: string }[]; // distinct pages within the live window
  appUrl: string;
};

// The product's one widget install: code, settings, where each placement was last seen,
// warnings, and preview links.
export function WidgetPanel({ product, slot, bandPages, appUrl }: Props) {
  const since = liveSince();
  const badgeStale = product.offersBadge && !(slot.badgeLastSeenAt && slot.badgeLastSeenAt >= since);
  const token = createPreviewToken(slot.id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Paste this once, just above the footer in your site-wide layout or template, so it&apos;s on every page. It
        shows the “Tools we recommend” band there, plus the corner badge if you offer it. Visitors see nothing until you
        have active swaps, and only loads on {product.domain} count.
      </p>
      <InstallSnippet snippet={`<script src="${appUrl}/w.js" data-slot="${slot.id}" async></script>`} />

      <WidgetSettingsForm
        productId={product.id}
        settings={{ theme: slot.theme, layout: slot.layout, offersBadge: product.offersBadge, badgeCorner: product.badgeCorner }}
      />

      <ul className="flex flex-col gap-1 text-sm">
        <li>
          <span className="font-medium">Footer band:</span> {lastSeen(slot.bandLastSeenAt, slot.bandLastSeenHost)}
          {bandPages.length > 0 && (
            <span className="text-zinc-500">
              {" "}· on {bandPages.length} page{bandPages.length === 1 ? "" : "s"} in the last {LIVE_WINDOW_HOURS} h:{" "}
              {bandPages.slice(0, 6).map((page) => page.path).join(", ")}
              {bandPages.length > 6 && ", …"}
            </span>
          )}
        </li>
        <li>
          <span className="font-medium">Corner badge:</span>{" "}
          {product.offersBadge ? lastSeen(slot.badgeLastSeenAt, slot.badgeLastSeenHost) : "not offered"}
        </li>
      </ul>

      {bandPages.length < MIN_BAND_PAGES && (
        <Warning>
          The band has loaded on {bandPages.length} of the {MIN_BAND_PAGES} different pages needed in the last{" "}
          {LIVE_WINDOW_HOURS} hours. Put the code in your site-wide layout, not on a single page, then visit a few pages.
        </Warning>
      )}
      {badgeStale && (
        <Warning>
          Your corner badge hasn&apos;t loaded on {product.domain} in the last {LIVE_WINDOW_HOURS} hours, so it counts as
          not offered: your swaps run on the footer band only until it loads again.
        </Warning>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        <Link href={`/products/${product.id}/preview`} className="hover:underline">Preview</Link>
        <a href={`${product.url.split("#")[0]}#bs-preview=${token}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          Preview on my site (link valid 1 hour)
        </a>
      </div>
    </div>
  );
}

function lastSeen(at: Date | null, host: string | null) {
  if (!at) return "not seen on your site yet";
  return `last seen ${timeAgo(at)} on ${host ?? "your site"}`;
}

function Warning({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{children}</p>;
}
