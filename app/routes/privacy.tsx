import type { Route } from "./+types/privacy";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Privacy — fabiel.org" }];
}

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        We collect only the information needed to provide our services and job application workflows.
        When you create an account you can choose whether to receive job-related updates and marketing emails; you may
        change those choices anytime on the Settings page or in your account profile.
        This page is a placeholder and should be replaced with your final legal text.
      </p>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        A cookie banner lets you choose <strong>essential only</strong> (needed for the app to function) or{" "}
        <strong>accept all</strong>, which may load privacy-oriented analytics (for example Plausible) when configured.
        Your choice is stored in your browser; you can clear site data to see the banner again.
      </p>
    </div>
  );
}
