// Deploy to https://oripa-prod-psi.vercel.app/ and stamp the deploy with a git
// tag so every production release is traceable from the handoff baseline
// (poc-handoff-v21.7). Diff any deploy against the baseline with:
//
//   git log poc-handoff-v21.7..<deploy-tag>
//   git diff poc-handoff-v21.7..<deploy-tag>
//
// Usage: npm run deploy
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function sh(cmd, env) {
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
}

// Read the current app version (auto-bumped per commit).
const versionSrc = readFileSync(new URL("../app/version.ts", import.meta.url), "utf8");
const version = (versionSrc.match(/v\d+\.\d+/) || ["v0.0"])[0];

// Timestamped, human-readable deploy tag: deploy-YYYYMMDD-HHMM-vX.Y
const d = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
const tag = `deploy-${stamp}-${version}`;

// Refuse to deploy with a dirty tree so the tag matches exactly what ships.
const dirty = execSync("git status --porcelain").toString().trim();
if (dirty) {
  console.error("Working tree is not clean — commit or stash changes before deploying.");
  process.exit(1);
}

console.log(`\nDeploying ${version} to psi and tagging as ${tag} ...\n`);

// Tag the exact commit being deployed, then push branch + tag together.
sh(`git tag -a ${tag} -m "psi deploy ${version} (${stamp})"`);
sh("git push --follow-tags origin main", { CONFIRM_DEPLOY: "prod" });

console.log(`\nDeployed. Tagged this release as ${tag}.`);
