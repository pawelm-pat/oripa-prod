// Bumps the version in app/version.ts by 0.1 each commit: 1.1, 1.2, ... 1.9, 2.0
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../app/version.ts", import.meta.url);
const src = readFileSync(path, "utf8");
const m = src.match(/v(\d+)\.(\d+)/);

let major = m ? Number(m[1]) : 1;
let minor = (m ? Number(m[2]) : 0) + 1;
if (minor > 9) {
  major += 1;
  minor = 0;
}
const next = `v${major}.${minor}`;

writeFileSync(
  path,
  `// Auto-bumped on each commit by scripts/bump-version.mjs\nexport const APP_VERSION = "${next}";\n`,
);

console.log(next);
