// Scoped to the Shadow DOM, so host CSS can't reach in and ours can't leak out.
// Colors are CSS variables; the theme class on .w picks the set. "auto" follows the OS.

const LIGHT = "--bg:#fff;--fg:#18181b;--mu:#71717a;--bd:#e4e4e7;--hv:#f4f4f5;--lg:#f4f4f5";
const DARK = "--bg:#18181b;--fg:#fafafa;--mu:#a1a1aa;--bd:#3f3f46;--hv:#27272a;--lg:#27272a";

export const CSS = `
:host{all:initial;display:block}
.w{${LIGHT};font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);background:var(--bg);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;box-sizing:border-box;max-width:720px}
.w.dark{${DARK}}
@media (prefers-color-scheme:dark){.w.auto{${DARK}}}
.w *{box-sizing:border-box}
h2{margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--mu)}
ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.card ul{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
a.c{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:8px;color:inherit;text-decoration:none;border:1px solid var(--bd)}
.compact a.c{align-items:center;padding:6px 8px;border-color:transparent}
a.c:hover,a.c:focus-visible{background:var(--hv)}
a.c:focus-visible{outline:2px solid var(--mu);outline-offset:1px}
.l{flex:none;width:36px;height:36px;border-radius:8px;object-fit:cover;background:var(--lg);display:flex;align-items:center;justify-content:center;font-weight:600;color:var(--mu)}
.compact .l{width:24px;height:24px;border-radius:6px;font-size:12px}
.t{min-width:0}
.n{display:block;font-weight:600}
.p{display:block;color:var(--mu);font-size:13px}
.compact .p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v{display:block;margin-top:8px;text-align:right;font-size:11px}
.v a{color:var(--mu);text-decoration:none}
.v a:hover{text-decoration:underline}
.pv{margin:0 0 8px;font-size:12px;color:var(--mu)}
`;
