import Link from "next/link";
import { InstallSnippet } from "@/components/install-snippet";
import { AddSlotForm, SlotSettingsForm } from "@/components/slot-form";
import { createPreviewToken } from "@/lib/widget/preview-token";

type Slot = { id: string; name: string; theme: string; layout: string; lastSeenAt: Date | null; lastSeenHost: string | null };
type Props = { productId: string; productUrl: string; domain: string; appUrl: string; slots: Slot[] };

// The founder's widget placements: install code, settings, heartbeat, and preview links.
export function SlotList({ productId, productUrl, domain, appUrl, slots }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Add one placement per spot on your site (e.g. “Thank-you page”), then paste its code where the widget
        should appear. It shows nothing to visitors until you have active swaps, and only loads on {domain} count
        toward going live.
      </p>
      {slots.map((slot) => {
        const token = createPreviewToken(slot.id);
        return (
          <div key={slot.id} className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <SlotSettingsForm slot={slot} />
            <InstallSnippet snippet={`<script src="${appUrl}/w.js" data-slot="${slot.id}" async></script>`} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{lastSeen(slot)}</span>
              <Link href={`/products/${productId}/slots/${slot.id}/preview`} className="hover:underline">Preview</Link>
              <a href={`${productUrl.split("#")[0]}#bs-preview=${token}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Preview on my site (link valid 1 hour)
              </a>
            </div>
          </div>
        );
      })}
      <AddSlotForm productId={productId} />
    </div>
  );
}

function lastSeen({ lastSeenAt, lastSeenHost }: Slot) {
  if (!lastSeenAt) return "Not seen on your site yet";
  return `Last seen ${timeAgo(lastSeenAt)} on ${lastSeenHost ?? "your site"}`;
}

function timeAgo(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
