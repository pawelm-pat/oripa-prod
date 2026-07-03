import { NextResponse } from "next/server";
import { APP_VERSION } from "../../version";

export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null;
  const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || null;
  const branch = process.env.VERCEL_GIT_COMMIT_REF || null;
  const redeployConfigured = Boolean(process.env.VERCEL_DEPLOY_HOOK_URL);

  return NextResponse.json({
    version: APP_VERSION,
    commit,
    commitMessage,
    branch,
    redeployConfigured,
  });
}
