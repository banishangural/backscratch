import type { PathBreakdown as Breakdown } from "@/lib/widget/path-stats";
import { PATH_STATS_DAYS } from "@/lib/widget/path-stats";

const LABELS = { BAND: "Footer band", BADGE: "Corner badge" } as const;

// Which pages the widget's views came from, per placement, e.g. "/blog 70%, / 20%".
export function PathBreakdown({ breakdown }: { breakdown: Breakdown }) {
  const placements = (["BAND", "BADGE"] as const).filter((placement) => breakdown[placement].total > 0);
  if (placements.length === 0) {
    return <p className="text-sm text-zinc-500">No views in the last {PATH_STATS_DAYS} days yet. They appear once you have active swaps.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">Views of your widget in the last {PATH_STATS_DAYS} days, by page. Partners will see this from the marketplace.</p>
      {placements.map((placement) => (
        <div key={placement} className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {LABELS[placement]} <span className="font-normal text-zinc-500">· {breakdown[placement].total.toLocaleString()} views</span>
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {breakdown[placement].paths.map((row) => (
              <li key={row.path} className="flex items-center gap-2">
                <span className="w-40 truncate font-mono text-xs">{row.path}</span>
                <span className="h-2 rounded bg-zinc-300 dark:bg-zinc-700" style={{ width: `${Math.max(2, row.share * 60)}%` }} />
                <span className="text-xs text-zinc-500">{row.share < 0.005 ? "<1" : Math.round(row.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
