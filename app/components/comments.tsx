"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Screen } from "../lib/types";

type Status = "new" | "inprogress" | "resolved" | "rejected" | "deleted";

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
};

// Human labels for each screen the reviewer can be on.
const SCREEN_LABELS: Record<string, string> = {
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

const STATUSES: Status[] = ["new", "inprogress", "resolved", "rejected", "deleted"];
// Statuses a reviewer can move a live comment to via the dropdown.
const CHANGEABLE: Status[] = ["inprogress", "resolved", "rejected"];
const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  inprogress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  deleted: "Deleted",
};
const STATUS_STYLE: Record<Status, string> = {
  new: "bg-[#ef4444] text-white border border-[#ef4444]",
  inprogress: "bg-[#fff7e6] text-[#92660a] border border-[#fde6b0]",
  resolved: "bg-[#e9f9ef] text-[#15803d] border border-[#bbe7cb]",
  rejected: "bg-[#fdeaea] text-[#b91c1c] border border-[#f5c2c2]",
  deleted: "bg-black/5 text-[#8a9099] border border-black/10",
};
// Closed states render with a strikethrough so it's clear no action is needed.
const STRUCK: Status[] = ["deleted", "resolved"];

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

type Filter = "all" | Status;

export function CommentsPanel({ screen }: { screen: Screen }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [configured, setConfigured] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      // Yield once so restoring persisted state isn't a synchronous effect setState.
      await Promise.resolve();
      if (!alive) return;
      try {
        const n = localStorage.getItem("oripaProdCommentName");
        if (n) setName(n);
        if (localStorage.getItem("oripaProdCommentsOpen") === "1") setOpen(true);
      } catch {
        /* ignore */
      }
    };
    init();
    return () => {
      alive = false;
    };
  }, []);

  // Used by the post/status/delete handlers to refresh after a mutation.
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/comments", { cache: "no-store" });
      const data = (await res.json()) as { configured?: boolean; comments?: Comment[] };
      setConfigured(data.configured !== false);
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      /* transient — keep previous */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch("/api/comments", { cache: "no-store" });
        const data = (await res.json()) as { configured?: boolean; comments?: Comment[] };
        if (!alive) return;
        setConfigured(data.configured !== false);
        setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        /* transient — keep previous */
      }
    };
    run();
    const id = setInterval(run, 12000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Comments for the screen the reviewer is currently viewing.
  const screenComments = useMemo(
    () => comments.filter((c) => (c.section || "") === screen),
    [comments, screen]
  );
  const visible = useMemo(
    () => (filter === "all" ? screenComments : screenComments.filter((c) => c.status === filter)),
    [screenComments, filter]
  );
  // Count anything still needing action on this screen (new + in progress).
  const actionCount = useMemo(
    () => screenComments.filter((c) => c.status === "new" || c.status === "inprogress").length,
    [screenComments]
  );

  const setOpenPersist = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem("oripaProdCommentsOpen", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const submit = async () => {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      localStorage.setItem("oripaProdCommentName", name.trim());
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), text: t, section: screen }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not post comment.");
      } else {
        setText("");
        await load();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: Status) => {
    setBusyId(id);
    try {
      await fetch("/api/comments", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, resolvedBy: name.trim() }),
      });
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  // Soft-delete: keep the comment visible (struck through, "Deleted" status)
  // instead of removing it, so the review trail is preserved.
  const remove = async (id: string) => {
    if (!confirm("Mark this comment as deleted?")) return;
    await setStatus(id, "deleted");
  };

  const badge = (count: number) =>
    count > 0 ? (
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[11px] font-bold text-white">
        {count}
      </span>
    ) : null;

  const panel = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="1.8">
          <path d="M4 5h16v11H8l-4 3z" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight text-[#1d2129]">Comments</p>
          <p className="truncate text-[11px] text-[#8a9099]">{SCREEN_LABELS[screen] || screen}</p>
        </div>
        {badge(actionCount)}
        <button
          onClick={() => setOpenPersist(false)}
          aria-label="Close comments"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-black/10 px-3 py-2">
        {(["all", ...STATUSES] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              filter === f ? "bg-[#1d2129] text-white" : "bg-black/5 text-[#5c626b]"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABEL[f as Status]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {!configured && (
          <p className="rounded-lg bg-[#fff7e6] px-3 py-2 text-[11px] leading-relaxed text-[#92660a]">
            Comments backend is not configured. Add the Upstash Redis env vars to this Vercel project to enable saving.
          </p>
        )}
        {visible.length === 0 && (
          <p className="px-1 py-6 text-center text-[12px] text-[#8a9099]">
            No comments on this screen yet.
          </p>
        )}
        {visible.map((c) => {
          const isDeleted = c.status === "deleted";
          const struck = STRUCK.includes(c.status);
          return (
          <div key={c.id} className={`rounded-xl border border-black/10 bg-white p-3 ${isDeleted ? "opacity-70" : ""}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[12px] font-bold text-[#1d2129] ${struck ? "line-through" : ""}`}>{c.name || "Anonymous"}</span>
              <span className="text-[10px] text-[#a4aab2]">{timeAgo(c.updatedAt || c.ts)}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className={`mt-1.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-[#2a2f36] ${struck ? "line-through decoration-[#a4aab2]" : ""}`}>{c.text}</p>
            {c.reason && (
              <p className="mt-1.5 rounded-md bg-black/[0.03] px-2 py-1 text-[11px] text-[#5c626b]">
                <b>{c.status === "rejected" ? "Rejected" : "Note"}:</b> {c.reason}
                {c.resolvedBy ? ` — ${c.resolvedBy}` : ""}
              </p>
            )}
            <div className="mt-2 flex items-center gap-1.5">
              {isDeleted ? (
                <button
                  onClick={() => setStatus(c.id, "new")}
                  disabled={busyId === c.id}
                  className="ml-auto text-[11px] font-semibold text-[#1d2129] hover:underline disabled:opacity-40"
                >
                  Restore
                </button>
              ) : (
                <>
                  <select
                    value=""
                    disabled={busyId === c.id}
                    onChange={(e) => {
                      if (e.target.value) setStatus(c.id, e.target.value as Status);
                    }}
                    className="rounded-md border border-black/15 bg-white px-1.5 py-1 text-[11px] font-semibold text-[#1d2129]"
                  >
                    <option value="" disabled>
                      Change status…
                    </option>
                    {CHANGEABLE.filter((s) => s !== c.status).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => remove(c.id)}
                    disabled={busyId === c.id}
                    className="ml-auto text-[11px] font-semibold text-[#b91c1c] hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Add form */}
      <div className="border-t border-black/10 p-3">
        {error && <p className="mb-2 text-[11px] font-semibold text-[#b91c1c]">{error}</p>}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="mb-2 w-full rounded-lg border border-black/15 px-3 py-2 text-[12px] outline-none focus:border-[#1d2129]"
        />
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder={`Comment on "${SCREEN_LABELS[screen] || screen}"…`}
          rows={3}
          className="w-full resize-none rounded-lg border border-black/15 px-3 py-2 text-[12.5px] outline-none focus:border-[#1d2129]"
        />
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          className="mt-2 w-full rounded-lg bg-[#D10005] py-2.5 text-[13px] font-bold text-white active:scale-[0.99] disabled:opacity-40"
        >
          {submitting ? "Posting…" : "Add comment"}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-[#a4aab2]">Comments are attached to this screen only</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Collapsed — desktop side tab */}
      {!open && (
        <button
          onClick={() => setOpenPersist(true)}
          className="fixed right-0 top-1/2 z-[95] hidden -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-[#1d2129] px-2.5 py-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:flex"
          aria-label="Open comments"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 5h16v11H8l-4 3z" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-bold [writing-mode:vertical-rl]">Comments</span>
          {badge(actionCount)}
        </button>
      )}

      {/* Collapsed — mobile FAB */}
      {!open && (
        <button
          onClick={() => setOpenPersist(true)}
          className="fixed bottom-4 right-4 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-[#1d2129] text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:hidden"
          aria-label="Open comments"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 5h16v11H8l-4 3z" strokeLinejoin="round" />
          </svg>
          {actionCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[12px] font-bold text-white ring-2 ring-[#0f1014]">
              {actionCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-[96] bg-black/40 sm:hidden" onClick={() => setOpenPersist(false)} />
          <aside className="fixed inset-x-0 bottom-0 z-[97] h-[82vh] rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.3)] sm:inset-x-auto sm:right-0 sm:top-0 sm:h-full sm:w-[360px] sm:rounded-none sm:shadow-[-8px_0_30px_rgba(0,0,0,0.25)]">
            {panel}
          </aside>
        </>
      )}
    </>
  );
}
