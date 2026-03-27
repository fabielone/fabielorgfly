import type { Route } from "./+types/terms";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Terms and Conditions — fabiel.org" }];
}

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms and Conditions</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        By using this platform, you agree to our subscription terms, acceptable use, and application process.
        This page is a placeholder and should be replaced with your final legal text.
      </p>
    </div>
  );
}
