"use client";

import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { APP_VERSION } from "../version";
import type {
  Category,
  Lang,
  OripaItem,
  Rarity,
  Screen,
  SectionIconKey,
  NotifItem,
  PrizeTab,
  ShippingAddr,
  ShippingCountry,
  ShippedPrize,
  SortKey,
  WaitingPrize,
  WonPrize,
} from "../lib/types";
import { STR, type Dict, locTitle } from "../lib/i18n";
import { AuthHeader, SignupPage, LoginPage, LineAuthIcon } from "./auth";
import { HOME_SECTIONS, ALL_ORIPA } from "../data/lobby";
import { NOTIF_YOU, NOTIF_NOTICE, NOTIF_UNREAD_TOTAL } from "../data/notifications";
import { LEGAL, type LegalDocKey } from "../data/legal";
import {
  CATEGORIES,
  DAY,
  EMPTY_SHIPPING_FORM,
  INITIAL_SHIPPED,
  INITIAL_WAITING,
  INITIAL_WON,
  NOW,
  PREFECTURES_EN,
  PREFECTURES_JA,
  FREE_SHIP_QUOTA,
  RARITY_IMG,
  RARITY_META,
  SHIP_MIN_COINS,
  SHIP_WINDOW_DAYS,
  SORT_KEYS,
  US_STATES,
  formatShippingAddr,
  generateDraw,
} from "../data/prizes";

import { StorePage as StorePageView, type PointPackage } from "./store-page";
import { PurchaseFlow, CashierLegalContext, type SavedCard } from "./cashier";
import { ProfilePage } from "./profile-page";
import {
  KycOverlay,
  KYC_SESSION_KEY,
  createDefaultKycState,
  type KycEntryContext,
  type KycScenario,
  type KycState,
} from "./kyc";

const NotifNavContext = createContext<() => void>(() => {});
// Tapping the currency balances in the header opens the Coin History screen.
const CoinHistoryNavContext = createContext<() => void>(() => {});
// Opening a legal document (Terms / Privacy / SCTA) reader from anywhere.
const LegalNavContext = createContext<(doc: LegalDocKey) => void>(() => {});

// Preserve the My Page scroll offset across remounts (each screen change
// remounts via key={screen}), so returning from a sub-screen keeps position.
let myPageScrollTop = 0;

// Lazy "Load more" pagination. Reveals `pageSize` rows at a time; newly
// revealed rows animate in one-by-one (staggered) via `animate-fade-slide`.
const LOAD_MORE_PAGE = 6;

function LoadMoreButton({ t, loading, onClick }: { t: Dict; loading: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center pt-2 pb-4">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-full border border-[#D10005] bg-white px-7 py-2.5 text-[13px] font-bold text-[#D10005] shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition active:scale-[0.97] disabled:opacity-70"
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#D10005] border-t-transparent" />}
        {loading ? t.loadingMore : t.loadMore}
      </button>
    </div>
  );
}

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
     
    <img src="/freepoint.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
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
      <img src="/bell-notification.png" alt="" className="h-[22px] w-[22px] object-contain" />
      {NOTIF_UNREAD_TOTAL > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#D10005] px-1 text-[9px] font-extrabold leading-none text-white ring-2 ring-white">{NOTIF_UNREAD_TOTAL}</span>
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
            style={{ background: active ? "#D10005" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {l === "en" ? "EN" : "日本語"}
          </button>
        );
      })}
    </div>
  );
}

function BalancePill({ coins, t, onOpenStore }: { coins: number; t: Dict; onOpenStore?: () => void }) {
  const openCoinHistory = useContext(CoinHistoryNavContext);
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative mr-2.5">
        <button
          type="button"
          onClick={openCoinHistory}
          aria-label={t.coinHistoryTitle}
          className="flex items-center gap-2 rounded-full border border-black/15 bg-white py-1 pl-3 pr-5 shadow-[0_1px_3px_rgba(0,0,0,0.10)] transition active:scale-[0.97]"
        >
          <span className="flex items-center gap-1 text-[13px] font-medium text-[#1d2129]">
            <GemIcon size={18} /> 10,000
          </span>
          <span className="h-4 w-px bg-black/15" />
          <span className="flex items-center gap-1 text-[13px] font-medium text-[#1d2129]">
            <CoinIcon size={18} /> {coins.toLocaleString()}
          </span>
        </button>
        <button
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="absolute right-0 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 items-center justify-center transition active:scale-[0.95]"
        >
          <img src="/plus-sign.png" alt="" className="h-full w-full object-contain" draggable={false} />
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
      ? "bg-[#D10005] text-white border border-[#D10005]"
      : variant === "redOutline"
        ? "border border-[#D10005] text-[#D10005]"
        : "border border-black/35 text-[#1d2129]";
  return <span className={`whitespace-nowrap rounded-full px-2 py-[1px] text-[10px] font-bold ${cls}`}>{children}</span>;
}

function OripaCard({ item, t, onView, onDraw }: { item: OripaItem; t: Dict; onView?: () => void; onDraw?: (count: number, free?: boolean) => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  const price = (
    <span className="flex items-baseline">
      <span className="text-[15px] font-extrabold text-[#1d2129] underline decoration-[#D10005] decoration-2 underline-offset-2">1,000</span>
      <span className="text-[11px] font-bold text-[#8a9099]">{t.perDraw}</span>
    </span>
  );
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="1.8" strokeLinejoin="round" className="shrink-0"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
        <TagPill variant="redOutline">{t.tagPopular}</TagPill>
        <TagPill variant="redFill">{t.tagPokemon}</TagPill>
        <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
        <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
      </div>
      <div className="mx-2.5 mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#ededf0]">
        {/* Figma placeholder until final oripa-draw creative is signed off. */}
        <img src="/placeholder-oripa.png" alt="" className="h-full w-full object-cover" />
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
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#D10005]" style={{ width: `${pct}%` }} /></div>
          <p className="flex items-baseline justify-center gap-0.5 leading-none text-[#D10005]">
            <span className="text-[13px] font-bold">{t.remainingTimeLabel}</span>
            <span className="text-[17px] font-extrabold">{t.minUnit(item.endsIn)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={onView} className="flex-1 rounded-lg py-2 text-[12px] font-bold text-white" style={{ background: "#D10005" }}>{t.btnDraw}</button>
        {item.free && <button onClick={() => onDraw?.(1, true)} className="flex-1 rounded-lg border border-[#D10005] py-2 text-[12px] font-bold text-[#D10005]">{t.btnFree}</button>}
        <button onClick={onView} className="flex-1 rounded-lg border border-black/40 py-2 text-[12px] font-bold text-[#1d2129]">{t.btnView}</button>
      </div>
    </div>
  );
}

// PROD: the top banner is a Figma-style placeholder carousel (8:3 slots,
// "PROMO BANNER" label) until the client signs off on final creative.
const PROMO_SLIDE_COUNT = 7;

// V1 homepage top: auto-advancing promo carousel. Slides walk into a cloned
// first slide for a seamless wrap, then snap back without animation.
function PromoCarousel() {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);
  const n = PROMO_SLIDE_COUNT;

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => i + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!anim) {
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
      return () => cancelAnimationFrame(r);
    }
  }, [anim]);

  const activeDot = idx % n;
  // Render n slides plus one cloned first slide for a seamless wrap.
  const slideCount = n + 1;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex"
          style={{
            transform: `translateX(-${idx * 100}%)`,
            transition: anim ? "transform 850ms cubic-bezier(0.22,0.61,0.36,1)" : "none",
          }}
          onTransitionEnd={() => {
            if (idx === n) {
              setAnim(false);
              setIdx(0);
            }
          }}
        >
          {Array.from({ length: slideCount }).map((_, i) => (
            // Each slide owns its 8:3 ratio so its height never depends on a
            // fragile h-full chain through the flex track.
            <div key={i} className="relative aspect-[8/3] w-full shrink-0">
              <img src="/placeholder-banner.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center text-[18px] font-extrabold tracking-wide text-[#1d2129]">
                PROMO BANNER
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {Array.from({ length: n }).map((_, i) => {
          const on = i === activeDot;
          return (
            <button
              key={i}
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => {
                setAnim(true);
                setIdx(i);
              }}
              className="h-2 rounded-full transition-all"
              style={{ width: on ? 18 : 8, background: on ? "#D10005" : "#cfd3da" }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Home hero (client-provided design) ───────────────────────────────────────
// Shop backdrop + fox-girl character with promo icon rails on each side and a
// speech bubble that appears when the character is tapped. Sits between the
// header and the category top-nav, replacing the old promo carousel. Links are
// inert for now (screens not ready). Assets live in /hero.
function useHeroCountdown(startSeconds: number) {
  const [left, setLeft] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 1 ? startSeconds : s - 1)), 1000);
    return () => clearInterval(id);
  }, [startSeconds]);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;
}

// Promo icon. `onClick` is intentionally optional — links are deactivated until
// their destination screens exist; the button still gives press feedback.
function HeroIcon({ img, label, timer, onClick }: { img: string; label: string; timer?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-[78px] flex-col items-center transition-transform duration-150 active:scale-90">
      <img src={img} alt="" className="h-[52px] w-[52px] object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.5)]" />
      <span className="mt-0.5 rounded-md bg-black/45 px-1.5 py-px text-[9px] font-extrabold uppercase leading-tight tracking-wide text-white">{label}</span>
      {timer && <span className="mt-0.5 rounded-full bg-[#D10005] px-1.5 py-px text-[9px] font-bold tabular-nums text-white shadow">{timer}</span>}
    </button>
  );
}

function HomeHero({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const questTimer = useHeroCountdown(150);
  const inviteTimer = useHeroCountdown(420);
  const [bubble, setBubble] = useState(false);
  return (
    <div className="relative aspect-[9/8] w-full select-none overflow-hidden bg-[#2a1c11]">
      <img src="/hero/bg-day.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <img
        src="/hero/hero.png"
        alt=""
        onClick={() => setBubble((b) => !b)}
        className="pointer-events-auto absolute left-1/2 top-[5%] h-[112%] max-w-none -translate-x-1/2 cursor-pointer object-contain object-top drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
      />

      <div className="absolute left-1 top-[14%] z-20 flex flex-col gap-3">
        <HeroIcon img="/hero/icon-chain.png" label={ja ? "チェーン" : "Chain offer"} />
        <HeroIcon img="/hero/icon-bonus.png" label={ja ? "初回ボーナス" : "First bonus"} />
      </div>

      <div className="absolute right-1 top-[14%] z-20 flex flex-col gap-3">
        <HeroIcon img="/hero/icon-loyalty.png" label={ja ? "ロイヤリティ" : "Loyalty"} />
        <HeroIcon img="/hero/icon-quest.png" label={ja ? "クエスト" : "Quest"} timer={questTimer} />
        <HeroIcon img="/hero/icon-invite.png" label={ja ? "友達招待" : "Invite"} timer={inviteTimer} />
      </div>

      {bubble && (
        <div
          onClick={() => setBubble(false)}
          className="absolute bottom-2 left-1/2 z-20 w-[70%] max-w-[290px] -translate-x-1/2 cursor-pointer rounded-2xl border border-black/5 bg-white/95 px-3.5 py-2.5 text-center shadow-[0_6px_16px_rgba(0,0,0,0.28)]"
          style={{ animation: "heroBubbleIn .2s ease-out both" }}
        >
          <span className="block text-[12.5px] font-bold leading-snug text-[#1d2129]">{ja ? "今日はどんなオリパに出会える？" : "What kind of oripa will you find today?"}</span>
          <span className="mt-0.5 block text-[12.5px] font-extrabold leading-snug text-[#D10005]">{ja ? "タップして運試し！" : "Tap to try your luck!"}</span>
          <span className="absolute -top-2 right-10 h-4 w-4 rotate-45 border-l border-t border-black/5 bg-white/95" />
        </div>
      )}
    </div>
  );
}

function catIcon(key: string, color: string) {
  switch (key) {
    case "all":
      return <svg width="23" height="23" viewBox="0 0 24 24" fill={color}><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></svg>;
    case "new":
      return <img src="/icons/new-badge.png" alt="" width="26" height="26" className="h-[26px] w-[26px] object-contain" />;
    case "popular":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
    case "pokemon":
      return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" stroke={color} strokeWidth="1.8" /><path d="M3 12A9 9 0 0 1 21 12Z" fill={color} /><circle cx="12" cy="12" r="3.1" fill="#fff" stroke={color} strokeWidth="1.8" /><circle cx="12" cy="12" r="1.25" fill={color} /></svg>;
    case "limited":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.3 1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z" /></svg>;
  }
}

// Legal document reader (Terms of Use, Privacy Policy, SCTA notation).
// Opened from the footer links and the My Account "Other" section.
// Body lines starting with "## " render as section headings.
function LegalOverlay({ lang, doc, onClose }: { lang: Lang; doc: LegalDocKey; onClose: () => void }) {
  const { title, body } = LEGAL[lang][doc];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[86%] w-full flex-col overflow-hidden rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <style>{`.legal-scroll::-webkit-scrollbar{width:7px}.legal-scroll::-webkit-scrollbar-track{background:rgba(0,0,0,0.05);border-radius:9999px}.legal-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.3);border-radius:9999px}.legal-scroll::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.45)}`}</style>
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3">
          <h3 className="text-[16px] font-bold text-[#1d2129]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="legal-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.3) rgba(0,0,0,0.05)" }}>
          {body.map((line, i) =>
            line.startsWith("## ") ? (
              <h4 key={i} className="pt-2 text-[13.5px] font-bold text-[#1d2129]">{line.slice(3)}</h4>
            ) : (
              <p key={i} className="whitespace-pre-line text-[12.5px] leading-relaxed text-[#41464e]">{line}</p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

const SOCIAL_ICONS: { key: string; viewBox: string; path: React.ReactNode }[] = [
  {
    key: "line",
    viewBox: "0 0 24 24",
    path: <path d="M12 2C6.5 2 2 5.7 2 10.2c0 4 3.6 7.4 8.4 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6C21.6 13.6 22 12 22 10.2 22 5.7 17.5 2 12 2zM8 12.9H6.4c-.2 0-.4-.2-.4-.4V9.3c0-.2.2-.4.4-.4s.4.2.4.4v2.8H8c.2 0 .4.2.4.4s-.2.4-.4.4zm1.7-.4c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9.3c0-.2.2-.4.4-.4s.4.2.4.4v3.2zm3.9 0c0 .2-.1.3-.3.4h-.1c-.1 0-.3-.1-.3-.2l-1.3-1.8v1.6c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9.3c0-.2.1-.3.3-.4.2 0 .3 0 .4.2l1.3 1.8V9.3c0-.2.2-.4.4-.4s.4.2.4.4v3.2zm2.8-2c.2 0 .4.2.4.4s-.2.4-.4.4h-1.1v.7h1.1c.2 0 .4.2.4.4s-.2.4-.4.4h-1.5c-.2 0-.4-.2-.4-.4V9.3c0-.2.2-.4.4-.4h1.5c.2 0 .4.2.4.4s-.2.4-.4.4h-1.1v.7h1.1z" />,
  },
  {
    key: "x",
    viewBox: "0 0 24 24",
    path: <path d="M18.2 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.1 2.5h6.8l4.7 6.2 5.6-6.2zm-1.2 17.5h1.8L7.1 4.3H5.2L17 20z" />,
  },
  {
    key: "ig",
    viewBox: "0 0 24 24",
    path: <path fillRule="evenodd" clipRule="evenodd" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM17.3 5.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />,
  },
  {
    key: "fb",
    viewBox: "0 0 24 24",
    path: <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.6v8h3.6z" />,
  },
];

function SiteFooter({ t }: { t: Dict }) {
  const openLegal = useContext(LegalNavContext);
  const chip = (label: string) => {
    const doc: LegalDocKey | null = label === t.mpTerms ? "terms" : label === t.mpPrivacy ? "privacy" : label === t.mpLegal ? "legal" : label === t.mpAntisocial ? "antisocial" : null;
    return doc ? (
      <button key={label} onClick={() => openLegal(doc)} className="rounded-full bg-white px-3.5 py-2 text-[12px] font-bold text-[#1d2129] active:bg-white/80">{label}</button>
    ) : (
      <span key={label} className="rounded-full bg-white px-3.5 py-2 text-[12px] font-bold text-[#1d2129]">{label}</span>
    );
  };
  return (
    <footer className="bg-black px-4 py-7 text-white">
      <img src="/oripa-logo-footer.png" alt="オリパロット" className="h-8 w-auto" />
      <p className="mt-3 text-[11px] text-white">{t.ftCopyright}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-white">{t.ftBlurb}</p>

      <h4 className="mt-6 text-[14px] font-bold">{t.ftAbout}</h4>
      <div className="mt-3 flex flex-wrap gap-2.5">{t.ftLinks.map(chip)}</div>

      <h4 className="mt-6 text-[14px] font-bold">{t.ftCategories}</h4>
      <div className="mt-3 flex flex-wrap gap-2.5">{t.ftCats.map(chip)}</div>

      <h4 className="mt-6 text-[14px] font-bold">{t.ftFollow}</h4>
      <div className="mt-3 flex items-center gap-3.5">
        {SOCIAL_ICONS.map(({ key, path, viewBox }) => (
          <span key={key} className="flex h-11 w-11 items-center justify-center rounded-full bg-black ring-1 ring-white/25">
            <svg width="20" height="20" viewBox={viewBox} fill="#fff">{path}</svg>
          </span>
        ))}
      </div>

      <div className="my-6 h-px bg-white/15" />
      <p className="text-[12px] font-medium leading-relaxed text-white">
        {t.ftSupport.split(":")[0]}: <span className="underline decoration-white/50">{t.ftSupport.split(":").slice(1).join(":").trim()}</span>
      </p>
      <p className="mt-4 text-[12px] font-medium leading-relaxed text-white">{t.ftPayInquiry}</p>
      <p className="mt-2 text-[10px] font-medium leading-relaxed text-white">{t.ftPhoneNote}</p>

      <div className="my-6 h-px bg-white/15" />
      <p className="text-[10px] font-medium leading-relaxed text-white">{t.ftPurchaseNote}</p>
      <p className="mt-4 text-[10px] font-medium leading-relaxed text-white">{t.ftOperator}</p>
      <p className="mt-4 text-[10px] font-medium text-white">{t.ftCopyright}</p>
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

/* ── Lobby navigation (V2) ───────────────────────────────────────────────
   Competitor-style browse: a category chip bar + "Narrow down" / sort toolbar
   over a sectioned feed (each lane has a "See all" jump). A bottom sheet holds
   search + quick filters. All filtering / sorting is client-side (POC data). */
const LOBBY_NAV_STR = {
  en: {
    seeAll: "See all",
    empty: "No packs match your search.",
    narrowDown: "Narrow down",
    searchPlaceholder: "Search for original packs (e.g., Pikachu, Charizard)",
    quickFilters: "Quick filters",
    clear: "Clear",
    apply: "Apply",
    reset: "Reset",
    filter: "Filter",
    clearAll: "Clear all",
    filtersApplied: "Filters applied",
    pokemonHeading: "Pokemon",
    filterTags: [["popular", "Popular"], ["pokemon", "Pokemon"], ["psa10", "PSA 10 Guaranteed"], ["limit1", "Limited to 1 per day"], ["gvalue", "Guaranteed Value"], ["min60", "Minimum Guarantee of 60% or more"], ["campaign", "Campaign"], ["endsoon", "End soon"], ["ranklimited", "Rank Limited"], ["lastone", "Last One Prize"]] as [string, string][],
    pokemonTags: [["pikachu", "Pikachu"], ["lillie", "Lillie"], ["umbreon", "Umbreon"], ["gengar", "Gengar"], ["charizard", "Charizard"]] as [string, string][],
    sorts: [["rec", "Recommended order"], ["popular", "Most popular"], ["new", "Newest"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"]] as [string, string][],
    quickOpts: [["popular", "Most popular"], ["newarrivals", "New Arrivals"], ["fewleft", "Only a few left"], ["psa10", "PSA10 confirmed"], ["guarantee60", "High return"], ["pokemon", "Pokémon"], ["onepiece", "One Piece"], ["box", "BOX"]] as [string, string][],
  },
  ja: {
    seeAll: "すべて見る",
    empty: "一致するオリパがありません。",
    narrowDown: "絞り込み",
    searchPlaceholder: "オリパを検索（例：ピカチュウ、リザードン）",
    quickFilters: "クイックフィルター",
    clear: "クリア",
    apply: "適用",
    reset: "リセット",
    filter: "絞り込む",
    clearAll: "すべてクリア",
    filtersApplied: "適用中のフィルター",
    pokemonHeading: "ポケモン",
    filterTags: [["popular", "人気"], ["pokemon", "ポケモン"], ["psa10", "PSA10確定"], ["limit1", "1日1点限定"], ["gvalue", "価値保証"], ["min60", "最低保証60%以上"], ["campaign", "キャンペーン"], ["endsoon", "まもなく終了"], ["ranklimited", "ランク限定"], ["lastone", "ラストワン賞"]] as [string, string][],
    pokemonTags: [["pikachu", "ピカチュウ"], ["lillie", "リーリエ"], ["umbreon", "ブラッキー"], ["gengar", "ゲンガー"], ["charizard", "リザードン"]] as [string, string][],
    sorts: [["rec", "おすすめ順"], ["popular", "人気順"], ["new", "新着順"], ["priceAsc", "価格の安い順"], ["priceDesc", "価格の高い順"]] as [string, string][],
    quickOpts: [["popular", "人気"], ["newarrivals", "新着"], ["fewleft", "残りわずか"], ["psa10", "PSA10確定"], ["guarantee60", "高還元"], ["pokemon", "ポケモン"], ["onepiece", "ワンピース"], ["box", "BOX"]] as [string, string][],
  },
};

function lobbyItemsForCat(cat: string): OripaItem[] {
  if (cat === "all") return ALL_ORIPA;
  const seen = new Set<string>();
  const out: OripaItem[] = [];
  for (const s of HOME_SECTIONS) if (s.cats.includes(cat)) for (const it of s.items) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
  return out;
}

// V2 lobby feed. `onView` (tap on any card) is inert in the logged-in lobby
// and routes to Sign-up on the logged-out landing.
function LobbyNavFeed({ t, lang, filters, query, onToggle, onQueryChange, onReset, onClearFilters, onView, onOpenDraw }: { t: Dict; lang: Lang; filters: Record<string, boolean>; query: string; onToggle: (k: string) => void; onQueryChange: (v: string) => void; onReset: () => void; onClearFilters: () => void; onView?: () => void; onOpenDraw?: (item: OripaItem) => void }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  const [cat, setCat] = useState("all");
  const [searchActive, setSearchActive] = useState(false);
  const [searchHidden, setSearchHidden] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  // Mirror of `searchHidden` readable inside the (once-bound) scroll handler, plus
  // a lock that suppresses scroll-driven toggles while a collapse/expand animation
  // (and the content-height shift it causes) settles — this is what stops the
  // hide→shift→show→shift→hide feedback loop that made the bar "shake".
  const searchHiddenRef = useRef(false);
  const scrollLockRef = useRef(false);
  // While a query, applied filters, or the open filter dropdown are present we
  // keep the search bar visible (never auto-hide on scroll) so the user can act.
  const keepVisibleRef = useRef(false);
  const filterCount = Object.keys(filters).length;
  const qq = query.trim().toLowerCase();
  const hasQuery = qq.length > 0;
  // Map filter keys → human labels so applied filters can be shown as chips.
  const filterLabel = (k: string) => {
    const hit = [...L.filterTags, ...L.pokemonTags].find(([key]) => key === k);
    return hit ? hit[1] : k;
  };
  const activeFilterKeys = Object.keys(filters);

  // When switching categories: if the user has already scrolled past the promo
  // banner (so the feed has scrolled up under the top nav), bring the top nav
  // back into focus at the top of the viewport. If the banner is still visible,
  // leave the scroll position untouched. Skip on first render.
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    let p = el.parentElement;
    while (p) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
        const delta = el.getBoundingClientRect().top - p.getBoundingClientRect().top;
        // delta < 0 means the feed top (and the nav) is above the viewport top,
        // i.e. the banner has been scrolled out — pull the nav back to the top.
        // delta >= 0 means the banner is still visible — don't move.
        if (delta < 0) p.scrollTop += delta;
        return;
      }
      p = p.parentElement;
    }
  }, [cat]);

  // Auto-hide the search bar while scrolling down; reveal it again on scroll up
  // (the category bar stays pinned). A downward scroll also closes the filter
  // dropdown so it never lingers over the feed. Listening in the capture phase
  // catches whichever element actually scrolls (the in-frame div or the window).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let inner = el.parentElement;
    while (inner) {
      const oy = getComputedStyle(inner).overflowY;
      if (oy === "auto" || oy === "scroll") break;
      inner = inner.parentElement;
    }
    const readY = () =>
      inner && inner.scrollHeight > inner.clientHeight + 4
        ? inner.scrollTop
        : window.scrollY || document.documentElement.scrollTop || 0;
    // Toggle once, then lock out further scroll-driven toggles until the 300ms
    // slide animation and the resulting content reflow have settled. Re-anchoring
    // lastScrollY at unlock means the height shift can't be read as a new scroll.
    const setHidden = (hidden: boolean) => {
      if (searchHiddenRef.current === hidden) return;
      searchHiddenRef.current = hidden;
      setSearchHidden(hidden);
      if (hidden) { setSearchActive(false); inputRef.current?.blur(); }
      scrollLockRef.current = true;
      window.setTimeout(() => {
        scrollLockRef.current = false;
        lastScrollY.current = readY();
      }, 380);
    };
    const onScroll = (e: Event) => {
      // Ignore scrolling that happens inside the filter dropdown itself.
      const tgt = e.target as Node;
      if (tgt !== inner && searchBoxRef.current && searchBoxRef.current.contains(tgt)) return;
      // Swallow the self-induced scroll events fired while a toggle is animating.
      if (scrollLockRef.current) return;
      const y = readY();
      if (y <= 6) { setHidden(false); lastScrollY.current = y; return; }
      const dy = y - lastScrollY.current;
      // Small deltas neither toggle nor re-anchor, so slow drags accumulate until
      // they cross the threshold instead of being lost frame-by-frame.
      if (dy > 10 && !keepVisibleRef.current) { setHidden(true); lastScrollY.current = y; }
      else if (dy < -10) { setHidden(false); lastScrollY.current = y; }
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  // Track whether the search bar must stay visible for the scroll handler, and
  // reveal it immediately whenever a query / applied filters / open dropdown appear.
  useEffect(() => {
    keepVisibleRef.current = hasQuery || filterCount > 0 || searchActive;
    if (keepVisibleRef.current) { searchHiddenRef.current = false; setSearchHidden(false); }
  }, [hasQuery, filterCount, searchActive]);

  // Close the filter dropdown when clicking/tapping outside of it.
  useEffect(() => {
    if (!searchActive) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchActive(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [searchActive]);

  const catList: { key: string; label: string }[] = [
    { key: "all", label: t.catAll },
    { key: "new", label: t.catNew },
    { key: "popular", label: t.catPopular },
    { key: "pokemon", label: t.catPokemon },
    { key: "limited", label: t.catLimited },
    { key: "other", label: t.catOther },
  ];

  function applyQuery(list: OripaItem[]): OripaItem[] {
    return qq ? list.filter((it) => locTitle(it, lang).toLowerCase().includes(qq)) : list;
  }
  function transform(list: OripaItem[]): OripaItem[] {
    let arr = applyQuery(list.slice());
    if (filterCount) arr = arr.filter((_, i) => i % (filterCount + 1) !== 0);
    return arr;
  }

  // In the logged-in lobby `onOpenDraw` opens the draw screen for the tapped
  // pack; the logged-out lobby falls back to `onView` (sign-up bridge).
  const canOpen = !!(onOpenDraw || onView);
  const openCard = (it: OripaItem) => (onOpenDraw ? onOpenDraw(it) : onView?.());
  const full = (it: OripaItem) => (
    <OripaCard key={it.id} item={it} t={t} onView={canOpen ? () => openCard(it) : undefined} onDraw={canOpen ? () => openCard(it) : undefined} />
  );
  const tagPill = ([key, label]: [string, string]) => {
    const on = !!filters[key];
    return (
      <button
        key={key}
        onClick={() => onToggle(key)}
        className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${on ? "border-[#D10005] bg-[#D10005] text-white" : "border-[#a3a8b0] bg-white text-[#4b5058]"}`}
      >
        {label}
      </button>
    );
  };

  // Promo banner — rendered between the recommended (red) oripas and the rest
  // of the feed. Single banner with dots (same carousel as logged-out users);
  // swap the placeholder creative for real art later.
  const promoBanners = (
    <div className="px-3.5 pt-3"><PromoCarousel /></div>
  );

  const showResults = hasQuery || filterCount > 0;
  let body: React.ReactNode;
  if (showResults) {
    const items = transform(ALL_ORIPA);
    body = items.length === 0
      ? <div className="px-6 py-16 text-center text-[13px] font-semibold text-[#8a9099]">{L.empty}</div>
      : <div className="flex flex-col gap-3 px-3.5 py-3">{items.map(full)}</div>;
  } else if (cat === "all") {
    body = (
      <div>
        {HOME_SECTIONS.map((s, i) => {
          const title = (t as unknown as Record<string, string>)[s.titleKey];
          const seeAllCat = s.cats[0];
          // No divider directly after the red recommended block (the promo
          // banners already separate it from the following section).
          const afterRed = i > 0 && HOME_SECTIONS[i - 1].variant === "red";
          if (s.variant === "red") {
            return (
              <div key={s.id}>
                {/* Curved divider transitioning white -> red (above the section) */}
                <img src="/home-divider-top.png" alt="" className="-mb-px block w-full" />
                <section className="bg-[#D10005] px-3.5 pb-6 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-white">{sectionIcon(s.icon, true)}{title}</h3>
                    {seeAllCat && <button onClick={() => setCat(seeAllCat)} className="text-[12px] font-bold text-white/90">{L.seeAll} →</button>}
                  </div>
                  <div className="flex flex-col gap-3">{s.items.map(full)}</div>
                </section>
                {/* Curved divider transitioning red -> white (below the section) */}
                <img src="/home-divider-bottom.png" alt="" className="-mt-px block w-full" />
                {promoBanners}
              </div>
            );
          }
          return (
            <div key={s.id} className={`px-3.5 py-3.5 first:border-t-0 ${afterRed ? "" : "border-t border-black/10"}`}>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#1d2129]">{sectionIcon(s.icon, false)}{title}</h3>
                {seeAllCat && <button onClick={() => setCat(seeAllCat)} className="text-[12px] font-bold text-[#D10005]">{L.seeAll} →</button>}
              </div>
              <div className="flex flex-col gap-3">{s.items.map(full)}</div>
            </div>
          );
        })}
      </div>
    );
  } else {
    const items = transform(lobbyItemsForCat(cat));
    const recTitle = (t as unknown as Record<string, string>).secRecommended;
    const featured = items.slice(0, 2);
    const rest = items.slice(2);
    body = items.length === 0
      ? <div className="px-6 py-16 text-center text-[13px] font-semibold text-[#8a9099]">{L.empty}</div>
      : (
        <div>
          {/* Top 2 oripas are recommended for the category: red section + dividers */}
          <img src="/home-divider-top.png" alt="" className="-mb-px block w-full" />
          <section className="bg-[#D10005] px-3.5 pb-6 pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-white">{sectionIcon("star", true)}{recTitle}</h3>
            <div className="flex flex-col gap-3">{featured.map(full)}</div>
          </section>
          <img src="/home-divider-bottom.png" alt="" className="-mt-px block w-full" />
          {promoBanners}
          {rest.length > 0 && <div className="flex flex-col gap-3 px-3.5 py-3">{rest.map(full)}</div>}
        </div>
      );
  }

  return (
    <div ref={rootRef} className="bg-[#eef0f3]">
      {/* Sticky lobby nav: the category bar stays pinned; the search bar
          collapses on scroll-down and expands again on scroll-up. */}
      <div ref={searchBoxRef} className="sticky top-0 z-30 bg-white">
      {/* Category bar — icon over label; ALL is a black D-tab pinned to the
          left edge, the active category is red with an underline. */}
      <div className="no-scrollbar flex items-stretch overflow-x-auto border-b border-black/10 bg-white">
        {catList.map((c) => {
          const on = cat === c.key;
          if (c.key === "all") {
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                aria-pressed={on}
                className="sticky left-0 z-[3] flex shrink-0 items-stretch bg-white pr-2.5"
              >
                <span className="flex flex-col items-center justify-center gap-1 rounded-r-[28px] bg-[#141414] px-4 py-2 text-white shadow-[3px_0_12px_rgba(0,0,0,0.18)]">
                  {catIcon("all", "#fff")}
                  <span className="text-[11px] font-medium uppercase tracking-wide">{c.label}</span>
                </span>
              </button>
            );
          }
          const color = on ? "#D10005" : "#1d2129";
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className="relative flex shrink-0 flex-col items-center justify-center gap-1 px-3 py-2.5"
            >
              {catIcon(c.key, color)}
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color }}>{c.label}</span>
              {on && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[#D10005]" />}
            </button>
          );
        })}
      </div>

      {/* Search bar — collapses to zero height when hidden so nothing peeks
          above the category bar; expands again on scroll-up. */}
      <div
        className="overflow-hidden bg-white transition-[max-height] duration-300 ease-out will-change-[max-height]"
        style={{ maxHeight: searchHidden ? 0 : 80 }}
      >
        {/* Inner bar slides as a rigid unit (synced with the wrapper clip) so it
            never appears squished/half-rendered while revealing. */}
        <div
          className="border-b border-black/10 bg-white px-3 py-2.5 transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: searchHidden ? "translateY(-100%)" : "translateY(0)" }}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1d2129]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5l-4-4" /></svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => { if (!hasQuery) setSearchActive(true); }}
              onClick={() => { if (!hasQuery) setSearchActive(true); }}
              onChange={(e) => { const v = e.target.value; onQueryChange(v); setSearchActive(v.trim().length === 0); }}
              placeholder={L.searchPlaceholder}
              className={`w-full rounded-[10px] border-[1.5px] border-[#D10005] bg-white py-3 pl-12 text-[15px] font-medium text-[#1d2129] outline-none placeholder:text-[#9aa0a8] ${hasQuery ? "pr-11" : "pr-3"}`}
            />
            {hasQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { onQueryChange(""); setSearchActive(false); inputRef.current?.blur(); }}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#e5e7eb] text-[#4b5058] active:scale-90"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applied-filters bar — shows which filters are active as removable chips
          plus a Clear all action. Hidden while the filter dropdown is open. */}
      {!searchActive && filterCount > 0 && (
        <div className="flex items-center gap-2 border-b border-black/10 bg-white px-3 py-2">
          <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
            {activeFilterKeys.map((k) => (
              <button
                key={k}
                onClick={() => onToggle(k)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-[#D10005] bg-[#D10005]/[0.08] px-2.5 py-1 text-[12px] font-semibold text-[#D10005] active:scale-95"
              >
                {filterLabel(k)}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            ))}
          </div>
          <button onClick={onClearFilters} className="shrink-0 whitespace-nowrap text-[12px] font-extrabold text-[#D10005] underline underline-offset-2 active:opacity-70">{L.clearAll}</button>
        </div>
      )}

      {/* Filter dropdown — overlays the feed just below the nav; focusing the
          search opens it, an outside click or a scroll closes it. */}
      {searchActive && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-black/10 bg-white shadow-[0_16px_30px_rgba(0,0,0,0.18)]" style={{ animation: "lobbyDropIn .18s ease-out both" }}>
          <style>{`@keyframes lobbyDropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>
          <div className="no-scrollbar max-h-[56vh] overflow-y-auto px-4 py-4">
            <div className="flex flex-wrap gap-2.5">{L.filterTags.map(tagPill)}</div>
            <h4 className="mb-2.5 mt-5 text-[15px] font-extrabold text-[#1d2129]">{L.pokemonHeading}</h4>
            <div className="flex flex-wrap gap-2.5">{L.pokemonTags.map(tagPill)}</div>
          </div>
          <div className="flex gap-3 border-t border-black/10 bg-white px-4 py-3">
            <button onClick={() => { onReset(); setSearchActive(false); inputRef.current?.blur(); }} className="flex-1 rounded-[10px] border-[1.6px] border-[#1d2129] bg-white py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{L.reset}</button>
            <button onClick={() => setSearchActive(false)} className="flex-1 rounded-[10px] bg-[#D10005] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{L.filter}</button>
          </div>
        </div>
      )}
      </div>

      {body}
    </div>
  );
}

function OripaHome({ lang, coins, onHome, onOpenStore, onOpenDraw }: { lang: Lang; coins: number; onHome: () => void; onOpenStore?: () => void; onOpenDraw?: (item: OripaItem) => void }) {
  const t = STR[lang];
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const toggleFilter = (k: string) => setFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearFilters = () => { setFilters({}); setQuery(""); };
  const clearAllFilters = () => setFilters({});
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <HomeHero lang={lang} />

        <LobbyNavFeed t={t} lang={lang} filters={filters} query={query} onToggle={toggleFilter} onQueryChange={setQuery} onReset={clearFilters} onClearFilters={clearAllFilters} onOpenDraw={onOpenDraw} />

        <SiteFooter t={t} />
      </div>
    </div>
  );
}

/* ── Draw screen (gacha pack detail) ─────────────────────────────────────
   Opened from the lobby when a pack's Draw / View is tapped. Shows the pack
   banner, remaining/period, and the prize line-up by tier (1st = UR / holo,
   2nd = SR / gold, 3rd = N / silver), with a sticky draw CTA. */
const DRAW_PRICE = 1000; // coins per single draw (mirrors the lobby card price)
const MAX_CUSTOM_DRAW = 100; // cap for the custom-draw quantity stepper

// Beveled tier plate ("1等 / 2등 / 3등") — gold for 1st/2nd, silver for 3rd,
// matching the design's metallic name-plates on the dark prize board.
function DrawTierLabel({ label, variant }: { label: string; variant: "gold" | "silver" }) {
  const bg = variant === "gold"
    ? "linear-gradient(180deg,#fff2b0 0%,#ffd45a 42%,#e0952a 72%,#a9640c 100%)"
    : "linear-gradient(180deg,#ffffff 0%,#e3e9f1 42%,#c1cad7 72%,#8f9aa8 100%)";
  const color = variant === "gold" ? "#5a3a00" : "#333c48";
  return (
    <div className="my-4 flex justify-center">
      <span
        className="inline-flex min-w-[92px] items-center justify-center rounded-md px-7 py-1.5 text-[16px] font-black tracking-[0.12em]"
        style={{
          background: bg,
          color,
          border: "1.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -2px 4px rgba(0,0,0,0.18)",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function DrawTierCard({ rarity, lang, large = false }: { rarity: Rarity; lang: Lang; large?: boolean }) {
  const meta = RARITY_META[rarity];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <PrizeArt rarity={rarity} size={large ? 138 : 92} />
      <div className="flex items-center gap-1 rounded-full bg-[#FFF6E3] px-2.5 py-0.5 ring-1 ring-[#f0d9a8]">
        <CoinIcon size={large ? 15 : 12} />
        <span className={`font-extrabold text-[#B5740A] ${large ? "text-[13px]" : "text-[11px]"}`}>{meta.coin.toLocaleString()}</span>
      </div>
    </div>
  );
}

// Gold 3D "アド確定 / Advantage guaranteed" headline treatment.
const drawGoldText: React.CSSProperties = {
  color: "#ffe27a",
  WebkitTextStroke: "1.4px #5f2c00",
  textShadow: "0 2px 0 #7a3b00, 0 3px 6px rgba(0,0,0,0.55)",
};

// Reusable promotional banner (fiery burst, gold headline, mascot, countdown).
// Shared by the draw detail screen and the draw-confirmation popup.
function DrawPromoBanner({ t, item, className = "", showCountdown = true }: { t: (typeof STR)[Lang]; item: OripaItem; className?: string; showCountdown?: boolean }) {
  return (
    <div
      className={`relative h-[190px] overflow-hidden ${className}`}
      style={{ background: "radial-gradient(circle at 40% 34%, #ffe07a 0%, #ff9e2b 26%, #ec5a10 52%, #a5210a 78%, #5c0f04 100%)" }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "repeating-conic-gradient(from 0deg at 42% 40%, rgba(255,255,255,0.55) 0deg 2deg, transparent 2deg 11deg)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(90,15,4,0.35) 0%, transparent 40%, transparent 62%, rgba(90,15,4,0.25) 100%)" }} />
      <img src="/hero/hero.png" alt="" draggable={false} className="pointer-events-none absolute -bottom-2 right-[-6%] h-[104%] w-auto object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" style={{ WebkitUserDrag: "none" } as React.CSSProperties} />
      <div className="relative z-10 flex h-full flex-col justify-center px-3.5 py-3">
        <span className="mb-1 inline-flex w-fit items-center rounded-[4px] bg-[#e0102a] px-2 py-0.5 text-[10px] font-black tracking-wide text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-white/40">
          {t.drawNewOnly}
        </span>
        <h1 className="text-[30px] font-black leading-[0.95]" style={drawGoldText}>{t.drawGuaranteed}</h1>
        <p className="mt-1 text-[15px] font-black leading-tight" style={drawGoldText}>{t.drawPackSubtitle}</p>
        <p className="mt-1.5 w-fit rounded bg-black/35 px-1.5 py-0.5 text-[10.5px] font-bold text-white ring-1 ring-white/15">{t.drawBannerTagline}</p>
      </div>
      {showCountdown && (
        <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#d10005] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] ring-1 ring-white/30">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
          {t.minUnit(item.endsIn)}
        </span>
      )}
    </div>
  );
}

function DrawDetail({ lang, item, coins, onBack, onHome, onOpenStore, freeShipAvailable = true, onResultsChange }: { lang: Lang; item: OripaItem; coins: number; onBack: () => void; onHome: () => void; onOpenStore?: () => void; freeShipAvailable?: boolean; onResultsChange?: (open: boolean) => void }) {
  const t = STR[lang];
  const pct = Math.round((item.remaining / item.total) * 100);
  const soldOut = item.remaining <= 0;
  const [toast, setToast] = useState<string | null>(null);
  const [cautionOpen, setCautionOpen] = useState(false);
  // Draw-confirmation popup: holds the requested draw count while open.
  const [confirmCount, setConfirmCount] = useState<number | null>(null);
  // Custom-draw popup: quantity stepper (min 1, up to MAX_CUSTOM_DRAW).
  const [customOpen, setCustomOpen] = useState(false);
  const [customQty, setCustomQty] = useState(1);
  // Draw results (list mode) — shown full-screen after a draw is confirmed.
  const [results, setResults] = useState<WonPrize[] | null>(null);
  const [resultsRun, setResultsRun] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  // Surface whether the draw-results overlay is open so the harness can show
  // the Free-shipping toggle only on the results screen (not draw selection).
  useEffect(() => { onResultsChange?.(results !== null); }, [results, onResultsChange]);
  useEffect(() => () => { onResultsChange?.(false); }, [onResultsChange]);

  function draw(count: number) {
    if (soldOut) return;
    if (coins < DRAW_PRICE * count) { pushToast(t.drawInsufficient); return; }
    // Open the confirmation popup; the actual draw is triggered from there.
    setConfirmCount(count);
  }

  // Roll `count` cards and show the results (list mode) screen.
  function runDraw(count: number) {
    setConfirmCount(null);
    setCustomOpen(false);
    setResults(generateDraw(count));
    setResultsRun((r) => r + 1);
  }

  function confirmDraw() {
    const count = confirmCount;
    if (count == null) return;
    runDraw(count);
  }

  function openCustom() {
    if (soldOut) return;
    setCustomQty(1);
    setCustomOpen(true);
  }
  const setQty = (n: number) => setCustomQty(() => Math.min(MAX_CUSTOM_DRAW, Math.max(1, n)));

  function confirmCustomDraw() {
    if (coins < DRAW_PRICE * customQty) { pushToast(t.drawInsufficient); return; }
    runDraw(customQty);
  }

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Title row */}
      <div className="shrink-0 flex items-center gap-2 border-b border-black/10 bg-white px-3 py-2.5">
        <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h2 className="truncate text-[17px] font-bold text-[#1d2129]">{locTitle(item, lang)}</h2>
      </div>

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#eef0f3]">
        {/* ── Promotional banner ─────────────────────────────────────────
            Fiery radial burst + ray sweep, gold 3D headline, "new-only"
            ribbon, tagline, mascot and a countdown chip. */}
        <div className="px-3 pt-3">
          <DrawPromoBanner t={t} item={item} className="rounded-2xl ring-1 ring-[#ffcf5a]/40" />
          {/* sales period */}
          <p className="mt-2 text-center text-[11.5px] font-semibold text-[#8a9099]">{t.periodLabel("2026/01/01")}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-1 pt-1">
          <TagPill variant="redOutline">{t.tagPopular}</TagPill>
          <TagPill variant="redFill">{t.tagPokemon}</TagPill>
          <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
          <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
        </div>

        {/* Cost + remaining */}
        <div className="mx-3 mt-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CoinIcon size={20} />
              <span className="text-[16px] font-extrabold text-[#1d2129] underline decoration-[#D10005] decoration-2 underline-offset-2">{DRAW_PRICE.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-[#8a9099]">{t.perDraw}</span>
            </span>
            {item.gem && (
              <span className="flex items-center gap-1.5">
                <GemIcon size={20} />
                <span className="text-[16px] font-extrabold text-[#1d2129] underline decoration-[#D10005] decoration-2 underline-offset-2">{DRAW_PRICE.toLocaleString()}</span>
                <span className="text-[11px] font-bold text-[#8a9099]">{t.perDraw}</span>
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-[#1d2129]">{t.remainingLabel}</span>
            <span className="leading-none"><span className="text-[20px] font-extrabold text-[#1d2129]">{item.remaining}</span><span className="text-[12px] font-bold text-[#8a9099]">/{item.total}</span></span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#D10005]" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 flex items-center justify-between text-[#D10005]">
            <span className="text-[12px] font-bold">{t.remainingTimeLabel}</span>
            <span className="text-[14px] font-extrabold">{t.minUnit(item.endsIn)}</span>
          </p>
        </div>

        {/* Caution — collapsible accordion */}
        <div className="mx-3 mt-3 overflow-hidden rounded-xl border border-[#f0d68a] bg-[#fffae8]">
          <button
            onClick={() => setCautionOpen((v) => !v)}
            aria-expanded={cautionOpen}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 3l10 18H2z" fill="#e0a52a" /><path d="M12 9v5M12 17.5v.5" stroke="#5a3d00" strokeWidth="2" strokeLinecap="round" /></svg>
            <span className="flex-1 text-[12.5px] font-bold text-[#8a6d16]">{t.drawCautionTitle}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`shrink-0 text-[#8a6d16] transition-transform ${cautionOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {cautionOpen && (
            <p className="border-t border-[#f0d68a] px-3 py-2.5 text-[11px] leading-relaxed text-[#8a6d16]">{t.drawCaution}</p>
          )}
        </div>

        {/* Prize line-up */}
        <div className="px-3 pb-5">
          <DrawTierLabel label={t.drawTier1} variant="gold" />
          <div className="grid grid-cols-2 gap-3">
            <DrawTierCard rarity="UR" lang={lang} large />
            <DrawTierCard rarity="UR" lang={lang} large />
          </div>

          <DrawTierLabel label={t.drawTier2} variant="gold" />
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => <DrawTierCard key={`sr${i}`} rarity="SR" lang={lang} />)}
          </div>

          <DrawTierLabel label={t.drawTier3} variant="silver" />
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => <DrawTierCard key={`n${i}`} rarity="N" lang={lang} />)}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>

      {/* Sticky draw CTA — pinned just above the bottom navigation */}
      <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        {soldOut ? (
          <div className="rounded-xl bg-black/10 py-3 text-center text-[15px] font-extrabold text-[#8a9099]">{t.drawSoldOut}</div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => draw(1)} className="flex-1 rounded-[10px] border-2 border-[#D10005] bg-white py-3 text-[13px] font-extrabold text-[#1d2129] active:scale-[0.98]">
              {t.drawDraw1}
            </button>
            <button onClick={() => draw(10)} className="flex-1 rounded-[10px] bg-[#D10005] py-3 text-[13px] font-extrabold text-white active:scale-[0.98]">
              {t.drawDrawTen}
            </button>
            <button onClick={openCustom} className="flex-1 whitespace-nowrap rounded-[10px] bg-[#D10005] py-3 text-[13px] font-extrabold text-white active:scale-[0.98]">
              {t.drawDrawCustom}
            </button>
          </div>
        )}
      </div>

      {/* Draw-confirmation popup */}
      {confirmCount != null && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={() => setConfirmCount(null)}
          role="dialog"
          aria-modal="true"
        >
          <style>{`@keyframes drawConfirmIn{0%{opacity:0;transform:translateY(12px) scale(.94)}100%{opacity:1;transform:none}}`}</style>
          <div
            className="no-scrollbar flex max-h-full w-full max-w-[380px] flex-col overflow-y-auto rounded-2xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
            style={{ animation: "drawConfirmIn 260ms cubic-bezier(0.22,0.61,0.36,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <DrawPromoBanner t={t} item={item} className="rounded-t-2xl" showCountdown={false} />

            <div className="px-4 pb-4 pt-3.5">
              <h3 className="text-center text-[18px] font-bold text-[#1d2129]">{locTitle(item, lang)}</h3>
              <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#8a9099]">{t.drawConfirmDesc}</p>

              {/* Cost row */}
              <div className="mt-3.5 flex items-center justify-center gap-3 rounded-xl border border-black/10 bg-white py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <span className="flex items-center gap-1.5">
                  <CoinIcon size={26} />
                  <span className="text-[20px] font-extrabold text-[#1d2129]">{(DRAW_PRICE * confirmCount).toLocaleString()}</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 6l6 6-6 6" stroke="#9aa1ab" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="flex items-center gap-1.5">
                  <GemIcon size={26} />
                  <span className="text-[20px] font-extrabold text-[#D10005]">0</span>
                </span>
              </div>

              {/* Confirm CTA */}
              <button
                onClick={confirmDraw}
                className="mt-3 w-full rounded-[10px] bg-[#D10005] py-3.5 text-[15px] font-extrabold text-white active:scale-[0.98]"
              >
                {confirmCount === 1 ? t.drawDraw1 : t.drawDrawTen}
              </button>

              {/* Dashed divider */}
              <div className="my-3.5 border-t border-dashed border-black/20" />

              {/* Terms */}
              <p className="text-center text-[12px] font-semibold text-[#1d2129]">
                {t.drawConfirmTerms}{" "}
                <button onClick={() => pushToast(t.drawCustomTBC)} className="font-bold text-[#D10005] underline decoration-[#D10005] underline-offset-2">
                  {t.drawConfirmTermsLink}
                </button>
              </p>

              {/* Cancel */}
              <button
                onClick={() => setConfirmCount(null)}
                className="mt-3 w-full rounded-[10px] border border-black/15 bg-white py-3 text-[14px] font-bold text-[#3a3f47] active:scale-[0.98]"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom-draw popup — quantity stepper + quick-add + dynamic cost/CTA */}
      {customOpen && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={() => setCustomOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="no-scrollbar flex max-h-full w-full max-w-[380px] flex-col overflow-y-auto rounded-2xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
            style={{ animation: "drawConfirmIn 260ms cubic-bezier(0.22,0.61,0.36,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <DrawPromoBanner t={t} item={item} className="rounded-t-2xl" showCountdown={false} />

            <div className="px-4 pb-4 pt-3.5">
              <h3 className="text-center text-[18px] font-bold text-[#1d2129]">{locTitle(item, lang)}</h3>
              <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#8a9099]">{t.drawConfirmDesc}</p>

              {/* Quantity stepper */}
              <div className="mt-3.5 flex items-center justify-center gap-3">
                <button
                  onClick={() => setQty(customQty - 1)}
                  disabled={customQty <= 1}
                  aria-label="decrease"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9ced6] text-white active:scale-95 disabled:opacity-40"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
                </button>
                <div className="flex min-w-[150px] items-center justify-center rounded-2xl border border-black/10 bg-white px-6 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <span className="text-[38px] font-black leading-none text-[#1d2129]">{customQty}</span>
                </div>
                <button
                  onClick={() => setQty(customQty + 1)}
                  disabled={customQty >= MAX_CUSTOM_DRAW}
                  aria-label="increase"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D10005] text-white active:scale-95 disabled:opacity-40"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>

              {/* Quick-add */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button onClick={() => setQty(customQty + 5)} className="rounded-[8px] border border-black/25 px-4 py-2 text-[13px] font-bold text-[#1d2129] active:scale-95">{t.drawCustomAdd(5)}</button>
                <button onClick={() => setQty(customQty + 10)} className="rounded-[8px] border border-black/25 px-4 py-2 text-[13px] font-bold text-[#1d2129] active:scale-95">{t.drawCustomAdd(10)}</button>
                <button onClick={() => setQty(MAX_CUSTOM_DRAW)} className="rounded-[8px] border border-black/25 px-4 py-2 text-[13px] font-bold text-[#1d2129] active:scale-95">{t.drawCustomMax}</button>
              </div>

              {/* Cost row */}
              <div className="mt-3.5 flex items-center justify-center gap-3 rounded-xl border border-black/10 bg-white py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <span className="flex items-center gap-1.5">
                  <CoinIcon size={26} />
                  <span className="text-[20px] font-extrabold text-[#1d2129]">{(DRAW_PRICE * customQty).toLocaleString()}</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 6l6 6-6 6" stroke="#9aa1ab" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="flex items-center gap-1.5">
                  <GemIcon size={26} />
                  <span className="text-[20px] font-extrabold text-[#D10005]">0</span>
                </span>
              </div>

              {/* Confirm CTA */}
              <button
                onClick={confirmCustomDraw}
                className="mt-3 w-full rounded-[10px] bg-[#D10005] py-3.5 text-[15px] font-extrabold text-white active:scale-[0.98]"
              >
                {t.drawCustomCta(customQty)}
              </button>

              {/* Dashed divider */}
              <div className="my-3.5 border-t border-dashed border-black/20" />

              {/* Terms */}
              <p className="text-center text-[12px] font-semibold text-[#1d2129]">
                {t.drawConfirmTerms}{" "}
                <button onClick={() => pushToast(t.drawCustomTBC)} className="font-bold text-[#D10005] underline decoration-[#D10005] underline-offset-2">
                  {t.drawConfirmTermsLink}
                </button>
              </p>

              {/* Cancel */}
              <button
                onClick={() => setCustomOpen(false)}
                className="mt-3 w-full rounded-[10px] border border-black/15 bg-white py-3 text-[14px] font-bold text-[#3a3f47] active:scale-[0.98]"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[70] flex justify-center px-4">
          <div className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">{toast}</div>
        </div>
      )}

      {/* Draw results (list mode) — full-screen overlay above the draw screen */}
      {results && (
        <DrawResults
          key={resultsRun}
          lang={lang}
          coins={coins}
          cards={results}
          onDrawAgain={() => setResults(null)}
          onClose={() => setResults(null)}
          onHome={onHome}
          onOpenStore={onOpenStore}
          freeShipAvailable={freeShipAvailable}
        />
      )}
    </div>
  );
}

// Gacha results — "list mode". Shown after any draw (×1 / ×10 / custom). Lets
// the player review the cards they pulled, filter by tier, sort, select, and
// exchange to coins or request shipping. Self-contained (local selection).
function DrawResults({ lang, coins, cards, onDrawAgain, onClose, onHome, onOpenStore, freeShipAvailable = true }: { lang: Lang; coins: number; cards: WonPrize[]; onDrawAgain: () => void; onClose: () => void; onHome: () => void; onOpenStore?: () => void; freeShipAvailable?: boolean }) {
  const t = STR[lang];
  const [list, setList] = useState<WonPrize[]>(cards);
  const [tier, setTier] = useState<"all" | Rarity>("all");
  const [sortKey, setSortKey] = useState<SortKey>("coinDesc");
  const [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "coinDesc": return b.coinValue - a.coinValue;
        case "coinAsc": return a.coinValue - b.coinValue;
        case "wonNew": return b.wonAt - a.wonAt;
        case "wonOld": return a.wonAt - b.wonAt;
        case "expSoon": return expiresAt(a.wonAt) - expiresAt(b.wonAt);
      }
    });
    return arr;
  }, [list, sortKey]);

  const displayed = tier === "all" ? sorted : sorted.filter((p) => p.rarity === tier);
  const tierTabs: { key: "all" | Rarity; label: string }[] = [
    { key: "all", label: t.deckAll },
    { key: "UR", label: t.drawTier1 },
    { key: "SR", label: t.drawTier2 },
    { key: "N", label: t.drawTier3 },
  ];
  const tierCount = (key: "all" | Rarity) => (key === "all" ? list.length : list.filter((p) => p.rarity === key).length);

  const selectedPrizes = list.filter((p) => selected.has(p.id));
  const total = selectedPrizes.reduce((s, p) => s + p.coinValue, 0);
  const canShip = total >= SHIP_MIN_COINS;
  const shortfall = Math.max(0, SHIP_MIN_COINS - total);

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function selectAll() { setSelected(new Set(displayed.map((p) => p.id))); }
  function reset() { setSelected(new Set()); }
  function exchange() {
    if (selected.size === 0) return;
    const ids = new Set(selected);
    const n = ids.size;
    setList((l) => l.filter((p) => !ids.has(p.id)));
    setSelected(new Set());
    pushToast(t.toastConverted(n, total));
  }
  function ship() {
    if (selected.size === 0) return;
    if (!canShip) { pushToast(t.toastShort(shortfall)); return; }
    const ids = new Set(selected);
    setList((l) => l.filter((p) => !ids.has(p.id)));
    setSelected(new Set());
    pushToast(t.toastShipReq);
  }

  return (
    <div className="absolute inset-0 z-50 flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Top actions: Draw again + Swipe to reveal */}
      <div className="shrink-0 flex gap-3 bg-white px-3 py-3">
        <button onClick={onDrawAgain} className="flex-1 rounded-xl bg-[#D10005] py-3 text-[14px] font-extrabold text-white active:scale-[0.99]">
          {t.drawAgain}
        </button>
        <button onClick={() => pushToast(t.drawSwipeTBC)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-black/15 bg-white py-3 text-[14px] font-extrabold text-[#1d2129] active:scale-[0.99]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8l4-4 4 4M8 4v10M20 16l-4 4-4-4M16 20V10" /></svg>
          {t.drawSwipeReveal}
        </button>
      </div>

      {/* Tier tabs with counts */}
      <div className="no-scrollbar shrink-0 flex items-center gap-2 overflow-x-auto border-b border-black/10 bg-white px-3 py-2">
        {tierTabs.map((tb) => {
          const on = tier === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => { setTier(tb.key); setSelected(new Set()); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${on ? "bg-[#D10005] text-white" : "text-[#5c626b]"}`}
            >
              {tb.label}
              <span className={`text-[12px] font-extrabold ${on ? "text-white" : "text-[#9aa0a8]"}`}>{tierCount(tb.key)}</span>
            </button>
          );
        })}
      </div>

      {/* Sort row */}
      <div className="relative shrink-0 flex justify-end border-b border-black/10 bg-white px-3 py-2.5">
        <button onClick={() => setSortOpen((v) => !v)} className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#1d2129] active:opacity-70">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
          {t.sortLabels[sortKey]}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={sortOpen ? "rotate-180" : ""}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {sortOpen && (
          <div className="absolute right-3 top-full z-20 mt-1 w-[220px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_30px_rgba(0,0,0,0.18)]">
            {SORT_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => { setSortKey(key); setSortOpen(false); }}
                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-semibold ${key === sortKey ? "bg-[#D10005]/[0.06] text-[#D10005]" : "text-[#1d2129]"}`}
              >
                {t.sortLabels[key]}
                {key === sortKey && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3" onClick={() => sortOpen && setSortOpen(false)}>
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 text-[32px]">🔍</div>
            <p className="text-[13px] font-semibold text-[#8a9099]">{t.searchNoResults}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition"
                  style={{ border: isSel ? "2.5px solid #FF7A1A" : "1.5px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
                >
                  <div className="shrink-0"><PrizeArt rarity={p.rarity} size={104} /></div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <img src={`/prize-tag-${rarityTier(p.rarity)}.png`} alt={t.prizeTier(rarityTier(p.rarity))} className="h-[24px] w-auto shrink-0 object-contain" draggable={false} />
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: isSel ? "#FF7A1A" : "#8a9099" }}>
                        {isSel ? t.itemsSelected : t.itemsNotSelected}
                        <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={isSel ? "#FF7A1A" : "#c9ced6"} /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[14px] font-bold leading-tight text-[#1d2129]">{locName(p, lang)}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] font-normal leading-relaxed text-[#8a9099]">{locDesc(p, lang)}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#8a9099]">{t.itemsExchangePeriod}{fmtDate(expiresAt(p.wonAt))}</p>
                    <div className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white pt-2 pb-2" style={{ marginTop: 8 }}>
                      <CoinIcon size={18} />
                      <span className="text-[18px] font-bold text-[#1d2129]">{p.coinValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CoinIcon size={20} />
            <span className="text-[18px] font-extrabold text-[#1d2129]">{total.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-4 text-[13px] font-bold">
            <button onClick={selectAll} className="text-[#1d2129] active:opacity-70">{t.selectAll}</button>
            <button onClick={reset} className="text-[#8a9099] active:opacity-70">{t.itemsReset}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Request Shipping on the left (matches My Loot placement). */}
          <div className="relative">
            <style>{`@keyframes freeShipIn{from{opacity:0;transform:translateY(-6px) scale(.9)}to{opacity:1;transform:none}}@keyframes freeShipPulse{0%,100%{box-shadow:0 3px 8px rgba(18,129,60,0.45)}50%{box-shadow:0 3px 14px rgba(18,129,60,0.75)}}`}</style>
            {canShip && (freeShipAvailable ? (
              <div
                className="pointer-events-none absolute -top-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-br from-[#1eae52] to-[#12813c] px-2 py-[3px] text-white ring-1 ring-white/30"
                style={{ animation: "freeShipIn .3s cubic-bezier(.2,.9,.3,1) both, freeShipPulse 2.4s ease-in-out infinite" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M7.5 12.5l3 3 6-6.5" stroke="#12813c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-[9.5px] font-extrabold tracking-wide">{t.freeShippingQuota(FREE_SHIP_QUOTA)}</span>
              </div>
            ) : (
              <div
                className="pointer-events-none absolute -top-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-br from-[#ffcf33] to-[#f5a623] px-2 py-[3px] text-[#3a2a00] ring-1 ring-black/10"
                style={{ animation: "freeShipIn .3s cubic-bezier(.2,.9,.3,1) both" }}
              >
                <span className="text-[9.5px] font-extrabold tracking-wide">{t.paidShipBadge}</span>
              </div>
            ))}
            <button
              onClick={ship}
              disabled={selected.size === 0}
              className="w-full rounded-xl py-3 text-[14px] font-extrabold text-white active:scale-[0.98] disabled:opacity-40"
              style={{ background: "#f5670a" }}
            >
              {t.requestShipping}
            </button>
          </div>
          {/* Exchange on the right. */}
          <button
            onClick={exchange}
            disabled={selected.size === 0}
            className="rounded-xl border-2 border-[#D10005] bg-white py-3 text-[14px] font-extrabold text-[#D10005] active:scale-[0.98] disabled:opacity-40"
          >
            {t.exchange}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10.5px] leading-tight text-[#8a9099]">{freeShipAvailable ? t.shipSelectHint : t.shipSelectHintPaid}</p>
      </div>

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-[70] flex justify-center px-4">
          <div className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  );
}


// Bottom-nav icons are provided as black PNG glyphs. We render them via CSS
// mask so the active/inactive color still tints the icon shape.
function maskIcon(src: string, color: string) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 24,
        height: 24,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function navIcon(key: Screen, color: string) {
  switch (key) {
    case "oripa":
      return maskIcon("/nav-oripa.png", color);
    case "prizeHistory":
      return maskIcon("/nav-prizehistory.png", color);
    case "quest":
      return maskIcon("/nav-quest.png", color);
    case "store":
      return maskIcon("/nav-store.png", color);
    default:
      return maskIcon("/nav-mypage.png", color);
  }
}

// PROD bottom nav. Only the Oripa (lobby) and My Account tabs navigate; the
// My Loot / Quests / Store tabs are shown but inert (except My Loot which
// navigates). My Account and its sub-screens (Prize History, Purchase History,
// Shipping Address) all highlight the My Account tab.
function BottomNav({ screen, t, onNavigate }: { screen: Screen; t: Dict; onNavigate?: (s: Screen) => void }) {
  // Order per design: Oripa, My Loot, Quests, Store, My Page.
  const items: { key: Screen; label: string }[] = [
    { key: "oripa", label: t.navOripa },
    { key: "prizeHistory", label: t.navPrizeHistory },
    { key: "quest", label: t.navQuest },
    { key: "store", label: t.navStore },
    { key: "mypage", label: t.navMyPage },
  ];
  const activeKey: Screen =
    screen === "myLoot"
      ? "prizeHistory"
      : screen === "prizeHistory" || screen === "purchaseHistory" || screen === "shippingAddress" || screen === "profile"
      ? "mypage"
      : screen;
  return (
    <nav className="shrink-0 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((it) => {
          const active = activeKey === it.key;
          const color = active ? "#D10005" : "#1d2129";
          const navigable = it.key === "oripa" || it.key === "mypage" || it.key === "prizeHistory" || it.key === "store";
          return (
            <button
              key={it.key}
              type="button"
              onClick={navigable ? () => onNavigate?.(it.key) : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2"
            >
              {navIcon(it.key, color)}
              <span className="text-[10px] font-bold" style={{ color }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── LandingPage ──────────────────────────────────────────────────────── */
// Logged-out lobby (V1 homepage): auth header + search + banner placeholder +
// category-filtered card sections. Card taps prompt sign-up.
function LandingPage({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const toggleFilter = (k: string) => setFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearFilters = () => { setFilters({}); setQuery(""); };
  const clearAllFilters = () => setFilters({});
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={onLogin} />

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 pb-4 pt-3"><PromoCarousel /></div>

        <LobbyNavFeed t={t} lang={lang} filters={filters} query={query} onToggle={toggleFilter} onQueryChange={setQuery} onReset={clearFilters} onClearFilters={clearAllFilters} onView={onSignUp} />

        <SiteFooter t={t} />
      </div>
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
                    <span className={`text-[14px] font-medium ${active ? "text-[#D10005]" : "text-[#1d2129]"}`}>{tb.label}</span>
                    {tb.count > 0 && (
                      <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#D10005] px-1 text-[10px] font-extrabold leading-none text-white">{tb.count}</span>
                    )}
                  </span>
                  {active && <span className="absolute inset-x-5 -bottom-px h-[3px] rounded-full bg-[#D10005]" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-bold text-[#1d2129]">{title}</h2>
        </div>
      </header>

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#eef0f3]">
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
                  {un && <span className="absolute inset-y-0 left-0 w-1 bg-[#D10005]" />}
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#9aa0a8]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {lang === "ja" ? it.atJa : it.at}
                    {un && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-[#D10005] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />{t.notifNew}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-[14px] font-bold leading-snug ${un ? "text-[#1d2129]" : "text-[#41464e]"}`}>{lang === "ja" ? it.titleJa : it.title}</p>
                  <p className={`mt-0.5 text-[10px] font-normal leading-relaxed ${un ? "text-[#6b7078]" : "text-[#8a9099]"}`}>{lang === "ja" ? it.bodyJa : it.body}</p>
                  {it.tracking && <p className="mt-0.5 text-[10px] font-normal text-[#8a9099]">{lang === "ja" ? "追跡番号：" : "Tracking number: "}{it.tracking}</p>}
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

/* ══════════════════════════════════════════════════════════════════════
   Prize History + Shipping Address + My Account
   Ported from the POC. These screens share the atoms above (CoinIcon,
   GemIcon, BrandLogo, BalancePill, AppHeader, SiteFooter, LOBBY_NAV_STR).
   ══════════════════════════════════════════════════════════════════════ */

/* ── date / locale helpers ───────────────────────────────────────────── */
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function expiresAt(wonAt: number) {
  return wonAt + SHIP_WINDOW_DAYS * DAY;
}
function locName(p: { name: string; nameJa: string }, lang: Lang) {
  return lang === "ja" ? p.nameJa : p.name;
}
function locDesc(p: { desc: string; descJa: string }, lang: Lang) {
  return lang === "ja" ? p.descJa : p.desc;
}
function rarityTier(r: Rarity): number {
  return r === "UR" ? 1 : r === "SR" ? 2 : 3;
}

/* ── small UI atoms ──────────────────────────────────────────────────── */
function CoinChip({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
      style={{
        background: strong ? "#FFF1CF" : "#FFF6E3",
        color: "#B5740A",
        fontSize: strong ? 14 : 12,
      }}
    >
      <CoinIcon size={strong ? 16 : 14} />
      {value.toLocaleString()}
    </span>
  );
}

function PrizeArt({ rarity, size = 76 }: { rarity: Rarity; size?: number }) {
  return (
    <img
      src={RARITY_IMG[rarity]}
      alt={`${rarity} prize card`}
      draggable={false}
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: Math.round(size * 1.4), boxShadow: "0 1px 3px rgba(0,0,0,0.18)", WebkitUserDrag: "none", userSelect: "none" } as React.CSSProperties}
    />
  );
}

function GreenCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="mt-3 text-[15px] font-bold text-[#41464e]">{title}</p>
      <p className="mt-1 text-[12.5px] text-[#8a9099]">{subtitle}</p>
    </div>
  );
}

function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white px-4 pb-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#1d2129]">{title}</h3>
          <button onClick={onClose} className="text-[#8a9099]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── shipping form field atoms ───────────────────────────────────────── */
function Field({ label, value, onChange, onBlur, half = false, required = false, type = "text", placeholder, valid: validProp, error, onClear }: {
  label: string; value: string; onChange: (val: string) => void; onBlur?: () => void; half?: boolean; required?: boolean; type?: string; placeholder: string; valid?: boolean; error?: string; onClear?: () => void;
}) {
  const filled = validProp !== undefined ? validProp : value.trim().length > 0;
  const hasError = !!error;
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">
        {label}{required && <span className="ml-0.5 text-[#D10005]">*</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full rounded-lg border py-2.5 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none transition"
          style={{
            paddingLeft: "10px",
            paddingRight: filled || hasError ? "32px" : "10px",
            borderColor: hasError ? "#D10005" : filled ? "#d1d5db" : "#e5e8ec",
            background: hasError ? "rgba(230,0,18,0.04)" : "white",
          }}
        />
        {filled && !hasError && <span className="absolute right-2"><GreenCheck /></span>}
        {hasError && onClear && (
          <button onClick={onClear} className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#D10005" }}>
            <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
      {hasError && <p className="mt-1 text-[10px] text-[#D10005]">{error}</p>}
    </div>
  );
}

function PrefectureSelect({ value, onChange, label, lang }: { value: string; onChange: (val: string) => void; label: string; lang: Lang }) {
  const filled = value.trim().length > 0;
  const names = lang === "ja" ? PREFECTURES_JA : PREFECTURES_EN;
  const placeholder = lang === "ja" ? "都道府県" : "Prefecture";
  return (
    <div className="flex-1 min-w-0">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{label}<span className="ml-0.5 text-[#D10005]">*</span></label>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-2.5 pr-8 text-[13px] text-[#1d2129] outline-none"
        >
          <option value="">{placeholder}</option>
          {PREFECTURES_JA.map((ja, i) => <option key={ja} value={ja}>{names[i]}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 text-[#8a9099]">
          {filled ? <GreenCheck /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>}
        </span>
      </div>
    </div>
  );
}

function USStateSelect({ value, onChange, label }: { value: string; onChange: (val: string) => void; label: string }) {
  const filled = value.trim().length > 0;
  return (
    <div className="w-full">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{label}<span className="ml-0.5 text-[#D10005]">*</span></label>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-2.5 pr-8 text-[13px] text-[#1d2129] outline-none"
        >
          <option value="">Select State</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 text-[#8a9099]">
          {filled ? <GreenCheck /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>}
        </span>
      </div>
    </div>
  );
}

/* ── Prize History ───────────────────────────────────────────────────── */
type Toast = { id: number; text: string };

function PrizeHistory({ lang, coins, setCoins, shippingAddresses, onShippingAddressesChange, onBack, onHome, empty = false, onGoGacha, lootMode = false, onRequestKyc, freeShipAvailable = true }: { lang: Lang; coins: number; setCoins: Dispatch<SetStateAction<number>>; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onHome: () => void; empty?: boolean; onGoGacha?: () => void; lootMode?: boolean; onRequestKyc?: () => boolean; freeShipAvailable?: boolean }) {
  // "My Loot" reuses this screen but shows only the most valuable cards
  // (top UR tier) and hides the Won/Waiting/Shipped tabs.
  const screenTitle = lootMode ? STR[lang].mmItems : STR[lang].prizeHistory;
  // "Best cards" = only the top tier (UR).
  const bestOnly = <T extends { rarity: Rarity }>(arr: T[]) => (lootMode ? arr.filter((p) => p.rarity === "UR") : arr);
  const t = STR[lang];

  const [tab, setTab] = useState<PrizeTab>("won");
  const [won, setWon] = useState<WonPrize[]>(bestOnly(INITIAL_WON));
  const [waiting, setWaiting] = useState<WaitingPrize[]>(bestOnly(INITIAL_WAITING));
  const [shipped] = useState<ShippedPrize[]>(bestOnly(INITIAL_SHIPPED));

  const [sortKey, setSortKey] = useState<SortKey>("coinDesc");
  const [sortOpen, setSortOpen] = useState(false);

  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [listShipOpen, setListShipOpen] = useState(false);
  const [category, setCategory] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  // Scroll the tab content back to the top whenever the active tab changes.
  const tabScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabScrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  // Lazy loading for the won list: reveal a batch at a time as the user
  // scrolls near the bottom (no "Load more" button). Sized so both screens
  // load several more sets, giving a real "fetching history" feel.
  const WON_PAGE = lootMode ? 4 : 6;
  const [wonVisible, setWonVisible] = useState(WON_PAGE);
  const [wonLoading, setWonLoading] = useState(false);
  const wonBusy = useRef(false);
  useEffect(() => {
    setWonVisible(WON_PAGE);
    wonBusy.current = false;
    setWonLoading(false);
  }, [category, query, sortKey, tab, WON_PAGE]);

  function pushToast(text: string) {
    const id = (toastSeq.current += 1);
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);
  }

  const sortedWon = useMemo(() => {
    const arr = [...won];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "coinDesc": return b.coinValue - a.coinValue;
        case "coinAsc": return a.coinValue - b.coinValue;
        case "wonNew": return b.wonAt - a.wonAt;
        case "wonOld": return a.wonAt - b.wonAt;
        case "expSoon": return expiresAt(a.wonAt) - expiresAt(b.wonAt);
      }
    });
    return arr;
  }, [won, sortKey]);

  // List view: select cards, then exchange or ship.
  const listSelectedPrizes = won.filter((p) => listSelected.has(p.id));
  const listTotal = listSelectedPrizes.reduce((s, p) => s + p.coinValue, 0);
  const listCanShip = listTotal >= SHIP_MIN_COINS;
  const listShortfall = Math.max(0, SHIP_MIN_COINS - listTotal);

  function listToggle(id: string) {
    setListSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function listReset() { setListSelected(new Set()); }
  function listSelectAll() { setListSelected(new Set(displayedWon.map((p) => p.id))); }
  function listExchange() {
    if (listSelected.size === 0) return;
    const ids = new Set(listSelected);
    const n = ids.size;
    setCoins((c) => c + listTotal);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setListSelected(new Set());
    pushToast(t.toastConverted(n, listTotal));
  }
  function doListShip() {
    const ids = new Set(listSelected);
    const moving = won.filter((p) => ids.has(p.id));
    setWaiting((list) => [
      ...moving.map((p) => ({
        id: p.id,
        name: p.name,
        nameJa: p.nameJa,
        desc: p.desc,
        descJa: p.descJa,
        rarity: p.rarity,
        coinValue: p.coinValue,
        requestedAt: NOW,
      })),
      ...list,
    ]);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setListSelected(new Set());
    setListShipOpen(false);
    pushToast(t.toastShipReq);
  }

  // "Narrow down" scopes the list: a franchise category chip plus a free-text
  // search matched against name/desc.
  const q = query.trim().toLowerCase();
  const matchesQuery = (p: WonPrize) => {
    if (!q) return true;
    const hay = `${locName(p, lang)} ${locDesc(p, lang)}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  };
  const inScope = (p: WonPrize) => (category === "all" || p.category === category) && matchesQuery(p);
  const catWon = won.filter(inScope);
  const displayedWon = sortedWon.filter(inScope);
  const filterActive = category !== "all" || q.length > 0;
  function clearFilters() { setCategory("all"); setQuery(""); setListSelected(new Set()); }

  // Paged slice of the won list + scroll-driven "load more".
  const pagedWon = displayedWon.slice(0, wonVisible);
  const wonHasMore = wonVisible < displayedWon.length;
  function onWonScroll(e: React.UIEvent<HTMLDivElement>) {
    if (tab !== "won") return;
    const el = e.currentTarget;
    if (wonBusy.current || wonVisible >= displayedWon.length) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      wonBusy.current = true;
      setWonLoading(true);
      setTimeout(() => {
        setWonVisible((v) => Math.min(v + WON_PAGE, displayedWon.length));
        setWonLoading(false);
        wonBusy.current = false;
      }, 450);
    }
  }

  // Tier chips: "All" selects everything, a tier chip selects that rarity;
  // tapping the active chip again deselects. Scoped to the selected category.
  const tierIds = (key: "all" | Rarity) =>
    (key === "all" ? catWon : catWon.filter((p) => p.rarity === key)).map((p) => p.id);
  const isTierActive = (key: "all" | Rarity) => {
    const ids = tierIds(key);
    return ids.length > 0 && ids.length === listSelected.size && ids.every((id) => listSelected.has(id));
  };
  function selectTier(key: "all" | Rarity) {
    setListSelected(isTierActive(key) ? new Set() : new Set(tierIds(key)));
  }
  const tierChips: { key: "all" | Rarity; label: string }[] = [
    { key: "all", label: t.deckAll },
    { key: "UR", label: t.prizeTier(1) },
    { key: "SR", label: t.prizeTier(2) },
    { key: "N", label: t.prizeTier(3) },
  ];

  const counts = { won: won.length, waiting: waiting.length, shipped: shipped.length };

  // Shared "nothing won yet" view (ported from the POC prize-history screen):
  // mascot, message and a go-to-gacha CTA. Used both when the whole screen is
  // empty and when the won list becomes empty at runtime.
  const emptyContent = (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16">
      <img src="/refer-mascot.png" alt="" className="mb-5 h-44 w-44 object-contain" />
      <p className="text-center text-[14px] leading-relaxed text-[#9aa0a8]">{t.winEmptyTitle}</p>
      <p className="mt-1 max-w-[300px] text-center text-[14px] leading-relaxed text-[#9aa0a8]">{t.winEmptySub}</p>
      <button
        onClick={onGoGacha ?? onHome}
        className="mt-7 w-full max-w-[360px] rounded-xl bg-[#D10005] py-3.5 text-[15px] font-extrabold tracking-wide text-white shadow-[0_6px_18px_rgba(230,0,18,0.35)] active:scale-[0.99]"
      >
        {t.winEmptyCta}
      </button>
    </div>
  );

  if (empty) {
    return (
      <div className="flex h-full flex-col bg-[#eef0f3]">
        <header className="shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
            <BrandLogo onClick={onHome} />
            <BalancePill coins={coins} t={t} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <h2 className="text-[20px] font-bold text-[#1d2129]">{screenTitle}</h2>
          </div>
        </header>
        {emptyContent}
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-bold text-[#1d2129]">{screenTitle}</h2>
        </div>

        {/* Won/Waiting/Shipped tabs. Winning History is a pure audit of what the
            customer has won, so the tabs are hidden there; My Loot keeps them. */}
        {lootMode && (
        <div className="flex border-b border-black/10 bg-white px-2">
          {([
            { key: "won", label: t.tabWon },
            { key: "waiting", label: t.tabWaiting },
            { key: "shipped", label: t.tabShipped },
          ] as { key: PrizeTab; label: string }[]).map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="relative flex-1 pb-2.5 pt-1 text-center"
              >
                <span className={`text-[12px] font-bold ${active ? "text-[#D10005]" : "text-[#8a9099]"}`}>
                  {tb.label}
                </span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-[#D10005] text-white" : "bg-black/[0.07] text-[#8a9099]"}`}
                >
                  {counts[tb.key]}
                </span>
                {active && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-[#D10005]" />}
              </button>
            );
          })}
        </div>
        )}
      </header>

      <div ref={tabScrollRef} onScroll={onWonScroll} className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">

        {tab === "won" && (
          won.length === 0 ? (
            emptyContent
          ) : (
            <>
              <div className="sticky top-0 z-10 flex items-stretch border-b border-black/10 bg-white">
                <button onClick={() => setFilterOpen(true)} className="flex flex-1 items-center justify-center gap-2 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="7" cy="8" r="2" /><circle cx="16" cy="16" r="2" /><path d="M9 8h11M4 8h1M15 16h5M4 16h9" /></svg>
                  {LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"].narrowDown}
                  {filterActive && <span className="flex h-[8px] w-[8px] rounded-full bg-[#D10005]" />}
                </button>
                <span className="my-2 w-px bg-black/10" />
                <button onClick={() => setSortOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
                  {t.sortLabels[sortKey]}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
                </button>
              </div>

              <div className="px-3 py-3">
                {displayedWon.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-2 text-[32px]">🔍</div>
                    <p className="text-[13px] font-semibold text-[#8a9099]">{t.searchNoResults}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {pagedWon.map((p, i) => {
                    const isSel = listSelected.has(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={lootMode ? () => listToggle(p.id) : undefined}
                        className="animate-fade-slide flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition"
                        style={{ border: lootMode && isSel ? "2.5px solid #FF7A1A" : "1.5px solid rgba(0,0,0,0.08)", cursor: lootMode ? "pointer" : "default", animationDelay: `${(i % WON_PAGE) * 45}ms` }}
                      >
                        <div className="shrink-0"><PrizeArt rarity={p.rarity} size={104} /></div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <img src={`/prize-tag-${rarityTier(p.rarity)}.png`} alt={t.prizeTier(rarityTier(p.rarity))} className="h-[24px] w-auto shrink-0 object-contain" draggable={false} />
                            {lootMode && (
                              <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: isSel ? "#FF7A1A" : "#8a9099" }}>
                                {isSel ? t.itemsSelected : t.itemsNotSelected}
                                <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={isSel ? "#FF7A1A" : "#c9ced6"} /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-[14px] font-bold leading-tight text-[#1d2129]">{locName(p, lang)}</p>
                          <p className="mt-1 line-clamp-2 text-[10px] font-normal leading-relaxed text-[#8a9099]">{locDesc(p, lang)}</p>
                          <p className="mt-1 text-[11px] font-semibold text-[#8a9099]">{t.itemsDateWon}{fmtDate(p.wonAt)}</p>
                          <div className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white pt-2 pb-2" style={{ marginTop: 8 }}>
                            <CoinIcon size={18} />
                            <span className="text-[18px] font-bold text-[#1d2129]">{p.coinValue.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {wonHasMore ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-[12px] font-semibold text-[#8a9099]">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#D10005] border-t-transparent" />
                    {t.loadingMore}
                  </div>
                ) : (
                  <div className="-mx-3 mt-3"><SiteFooter t={t} /></div>
                )}
              </div>
            </>
          )
        )}
        {tab === "waiting" && <WaitingTab prizes={waiting} t={t} lang={lang} />}
        {tab === "shipped" && <ShippedTab prizes={shipped} onCopy={(c) => pushToast(t.toastCopied(c))} t={t} lang={lang} />}
      </div>

      {lootMode && tab === "won" && won.length > 0 && (
        <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <style>{`@keyframes mlBadgeIn{from{opacity:0;transform:translateY(-6px) scale(.9)}to{opacity:1;transform:translateY(0)}}@keyframes mlBadgePulse{0%,100%{box-shadow:0 3px 8px rgba(18,129,60,0.45)}50%{box-shadow:0 3px 14px rgba(18,129,60,0.75)}}`}</style>
          {/* Selection summary + bulk actions */}
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CoinIcon size={20} />
              <span className="text-[18px] font-extrabold text-[#1d2129]">{listTotal.toLocaleString()}</span>
            </span>
            <div className="flex items-center gap-4 text-[13px] font-bold">
              <button onClick={listSelectAll} className="text-[#1d2129] active:opacity-70">{t.selectAll}</button>
              <button onClick={listReset} className="text-[#8a9099] active:opacity-70">{t.itemsReset}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Request Shipping on the left (POC placement). */}
            <div className="relative">
              {/* Three states; badge spans the full CTA width like a ribbon:
                  - red "min coins" while the selection is short of the threshold
                  - green "free shipping" once eligible AND free quota remains
                  - amber "standard shipping fee" once eligible with no free quota */}
              {!listCanShip ? (
                <div className="pointer-events-none absolute -top-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#e30613] px-2.5 py-[3px] text-white shadow-[0_2px_6px_rgba(227,6,19,0.4)] ring-1 ring-white/30">
                  <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M12 7v6" stroke="#e30613" strokeWidth="2.6" strokeLinecap="round" /><circle cx="12" cy="16.6" r="1.35" fill="#e30613" /></svg>
                  <span className="text-[9.5px] font-extrabold tracking-wide">{t.minCoinsBadge}</span>
                </div>
              ) : freeShipAvailable ? (
                <div
                  className="pointer-events-none absolute -top-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-br from-[#1eae52] to-[#12813c] px-2.5 py-[3px] text-white ring-1 ring-white/30"
                  style={{ animation: "mlBadgeIn .3s cubic-bezier(.2,.9,.3,1) both, mlBadgePulse 2.4s ease-in-out infinite" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M7.5 12.5l3 3 6-6.5" stroke="#12813c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="text-[9.5px] font-extrabold tracking-wide">{t.freeShippingQuota(FREE_SHIP_QUOTA)}</span>
                </div>
              ) : (
                <div
                  className="pointer-events-none absolute -top-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-br from-[#ffcf33] to-[#f5a623] px-2.5 py-[3px] text-[#3a2a00] ring-1 ring-black/10"
                  style={{ animation: "mlBadgeIn .3s cubic-bezier(.2,.9,.3,1) both" }}
                >
                  <span className="text-[9.5px] font-extrabold tracking-wide">{t.paidShipBadge}</span>
                </div>
              )}
              <button
                onClick={() => {
                  if (listSelected.size === 0) { pushToast(t.toastSelectFirst); return; }
                  if (!listCanShip) { pushToast(t.toastShort(listShortfall)); return; }
                  if (onRequestKyc && !onRequestKyc()) return;
                  setListShipOpen(true);
                }}
                className="w-full rounded-xl py-3 text-[14px] font-extrabold text-white transition active:scale-[0.98]"
                style={{ background: listCanShip ? "#f5670a" : "#c9ced6" }}
              >
                {t.requestShipping}
              </button>
            </div>
            {/* Exchange on the right; guarded when nothing is selected. */}
            <button
              onClick={listExchange}
              className="rounded-xl border-2 py-3 text-[14px] font-extrabold transition active:scale-[0.98]"
              style={{ borderColor: "#f5670a", color: "#1d2129", background: "#fff" }}
            >
              {t.exchange}
            </button>
          </div>
          <p className="mt-2 text-center text-[10.5px] leading-tight text-[#8a9099]">{freeShipAvailable ? t.shipSelectHint : t.shipSelectHintPaid}</p>
        </div>
      )}

      {listShipOpen && (
        <ShippingFlow
          prizes={listSelectedPrizes}
          total={listTotal}
          onClose={() => setListShipOpen(false)}
          onConfirm={doListShip}
          t={t}
          lang={lang}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
        />
      )}

      {filterOpen && (() => {
        const LF = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
        const cats: ("all" | Category)[] = ["all", ...CATEGORIES.filter((c) => won.some((p) => p.category === c))];
        return (
          <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setFilterOpen(false)}>
            <div className="flex max-h-[90%] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()} style={{ animation: "lobbySheetUp .28s cubic-bezier(.2,.8,.2,1) both" }}>
              <style>{`@keyframes lobbySheetUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
              <div className="relative flex shrink-0 items-center justify-center border-b border-black/5 px-4 py-3.5">
                <h3 className="text-[16px] font-extrabold text-[#1d2129]">{LF.narrowDown}</h3>
                <button onClick={() => setFilterOpen(false)} aria-label="Close" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] active:bg-black/5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa0a8]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setListSelected(new Set()); }}
                    placeholder={LF.searchPlaceholder}
                    className="w-full rounded-xl bg-[#f4f5f7] py-3 pl-11 pr-10 text-[14px] font-semibold text-[#1d2129] outline-none placeholder:text-[#9aa0a8] focus:bg-white focus:ring-2 focus:ring-[#D10005]/30"
                  />
                  {query.length > 0 && (
                    <button
                      onClick={() => { setQuery(""); setListSelected(new Set()); }}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-[#5c626b] active:bg-black/20"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  )}
                </div>
                {lootMode && (
                <div className="mt-5">
                  <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{lang === "ja" ? "レアリティで選択" : "Select by tier"}</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {tierChips.map((c) => {
                      const n = tierIds(c.key).length;
                      const on = isTierActive(c.key);
                      return (
                        <button key={c.key} onClick={() => selectTier(c.key)} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition" style={{ background: on ? "#D10005" : "#fff", color: on ? "#fff" : "#5c626b", borderColor: on ? "#D10005" : "rgba(0,0,0,0.15)" }}>
                          {c.label}<span className="ml-1 opacity-75">{n}</span>
                        </button>
                      );
                    })}
                    <button onClick={() => selectTier("all")} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition" style={{ background: isTierActive("all") ? "#1d2129" : "#fff", color: isTierActive("all") ? "#fff" : "#1d2129", borderColor: "rgba(0,0,0,0.15)" }}>
                      {t.selectAll}
                    </button>
                  </div>
                </div>
                )}

                <div className="mt-5 border-t border-black/5 pt-4">
                  <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{LF.quickFilters}</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {cats.map((c) => {
                      const on = category === c;
                      const n = c === "all" ? won.length : won.filter((p) => p.category === c).length;
                      const label = c === "all" ? t.deckCategoryAll : t.cardCategory(c);
                      return (
                        <button key={c} onClick={() => { setCategory(c); setListSelected(new Set()); }} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "border-[#D10005] bg-[#D10005] text-white" : "border-black/15 bg-white text-[#5c626b] active:bg-black/[0.03]"}`}>{label}<span className="ml-1 opacity-75">{n}</span></button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-3 border-t border-black/10 px-4 py-3">
                <button onClick={() => { clearFilters(); setFilterOpen(false); }} className="flex-1 rounded-[10px] border-[1.6px] border-[#1d2129] bg-white py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{LF.reset}</button>
                <button onClick={() => setFilterOpen(false)} className="flex-1 rounded-[10px] bg-[#D10005] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{LF.filter}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {sortOpen && (
        <BottomSheet title={t.sortTitle} onClose={() => setSortOpen(false)}>
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => { setSortKey(key); setSortOpen(false); }}
              className="flex w-full items-center justify-between border-b border-black/5 py-3 text-left text-[14px]"
            >
              <span className={sortKey === key ? "font-bold text-[#1d2129]" : "text-[#41464e]"}>{t.sortLabels[key]}</span>
              {sortKey === key && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          ))}
        </BottomSheet>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function WaitingTab({ prizes, t, lang }: { prizes: WaitingPrize[]; t: Dict; lang: Lang }) {
  if (prizes.length === 0) {
    return <EmptyState icon="📦" title={t.waitingEmptyTitle} subtitle={t.waitingEmptySub} />;
  }
  return (
    <div className="px-3 pb-4 pt-3">
      <div className="space-y-2.5">
        {prizes.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <PrizeArt rarity={p.rarity} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-[#1d2129]">{locName(p, lang)}</p>
              <p className="truncate text-[10px] font-normal text-[#8a9099]">{locDesc(p, lang)}</p>
              <p className="mt-1 text-[11px] text-[#8a9099]">{t.requested(fmtDate(p.requestedAt))}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10.5px] font-semibold text-[#C9701B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f5670a]" /> {t.preparing}
              </span>
              <div className="mt-1.5">
                <CoinChip value={p.coinValue} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 px-1 text-center text-[10.5px] text-[#a2a8b0]">{t.waitingFooter}</p>
      <div className="-mx-3 mt-4"><SiteFooter t={t} /></div>
    </div>
  );
}

function ShippedTab({ prizes, onCopy, t, lang }: { prizes: ShippedPrize[]; onCopy: (code: string) => void; t: Dict; lang: Lang }) {
  if (prizes.length === 0) {
    return <EmptyState icon="✅" title={t.shippedEmptyTitle} subtitle={t.shippedEmptySub} />;
  }
  return (
    <div className="px-3 pb-4 pt-3">
      <div className="space-y-2.5">
        {prizes.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <PrizeArt rarity={p.rarity} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-[#1d2129]">{locName(p, lang)}</p>
              <p className="truncate text-[10px] font-normal text-[#8a9099]">{locDesc(p, lang)}</p>
              <p className="mt-1 text-[11px] text-[#8a9099]">{t.requested(fmtDate(p.requestedAt))}</p>
              <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#f1f3f6] px-2 py-1">
                <span className="text-[10px] font-semibold text-[#8a9099]">{t.tracking}</span>
                <span className="text-[11px] font-bold tracking-wide text-[#1d2129]">{p.tracking}</span>
                <button onClick={() => onCopy(p.tracking)} className="ml-auto text-[#D10005]" aria-label={t.copyAria}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="mt-1.5">
                <CoinChip value={p.coinValue} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="-mx-3 mt-4"><SiteFooter t={t} /></div>
    </div>
  );
}

/* ── Shipping request flow (bottom-sheet) ────────────────────────────── */
function ShippingFlow({
  prizes,
  total,
  onClose,
  onConfirm,
  t,
  lang,
  shippingAddresses,
  onShippingAddressesChange,
}: {
  prizes: WonPrize[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  t: Dict;
  lang: Lang;
  shippingAddresses: ShippingAddr[];
  onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>;
}) {
  const [step, setStep] = useState<"address" | "confirm" | "addNew">(shippingAddresses.length === 0 ? "addNew" : "address");
  const [addrId, setAddrId] = useState<string>(() => {
    const def = shippingAddresses.find(a => a.isDefault);
    return def?.id ?? shippingAddresses[0]?.id ?? "";
  });

  const [newForm, setNewForm] = useState<Omit<ShippingAddr, "id" | "isDefault">>(EMPTY_SHIPPING_FORM);
  const [postalTouched, setPostalTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [zipTouched, setZipTouched] = useState(false);
  const [streetNumTouched, setStreetNumTouched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<{ prefecture: string; city: string; streetNumber: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postalValid = /^\d{3}-\d{4}$/.test(newForm.postalCode);
  const phoneValid = newForm.phone.replace(/\D/g, "").length >= 10;
  const zipValid = /^\d{5}$/.test(newForm.zipCode);
  const streetNumValid = /^\d+$/.test(newForm.streetNumber.trim()) && newForm.streetNumber.trim().length > 0;
  const postalError = postalTouched && newForm.postalCode.length > 0 && !postalValid ? "NNN-NNNN" : "";
  const phoneError = phoneTouched && newForm.phone.length > 0 && !phoneValid ? (lang === "ja" ? "電話番号は10桁以上で入力してください" : "Phone number must be at least 10 digits") : "";
  const zipError = zipTouched && newForm.zipCode.length > 0 && !zipValid ? "5 digits required" : "";
  const streetNumError = streetNumTouched && newForm.streetNumber.length > 0 && !streetNumValid ? (lang === "ja" ? "数字のみ" : "Numbers only") : "";
  const canAddNew = newForm.lastName.trim().length > 0 && newForm.firstName.trim().length > 0 && phoneValid &&
    (newForm.country === "japan"
      ? postalValid && !!newForm.prefecture && newForm.city.trim().length > 0 && streetNumValid
      : newForm.cityStreetNumber.trim().length > 0 && !!newForm.state && zipValid);

  const chosen = shippingAddresses.find(a => a.id === addrId);
  const phonePrefix = newForm.country === "japan" ? "🇯🇵 +81" : "🇺🇸 +1";

  // POC postcode lookup: seed a few plausible Japanese addresses from the typed postcode.
  function genShipCandidates(postal: string): { prefecture: string; city: string; streetNumber: string }[] {
    const digits = postal.replace(/\D/g, "");
    const seed = digits.length ? parseInt(digits.slice(0, 4), 10) || 0 : 0;
    const prefIdx = [12, 26, 13, 22, 39, 27];
    const cityPool = lang === "ja"
      ? ["中央区銀座", "渋谷区道玄坂", "新宿区西新宿", "港区六本木", "北区梅田"]
      : ["Chuo-ku, Ginza", "Shibuya-ku, Dogenzaka", "Nishi-Shinjuku", "Minato-ku, Roppongi", "Kita-ku, Umeda"];
    return Array.from({ length: 4 }, (_, i) => ({
      prefecture: PREFECTURES_JA[prefIdx[(seed + i) % prefIdx.length]],
      city: cityPool[(seed + i) % cityPool.length],
      streetNumber: String(1000 + ((seed * 7 + i * 137) % 8999)),
    }));
  }
  function chooseShipCandidate(c: { prefecture: string; city: string; streetNumber: string }) {
    setNewForm(f => ({ ...f, prefecture: c.prefecture, city: c.city, streetNumber: c.streetNumber }));
    setStreetNumTouched(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setCandidates([]);
    setSearching(false);
  }

  function setPostalCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    setNewForm(f => ({ ...f, postalCode: formatted }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (digits.length >= 3) {
      setSearching(true);
      setCandidates([]);
      searchTimer.current = setTimeout(() => {
        setCandidates(genShipCandidates(formatted));
        setSearching(false);
      }, 900);
    } else {
      setSearching(false);
      setCandidates([]);
    }
  }

  function onCountryChange(country: ShippingCountry) {
    setNewForm(f => ({ ...f, country, postalCode: "", prefecture: "", city: "", streetNumber: "", cityStreetNumber: "", state: "", zipCode: "", phone: "" }));
    setPostalTouched(false); setZipTouched(false); setStreetNumTouched(false); setPhoneTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false); setCandidates([]);
  }

  function openAddNew() {
    setNewForm({ ...EMPTY_SHIPPING_FORM });
    setPostalTouched(false); setPhoneTouched(false); setZipTouched(false); setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false); setCandidates([]);
    setStep("addNew");
  }

  function handleSaveNewAddress() {
    const isFirst = shippingAddresses.length === 0;
    const newAddr: ShippingAddr = { id: Date.now().toString(36), isDefault: isFirst, ...newForm };
    onShippingAddressesChange(prev => [...prev, newAddr]);
    setAddrId(newAddr.id);
    setStep("address");
  }

  function addrDisplayLines(addr: ShippingAddr): string[] {
    return formatShippingAddr(addr);
  }
  function addrName(addr: ShippingAddr) { return `${addr.lastName} ${addr.firstName}`; }
  function addrPhone(addr: ShippingAddr) { return `${addr.country === "japan" ? "+81" : "+1"} ${addr.phone}`; }
  function addrFlag(addr: ShippingAddr) { return addr.country === "japan" ? "🇯🇵" : "🇺🇸"; }

  const inputCls = "w-full rounded-xl border border-black/15 px-3 py-2.5 text-[13px] text-[#1d2129] outline-none focus:border-[#D10005]";
  const labelCls = "mb-1 mt-2 block text-[11px] font-semibold text-[#8a9099]";

  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="max-h-[88%] w-full overflow-y-auto rounded-t-2xl bg-white px-4 pb-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />

        {step === "address" && (
          <>
            <h3 className="mb-2 text-[15px] font-bold text-[#1d2129]">{t.chooseAddress}</h3>
            {shippingAddresses.length === 0 ? (
              <p className="mb-3 text-center text-[12.5px] text-[#8a9099]">{t.shippingEmpty}</p>
            ) : (
              <div className="space-y-2">
                {shippingAddresses.map((addr) => {
                  const sel = addr.id === addrId;
                  const lines = addrDisplayLines(addr);
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setAddrId(addr.id)}
                      className="flex w-full items-start gap-2.5 rounded-xl border-2 p-3 text-left"
                      style={{ borderColor: sel ? "#D10005" : "#e5e8ec", background: sel ? "#FFF4F4" : "#fff" }}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: sel ? "#D10005" : "#c9ced6" }}>
                        {sel && <span className="h-2 w-2 rounded-full bg-[#D10005]" />}
                      </span>
                      <span className="text-[12.5px] leading-relaxed">
                        <b className="text-[#1d2129]">{addrFlag(addr)} {addrName(addr)}</b>
                        {addr.isDefault && <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#22a34a" }}>{t.shippingDefaultLabel}</span>}
                        <br />{lines.map((l, i) => <span key={i} className="text-[#5c626b]">{l}<br /></span>)}
                        <span className="text-[#8a9099]">{addrPhone(addr)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={openAddNew} className="mt-2 w-full rounded-xl border border-dashed border-black/20 py-2.5 text-[13px] font-bold text-[#5c626b]">
              {t.addNewAddress}
            </button>
            <button
              disabled={!chosen}
              onClick={() => setStep("confirm")}
              className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}
            >
              {t.continueBtn}
            </button>
          </>
        )}

        {step === "addNew" && (
          <>
            <div className="mb-3 flex items-center gap-2">
              {shippingAddresses.length > 0 && (
                <button onClick={() => setStep("address")} className="flex h-7 w-7 shrink-0 items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              <h3 className="text-[15px] font-bold text-[#1d2129]">{t.shippingAddNew}</h3>
            </div>

            <div className="mb-3 flex gap-2">
              <div className="flex-1 min-w-0">
                <label className={labelCls}>{t.profileLastName}<span className="ml-0.5 text-[#D10005]">*</span></label>
                <input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} placeholder={t.profilePlaceholder} className={inputCls} />
              </div>
              <div className="flex-1 min-w-0">
                <label className={labelCls}>{t.profileFirstName}<span className="ml-0.5 text-[#D10005]">*</span></label>
                <input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder={t.profilePlaceholder} className={inputCls} />
              </div>
            </div>

            <div className="mb-3">
              <label className={labelCls}>{t.shippingCountry}<span className="ml-0.5 text-[#D10005]">*</span></label>
              <div className="relative">
                <select
                  value={newForm.country}
                  onChange={e => onCountryChange(e.target.value as ShippingCountry)}
                  className={inputCls + " appearance-none pr-8"}
                >
                  <option value="japan">{t.shippingJapan}</option>
                  <option value="usa">{t.shippingUSA}</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
            </div>

            {newForm.country === "japan" && (
              <>
                <div className="mb-3 flex gap-2">
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>{t.profilePostalCode}<span className="ml-0.5 text-[#D10005]">*</span></label>
                    <input value={newForm.postalCode} onChange={e => setPostalCode(e.target.value)} onBlur={() => setPostalTouched(true)} placeholder="NNN-NNNN" className={inputCls + (postalError ? " border-[#D10005]" : "")} />
                    {postalError && <p className="mt-0.5 text-[10px] text-[#D10005]">{postalError}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>{t.profilePrefecture}<span className="ml-0.5 text-[#D10005]">*</span></label>
                    <div className="relative">
                      <select value={newForm.prefecture} onChange={e => setNewForm(f => ({ ...f, prefecture: e.target.value }))} className={inputCls + " appearance-none pr-8"}>
                        <option value="">{lang === "ja" ? "都道府県" : "Prefecture"}</option>
                        {PREFECTURES_JA.map((ja, i) => <option key={ja} value={ja}>{lang === "ja" ? ja : PREFECTURES_EN[i]}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
                    </div>
                  </div>
                </div>
                {!searching && candidates.length === 0 && (
                  <p className="mb-3 -mt-1 text-[10.5px] text-[#a2a8b0]">{t.postcodeHint}</p>
                )}
                {searching && (
                  <div className="mb-3 -mt-1 flex items-center gap-2 text-[12px] font-semibold text-[#8a9099]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#D10005]" />
                    {t.searching}
                  </div>
                )}
                {!searching && candidates.length > 0 && (
                  <div className="mb-3 -mt-1">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.selectAddress}</p>
                    <div className="space-y-2">
                      {candidates.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => chooseShipCandidate(c)}
                          className="animate-fade-slide flex w-full items-center justify-between gap-2 rounded-xl border border-black/15 bg-white p-3 text-left"
                          style={{ animationDelay: `${Math.min(i, 4) * 80}ms` }}
                        >
                          <span className="text-[12.5px] leading-relaxed text-[#1d2129]">
                            〒{newForm.postalCode} {c.prefecture}
                            <br /><span className="text-[#8a9099]">{c.city} {c.streetNumber}</span>
                          </span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="#c9ced6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className={labelCls}>{t.profileCity}<span className="ml-0.5 text-[#D10005]">*</span></label>
                  <input value={newForm.city} onChange={e => setNewForm(f => ({ ...f, city: e.target.value }))} placeholder={lang === "ja" ? "市区町村・番地" : "City, Street"} className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingStreetNumber}<span className="ml-0.5 text-[#D10005]">*</span></label>
                  <input value={newForm.streetNumber} onChange={e => setNewForm(f => ({ ...f, streetNumber: e.target.value.replace(/\D/g, "") }))} onBlur={() => setStreetNumTouched(true)} placeholder={lang === "ja" ? "例: 1234" : "e.g. 1234"} className={inputCls + (streetNumError ? " border-[#D10005]" : "")} />
                  {streetNumError && <p className="mt-0.5 text-[10px] text-[#D10005]">{streetNumError}</p>}
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingApartment}</label>
                  <input value={newForm.apartment} onChange={e => setNewForm(f => ({ ...f, apartment: e.target.value }))} placeholder={lang === "ja" ? "例: 〇〇マンション 101号室（任意）" : "Apt, Room No. (optional)"} className={inputCls} />
                </div>
              </>
            )}

            {newForm.country === "usa" && (
              <>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingApartment}</label>
                  <input value={newForm.apartment} onChange={e => setNewForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Apt, Suite, Room No. (optional)" className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingCityStreetNumber}<span className="ml-0.5 text-[#D10005]">*</span></label>
                  <input value={newForm.cityStreetNumber} onChange={e => setNewForm(f => ({ ...f, cityStreetNumber: e.target.value }))} placeholder="e.g. 123 Main St, Springfield" className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingState}<span className="ml-0.5 text-[#D10005]">*</span></label>
                  <div className="relative">
                    <select value={newForm.state} onChange={e => setNewForm(f => ({ ...f, state: e.target.value }))} className={inputCls + " appearance-none pr-8"}>
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingZipCode}<span className="ml-0.5 text-[#D10005]">*</span></label>
                  <input value={newForm.zipCode} onChange={e => setNewForm(f => ({ ...f, zipCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))} onBlur={() => setZipTouched(true)} placeholder="e.g. 90210" className={inputCls + (zipError ? " border-[#D10005]" : "")} />
                  {zipError && <p className="mt-0.5 text-[10px] text-[#D10005]">{zipError}</p>}
                </div>
              </>
            )}

            <div className="mb-4">
              <label className={labelCls}>{t.profilePhone}<span className="ml-0.5 text-[#D10005]">*</span></label>
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 items-center self-stretch rounded-xl border border-black/15 px-3 text-[13px] text-[#1d2129]">{phonePrefix}</div>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={newForm.phone}
                    onChange={e => setNewForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="0000000000"
                    className={inputCls + (phoneError ? " border-[#D10005]" : "")}
                  />
                  {phoneError && <p className="mt-0.5 text-[10px] text-[#D10005]">{phoneError}</p>}
                </div>
              </div>
            </div>

            <button
              disabled={!canAddNew}
              onClick={handleSaveNewAddress}
              className="mt-1 w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg,#ff2233,#D10005)" }}
            >
              {t.shippingRegister}
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <h3 className="mb-2 text-[15px] font-bold text-[#1d2129]">{t.confirmTitle}</h3>
            <div className="rounded-xl bg-[#f1f3f6] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.deliverTo}</p>
              {chosen && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#1d2129]">
                  <b>{addrFlag(chosen)} {addrName(chosen)}</b><br />
                  {addrDisplayLines(chosen).map((l, i) => <span key={i} className="text-[#5c626b]">{l}<br /></span>)}
                  <span className="text-[#8a9099]">{addrPhone(chosen)}</span>
                </p>
              )}
            </div>
            <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.prizesCount(prizes.length)}</p>
            <div className="space-y-1.5">
              {prizes.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <PrizeArt rarity={p.rarity} size={32} />
                  <span className="flex-1 truncate text-[12px] text-[#41464e]">{locName(p, lang)}</span>
                  <CoinChip value={p.coinValue} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FFF6E3] px-3 py-2">
              <span className="text-[12px] font-semibold text-[#B5740A]">{t.totalValue}</span>
              <CoinChip value={total} strong />
            </div>
            <p className="mt-2 text-center text-[11px] text-[#8a9099]">{t.freeShip}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setStep("address")} className="rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#5c626b]">{t.back}</button>
              <button onClick={onConfirm} className="rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}>{t.requestShippingBtn}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shipping Address page ───────────────────────────────────────────── */
function ShippingAddressPage({ lang, coins, addresses, onAddressesChange, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; addresses: ShippingAddr[]; onAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onHome?: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const setAddresses = onAddressesChange;
  const [view, setView] = useState<"main" | "form">("main");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ShippingAddr, "id" | "isDefault">>(EMPTY_SHIPPING_FORM);
  const [postalTouched, setPostalTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [zipTouched, setZipTouched] = useState(false);
  const [streetNumTouched, setStreetNumTouched] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({ text: "", visible: false });
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<{ prefecture: string; city: string; streetNumber: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postalValid = /^\d{3}-\d{4}$/.test(form.postalCode);
  const phoneValid = form.phone.replace(/\D/g, "").length >= 10;
  const zipValid = /^\d{5}$/.test(form.zipCode);
  const streetNumValid = /^\d+$/.test(form.streetNumber.trim()) && form.streetNumber.trim().length > 0;

  const postalError = postalTouched && form.postalCode.length > 0 && !postalValid ? "NNN-NNNN" : "";
  const phoneError = phoneTouched && form.phone.length > 0 && !phoneValid ? (lang === "ja" ? "電話番号は10桁以上で入力してください" : "Phone number must be at least 10 digits") : "";
  const zipError = zipTouched && form.zipCode.length > 0 && !zipValid ? "5 digits required" : "";
  const streetNumError = streetNumTouched && form.streetNumber.length > 0 && !streetNumValid ? (lang === "ja" ? "数字のみ入力してください" : "Numbers only") : "";

  const canSubmit = form.lastName.trim().length > 0 && form.firstName.trim().length > 0 && phoneValid &&
    (form.country === "japan"
      ? postalValid && !!form.prefecture && form.city.trim().length > 0 && streetNumValid
      : form.cityStreetNumber.trim().length > 0 && !!form.state && zipValid);

  function genShipCandidates(postal: string): { prefecture: string; city: string; streetNumber: string }[] {
    const digits = postal.replace(/\D/g, "");
    const seed = digits.length ? parseInt(digits.slice(0, 4), 10) || 0 : 0;
    const prefIdx = [12, 26, 13, 22, 39, 27];
    const cityPool = lang === "ja"
      ? ["中央区銀座", "渋谷区道玄坂", "新宿区西新宿", "港区六本木", "北区梅田"]
      : ["Chuo-ku, Ginza", "Shibuya-ku, Dogenzaka", "Nishi-Shinjuku", "Minato-ku, Roppongi", "Kita-ku, Umeda"];
    return Array.from({ length: 4 }, (_, i) => ({
      prefecture: PREFECTURES_JA[prefIdx[(seed + i) % prefIdx.length]],
      city: cityPool[(seed + i) % cityPool.length],
      streetNumber: String(1000 + ((seed * 7 + i * 137) % 8999)),
    }));
  }
  function chooseShipCandidate(c: { prefecture: string; city: string; streetNumber: string }) {
    setForm(f => ({ ...f, prefecture: c.prefecture, city: c.city, streetNumber: c.streetNumber }));
    setStreetNumTouched(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setCandidates([]);
    setSearching(false);
  }

  function pushToast(text: string) {
    setToast({ text, visible: true });
    setTimeout(() => setToast({ text: "", visible: false }), 4000);
  }

  function openAddForm() {
    setForm({ ...EMPTY_SHIPPING_FORM });
    setEditingId(null);
    setPostalTouched(false);
    setPhoneTouched(false);
    setZipTouched(false);
    setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
    setCandidates([]);
    setView("form");
  }

  function openEditForm(addr: ShippingAddr) {
    setForm({
      country: addr.country,
      lastName: addr.lastName,
      firstName: addr.firstName,
      phone: addr.phone,
      postalCode: addr.postalCode,
      prefecture: addr.prefecture,
      city: addr.city,
      streetNumber: addr.streetNumber,
      apartment: addr.apartment,
      cityStreetNumber: addr.cityStreetNumber,
      state: addr.state,
      zipCode: addr.zipCode,
    });
    setEditingId(addr.id);
    setPostalTouched(false);
    setPhoneTouched(false);
    setZipTouched(false);
    setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
    setCandidates([]);
    setView("form");
  }

  function handleRegister() {
    if (editingId) {
      setAddresses(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
    } else {
      const isFirst = addresses.length === 0;
      const newAddr: ShippingAddr = { id: Date.now().toString(36), isDefault: isFirst, ...form };
      setAddresses(prev => [...prev, newAddr]);
    }
    setView("main");
    pushToast(editingId ? t.toastShippingEdited : t.toastShippingAdded);
    setEditingId(null);
  }

  function handleSetDefault(id: string) {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  }

  function handleDelete(id: string) {
    setAddresses(prev => {
      const remaining = prev.filter(a => a.id !== id);
      const wasDefault = prev.find(a => a.id === id)?.isDefault;
      if (wasDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
    setShowDelete(null);
    pushToast(t.toastShippingDeleted);
  }

  function setPostalCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    setForm(f => ({ ...f, postalCode: formatted }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (digits.length >= 3) {
      setSearching(true);
      setCandidates([]);
      searchTimer.current = setTimeout(() => {
        setCandidates(genShipCandidates(formatted));
        setSearching(false);
      }, 900);
    } else {
      setSearching(false);
      setCandidates([]);
    }
  }

  function onCountryChange(country: ShippingCountry) {
    setForm(f => ({ ...f, country, postalCode: "", prefecture: "", city: "", streetNumber: "", cityStreetNumber: "", state: "", zipCode: "", phone: "" }));
    setPostalTouched(false);
    setZipTouched(false);
    setStreetNumTouched(false);
    setPhoneTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
    setCandidates([]);
  }

  const phonePrefix = form.country === "japan" ? "🇯🇵 +81" : "🇺🇸 +1";

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      <div className="relative shrink-0 border-b border-black/10 bg-white px-4 py-3">
        {toast.visible && (
          <div className="absolute inset-0 z-10 flex items-center gap-2.5 px-4 text-[13px] font-bold text-white" style={{ background: "#2d7a3a" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.25" /><path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="flex-1">{toast.text}</span>
            <button onClick={() => setToast({ text: "", visible: false })} className="ml-auto opacity-80">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={view === "form" ? () => setView("main") : onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[15px] font-bold text-[#1d2129]">{view === "form" ? t.shippingFormTitle : t.shippingTitle}</h1>
        </div>
      </div>

      {view === "form" && (
        <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-3 flex gap-2">
            <Field label={t.profileLastName} value={form.lastName} onChange={(v) => setForm(f => ({ ...f, lastName: v }))} half required placeholder={t.profilePlaceholder} />
            <Field label={t.profileFirstName} value={form.firstName} onChange={(v) => setForm(f => ({ ...f, firstName: v }))} half required placeholder={t.profilePlaceholder} />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.shippingCountry}<span className="ml-0.5 text-[#D10005]">*</span></label>
            <div className="relative flex items-center">
              <select
                value={form.country}
                onChange={(e) => onCountryChange(e.target.value as ShippingCountry)}
                className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-2.5 pr-8 text-[13px] text-[#1d2129] outline-none"
              >
                <option value="japan">{t.shippingJapan}</option>
                <option value="usa">{t.shippingUSA}</option>
              </select>
              <span className="pointer-events-none absolute right-2 text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
          </div>

          {form.country === "japan" && (
            <>
              <div className="mb-1 flex gap-2">
                <Field label={t.profilePostalCode} value={form.postalCode} onChange={setPostalCode} onBlur={() => setPostalTouched(true)} half required placeholder="NNN-NNNN" valid={postalValid && form.postalCode.length > 0} error={postalError} />
                <PrefectureSelect value={form.prefecture} onChange={(v) => setForm(f => ({ ...f, prefecture: v }))} label={t.profilePrefecture} lang={lang} />
              </div>
              {!searching && candidates.length === 0 && (
                <p className="mb-3 text-[10.5px] text-[#a2a8b0]">{t.postcodeHint}</p>
              )}
              {searching && (
                <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[#8a9099]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#D10005]" />
                  {t.searching}
                </div>
              )}
              {!searching && candidates.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.selectAddress}</p>
                  <div className="space-y-2">
                    {candidates.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => chooseShipCandidate(c)}
                        className="animate-fade-slide flex w-full items-center justify-between gap-2 rounded-xl border border-black/15 bg-white p-3 text-left"
                        style={{ animationDelay: `${Math.min(i, 4) * 80}ms` }}
                      >
                        <span className="text-[12.5px] leading-relaxed text-[#1d2129]">
                          〒{form.postalCode} {c.prefecture}
                          <br /><span className="text-[#8a9099]">{c.city} {c.streetNumber}</span>
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="#c9ced6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-3">
                <Field label={t.profileCity} value={form.city} onChange={(v) => setForm(f => ({ ...f, city: v }))} required placeholder={lang === "ja" ? "市区町村・番地" : "City, Street"} />
              </div>
              <div className="mb-3">
                <Field label={t.shippingStreetNumber} value={form.streetNumber} onChange={(v) => setForm(f => ({ ...f, streetNumber: v.replace(/\D/g, "") }))} onBlur={() => setStreetNumTouched(true)} required type="text" placeholder={lang === "ja" ? "例: 1234" : "e.g. 1234"} valid={streetNumValid} error={streetNumError} />
              </div>
              <div className="mb-3">
                <Field label={t.shippingApartment} value={form.apartment} onChange={(v) => setForm(f => ({ ...f, apartment: v }))} placeholder={lang === "ja" ? "例: 〇〇マンション 101号室（任意）" : "e.g. Apt 101 (optional)"} />
              </div>
            </>
          )}

          {form.country === "usa" && (
            <>
              <div className="mb-3">
                <Field label={t.shippingApartment} value={form.apartment} onChange={(v) => setForm(f => ({ ...f, apartment: v }))} placeholder="Apt, Suite, Room No. (optional)" />
              </div>
              <div className="mb-3">
                <Field label={t.shippingCityStreetNumber} value={form.cityStreetNumber} onChange={(v) => setForm(f => ({ ...f, cityStreetNumber: v }))} required placeholder="e.g. 123 Main St, Springfield" />
              </div>
              <div className="mb-3">
                <USStateSelect value={form.state} onChange={(v) => setForm(f => ({ ...f, state: v }))} label={t.shippingState} />
              </div>
              <div className="mb-3">
                <Field label={t.shippingZipCode} value={form.zipCode} onChange={(v) => setForm(f => ({ ...f, zipCode: v.replace(/\D/g, "").slice(0, 5) }))} onBlur={() => setZipTouched(true)} required placeholder="e.g. 90210" valid={zipValid && form.zipCode.length > 0} error={zipError} />
              </div>
            </>
          )}

          <div className="mb-6">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profilePhone}<span className="ml-0.5 text-[#D10005]">*</span></label>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center self-stretch rounded-lg border border-[#e5e8ec] bg-[#f5f6f8] px-3 text-[13px] text-[#1d2129]">{phonePrefix}</div>
              <div className="flex-1">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="0000000000"
                  className="w-full rounded-lg border py-2.5 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none transition"
                  style={{
                    paddingLeft: "10px",
                    paddingRight: phoneValid || (phoneTouched && phoneError) ? "32px" : "10px",
                    borderColor: phoneError ? "#D10005" : phoneValid ? "#d1d5db" : "#e5e8ec",
                    background: phoneError ? "rgba(230,0,18,0.04)" : "white",
                  }}
                />
                {phoneError && <p className="mt-1 text-[10px] text-[#D10005]">{phoneError}</p>}
              </div>
            </div>
          </div>

          <button disabled={!canSubmit} onClick={handleRegister} className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white" style={{ background: canSubmit ? "#D10005" : "#d1d5db", cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {t.shippingRegister}
          </button>
        </div>
      )}

      {view === "main" && (
        <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-4 text-[12.5px] leading-relaxed text-[#5c626b]">{t.shippingDesc}</p>

          {addresses.length === 0 && (
            <div className="mb-3 flex items-center justify-center rounded-xl border border-dashed border-[#c9ced6] bg-white px-4 py-5">
              <p className="text-center text-[12.5px] text-[#8a9099]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" className="mr-1 inline-block align-middle"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>
                {t.shippingEmpty}
              </p>
            </div>
          )}

          {addresses.map((addr) => {
            const addrLines = formatShippingAddr(addr);
            const nameLine = `${addr.lastName} ${addr.firstName}`;
            const countryFlag = addr.country === "japan" ? "🇯🇵" : "🇺🇸";
            const phoneDisplay = `${addr.country === "japan" ? "+81" : "+1"} ${addr.phone}`;
            return (
              <div key={addr.id} className="mb-3 overflow-hidden rounded-xl border-2 bg-white" style={{ borderColor: addr.isDefault ? "#22a34a" : "#e5e8ec" }}>
                <div className="flex items-center gap-2 border-b border-black/[0.07] px-3 py-2" style={{ background: addr.isDefault ? "rgba(34,163,74,0.06)" : "#f9fafb" }}>
                  <span className="text-[12px] font-bold text-[#1d2129]">{countryFlag} {t.shippingFormTitle}</span>
                  {addr.isDefault && (
                    <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: "#22a34a" }}>{t.shippingDefaultLabel}</span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)} className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: "#f0fdf4", color: "#22a34a", border: "1px solid #22a34a" }}>
                        {t.shippingSetDefault}
                      </button>
                    )}
                    <button onClick={() => openEditForm(addr)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#22a34a" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => setShowDelete(addr.id)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#D10005" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </button>
                  </div>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[13px] font-semibold text-[#1d2129]">{nameLine}</p>
                  <p className="mt-0.5 text-[12.5px] text-[#5c626b]">{phoneDisplay}</p>
                  {addrLines.map((line, i) => (
                    <p key={i} className="mt-0.5 text-[13px] text-[#1d2129]">{line}</p>
                  ))}
                </div>
              </div>
            );
          })}

          <button onClick={openAddForm} className="mt-1 w-full rounded-xl border-2 border-[#1d2129] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
            {t.shippingAddNew}
          </button>

          <div className="-mx-4 mt-4"><SiteFooter t={t} /></div>
        </div>
      )}

      {showDelete && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white px-5 py-5">
            <h2 className="text-center text-[15px] font-bold text-[#1d2129]">{t.shippingDeleteTitle}</h2>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowDelete(null)} className="flex-1 rounded-xl border border-[#e5e8ec] py-3 text-[14px] font-semibold text-[#5c626b]">
                {t.shippingCancel}
              </button>
              <button onClick={() => handleDelete(showDelete)} className="flex-1 rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#D10005" }}>
                {t.shippingDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── My Account ──────────────────────────────────────────────────────────
   Visual layout mirrors the POC's MyPage (profile / balance / rank cards +
   menu grid + account/other sections). Edit profile and Account Settings
   both open My Profile. Prize history, My Loot, Purchase history, Address,
   Announcements and Coin History are also wired. */
const MENU_ICON_IMG: Record<string, string> = {
  quest: "/menu-quest.png",
  items: "/menu-items.png",
  history: "/menu-history.png",
  purchases: "/menu-purchases.png",
  invite: "/menu-invite.png",
  faq: "/menu-faq.png",
  contact: "/menu-contact.png",
  notices: "/menu-notices.png",
};

function myMenuIcon(key: string) {
  const c = "#D10005";
  if (MENU_ICON_IMG[key]) {
    return <img src={MENU_ICON_IMG[key]} alt="" className="h-[26px] w-[26px] shrink-0 object-contain" />;
  }
  switch (key) {
    case "coinHistory":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>;
    case "shippingAddress":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case "subscriptions":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M6 10h4M6 13.5h8" /><path d="M16 3l2 3M8 3l-2 3" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><path d="M5 18v-2a7 7 0 0114 0v2l1.5 2H3.5z" /><circle cx="12" cy="20.5" r="1.4" fill="#fff" /></svg>;
  }
}

function MyPage({ lang, coins, displayName = "Username", onOpenPrizeHistory, onOpenMyLoot, onOpenPurchaseHistory, onOpenAnnouncements, onOpenShippingAddress, onOpenProfile, onHome, onLogout, onOpenStore }: { lang: Lang; coins: number; displayName?: string; onOpenPrizeHistory: () => void; onOpenMyLoot: () => void; onOpenPurchaseHistory: () => void; onOpenAnnouncements: () => void; onOpenShippingAddress: () => void; onOpenProfile: () => void; onHome: () => void; onLogout: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const openLegal = useContext(LegalNavContext);
  const openCoinHistory = useContext(CoinHistoryNavContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Restore the last scroll offset when re-entering My Page (e.g. after going
  // back from a sub-screen) instead of jumping to the top.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = myPageScrollTop;
  }, []);

  // "items" (My Loot), "history" (Prize History), "purchases" (Purchase
  // History), "notices" (Announcements) and "shippingAddress" navigate. Every
  // other row renders but is inert (no onClick) — those screens are not ported
  // into PROD yet.
  const menu: { key: string; label: string; onClick?: () => void }[] = [
    { key: "quest", label: t.mmQuest },
    { key: "items", label: t.mmItems, onClick: onOpenMyLoot },
    { key: "history", label: t.mmPrizeHistory, onClick: onOpenPrizeHistory },
    { key: "purchases", label: t.mmPurchases, onClick: onOpenPurchaseHistory },
    { key: "coinHistory", label: t.coinHistoryTitle, onClick: openCoinHistory },
    { key: "invite", label: t.mmInvite },
    { key: "faq", label: t.mmFaq },
    { key: "contact", label: t.mmContact },
    { key: "notices", label: t.mmNotices, onClick: onOpenAnnouncements },
    { key: "shippingAddress", label: t.mmShippingAddress, onClick: onOpenShippingAddress },
  ];

  const linkRow = (label: string, onClick?: () => void) => (
    <button key={label} onClick={onClick} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[16px] font-bold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">{label}</button>
  );

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />
      <div
        ref={scrollRef}
        onScroll={(e) => { myPageScrollTop = e.currentTarget.scrollTop; }}
        className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto"
      >
        <div className="px-3 py-4">
          {/* Profile card */}
          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <img src="/account-avatar.png" alt="" className="h-[86px] w-[86px] shrink-0 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-extrabold text-[#1d2129]">{displayName.trim() || t.accountName}</p>
              <p className="mt-0.5 text-[12px] font-normal text-[#8a9099]">{t.mpId} : XXXXXX</p>
              <button onClick={onOpenProfile} className="mt-2 w-full rounded-lg border-2 border-[#D10005] py-1.5 text-[13px] font-bold text-[#D10005]">{t.mpEditProfile}</button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="flex items-stretch">
              <div className="flex-1 pr-3">
                <p className="text-[13px] font-normal text-[#5b616b]">{t.mpOripaCoin}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[22px] font-extrabold text-[#1d2129]">
                  <CoinIcon size={22} />{coins.toLocaleString()}
                  <img src="/icons/coin-plus.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
                </p>
              </div>
              <div className="w-px bg-black/10" />
              <div className="flex-1 pl-4">
                <p className="text-[13px] font-normal text-[#5b616b]">{t.mpFreePoint}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[22px] font-extrabold text-[#1d2129]"><GemIcon size={22} />10,000</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <button onClick={openCoinHistory} className="shrink-0 rounded-lg border border-black/25 px-4 py-1.5 text-[13px] font-bold text-[#1d2129] active:bg-black/[0.03]">{t.mpViewDetails}</button>
            </div>
          </div>

          {/* Rank card */}
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#eab984] p-4" style={{ background: "linear-gradient(135deg,#fdeeda,#f7dab6)" }}>
            <span className="inline-block rounded-md px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: "linear-gradient(180deg,#c46a1e,#a5511a)" }}>{t.mpCurrentRank}</span>
            <div className="mt-2 flex items-center gap-3">
              <img src="/rank-bronze.png" alt="" className="h-[68px] w-[68px] shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-[22px] font-extrabold uppercase tracking-wide text-[#5a3a17]">{t.mpRankBronze}</p>
                <p className="text-[13px] font-semibold text-[#6b4a23]">{t.mpNextLevel} <span className="text-[20px] font-bold text-[#BA5919]">1,000pt</span></p>
                <button className="mt-2 w-full rounded-lg bg-[#D10005] py-2 text-[13px] font-bold text-white active:scale-[0.99]">{t.mpRankPerks}</button>
              </div>
            </div>
            <div className="relative mt-3.5 h-2 w-full rounded-full border border-[#e2c197] bg-[#efe0c6]">
              <div
                className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
                style={{ width: "75%", background: "linear-gradient(180deg,#F5AF78 0%,#F18532 40%,#D56A21 75%,#CC6023 100%)", border: "0.5px solid #934516" }}
              />
            </div>
            <p className="mt-1 text-center text-[12px] font-medium text-[#6b4a23]">3,000/4,000</p>
          </div>

          {/* My Menu grid */}
          <h3 className="mb-2 mt-5 text-[16px] font-bold text-[#1d2129]">{t.mpMyMenu}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {menu.map((m) => (
              <button key={m.key} onClick={m.onClick} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">
                {myMenuIcon(m.key)}
                <span className="text-[14px] font-bold text-[#1d2129]">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Promo banners — Figma placeholders (e.g. LINE campaign / guide). */}
          <div className="mt-4 space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="relative aspect-[8/3] overflow-hidden rounded-xl">
                <img src="/placeholder-banner.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                  <span className="text-[15px] font-extrabold uppercase tracking-wide text-[#1d2129]">Promo Banner {n}</span>
                  <span className="mt-0.5 text-[12px] font-bold uppercase tracking-wide text-[#1d2129]">(e.g. LINE campaign / beginner guide)</span>
                </span>
              </div>
            ))}
          </div>

          {/* Account section */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpAccountSection}</h3>
          <div className="space-y-2">
            <button onClick={onOpenProfile} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[16px] font-bold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">{t.mpEditAccount}</button>
            <button onClick={onLogout} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[16px] font-bold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">{t.menuLogout}</button>
          </div>

          {/* Other section */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpOtherSection}</h3>
          <div className="space-y-2">
            {linkRow(t.mpTerms, () => openLegal("terms"))}
            {linkRow(t.mpPrivacy, () => openLegal("privacy"))}
            {linkRow(t.mpLegal, () => openLegal("legal"))}
            {linkRow(t.mpAntisocial, () => openLegal("antisocial"))}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>
    </div>
  );
}

/* ── PurchaseHistoryPage ─────────────────────────────────────────────── */
type PurchaseRecord = {
  id: string;
  ts: number;
  coins: number;
  freePoints: number;
  paymentMethod: string;
  paymentId: string;
  status: "Completed" | "Cancelled";
  jpy: number;
};

const DAY_MS = 86_400_000;
// Fixed reference "now" so mock data + date filtering stay deterministic
// (no SSR/CSR hydration drift). Records are spread back from this point,
// and the date-range presets are computed relative to it.
const PH_BASE = Date.UTC(2026, 1, 3, 22, 14);
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtPurchaseDate(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${hh}:${mm}`;
}

const PURCHASE_HISTORY: PurchaseRecord[] = Array.from({ length: 18 }, (_, i) => {
  const n = i + 1;
  const coins = [20000, 10000, 5000, 1000, 500][i % 5];
  return {
    id: `ph${n}`,
    ts: PH_BASE - i * 5 * DAY_MS,
    coins,
    freePoints: Math.round(coins / 40),
    paymentMethod: "Mazooma *****5678",
    paymentId: `358123${(49 - i + 100).toString().padStart(2, "0")}`,
    status: i % 6 === 1 ? "Cancelled" : "Completed",
    jpy: coins * 2.6,
  };
});

type PhRangeKey = "all" | "7d" | "30d" | "90d" | "custom";
function filterPurchases(list: PurchaseRecord[], range: PhRangeKey, from: string, to: string) {
  if (range === "custom") {
    const fromTs = from ? Date.parse(`${from}T00:00:00Z`) : -Infinity;
    const toTs = to ? Date.parse(`${to}T23:59:59Z`) : Infinity;
    return list.filter((r) => r.ts >= fromTs && r.ts <= toTs);
  }
  if (range === "all") return list;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = PH_BASE - days * DAY_MS;
  return list.filter((r) => r.ts >= cutoff);
}

function PurchaseHistoryPage({ lang, coins, onBack, onHome, empty = false, onOpenStore }: { lang: Lang; coins: number; onBack: () => void; onHome: () => void; empty?: boolean; onOpenStore?: () => void }) {
  const t = STR[lang];
  const [range, setRange] = useState<PhRangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visible, setVisible] = useState(LOAD_MORE_PAGE);
  const [loading, setLoading] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (filterTimer.current) clearTimeout(filterTimer.current); }, []);

  const filtered = useMemo(() => filterPurchases(PURCHASE_HISTORY, range, customFrom, customTo), [range, customFrom, customTo]);
  const items = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const loadMore = () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      setVisible((v) => Math.min(v + LOAD_MORE_PAGE, filtered.length));
      setLoading(false);
    }, 400);
  };

  // Brief loading pass so applying a period feels live (skeleton → reveal).
  const runFilterPass = () => {
    setVisible(LOAD_MORE_PAGE);
    setFiltering(true);
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => setFiltering(false), 500);
  };

  const presets: { key: PhRangeKey; label: string }[] = [
    { key: "all", label: t.phFilterAll },
    { key: "7d", label: t.phFilter7 },
    { key: "30d", label: t.phFilter30 },
    { key: "90d", label: t.phFilter90 },
    { key: "custom", label: t.phFilterCustom },
  ];
  const activeLabel = presets.find((p) => p.key === range)?.label ?? t.purchaseHistoryFilter;

  const choosePreset = (key: PhRangeKey) => {
    setRange(key);
    if (key !== "custom") {
      setFilterOpen(false);
      runFilterPass();
    }
  };
  const applyCustom = () => {
    setRange("custom");
    setFilterOpen(false);
    runFilterPass();
  };
  const resetFilter = () => {
    setRange("all");
    setCustomFrom("");
    setCustomTo("");
    setFilterOpen(false);
    runFilterPass();
  };

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Title row */}
      <div className="relative z-40 shrink-0 flex items-center justify-between border-b border-black/10 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[16px] font-bold text-[#1d2129]">{t.purchaseHistoryTitle}</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={`relative z-50 flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[14px] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition ${range === "all" ? "border-black/10 bg-white text-[#1d2129]" : "border-[#D10005] bg-[#fff2f2] text-[#D10005]"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2.5" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            {range === "all" ? t.purchaseHistoryFilter : activeLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2.4" className={`transition-transform ${filterOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          {filterOpen && (
            <>
              <button aria-hidden tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                <p className="px-2 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8a9099]">{t.phFilterHeading}</p>
                {presets.map((p) => {
                  const active = p.key === range;
                  return (
                    <button
                      key={p.key}
                      onClick={() => choosePreset(p.key)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition ${active ? "bg-[#fff2f2] text-[#D10005]" : "text-[#1d2129] hover:bg-black/[0.04]"}`}
                    >
                      {p.label}
                      {active && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      )}
                    </button>
                  );
                })}
                {range === "custom" && (
                  <div className="mt-1 space-y-2 border-t border-black/[0.06] px-2 pt-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-[#8a9099]">{t.phFilterFrom}</span>
                      <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-[13px] text-[#1d2129] outline-none focus:border-[#D10005]" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-[#8a9099]">{t.phFilterTo}</span>
                      <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-[13px] text-[#1d2129] outline-none focus:border-[#D10005]" />
                    </label>
                    <button onClick={applyCustom} className="w-full rounded-lg bg-[#D10005] py-2 text-[13px] font-bold text-white transition active:scale-[0.98]">{t.phFilterApply}</button>
                  </div>
                )}
                {range !== "all" && (
                  <button onClick={resetFilter} className="mt-1 w-full rounded-xl px-3 py-2 text-[13px] font-medium text-[#8a9099] transition hover:bg-black/[0.04]">{t.phFilterReset}</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {/* Note */}
        <p className="px-4 py-2.5 text-[11.5px] text-[#8a9099]">{t.purchaseHistoryNote}</p>

        {empty && (
          <p className="px-4 py-20 text-center text-[14px] text-[#9aa0a8]">{t.purchaseEmpty}</p>
        )}

        {/* Filtering skeleton */}
        {!empty && filtering && (
          <div className="space-y-2 px-3 pb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-28 rounded bg-black/10" />
                  <div className="h-3 w-16 rounded bg-black/10" />
                </div>
                <div className="mt-2.5 h-4 w-24 rounded bg-black/10" />
                <div className="mt-1.5 h-3 w-20 rounded bg-black/[0.07]" />
                <div className="mt-3 h-3 w-40 rounded bg-black/[0.06]" />
              </div>
            ))}
          </div>
        )}

        {/* Purchase records */}
        {!empty && !filtering && (
          <div className="space-y-2 px-3 pb-6">
            {items.length === 0 && (
              <p className="px-1 py-16 text-center text-[13px] text-[#9aa0a8]">{t.phFilterNone}</p>
            )}
            {items.map((rec, i) => {
              const isCompleted = rec.status === "Completed";
              const statusLabel = isCompleted ? t.purchaseStatusCompleted : t.purchaseStatusCancelled;
              const statusColor = isCompleted ? "#16a34a" : "#D10005";
              return (
                <div key={rec.id} className="animate-fade-slide rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]" style={{ animationDelay: `${(i % LOAD_MORE_PAGE) * 70}ms` }}>
                  {/* Date + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#8a9099]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                      {fmtPurchaseDate(rec.ts)}
                    </div>
                    <span className="shrink-0 text-[13px] font-medium" style={{ color: statusColor }}>{statusLabel}</span>
                  </div>

                  {/* Coins + price */}
                  <div className="mt-1.5 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-bold text-[#1d2129]">{rec.coins.toLocaleString()} COINS</p>
                      <p className="text-[10px] font-normal text-[#5c626b]">{t.purchaseFreePoints(rec.freePoints)}</p>
                    </div>
                    <p className="shrink-0 text-[14px] font-bold text-[#1d2129]">{rec.jpy.toLocaleString()} JPY</p>
                  </div>

                  {/* Payment details */}
                  <div className="mt-2 space-y-0.5 border-t border-black/[0.06] pt-2">
                    <p className="text-[10px] font-normal text-[#8a9099]">{t.purchasePaymentMethod}: {rec.paymentMethod}</p>
                    <p className="text-[10px] font-normal text-[#8a9099]">{t.purchasePaymentId}: {rec.paymentId}</p>
                  </div>
                </div>
              );
            })}
            {hasMore && <LoadMoreButton t={t} loading={loading} onClick={loadMore} />}
          </div>
        )}

        <SiteFooter t={t} />
      </div>
    </div>
  );
}

/* ── Coin History ─────────────────────────────────────────────────────── */
type CoinTxnKind = "superGacha" | "gacha" | "once" | "purchased" | "granted" | "expired";
type CoinTxn = {
  id: string;
  kind: CoinTxnKind;
  date: string;
  amount: number;
  sign: "+" | "-";
  currency: "coin" | "point";
  paymentId?: string;
  expires?: string;
};

const COIN_HISTORY_TEMPLATE: Omit<CoinTxn, "id" | "date">[] = [
  { kind: "superGacha", amount: 5000, sign: "-", currency: "coin" },
  { kind: "gacha", amount: 2000, sign: "-", currency: "coin" },
  { kind: "once", amount: 50, sign: "-", currency: "point" },
  { kind: "purchased", amount: 5000, sign: "+", currency: "coin", paymentId: "35812349", expires: "2027/02/03 at 22:14" },
  { kind: "granted", amount: 5000, sign: "+", currency: "point", paymentId: "35812349", expires: "2027/02/03 at 22:14" },
  { kind: "expired", amount: 500, sign: "-", currency: "point" },
];
const COIN_HISTORY: CoinTxn[] = Array.from({ length: 24 }, (_, i) => ({
  id: `c${i + 1}`,
  date: `Feb ${((23 - i + 27) % 28) + 1}, 2026, 22:14`,
  ...COIN_HISTORY_TEMPLATE[i % COIN_HISTORY_TEMPLATE.length],
}));

function CoinHistoryPage({ lang, coins, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; onBack: () => void; onHome: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  // Scroll-driven lazy loading (same as Winning History / My Loot): reveal a
  // batch at a time as the user nears the bottom — no "Load more" button.
  const PAGE = 6;
  const [visible, setVisible] = useState(PAGE);
  const busy = useRef(false);
  const items = COIN_HISTORY.slice(0, visible);
  const hasMore = visible < COIN_HISTORY.length;
  function onCoinScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (busy.current || visible >= COIN_HISTORY.length) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      busy.current = true;
      setTimeout(() => {
        setVisible((v) => Math.min(v + PAGE, COIN_HISTORY.length));
        busy.current = false;
      }, 450);
    }
  }
  const clock = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
  );
  const title = (kind: CoinTxnKind) =>
    kind === "superGacha" ? t.chSuperGacha
    : kind === "gacha" ? t.chGacha
    : kind === "once" ? t.chOnceDaily
    : kind === "purchased" ? t.chPurchased
    : kind === "granted" ? t.chGranted
    : t.chExpired;
  const sub = (kind: CoinTxnKind) => (kind === "superGacha" || kind === "gacha" ? t.ch10Pull : null);
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Title row */}
      <div className="shrink-0 flex items-center gap-2 border-b border-black/10 bg-white px-4 py-3">
        <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1d2129]">{t.coinHistoryTitle}</h1>
      </div>

      <div onScroll={onCoinScroll} className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {/* Balance summary */}
        <div className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <div className="flex items-stretch">
            <div className="flex-1 pr-3">
              <p className="text-[20px] font-bold text-[#5c626b]">{t.chOripaCoins}</p>
              <div className="mt-1 flex items-center gap-2">
                <CoinIcon size={22} />
                <span className="text-[25px] font-bold text-[#1d2129]">{coins.toLocaleString()}</span>
                <button onClick={onOpenStore} aria-label={t.addCoinsAria} className="flex h-[22px] w-[22px] items-center justify-center transition active:scale-95">
                  <img src="/plus-sign.png" alt="" className="h-full w-full object-contain" draggable={false} />
                </button>
              </div>
            </div>
            <div className="w-px bg-black/10" />
            <div className="flex-1 pl-3">
              <p className="text-[20px] font-bold text-[#5c626b]">{t.chFreePoints}</p>
              <div className="mt-1 flex items-center gap-2">
                <GemIcon size={22} />
                <span className="text-[25px] font-bold text-[#1d2129]">10,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <p className="px-1 py-2.5 text-[10px] font-normal text-[#8a9099]">{t.chNote}</p>

        {/* Transactions */}
        <div className="space-y-2 pb-6">
          {items.map((tx, i) => {
            const isCoin = tx.currency === "coin";
            const positive = tx.sign === "+";
            const amountColor = !isCoin ? "#2f6fed" : positive ? "#E8890C" : "#1d2129";
            const subLabel = sub(tx.kind);
            return (
              <div key={tx.id} className="animate-fade-slide rounded-xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.07)]" style={{ animationDelay: `${(i % PAGE) * 70}ms` }}>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#8a9099]">
                  {clock}
                  {tx.date}
                </div>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#1d2129]">{title(tx.kind)}</p>
                    {subLabel && <p className="text-[10px] font-normal text-[#8a9099]">{subLabel}</p>}
                    {tx.paymentId && <p className="text-[10px] font-normal text-[#8a9099]">{t.chPaymentId}: {tx.paymentId}</p>}
                    {tx.expires && <p className="text-[10px] font-normal text-[#8a9099]">{t.chExpiresOn} {tx.expires}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isCoin ? <CoinIcon size={18} /> : <GemIcon size={18} />}
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: amountColor }}>
                      {tx.sign}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[12px] font-semibold text-[#8a9099]">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#D10005] border-t-transparent" />
            {t.loadingMore}
          </div>
        ) : (
          <SiteFooter t={t} />
        )}
      </div>
    </div>
  );
}

/* ── Store catalog lives in ./store-page (PointPackage imported above) ── */

function StorePage({
  lang,
  coins,
  setCoins,
  onBack,
  onHome,
  onOpenStore,
  onRequireKyc,
  onDrawItem,
}: {
  lang: Lang;
  coins: number;
  setCoins: Dispatch<SetStateAction<number>>;
  onBack: () => void;
  onHome?: () => void;
  onOpenStore?: () => void;
  onRequireKyc?: () => boolean;
  onDrawItem?: (item: OripaItem) => void;
}) {
  const t = STR[lang];
  const openLegal = useContext(LegalNavContext);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  return (
    <CashierLegalContext.Provider value={openLegal}>
      <StorePageView
        lang={lang}
        coins={coins}
        setCoins={setCoins}
        onBack={onBack}
        chrome={{
          header: <AppHeader coins={coins} t={t} onHome={onHome ?? onBack} onOpenStore={onOpenStore} />,
          footer: <SiteFooter t={t} />,
          checkout: ({ pkg, onComplete, onClose }) => (
            <PurchaseFlow
              pkg={pkg}
              lang={lang}
              onComplete={onComplete}
              onClose={onClose}
              savedCards={savedCards}
              onSaveCard={(card) => setSavedCards((prev) => [card, ...prev])}
              onDeleteCard={(idx) => setSavedCards((prev) => prev.filter((_, i) => i !== idx))}
              onRequireKyc={onRequireKyc}
              onDrawItem={onDrawItem}
            />
          ),
        }}
      />
    </CashierLegalContext.Provider>
  );
}

export function PhoneApp({ lang, noHistory, onScreenChange, initialKycScenario = "happy", freeShipAvailable = true, onDrawResultsChange }: {
  lang: Lang; noHistory: boolean; onScreenChange?: (s: Screen) => void; initialKycScenario?: KycScenario; freeShipAvailable?: boolean; onDrawResultsChange?: (open: boolean) => void;
}) {
  const t = STR[lang];
  const [screen, setScreen] = useState<Screen>("landing");
  const [prevScreen, setPrevScreen] = useState<Screen>("oripa");
  const [lineLoginToast, setLineLoginToast] = useState(false);
  // Surface the active screen so the review comments panel can scope itself.
  useEffect(() => { onScreenChange?.(screen); }, [screen, onScreenChange]);
  useEffect(() => {
    if (!lineLoginToast) return;
    const timer = setTimeout(() => setLineLoginToast(false), 10000);
    return () => clearTimeout(timer);
  }, [lineLoginToast]);
  // Deep link: a `?screen=` param (used by Slack comment links) opens the app
  // directly on that screen so reviewers land where the comment was left.
  useEffect(() => {
    let alive = true;
    const applyDeepLink = async () => {
      // Yield once so this isn't a synchronous setState within the effect.
      await Promise.resolve();
      if (!alive) return;
      const valid: Screen[] = ["landing", "signup", "login", "oripa", "notifications", "prizeHistory", "myLoot", "purchaseHistory", "shippingAddress", "quest", "store", "coinHistory", "mypage", "profile"];
      const target = new URLSearchParams(window.location.search).get("screen");
      if (target && valid.includes(target as Screen)) setScreen(target as Screen);
    };
    applyDeepLink();
    return () => {
      alive = false;
    };
  }, []);
  // Prize History adjusts `coins` when exchanging prizes / paying shipping fees.
  const [coins, setCoins] = useState(10000);
  // Shared display name between My Account and My Profile.
  const [displayName, setDisplayName] = useState(() => {
    try {
      const auth = JSON.parse(sessionStorage.getItem("authData") || "{}");
      return (auth.displayName as string) || "";
    } catch {
      return "";
    }
  });
  // Shipping addresses are shared between the Shipping Address page and the
  // in-flow "request shipping" address picker.
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddr[]>([]);
  // KYC / identity verification launched from My Profile → Verification Status.
  const [kyc, setKyc] = useState<KycState>(() => {
    const base = createDefaultKycState(initialKycScenario);
    try {
      const saved = sessionStorage.getItem(KYC_SESSION_KEY);
      if (saved) return { ...base, ...JSON.parse(saved), scenario: initialKycScenario };
      const profile = JSON.parse(sessionStorage.getItem("profileForm") || "{}");
      const auth = JSON.parse(sessionStorage.getItem("authData") || "{}");
      return {
        ...base,
        details: {
          ...base.details,
          lastName: profile.lastName || base.details.lastName,
          firstName: profile.firstName || base.details.firstName,
          lastNameKana: profile.lastNameKana || base.details.lastNameKana,
          firstNameKana: profile.firstNameKana || base.details.firstNameKana,
          email: profile.email || auth.email || base.details.email,
          dob: profile.dob || auth.dob || base.details.dob,
          postalCode: profile.postalCode || base.details.postalCode,
          prefecture: profile.prefecture || profile.state || base.details.prefecture,
          city: profile.city || base.details.city,
          street: profile.cityStreetNumber || base.details.street,
          streetNumber: profile.streetNumber || base.details.streetNumber,
          apartment: profile.apartment || base.details.apartment,
          country: profile.country === "usa" ? "United States" : base.details.country,
        },
      };
    } catch {
      return base;
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(KYC_SESSION_KEY, JSON.stringify(kyc)); } catch {}
  }, [kyc]);
  const kycComplete = kyc.poiStatus === "approved" && kyc.poaStatus === "approved";
  const requestKyc = (context: KycEntryContext) => {
    if (kyc.scenario === "none") return true;
    if (kycComplete) return true;
    setKyc((current) => ({
      ...current,
      entryContext: context,
      activeScreen:
        current.poiStatus === "needsAttention" ? "identityAttention"
        : current.poiStatus === "inProgress" ? "identityProgress"
        : current.poiStatus === "approved" && current.poaStatus === "needsAttention" ? "poaAttention"
        : current.poiStatus === "approved" && current.poaStatus === "inProgress" ? "poaProgress"
        : current.poiStatus === "approved" ? "beforeStart"
        : "required",
    }));
    return false;
  };
  const exitKycToLobby = () => {
    setKyc((current) => ({ ...current, activeScreen: null }));
    setScreen("oripa");
  };
  const [notifOnly, setNotifOnly] = useState<"you" | "notice" | undefined>(undefined);
  const goHome = () => setScreen("oripa");
  // PROD: login/sign-up land straight on the lobby (no onboarding flow).
  const enterHome = (method?: "line") => {
    setScreen("oripa");
    if (method === "line") setLineLoginToast(true);
  };
  const logout = () => {
    try {
      sessionStorage.removeItem("authData");
    } catch {}
    setDisplayName("");
    setScreen("landing");
  };
  const openNotifications = () => { setNotifOnly(undefined); setPrevScreen((p) => (screen === "notifications" ? p : screen)); setScreen("notifications"); };
  // My Account → Announcements opens the notifications screen in single-tab
  // "notice" mode and returns to My Account on back.
  const openAnnouncements = () => { setNotifOnly("notice"); setPrevScreen("mypage"); setScreen("notifications"); };
  // My Loot reuses the Winning-history screen filtered to the most valuable
  // cards. It can be opened from the bottom nav or from My Account; back
  // returns to wherever it was opened from.
  const [lootReturn, setLootReturn] = useState<Screen>("oripa");
  const openMyLoot = () => { setLootReturn((p) => (screen === "myLoot" ? p : screen)); setScreen("myLoot"); };
  // Store (coin purchase) can be opened from the header "+" button or the
  // bottom-nav Store tab; back returns to wherever it was opened from.
  const [storeReturn, setStoreReturn] = useState<Screen>("oripa");
  // Bumped only on successful POI+POA completion so Store remounts without the
  // in-progress checkout / payment overlay that triggered KYC.
  const [storeResetToken, setStoreResetToken] = useState(0);
  const openStore = () => { setStoreReturn((p) => (screen === "store" ? p : screen)); setScreen("store"); };
  const returnFromKyc = (_context: KycEntryContext, completed: boolean) => {
    setKyc((current) => ({ ...current, activeScreen: null }));
    // Happy path only: clear pending purchase resume and open a clean Store.
    // Review / attention / cancel / exit keep using onExit and are unchanged.
    if (completed) {
      setStoreResetToken((token) => token + 1);
      openStore();
    } else {
      setScreen("oripa");
    }
  };
  // Coin History opens when the currency balances in the header are tapped;
  // back returns to wherever it was opened from.
  const [coinHistoryReturn, setCoinHistoryReturn] = useState<Screen>("oripa");
  const openCoinHistory = () => { setCoinHistoryReturn((p) => (screen === "coinHistory" ? p : screen)); setScreen("coinHistory"); };
  // Draw screen (gacha pack detail) opens when a lobby pack's Draw / View is
  // tapped; back returns to the lobby.
  const [drawItem, setDrawItem] = useState<OripaItem | null>(null);
  const openDraw = (item: OripaItem) => { setDrawItem(item); setScreen("drawDetail"); };
  // Legal document reader (Terms / Privacy / SCTA), rendered at the app root so
  // it overlays correctly no matter where it's triggered (footer, My Account).
  const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null);
  // Bottom-nav navigation: Oripa (lobby), My Loot, Store and My Account tabs are live.
  const navigate = (s: Screen) => {
    if (s === "oripa") { goHome(); return; }
    if (s === "mypage") { setScreen("mypage"); return; }
    if (s === "prizeHistory") { openMyLoot(); return; }
    if (s === "store") { openStore(); return; }
    // quest tab remains inert.
  };
  const onLanding = screen === "landing" || screen === "signup" || screen === "login";
  const showNav = !onLanding && !kyc.activeScreen;
  return (
    <NotifNavContext.Provider value={onLanding ? () => {} : openNotifications}>
    <CoinHistoryNavContext.Provider value={onLanding ? () => {} : openCoinHistory}>
    <LegalNavContext.Provider value={setLegalDoc}>
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <div className="relative min-h-0 flex-1">
        {/* Keyed on `screen` so each navigation remounts and replays the
            body-only fade/slide-in (headers are excluded per-screen). */}
        <div key={screen} className="h-full">
        {/* Logged-out lobby — V1 homepage layout */}
        {screen === "landing" && <LandingPage lang={lang} onSignUp={() => setScreen("signup")} onLogin={() => setScreen("login")} />}
        {screen === "signup" && (
          <SignupPage
            lang={lang}
            onQuit={() => setScreen("landing")}
            onLogin={() => setScreen("login")}
            onSuccess={() => enterHome()}
          />
        )}
        {screen === "login" && (
          <LoginPage
            lang={lang}
            onSignUp={() => setScreen("signup")}
            onSuccess={(method) => enterHome(method)}
          />
        )}
        {/* Logged-in lobby — V2 format */}
        {screen === "oripa" && <OripaHome lang={lang} coins={coins} onHome={goHome} onOpenStore={openStore} onOpenDraw={openDraw} />}
        {screen === "drawDetail" && drawItem && (
          <DrawDetail
            lang={lang}
            item={drawItem}
            coins={coins}
            onBack={goHome}
            onHome={goHome}
            onOpenStore={openStore}
            freeShipAvailable={freeShipAvailable}
            onResultsChange={onDrawResultsChange}
          />
        )}
        {screen === "notifications" && <NotificationsScreen lang={lang} coins={coins} empty={noHistory} only={notifOnly} onBack={() => setScreen(prevScreen)} onHome={goHome} />}
        {screen === "mypage" && (
          <MyPage
            lang={lang}
            coins={coins}
            displayName={displayName}
            onOpenPrizeHistory={() => setScreen("prizeHistory")}
            onOpenMyLoot={openMyLoot}
            onOpenPurchaseHistory={() => setScreen("purchaseHistory")}
            onOpenAnnouncements={openAnnouncements}
            onOpenShippingAddress={() => setScreen("shippingAddress")}
            onOpenProfile={() => setScreen("profile")}
            onHome={goHome}
            onLogout={logout}
            onOpenStore={openStore}
          />
        )}
        {screen === "profile" && (
          <ProfilePage
            lang={lang}
            coins={coins}
            displayName={displayName}
            onDisplayNameChange={(name) => {
              setDisplayName(name);
              try {
                const auth = JSON.parse(sessionStorage.getItem("authData") || "{}");
                sessionStorage.setItem("authData", JSON.stringify({ ...auth, displayName: name }));
              } catch {}
            }}
            onBack={() => setScreen("mypage")}
            onOpenStore={openStore}
            kyc={kyc}
            onStartKyc={() => { requestKyc("profile"); }}
            chrome={{
              header: <AppHeader coins={coins} t={t} onHome={goHome} onOpenStore={openStore} />,
            }}
          />
        )}
        {screen === "prizeHistory" && (
          <PrizeHistory
            lang={lang}
            coins={coins}
            setCoins={setCoins}
            shippingAddresses={shippingAddresses}
            onShippingAddressesChange={setShippingAddresses}
            onBack={() => setScreen("mypage")}
            onHome={goHome}
            empty={false}
            onGoGacha={goHome}
            onRequestKyc={() => requestKyc("prizeHistory")}
          />
        )}
        {screen === "myLoot" && (
          <PrizeHistory
            lang={lang}
            coins={coins}
            setCoins={setCoins}
            shippingAddresses={shippingAddresses}
            onShippingAddressesChange={setShippingAddresses}
            onBack={() => setScreen(lootReturn)}
            onHome={goHome}
            empty={false}
            onGoGacha={goHome}
            lootMode
            onRequestKyc={() => requestKyc("prizeHistory")}
            freeShipAvailable={freeShipAvailable}
          />
        )}
        {screen === "purchaseHistory" && (
          <PurchaseHistoryPage
            lang={lang}
            coins={coins}
            onBack={() => setScreen("mypage")}
            onHome={goHome}
            empty={noHistory}
            onOpenStore={openStore}
          />
        )}
        {screen === "shippingAddress" && (
          <ShippingAddressPage
            lang={lang}
            coins={coins}
            addresses={shippingAddresses}
            onAddressesChange={setShippingAddresses}
            onBack={() => setScreen("mypage")}
            onHome={goHome}
            onOpenStore={openStore}
          />
        )}
        {screen === "store" && (
          <StorePage
            key={storeResetToken}
            lang={lang}
            coins={coins}
            setCoins={setCoins}
            onBack={() => setScreen(storeReturn)}
            onHome={goHome}
            onOpenStore={openStore}
            onRequireKyc={() => requestKyc("purchase")}
            onDrawItem={openDraw}
          />
        )}
        {screen === "coinHistory" && (
          <CoinHistoryPage
            lang={lang}
            coins={coins}
            onBack={() => setScreen(coinHistoryReturn)}
            onHome={goHome}
            onOpenStore={openStore}
          />
        )}
        </div>
        {legalDoc && <LegalOverlay lang={lang} doc={legalDoc} onClose={() => setLegalDoc(null)} />}
        {lineLoginToast && (
          <div className="absolute bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1d2129] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            <LineAuthIcon size={20} />
            {t.authLineLoginSuccess as string}
          </div>
        )}
        <KycOverlay lang={lang} state={kyc} setState={setKyc} onExit={exitKycToLobby} onContextReturn={returnFromKyc} />
      </div>
      {showNav && <BottomNav screen={screen} t={t} onNavigate={navigate} />}
    </div>
    </LegalNavContext.Provider>
    </CoinHistoryNavContext.Provider>
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
        className="rounded-md bg-[#D10005] px-2.5 py-1 text-[12px] font-extrabold text-white active:scale-[0.97]"
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
