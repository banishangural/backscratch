// Mirrors WidgetConfig in src/lib/widget/config.ts (kept separate so the bundle has no app imports).
export type Card = { s: string; n: string; p: string; i: string | null };
export type Config = {
  h: string;
  a: string;
  t: "light" | "dark" | "auto";
  l: "compact" | "card";
  c: Card[];
  pv?: 1;
};
