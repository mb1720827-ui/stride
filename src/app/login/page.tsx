import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { Logo } from "../ui";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <Logo />
        <h1 className="mt-4 text-2xl font-bold">Plans that fit your day</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Type a task, a habit or a skill you want in plain words. Stride turns it into steps in your free time and reminds you
          at the right moments.
        </p>
      </div>
      <Suspense fallback={null}>
        <ConfirmError searchParams={searchParams} />
      </Suspense>
      <AuthForm />
    </main>
  );
}

async function ConfirmError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "confirm") return null;
  return (
    <p role="alert" className="text-sm text-rose-600">
      That confirmation link didn&apos;t work. It may have expired, so try signing up again.
    </p>
  );
}
