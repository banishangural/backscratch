import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold">Backscratch</Link>
        <span className="flex-1" />
        {user ? (
          <>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            {user.isAdmin && <Link href="/admin" className="hover:underline">Admin</Link>}
            <span className="hidden text-zinc-500 sm:inline">{user.email}</span>
            <form action={logout}>
              <button className="text-zinc-600 hover:underline dark:text-zinc-400">Sign out</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:underline">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
