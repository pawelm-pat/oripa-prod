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
2. Bump the version: `node scripts/bump-version.mjs`.
3. Commit and push: `git push origin main`.

Deployment is handled by Vercel's Git integration (auto-deploy on push to
`main`). No custom deploy workflow lives in this repo.
