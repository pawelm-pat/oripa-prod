import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { APP_VERSION } from "../../version";

export const dynamic = "force-dynamic";

// Comments are scoped per-screen via the `section` field (e.g. "oripa",
// "mypage", "prizeHistory"). Stored under a PROD-specific key so they never
// mix with the flowmap comments.
const KEY = "comments:oripa-prod";
// Deleted comments are archived (never removed) so they can still be recovered.
const ARCHIVE_KEY = "comments:oripa-prod:deleted";
const MAX_KEEP = 500;
const NAME_MAX = 60;
const TEXT_MAX = 2000;
const SECTION_MAX = 80;
const REASON_MAX = 600;
const STATUSES = ["new", "inprogress", "resolved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

function normalizeStatus(s: unknown): Status {
  if (s === "pending" || !s) return "new";
  return STATUSES.includes(s as Status) ? (s as Status) : "new";
}

type Comment = {
  id: string;
  name: string;
  text: string;
  section?: string;
  version?: string;
  status: Status;
  reason?: string;
  resolvedBy?: string;
  ts: number;
  updatedAt?: number;
  deletedAt?: number;
};

// Find an env var by suffix regardless of the prefix Upstash/Vercel chose.
function findEnv(suffix: string, exclude?: string): string | undefined {
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (key.endsWith(suffix) && (!exclude || !key.includes(exclude))) return value;
  }
  return undefined;
}

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    findEnv("REST_API_URL");
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    findEnv("REST_API_TOKEN", "READ_ONLY");
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
}

// Human-friendly names for each screen key, so Slack readers know exactly
// where a comment was left (keep in sync with SCREEN_LABELS in comments.tsx).
const SECTION_LABELS: Record<string, string> = {
  landing: "Home (logged out)",
  signup: "Sign up",
  login: "Log in",
  oripa: "Lobby / Home",
  notifications: "Notifications",
  prizeHistory: "Winning history",
  purchaseHistory: "Purchase history",
  shippingAddress: "Address",
  mypage: "My Account",
  quest: "Quest",
  store: "Store",
};

function sectionLabel(section?: string): string {
  if (!section) return "Unknown screen";
  return SECTION_LABELS[section] || section;
}

async function notifySlack(comment: Comment): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  const appUrl = process.env.PROD_URL || "https://oripa-prod-one.vercel.app/";
  const label = sectionLabel(comment.section);
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // Fallback text (notifications / older clients).
        text: `:speech_balloon: New PROD comment by ${comment.name} on "${label}" (status: New)`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:speech_balloon: *New PROD comment*\n:bust_in_silhouette: Name: *${comment.name}*\n:round_pushpin: Section: *${label}*\n:label: Status: *New*`,
            },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `>${comment.text.replace(/\n/g, "\n>")}` },
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `${comment.version ? `\`${comment.version}\` · ` : ""}<${appUrl}|Open app>` },
            ],
          },
        ],
      }),
    });
  } catch {
    // Never let a Slack failure break commenting.
  }
}

function parseList(raw: Comment[]): Comment[] {
  return raw.map((c) => {
    const parsed = (typeof c === "string" ? JSON.parse(c) : c) as Comment;
    parsed.status = normalizeStatus(parsed.status);
    return parsed;
  });
}

export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { configured: false, currentVersion: APP_VERSION, comments: [] },
      { status: 200 }
    );
  }
  const comments = parseList(await redis.lrange<Comment>(KEY, 0, -1));

  const wantDeleted = new URL(req.url).searchParams.get("deleted") === "1";
  if (wantDeleted) {
    const deleted = parseList(await redis.lrange<Comment>(ARCHIVE_KEY, 0, -1));
    return NextResponse.json({ configured: true, currentVersion: APP_VERSION, comments, deleted });
  }

  return NextResponse.json({ configured: true, currentVersion: APP_VERSION, comments });
}

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Comments backend is not configured yet." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = clean(data.name, NAME_MAX) || "Anonymous";
  const text = clean(data.text, TEXT_MAX);
  const section = clean(data.section, SECTION_MAX);

  if (!text) {
    return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
  }

  const comment: Comment = {
    id: newId(),
    name,
    text,
    section: section || undefined,
    version: APP_VERSION,
    status: "new",
    ts: Date.now(),
  };

  await redis.lpush(KEY, JSON.stringify(comment));
  await redis.ltrim(KEY, 0, MAX_KEEP - 1);

  await notifySlack(comment);

  return NextResponse.json({ ok: true, comment });
}

// Bulk restore: replace the whole comment list from a backup file.
export async function PUT(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Comments backend is not configured yet." },
      { status: 503 }
    );
  }

  const adminToken = process.env.COMMENTS_ADMIN_TOKEN;
  if (adminToken && req.headers.get("x-admin-token") !== adminToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const arr = (body as Record<string, unknown>).comments;
  if (!Array.isArray(arr)) {
    return NextResponse.json({ error: "Expected a comments array." }, { status: 400 });
  }

  const cleaned: Comment[] = arr
    .slice(0, MAX_KEEP)
    .map((raw) => {
      const c = (raw ?? {}) as Record<string, unknown>;
      const comment: Comment = {
        id: clean(c.id, 80) || newId(),
        name: clean(c.name, NAME_MAX) || "Anonymous",
        text: clean(c.text, TEXT_MAX),
        section: clean(c.section, SECTION_MAX) || undefined,
        version: clean(c.version, 20) || undefined,
        status: normalizeStatus(c.status),
        reason: clean(c.reason, REASON_MAX) || undefined,
        resolvedBy: clean(c.resolvedBy, NAME_MAX) || undefined,
        ts: typeof c.ts === "number" ? c.ts : Date.now(),
        updatedAt: typeof c.updatedAt === "number" ? c.updatedAt : undefined,
      };
      return comment;
    })
    .filter((c) => c.text);

  await redis.del(KEY);
  if (cleaned.length) {
    await redis.rpush(KEY, ...cleaned.map((c) => JSON.stringify(c)));
  }

  return NextResponse.json({ ok: true, restored: cleaned.length });
}

// Update a comment's status + optional reason.
export async function PATCH(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Comments backend is not configured yet." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const id = clean(data.id, 80);
  const status = clean(data.status, 20) as Status;
  const reason = clean(data.reason, REASON_MAX);
  const resolvedBy = clean(data.resolvedBy, NAME_MAX);

  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid id or status." }, { status: 400 });
  }

  const raw = await redis.lrange<Comment>(KEY, 0, -1);
  const idx = raw.findIndex((c) => {
    const parsed = (typeof c === "string" ? JSON.parse(c) : c) as Comment;
    return parsed.id === id;
  });
  if (idx === -1) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const current = (typeof raw[idx] === "string" ? JSON.parse(raw[idx] as unknown as string) : raw[idx]) as Comment;
  const updated: Comment = {
    ...current,
    status,
    reason: reason || undefined,
    resolvedBy: resolvedBy || undefined,
    updatedAt: Date.now(),
  };

  await redis.lset(KEY, idx, JSON.stringify(updated));

  return NextResponse.json({ ok: true, comment: updated });
}

// Delete a comment by id.
export async function DELETE(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Comments backend is not configured yet." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = clean((body as Record<string, unknown>).id, 80);
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const raw = await redis.lrange<Comment>(KEY, 0, -1);
  const all = raw.map((c) => (typeof c === "string" ? (JSON.parse(c) as Comment) : c));
  const removed = all.find((c) => c.id === id);
  const remaining = all.filter((c) => c.id !== id);

  if (!removed) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  await redis.lpush(ARCHIVE_KEY, JSON.stringify({ ...removed, deletedAt: Date.now() }));
  await redis.ltrim(ARCHIVE_KEY, 0, MAX_KEEP - 1);

  await redis.del(KEY);
  if (remaining.length) {
    await redis.rpush(KEY, ...remaining.map((c) => JSON.stringify(c)));
  }

  return NextResponse.json({ ok: true, removed: id });
}
