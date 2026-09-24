import Link from "next/link";

// Placeholder landing page. Replaced by the real landing page later.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Backscratch</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        A cross-promotion swap network for indie SaaS and web apps. List your product, add the
        &ldquo;Tools we recommend&rdquo; widget, and swap recommendations with founders you choose.
      </p>
      <Link
        href="/dashboard"
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        List your product
      </Link>
    </main>
  );
}
