import type { Route } from "./+types/privacy";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Privacy — fabiel.org" }];
}

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        We collect only the information needed to provide courses, subscriptions, and job application workflows.
        This page is a placeholder and should be replaced with your final legal text.
      </p>
    </div>
  );
}
