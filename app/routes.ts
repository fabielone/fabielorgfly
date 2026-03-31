import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", { id: "site" }, [
    index("routes/home.tsx"),
    route("jobs", "routes/jobs.tsx"),
    route("jobs/:jobId/apply", "routes/jobs.$jobId.apply.tsx"),
    route("jobs/:jobId/apply/confirm", "routes/job-apply-confirm.tsx"),
    route("sign-in", "routes/sign-in.tsx"),
    route("settings", "routes/settings.tsx"),
    route("account", "routes/account.tsx"),
    route("courses", "routes/courses.tsx"),
    route("courses/:slug", "routes/courses.$slug.tsx"),
    route("schedule", "routes/schedule.tsx"),
    route("subscribe", "routes/subscribe.tsx"),
    route("privacy", "routes/privacy.tsx"),
    route("terms", "routes/terms.tsx"),
  ]),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("sign-out", "routes/sign-out.tsx"),
  route("api/webhooks/mercadopago", "routes/api.mercadopago-webhook.tsx"),
] satisfies RouteConfig;
