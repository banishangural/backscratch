import { LIVE_WINDOW_HOURS, MIN_BAND_PAGES } from "@/config/widget";
import type { GoLiveChecks } from "@/lib/widget/go-live";

// The conditions a product needs to appear in the marketplace.
export function GoLiveChecklist({ checks, domain }: { checks: GoLiveChecks; domain: string }) {
  const live = checks.approved && checks.verified && checks.bandSpread;
  const items = [
    { ok: checks.approved, label: "Approved by an admin" },
    { ok: checks.verified, label: `Domain ${domain} verified` },
    { ok: checks.bandSeen, label: `Footer band loaded on ${domain} in the last ${LIVE_WINDOW_HOURS} hours` },
    { ok: checks.bandSpread, label: `…on at least ${MIN_BAND_PAGES} different pages (so it's in your site-wide layout)` },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className={`text-sm font-medium ${live ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
        {live ? "● Live: your product can appear in the marketplace." : "Not live yet. Still needed:"}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.label} className={item.ok ? "text-zinc-500" : ""}>
            {item.ok ? "✓" : "○"} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
