# Oripa PROD — Contributing & Agent Rules

Near-production Oripa client preview. Trimmed from the `prize-history-poc`
exploration build: only the phone experience ships here.

## Scope

- Entry point is the **logged-out lobby (V2)** with banners replaced by image
  placeholders (keep the ratios; drop real assets in later).
- Login offers **LINE** and **Google** first; tapping LINE logs in instantly.
- After login the first-login onboarding (welcome / daily rewards / first-draw
  coach) is **skipped** — users land straight on the lobby.
- Header notifications are kept as-is.
- Versioning starts at **v1.0** (`app/version.ts`).

## Workflow for every change

1. Make the change on `main`.
2. Commit locally. The `pre-commit` hook bumps `app/version.ts` for you — do
   **not** run `node scripts/bump-version.mjs` by hand, or the version advances
   twice for one change.
3. Stop and ask before deploying (see below).

## Versioning

`app/version.ts` holds a single `APP_VERSION` string, bumped by 0.1 on every
commit. It is load-bearing in three places, so keep the mechanism intact:

- **Stale-tab detection** — the app polls `/api/version` every 60s and compares
  it against the version compiled into the loaded bundle; on mismatch it offers
  the user a reload. Reviewers keep the POC open for hours, so this is what
  stops feedback being filed against a build that is no longer current.
- **Feedback provenance** — `app/api/comments/route.ts` stamps `APP_VERSION`
  onto every comment before it reaches Redis and Slack, so each report records
  the build it was made against.
- **The footer badge** — the visible marker for confirming at a glance which
  build is live, which matters because production is behind Vercel
  Authentication and cannot be inspected anonymously.

## Deploying

Production is <https://oripa-prod-psi.vercel.app/>, published by Vercel's Git
integration on push to `main`. `npm run deploy` tags the release and pushes.

A `pre-push` hook guards this: it prints the target URL and requires an
interactive `yes`. Tooling with no terminal can pass `CONFIRM_DEPLOY=prod git
push` instead — but that flag exists to carry a confirmation the user has
*already* given, never to substitute for one.

**Never deploy on your own initiative.** Pushing `main` ships to production, so
an agent must ask the user to confirm and wait for an explicit yes before
running `npm run deploy` or pushing `main` — even when the change itself was
requested. Landing work locally (commit, no push) needs no confirmation.
