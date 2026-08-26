import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optional password gate for retired copies of this POC. Vercel's own password
// protection isn't available on Hobby teams, so the gate lives in the app: a
// project that sets SITE_PASSWORD asks for HTTP Basic credentials, and projects
// without it (the live site) serve as normal. SITE_USERNAME is optional — when
// it's unset any username is accepted, so only the password matters.
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const user = sep < 0 ? "" : decoded.slice(0, sep);
      const pass = sep < 0 ? decoded : decoded.slice(sep + 1);
      const expectedUser = process.env.SITE_USERNAME;
      if (pass === password && (!expectedUser || user === expectedUser)) return NextResponse.next();
    } catch {
      // Malformed credentials fall through to the challenge below.
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Oripa POC", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  // Everything but the build output's static files, so pages, API routes and
  // images in /public are all behind the prompt.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
