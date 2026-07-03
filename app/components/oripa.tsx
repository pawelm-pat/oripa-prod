"use client";

import { Fragment, createContext, useContext, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../version";
import type { Lang, OripaItem, SectionIconKey, RewardKey, NotifItem, Screen } from "../lib/types";
import { STR, type Dict, locTitle } from "../lib/i18n";
import { HOME_SECTIONS, ALL_ORIPA } from "../data/lobby";
import { NOTIF_YOU, NOTIF_NOTICE, NOTIF_UNREAD_TOTAL } from "../data/notifications";

const NotifNavContext = createContext<() => void>(() => {});

/* ════════════════════════════════════════════════════════════════════
   ORIPA — PROD skeleton (v1.0)
   Trimmed near-production preview. Only these surfaces are live:
     • Logged-out lobby (V1 homepage)   • Login / Sign-up bridge
     • Logged-in lobby (V2 format)      • Notifications
   Everything else is intentionally removed and re-introduced per sign-off.
   Bilingual EN / 日本語 toggle in the header.
═══════════════════════════════════════════════════════════════════════ */


/* ── small UI atoms ──────────────────────────────────────────────────── */
function CoinIcon({ size = 16 }: { size?: number }) {
  return (
     
    <img src="/coin.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function GemIcon({ size = 16 }: { size?: number }) {
  return (
     
    <img src="/gem.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function BrandLogo({ onClick }: { onClick?: () => void }) {
   
  const img = <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto shrink-0" />;
  if (onClick) {
    return (
      <button onClick={onClick} aria-label="Home" className="shrink-0">
        {img}
      </button>
    );
  }
  return img;
}

function BellIcon({ label }: { label: string }) {
  const openNotif = useContext(NotifNavContext);
  return (
    <button onClick={openNotif} aria-label={label} className="relative flex h-8 w-8 items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#B40206">
        <path d="M12 2a1.6 1.6 0 011.6 1.6v.7A6 6 0 0118 10c0 4 1.6 5.5 2.2 6.1a.8.8 0 01-.56 1.4H4.36a.8.8 0 01-.56-1.4C4.4 15.5 6 14 6 10a6 6 0 014.4-5.7v-.7A1.6 1.6 0 0112 2z" />
        <path d="M9.7 19.2a2.4 2.4 0 004.6 0z" />
      </svg>
      {NOTIF_UNREAD_TOTAL > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#ff2d2d] px-1 text-[9px] font-extrabold leading-none text-white ring-2 ring-white">{NOTIF_UNREAD_TOTAL}</span>
      )}
    </button>
  );
}

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {(["en", "ja"] as Lang[]).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {l === "en" ? "EN" : "日本語"}
          </button>
        );
      })}
    </div>
  );
}

function BalancePill({ coins, t, onOpenStore }: { coins: number; t: Dict; onOpenStore?: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative mr-2.5">
        <button
          type="button"
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="flex items-center gap-2 rounded-full border border-black/15 bg-white py-1 pl-3 pr-5 shadow-[0_1px_3px_rgba(0,0,0,0.10)] transition active:scale-[0.97]"
        >
          <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#1d2129]">
            <GemIcon size={18} /> 10,000
          </span>
          <span className="h-4 w-px bg-black/15" />
          <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#1d2129]">
            <CoinIcon size={18} /> {coins.toLocaleString()}
          </span>
        </button>
        <button
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="absolute right-0 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full"
          style={{ background: "#B40206", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
        </button>
      </div>
      <BellIcon label={t.notificationsAria} />
    </div>
  );
}

function sectionIcon(icon: SectionIconKey, red: boolean) {
  const c = red ? "#fff" : "#1d2129";
  if (icon === "star") return <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" /></svg>;
  if (icon === "cards") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"><rect x="4.5" y="5" width="9" height="13" rx="1.4" transform="rotate(-10 9 11.5)" /><rect x="10" y="5" width="9" height="13" rx="1.4" transform="rotate(8 14.5 11.5)" /></svg>;
  return catIcon(icon, c);
}

function TagPill({ children, variant }: { children: React.ReactNode; variant: "redOutline" | "redFill" | "darkOutline" }) {
  const cls =
    variant === "redFill"
      ? "bg-[#B40206] text-white border border-[#B40206]"
      : variant === "redOutline"
        ? "border border-[#B40206] text-[#B40206]"
        : "border border-black/35 text-[#1d2129]";
  return <span className={`whitespace-nowrap rounded-full px-2 py-[1px] text-[10px] font-bold ${cls}`}>{children}</span>;
}

function OripaCard({ item, t, lang, onView, onDraw }: { item: OripaItem; t: Dict; lang: Lang; onView?: () => void; onDraw?: (count: number, free?: boolean) => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  const price = (
    <span className="flex items-baseline">
      <span className="text-[15px] font-extrabold text-[#1d2129] underline decoration-[#B40206] decoration-2 underline-offset-2">1,000</span>
      <span className="text-[11px] font-bold text-[#8a9099]">{t.perDraw}</span>
    </span>
  );
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="1.8" strokeLinejoin="round" className="shrink-0"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
        <TagPill variant="redOutline">{t.tagPopular}</TagPill>
        <TagPill variant="redFill">{t.tagPokemon}</TagPill>
        <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
        <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
      </div>
      <h4 className="px-2.5 pt-1.5 text-[13.5px] font-extrabold leading-tight text-[#1d2129]">{locTitle(item, lang)}</h4>
      <div className="mx-2.5 mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#ededf0]">
        {item.image ? (
           
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c2c6cc" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </div>
      <div className="mt-2.5 bg-[#1d1d1d] px-3 py-1 text-center text-[11px] font-bold text-white">{t.periodLabel("2026/01/01")}</div>
      <div className="flex items-stretch px-3 py-2.5">
        <div className="flex flex-col justify-center gap-1.5 border-r border-dashed border-black/20 pr-3">
          <span className="flex items-center gap-1.5"><CoinIcon size={20} />{price}</span>
          {item.gem && <span className="flex items-center gap-1.5"><GemIcon size={20} />{price}</span>}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 pl-3">
          <p className="flex items-baseline justify-center gap-0.5 leading-none">
            <span className="text-[13px] font-bold text-[#1d2129]">{t.remainingLabel}</span>
            <span className="text-[19px] font-extrabold text-[#1d2129]">{item.remaining}</span>
            <span className="text-[12px] font-bold text-[#8a9099]">/{item.total}</span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#B40206]" style={{ width: `${pct}%` }} /></div>
          <p className="flex items-baseline justify-center gap-0.5 leading-none text-[#B40206]">
            <span className="text-[13px] font-bold">{t.remainingTimeLabel}</span>
            <span className="text-[17px] font-extrabold">{t.minUnit(item.endsIn)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={onView} className="flex-1 rounded-lg py-2 text-[12px] font-bold text-white" style={{ background: "#B40206" }}>{t.btnDraw}</button>
        {item.free && <button onClick={() => onDraw?.(1, true)} className="flex-1 rounded-lg border border-[#B40206] py-2 text-[12px] font-bold text-[#B40206]">{t.btnFree}</button>}
        <button onClick={onView} className="flex-1 rounded-lg border border-black/40 py-2 text-[12px] font-bold text-[#1d2129]">{t.btnView}</button>
      </div>
    </div>
  );
}

function PromoCarousel() {
  return (
    <div className="flex aspect-[8/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-[linear-gradient(135deg,#eef0f3,#e2e5ea)]">
      <div className="flex flex-col items-center gap-1.5 text-[#a2a8b0]">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-[11px] font-bold uppercase tracking-wide">Banner image</span>
      </div>
    </div>
  );
}

function RankMedallion({ tone, label, next = false }: { tone: "bronze" | "silver"; label: string; next?: boolean }) {
  const grad = tone === "bronze"
    ? "linear-gradient(160deg,#f0b27a 0%,#cd7f32 48%,#7a4a1d 100%)"
    : "linear-gradient(160deg,#ffffff 0%,#c9ced6 48%,#8b94a3 100%)";
  return (
    <span className="flex shrink-0 flex-col items-center" style={{ opacity: next ? 0.92 : 1 }}>
      <span
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
        style={{ background: grad, border: "2px solid rgba(255,255,255,0.5)", boxShadow: "0 3px 8px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.35)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.1 6.1-.7z" fill="rgba(255,255,255,0.94)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
        </svg>
      </span>
      <span className="mt-[1px] text-[8px] font-extrabold uppercase tracking-wide text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{label}</span>
    </span>
  );
}

function RankStrip({ t, onOpen }: { t: Dict; onOpen?: () => void }) {
  // POC: fixed rank progress (5/10 pt from Bronze toward Silver).
  // The bar is deliberately static — no fill/sheen animation.
  const pts = 5, next = 10;
  const pct = (pts / next) * 100;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t.mpCurrentRank}: ${t.mpRankBronze} — ${t.heroPts(pts, next)} — ${t.loyaltyNextTier}: ${t.loyaltySilver}`}
      className="relative block h-[50px] w-full transition-transform active:scale-[0.99]"
    >
      {/* Gold-framed bar pill spanning between the medallion centres — its
          ends tuck underneath the medallions (bar starts/finishes within the
          icons, reference layout). */}
      <span
        className="absolute inset-x-[19px] top-[6px] block h-[26px] rounded-full p-[2px] shadow-[0_5px_14px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(180deg,#ffe08a,#c9a84c 55%,#7d5f1a)" }}
      >
        <span
          className="relative block h-full w-full overflow-hidden rounded-full bg-[#12070a]"
          style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.05)" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={next}
          aria-valuenow={pts}
        >
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(180deg,#5ff08a 0%,#2ecc71 45%,#128a43 100%)", boxShadow: "0 0 8px rgba(62,220,120,0.5)" }}>
            <span className="absolute inset-x-1 top-[2px] h-[5px] rounded-full bg-white/35" />
            {pct > 0 && pct < 100 && (
              <span className="absolute -right-[2px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[#eafff0]" style={{ boxShadow: "0 0 7px 2px rgba(150,255,190,0.8)" }} />
            )}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}>
            {t.heroPts(pts, next)}
          </span>
        </span>
      </span>
      {/* Medallions sit on top of the bar ends, larger than the bar */}
      <span className="absolute left-0 top-0"><RankMedallion tone="bronze" label={t.mpRankBronze} /></span>
      <span className="absolute right-0 top-0"><RankMedallion tone="silver" label={t.loyaltySilver} next /></span>
    </button>
  );
}

/* Chunky beveled "game UI" label: gold gradient fill clipped to the glyphs,
   dark outline + drop built from stacked drop-shadows (MB-style type). */
const HERO_LABEL_STYLE: React.CSSProperties = {
  backgroundImage: "linear-gradient(180deg,#fff7d1 0%,#ffd23f 42%,#f6a821 58%,#ffe98a 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter:
    "drop-shadow(0 1.2px 0 #3a1204) drop-shadow(0 -1px 0 #3a1204) drop-shadow(1px 0 0 #3a1204) drop-shadow(-1px 0 0 #3a1204) drop-shadow(0 2px 3px rgba(0,0,0,0.55))",
};

function HeroBadge({ img, label, badge, onClick }: { img: string; label: string; badge?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="relative flex w-[80px] flex-col items-center transition-transform active:scale-90">
      {/* Free-floating art IS the button (MB-style — no containing frame) */}
      { }
      <img src={img} alt="" className="h-[72px] w-[72px] object-contain drop-shadow-[0_7px_12px_rgba(0,0,0,0.5)]" />
      <span className="-mt-1 max-w-[80px] text-center text-[11.5px] font-black uppercase leading-[0.95] tracking-tight" style={HERO_LABEL_STYLE}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-0 z-10 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white/85 bg-gradient-to-b from-[#ff5a5f] to-[#B40206] px-1 text-[11px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]">{badge}</span>
      )}
    </button>
  );
}

function HomeHero({ t, onReward, onOpenStore, onChain, onRank, onDraw, showRank = true }: { t: Dict; onReward?: (key: RewardKey) => void; onOpenStore?: () => void; onChain?: () => void; onRank?: () => void; onDraw?: () => void; showRank?: boolean }) {
  // Daily-bonus claim-window countdown. Starts from a fixed value so SSR and
  // the first client render match, then ticks once mounted (POC only — not
  // wired to a real reset time).
  const [secsLeft, setSecsLeft] = useState(12 * 60 + 39);
  useEffect(() => {
    const id = setInterval(() => setSecsLeft((s) => (s > 0 ? s - 1 : 12 * 60 + 39)), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.15)]">
      {/* Hero banner image — placeholder for a client-supplied asset. Keeps the
          same 10/11 ratio + overlay UI; drop in a real image later. */}
      <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-black/10 bg-[linear-gradient(135deg,#eef0f3,#e2e5ea)]">
        <div className="flex flex-col items-center gap-2 text-[#a2a8b0]">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[12px] font-bold uppercase tracking-wide">Banner image</span>
        </div>
      </div>
      {/* Legibility gutters for the icon columns over any future artwork */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[88px] bg-gradient-to-r from-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[88px] bg-gradient-to-l from-black/10 to-transparent" />

      <div className="relative" style={{ aspectRatio: "10 / 11" }}>
        {/* Rank progress (Bronze → Silver), MB-style top strip.
            Hidden on the logged-out landing — an anonymous visitor has no rank. */}
        {showRank && (
          <div className="absolute left-1/2 top-2.5 z-10 w-[74%] -translate-x-1/2">
            <RankStrip t={t} onOpen={onRank} />
          </div>
        )}

        {/* Left column: timed Daily Bonus (mirrors MB's timed collectible) */}
        <div className="absolute left-2.5 z-10 flex flex-col items-center" style={{ top: showRank ? 78 : 14 }}>
          <HeroBadge img="/hero-ic-daily.png" label={t.rwDaily} onClick={() => onReward?.("rwDaily")} />
          {/* Daily streak (POC: day 2 of 4) — compact segmented track */}
          <span className="mt-1 flex h-[7px] w-[56px] gap-[2px] rounded-full border border-white/25 bg-black/55 p-[1.5px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-full flex-1 rounded-full" style={{ background: i < 2 ? "linear-gradient(180deg,#ffe08a,#f6a821)" : "rgba(255,255,255,0.18)" }} />
            ))}
          </span>
          <span className="mt-1 rounded-md border border-white/30 bg-gradient-to-b from-[#3ddc68] to-[#17a544] px-1.5 py-[1px] text-[10px] font-extrabold tabular-nums text-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{timer}</span>
          {onChain && (
            <span className="mt-2">
              <HeroBadge img="/hero-ic-chain.png" label={t.coBadge} onClick={onChain} />
            </span>
          )}
        </div>

        {/* Right column: Oripa Draw (the core product, top slot) / Quest /
            First bonus. The old Daily Box slot duplicated the left column's
            Daily entry, so it became the draw shortcut. */}
        <div className="absolute right-2.5 z-10 flex flex-col items-center gap-2" style={{ top: showRank ? 78 : 14 }}>
          <HeroBadge img="/hero-ic-draw.png" label={t.heroDraw} onClick={onDraw} />
          <HeroBadge img="/hero-ic-quest.png" label={t.rwQuest} onClick={() => onReward?.("rwQuest")} />
          <HeroBadge img="/hero-ic-offer.png" label={t.rwFirst} onClick={() => onOpenStore?.()} />
        </div>
      </div>
    </div>
  );
}


function catIcon(key: string, color: string) {
  switch (key) {
    case "all":
      return <svg width="23" height="23" viewBox="0 0 24 24" fill={color}><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></svg>;
    case "new":
      return (
        <svg width="27" height="27" viewBox="0 0 24 24">
          <path d="M12 1.3l2.2 2.5 3.2-1.1.2 3.4 3.4 1-1.9 2.8 1.9 2.8-3.4 1-.2 3.4-3.2-1.1L12 22.7l-2.2-2.5-3.2 1.1-.2-3.4-3.4-1 1.9-2.8L3 11.3l3.4-1 .2-3.4 3.2 1.1z" fill="#B40206" />
          <rect x="11" y="6.6" width="2" height="6" rx="1" fill="#fff" />
          <circle cx="12" cy="15.2" r="1.15" fill="#fff" />
        </svg>
      );
    case "popular":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
    case "pokemon":
      return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" stroke={color} strokeWidth="1.8" /><path d="M3 12A9 9 0 0 1 21 12Z" fill={color} /><circle cx="12" cy="12" r="3.1" fill="#fff" stroke={color} strokeWidth="1.8" /><circle cx="12" cy="12" r="1.25" fill={color} /></svg>;
    case "limited":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.3 1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={color}><circle cx="5.5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18.5" cy="12" r="2" /></svg>;
  }
}

// Category-bar glyphs sourced from the supplied artwork (public/cat/*.png).
function catImg(key: string) {
  return (
    <span className="flex h-[24px] w-[38px] items-center justify-center">
      { }
      <img src={`/cat/${key}.png`} alt="" className="max-h-[24px] max-w-[38px] object-contain" />
    </span>
  );
}

function CategoryBar({ t, active, onChange }: { t: Dict; active: string; onChange: (key: string) => void }) {
  const cats: { key: string; label: string }[] = [
    { key: "new", label: t.catNew },
    { key: "popular", label: t.catPopular },
    { key: "pokemon", label: t.catPokemon },
    { key: "limited", label: t.catLimited },
    { key: "other", label: t.catOther },
  ];
  const allOn = active === "all";
  return (
    <div className="sticky top-0 z-20 mt-3 border-b border-black/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="no-scrollbar flex items-stretch overflow-x-auto">
        {/* ALL — full-height D-tab pinned to the left edge, never scrolls away */}
        <button
          onClick={() => onChange("all")}
          aria-pressed={allOn}
          className="sticky left-0 z-10 flex shrink-0 items-stretch bg-white pr-2.5"
        >
          <span className="flex flex-col items-center justify-center gap-1 rounded-r-[28px] bg-[#141414] px-4 text-white shadow-[3px_0_12px_rgba(0,0,0,0.18)]">
            {catIcon("all", "#fff")}
            <span className="text-[11px] font-extrabold uppercase tracking-wide">{t.catAll}</span>
          </span>
        </button>

        {/* Scrollable categories */}
        {cats.map((c) => {
          const on = active === c.key;
          const color = on ? "#B40206" : "#1d2129";
          return (
            <button
              key={c.key}
              onClick={() => onChange(c.key)}
              className="relative flex shrink-0 flex-col items-center justify-center gap-1 px-3 py-2.5"
            >
              {catImg(c.key)}
              <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color }}>{c.label}</span>
              {on && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[#B40206]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Terms & Conditions modal, opened from the footer link.
function TermsOverlay({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[86%] w-full flex-col overflow-hidden rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3">
          <h3 className="text-[16px] font-extrabold text-[#1d2129]">{t.giTncTitle}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {(t.giTncBody as string[]).map((para, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-[#41464e]">{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteFooter({ t }: { t: Dict }) {
  const lang: Lang = t === STR.ja ? "ja" : "en";
  const [tnc, setTnc] = useState(false);
  const chip = (label: string) =>
    label === t.mpTerms ? (
      <button key={label} onClick={() => setTnc(true)} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90 underline decoration-white/40 active:bg-white/20">{label}</button>
    ) : (
      <span key={label} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90">{label}</span>
    );
  return (
    <footer className="bg-[#161616] px-4 py-6 text-white">
      { }
      <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto" style={{ filter: "brightness(1.6)" }} />
      <p className="mt-2 text-[11px] text-white/55">{t.ftCopyright}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-white/55">{t.ftBlurb}</p>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftAbout}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{t.ftLinks.map(chip)}</div>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftCategories}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{t.ftCats.map(chip)}</div>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftFollow}</h4>
      <div className="mt-2 flex items-center gap-3">
        {["LINE", "X", "IG", "f"].map((s) => (
          <span key={s} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#161616]">{s}</span>
        ))}
      </div>

      <div className="my-5 h-px bg-white/15" />
      <p className="text-[11px] leading-relaxed text-white/70">{t.ftSupport}</p>
      <p className="mt-4 text-[10.5px] text-white/40">{t.ftCopyright}</p>
      {tnc && <TermsOverlay lang={lang} onClose={() => setTnc(false)} />}
    </footer>
  );
}

function AppHeader({ coins, t, onHome, onOpenStore }: { coins: number; t: Dict; onHome?: () => void; onOpenStore?: () => void }) {
  return (
    <header className="shrink-0 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <BrandLogo onClick={onHome} />
        <BalancePill coins={coins} t={t} onOpenStore={onOpenStore} />
      </div>
    </header>
  );
}

// Hide-on-scroll-down / reveal-on-scroll-up for the lobby search bar.
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop;
    const last = lastY.current;
    if (y > last && y > 48) setHidden(true);        // scrolling down, past the top
    else if (y < last - 4 || y <= 8) setHidden(false); // scrolling up / near top
    lastY.current = y;
  }
  return { hidden, onScroll };
}

// Search bar shown on the main lobby so users can find a draw without
// browsing categories.
function LobbySearchBar({ t, value, onChange }: { t: Dict; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.lobbySearchPlaceholder}
        className="w-full rounded-full border-[1.5px] border-black/10 bg-[#f4f5f7] py-2.5 pl-9 pr-9 text-[13px] font-semibold text-[#1d2129] outline-none focus:border-[#B40206] focus:bg-white"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5"
          aria-label={t.backAria}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}

function LobbySearchResults({ items, t, lang, onOpenInfo, onDrawConfirm }: { items: OripaItem[]; t: Dict; lang: Lang; onOpenInfo?: (item: OripaItem) => void; onDrawConfirm?: (item: OripaItem, count: number, free?: boolean) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-2 text-[34px]">🔍</div>
        <p className="text-[14px] font-semibold text-[#8a9099]">{t.lobbySearchEmpty}</p>
      </div>
    );
  }
  return (
    <section className="bg-[#eef0f3] px-3 pb-6 pt-4">
      <h3 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{t.lobbySearchResults} · {items.length}</h3>
      <div className="space-y-3">
        {items.map((it) => (
          <OripaCard key={it.id} item={it} t={t} lang={lang} onView={() => onOpenInfo?.(it)} onDraw={(c, free) => onDrawConfirm?.(it, c, free)} />
        ))}
      </div>
    </section>
  );
}

// Flat, de-duplicated list of every draw across the home feed (for search).
function OripaHome({ lang, coins, onHome }: { lang: Lang; coins: number; onHome: () => void }) {
  const t = STR[lang];
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_ORIPA.filter((it) => locTitle(it, lang).toLowerCase().includes(q)) : [];
  const sections = HOME_SECTIONS.filter((s) => cat === "all" || s.cats.includes(cat));
  const { hidden: searchHidden, onScroll } = useHideOnScrollDown();
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} />

      {/* Lobby search — hides as the user scrolls down, reveals on scroll up. */}
      <div className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${searchHidden && !q ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
        <div className="border-b border-black/5 px-3 pb-2.5 pt-1">
          <LobbySearchBar t={t} value={query} onChange={setQuery} />
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={onScroll}>
        {q ? (
          <>
            <LobbySearchResults items={searchResults} t={t} lang={lang} />
            <SiteFooter t={t} />
          </>
        ) : (
        <>
        <div className="px-3 pt-3">
          <HomeHero t={t} />
        </div>

        {/* Category filter — sticky across the whole feed */}
        <CategoryBar t={t} active={cat} onChange={setCat} />

        {/* Curved divider below categories */}
        { }
        <img src="/home-divider.png" alt="" className="-mt-px -mb-px block w-full" />

        {sections.map((s) => {
          const red = s.variant === "red";
          return (
            <Fragment key={s.id}>
              <section className={red ? "bg-[#B40206] px-3 pb-6 pt-4" : "bg-[#eef0f3] px-3 pb-5 pt-4"}>
                <h3 className={`mb-3 flex items-center gap-1.5 text-[15px] font-extrabold ${red ? "text-white" : "text-[#1d2129]"}`}>
                  {sectionIcon(s.icon, red)}
                  {(t as unknown as Record<string, string>)[s.titleKey]}
                </h3>
                <div className="space-y-3">
                  {s.items.map((it) => (
                    <OripaCard key={it.id} item={it} t={t} lang={lang} />
                  ))}
                </div>
              </section>

              {red && (
                <>
                  { }
                  <img src="/home-divider-bottom.png" alt="" className="-mt-px -mb-px block w-full" />
                </>
              )}
            </Fragment>
          );
        })}

        <SiteFooter t={t} />
        </>
        )}
      </div>
    </div>
  );
}


function navIcon(key: Screen, color: string) {
  switch (key) {
    case "oripa":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4.5" y="6" width="9" height="13" rx="1.6" transform="rotate(-10 9 12.5)" fill={color} opacity="0.45" />
          <rect x="10" y="5" width="9" height="13" rx="1.6" transform="rotate(8 14.5 11.5)" fill={color} />
        </svg>
      );
    case "prizeHistory":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
          <path d="M5.5 3v3.5H9" />
          <path d="M12 8v4.2l3 1.8" />
        </svg>
      );
    case "quest":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "store":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 4h16l-1 4H5L4 4z" />
          <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
          <path d="M9.5 20v-5.5h5V20" />
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 19a6.5 6.5 0 0113 0" strokeLinecap="round" />
        </svg>
      );
  }
}

// PROD: the bottom nav is display-only for now. The lobby (Oripa) is the only
// live destination; the other tabs (incl. the new Store placeholder) are shown
// but do not navigate until each screen is signed off and re-introduced.
function BottomNav({ screen, t }: { screen: Screen; t: Dict }) {
  const items: { key: Screen; label: string }[] = [
    { key: "oripa", label: t.navOripa },
    { key: "prizeHistory", label: t.navPrizeHistory },
    { key: "quest", label: t.navQuest },
    { key: "store", label: t.navStore },
    { key: "mypage", label: t.navMyPage },
  ];
  return (
    <nav className="shrink-0 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((it) => {
          const active = screen === it.key;
          const color = active ? "#B40206" : "#1d2129";
          return (
            <div key={it.key} className="flex flex-1 flex-col items-center gap-1 py-2">
              {navIcon(it.key, color)}
              <span className="text-[10px] font-bold" style={{ color }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Auth shared components ───────────────────────────────────────────── */
function AuthHeader({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  return (
    <header className="flex shrink-0 items-center justify-between bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.10)]">
      { }
      <img src="/oripa-logo-full.png" alt="オリパロット" className="h-8 w-auto shrink-0" />
      <div className="flex items-center gap-2">
        <button onClick={onSignUp} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#B40206" }}>{t.authSignUp}</button>
        <button onClick={onLogin} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#f59e0b" }}>{t.authLogin}</button>
      </div>
    </header>
  );
}

function AuthSocialButtons({ signUp, t, onApple, onGoogle, onLine }: { signUp: boolean; t: Dict; onApple?: () => void; onGoogle?: () => void; onLine?: () => void }) {
  const appleLabel = signUp ? t.authSignUpApple : t.authLoginApple;
  const googleLabel = signUp ? t.authSignUpGoogle : t.authLoginGoogle;
  const lineLabel = signUp ? t.authSignUpLine : t.authLoginLine;
  return (
    <div className="space-y-2.5">
      <button onClick={onLine} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#06C755" /><text x="20" y="28" textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">L</text></svg>
        {lineLabel}
      </button>
      <button onClick={onGoogle} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {googleLabel}
      </button>
      <button onClick={onApple} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d2129"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
        {appleLabel}
      </button>
    </div>
  );
}

type AppleAuthStep = "sheet" | "faceId" | "success";

function AppleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<AppleAuthStep>("sheet");

  useEffect(() => {
    if (step !== "faceId") return;
    const timer = setTimeout(() => setStep("success"), 1900);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  function startFaceId() {
    if (step !== "sheet") return;
    setStep("faceId");
  }

  const subtitle = signUp ? t.authAppleSheetSignUp : t.authAppleSheetLogin;
  const successSub = signUp ? t.authAppleSuccessSubSignUp : t.authAppleSuccessSubLogin;

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <style>{`
        @keyframes appleSheetSlideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes appleSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes appleSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes appleFaceIdFadeIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes appleScanLine { 0%{top:0%;opacity:0} 8%{opacity:1} 88%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes appleFacePulse { 0%,100%{opacity:0.5;transform:scale(0.97)} 50%{opacity:1;transform:scale(1)} }
        @keyframes appleCornerGlow { 0%,100%{stroke:#1d2129} 50%{stroke:#22c55e} }
      `}</style>

      {/* Backdrop — tapping triggers Face ID only on the "sheet" step */}
      <button
        type="button"
        aria-label={t.authAppleFaceIdHint as string}
        onClick={startFaceId}
        disabled={step !== "sheet"}
        className="min-h-0 flex-1 border-0 p-0 outline-none transition-colors duration-500"
        style={{ backgroundColor: step === "sheet" ? "rgba(0,0,0,0.52)" : "rgba(0,0,0,0.72)", cursor: step === "sheet" ? "pointer" : "default" }}
      >
        {step === "sheet" && (
          <span className="flex h-full items-end justify-center pb-10">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-sm">
              {t.authAppleFaceIdHint as string}
            </span>
          </span>
        )}
      </button>

      {/* Bottom sheet */}
      <div
        className="relative z-20 shrink-0 rounded-t-[24px] bg-[#f2f2f7] px-5 pb-10 pt-3 shadow-[0_-12px_48px_rgba(0,0,0,0.22)]"
        style={{ animation: "appleSheetSlideUp 0.38s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-black/15" />

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8">
            <div style={{ animation: "appleSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="36" fill="#22c55e" />
                <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3
              className="mt-5 text-center text-[20px] font-bold text-[#1d2129]"
              style={{ animation: "appleSuccessFade 0.4s ease-out 0.25s both" }}
            >
              {t.authAppleSuccess as string}
            </h3>
            <p
              className="mt-1.5 text-center text-[14px] text-[#5c626b]"
              style={{ animation: "appleSuccessFade 0.4s ease-out 0.4s both" }}
            >
              {successSub as string}
            </p>
          </div>
        )}

        {/* ── FACE ID SCANNING ── */}
        {step === "faceId" && (
          <div
            className="flex flex-col items-center py-8"
            style={{ animation: "appleFaceIdFadeIn 0.28s ease-out both" }}
          >
            {/* iOS-style Face ID frame */}
            <div className="relative" style={{ width: 110, height: 130 }}>
              {/* Corner brackets */}
              {[
                "top-0 left-0 border-l-[3px] border-t-[3px] rounded-tl-[8px]",
                "top-0 right-0 border-r-[3px] border-t-[3px] rounded-tr-[8px]",
                "bottom-0 left-0 border-l-[3px] border-b-[3px] rounded-bl-[8px]",
                "bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-[8px]",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-7 h-7 border-[#1d2129] ${cls}`}
                  style={{ animation: `appleCornerGlow 1.8s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}

              {/* Face silhouette */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "appleFacePulse 1.4s ease-in-out infinite" }}
              >
                <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
                  {/* Head */}
                  <path d="M32 6C19 6 11 14.5 11 25c0 7.5 4 14 10 17.5C13 46 8 54.5 8 65h48c0-10.5-5-19-13-22.5 6-3.5 10-10 10-17.5C53 14.5 45 6 32 6z"
                    stroke="#1d2129" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />
                  {/* Eyes */}
                  <circle cx="23" cy="24" r="2.8" fill="#1d2129" opacity="0.75" />
                  <circle cx="41" cy="24" r="2.8" fill="#1d2129" opacity="0.75" />
                  {/* Nose bridge */}
                  <path d="M32 28v5" stroke="#1d2129" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
                  {/* Smile */}
                  <path d="M23 38c2.5 3.5 15.5 3.5 18 0" stroke="#1d2129" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
                </svg>
              </div>

              {/* Green scan line */}
              <div
                className="pointer-events-none absolute left-3 right-3 h-[2.5px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #22c55e 30%, #4ade80 50%, #22c55e 70%, transparent 100%)",
                  animation: "appleScanLine 1.7s ease-in-out infinite",
                }}
              />
            </div>

            <p className="mt-6 text-[16px] font-semibold text-[#1d2129]">
              {t.authAppleFaceIdScanning as string}
            </p>
            <p className="mt-1 text-[12px] text-[#8a9099]">
              {lang === "ja" ? "スキャン中..." : "Scanning..."}
            </p>
          </div>
        )}

        {/* ── INITIAL SHEET ── */}
        {step === "sheet" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1d2129">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-[16px] font-bold text-[#1d2129]">{t.authAppleSheetTitle as string}</span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-[#5c626b]">{subtitle as string}</p>

            {/* Account row */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-3.5 px-4 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[17px] font-bold text-white shadow-md">
                  {(t.authAppleAccountName as string).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#1d2129]">{t.authAppleAccountName as string}</p>
                  <p className="truncate text-[12px] text-[#8a9099]">{t.authAppleAccountEmail as string}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9ced6" strokeWidth="2.2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Continue / Face ID button */}
            <button
              type="button"
              onClick={startFaceId}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1d2129] py-4 text-[15px] font-bold text-white active:scale-[0.98]"
              style={{ transition: "transform 0.1s" }}
            >
              {/* iOS Face ID icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="17" y="2" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="2" y="19.5" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="17" y="19.5" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <circle cx="9" cy="10.5" r="1.6" fill="white" />
                <circle cx="15" cy="10.5" r="1.6" fill="white" />
                <path d="M12 8.5V7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M9 15c1 1.8 5 1.8 6 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {t.authAppleFaceIdHint as string}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type GoogleAuthStep = "picker" | "permissions" | "processing" | "success";

const GOOGLE_LOGO = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function GoogleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<GoogleAuthStep>("picker");
  const [selectedAccount, setSelectedAccount] = useState<0 | 1 | null>(null);

  const accounts = [
    { name: t.authGoogleAccount1Name as string, email: t.authGoogleAccount1Email as string, initials: (t.authGoogleAccount1Name as string).charAt(0), color: "#4285F4" },
    { name: t.authGoogleAccount2Name as string, email: t.authGoogleAccount2Email as string, initials: (t.authGoogleAccount2Name as string).charAt(0), color: "#0f9d58" },
  ];

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("success"), 1600);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  const successSub = signUp ? t.authGoogleSuccessSubSignUp : t.authGoogleSuccessSubLogin;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ animation: "googleScreenSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }}>
      <style>{`
        @keyframes googleScreenSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes googleSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes googleSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes googleSpinnerRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div style={{ animation: "googleSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="36" fill="#22c55e" />
                <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3 className="mt-5 text-center text-[20px] font-bold text-[#1d2129]" style={{ animation: "googleSuccessFade 0.4s ease-out 0.25s both" }}>
              {t.authGoogleSuccess as string}
            </h3>
            <p className="mt-1.5 text-center text-[14px] text-[#5c626b]" style={{ animation: "googleSuccessFade 0.4s ease-out 0.4s both" }}>
              {successSub as string}
            </p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div style={{ animation: "googleSpinnerRotate 0.9s linear infinite", width: 52, height: 52 }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="22" stroke="#e5e8ec" strokeWidth="4" />
                <path d="M26 4a22 22 0 0 1 22 22" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-5 text-[15px] font-semibold text-[#1d2129]">
              {lang === "ja" ? "サインイン中..." : "Signing in…"}
            </p>
          </div>
        )}

        {/* ── PERMISSIONS ── */}
        {step === "permissions" && selectedAccount !== null && (
          <div className="flex flex-1 flex-col px-5 pt-12 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              {GOOGLE_LOGO}
              <span className="text-[18px] font-bold text-[#1d2129]">{t.authGooglePermissionsTitle as string}</span>
              <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]">✕</button>
            </div>

            {/* Selected account badge */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#e5e8ec] bg-[#f8f9fa] px-4 py-3 mb-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: accounts[selectedAccount].color }}>
                {accounts[selectedAccount].initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1d2129]">{accounts[selectedAccount].name}</p>
                <p className="truncate text-[12px] text-[#8a9099]">{accounts[selectedAccount].email}</p>
              </div>
            </div>

            {/* Permissions body */}
            <p className="text-[13px] text-[#5c626b] mb-5">{t.authGooglePermissionsBody as string}</p>

            <div className="space-y-3 mb-auto">
              {([t.authGooglePermissionItem1, t.authGooglePermissionItem2] as string[]).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f5e9]">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5l3 3 5-5" stroke="#0f9d58" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[14px] leading-snug text-[#1d2129]">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA row — pinned to bottom */}
            <div className="flex gap-3 pt-8">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-[#e5e8ec] py-3.5 text-[14px] font-bold text-[#1d2129]"
              >
                {t.authGoogleCancel as string}
              </button>
              <button
                onClick={() => setStep("processing")}
                className="flex-1 rounded-xl py-3.5 text-[14px] font-bold text-white"
                style={{ background: "#4285F4" }}
              >
                {t.authGoogleContinue as string}
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT PICKER ── */}
        {step === "picker" && (
          <div className="flex flex-1 flex-col px-5 pt-12 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {GOOGLE_LOGO}
                <span className="text-[18px] font-bold text-[#1d2129]">{t.authGooglePickerTitle as string}</span>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]">✕</button>
            </div>
            <p className="mb-6 text-[13px] text-[#5c626b]">{t.authGooglePickerSubtitle as string}</p>

            {/* Account list */}
            <div className="space-y-3">
              {accounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedAccount(idx as 0 | 1); setStep("permissions"); }}
                  className="flex w-full items-center gap-3.5 rounded-2xl border border-[#e5e8ec] bg-white px-4 py-3.5 text-left active:bg-[#f5f6f8]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white" style={{ background: acc.color }}>
                    {acc.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#1d2129]">{acc.name}</p>
                    <p className="truncate text-[12px] text-[#8a9099]">{acc.email}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9ced6" strokeWidth="2.2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function AuthField({ label, value, onChange, type = "text", icon, valid, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
  valid?: boolean; error?: string; onBlur?: () => void;
}) {
  const showTick = valid === true;
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {label}<span className="ml-0.5 text-[#B40206]">*</span>
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-[#8a9099]">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Placeholder"
          className={`w-full rounded-xl bg-white py-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none border ${error ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
          style={{ paddingLeft: icon ? "36px" : "14px", paddingRight: showTick ? "40px" : "14px" }}
        />
        {showTick && (
          <span className="absolute right-3">
            <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-[#B40206]">{error}</p>}
    </div>
  );
}

/* ── DobPickerModal ────────────────────────────────────────────────────── */
function DobPickerModal({ lang, onConfirm, onClose }: {
  lang: Lang; onConfirm: (isoDate: string) => void; onClose: () => void;
}) {
  const t = STR[lang];
  const YEARS_PER_PAGE = 12;
  const MAX_YEAR = 2010;
  const MIN_YEAR = 1931;

  const [step, setStep] = useState<"year" | "month" | "day">("year");
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [yearPageStart, setYearPageStart] = useState(1980);

  const MONTH_SHORT = lang === "ja"
    ? ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_FULL = lang === "ja"
    ? MONTH_SHORT
    : ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const displayText = () => {
    if (!selYear) return "";
    if (!selMonth) return String(selYear);
    if (!selDay) return lang === "ja" ? `${selYear}年${selMonth}月` : `${selYear}, ${MONTH_FULL[selMonth - 1]}`;
    return lang === "ja"
      ? `${selYear}年${selMonth}月${selDay}日`
      : `${MONTH_SHORT[selMonth - 1]} ${selDay}, ${selYear}`;
  };

  const daysInMonth = selYear && selMonth ? new Date(selYear, selMonth, 0).getDate() : 31;

  const headerLabel = step === "year"
    ? `${yearPageStart}–${Math.min(yearPageStart + YEARS_PER_PAGE - 1, MAX_YEAR)}`
    : step === "month"
    ? String(selYear)
    : `${MONTH_SHORT[(selMonth ?? 1) - 1]} ${selYear}`;

  const onBack = () => {
    if (step === "year") {
      setYearPageStart(p => Math.max(MIN_YEAR, p - YEARS_PER_PAGE));
    } else if (step === "month") {
      setStep("year");
      setSelMonth(null);
      setSelDay(null);
    } else {
      setStep("month");
      setSelDay(null);
    }
  };

  const onForward = () => {
    if (step === "year") {
      if (yearPageStart + YEARS_PER_PAGE <= MAX_YEAR) setYearPageStart(p => p + YEARS_PER_PAGE);
    } else if (step === "month" && selYear) {
      if (selYear < MAX_YEAR) { setSelYear(selYear + 1); setSelMonth(null); setSelDay(null); }
    } else if (step === "day" && selYear && selMonth) {
      const nextMonth = selMonth === 12 ? 1 : selMonth + 1;
      const nextYear = selMonth === 12 ? selYear + 1 : selYear;
      if (nextYear <= MAX_YEAR) { setSelMonth(nextMonth); setSelYear(nextYear); setSelDay(null); }
    }
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i)
    .filter(y => y <= MAX_YEAR);

  const navBtn = "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#f0f2f5] active:bg-[#e5e8ec]";
  const gridBtn = "rounded-xl py-2.5 text-[14px] font-medium transition-colors";
  const gridSel = "bg-[#1d2129] text-white";
  const gridDef = "text-[#1d2129] hover:bg-[#f0f2f5]";

  return (
    <div className="absolute inset-0 z-50 flex items-end"
         style={{ background: "rgba(0,0,0,0.45)" }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full rounded-t-2xl bg-white shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <button onClick={onClose} className="text-[14px] text-[#5c626b]">{t.authDobPickerCancel}</button>
          <span className="text-[15px] font-bold text-[#1d2129]">{t.authDobLabel}</span>
          <div className="w-14" />
        </div>

        <div className="px-4 pt-4 pb-5">
          {/* Progressive selection display */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[#e5e8ec] px-3 py-2.5">
            <span className={`text-[14px] ${displayText() ? "text-[#1d2129]" : "text-[#bbbec4]"}`}>
              {displayText() || (lang === "ja" ? "生年月日を選択" : "Select your date of birth")}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>

          {/* Calendar card */}
          <div className="rounded-xl border border-[#e5e8ec] overflow-hidden">
            {/* Navigation row */}
            <div className="flex items-center justify-between border-b border-[#f0f2f5] px-3 py-2.5">
              <button onClick={onBack} className={navBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-[15px] font-bold text-[#1d2129]">{headerLabel}</span>
              <button onClick={onForward} className={navBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Grid area */}
            <div className="px-3 py-3">
              {step === "year" && (
                <div className="grid grid-cols-3 gap-2">
                  {years.map(y => (
                    <button key={y}
                            onClick={() => { setSelYear(y); setSelMonth(null); setSelDay(null); setStep("month"); }}
                            className={`${gridBtn} ${selYear === y ? gridSel : gridDef}`}>
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {step === "month" && (
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_SHORT.map((m, i) => (
                    <button key={m}
                            onClick={() => { setSelMonth(i + 1); setSelDay(null); setStep("day"); }}
                            className={`${gridBtn} ${selMonth === i + 1 ? gridSel : gridDef}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {step === "day" && (
                <>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <button key={d}
                              onClick={() => setSelDay(d)}
                              className={`flex aspect-square items-center justify-center rounded-full text-[13px] font-medium transition-colors
                                ${selDay === d ? "bg-[#1d2129] text-white" : "text-[#1d2129] hover:bg-[#f0f2f5]"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  {selDay !== null && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => onConfirm(`${selYear}-${String(selMonth).padStart(2, "0")}-${String(selDay).padStart(2, "0")}`)}
                        className="rounded-xl bg-[#B40206] px-5 py-2 text-[14px] font-bold text-white">
                        {t.authDobPickerDone}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LandingPage ──────────────────────────────────────────────────────── */
// Logged-out lobby (V1 homepage): auth header + search + banner placeholder +
// category-filtered card sections. Card taps prompt sign-up.
function LandingPage({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_ORIPA.filter((it) => locTitle(it, lang).toLowerCase().includes(q)) : [];
  const { hidden: searchHidden, onScroll } = useHideOnScrollDown();
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={onLogin} />
      <div className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${searchHidden && !q ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
        <div className="border-b border-black/5 px-3 pb-2.5 pt-2.5">
          <LobbySearchBar t={t} value={query} onChange={setQuery} />
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={onScroll}>
        {q ? (
          <>
            <LobbySearchResults items={searchResults} t={t} lang={lang} />
            <SiteFooter t={t} />
          </>
        ) : (
        <>
        <div className="px-3 pt-3"><PromoCarousel /></div>
        <CategoryBar t={t} active={cat} onChange={setCat} />
        { }
        <img src="/home-divider.png" alt="" className="-mt-px -mb-px block w-full" />
        {HOME_SECTIONS.filter((s) => cat === "all" || s.cats.includes(cat)).map((s) => {
          const red = s.variant === "red";
          return (
            <Fragment key={s.id}>
              <section className={red ? "bg-[#B40206] px-3 pb-6 pt-4" : "bg-[#eef0f3] px-3 pb-5 pt-4"}>
                <h3 className={`mb-3 flex items-center gap-1.5 text-[15px] font-extrabold ${red ? "text-white" : "text-[#1d2129]"}`}>
                  {sectionIcon(s.icon, red)}
                  {(t as unknown as Record<string, string>)[s.titleKey]}
                </h3>
                <div className="space-y-3">
                  {s.items.map((it) => (
                    <OripaCard key={it.id} item={it} t={t} lang={lang} onView={onSignUp} onDraw={onSignUp} />
                  ))}
                </div>
              </section>
              {red && (
                <>
                  { }
                  <img src="/home-divider-bottom.png" alt="" className="-mt-px -mb-px block w-full" />
                </>
              )}
            </Fragment>
          );
        })}
        <SiteFooter t={t} />
        </>
        )}
      </div>
    </div>
  );
}

/* ── PhoneOtpPage ──────────────────────────────────────────────────────── */
function PhoneOtpPage({ lang, phone, onBack, onSuccess }: {
  lang: Lang; phone: string; onBack: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const allFilled = digits.every(d => d.length === 1);
  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    setDigits(["", "", "", "", "", ""]);
    setTimer(30);
    inputRefs.current[0]?.focus();
    setToast(t.authOtpToast as string);
    setTimeout(() => setToast(""), 2500);
  }

  const mm = Math.floor(timer / 60).toString().padStart(2, "0");
  const ss = (timer % 60).toString().padStart(2, "0");

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pt-12 pb-6">
          <h2 className="text-center text-[22px] font-extrabold text-[#1d2129]">{t.authOtpTitle as string}</h2>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-[#5c626b]">
            {t.authOtpBodyPre as string}
            {(t.authOtpBodyPre as string) && <br />}
            <span className="font-semibold text-[#1d2129]">{phone}</span>
            {t.authOtpBodyPost as string}
          </p>

          <p className="mt-5 text-center text-[13px] font-semibold text-[#1d2129]">
            {t.authOtpExpiry as string} {mm}:{ss}
          </p>

          <div className="mt-4 flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-[#e5e8ec] bg-white text-center text-[20px] font-bold text-[#1d2129] outline-none focus:border-[#B40206]"
              />
            ))}
          </div>

          <button
            onClick={() => { if (allFilled) onSuccess(); }}
            disabled={!allFilled}
            className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#B40206", opacity: allFilled ? 1 : 0.45 }}
          >
            {t.authOtpAuthenticate as string}
          </button>

          <button
            onClick={handleResend}
            disabled={!canResend}
            className="mt-3 w-full rounded-xl border border-[#e5e8ec] bg-white py-3.5 text-[14px] font-semibold text-[#5c626b]"
            style={{ opacity: canResend ? 1 : 0.45 }}
          >
            {t.authOtpResend as string}
          </button>

          <button
            onClick={onBack}
            className="mt-3 w-full text-center text-[13px] font-bold text-[#B40206] underline"
          >
            {t.authOtpChangePhone as string}
          </button>
        </div>
      </div>

      {toast && (
        <div className="absolute inset-x-4 top-4 z-50 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── SignupPage ───────────────────────────────────────────────────────── */
function SignupPage({ lang, onLogin, onSuccess, initialEmailVerify = false, initialAppleAuth = false }: { lang: Lang; onLogin: () => void; onSuccess: () => void; initialEmailVerify?: boolean; initialAppleAuth?: boolean }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showAppleAuth, setShowAppleAuth] = useState(initialAppleAuth);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneDob, setPhoneDob] = useState("");
  const [phoneInvite, setPhoneInvite] = useState("");
  const [phoneAgreed, setPhoneAgreed] = useState(false);
  const [showPhoneDobPicker, setShowPhoneDobPicker] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailDob, setEmailDob] = useState("");
  const [emailInvite, setEmailInvite] = useState("");
  const [emailAgreed, setEmailAgreed] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showEmailDobPicker, setShowEmailDobPicker] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(initialEmailVerify);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";
  const canPhoneSubmit = phoneValid && phoneDob.length > 0 && phoneAgreed;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canEmailSubmit = emailValid && passwordValid && emailDob.length > 0 && emailAgreed;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";

  const formatDob = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (lang === "ja") return `${y}年${Number(m)}月${Number(d)}日`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  };

  const calIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
  const checkIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const renderDobButton = (dob: string, onOpen: () => void) => (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {t.authDobLabel}<span className="ml-0.5 text-[#B40206]">*</span>
      </label>
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full rounded-xl border border-[#e5e8ec] bg-white py-3 text-left text-[14px] outline-none"
        style={{ paddingLeft: "36px", paddingRight: dob ? "40px" : "14px" }}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">{calIcon}</span>
        <span className={dob ? "text-[#1d2129]" : "text-[#bbbec4]"}>{dob ? formatDob(dob) : "Placeholder"}</span>
        {dob && <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>}
      </button>
    </div>
  );

  const renderInviteField = (value: string, onChange: (v: string) => void) => (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">{t.authInviteLabel}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Placeholder"
        className="w-full rounded-xl border border-[#e5e8ec] bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
      />
    </div>
  );

  const renderTermsCheckbox = (checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-start gap-2.5">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div
          className="flex h-5 w-5 items-center justify-center rounded"
          style={{ background: checked ? "#B40206" : "white", border: checked ? "none" : "2px solid #d1d5db" }}
        >
          {checked && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        </div>
      </div>
      <span className="text-[12px] leading-relaxed text-[#5c626b]">
        {t.authAgreePrefix}
        <span className="text-[#B40206] underline">{t.authTermsOfService}</span>
        {t.authAnd}
        <span className="text-[#B40206] underline">{t.authPrivacyPolicy}</span>
        {t.authAgreeEnd}
      </span>
    </label>
  );

  if (view === "otp") {
    return <PhoneOtpPage lang={lang} phone={otpPhone} onBack={() => setView("form")} onSuccess={() => {
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-5 space-y-3">

          {/* ── Social sign-up methods ── */}
          <AuthSocialButtons signUp t={t} onApple={() => setShowAppleAuth(true)} onGoogle={() => setShowGoogleAuth(true)} onLine={() => { try { sessionStorage.setItem("authData", JSON.stringify({ lineId: "line_user" })); } catch {} onSuccess(); }} />

          {/* ── Email Section ── */}
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "email" ? null : "email")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authEmailSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "email" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "email" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <AuthField
                  label={t.authEmailLabel} value={email} onChange={setEmail} type="email"
                  valid={emailValid && email.length > 0}
                  error={emailTouched ? emailFieldError : ""}
                  onBlur={() => setEmailTouched(true)}
                />
                <AuthField
                  label={t.authPasswordLabel} value={password} onChange={setPassword} type="password"
                  valid={passwordValid && password.length > 0}
                  error={passwordTouched ? passwordError : ""}
                  onBlur={() => setPasswordTouched(true)}
                />
                {renderDobButton(emailDob, () => setShowEmailDobPicker(true))}
                {renderInviteField(emailInvite, setEmailInvite)}
                {renderTermsCheckbox(emailAgreed, setEmailAgreed)}

                <button
                  onClick={() => { if (canEmailSubmit) setShowEmailVerify(true); }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section — hidden, preserved for future re-enablement ── */}
          {false && (
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "phone" ? null : "phone")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authPhoneSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "phone" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "phone" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                {/* Country code + Phone number */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#B40206]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => { setCountryCode(e.target.value as "JP" | "US"); setPhone(""); setPhoneTouched(false); }}
                      className="rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[13px] text-[#1d2129] outline-none"
                    >
                      <option value="JP">🇯🇵 +81</option>
                      <option value="US">🇺🇸 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="Placeholder"
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#B40206]">{phoneError}</p>}
                </div>

                {renderDobButton(phoneDob, () => setShowPhoneDobPicker(true))}
                {renderInviteField(phoneInvite, setPhoneInvite)}
                {renderTermsCheckbox(phoneAgreed, setPhoneAgreed)}

                <button
                  onClick={() => { if (canPhoneSubmit) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!canPhoneSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canPhoneSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authHaveAccount}{" "}
            <button onClick={onLogin} className="font-bold text-[#B40206] underline">{t.authLogInLink}</button>
          </p>
        </div>
      </div>

      {/* Phone DOB picker — hidden along with the phone section */}
      {false && showPhoneDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowPhoneDobPicker(false)}
                        onConfirm={(iso) => { setPhoneDob(iso); setShowPhoneDobPicker(false); }} />
      )}

      {showEmailDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowEmailDobPicker(false)}
                        onConfirm={(iso) => { setEmailDob(iso); setShowEmailDobPicker(false); }} />
      )}

      {/* Email Verification Modal */}
      {showEmailVerify && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-xs rounded-2xl bg-white px-6 py-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#fde68a,#fbbf24)" }}>
                <svg width="56" height="56" viewBox="0 0 60 60">
                  <ellipse cx="30" cy="38" rx="18" ry="14" fill="#f97316" />
                  <circle cx="30" cy="26" r="14" fill="#fb923c" />
                  <polygon points="18,18 10,6 22,14" fill="#f97316" />
                  <polygon points="42,18 50,6 38,14" fill="#f97316" />
                  <circle cx="30" cy="26" r="9" fill="#fed7aa" />
                  <circle cx="25" cy="24" r="2.5" fill="#1d2129" />
                  <circle cx="35" cy="24" r="2.5" fill="#1d2129" />
                  <circle cx="26" cy="23" r="1" fill="white" />
                  <circle cx="36" cy="23" r="1" fill="white" />
                  <ellipse cx="30" cy="28" rx="3" ry="2" fill="#f87171" />
                  <path d="M26 32 Q30 35 34 32" stroke="#1d2129" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <rect x="16" y="36" width="28" height="20" rx="3" fill="white" stroke="#e5e8ec" strokeWidth="1.5" />
                  <path d="M16 39l14 10 14-10" stroke="#B40206" strokeWidth="1.5" fill="none" />
                  <circle cx="36" cy="34" r="5" fill="#B40206" />
                  <text x="36" y="38" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">♥</text>
                </svg>
              </div>
            </div>
            <h2 className="text-center text-[18px] font-extrabold text-[#1d2129]">{t.authVerifyTitle}</h2>
            <p className="mt-2 text-center text-[12px] leading-relaxed text-[#5c626b]">
              {t.authVerifyBody(email || "HELLO@EMAIL.COM")}
            </p>
            <button onClick={() => {
              try { sessionStorage.setItem("authData", JSON.stringify({ email, dob: emailDob })); } catch {}
              onSuccess();
            }} className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#B40206" }}>
              {t.authOpenEmailApp}
            </button>
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-semibold text-[#5c626b]">{t.authVerifyNote}</p>
              {(t.authVerifyBullets as string[]).map((b, i) => (
                <p key={i} className="flex items-start gap-1.5 text-[11px] text-[#5c626b]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5c626b]" />{b}
                </p>
              ))}
            </div>
            <button className="mt-4 w-full text-center text-[11px] font-bold tracking-wide text-[#5c626b] underline">
              {t.authResendEmail}
            </button>
          </div>
        </div>
      )}

      {showAppleAuth && (
        <AppleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowAppleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                appleId: t.authAppleAccountEmail,
                displayName: t.authAppleAccountName,
              }));
            } catch {}
            setShowAppleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: t.authGoogleAccount1Email,
                displayName: t.authGoogleAccount1Name,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ── LoginPage ────────────────────────────────────────────────────────── */
function LoginPage({ lang, onSignUp, onSuccess, initialAppleAuth = false }: { lang: Lang; onSignUp: () => void; onSuccess: () => void; initialAppleAuth?: boolean }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showAppleAuth, setShowAppleAuth] = useState(initialAppleAuth);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canEmailSubmit = emailValid && passwordValid;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";

  const checkIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  if (view === "otp") {
    return <PhoneOtpPage lang={lang} phone={otpPhone} onBack={() => setView("form")} onSuccess={() => {
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={() => {}} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-5 space-y-3">

          {/* ── Social login ── (PROD: LINE logs in instantly for easy access) */}
          <AuthSocialButtons signUp={false} t={t} onApple={() => setShowAppleAuth(true)} onGoogle={() => setShowGoogleAuth(true)} onLine={() => { try { sessionStorage.setItem("authData", JSON.stringify({ lineId: "line_user" })); } catch {} onSuccess(); }} />

          {/* ── Email Section ── */}
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "email" ? null : "email")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authLoginEmailSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "email" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "email" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <AuthField
                  label={t.authEmailLabel} value={email} onChange={setEmail} type="email"
                  valid={emailValid && email.length > 0}
                  error={emailTouched ? emailFieldError : ""}
                  onBlur={() => setEmailTouched(true)}
                />
                <AuthField
                  label={t.authPasswordLabel} value={password} onChange={setPassword} type="password"
                  valid={passwordValid && password.length > 0}
                  error={passwordTouched ? passwordError : ""}
                  onBlur={() => setPasswordTouched(true)}
                />

                <button
                  onClick={() => { if (canEmailSubmit) { try { sessionStorage.setItem("authData", JSON.stringify({ email })); } catch {} onSuccess(); } }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section — hidden, preserved for future re-enablement ── */}
          {false && (
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "phone" ? null : "phone")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authLoginPhoneSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "phone" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "phone" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#B40206]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => { setCountryCode(e.target.value as "JP" | "US"); setPhone(""); setPhoneTouched(false); }}
                      className="rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[13px] text-[#1d2129] outline-none"
                    >
                      <option value="JP">🇯🇵 +81</option>
                      <option value="US">🇺🇸 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="Placeholder"
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#B40206]">{phoneError}</p>}
                </div>

                <button
                  onClick={() => { if (phoneValid) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!phoneValid}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: phoneValid ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authNoAccount}{" "}
            <button onClick={onSignUp} className="font-bold text-[#B40206] underline">{t.authSignUpNow}</button>
          </p>
        </div>
      </div>

      {showAppleAuth && (
        <AppleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowAppleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                appleId: t.authAppleAccountEmail,
                displayName: t.authAppleAccountName,
              }));
            } catch {}
            setShowAppleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: t.authGoogleAccount1Email,
                displayName: t.authGoogleAccount1Name,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ── PhoneApp ─────────────────────────────────────────────────────────── */


function NotificationsScreen({ lang, coins, empty = false, only, onBack, onHome }: { lang: Lang; coins: number; empty?: boolean; only?: "you" | "notice"; onBack: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [tab, setTab] = useState<"you" | "notice">(only ?? "you");
  // Locally track which notifications have been opened (reset per visit).
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const isUnread = (it: NotifItem) => !empty && !!it.unread && !readIds.has(it.id);
  const markRead = (id: string) => setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const unreadCount = (l: NotifItem[]) => l.filter(isUnread).length;
  const youUnread = unreadCount(NOTIF_YOU);
  const noticeUnread = unreadCount(NOTIF_NOTICE);

  const list = tab === "you" ? NOTIF_YOU : NOTIF_NOTICE;
  const title = tab === "you" ? t.notifTabYou : t.notifTabNotice;
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>

        {/* Tabs (hidden in single-tab mode) — each carries an unread badge */}
        {!only && (
          <div className="flex border-b border-black/10 px-2">
            {([
              { key: "you", label: t.notifTabYou, count: youUnread },
              { key: "notice", label: t.notifTabNotice, count: noticeUnread },
            ] as { key: "you" | "notice"; label: string; count: number }[]).map((tb) => {
              const active = tab === tb.key;
              return (
                <button key={tb.key} onClick={() => setTab(tb.key)} className="relative flex-1 pb-2.5 pt-1">
                  <span className="flex items-center justify-center gap-1.5">
                    <span className={`text-[13px] font-bold ${active ? "text-[#B40206]" : "text-[#1d2129]"}`}>{tb.label}</span>
                    {tb.count > 0 && (
                      <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#B40206] px-1 text-[10px] font-extrabold leading-none text-white">{tb.count}</span>
                    )}
                  </span>
                  {active && <span className="absolute inset-x-5 -bottom-px h-[3px] rounded-full bg-[#B40206]" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-extrabold text-[#1d2129]">{title}</h2>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#eef0f3]">
        {empty || list.length === 0 ? (
          <p className="py-28 text-center text-[14px] text-[#9aa0a8]">{t.notifEmpty}</p>
        ) : (
          <div className="space-y-2.5 px-3 py-3">
            {list.map((it) => {
              const un = isUnread(it);
              return (
                <button
                  key={it.id}
                  onClick={() => un && markRead(it.id)}
                  className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${un ? "border-[#f1c4c4] bg-[#fff5f5]" : "border-black/10 bg-white"}`}
                >
                  {un && <span className="absolute inset-y-0 left-0 w-1 bg-[#B40206]" />}
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[#9aa0a8]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {lang === "ja" ? it.atJa : it.at}
                    {un && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-[#B40206] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />{t.notifNew}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-[14px] leading-snug ${un ? "font-extrabold text-[#1d2129]" : "font-semibold text-[#41464e]"}`}>{lang === "ja" ? it.titleJa : it.title}</p>
                  <p className={`mt-0.5 text-[12.5px] leading-relaxed ${un ? "text-[#6b7078]" : "text-[#8a9099]"}`}>{lang === "ja" ? it.bodyJa : it.body}</p>
                  {it.tracking && <p className="mt-0.5 text-[12.5px] text-[#8a9099]">{lang === "ja" ? "追跡番号：" : "Tracking number: "}{it.tracking}</p>}
                </button>
              );
            })}
          </div>
        )}
        <SiteFooter t={t} />
      </div>
    </div>
  );
}

export function PhoneApp({ lang, noHistory }: { lang: Lang; noHistory: boolean }) {
  const t = STR[lang];
  const [screen, setScreen] = useState<Screen>("landing");
  const [prevScreen, setPrevScreen] = useState<Screen>("oripa");
  const [coins] = useState(10000);
  const [notifOnly, setNotifOnly] = useState<"you" | "notice" | undefined>(undefined);
  const goHome = () => setScreen("oripa");
  // PROD: login/sign-up land straight on the lobby (no onboarding flow).
  const enterHome = () => setScreen("oripa");
  const openNotifications = () => { setNotifOnly(undefined); setPrevScreen((p) => (screen === "notifications" ? p : screen)); setScreen("notifications"); };
  const onLanding = screen === "landing" || screen === "signup" || screen === "login";
  const showNav = !onLanding;
  return (
    <NotifNavContext.Provider value={onLanding ? () => {} : openNotifications}>
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <div className="relative min-h-0 flex-1">
        {/* Logged-out lobby — V1 homepage layout */}
        {screen === "landing" && <LandingPage lang={lang} onSignUp={() => setScreen("signup")} onLogin={() => setScreen("login")} />}
        {screen === "signup" && <SignupPage lang={lang} onLogin={() => setScreen("login")} onSuccess={enterHome} />}
        {screen === "login" && <LoginPage lang={lang} onSignUp={() => setScreen("signup")} onSuccess={enterHome} />}
        {/* Logged-in lobby — V2 format */}
        {screen === "oripa" && <OripaHome lang={lang} coins={coins} onHome={goHome} />}
        {screen === "notifications" && <NotificationsScreen lang={lang} coins={coins} empty={noHistory} only={notifOnly} onBack={() => setScreen(prevScreen)} onHome={goHome} />}
      </div>
      {showNav && <BottomNav screen={screen} t={t} />}
    </div>
    </NotifNavContext.Provider>
  );
}


export function VersionBadge() {
  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[90] rounded-md bg-black/70 px-2.5 py-1 text-[12px] font-semibold tracking-wide text-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
    >
      {APP_VERSION}
    </div>
  );
}

// Polls /api/version; when the deployed build differs from the one currently
// loaded in the browser, shows a small refresh prompt above the version badge.
export function UpdatePrompt() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (alive && data.version && data.version !== APP_VERSION) setNewVersion(data.version);
      } catch {
        /* offline / transient — ignore */
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!newVersion || dismissed === newVersion) return null;

  return (
    <div className="fixed bottom-12 right-3 z-[91] flex items-center gap-2 rounded-lg bg-[#1d2129] py-2 pl-3 pr-2 text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)]" style={{ animation: "storeEduBannerIn .25s ease both" }}>
      <span className="text-[12.5px] font-semibold">New version available <span className="font-extrabold text-[#ffd36b]">{newVersion}</span></span>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-[#B40206] px-2.5 py-1 text-[12px] font-extrabold text-white active:scale-[0.97]"
      >
        Refresh
      </button>
      <button
        onClick={() => setDismissed(newVersion)}
        aria-label="Dismiss"
        className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:text-white active:bg-white/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
