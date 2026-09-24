// Founder-supplied logo URL, or the first letter of the name as a fallback.
// Plain <img>: logos live on founders' own hosts, so next/image can't know them in advance.
export function ProductLogo({ src, name, size }: { src: string | null; name: string; size: number }) {
  const style = { width: size, height: size };
  if (!src) {
    return (
      <div style={style} className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-200 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={style} referrerPolicy="no-referrer" className="shrink-0 rounded-lg object-cover" />;
}
