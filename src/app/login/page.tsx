import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

// Auth.js sends errors back here as ?error=<type>.
const ERRORS: Record<string, string> = {
  Configuration: "We couldn't send a sign-in link. If you asked for several links, wait a few minutes and try again.",
  Verification: "That sign-in link has expired or was already used. Request a new one.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">No password. We&apos;ll email you a link.</p>
      </div>
      {message && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{message}</p>}
      <LoginForm />
    </main>
  );
}
