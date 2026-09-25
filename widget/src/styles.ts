// Scoped to each Shadow DOM, so host CSS can't reach in and ours can't leak out.
// Colors are CSS variables; the theme class on .w picks the set. "auto" follows the OS.

const LIGHT = "--bg:#fff;--fg:#18181b;--mu:#71717a;--bd:#e4e4e7;--hv:#f4f4f5;--lg:#f4f4f5";
const DARK = "--bg:#18181b;--fg:#fafafa;--mu:#a1a1aa;--bd:#3f3f46;--hv:#27272a;--lg:#27272a";

// Shared: theme, card links, logo, "via" link.
const BASE = `
:host{all:initial;display:block}
[hidden]{display:none!important}
.w{${LIGHT};font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);background:var(--bg);box-sizing:border-box}
.w.dark{${DARK}}
@media (prefers-color-scheme:dark){.w.auto{${DARK}}}
.w *{box-sizing:border-box}
a.c{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:8px;color:inherit;text-decoration:none;border:1px solid var(--bd)}
a.c:hover,a.c:focus-visible{background:var(--hv)}
a.c:focus-visible,button:focus-visible{outline:2px solid var(--mu);outline-offset:1px}
.l{flex:none;width:36px;height:36px;border-radius:8px;object-fit:cover;background:var(--lg);display:flex;align-items:center;justify-content:center;font-weight:600;color:var(--mu)}
.t{min-width:0}
.n{display:block;font-weight:600}
.p{display:block;color:var(--mu);font-size:13px}
.v{display:block;margin-top:8px;text-align:right;font-size:11px}
.v a{color:var(--mu);text-decoration:none}
.v a:hover{text-decoration:underline}
.pv{margin:0 0 8px;font-size:12px;color:var(--mu)}
`;

// Footer band: full width of its container, content centered. Row = side by side, wrapping;
// card = stacked; compact = a one-line list.
export const BAND_CSS = `${BASE}
.w{width:100%;border-top:1px solid var(--bd);padding:20px 16px}
.in{max-width:1080px;margin:0 auto}
h2{margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--mu)}
ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.row ul{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.card ul{max-width:560px}
.compact a.c{align-items:center;padding:6px 8px;border-color:transparent}
.compact .l{width:24px;height:24px;border-radius:6px;font-size:12px}
.compact .p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;

// Corner badge: a small card, or a minimized tab / phone pill.
export const BADGE_CSS = `${BASE}
.w{background:none}
.bx{width:280px;max-width:calc(100vw - 32px);background:var(--bg);border:1px solid var(--bd);border-radius:12px;padding:10px;box-shadow:0 4px 16px rgba(0,0,0,.12)}
.hd{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px 2px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--mu)}
button{font:inherit;color:inherit;cursor:pointer}
.x{border:0;background:none;color:var(--mu);font-size:16px;line-height:1;padding:2px 6px;border-radius:6px}
.x:hover{background:var(--hv)}
.bx .p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.v{margin-top:6px}
.tab{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;background:var(--bg);border:1px solid var(--bd);border-radius:999px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.tab .l{width:22px;height:22px;border-radius:999px;font-size:11px}
`;
