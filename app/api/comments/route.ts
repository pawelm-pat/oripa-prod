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
const STATUSES = ["new", "inreview", "inprogress", "resolved", "rejected", "deleted"] as const;
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
  // Slack message references so a status change edits the SAME message
  // instead of posting a new one (requires a bot token, see notes below).
  slackTs?: string;
  slackChannel?: string;
  // Separate copy posted to the external client channel once "In review".
  slackExternalTs?: string;
  slackExternalChannel?: string;
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
  myLoot: "My Loot",
  purchaseHistory: "Purchase history",
  shippingAddress: "Address",
  mypage: "My Account",
  quest: "Quest",
  store: "Store",
  coinHistory: "Coin History",
};

function sectionLabel(section?: string): string {
  if (!section) return "Unknown screen";
  return SECTION_LABELS[section] || section;
}

const STATUS_TEXT: Record<Status, string> = {
  new: "New",
  inreview: "In review",
  inprogress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  deleted: "Deleted",
};

const STATUS_EMOJI: Record<Status, string> = {
  new: ":speech_balloon:",
  inreview: ":eyes:",
  inprogress: ":hammer_and_wrench:",
  resolved: ":white_check_mark:",
  rejected: ":x:",
  deleted: ":wastebasket:",
};

// Build a link that opens the app directly on the screen the comment lives on.
function appLink(section?: string): string {
  const base = (process.env.PROD_URL || "https://oripa-prod-one.vercel.app/").replace(/\/+$/, "");
  return section ? `${base}/?screen=${encodeURIComponent(section)}` : `${base}/`;
}

// Keep comments short in Slack so channels stay scannable; the full text is
// always one click away via the "Open screen" link.
const SNIPPET_MAX = 240;
const NOTE_SNIPPET_MAX = 140;

// A single compact message layout, reused for the initial post AND every edit,
// so status changes just re-render the same message with the new status.
// Two tight lines: [status · author · section] + comment, then a small meta
// context line. Link unfurling is disabled by the callers to save space.
function buildMessage(comment: Comment): { text: string; blocks: unknown[] } {
  const label = sectionLabel(comment.section);
  const link = appLink(comment.section);
  const statusText = STATUS_TEXT[comment.status] || comment.status;
  const emoji = STATUS_EMOJI[comment.status] || ":speech_balloon:";
  const by = comment.resolvedBy ? ` → ${comment.resolvedBy}` : "";
  const full = comment.text.replace(/\s*\n+\s*/g, " ").trim();
  const snippet = full.length > SNIPPET_MAX ? `${full.slice(0, SNIPPET_MAX)}…` : full;
  const header = `${emoji} *${statusText}* · *${comment.name}*${by} · _${label}_`;

  const meta: string[] = [];
  if (comment.version) meta.push(`\`${comment.version}\``);
  if (comment.reason && comment.reason.trim()) {
    const r = comment.reason.replace(/\s*\n+\s*/g, " ").trim();
    meta.push(`:memo: ${r.length > NOTE_SNIPPET_MAX ? `${r.slice(0, NOTE_SNIPPET_MAX)}…` : r}`);
  }
  meta.push(`<${link}|Open screen>`);

  return {
    text: `${emoji} ${label}: ${comment.name} — ${statusText}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `${header}\n${snippet}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: meta.join("  ·  ") }] },
    ],
  };
}

// --- Slack Web API (bot token) -------------------------------------------
// A bot token lets us edit the original message (chat.update) so a status
// change never spawns a duplicate. Falls back to the incoming webhook when
// no bot token is configured (webhook cannot edit, so it posts follow-ups).
function slackBotToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN;
}

async function slackApi(method: string, payload: object): Promise<Record<string, unknown> | null> {
  const token = slackBotToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as Record<string, unknown>;
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

// Post a message to a channel; returns its `ts` (message id) for later edits.
// unfurl_* off so the link doesn't expand into a big preview card.
async function slackPost(channel: string, msg: { text: string; blocks: unknown[] }): Promise<string | null> {
  const data = await slackApi("chat.postMessage", {
    channel,
    text: msg.text,
    blocks: msg.blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
  return (data?.ts as string) ?? null;
}

async function slackUpdate(channel: string, ts: string, msg: { text: string; blocks: unknown[] }): Promise<void> {
  await slackApi("chat.update", { channel, ts, text: msg.text, blocks: msg.blocks });
}

// Legacy incoming-webhook post (fallback only — cannot edit past messages).
async function postWebhook(payload: unknown): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never let a Slack failure break commenting.
  }
}

// Announce a brand new comment. Prefers the bot token (returns a message ts we
// can later edit); otherwise falls back to the webhook.
async function notifyNewComment(comment: Comment): Promise<void> {
  const channel = process.env.SLACK_CHANNEL_ID;
  const msg = buildMessage(comment);
  if (slackBotToken() && channel) {
    const ts = await slackPost(channel, msg);
    if (ts) {
      comment.slackTs = ts;
      comment.slackChannel = channel;
    }
    return;
  }
  await postWebhook({ ...msg, unfurl_links: false, unfurl_media: false });
}

// Reflect a status change. With a bot token we EDIT the original message in
// place (no duplicates). When the status becomes "In review" we also mirror
// the comment into the external client channel (once), and keep that copy in
// sync afterwards. Without a bot token we fall back to a follow-up webhook post.
async function notifyStatusChange(comment: Comment): Promise<void> {
  if (slackBotToken()) {
    if (comment.slackTs && comment.slackChannel) {
      await slackUpdate(comment.slackChannel, comment.slackTs, buildMessage(comment));
    }
    const extChannel = process.env.SLACK_EXTERNAL_CHANNEL_ID;
    if (extChannel) {
      if (comment.status === "inreview" && !comment.slackExternalTs) {
        const ts = await slackPost(extChannel, buildMessage(comment));
        if (ts) {
          comment.slackExternalTs = ts;
          comment.slackExternalChannel = extChannel;
        }
      } else if (comment.slackExternalTs && comment.slackExternalChannel) {
        await slackUpdate(comment.slackExternalChannel, comment.slackExternalTs, buildMessage(comment));
      }
    }
    return;
  }

  // Webhook fallback: cannot edit, so post a compact follow-up.
  const label = sectionLabel(comment.section);
  const link = appLink(comment.section);
  const statusText = STATUS_TEXT[comment.status] || comment.status;
  const emoji = STATUS_EMOJI[comment.status] || ":speech_balloon:";
  const by = comment.resolvedBy ? ` by *${comment.resolvedBy}*` : "";
  const snippet = comment.text.length > 140 ? `${comment.text.slice(0, 140)}…` : comment.text;
  await postWebhook({
    text: `${emoji} Comment by ${comment.name} on "${label}" → ${statusText}`,
    unfurl_links: false,
    unfurl_media: false,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${statusText}*${by} · *${comment.name}* · _${label}_\n${snippet.replace(/\n/g, " ")}`,
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `<${link}|Open screen>` }],
      },
    ],
  });
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

  // Post to Slack first so we can persist the message ts for later in-place edits.
  await notifyNewComment(comment);

  await redis.lpush(KEY, JSON.stringify(comment));
  await redis.ltrim(KEY, 0, MAX_KEEP - 1);

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

  // Edit the existing Slack message in place (and mirror to the external
  // channel when moved to "In review"). notifyStatusChange may set new Slack
  // ts refs on `updated`, so run it BEFORE persisting.
  if (current.status !== updated.status) {
    await notifyStatusChange(updated);
  }

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
