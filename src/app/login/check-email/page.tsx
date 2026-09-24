export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        We sent you a sign-in link. It expires in 30 minutes. You can close this tab.
      </p>
    </main>
  );
}
