// Mirrors WidgetConfig in src/lib/widget/config.ts (kept separate so the bundle has no app imports).
export type Card = { s: string; n: string; p: string; i: string | null };
export type Config = {
  h: string;
  a: string;
  t: "light" | "dark" | "auto";
  l: "compact" | "card" | "row";
  c: Card[];
  b?: { k: "l" | "r"; c: Card[] };
  pv?: 1;
};

// What both placements need to render and report.
export type Ctx = {
  config: Config;
  // Link for a card, or null in preview. Goes through our /r/ redirect.
  href: (card: Card, placement: "band" | "badge") => string | null;
  // Reports a viewable impression of these swaps in this placement.
  view: (swapIds: string[], placement: "band" | "badge") => void;
  // Console notes for the owner preview and data-debug; does nothing otherwise.
  log: (...args: unknown[]) => void;
};
