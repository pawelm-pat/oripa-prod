"use client";

import { Fragment, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { APP_VERSION } from "../version";
import type {
  Category,
  Lang,
  DrawCta,
  DrawRequest,
  DrawScenario,
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
import { AuthHeader, SignupPage, LoginPage, LineAuthIcon, LineAuthSheet, DEMO_INR_EMAIL } from "./auth";
import { HOME_SECTIONS, ALL_ORIPA } from "../data/lobby";
import { NOTIF_YOU, NOTIF_NOTICE, NOTIF_UNREAD_TOTAL } from "../data/notifications";
import { LEGAL, type LegalDocKey } from "../data/legal";
import {
  CATEGORIES,
  DAY,
  DEFAULT_SHIPPING_ADDRESSES,
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
import { QuickPurchaseFlow, type QuickPurchasePending, type QuickSavedCard, type IntlCurrencyInfo } from "./quick-purchase";
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

// The weui "arrow-filled" chevron the designs put between a before and after
// amount: square-cut ends and a mitered tip rather than a rounded stroke.
function BalanceArrow({ height = 16, color = "#0F0F0F" }: { height?: number; color?: string }) {
  return (
    <svg aria-hidden="true" width={Math.round((height * 15) / 26)} height={height} viewBox="0 0 15 26" fill="none" className="shrink-0">
      <path d="M2.5 2.5L11.6 13L2.5 23.5" stroke={color} strokeWidth="5" strokeLinecap="butt" strokeLinejoin="miter" />
    </svg>
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
      {/* 24×24 per design. */}
      <img src="/bell-notification.png" alt="" className="h-6 w-6 object-contain" />
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
          {/* Design sizes the coin mark 24×25; its 108×111 art hits that height
              from the width alone. The point mark rides at the same 5:6 ratio to
              the coin as it does in the price block. */}
          <span className="flex items-center gap-1 text-[13px] font-medium text-[#1d2129]">
            <CoinIcon size={24} /> {coins.toLocaleString()}
          </span>
          <span className="h-4 w-px bg-black/15" />
          <span className="flex items-center gap-1 text-[13px] font-medium text-[#1d2129]">
            <GemIcon size={20} /> 10,000
          </span>
        </button>
        {/* 24px badge (the mark ships as a 36px export of a 24px node),
            straddling the pill's right edge. */}
        <button
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="absolute right-0 top-1/2 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center transition active:scale-[0.95]"
        >
          <img src="/plus-sign.png" alt="" className="h-full w-full object-contain" draggable={false} />
        </button>
      </div>
      <BellIcon label={t.notificationsAria} />
    </div>
  );
}

// Section headings reuse the category glyphs, so a section always carries the
// same mark as the category it belongs to.
function sectionIcon(icon: SectionIconKey, red: boolean) {
  // Matches the heading text it sits beside rather than the category bar's ink.
  return catIcon(icon, red ? "#fff" : "#1d2129");
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

// Stacked coin and point prices, drawn to the design's "Price" node: a 137×83
// block with 8px side padding holding two 40px rows 3px apart. The point mark is
// narrower than the coin, so both sit right-aligned in a 36px column and the
// prices beside them start on the same edge.
function PriceStack({ t, showPoint }: { t: Dict; showPoint: boolean }) {
  const row = (icon: React.ReactNode) => (
    <span className="flex h-10 items-center gap-[8.5px]">
      <span className="flex w-9 shrink-0 justify-end">{icon}</span>
      {/* No thousands separator here: the design draws "1000/1回", and a comma's
          tail would sit in the gap the red rule needs. */}
      <span className="flex items-baseline border-b-[3px] border-[#D10005] pb-[3px]">
        <span className="text-[21px] font-extrabold leading-none text-[#1d2129]">{DRAW_PRICE}</span>
        <PerDrawMark height={14.5} alt={t.perDraw} />
      </span>
    </span>
  );
  return (
    <div className="flex shrink-0 flex-col gap-[3px] px-2">
      {row(<CoinIcon size={36} />)}
      {showPoint && row(<GemIcon size={30} />)}
    </div>
  );
}

// Search magnifier, traced from the design's SearchOutlined export: the lens is
// top-left (outer edge on 1, centre 9) and the handle leaves the rim at 45° and
// runs to 22, so the glyph fills its box corner to corner.
function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9.1" cy="9.1" r="7.1" />
      <path d="M14.1 14.1 21 21" />
    </svg>
  );
}

// Solid funnel used by the "Narrow down" control: a full-width bar that tapers
// into a centred stem, per the design's filter glyph.
function FilterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 2.5h17a1 1 0 0 1 1 1v3.3l-6.9 5.8v7.9a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-7.9L2.5 6.8V3.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

// The "per draw" suffix beside a price is a design asset rather than text. It
// sits on the price's baseline at ~95% of its cap height, per the design.
function PerDrawMark({ height, alt }: { height: number; alt: string }) {
  return (
    <img
      src="/per-draw.png"
      alt={alt}
      width={57}
      height={30}
      draggable={false}
      className="ml-[1.5px] w-auto shrink-0 select-none"
      style={{ height, WebkitUserDrag: "none" } as React.CSSProperties}
    />
  );
}

function OripaCard({ item, t, onView, onRequestDraw }: { item: OripaItem; t: Dict; onView?: () => void; /** A tapped CTA draws in place; only the banner opens the pack page. */ onRequestDraw?: (req: Omit<DrawRequest, "token">) => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  // Expired / sold-out packs: greyed artwork, a status label in place of the
  // stock+countdown, and no Draw CTAs (the card still opens the greyed-out draw
  // view on tap). See DRAW-5 / DRAW-4 in the product spec. `soldOut` surfaces
  // "完売しました / Sold Out"; `expired` surfaces "期限切れ / Expired".
  const soldOut = !!item.soldOut;
  const expired = !soldOut && (!!item.expired || item.remaining <= 0);
  const inactive = soldOut || expired;
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${inactive ? "cursor-pointer" : ""}`}
      onClick={inactive ? onView : undefined}
    >
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2.5">
        <TagPill variant="redOutline">{t.tagPopular}</TagPill>
        <TagPill variant="redFill">{t.tagPokemon}</TagPill>
        <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
        <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
      </div>
      {/* Banner opens the draw detail, same as the Draw / View CTAs. Inactive
          (sold-out / expired) cards let the whole card handle the tap (parent
          onClick). Full-bleed: no side or bottom margins — the artwork runs
          edge-to-edge and sits flush against the period bar below. */}
      <div
        className={`mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#ededf0] ${!inactive && onView ? "cursor-pointer" : ""}`}
        onClick={!inactive && onView ? onView : undefined}
      >
        {/* Inactive packs carry the design's desaturated creative; active ones
            show their own art, falling back to the placeholder where a pack has
            none yet. */}
        <img src={inactive ? "/card-banner-inactive.webp" : (item.image ?? "/placeholder-oripa.png")} alt="" className="h-full w-full object-cover" />
      </div>
      {/* A pack that can no longer be drawn has no sales period to announce. */}
      {!inactive && <div className="bg-[#1d1d1d] px-3 py-1 text-center text-[11px] font-bold text-white">{t.periodLabel("2026/01/01")}</div>}
      <div className="flex items-stretch px-3 py-2.5">
        <div className="flex items-center border-r border-dashed border-black/20 pr-3">
          <PriceStack t={t} showPoint={item.gem} />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 pl-3">
          {inactive ? (
            // Status label sized to the design's node: Hug 120×24, centred.
            // 20px with no extra tracking makes the six-character Japanese
            // label hug exactly 120px, as in the export.
            <span className="mx-auto flex h-[24px] w-[120px] items-center justify-center text-[20px] font-extrabold leading-none text-[#D10005]">{soldOut ? t.soldOutLabel : t.expiredLabel}</span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      {!inactive && onRequestDraw && (
        <div className="px-3 pb-3">
          <DrawCtaRow variant={item.cta ?? "all"} t={t} onRequest={onRequestDraw} compact />
        </div>
      )}
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

// Category art from the design set. Each file is a single-colour glyph with its
// counters knocked out to transparency, so one asset can be tinted for both the
// resting (black) and active (red) states by using it as a mask.
const CAT_ICON_SRC: Record<string, string> = {
  all: "/cat/all.png",
  new: "/cat/new.png",
  popular: "/cat/hot.png",
  pokemon: "/cat/pokemon.png",
  limited: "/cat/time.png",
  other: "/cat/more.png",
};

function catIcon(key: string, color: string) {
  const src = CAT_ICON_SRC[key] ?? CAT_ICON_SRC.other;
  // The "All" glyph is drawn smaller than the rest in the design.
  const size = key === "all" ? 18.5 : 21.6;
  const mask = { maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" };
  return <span aria-hidden className="block shrink-0" style={{ width: size, height: size, backgroundColor: color, ...mask } as React.CSSProperties} />;
}

// Legal document reader (Terms of Use, Privacy Policy, SCTA notation).
// Opened from the footer links and the My Account "Other" section.
// Body lines starting with "## " render as section headings.
function LegalOverlay({ lang, doc, onClose }: { lang: Lang; doc: LegalDocKey; onClose: () => void }) {
  const { title, body } = LEGAL[lang][doc];
  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onClose}>
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
      <img src="/oripa-logo.png" alt="オリパロット" className="h-8 w-auto" />
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
   over a sectioned feed. A bottom sheet holds search + quick filters. All
   filtering / sorting is client-side (POC data). */
const LOBBY_NAV_STR = {
  en: {
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
    cost: "Cost",
    pokemonHeading: "Pokemon",
    filterTags: [["popular", "Popular"], ["pokemon", "Pokemon"], ["psa10", "PSA 10 Guaranteed"], ["limit1", "Limited to 1 per day"], ["gvalue", "Guaranteed Value"], ["min60", "Minimum Guarantee of 60% or more"], ["campaign", "Campaign"], ["endsoon", "End soon"], ["ranklimited", "Rank Limited"], ["lastone", "Last One Prize"]] as [string, string][],
    pokemonTags: [["pikachu", "Pikachu"], ["lillie", "Lillie"], ["umbreon", "Umbreon"], ["gengar", "Gengar"], ["charizard", "Charizard"]] as [string, string][],
    sorts: [["rec", "Recommended order"], ["popular", "Most popular"], ["new", "Newest"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"]] as [string, string][],
    quickOpts: [["popular", "Most popular"], ["newarrivals", "New Arrivals"], ["fewleft", "Only a few left"], ["psa10", "PSA10 confirmed"], ["guarantee60", "High return"], ["pokemon", "Pokémon"], ["onepiece", "One Piece"], ["box", "BOX"]] as [string, string][],
  },
  ja: {
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
    cost: "価格帯",
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

// Price-range filter scale. The track is divided into equal visual segments
// between these labelled stops (so the low end is more granular). The last
// stop (20,000) is treated as "20,000+" — everything at or above shows.
const PRICE_STOPS = [0, 100, 500, 1000, 5000, 10000, 20000];
const PRICE_TOP = 20000;      // slider ceiling; >= this means "20,000+"
const PRICE_MAX = 999999;     // keyboard cap and the "all above" sentinel for max

function pricePctToVal(pct: number): number {
  const p = Math.min(Math.max(pct, 0), 100) / 100;
  const seg = p * (PRICE_STOPS.length - 1);
  const i = Math.min(Math.floor(seg), PRICE_STOPS.length - 2);
  const frac = seg - i;
  return Math.round(PRICE_STOPS[i] + (PRICE_STOPS[i + 1] - PRICE_STOPS[i]) * frac);
}
function priceValToPct(v: number): number {
  if (v <= 0) return 0;
  if (v >= PRICE_TOP) return 100;
  for (let i = 0; i < PRICE_STOPS.length - 1; i++) {
    if (v <= PRICE_STOPS[i + 1]) {
      const frac = (v - PRICE_STOPS[i]) / (PRICE_STOPS[i + 1] - PRICE_STOPS[i]);
      return ((i + frac) / (PRICE_STOPS.length - 1)) * 100;
    }
  }
  return 100;
}

const PRICE_BOX_CLS = "h-[22px] w-[100px] rounded-[4px] border-[1.5px] border-[#cfcfcf] text-center text-[13px] font-bold leading-none text-[#0F0F0F] focus:border-[#D10005] focus:outline-none";

// Dual-handle price slider with keyboard-editable min/max boxes (0–999,999).
// Built from pointer events (not overlapping native range inputs, which fight
// the controlled re-render and trap the max handle at the far right). The track
// and the value ticks are clickable, and a drag always moves the nearest handle
// so either end can be pulled back.
function PriceRangeFilter({ label, min, max, onMin, onMax }: { label: string; min: number; max: number; onMin: (v: number) => void; onMax: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<null | "min" | "max">(null);
  const minPct = priceValToPct(min);
  const maxPct = priceValToPct(max);
  const parseNum = (s: string) => { const n = parseInt(s.replace(/[^0-9]/g, ""), 10); return isNaN(n) ? 0 : Math.min(n, PRICE_MAX); };
  const ticks: [string, number][] = [["0", 0], ["100", 100], ["500", 500], ["1,000", 1000], ["5,000", 5000], ["10,000", 10000], ["20,000+", PRICE_TOP]];

  const pctFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
  };
  const applyPct = (which: "min" | "max", pct: number) => {
    if (which === "min") onMin(Math.min(pricePctToVal(pct), max));
    else onMax(pct >= 99.9 ? PRICE_MAX : Math.max(pricePctToVal(pct), min));
  };
  // Pick the handle to move: the closer one, but when both sit together choose
  // by side so a handle parked at an end can still be grabbed and dragged away.
  const pickHandle = (pct: number): "min" | "max" => {
    const dMin = Math.abs(pct - minPct);
    const dMax = Math.abs(pct - maxPct);
    if (dMin === dMax) return pct < minPct ? "min" : "max";
    return dMin < dMax ? "min" : "max";
  };
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const pct = pctFromX(e.clientX);
    const which = pickHandle(pct);
    dragging.current = which;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
    applyPct(which, pct);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    applyPct(dragging.current, pctFromX(e.clientX));
  };
  const endDrag = () => { dragging.current = null; };
  const clickTick = (stopVal: number) => {
    const pct = priceValToPct(stopVal);
    const which = pickHandle(pct);
    if (which === "min") onMin(Math.min(stopVal, max));
    else onMax(stopVal >= PRICE_TOP ? PRICE_MAX : Math.max(stopVal, min));
  };

  return (
    <div className="mt-5 select-none">
      <h4 className="mb-2.5 text-[15px] font-extrabold text-[#1d2129]">{label}</h4>
      {/* Min and max sit at the two ends of the row (design: 100×22 boxes with
          the space between them left empty), not stretched to fill it. */}
      <div className="flex items-center justify-between">
        <input
          inputMode="numeric"
          value={min.toLocaleString()}
          onChange={(e) => onMin(Math.min(parseNum(e.target.value), max))}
          className={PRICE_BOX_CLS}
          aria-label={`${label} min`}
        />
        <input
          inputMode="numeric"
          value={max.toLocaleString()}
          onChange={(e) => onMax(Math.max(parseNum(e.target.value), min))}
          className={PRICE_BOX_CLS}
          aria-label={`${label} max`}
        />
      </div>
      {/* Clickable track: tap anywhere to jump the nearest handle, or drag it. */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative mx-2.5 mt-4 h-5 cursor-pointer"
        style={{ touchAction: "none" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#e3e6ea]" />
        <div className="pointer-events-none absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#D10005]" style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
        <span className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#D10005] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ left: `${minPct}%` }} />
        <span className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#D10005] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ left: `${maxPct}%` }} />
      </div>
      <div className="mx-2.5 mt-1.5 flex justify-between text-[13px] font-normal text-[#0F0F0F]">
        {ticks.map(([lbl, val]) => (
          <button key={lbl} type="button" onClick={() => clickTick(val)} className="-mx-0.5 cursor-pointer px-0.5 leading-none active:text-[#D10005]">{lbl}</button>
        ))}
      </div>
    </div>
  );
}

// V2 lobby feed. `onView` (tap on any card) is inert in the logged-in lobby
// and routes to Sign-up on the logged-out landing.
function LobbyNavFeed({ t, lang, query, filters, priceMin, priceMax, onApply, onToggleApplied, onClearAll, onView, onOpenDraw, onRequestDraw }: { t: Dict; lang: Lang; query: string; filters: Record<string, boolean>; priceMin: number; priceMax: number; onApply: (q: string, f: Record<string, boolean>, min: number, max: number) => void; onToggleApplied: (k: string) => void; onClearAll: () => void; onView?: () => void; onOpenDraw?: (item: OripaItem) => void; onRequestDraw?: (item: OripaItem, req: Omit<DrawRequest, "token">) => void }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  const [cat, setCat] = useState("all");
  const [searchActive, setSearchActive] = useState(false);
  const [searchHidden, setSearchHidden] = useState(false);
  // Draft filter state edited inside the search/filter dropdown. Nothing here
  // affects the feed until the "Filter" CTA commits it to the applied props
  // (query / filters / price) that actually drive the results. Seeded from the
  // applied state so returning to the lobby shows what's currently in effect.
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftFilters, setDraftFilters] = useState<Record<string, boolean>>(filters);
  const [draftMin, setDraftMin] = useState(priceMin);
  const [draftMax, setDraftMax] = useState(priceMax);
  // Applied price range (0–999,999; max at 20,000+ means "all above").
  const priceActive = priceMin > 0 || priceMax < PRICE_TOP;
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

  // Draft-side derived values (drive the input + dropdown chips only).
  const draftHasText = draftQuery.trim().length > 0;
  const toggleDraft = (k: string) => setDraftFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  // Commit the draft to the applied filters — this is the only path that
  // actually filters the feed (the "Filter" CTA).
  const applyFilters = () => { onApply(draftQuery, draftFilters, draftMin, draftMax); setSearchActive(false); inputRef.current?.blur(); };
  // Clear everything (draft + applied), used by "Reset", "Clear all" and by a
  // category switch.
  const clearEverything = () => {
    setDraftQuery(""); setDraftFilters({}); setDraftMin(0); setDraftMax(PRICE_MAX);
    onClearAll();
  };
  // The dropdown's "Reset" CTA also dismisses the search, like "Filter" does:
  // both end the editing session, one keeping the draft and one dropping it.
  const resetFilters = () => {
    clearEverything();
    setSearchActive(false);
    inputRef.current?.blur();
  };
  // Remove a single applied filter chip (also drop it from the draft so the two
  // stay in sync when the dropdown is reopened).
  const removeAppliedFilter = (k: string) => {
    onToggleApplied(k);
    setDraftFilters((f) => { const n = { ...f }; delete n[k]; return n; });
  };
  // Clear-text (X) button in the search field: drop the query from both draft
  // and applied immediately, keeping any tag/price filters intact. The field
  // stays open and focused — X empties the text, it doesn't dismiss the search.
  const clearQuery = () => {
    setDraftQuery("");
    onApply("", filters, priceMin, priceMax);
    setSearchActive(true);
    inputRef.current?.focus();
  };

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
    keepVisibleRef.current = hasQuery || filterCount > 0 || searchActive || priceActive;
    if (keepVisibleRef.current) { searchHiddenRef.current = false; setSearchHidden(false); }
  }, [hasQuery, filterCount, searchActive, priceActive]);

  // Close the filter dropdown when clicking/tapping outside of it.
  // We intercept the click in the CAPTURE phase. When the click lands inside
  // the feed (a card behind the dropdown) we swallow it, so the same tap only
  // dismisses the panel and doesn't also trigger the card's Draw/View action.
  // Clicks outside the feed — the app header, the bottom tab bar, the hero —
  // fall through, so those navigation buttons act on the first tap (they just
  // also close the search) instead of needing a second click. Using `click`
  // (not `mousedown`) doesn't block scrolling.
  useEffect(() => {
    if (!searchActive) return;
    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as Node;
      // Inside the search nav (category bar + field + dropdown): handled elsewhere.
      if (searchBoxRef.current && searchBoxRef.current.contains(target)) return;
      setSearchActive(false);
      inputRef.current?.blur();
      // Only cancel the event for clicks within the feed area itself.
      if (rootRef.current && rootRef.current.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [searchActive]);

  // Switching category closes the search dropdown (and blurs the field) so an
  // open search doesn't linger over the new category's feed, and starts the new
  // category unfiltered — a query or tag picked for the previous category would
  // otherwise silently keep trimming this one's feed.
  const selectCat = (key: string) => {
    setSearchActive(false);
    inputRef.current?.blur();
    if (key !== cat) clearEverything();
    setCat(key);
  };

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
    const activeCount = filterCount + (priceActive ? 1 : 0);
    if (activeCount) arr = arr.filter((_, i) => i % (activeCount + 1) !== 0);
    return arr;
  }

  // Tapping a card's artwork opens the pack page; its CTAs draw in place via
  // `onRequestDraw`. The logged-out lobby has neither, so both bridge to
  // sign-up through `onView`.
  const canOpen = !!(onOpenDraw || onView);
  const openCard = (it: OripaItem) => (onOpenDraw ? onOpenDraw(it) : onView?.());
  const full = (it: OripaItem) => (
    <OripaCard
      key={it.id}
      item={it}
      t={t}
      onView={canOpen ? () => openCard(it) : undefined}
      onRequestDraw={canOpen ? (req) => (onRequestDraw ? onRequestDraw(it, req) : onView?.()) : undefined}
    />
  );
  const tagPill = ([key, label]: [string, string]) => {
    const on = !!draftFilters[key];
    return (
      <button
        key={key}
        onClick={() => toggleDraft(key)}
        className={`flex h-[22px] items-center rounded-full border-[1.5px] px-2 text-[13px] font-medium leading-none transition active:scale-95 ${on ? "border-[#D10005] bg-[#D10005] text-white" : "border-[#6F6F6F] bg-white text-[#6F6F6F]"}`}
      >
        {label}
      </button>
    );
  };

  // Promo banner — rendered between the recommended (red) oripas and the rest
  // of the feed. Single banner with dots; swap the placeholder creative for
  // real art later. Only shown to logged-in users (the logged-in lobby passes
  // `onOpenDraw`); the logged-out landing feed omits it.
  const promoBanners = onOpenDraw ? (
    <div className="px-3.5 pt-3"><PromoCarousel /></div>
  ) : null;

  // Sparkle mark that leads the recommended heading. The art is white, so it
  // only belongs on the red section.
  const sparkle = <img src="/sparkle.png" alt="" aria-hidden width={18} height={18} className="shrink-0" draggable={false} />;

  const showResults = hasQuery || filterCount > 0 || priceActive;
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
          // No divider directly after the red recommended block (the promo
          // banners already separate it from the following section).
          const afterRed = i > 0 && HOME_SECTIONS[i - 1].variant === "red";
          if (s.variant === "red") {
            return (
              <div key={s.id}>
                {/* Curved divider into the red section. The curve is a red shape on
                    transparency, so the wrapper carries the nav surface up to the
                    oval — the feed below keeps its own background. */}
                <div className="bg-[#FEFEFE]">
                  <img src="/home-divider-top.png" alt="" className="-mb-px block w-full" />
                </div>
                <section className="bg-[#B40206] px-3.5 pb-6 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-white">{sparkle}{title}</h3>
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
              <div className="mb-2.5 flex items-center">
                <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#1d2129]">{s.icon ? sectionIcon(s.icon, false) : null}{title}</h3>
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
          <div className="bg-[#FEFEFE]">
            <img src="/home-divider-top.png" alt="" className="-mb-px block w-full" />
          </div>
          <section className="bg-[#B40206] px-3.5 pb-6 pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-white">{sparkle}{recTitle}</h3>
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
      {/* Warm the pack artwork behind every card so opening a draw doesn't wait
          on the banner. Low priority keeps it behind the lobby's own images. */}
      <link rel="preload" as="image" href="/draw-banner.webp" fetchPriority="low" />

      {/* Sticky lobby nav: the category bar stays pinned; the search bar
          collapses on scroll-down and expands again on scroll-up. */}
      <div ref={searchBoxRef} className="sticky top-0 z-30 bg-[#FEFEFE]">
      {/* Category bar — icon over label; ALL is a black D-tab flush with the
          left edge, the active category is red with an underline. Sizes follow
          the design: a 73px bar, a 55px square tab, 63.6px item pitch. */}
      <div className="no-scrollbar flex items-stretch overflow-x-auto border-b border-black/10 bg-[#FEFEFE]">
        {catList.map((c) => {
          const on = cat === c.key;
          if (c.key === "all") {
            return (
              <button
                key={c.key}
                onClick={() => selectCat(c.key)}
                aria-pressed={on}
                className="sticky left-0 z-[3] flex shrink-0 items-center bg-[#FEFEFE] pb-[12px] pt-[5px]"
              >
                {/* Content sits a touch left of centre, as in the design — the
                    rounded right edge otherwise pulls it visually right. */}
                <span className="flex h-[55px] w-[55px] flex-col items-center justify-center gap-[4px] rounded-r-full bg-[#0F0F0F] pr-[5px] text-white shadow-[3px_0_12px_rgba(0,0,0,0.18)]">
                  {catIcon("all", "#fff")}
                  <span className="text-[12px] font-medium leading-none">{c.label}</span>
                </span>
              </button>
            );
          }
          const color = on ? "#D10005" : "#0F0F0F";
          return (
            <button
              key={c.key}
              onClick={() => selectCat(c.key)}
              className="relative flex w-[63.6px] shrink-0 flex-col items-center gap-[3px] pt-[12px]"
            >
              {catIcon(c.key, color)}
              <span className="whitespace-nowrap text-[12px] font-medium leading-none" style={{ color }}>{c.label}</span>
              {on && <span className="absolute inset-x-[9px] bottom-[14px] h-[4.5px] bg-[#D10005]" />}
            </button>
          );
        })}
      </div>

      {/* Search bar — collapses to zero height when hidden so nothing peeks
          above the category bar; expands again on scroll-up. */}
      <div
        className="overflow-hidden bg-[#FEFEFE] transition-[max-height] duration-300 ease-out will-change-[max-height]"
        style={{ maxHeight: searchHidden ? 0 : 80 }}
      >
        {/* Inner bar slides as a rigid unit (synced with the wrapper clip) so it
            never appears squished/half-rendered while revealing. */}
        <div
          className="bg-[#FEFEFE] px-3 py-2.5 transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: searchHidden ? "translateY(-100%)" : "translateY(0)" }}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1d2129]">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={draftQuery}
              onFocus={() => { setCat("all"); setSearchActive(true); }}
              onClick={() => { setCat("all"); setSearchActive(true); }}
              onChange={(e) => { setDraftQuery(e.target.value); setSearchActive(true); }}
              placeholder={L.searchPlaceholder}
              className={`w-full rounded-[10px] border-[1.5px] border-[#D10005] bg-white py-3 pl-12 text-[15px] font-medium text-[#1d2129] outline-none placeholder:text-[#9aa0a8] ${draftHasText ? "pr-11" : "pr-3"}`}
            />
            {draftHasText && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clearQuery}
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
        <div className="flex items-center gap-2 bg-[#FEFEFE] px-3 py-2">
          <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
            {activeFilterKeys.map((k) => (
              <button
                key={k}
                onClick={() => removeAppliedFilter(k)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-[#D10005] bg-[#D10005]/[0.08] px-2.5 py-1 text-[12px] font-semibold text-[#D10005] active:scale-95"
              >
                {filterLabel(k)}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            ))}
          </div>
          <button onClick={clearEverything} className="shrink-0 whitespace-nowrap text-[12px] font-extrabold text-[#D10005] underline underline-offset-2 active:opacity-70">{L.clearAll}</button>
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
            <PriceRangeFilter label={L.cost} min={draftMin} max={draftMax} onMin={setDraftMin} onMax={setDraftMax} />
          </div>
          {/* CTAs follow the design's button spec: 39px tall, 8px radius, and a
              2px border on the secondary one. */}
          <div className="flex gap-3 border-t border-black/10 bg-white px-4 py-3">
            <button onClick={resetFilters} className="h-[39px] grow basis-1/2 rounded-lg border-2 border-[#1d2129] bg-white text-[15px] font-bold leading-none text-[#1d2129] active:scale-[0.99]">{L.reset}</button>
            <button onClick={applyFilters} className="h-[39px] grow basis-1/2 rounded-lg bg-[#D10005] text-[15px] font-extrabold leading-none text-white active:scale-[0.99]">{L.filter}</button>
          </div>
        </div>
      )}
      </div>

      {body}
    </div>
  );
}

// The lobby feed runs to a dozen screens, so it carries its own scroll
// indicator down the right edge: the phone mock hides platform scrollbars, and
// macOS overlay bars fade out anyway, leaving no sign the feed continues.
function measureThumb(el: HTMLDivElement) {
  const view = el.clientHeight;
  const total = el.scrollHeight;
  if (total <= view + 4) return null;
  const height = Math.max(36, (view / total) * view);
  return { top: (el.scrollTop / (total - view)) * (view - height), height };
}

function FeedScroller({ scrollElRef, onScroll, children }: { scrollElRef?: RefObject<HTMLDivElement | null>; onScroll?: (el: HTMLDivElement) => void; children: ReactNode }) {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = scrollElRef ?? ownRef;
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);

  // Filters and lazily decoded art change the feed's height under us, so track
  // the sections themselves rather than trusting a one-off measurement. The
  // observer also fires once on observe, which is what sizes the thumb first.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setThumb(measureThumb(el)));
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [ref]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        onScroll={(e) => { onScroll?.(e.currentTarget); setThumb(measureThumb(e.currentTarget)); }}
        className="animate-screen-in no-scrollbar h-full overflow-y-auto"
      >
        {children}
      </div>
      {thumb && (
        <span
          aria-hidden="true"
          // Mid grey rather than a tint of the text colour: the thumb has to
          // stay legible over the white feed and the black footer alike.
          className="pointer-events-none absolute right-[3px] z-40 w-[4px] rounded-full bg-[#8a9099]"
          style={{ top: thumb.top, height: thumb.height }}
        />
      )}
    </div>
  );
}

function OripaHome({ lang, coins, onHome, onOpenStore, onOpenDraw, onRequestDraw, scrollRef, query, filters, priceMin, priceMax, onApply, onToggleApplied, onClearAll }: { lang: Lang; coins: number; onHome: () => void; onOpenStore?: () => void; onOpenDraw?: (item: OripaItem) => void; onRequestDraw?: (item: OripaItem, req: Omit<DrawRequest, "token">) => void; scrollRef?: { current: number }; query: string; filters: Record<string, boolean>; priceMin: number; priceMax: number; onApply: (q: string, f: Record<string, boolean>, min: number, max: number) => void; onToggleApplied: (k: string) => void; onClearAll: () => void }) {
  const t = STR[lang];
  // Preserve the lobby's scroll position across navigation (e.g. opening a draw
  // and coming back) so the user lands where they were, not at the top. The
  // offset lives in a ref owned by the app root, so it survives this screen's
  // remount; we save it on scroll and restore it on mount.
  const scrollElRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollElRef.current;
    if (el && scrollRef) el.scrollTop = scrollRef.current;
  }, [scrollRef]);
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      <FeedScroller scrollElRef={scrollElRef} onScroll={(el) => { if (scrollRef) scrollRef.current = el.scrollTop; }}>
        <HomeHero lang={lang} />

        <LobbyNavFeed t={t} lang={lang} query={query} filters={filters} priceMin={priceMin} priceMax={priceMax} onApply={onApply} onToggleApplied={onToggleApplied} onClearAll={onClearAll} onOpenDraw={onOpenDraw} onRequestDraw={onRequestDraw} />

        <SiteFooter t={t} />
      </FeedScroller>
    </div>
  );
}

/* ── Draw screen (gacha pack detail) ─────────────────────────────────────
   Opened from the lobby when a pack's Draw / View is tapped. Shows the pack
   banner, remaining/period, and the prize line-up by tier (1st = UR / holo,
   2nd = SR / gold, 3rd = N / silver), with a sticky draw CTA. */
const DRAW_PRICE = 1000; // coins per single draw (mirrors the lobby card price)
// Free-point balance shown as the "before" value in the draw-confirmation
// popup (mirrors the static free-point figure shown across the app).
const DRAW_FREE_POINTS = 10000;
const MAX_CUSTOM_DRAW = 100; // cap for the custom-draw quantity stepper
// +5 / +10 / MAX buttons under the custom-draw stepper.
const quickAddCls = "flex h-[30px] w-[94px] shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] border-2 border-[#0F0F0F] bg-white text-[14px] font-bold leading-none text-[#0F0F0F] active:scale-95";

// Beveled tier plate ("1等 / 2등 / 3등") — gold for 1st/2nd, silver for 3rd,
// matching the design's metallic name-plates on the dark prize board.
// Shared shapes for the draw CTA row (see DrawCta variants).
const ctaBase = "flex min-h-[40px] items-center justify-center rounded-md px-2 text-center text-[13px] font-extrabold leading-tight active:scale-[0.98]";
const ctaPrimary = `${ctaBase} bg-[#D10005] text-white`;
const ctaOutline = `${ctaBase} border-2 border-[#D10005] bg-white text-[#1d2129]`;

// The draw CTAs a pack offers. Each pack carries its own variant, so the row a
// lobby card shows is the row its pack page shows. Tapping one doesn't navigate
// anywhere — it asks DrawFlow to open the matching popup. The card renders the
// same row a size down.
function DrawCtaRow({ variant, t, onRequest, compact = false }: { variant: DrawCta; t: Dict; onRequest: (req: Omit<DrawRequest, "token">) => void; compact?: boolean }) {
  const base = compact ? "flex min-h-[32px] items-center justify-center rounded-md px-1.5 text-center text-[12px] font-bold leading-tight active:scale-[0.98]" : ctaBase;
  const primary = compact ? `${base} bg-[#D10005] text-white` : ctaPrimary;
  const outline = compact ? `${base} border-2 border-[#D10005] bg-white text-[#1d2129]` : ctaOutline;
  return (
    <div className="flex gap-2">
      {variant === "all" && (
        <>
          <button onClick={() => onRequest({ kind: "count", count: 1 })} className={`flex-1 ${outline}`}>{t.drawDraw1}</button>
          <button onClick={() => onRequest({ kind: "count", count: 10 })} className={`flex-1 ${primary}`}>{t.drawDrawTen}</button>
          <button onClick={() => onRequest({ kind: "custom" })} className={`flex-1 whitespace-nowrap ${primary}`}>{t.drawDrawCustom}</button>
        </>
      )}
      {variant === "one" && (
        <button onClick={() => onRequest({ kind: "count", count: 1 })} className={`flex-1 ${primary}`}>{t.drawDraw1}</button>
      )}
      {variant === "free" && (
        <button onClick={() => onRequest({ kind: "count", count: 1, free: true })} className={`flex-1 ${outline}`}>{t.btnFree}</button>
      )}
      {variant === "freePending" && (
        <button onClick={() => onRequest({ kind: "line" })} className={`flex-1 ${base} bg-[#01B901] text-white`}>{t.btnLineLink}</button>
      )}
      {variant === "trial" && (
        <>
          {/* "Free Trial" tag straddles the top edge of the free-draws CTA */}
          <div className="relative flex-1">
            <img
              src="/cta/free-trial-tag.png"
              alt={t.btnFreeTrial}
              width={222}
              height={32}
              draggable={false}
              className={`absolute left-1/2 z-[1] max-w-none -translate-x-1/2 select-none ${compact ? "-top-1.5 h-3 w-[83px]" : "-top-2 h-4 w-[111px]"}`}
            />
            <button onClick={() => onRequest({ kind: "count", count: 10, free: true })} className={`w-full ${outline}`}>{t.btnFree10}</button>
          </div>
          <button onClick={() => onRequest({ kind: "count", count: 1 })} className={`flex-1 ${primary}`}>{t.drawDraw1}</button>
        </>
      )}
    </div>
  );
}

// Pack artwork (draw screen and confirmation popups). The intrinsic size is
// declared so the space is reserved on the very first paint — otherwise the
// content below snaps down when the file lands — and the image fades in once
// decoded, including when it comes straight from cache.
function PackBanner({ src, alt, width, height, priority = false }: { src: string; alt: string; width: number; height: number; priority?: boolean }) {
  const [ready, setReady] = useState(false);
  return (
    <span className="relative block w-full overflow-hidden bg-[#20222a]" style={{ aspectRatio: `${width} / ${height}` }}>
      {!ready && <span className="animate-pulse absolute inset-0 bg-gradient-to-br from-[#2b2e38] via-[#20222a] to-[#2b2e38]" />}
      <img
        ref={(el) => { if (el?.complete) setReady(true); }}
        src={src}
        alt={alt}
        width={width}
        height={height}
        draggable={false}
        fetchPriority={priority ? "high" : undefined}
        onLoad={() => setReady(true)}
        className={`absolute inset-0 h-full w-full select-none transition-opacity duration-300 ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ WebkitUserDrag: "none" } as React.CSSProperties}
      />
    </span>
  );
}

function DrawTierLabel({ tier, alt }: { tier: 1 | 2 | 3; alt: string }) {
  return (
    <div className="my-4 flex justify-center">
      <img
        src={`/prize-tier-${tier}.png`}
        alt={alt}
        draggable={false}
        className="h-[52px] w-auto select-none object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}

function DrawTierCard({ rarity, large = false }: { rarity: Rarity; large?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <PrizeArt rarity={rarity} size={large ? 138 : 92} />
    </div>
  );
}

/* ── Draw flow ────────────────────────────────────────────────────────────
   Every popup a draw passes through — the confirmation, the custom-quantity
   sheet, the scenario failures (sold out / connection / stock), the LINE
   prompt and the results screen — lives here rather than on the pack page,
   because a lobby card's CTA opens the same flow without leaving the lobby.
   Hosts mount it as an overlay (the parent must be positioned) and ask for a
   draw by passing a `request`; it renders nothing while idle. */
function DrawFlow({ lang, item, coins, request, soldOut = false, onSoldOut, freeShipAvailable = true, onResultsChange, shippingAddresses, onShippingAddressesChange, dailyLimitReached = false, drawScenario = "off", multiCurrency = true, onHome, onOpenStore, onOpenDraw, onAttemptPaidDraw, onTopUp, pendingConfirm, onPendingConfirmConsumed }: { lang: Lang; item: OripaItem; coins: number; request: DrawRequest | null; soldOut?: boolean; /** The sold-out popup was dismissed, so the host can latch its greyed state. */ onSoldOut?: () => void; freeShipAvailable?: boolean; onResultsChange?: (open: boolean) => void; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; dailyLimitReached?: boolean; drawScenario?: DrawScenario; multiCurrency?: boolean; onHome: () => void; onOpenStore?: () => void; onOpenDraw?: (item: OripaItem) => void; /** Returns true if coins were debited and the draw may proceed; false if Quick Purchase opened. */ onAttemptPaidDraw?: (count: number) => boolean; /** The confirmation's Charge/Top Up CTA: open the store for a draw the wallet can't cover. */ onTopUp?: (count: number) => void; /** After Quick Purchase success, host re-opens this count's confirmation. */ pendingConfirm?: { count: number; token: number } | null; onPendingConfirmConsumed?: () => void }) {
  const t = STR[lang];
  // Opens a stored legal document (T&Cs, etc.) in the shared overlay.
  const openLegal = useContext(LegalNavContext);
  // Draw demo scenarios (dev harness): expired pack, connection error, or
  // insufficient remaining stock.
  const expired = drawScenario === "expired";
  const connError = drawScenario === "connError";
  const insufficientStock = drawScenario === "stock";
  // In the insufficient-stock scenario only this many draws remain.
  const STOCK_LEFT = 8;
  // "Expired" popup, shown when an expired pack's draw is confirmed.
  const [expiredPopup, setExpiredPopup] = useState(false);
  // Connection-error popup (simulated network failure) + the draw count to
  // retry when the user taps Retry.
  const [connErrorPopup, setConnErrorPopup] = useState(false);
  const [retryCount, setRetryCount] = useState(1);
  // Insufficient-stock popup + the count the user attempted (to show the
  // original vs. remaining cost).
  const [stockPopup, setStockPopup] = useState(false);
  const [stockReqCount, setStockReqCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  // Draw-confirmation popup: holds the requested draw count while open.
  const [confirmCount, setConfirmCount] = useState<number | null>(null);
  // Set when the pending confirmation came from a free-draw CTA: the popup then
  // costs nothing, so it shows no balances and confirms as a free draw.
  const [confirmFree, setConfirmFree] = useState(false);
  // LINE account-link prompt shown by the "link required" CTA: allowing it
  // grants the free draw, cancelling returns to this pack.
  const [lineVerify, setLineVerify] = useState(false);
  // Which balance the confirmation popup spends. Only selectable when the pack
  // accepts both currencies; coins-only packs always pay with coins.
  const [payWith, setPayWith] = useState<"coins" | "points">("coins");
  const payCurrency = multiCurrency ? payWith : "coins";
  // Custom-draw popup: quantity stepper (min 1, up to MAX_CUSTOM_DRAW).
  const [customOpen, setCustomOpen] = useState(false);
  const [customQty, setCustomQty] = useState(1);
  // Dismissing a draw popup keeps it mounted for the length of the exit
  // animation. Confirming a draw skips this so the roll isn't held up.
  const [sheetClosing, setSheetClosing] = useState(false);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  useEffect(() => () => { if (sheetTimer.current) clearTimeout(sheetTimer.current); }, []);

  function closeSheet() {
    const done = () => { setSheetClosing(false); setConfirmCount(null); setCustomOpen(false); };
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return; }
    setSheetClosing(true);
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
    sheetTimer.current = setTimeout(done, 180);
  }

  // Surface whether the draw-results overlay is open so the harness can show
  // the Free-shipping toggle only on the results screen (not draw selection).
  useEffect(() => { onResultsChange?.(results !== null); }, [results, onResultsChange]);
  useEffect(() => () => { onResultsChange?.(false); }, [onResultsChange]);

  function draw(count: number, free = false) {
    if (soldOut) return;
    // Insufficient stock: asking for more than what's left prompts the
    // "draw remaining" popup instead of the normal confirmation.
    if (insufficientStock && count > STOCK_LEFT) { setStockReqCount(count); setStockPopup(true); return; }
    // Open the confirmation popup; coin check / Quick Purchase happens on confirm.
    setSheetClosing(false);
    setConfirmFree(free);
    setConfirmCount(count);
  }

  // Roll `count` cards and show the results (list mode) screen.
  function runDraw(count: number) {
    setConfirmCount(null);
    setCustomOpen(false);
    setResults(generateDraw(count));
    setResultsRun((r) => r + 1);
  }

  // The host resumes an interrupted draw once Quick Purchase has credited the
  // coins: the user lands back on the confirmation, not on a finished draw.
  const consumedDrawToken = useRef<number | null>(null);
  useEffect(() => {
    if (!pendingConfirm) return;
    if (consumedDrawToken.current === pendingConfirm.token) return;
    consumedDrawToken.current = pendingConfirm.token;
    draw(pendingConfirm.count);
    onPendingConfirmConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to host resume token
  }, [pendingConfirm]);

  function confirmDraw() {
    const count = confirmCount;
    if (count == null) return;
    // Expired pack: the draw fails — show the Sold Out popup instead of results.
    if (expired) { setConfirmCount(null); setExpiredPopup(true); return; }
    // Simulated connection error: show the error popup; Retry re-runs the draw.
    if (connError) { setConfirmCount(null); setRetryCount(count); setConnErrorPopup(true); return; }
    // Free draws and point payments leave the coin balance untouched.
    if (confirmFree || payCurrency === "points") { runDraw(count); return; }
    // Paid draw: debit via host (or open Quick Purchase if short).
    if (onAttemptPaidDraw) {
      setConfirmCount(null);
      if (!onAttemptPaidDraw(count)) return;
      runDraw(count);
      return;
    }
    if (coins < DRAW_PRICE * count) { pushToast(t.drawInsufficient); return; }
    runDraw(count);
  }

  function openCustom() {
    if (soldOut) return;
    setSheetClosing(false);
    setCustomQty(1);
    setCustomOpen(true);
  }
  const setQty = (n: number) => setCustomQty(() => Math.min(MAX_CUSTOM_DRAW, Math.max(1, n)));

  // A tapped CTA (lobby card or pack page) arrives as a request; the token
  // distinguishes repeat taps of the same CTA. Applied while rendering rather
  // than in an effect so the popup appears in the same commit as the tap.
  const [handledToken, setHandledToken] = useState<number | null>(null);
  if (request && request.token !== handledToken) {
    setHandledToken(request.token);
    if (request.kind === "custom") openCustom();
    else if (request.kind === "line") setLineVerify(true);
    else draw(request.count ?? 1, request.free);
  }

  function confirmCustomDraw() {
    if (expired) { setCustomOpen(false); setExpiredPopup(true); return; }
    if (connError) { setCustomOpen(false); setRetryCount(customQty); setConnErrorPopup(true); return; }
    if (insufficientStock && customQty > STOCK_LEFT) { setCustomOpen(false); setStockReqCount(customQty); setStockPopup(true); return; }
    // Paying with free points leaves the coin balance untouched.
    if (payCurrency === "points") { runDraw(customQty); return; }
    if (onAttemptPaidDraw) {
      setCustomOpen(false);
      if (!onAttemptPaidDraw(customQty)) return;
      runDraw(customQty);
      return;
    }
    if (coins < DRAW_PRICE * customQty) { pushToast(t.drawInsufficient); return; }
    runDraw(customQty);
  }

  // Balance change for a draw of `count` — coins and free points shown as
  // current → after-draw. When the pack accepts both currencies each row is a
  // radio option (highlighted by its border) and only the chosen balance is
  // spent; the other stays greyed out and unchanged.
  function balanceRows(count: number) {
    const cost = DRAW_PRICE * count;
    const rows = [
      { key: "coins" as const, Icon: CoinIcon, balance: coins },
      { key: "points" as const, Icon: GemIcon, balance: DRAW_FREE_POINTS },
    ].filter((r) => multiCurrency || r.key === "coins");
    return (
      <div className="mt-3.5 space-y-2" role={multiCurrency ? "radiogroup" : undefined} aria-label={multiCurrency ? t.drawPayWith : undefined}>
        {rows.map(({ key, Icon, balance }) => {
          const selected = payCurrency === key;
          const after = balance - cost;
          const body = (
            <>
              <span className="flex items-center gap-2"><Icon size={30} /><span className={`text-[20px] font-extrabold leading-none ${selected ? "text-[#0F0F0F]" : "text-[#8a9099]"}`}>{balance.toLocaleString()}</span></span>
              <BalanceArrow color={selected ? "#0F0F0F" : "#b8bdc4"} />
              <span className="flex items-center gap-2"><Icon size={30} /><span className="text-[20px] font-extrabold leading-none" style={{ color: selected ? "#D10005" : "#b8bdc4" }}>{(selected ? after : balance).toLocaleString()}</span></span>
            </>
          );
          // 352×38 with an 8px radius in the design; the CTAs below use the same
          // 39px/8px box. With a single currency there is nothing to choose, so
          // the row gets a neutral border instead of the red "selected" one.
          const shell = `flex h-[39px] w-full items-center justify-center gap-3 rounded-lg border-2 ${
            !multiCurrency
              ? "border-[#e8eaee] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : selected
                ? "border-[#D10005] bg-white"
                : "border-transparent bg-[#f2f3f5]"
          }`;
          return multiCurrency ? (
            <button key={key} type="button" role="radio" aria-checked={selected} onClick={() => setPayWith(key)} className={shell}>
              {body}
            </button>
          ) : (
            <div key={key} className={shell}>{body}</div>
          );
        })}
      </div>
    );
  }

  // A draw that costs more than the wallet holds keeps its confirmation open:
  // the shortfall is spelled out under the balance and the confirm CTA becomes
  // the store, so topping up stays a choice. Free points have no top-up path,
  // so paying with them keeps the normal CTA.
  const shortfallFor = (count: number) => (payCurrency === "coins" ? Math.max(0, DRAW_PRICE * count - coins) : 0);
  const shortfallNote = (amount: number) => (
    <p className="mx-auto mt-3 max-w-[300px] text-center text-[13px] font-medium leading-[1.45] text-[#D10005]">
      {t.noCoinsShortPre}
      <span className="font-extrabold">{t.noCoinsShortAmount(amount.toLocaleString())}</span>
      {t.noCoinsShortPost}
    </p>
  );
  function requestTopUp(count: number) {
    closeSheet();
    // Without a host store the shortfall popup is the only route left.
    if (onTopUp) onTopUp(count);
    else onAttemptPaidDraw?.(count);
  }
  const confirmShort = confirmCount != null && !confirmFree ? shortfallFor(confirmCount) : 0;
  const customShort = customOpen ? shortfallFor(customQty) : 0;

  return (
    <>
      {/* Draw-confirmation popup */}
      {confirmCount != null && (
        <div
          className={`absolute inset-0 z-[60] flex items-center justify-center p-4 ${sheetClosing ? "animate-popup-backdrop-out" : "animate-popup-backdrop"}`}
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={closeSheet}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`no-scrollbar flex max-h-full w-full max-w-[380px] flex-col overflow-y-auto bg-white shadow-[0_18px_50px_rgba(0,0,0,0.5)] ${sheetClosing ? "animate-sheet-out" : "animate-sheet-in"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Intrinsic size reserves the banner's space so the panel doesn't
                resize under the entry animation while the art decodes. */}
            <PackBanner src="/draw-banner-modal.webp" alt={t.drawPackSubtitle} width={748} height={561} priority />

            <div className="animate-sheet-body px-4 pb-4 pt-3.5">
              <h3 className="text-center text-[18px] font-bold text-[#0F0F0F]">{locTitle(item, lang)}</h3>
              <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#0F0F0F]">{confirmFree ? t.drawConfirmDescFree : t.drawConfirmDesc}</p>

              {!confirmFree && balanceRows(confirmCount)}

              {confirmShort > 0 && shortfallNote(confirmShort)}

              {/* Confirm CTA — primary (red), fixed 39px / 8px radius per design.
                  Short of coins it charges the wallet instead of drawing. */}
              <button
                onClick={confirmShort > 0 ? () => requestTopUp(confirmCount) : confirmDraw}
                className="mt-3.5 flex h-[39px] w-full items-center justify-center rounded-lg bg-[#D10005] text-[15px] font-extrabold text-white active:scale-[0.98]"
              >
                {/* Counts other than 1 or 10 reach here when a top-up resumes a
                    custom draw, so the label is built from the count. */}
                {confirmShort > 0 ? t.noCoinsCta : confirmFree ? (confirmCount === 1 ? t.btnFree : t.btnFree10) : t.drawCustomCta(confirmCount)}
              </button>

              {/* Dashed divider */}
              <div className="my-3.5 border-t border-dashed border-black/20" />

              {/* Cancel — secondary (2px grey outline), fixed 39px / 8px radius */}
              <button
                onClick={closeSheet}
                className="flex h-[39px] w-full items-center justify-center rounded-lg border-2 border-[#82878f] bg-white text-[15px] font-bold text-[#6b7078] active:scale-[0.98]"
              >
                {t.cancel}
              </button>

              {/* Terms */}
              <p className="mt-3 text-center text-[12px] font-semibold text-[#0F0F0F]">
                {t.drawConfirmTerms}{" "}
                <button onClick={() => openLegal("terms")} className="font-bold text-[#D10005] underline decoration-[#D10005] underline-offset-2">
                  {t.drawConfirmTermsLink}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom-draw popup — quantity stepper + quick-add + dynamic cost/CTA */}
      {customOpen && (
        <div
          className={`absolute inset-0 z-[60] flex items-center justify-center p-4 ${sheetClosing ? "animate-popup-backdrop-out" : "animate-popup-backdrop"}`}
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={closeSheet}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`no-scrollbar flex max-h-full w-full max-w-[380px] flex-col overflow-y-auto bg-white shadow-[0_18px_50px_rgba(0,0,0,0.5)] ${sheetClosing ? "animate-sheet-out" : "animate-sheet-in"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <PackBanner src="/draw-banner-modal.webp" alt={t.drawPackSubtitle} width={748} height={561} priority />

            <div className="animate-sheet-body px-4 pb-4 pt-3.5">
              <h3 className="text-center text-[18px] font-bold text-[#0F0F0F]">{locTitle(item, lang)}</h3>
              <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#0F0F0F]">{t.drawConfirmDesc}</p>

              {/* Quantity stepper */}
              <div className="mt-3.5 flex h-[60px] items-center justify-center gap-2">
                <button
                  onClick={() => setQty(customQty - 1)}
                  disabled={customQty <= 1}
                  aria-label="decrease"
                  className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full bg-[#8f959d] text-white active:scale-95 disabled:opacity-40"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M2.5 7.5h10" /></svg>
                </button>
                <div className="flex h-[60px] w-[160px] items-center justify-center rounded-lg border border-[#e7e7e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <span className="text-[50px] font-black leading-none text-[#0F0F0F]">{customQty}</span>
                </div>
                <button
                  onClick={() => setQty(customQty + 1)}
                  disabled={customQty >= MAX_CUSTOM_DRAW}
                  aria-label="increase"
                  className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full bg-[#D10005] text-white active:scale-95 disabled:opacity-40"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M7.5 2.5v10M2.5 7.5h10" /></svg>
                </button>
              </div>

              {/* Quick-add — the design fixes all three to 94x30 with a 10px
                  gap, so the row keeps its shape whatever the labels read. */}
              <div className="mt-3 flex items-center justify-center gap-[10px]">
                <button onClick={() => setQty(customQty + 5)} className={quickAddCls}>{t.drawCustomAdd(5)}</button>
                <button onClick={() => setQty(customQty + 10)} className={quickAddCls}>{t.drawCustomAdd(10)}</button>
                <button onClick={() => setQty(MAX_CUSTOM_DRAW)} className={quickAddCls}>{t.drawCustomMax}</button>
              </div>

              {/* Balances — same selectable rows as the fixed-count popup */}
              {balanceRows(customQty)}

              {customShort > 0 && shortfallNote(customShort)}

              {/* Confirm CTA — primary (red), fixed 39px / 8px radius; count in
                  front, or the store when the quantity outruns the balance. */}
              <button
                onClick={customShort > 0 ? () => requestTopUp(customQty) : confirmCustomDraw}
                className="mt-3 flex h-[39px] w-full items-center justify-center rounded-lg bg-[#D10005] text-[15px] font-extrabold text-white active:scale-[0.98]"
              >
                {customShort > 0 ? t.noCoinsCta : t.drawCustomCta(customQty)}
              </button>

              {/* Dashed divider */}
              <div className="my-3.5 border-t border-dashed border-black/20" />

              {/* Cancel — secondary (2px grey outline), fixed 39px / 8px radius */}
              <button
                onClick={closeSheet}
                className="flex h-[39px] w-full items-center justify-center rounded-lg border-2 border-[#82878f] bg-white text-[15px] font-bold text-[#6b7078] active:scale-[0.98]"
              >
                {t.cancel}
              </button>

              {/* Terms — at the very bottom */}
              <p className="mt-3 text-center text-[12px] font-semibold text-[#0F0F0F]">
                {t.drawConfirmTerms}{" "}
                <button onClick={() => openLegal("terms")} className="font-bold text-[#D10005] underline decoration-[#D10005] underline-offset-2">
                  {t.drawConfirmTermsLink}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LINE account-link prompt — the same verification screen as signup.
          Allowing it rolls the free draw straight into the results; cancelling
          drops back onto this pack. */}
      {lineVerify && (
        <LineAuthSheet
          lang={lang}
          signUp={false}
          showAddFriend
          onClose={() => setLineVerify(false)}
          onSuccess={() => { setLineVerify(false); runDraw(1); }}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[70] flex justify-center px-4">
          <div className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">{toast}</div>
        </div>
      )}

      {/* Expired popup — shown when an expired pack's draw is confirmed. Closing
          it latches the greyed-out sold-out state on the draw screen. */}
      {expiredPopup && (
        <div
          className="animate-popup-backdrop absolute inset-0 z-[65] flex items-center justify-center p-4"
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={() => { setExpiredPopup(false); onSoldOut?.(); }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="animate-popup-pop w-full max-w-[340px] rounded-2xl bg-white px-6 pb-6 pt-7 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
            style={{ fontFamily: "var(--font-noto-sans-jp), system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full border-[5px] border-[#D10005]">
              <span className="text-[52px] font-black leading-none text-[#D10005]">!</span>
            </div>
            <h3 className="mt-4 text-[12px] font-medium text-[#1d2129]">{t.expiredTitle}</h3>
            <p className="mx-auto mt-2 max-w-[280px] text-[12px] font-medium leading-relaxed text-[#6b7075]">{t.expiredBody}</p>
            <button
              onClick={() => { setExpiredPopup(false); onSoldOut?.(); }}
              className="mt-5 w-full rounded-[14px] border-[1.5px] border-[#b5b8bd] bg-white py-3.5 text-[15px] font-bold text-[#6b7075] active:scale-[0.98]"
            >
              {t.drawLimitClose}
            </button>
          </div>
        </div>
      )}

      {/* Connection Error popup — simulated network failure on draw. Retry
          re-attempts (and succeeds); Cancel returns to the draw screen. */}
      {connErrorPopup && (
        <div
          className="animate-popup-backdrop absolute inset-0 z-[65] flex items-center justify-center p-4"
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={() => setConnErrorPopup(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="animate-popup-pop w-full max-w-[340px] rounded-2xl bg-white px-6 pb-6 pt-7 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
            style={{ fontFamily: "var(--font-noto-sans-jp), system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full border-[5px] border-[#D10005]">
              <span className="text-[52px] font-black leading-none text-[#D10005]">!</span>
            </div>
            <h3 className="mt-4 text-[22px] font-extrabold text-[#1d2129]">{t.connErrorTitle}</h3>
            <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-[#6b7075]">{t.connErrorBody}</p>
            <button
              onClick={() => {
                setConnErrorPopup(false);
                if (onAttemptPaidDraw) {
                  if (!onAttemptPaidDraw(retryCount)) return;
                }
                runDraw(retryCount);
              }}
              className="mt-5 w-full rounded-[14px] bg-[#D10005] py-3.5 text-[15px] font-extrabold text-white active:scale-[0.98]"
            >
              {t.connErrorRetry}
            </button>
            <button
              onClick={() => setConnErrorPopup(false)}
              className="mt-2.5 w-full rounded-[14px] border-[1.5px] border-[#b5b8bd] bg-white py-3.5 text-[15px] font-bold text-[#6b7075] active:scale-[0.98]"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Insufficient Stock popup — the requested count exceeds what's left.
          "Draw Remaining" rolls the remaining stock; Cancel returns. */}
      {stockPopup && (
        <div
          className="animate-popup-backdrop absolute inset-0 z-[65] flex items-center justify-center p-4"
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={() => setStockPopup(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="animate-popup-pop w-full max-w-[340px] rounded-2xl bg-white px-6 pb-6 pt-7 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
            style={{ fontFamily: "var(--font-noto-sans-jp), system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full border-[5px] border-[#D10005]">
              <span className="text-[52px] font-black leading-none text-[#D10005]">!</span>
            </div>
            <h3 className="mt-4 text-[22px] font-extrabold text-[#1d2129]">{t.stockTitle}</h3>
            <p className="mx-auto mt-2 max-w-[290px] text-[13px] leading-relaxed text-[#6b7075]">{t.stockBody(STOCK_LEFT)}</p>
            {/* Original requested cost → remaining (M) draw cost */}
            {/* 38px pill in the design; it only grows when the cost label wraps. */}
            <div className="mt-4 flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#e7e7e7] bg-white px-2 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <CoinIcon size={26} />
              <span className="text-[20px] font-bold leading-none text-[#0F0F0F]">{(DRAW_PRICE * stockReqCount).toLocaleString()}</span>
              <span className="text-[10px] font-bold leading-tight text-[#878787]">{t.stockDrawCost(stockReqCount)}</span>
              <BalanceArrow height={15} />
              <CoinIcon size={26} />
              <span className="text-[20px] font-bold leading-none text-[#D10005]">{(DRAW_PRICE * STOCK_LEFT).toLocaleString()}</span>
            </div>
            {/* Both CTAs are 39px tall with a 6px radius per the button specs. */}
            <button
              onClick={() => {
                setStockPopup(false);
                if (onAttemptPaidDraw) {
                  if (!onAttemptPaidDraw(STOCK_LEFT)) return;
                }
                runDraw(STOCK_LEFT);
              }}
              className="mt-4 flex h-[39px] w-full items-center justify-center rounded-md bg-[#D10005] text-[17px] font-bold leading-none text-white active:scale-[0.98]"
            >
              {t.stockDrawRemaining(STOCK_LEFT)}
            </button>
            <div className="my-3 border-t border-dashed border-black/20" />
            <button
              onClick={() => setStockPopup(false)}
              className="flex h-[39px] w-full items-center justify-center rounded-md border-2 border-[rgba(7,7,7,0.6)] bg-white text-[17px] font-bold leading-none text-[rgba(7,7,7,0.6)] active:scale-[0.98]"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Draw results (list mode) — full-screen overlay above the draw screen */}
      {results && (
        <DrawResults
          key={resultsRun}
          lang={lang}
          coins={coins}
          item={item}
          cards={results}
          dailyLimitReached={dailyLimitReached}
          onOpenDraw={onOpenDraw}
          // "Draw again" (within the daily limit): close the results and
          // re-open the draw-confirmation popup for the same count. Cancelling
          // it leaves the player on the draw screen; confirming rolls again.
          onDrawAgain={() => { const c = results?.length ?? 1; setResults(null); setConfirmCount(c); }}
          // Always lands on this pack's info page, including for draws started
          // from a lobby card (which never left the feed).
          onBackToInfo={() => { setResults(null); onOpenDraw?.(item); }}
          onHome={onHome}
          onOpenStore={onOpenStore}
          freeShipAvailable={freeShipAvailable}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
        />
      )}
    </>
  );
}

// The pack page: artwork, price / stock, prize line-up and the sticky CTA row.
// Drawing itself is delegated to DrawFlow, the same flow a lobby card opens.
function DrawDetail({ lang, item, coins, onBack, onHome, onOpenStore, freeShipAvailable = true, onResultsChange, shippingAddresses, onShippingAddressesChange, dailyLimitReached = false, drawScenario = "off", multiCurrency = true, onOpenDraw, onAttemptPaidDraw, onTopUp, pendingConfirm, onPendingConfirmConsumed }: { lang: Lang; item: OripaItem; coins: number; onBack: () => void; onHome: () => void; onOpenStore?: () => void; freeShipAvailable?: boolean; onResultsChange?: (open: boolean) => void; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; dailyLimitReached?: boolean; drawScenario?: DrawScenario; multiCurrency?: boolean; onOpenDraw?: (item: OripaItem) => void; /** Returns true if coins were debited and the draw may proceed; false if Quick Purchase opened. */ onAttemptPaidDraw?: (count: number) => boolean; /** The confirmation's Charge/Top Up CTA: open the store for a draw the wallet can't cover. */ onTopUp?: (count: number) => void; /** After Quick Purchase success, host re-opens this count's confirmation. */ pendingConfirm?: { count: number; token: number } | null; onPendingConfirmConsumed?: () => void }) {
  const t = STR[lang];
  const openLegal = useContext(LegalNavContext);
  const [cautionOpen, setCautionOpen] = useState(false);
  // What the tapped CTA asked the flow to open.
  const [request, setRequest] = useState<DrawRequest | null>(null);
  const requestDraw = (req: Omit<DrawRequest, "token">) => setRequest({ ...req, token: Date.now() });
  // A failed draw on an expired pack latches the greyed-out sold-out state;
  // `item.expired` packs open that way to begin with.
  const [soldOutHit, setSoldOutHit] = useState(false);
  const soldOut = item.remaining <= 0 || soldOutHit || !!item.expired || !!item.soldOut;
  // Only this many draws remain in the insufficient-stock scenario.
  const remainingShown = soldOut ? 0 : (drawScenario === "stock" ? 8 : item.remaining);
  const pct = soldOut ? 0 : Math.round((remainingShown / item.total) * 100);

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Warm the confirmation banner while the pack page is open so the popup
          never animates in around an empty banner slot. */}
      <link rel="preload" as="image" href="/draw-banner-modal.webp" />

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
        {/* Tags — sit above the banner, as on the lobby card */}
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-1.5 pt-2.5">
          <TagPill variant="redOutline">{t.tagPopular}</TagPill>
          <TagPill variant="redFill">{t.tagPokemon}</TagPill>
          <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
          <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
        </div>

        <div className="px-3">
          {/* Design creative (fiery burst headline + mascot + baked-in sales
              period bar). Sold-out packs are desaturated. The remaining-time
              detail is shown in the price/remaining section below, so no
              separate period box is rendered here. */}
          <div className={soldOut ? "grayscale" : ""}>
            <PackBanner src="/draw-banner.webp" alt={t.drawPackSubtitle} width={748} height={613} priority />
          </div>
        </div>

        {/* Cost + remaining — two columns split by a dashed divider: price per
            draw on the left, stock/countdown on the right (per design). */}
        <div className="mx-3 mt-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-stretch gap-4">
            {/* Left: price per draw (coin + optional free point), red-underlined */}
            <div className="flex items-center">
              <PriceStack t={t} showPoint={multiCurrency} />
            </div>

            {/* Dashed vertical divider */}
            <div className="w-px shrink-0 self-stretch border-l border-dashed border-black/25" />

            {/* Right: remaining count, progress bar, remaining time */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className={`text-[13px] font-bold ${soldOut ? "text-[#D10005]" : "text-[#1d2129]"}`}>{t.remainingLabel}</span>
                <span className="leading-none"><span className={`text-[20px] font-extrabold ${soldOut ? "text-[#D10005]" : "text-[#1d2129]"}`}>{remainingShown}</span><span className="text-[12px] font-bold text-[#8a9099]">/{item.total}</span></span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#D10005]" style={{ width: `${pct}%` }} /></div>
              {soldOut ? (
                <p className="mt-2 text-center text-[15px] font-extrabold text-[#D10005]">{t.soldOutLabel}</p>
              ) : (
                <p className="mt-2 flex items-baseline justify-center gap-1 text-[#D10005]">
                  <span className="text-[12px] font-bold">{t.remainingTimeLabel}</span>
                  <span className="text-[14px] font-extrabold">{t.minUnit(item.endsIn)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Caution — collapsible accordion */}
        <div className="mx-3 mt-3 overflow-hidden rounded-xl border border-[#0F0F0F]/25 bg-[#fffae8]">
          <button
            onClick={() => setCautionOpen((v) => !v)}
            aria-expanded={cautionOpen}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M12 3l10 18H2z" fill="#0F0F0F" /><path d="M12 9v5M12 17.5v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
            <span className="flex-1 text-[12.5px] font-bold text-[#0F0F0F]">{t.drawCautionTitle}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`shrink-0 text-[#0F0F0F] transition-transform ${cautionOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {cautionOpen && (() => {
            const word = t.drawCautionTermsWord;
            const idx = t.drawCaution.indexOf(word);
            const link = (
              <button
                onClick={() => openLegal("terms")}
                className="font-bold text-[#0F0F0F] underline decoration-[#0F0F0F] underline-offset-2"
              >
                {word}
              </button>
            );
            return (
              <p className="border-t border-[#0F0F0F]/20 px-3 py-2.5 text-[11px] leading-relaxed text-[#0F0F0F]">
                {idx < 0 ? (
                  t.drawCaution
                ) : (
                  <>
                    {t.drawCaution.slice(0, idx)}
                    {link}
                    {t.drawCaution.slice(idx + word.length)}
                  </>
                )}
              </p>
            );
          })()}
        </div>

        {/* Prize line-up */}
        <div className="px-3 pb-5">
          <DrawTierLabel tier={1} alt={t.drawTier1} />
          <div className="grid grid-cols-2 gap-3">
            <DrawTierCard rarity="UR" large />
            <DrawTierCard rarity="UR" large />
          </div>

          <DrawTierLabel tier={2} alt={t.drawTier2} />
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => <DrawTierCard key={`sr${i}`} rarity="SR" />)}
          </div>

          <DrawTierLabel tier={3} alt={t.drawTier3} />
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => <DrawTierCard key={`n${i}`} rarity="N" />)}
          </div>

          {/* Prize handling notes (damaged cards, graded cards, unopened items, images) */}
          <div className="mt-5 space-y-3.5 rounded-xl bg-white px-4 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {t.drawPrizeNotes.map((n, i) => (
              <div key={i}>
                <h4 className="text-[13px] font-bold text-[#0F0F0F]">{n.title}</h4>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#5b616b]">{n.body}</p>
              </div>
            ))}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>

      {/* Sticky draw CTA — pinned just above the bottom navigation. Hidden
          entirely once sold out: the only remaining action is the back button. */}
      {!soldOut && (
        <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <DrawCtaRow variant={item.cta ?? "all"} t={t} onRequest={requestDraw} />
        </div>
      )}

      <DrawFlow
        lang={lang}
        item={item}
        coins={coins}
        request={request}
        soldOut={soldOut}
        onSoldOut={() => setSoldOutHit(true)}
        freeShipAvailable={freeShipAvailable}
        onResultsChange={onResultsChange}
        shippingAddresses={shippingAddresses}
        onShippingAddressesChange={onShippingAddressesChange}
        dailyLimitReached={dailyLimitReached}
        drawScenario={drawScenario}
        multiCurrency={multiCurrency}
        onHome={onHome}
        onOpenStore={onOpenStore}
        onOpenDraw={onOpenDraw}
        onAttemptPaidDraw={onAttemptPaidDraw}
        onTopUp={onTopUp}
        pendingConfirm={pendingConfirm}
        onPendingConfirmConsumed={onPendingConfirmConsumed}
      />
    </div>
  );
}

// Overlapping thumbnail pile shown in the exchange dialog so the player can
// tell they're exchanging more than one card. Every selected card face is
// rendered and stays visible; when there are many, the overlap tightens so the
// whole pile fits (each face still peeks out).
function CardStack({ prizes, cardW = 46, cardH = 62, maxWidth = 240, maxFaces = 5 }: { prizes: WonPrize[]; cardW?: number; cardH?: number; maxWidth?: number; maxFaces?: number }) {
  const count = prizes.length;
  if (count === 0) return null;
  const defaultShift = Math.round(cardW * 0.44);
  const minShift = 6; // tightest fan that still reads as separate cards
  const fits = (n: number) => n < 2 || Math.floor((maxWidth - cardW) / (n - 1)) >= minShift;
  // A selection made up purely of top-tier cards shows every face — as long as
  // the fan still fits — so the player sees each rare card they are burning.
  const allTopTier = prizes.every((p) => rarityTier(p.rarity) === 1);
  const faces = allTopTier && fits(count) ? prizes : prizes.slice(0, maxFaces);
  const hidden = count - faces.length;
  const tiles = faces.length + (hidden > 0 ? 1 : 0);
  const shift = tiles > 1 ? Math.max(minShift, Math.min(defaultShift, Math.floor((maxWidth - cardW) / (tiles - 1)))) : 0;
  return (
    <div className="relative shrink-0" style={{ width: cardW + shift * (tiles - 1), height: cardH }}>
      {faces.map((p, i) => (
        <img
          key={p.id}
          src={RARITY_IMG[p.rarity]}
          alt=""
          className="absolute top-0 rounded-[5px] object-cover shadow-[0_2px_6px_rgba(0,0,0,0.28)] ring-1 ring-white/70"
          style={{ left: i * shift, width: cardW, height: cardH, zIndex: tiles - i }}
        />
      ))}
      {hidden > 0 && (
        <div
          className="absolute top-0 flex items-center justify-center rounded-[5px] bg-[#2b2f36] text-[13px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.28)] ring-1 ring-white/70"
          style={{ left: faces.length * shift, width: cardW, height: cardH, zIndex: tiles + 1 }}
        >
          +{hidden}
        </div>
      )}
    </div>
  );
}

// Confirmation dialog shown before exchanging selected prizes to coins.
// Tier-3 (N) selections show the simple confirm; a selection that includes a
// tier-1 (UR) or tier-2 (SR) card shows the irreversible "High-Rarity Warning".
function ExchangeConfirm({ lang, coins, prizes, total, onConfirm, onClose }: { lang: Lang; coins: number; prizes: WonPrize[]; total: number; onConfirm: () => void; onClose: () => void }) {
  const t = STR[lang];
  const hasRare = prizes.some((p) => rarityTier(p.rarity) <= 2);
  const after = coins + total;
  // Rarest first, so the faces that survive the pile's cap are the ones worth
  // a second look before the exchange is confirmed.
  const ordered = useMemo(
    () => [...prizes].sort((a, b) => rarityTier(a.rarity) - rarityTier(b.rarity) || b.coinValue - a.coinValue),
    [prizes],
  );
  return (
    <div
      className="animate-popup-backdrop absolute inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(20,8,4,0.62)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-popup-pop w-full max-w-[360px] rounded-2xl bg-white px-6 pb-6 pt-7 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        style={{ fontFamily: "var(--font-noto-sans-jp), system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {hasRare ? (
          <>
            <h3 className="flex items-center justify-center gap-2 text-[20px] font-bold leading-tight text-[#D10005]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2px] border-[#D10005] text-[14px] leading-none">!</span>
              {t.exWarnTitle}
            </h3>
            <p className="mx-auto mt-2 max-w-[310px] text-[12px] font-medium leading-relaxed text-[#1d2129]">
              {t.exWarnLead}
              <span className="font-bold text-[#D10005]">{t.exWarnHi}</span>
              <span className="font-bold text-[#D10005]">{t.exWarnUndone}</span>
              {t.exWarnTail}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-[20px] font-bold text-[#1d2129]">{t.exConfirmTitle}</h3>
            <p className="mx-auto mt-2 max-w-[300px] text-[12px] font-medium leading-relaxed text-[#6b7075]">{t.exConfirmBody}</p>
          </>
        )}
        {/* Card pile: makes it clear how many cards are being exchanged. Shows
            up to 5 faces; anything beyond collapses into a "+N" tile. */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <CardStack prizes={ordered} cardW={46} cardH={62} />
          {prizes.length > 1 && (
            <span className="text-[12px] font-bold text-[#6b7075]">{t.exCardCount(prizes.length)}</span>
          )}
        </div>
        {/* Balance before → after (green) */}
        {/* 38px tall in the design, with 30px coins either side of the arrow. */}
        <div className="mt-4 flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[#e7e7e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <CoinIcon size={30} />
          <span className="text-[23px] font-bold leading-none text-[#0F0F0F]">{coins.toLocaleString()}</span>
          <BalanceArrow height={17} />
          <CoinIcon size={30} />
          <span className="text-[23px] font-bold leading-none text-[#00A63D]">{after.toLocaleString()}</span>
        </div>
        {/* Both CTAs are 39px tall with a 6px radius per the button specs. */}
        <button
          onClick={onConfirm}
          className="mt-4 flex h-[39px] w-full items-center justify-center rounded-md bg-[#FF8A00] text-[17px] font-bold leading-none text-white active:scale-[0.98]"
        >
          {t.exchange}
        </button>
        <div className="my-3 border-t border-dashed border-black/20" />
        <button
          onClick={onClose}
          className="flex h-[39px] w-full items-center justify-center rounded-md border-2 border-[rgba(7,7,7,0.6)] bg-white text-[17px] font-bold leading-none text-[rgba(7,7,7,0.6)] active:scale-[0.98]"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

// Shared "Narrow down" bottom-sheet used by both Draw Results and My Loot so
// the two screens filter identically: a free-text search, a rarity/tier filter
// and (when the set spans multiple franchises) a category filter. Purely a
// filter — selection for bulk actions is handled by the host screen.
function NarrowDownSheet({
  lang,
  items,
  query,
  setQuery,
  rarity,
  setRarity,
  category,
  setCategory,
  onReset,
  onClose,
}: {
  lang: Lang;
  items: WonPrize[];
  query: string;
  setQuery: (v: string) => void;
  rarity: "all" | Rarity;
  setRarity: (v: "all" | Rarity) => void;
  category: "all" | Category;
  setCategory: (v: "all" | Category) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const t = STR[lang];
  const LF = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  const q = query.trim().toLowerCase();
  const matchesQuery = (p: WonPrize) => {
    if (!q) return true;
    const hay = `${locName(p, lang)} ${locDesc(p, lang)}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  };
  // Tier counts respect the active text query (but not the tier itself).
  const tierScope = items.filter(matchesQuery);
  const tierChips: { key: "all" | Rarity; label: string }[] = [
    { key: "all", label: t.deckAll },
    { key: "UR", label: t.prizeTier(1) },
    { key: "SR", label: t.prizeTier(2) },
    { key: "N", label: t.prizeTier(3) },
  ];
  const tierCount = (key: "all" | Rarity) => (key === "all" ? tierScope.length : tierScope.filter((p) => p.rarity === key).length);
  // Category chips only appear when the set spans more than one franchise
  // (e.g. My Loot). A single-pack draw stays search + tier only.
  const presentCats = CATEGORIES.filter((c) => items.some((p) => p.category === c));
  const showCats = presentCats.length > 1;
  const cats: ("all" | Category)[] = ["all", ...presentCats];
  const catScope = items.filter((p) => matchesQuery(p) && (rarity === "all" || p.rarity === rarity));
  const catCount = (c: "all" | Category) => (c === "all" ? catScope.length : catScope.filter((p) => p.category === c).length);

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="flex max-h-[90%] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()} style={{ animation: "lobbySheetUp .28s cubic-bezier(.2,.8,.2,1) both" }}>
        <style>{`@keyframes lobbySheetUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
        <div className="relative flex shrink-0 items-center justify-center border-b border-black/5 px-4 py-3.5">
          <h3 className="text-[16px] font-extrabold text-[#1d2129]">{LF.narrowDown}</h3>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] active:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa0a8]">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={LF.searchPlaceholder}
              className="w-full rounded-xl bg-[#f4f5f7] py-3 pl-11 pr-10 text-[14px] font-semibold text-[#1d2129] outline-none placeholder:text-[#9aa0a8] focus:bg-white focus:ring-2 focus:ring-[#D10005]/30"
            />
            {query.length > 0 && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-[#5c626b] active:bg-black/20"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            )}
          </div>

          <div className="mt-5">
            <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{lang === "ja" ? "レアリティで絞り込み" : "Filter by tier"}</h4>
            <div className="flex flex-wrap gap-2.5">
              {tierChips.map((c) => {
                const on = rarity === c.key;
                return (
                  <button key={c.key} onClick={() => setRarity(c.key)} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition" style={{ background: on ? "#D10005" : "#fff", color: on ? "#fff" : "#5c626b", borderColor: on ? "#D10005" : "rgba(0,0,0,0.15)" }}>
                    {c.label}<span className="ml-1 opacity-75">{tierCount(c.key)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {showCats && (
            <div className="mt-5 border-t border-black/5 pt-4">
              <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{LF.quickFilters}</h4>
              <div className="flex flex-wrap gap-2.5">
                {cats.map((c) => {
                  const on = category === c;
                  const label = c === "all" ? t.deckCategoryAll : t.cardCategory(c);
                  return (
                    <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "border-[#D10005] bg-[#D10005] text-white" : "border-black/15 bg-white text-[#5c626b] active:bg-black/[0.03]"}`}>{label}<span className="ml-1 opacity-75">{catCount(c)}</span></button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-3 border-t border-black/10 px-4 py-3">
          <button onClick={onReset} className="flex-1 rounded-[10px] border-[1.6px] border-[#1d2129] bg-white py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{LF.reset}</button>
          <button onClick={onClose} className="flex-1 rounded-[10px] bg-[#D10005] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{LF.filter}</button>
        </div>
      </div>
    </div>
  );
}

// 25px pill holding a tier label and its drawn count; the active tier is the
// filled red one.
const tierChipCls = (on: boolean) =>
  `flex h-[25px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-[19px] text-[13px] font-bold ${
    on ? "bg-[#D10005] text-white" : "border border-[#e7e7e7] bg-white text-[#878787]"
  }`;

// Paired up/down arrows marking the results sort control.
function SortArrows() {
  return (
    <svg aria-hidden="true" width="22" height="20" viewBox="0 0 22 20" fill="none" stroke="#D10005" strokeWidth="3" strokeLinejoin="miter" className="shrink-0">
      <path d="M5.5 19V2M1 6.5L5.5 1.5L10 6.5" />
      <path d="M16.5 1v17M12 13.5l4.5 5 4.5-5" />
    </svg>
  );
}

// Gacha results — "list mode". Shown after any draw (×1 / ×10 / custom). Lets
// the player review the cards they pulled, narrow down by tier/search, sort,
// select, and exchange to coins or request shipping. Self-contained (local
// selection). Mirrors the My Loot screen (which shows all un-actioned cards).
function DrawResults({ lang, coins, item, cards, onDrawAgain, onBackToInfo, onHome, onOpenStore, freeShipAvailable = true, shippingAddresses, onShippingAddressesChange, dailyLimitReached = false, onOpenDraw }: { lang: Lang; coins: number; item: OripaItem; cards: WonPrize[]; onDrawAgain: () => void; onBackToInfo: () => void; onHome: () => void; onOpenStore?: () => void; freeShipAvailable?: boolean; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; dailyLimitReached?: boolean; onOpenDraw?: (item: OripaItem) => void }) {
  const t = STR[lang];
  const [list, setList] = useState<WonPrize[]>(cards);
  // Draw results are filtered by rarity tier via the top tabs (All / Ultra /
  // Gold / Silver). Each tab shows how many cards were drawn in that tier.
  const [tierFilter, setTierFilter] = useState<"all" | number>("all");
  // Results only ever sort by coin value, so the picker holds two options.
  const [sortKey, setSortKey] = useState<"coinDesc" | "coinAsc">("coinDesc");
  const [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shipOpen, setShipOpen] = useState(false);
  // Exchange-to-coins confirmation dialog.
  const [exchangeOpen, setExchangeOpen] = useState(false);
  // "Daily Limit Reached" popup, shown when Draw again is tapped and the
  // player has hit today's cap. Closing it returns to the results screen.
  const [limitOpen, setLimitOpen] = useState(false);
  // Index into the "Other Oripa" carousel shown in the limit popup.
  const [otherIdx, setOtherIdx] = useState(0);
  // 3 switchable "Other Oripa" suggestions, de-duped by banner art so each
  // slide looks visibly different.
  const otherOripa = useMemo(() => {
    const seenImg = new Set<string>();
    const out: OripaItem[] = [];
    for (const o of ALL_ORIPA) {
      if (o.id === item.id) continue;
      if (o.image) { if (seenImg.has(o.image)) continue; seenImg.add(o.image); }
      out.push(o);
      if (out.length >= 3) break;
    }
    return out;
  }, [item.id]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Ordered by coin value, then narrowed to the active rarity-tier chip.
  const displayed = useMemo(() => {
    const arr = [...list].sort((a, b) => (sortKey === "coinAsc" ? a.coinValue - b.coinValue : b.coinValue - a.coinValue));
    return tierFilter === "all" ? arr : arr.filter((p) => rarityTier(p.rarity) === tierFilter);
  }, [list, tierFilter, sortKey]);
  // Per-tier drawn counts for the tab labels.
  const tierCount = (tier: number) => list.filter((p) => rarityTier(p.rarity) === tier).length;
  // Switching tabs resets the selection so the summary never counts cards
  // hidden behind the active tier.
  useEffect(() => { setSelected(new Set()); }, [tierFilter]);

  const selectedPrizes = list.filter((p) => selected.has(p.id));
  // Everything drawn has been exchanged or sent for shipping: the filters, sort
  // and selection bar have nothing to act on, so the screen hands over to the
  // lobby instead.
  const noneLeft = list.length === 0;
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
    setShipOpen(true);
  }
  // Confirmed from inside the shipping flow (address → confirm).
  function doShip() {
    const ids = new Set(selected);
    setList((l) => l.filter((p) => !ids.has(p.id)));
    setSelected(new Set());
    setShipOpen(false);
    pushToast(t.toastShipReq);
  }

  return (
    <div className="animate-screen-in absolute inset-0 z-50 flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Top actions: roll again, or drop back to the pack's info page. */}
      <div className="flex shrink-0 items-center gap-2 bg-white px-3 pt-3">
        <button onClick={() => { if (dailyLimitReached) { setOtherIdx(0); setLimitOpen(true); } else { onDrawAgain(); } }} className="h-[39px] flex-1 rounded-lg bg-[#D10005] text-[14px] font-extrabold text-white active:scale-[0.99]">
          {t.drawAgain}
        </button>
        <button onClick={onBackToInfo} className="h-[39px] flex-1 rounded-lg border border-[#e7e7e7] bg-white text-[14px] font-extrabold text-[#0F0F0F] active:scale-[0.99]">
          {t.resultsBackToInfo}
        </button>
      </div>

      {!noneLeft && (
      <>
      {/* Rarity-tier chips — "ALL" is pinned and the prize tiers scroll beside
          it, so a pack with more tiers than fit stays reachable. */}
      <div className="flex shrink-0 items-center gap-2.5 bg-white px-3 pt-2.5">
        <button onClick={() => setTierFilter("all")} className={tierChipCls(tierFilter === "all")}>
          <span>{t.resultsTierAll}</span>
          <span>{list.length}</span>
        </button>
        <span className="shrink-0 rotate-180"><BalanceArrow height={17} color="#D10005" /></span>
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto">
          {[1, 2, 3].map((tier) => (
            <button key={tier} onClick={() => setTierFilter(tier)} className={tierChipCls(tierFilter === tier)}>
              <span>{t.resultsTierChip(tier)}</span>
              <span>{tierCount(tier)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hairline splitting the tier chips from the sort control. */}
      <div className="shrink-0 bg-white pt-2.5"><div className="h-px bg-black/20" /></div>

      {/* Coin-value ordering — the only sort the results screen offers. */}
      <div className="relative z-20 flex shrink-0 justify-end border-b border-black/10 bg-white px-3 py-2.5">
        <button onClick={() => setSortOpen((v) => !v)} className="flex items-center gap-3.5" aria-haspopup="listbox" aria-expanded={sortOpen}>
          <SortArrows />
          <span className="text-[15px] font-bold leading-none text-[#0F0F0F]">{t.sortLabels[sortKey]}</span>
          <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true" className={`shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`}>
            <path d="M1.4 1.4L5.5 5.5L9.6 1.4" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {sortOpen && (
          <div role="listbox" className="absolute right-3 top-full z-20 mt-1 w-[190px] overflow-hidden rounded-lg border border-[#e7e7e7] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
            {(["coinDesc", "coinAsc"] as const).map((key) => (
              <button
                key={key}
                role="option"
                aria-selected={sortKey === key}
                onClick={() => { setSortKey(key); setSortOpen(false); }}
                className={`block w-full px-3 py-2.5 text-left text-[13px] font-bold ${sortKey === key ? "text-[#D10005]" : "text-[#0F0F0F]"}`}
              >
                {t.sortLabels[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tapping anywhere else dismisses the open sort menu. */}
      {sortOpen && <div className="absolute inset-0 z-10" onClick={() => setSortOpen(false)} />}
      </>
      )}

      {/* Results list */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {noneLeft ? (
          /* Same mascot, message and hand-off CTA as the empty My Loot screen. */
          <div className="flex min-h-full flex-col items-center justify-center">
            <img src="/prize-character-wave.webp" alt="" className="mb-5 h-48 w-48 object-contain" />
            <p className="text-center text-[14px] leading-[17px] text-[#0F0F0F80]">{t.resultsNoCardsLeft}</p>
            <button
              onClick={onHome}
              className="mt-7 flex h-[39px] w-full max-w-[386px] items-center justify-center rounded-lg bg-[#D10005] text-[16px] font-extrabold leading-none text-white active:scale-[0.99]"
            >
              {t.winEmptyCta}
            </button>
          </div>
        ) : displayed.length === 0 ? (
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
                    <p className="mt-1.5 text-[14px] font-bold leading-tight text-[#0F0F0F]">{locName(p, lang)}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] font-normal leading-relaxed text-[#0F0F0F]">{locDesc(p, lang)}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#0F0F0F]">{t.itemsExchangePeriod}{fmtDate(expiresAt(p.wonAt))}</p>
                    <div className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white pt-2 pb-2" style={{ marginTop: 8 }}>
                      <CoinIcon size={18} />
                      <span className="text-[18px] font-bold text-[#0F0F0F]">{p.coinValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {!noneLeft && (
      <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CoinIcon size={26} />
            <span className="text-[18px] font-extrabold text-[#1d2129]">{total.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-4 text-[13px] font-bold">
            <button onClick={selectAll} className="text-[#1d2129] active:opacity-70">{t.selectAll}</button>
            <button onClick={reset} className="text-[#8a9099] active:opacity-70">{t.itemsReset}</button>
          </div>
        </div>
        {selected.size > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {/* Request Shipping on the left (matches My Loot placement). */}
          <div className="relative">
            <style>{`@keyframes freeShipIn{from{opacity:0;transform:translateY(-6px) scale(.9)}to{opacity:1;transform:none}}`}</style>
            {/* Three states (matches My Loot):
                - red "min coins" while the selection is short of the threshold
                - green "free shipping" once eligible AND free quota remains
                - amber "standard shipping fee" once eligible with no free quota */}
            {!canShip ? (
              <div className="pointer-events-none absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] bg-[#e30613] px-1.5 text-white">
                <svg width="11" height="11" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M12 7v6" stroke="#e30613" strokeWidth="2.6" strokeLinecap="round" /><circle cx="12" cy="16.6" r="1.35" fill="#e30613" /></svg>
                <span className="text-[9.5px] font-extrabold">{t.minCoinsBadge}</span>
              </div>
            ) : freeShipAvailable ? (
              <div
                className="pointer-events-none absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] bg-gradient-to-br from-[#1eae52] to-[#12813c] px-1.5 text-white"
                style={{ animation: "freeShipIn .3s cubic-bezier(.2,.9,.3,1) both" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M7.5 12.5l3 3 6-6.5" stroke="#12813c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-[9px] font-extrabold">{t.freeShippingQuota(FREE_SHIP_QUOTA)}</span>
              </div>
            ) : (
              <div
                className="pointer-events-none absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] bg-gradient-to-br from-[#ffcf33] to-[#f5a623] px-1.5 text-[#3a2a00]"
                style={{ animation: "freeShipIn .3s cubic-bezier(.2,.9,.3,1) both" }}
              >
                <span className="text-[9px] font-extrabold">{t.paidShipBadge}</span>
              </div>
            )}
            <button
              onClick={ship}
              className="flex h-9 w-full items-center justify-center rounded-lg text-[14px] font-extrabold text-white transition active:scale-[0.98]"
              style={{ background: canShip ? "#f5670a" : "#c9ced6" }}
            >
              {t.requestShipping}
            </button>
          </div>
          {/* Exchange on the right — opens the confirmation dialog. */}
          <button
            onClick={() => { if (selected.size > 0) setExchangeOpen(true); }}
            disabled={selected.size === 0}
            className="h-9 rounded-lg border-2 border-[#D10005] bg-white text-[14px] font-extrabold text-[#D10005] active:scale-[0.98] disabled:opacity-40"
          >
            {t.exchange}
          </button>
        </div>
        )}
        <p className="mx-auto mt-3 max-w-[330px] text-center text-[9.5px] leading-[11px] text-[#8a9099]">{freeShipAvailable ? t.shipSelectHint : t.shipSelectHintPaid}</p>
      </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-[70] flex justify-center px-4">
          <div className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">{toast}</div>
        </div>
      )}

      {shipOpen && (
        <ShippingFlow
          prizes={selectedPrizes}
          total={total}
          onClose={() => setShipOpen(false)}
          onConfirm={doShip}
          t={t}
          lang={lang}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
          freeShipAvailable={freeShipAvailable}
        />
      )}

      {exchangeOpen && (
        <ExchangeConfirm
          lang={lang}
          coins={coins}
          prizes={selectedPrizes}
          total={total}
          onConfirm={() => { setExchangeOpen(false); exchange(); }}
          onClose={() => setExchangeOpen(false)}
        />
      )}

      {/* Daily Limit Reached popup — shown when Draw again is tapped while the
          player has hit today's cap. Close returns to the results screen. */}
      {limitOpen && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(20,8,4,0.62)" }}
          onClick={() => setLimitOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <style>{`@keyframes drawConfirmIn{0%{opacity:0;transform:translateY(12px) scale(.94)}100%{opacity:1;transform:none}}`}</style>
          <div
            className="no-scrollbar flex max-h-full w-full max-w-[380px] flex-col overflow-y-auto bg-white shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
            style={{ animation: "drawConfirmIn 260ms cubic-bezier(0.22,0.61,0.36,1) both", fontFamily: "var(--font-noto-sans-jp), system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/oripa-banner-adkakutei.png" alt="" draggable={false} className="h-[168px] w-full object-cover object-center" style={{ WebkitUserDrag: "none" } as React.CSSProperties} />

            <div className="px-4 pb-4 pt-3.5">
              <h3 className="text-center text-[19px] font-extrabold tracking-tight text-[#D10005]">{t.drawLimitTitle}</h3>
              <p className="mx-auto mt-1.5 max-w-[300px] text-center text-[12px] leading-relaxed text-[#0F0F0F]">{t.drawLimitBody}</p>

              {/* Secondary CTA per the design: full width, 39px tall, 6px
                  radius, 2px outline in 60%-opacity ink. */}
              <button
                onClick={() => setLimitOpen(false)}
                className="mt-3.5 flex h-[39px] w-full items-center justify-center rounded-md border-2 border-[rgba(7,7,7,0.6)] bg-white text-[17px] font-bold leading-none text-[rgba(7,7,7,0.6)] active:scale-[0.98]"
              >
                {t.drawLimitClose}
              </button>

              {otherOripa.length > 0 && (
                <>
                  <div className="my-3.5 border-t border-dashed border-black/20" />
                  <p className="mb-2.5 text-center text-[12px] font-bold text-[#0F0F0F]">{t.drawOtherOripa}</p>
                  <div className="relative px-8">
                    {(() => {
                      const other = otherOripa[otherIdx % otherOripa.length];
                      return (
                        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
                          <img src={other.image || "/oripa-banner-adkakutei.png"} alt="" draggable={false} className="h-[150px] w-full object-cover object-center" style={{ WebkitUserDrag: "none" } as React.CSSProperties} />
                          <div className="flex items-center justify-between gap-2.5 px-3 pb-3 pt-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-baseline gap-1 whitespace-nowrap text-[12px] font-bold text-[#1d2129]">
                                {t.remainingLabel}
                                <span className="text-[15px] font-extrabold">{other.remaining}</span>
                                <span className="text-[11px] font-bold text-[#8a9099]">/{other.total}</span>
                              </span>
                              <span className="flex items-baseline gap-1 whitespace-nowrap text-[12px] font-bold text-[#D10005]">
                                {t.remainingTimeLabel}
                                <span className="text-[14px] font-extrabold">{t.minUnit(other.endsIn)}</span>
                              </span>
                            </div>
                            <button
                              onClick={() => { setLimitOpen(false); onOpenDraw?.(other); }}
                              className="shrink-0 rounded-xl bg-[#D10005] px-5 py-2.5 text-[14px] font-extrabold text-white shadow-[0_3px_8px_rgba(209,0,5,0.35)] active:scale-[0.97]"
                            >
                              {t.btnDraw}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    {otherOripa.length > 1 && (
                      <>
                        <button
                          aria-label="Previous"
                          onClick={() => setOtherIdx((i) => (i - 1 + otherOripa.length) % otherOripa.length)}
                          className="absolute left-0 top-[38%] flex h-8 w-8 -translate-y-1/2 items-center justify-center active:scale-90"
                        >
                          <img src="/icons/carousel-arrow-left.png" alt="" className="h-5 w-5" draggable={false} />
                        </button>
                        <button
                          aria-label="Next"
                          onClick={() => setOtherIdx((i) => (i + 1) % otherOripa.length)}
                          className="absolute right-0 top-[38%] flex h-8 w-8 -translate-y-1/2 items-center justify-center active:scale-90"
                        >
                          <img src="/icons/carousel-arrow-right.png" alt="" className="h-5 w-5" draggable={false} />
                        </button>
                      </>
                    )}
                  </div>
                  {otherOripa.length > 1 && (
                    <div className="mt-2.5 flex items-center justify-center gap-1.5">
                      {otherOripa.map((_, i) => (
                        <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === otherIdx % otherOripa.length ? 16 : 6, background: i === otherIdx % otherOripa.length ? "#D10005" : "#cfd3da" }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const applyLobby = (q: string, f: Record<string, boolean>, min: number, max: number) => {
    setQuery(q); setFilters(f); setPriceMin(min); setPriceMax(max);
  };
  const toggleApplied = (k: string) => setFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearAll = () => { setQuery(""); setFilters({}); setPriceMin(0); setPriceMax(PRICE_MAX); };
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={onLogin} />

      <FeedScroller>
        <div className="px-3 pb-4 pt-3"><PromoCarousel /></div>

        <LobbyNavFeed t={t} lang={lang} query={query} filters={filters} priceMin={priceMin} priceMax={priceMax} onApply={applyLobby} onToggleApplied={toggleApplied} onClearAll={clearAll} onView={onSignUp} />

        <SiteFooter t={t} />
      </FeedScroller>
    </div>
  );
}

/* ── PhoneApp ─────────────────────────────────────────────────────────── */


function NotificationsScreen({ lang, coins, empty = false, only, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; empty?: boolean; only?: "you" | "notice"; onBack: () => void; onHome: () => void; onOpenStore?: () => void }) {
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
          <BalancePill coins={coins} t={t} onOpenStore={onOpenStore} />
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
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
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
        color: "#0F0F0F",
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

function PrizeHistory({ lang, coins, setCoins, shippingAddresses, onShippingAddressesChange, onBack, onHome, empty = false, onGoGacha, lootMode = false, onRequestKyc, freeShipAvailable = true, onOpenStore }: { lang: Lang; coins: number; setCoins: Dispatch<SetStateAction<number>>; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onHome: () => void; empty?: boolean; onGoGacha?: () => void; lootMode?: boolean; onRequestKyc?: () => boolean; freeShipAvailable?: boolean; onOpenStore?: () => void }) {
  // "My Loot" reuses this screen but leads with the most valuable cards and
  // hides the Won/Waiting/Shipped tabs. It keeps a couple of normal (N) pulls
  // alongside the high-rarity ones so both exchange-confirm dialogs (simple vs.
  // "High-Rarity Warning") can be demoed from the same screen.
  const screenTitle = lootMode ? STR[lang].mmItems : STR[lang].prizeHistory;
  // Loot view keeps all tiers (UR / SR / N) so both exchange-confirm dialogs
  // (simple for tier-3, "High-Rarity Warning" for tier-1/2) are demoable.
  const bestOnly = <T extends { rarity: Rarity }>(arr: T[]) => arr;
  const t = STR[lang];

  const [tab, setTab] = useState<PrizeTab>("won");
  const [won, setWon] = useState<WonPrize[]>(bestOnly(INITIAL_WON));
  const [waiting, setWaiting] = useState<WaitingPrize[]>(bestOnly(INITIAL_WAITING));
  const [shipped] = useState<ShippedPrize[]>(bestOnly(INITIAL_SHIPPED));

  const [sortKey, setSortKey] = useState<SortKey>("coinDesc");
  const [sortOpen, setSortOpen] = useState(false);
  // Winning History is an audit view where expiration/exchange no longer
  // applies, so drop the "Expiration: soonest first" option there (kept in
  // My Loot, where the exchange date is still meaningful).
  const sortKeys = lootMode ? SORT_KEYS : SORT_KEYS.filter((k) => k !== "expSoon");

  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [listShipOpen, setListShipOpen] = useState(false);
  const [listExchangeOpen, setListExchangeOpen] = useState(false);
  const [category, setCategory] = useState<"all" | Category>("all");
  const [rarityFilter, setRarityFilter] = useState<"all" | Rarity>("all");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  // Scroll the tab content back to the top whenever the active tab changes.
  const tabScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabScrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  // Lazy loading, shared by all three tabs: reveal a batch at a time as the
  // user scrolls near the bottom (no "Load more" button). Sized so both
  // screens load several more sets, giving a real "fetching history" feel.
  const WON_PAGE = lootMode ? 4 : 6;
  const [wonVisible, setWonVisible] = useState(WON_PAGE);
  const [wonLoading, setWonLoading] = useState(false);
  const wonBusy = useRef(false);
  useEffect(() => {
    setWonVisible(WON_PAGE);
    wonBusy.current = false;
    setWonLoading(false);
  }, [category, rarityFilter, query, sortKey, tab, WON_PAGE]);

  // Keep the bulk selection scoped to what's visible: whenever a narrow-down
  // filter changes, drop selections for cards that are now hidden.
  useEffect(() => { setListSelected(new Set()); }, [category, rarityFilter, query]);

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
  const inScope = (p: WonPrize) => (category === "all" || p.category === category) && (rarityFilter === "all" || p.rarity === rarityFilter) && matchesQuery(p);
  const displayedWon = sortedWon.filter(inScope);
  const filterActive = category !== "all" || rarityFilter !== "all" || q.length > 0;
  function clearFilters() { setCategory("all"); setRarityFilter("all"); setQuery(""); setListSelected(new Set()); }

  // Paged slice of the active tab + scroll-driven "load more".
  const pagedWon = displayedWon.slice(0, wonVisible);
  const tabTotal = tab === "won" ? displayedWon.length : tab === "waiting" ? waiting.length : shipped.length;
  const wonHasMore = wonVisible < tabTotal;
  function onTabScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (wonBusy.current || wonVisible >= tabTotal) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      wonBusy.current = true;
      setWonLoading(true);
      setTimeout(() => {
        setWonVisible((v) => Math.min(v + WON_PAGE, tabTotal));
        setWonLoading(false);
        wonBusy.current = false;
      }, 450);
    }
  }

  const counts = { won: won.length, waiting: waiting.length, shipped: shipped.length };

  // Shared "nothing won yet" view (ported from the POC prize-history screen):
  // mascot, message and a go-to-gacha CTA. Used both when the whole screen is
  // empty and when the won list becomes empty at runtime.
  const emptyContent = (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-16">
      <img src="/prize-character-wave.webp" alt="" className="mb-5 h-48 w-48 object-contain" />
      {/* 14px on half-opacity ink (#0F0F0F80), two centred lines. */}
      <p className="max-w-[334px] text-center text-[14px] leading-[17px] text-[#0F0F0F80]">
        {lootMode ? t.lootEmptyTitle : t.winEmptyTitle}
        <br />
        {lootMode ? t.lootEmptySub : t.winEmptySub}
      </p>
      {/* Primary button per the design: fills its container up to 386px, fixed
          39px tall with an 8px radius. */}
      <button
        onClick={onGoGacha ?? onHome}
        className="mt-7 flex h-[39px] w-full max-w-[386px] items-center justify-center rounded-lg bg-[#D10005] text-[16px] font-extrabold leading-none text-white active:scale-[0.99]"
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
            <BalancePill coins={coins} t={t} onOpenStore={onOpenStore} />
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
          <BalancePill coins={coins} t={t} onOpenStore={onOpenStore} />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-bold text-[#1d2129]">{screenTitle}</h2>
        </div>

        {/* Selection-state tabs. Winning History is a pure audit of what the
            customer has won, so the tabs are hidden there; My Loot keeps them. */}
        {lootMode && (
        <div className="flex border-b border-black/10 bg-white px-2">
          {([
            { key: "won", label: t.itemsTabNotSelected },
            { key: "waiting", label: t.itemsTabPending },
            { key: "shipped", label: t.itemsTabShipped },
          ] as { key: PrizeTab; label: string }[]).map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="relative flex-1 pb-2.5 pt-1 text-center"
              >
                {/* Every tab label stays ink in the design — the red underline and
                    the filled count pill carry the active state. */}
                <span className="text-[12px] font-bold text-[#0F0F0F]">
                  {tb.label}
                </span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-[#D10005] text-white" : "bg-black/[0.07] text-[#0F0F0F]"}`}
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

      <div ref={tabScrollRef} onScroll={onTabScroll} className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">

        {tab === "won" && (
          won.length === 0 ? (
            emptyContent
          ) : (
            <>
              <div className="sticky top-0 z-10 flex items-stretch border-b border-black/10 bg-white">
                <button onClick={() => setFilterOpen(true)} className="flex flex-1 items-center justify-center gap-2 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
                  <FilterIcon size={18} />
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
                              <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: isSel ? "#FF7A1A" : "#0F0F0F" }}>
                                {isSel ? t.itemsSelected : t.itemsNotSelected}
                                <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={isSel ? "#FF7A1A" : "#c9ced6"} /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-[14px] font-bold leading-tight text-[#0F0F0F]">{locName(p, lang)}</p>
                          {/* Description and date share one spec: 10px regular
                              on a 100% line height, no letter spacing. */}
                          <p className="mt-1 line-clamp-2 text-[10px] font-normal leading-none tracking-normal text-[#0F0F0F]">{locDesc(p, lang)}</p>
                          <p className="mt-1.5 text-[10px] font-normal leading-none tracking-normal text-[#0F0F0F]">{lootMode ? `${t.itemsExchangePeriod}${fmtDate(expiresAt(p.wonAt))}` : `${t.itemsDateWon}${fmtDate(p.wonAt)}`}</p>
                          <div className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white pt-2 pb-2" style={{ marginTop: 8 }}>
                            <CoinIcon size={18} />
                            <span className="text-[18px] font-bold text-[#0F0F0F]">{p.coinValue.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {wonHasMore ? (
                  <LoadingMoreRow t={t} />
                ) : (
                  <div className="-mx-3 mt-3"><SiteFooter t={t} /></div>
                )}
              </div>
            </>
          )
        )}
        {tab === "waiting" && <WaitingTab prizes={waiting} t={t} lang={lang} visible={wonVisible} page={WON_PAGE} hasMore={wonHasMore} />}
        {tab === "shipped" && <ShippedTab prizes={shipped} onCopy={(c) => pushToast(t.toastCopied(c))} t={t} lang={lang} visible={wonVisible} page={WON_PAGE} hasMore={wonHasMore} />}
      </div>

      {lootMode && tab === "won" && won.length > 0 && (
        <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <style>{`@keyframes mlBadgeIn{from{opacity:0;transform:translateY(-6px) scale(.9)}to{opacity:1;transform:none}}`}</style>
          {/* Selection summary + bulk actions */}
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CoinIcon size={26} />
              <span className="text-[18px] font-extrabold text-[#1d2129]">{listTotal.toLocaleString()}</span>
            </span>
            <div className="flex items-center gap-4 text-[13px] font-bold">
              <button onClick={listSelectAll} className="text-[#1d2129] active:opacity-70">{t.selectAll}</button>
              <button onClick={listReset} className="text-[#8a9099] active:opacity-70">{t.itemsReset}</button>
            </div>
          </div>
          {listSelected.size > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {/* Request Shipping on the left (POC placement). */}
            <div className="relative">
              {/* Three states; the badge is a compact tag straddling the CTA's top edge:
                  - red "min coins" while the selection is short of the threshold
                  - green "free shipping" once eligible AND free quota remains
                  - amber "standard shipping fee" once eligible with no free quota */}
              {!listCanShip ? (
                <div className="pointer-events-none absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] bg-[#e30613] px-1.5 text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M12 7v6" stroke="#e30613" strokeWidth="2.6" strokeLinecap="round" /><circle cx="12" cy="16.6" r="1.35" fill="#e30613" /></svg>
                  <span className="text-[9.5px] font-extrabold">{t.minCoinsBadge}</span>
                </div>
              ) : freeShipAvailable ? (
                <div
                  className="pointer-events-none absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] bg-gradient-to-br from-[#1eae52] to-[#12813c] px-1.5 text-white"
                  style={{ animation: "mlBadgeIn .3s cubic-bezier(.2,.9,.3,1) both" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M7.5 12.5l3 3 6-6.5" stroke="#12813c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="text-[9px] font-extrabold">{t.freeShippingQuota(FREE_SHIP_QUOTA)}</span>
                </div>
              ) : (
                <div
                  className="pointer-events-none absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] bg-gradient-to-br from-[#ffcf33] to-[#f5a623] px-1.5 text-[#3a2a00]"
                  style={{ animation: "mlBadgeIn .3s cubic-bezier(.2,.9,.3,1) both" }}
                >
                  <span className="text-[9px] font-extrabold">{t.paidShipBadge}</span>
                </div>
              )}
              <button
                onClick={() => {
                  if (listSelected.size === 0) { pushToast(t.toastSelectFirst); return; }
                  if (!listCanShip) { pushToast(t.toastShort(listShortfall)); return; }
                  if (onRequestKyc && !onRequestKyc()) return;
                  setListShipOpen(true);
                }}
                className="flex h-9 w-full items-center justify-center rounded-lg text-[14px] font-extrabold text-white transition active:scale-[0.98]"
                style={{ background: listCanShip ? "#f5670a" : "#c9ced6" }}
              >
                {t.requestShipping}
              </button>
            </div>
            {/* Exchange on the right — opens the confirmation dialog. */}
            <button
              onClick={() => { if (listSelected.size === 0) { pushToast(t.toastSelectFirst); return; } setListExchangeOpen(true); }}
              className="h-9 rounded-lg border-2 text-[14px] font-extrabold transition active:scale-[0.98]"
              style={{ borderColor: "#f5670a", color: "#1d2129", background: "#fff" }}
            >
              {t.exchange}
            </button>
          </div>
          )}
          <p className="mx-auto mt-3 max-w-[330px] text-center text-[9.5px] leading-[11px] text-[#8a9099]">{freeShipAvailable ? t.shipSelectHint : t.shipSelectHintPaid}</p>
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
          freeShipAvailable={freeShipAvailable}
        />
      )}

      {listExchangeOpen && (
        <ExchangeConfirm
          lang={lang}
          coins={coins}
          prizes={listSelectedPrizes}
          total={listTotal}
          onConfirm={() => { setListExchangeOpen(false); listExchange(); }}
          onClose={() => setListExchangeOpen(false)}
        />
      )}

      {filterOpen && (
        <NarrowDownSheet
          lang={lang}
          items={won}
          query={query}
          setQuery={setQuery}
          rarity={rarityFilter}
          setRarity={setRarityFilter}
          category={category}
          setCategory={setCategory}
          onReset={() => { clearFilters(); setFilterOpen(false); }}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {sortOpen && (
        <BottomSheet title={t.sortTitle} onClose={() => setSortOpen(false)}>
          {sortKeys.map((key) => (
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

// Bottom-of-list spinner shared by the three My Loot tabs so paging feels the
// same wherever the player is.
function LoadingMoreRow({ t }: { t: Dict }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-[12px] font-semibold text-[#8a9099]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#D10005] border-t-transparent" />
      {t.loadingMore}
    </div>
  );
}

function WaitingTab({ prizes, t, lang, visible, page, hasMore }: { prizes: WaitingPrize[]; t: Dict; lang: Lang; visible: number; page: number; hasMore: boolean }) {
  if (prizes.length === 0) {
    return <EmptyState icon="📦" title={t.waitingEmptyTitle} subtitle={t.waitingEmptySub} />;
  }
  return (
    <div className="px-3 pb-4 pt-3">
      <div className="space-y-2.5">
        {prizes.slice(0, visible).map((p, i) => (
          <div key={p.id} className="animate-fade-slide flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]" style={{ animationDelay: `${(i % page) * 45}ms` }}>
            <PrizeArt rarity={p.rarity} size={104} />
            <div className="min-w-0 flex-1">
              <img src={`/prize-tag-${rarityTier(p.rarity)}.png`} alt={t.prizeTier(rarityTier(p.rarity))} className="h-[24px] w-auto object-contain" draggable={false} />
              <p className="mt-1.5 truncate text-[14px] font-bold text-[#0F0F0F]">{locName(p, lang)}</p>
              <p className="truncate text-[10px] font-normal text-[#0F0F0F]">{locDesc(p, lang)}</p>
              <p className="mt-1 text-[11px] text-[#0F0F0F]">{t.requested(fmtDate(p.requestedAt))}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10.5px] font-semibold text-[#C9701B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f5670a]" /> {t.preparing}
              </span>
              <div className="mt-1.5 flex h-6 w-fit items-center gap-2 rounded-lg bg-[rgba(255,223,147,0.5)] px-[18px]">
                <CoinIcon size={15} />
                <span className="text-[15px] font-bold leading-none text-[#0F0F0F]">{p.coinValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore ? (
        <LoadingMoreRow t={t} />
      ) : (
        <>
          <p className="mt-3 px-1 text-center text-[10.5px] text-[#a2a8b0]">{t.waitingFooter}</p>
          <div className="-mx-3 mt-4"><SiteFooter t={t} /></div>
        </>
      )}
    </div>
  );
}

function ShippedTab({ prizes, onCopy, t, lang, visible, page, hasMore }: { prizes: ShippedPrize[]; onCopy: (code: string) => void; t: Dict; lang: Lang; visible: number; page: number; hasMore: boolean }) {
  if (prizes.length === 0) {
    return <EmptyState icon="✅" title={t.shippedEmptyTitle} subtitle={t.shippedEmptySub} />;
  }
  return (
    <div className="px-3 pb-4 pt-3">
      <div className="space-y-2.5">
        {prizes.slice(0, visible).map((p, i) => (
          <div key={p.id} className="animate-fade-slide flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]" style={{ animationDelay: `${(i % page) * 45}ms` }}>
            <PrizeArt rarity={p.rarity} size={104} />
            <div className="min-w-0 flex-1">
              <img src={`/prize-tag-${rarityTier(p.rarity)}.png`} alt={t.prizeTier(rarityTier(p.rarity))} className="h-[24px] w-auto object-contain" draggable={false} />
              <p className="mt-1.5 truncate text-[14px] font-bold text-[#0F0F0F]">{locName(p, lang)}</p>
              <p className="truncate text-[10px] font-normal text-[#0F0F0F]">{locDesc(p, lang)}</p>
              <p className="mt-1 text-[11px] text-[#0F0F0F]">{t.requested(fmtDate(p.requestedAt))}</p>
              <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#f1f3f6] px-2 py-1">
                <span className="text-[10px] font-semibold text-[#0F0F0F]">{t.tracking}</span>
                <span className="text-[11px] font-bold tracking-wide text-[#0F0F0F]">{p.tracking}</span>
                <button onClick={() => onCopy(p.tracking)} className="ml-auto text-[#D10005]" aria-label={t.copyAria}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="mt-1.5 flex h-6 w-fit items-center gap-2 rounded-lg bg-[rgba(255,223,147,0.5)] px-[18px]">
                <CoinIcon size={15} />
                <span className="text-[15px] font-bold leading-none text-[#0F0F0F]">{p.coinValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore ? <LoadingMoreRow t={t} /> : <div className="-mx-3 mt-4"><SiteFooter t={t} /></div>}
    </div>
  );
}

// Design icons for the address steps. The exported art already carries its own
// padding, and the edit/add glyphs are ink at partial strength in the design,
// hence the opacities.
function AddressHomeIcon() {
  return <img src="/icon-address-home.png" alt="" aria-hidden="true" draggable={false} className="h-[21px] w-[22px] shrink-0 object-contain" />;
}

function AddressEditIcon() {
  return <img src="/icon-address-edit.png" alt="" aria-hidden="true" draggable={false} className="h-6 w-6 shrink-0 object-contain opacity-50" />;
}

function AddressAddIcon() {
  return <img src="/icon-address-add.png" alt="" aria-hidden="true" draggable={false} className="h-5 w-5 shrink-0 object-contain opacity-60" />;
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
  freeShipAvailable = true,
}: {
  prizes: WonPrize[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  t: Dict;
  lang: Lang;
  shippingAddresses: ShippingAddr[];
  onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>;
  freeShipAvailable?: boolean;
}) {
  // Shipping badge shown over the primary CTA on the address + confirm steps.
  const shipBadge = (
    <div className="pointer-events-none absolute top-[-10px] left-0 right-0 z-10 flex justify-center">
      <style>{`@keyframes freeShipIn{from{opacity:0;transform:translateY(-6px) scale(.9)}to{opacity:1;transform:none}}`}</style>
      {/* The design sits the tag on the CTA's top edge at the button's own
          width, so it never overhangs the corners however long the label. */}
      <span
        className={`flex h-4 max-w-full items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-[3px] px-1.5 ${freeShipAvailable ? "bg-[#00A63D] text-white" : "bg-[#FDC410] text-[#0F0F0F]"}`}
        style={{ animation: "freeShipIn .3s cubic-bezier(.2,.9,.3,1) both" }}
      >
        {freeShipAvailable && <svg width="10" height="10" viewBox="0 0 24 24" className="shrink-0"><circle cx="12" cy="12" r="10" fill="#fff" /><path d="M7.5 12.5l3 3 6-6.5" stroke="#00A63D" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        <span className="truncate text-[9px] font-bold leading-none">{freeShipAvailable ? t.freeShippingQuota(FREE_SHIP_QUOTA) : t.paidShipBadge}</span>
      </span>
    </div>
  );
  const [step, setStep] = useState<"address" | "confirm" | "addNew">(shippingAddresses.length === 0 ? "addNew" : "address");
  const [addrId, setAddrId] = useState<string>(() => {
    const def = shippingAddresses.find(a => a.isDefault);
    return def?.id ?? shippingAddresses[0]?.id ?? "";
  });

  const [newForm, setNewForm] = useState<Omit<ShippingAddr, "id" | "isDefault">>(EMPTY_SHIPPING_FORM);
  const [editId, setEditId] = useState<string | null>(null);
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

  // Set while the form is editing an existing address rather than adding one.
  function openEdit(addr: ShippingAddr) {
    const { id: _id, isDefault: _isDefault, ...fields } = addr;
    setEditId(addr.id);
    setNewForm(fields);
    setPostalTouched(false); setPhoneTouched(false); setZipTouched(false); setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false); setCandidates([]);
    setStep("addNew");
  }

  function openAddNew() {
    setEditId(null);
    setNewForm({ ...EMPTY_SHIPPING_FORM });
    setPostalTouched(false); setPhoneTouched(false); setZipTouched(false); setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false); setCandidates([]);
    setStep("addNew");
  }

  function handleSaveNewAddress() {
    if (editId) {
      onShippingAddressesChange(prev => prev.map(a => (a.id === editId ? { ...a, ...newForm } : a)));
      setAddrId(editId);
      setEditId(null);
      setStep("address");
      return;
    }
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

  // 182x39 with a 5px radius and a 1px #9D9D9D outline in the design; every
  // field (inputs, selects, the phone prefix) shares the box.
  const inputCls = "h-[39px] w-full rounded-[5px] border border-[#9D9D9D] px-3 text-[14px] text-[#0F0F0F] outline-none placeholder:text-[#9D9D9D] focus:border-[#D10005]";
  const labelCls = "mb-1 mt-2 block text-[11px] font-semibold text-[#000000]";

  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="max-h-[88%] w-full overflow-y-auto rounded-t-2xl bg-white px-4 pb-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />

        {/* Keyed wrapper: each step change replays a soft slide-in transition. */}
        <div key={step} style={{ animation: "sfStepIn 300ms cubic-bezier(0.22,0.61,0.36,1) both" }}>
        <style>{`@keyframes sfStepIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}`}</style>

        {step === "address" && (
          <>
            <div className="mb-2 flex items-center gap-2">
              <AddressHomeIcon />
              <h3 className="text-[15px] font-bold text-[#000000]">{t.chooseAddress}</h3>
            </div>
            {shippingAddresses.length === 0 ? (
              <p className="mb-3 text-center text-[12.5px] text-[#8a9099]">{t.shippingEmpty}</p>
            ) : (
              <div className="space-y-2">
                {shippingAddresses.map((addr) => {
                  const sel = addr.id === addrId;
                  const lines = addrDisplayLines(addr);
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setAddrId(addr.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAddrId(addr.id); } }}
                      className="relative flex w-full items-start gap-2.5 rounded-xl border-2 p-3 text-left"
                      style={{ borderColor: sel ? "#D10005" : "#e5e8ec", background: sel ? "#FFF4F4" : "#fff" }}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: sel ? "#D10005" : "#c9ced6" }}>
                        {sel && <span className="h-2 w-2 rounded-full bg-[#D10005]" />}
                      </span>
                      <span className="pr-7 text-[12.5px] leading-relaxed">
                        <b className="text-[#1d2129]">{addrFlag(addr)} {addrName(addr)}</b>
                        {addr.isDefault && <span className="ml-1.5 inline-flex h-4 items-center rounded-[3px] bg-[#00A63D] px-2 align-middle text-[9px] font-bold uppercase text-white">{t.shippingDefaultLabel}</span>}
                        <br />{lines.map((l, i) => <span key={i} className="text-[#5c626b]">{l}<br /></span>)}
                        <span className="text-[#8a9099]">{addrPhone(addr)}</span>
                      </span>
                      {/* Pencil opens this address in the form for editing. */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(addr); }}
                        aria-label={t.shippingEditAddress}
                        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center active:opacity-60"
                      >
                        <AddressEditIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={openAddNew} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 py-2.5 text-[13px] font-bold text-[#5c626b]">
              <AddressAddIcon />
              {t.addNewAddress}
            </button>
            <div className="relative mt-3">
              {chosen && shipBadge}
              <button
                disabled={!chosen}
                onClick={() => setStep("confirm")}
                className="w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}
              >
                {t.continueBtn}
              </button>
            </div>
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
              <AddressHomeIcon />
              <h3 className="text-[15px] font-bold text-[#000000]">{editId ? t.shippingEditAddress : t.shippingAddNew}</h3>
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
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#D10005]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
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
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#D10005]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
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
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#D10005]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
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
                <div className="flex h-[39px] shrink-0 items-center rounded-[5px] border border-[#9D9D9D] px-3 text-[14px] text-[#0F0F0F]">{phonePrefix}</div>
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
            <h3 className="mb-2 text-[15px] font-bold text-[#000000]">{t.confirmTitle}</h3>
            <div className="rounded-xl bg-[#f1f3f6] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#000000]">{t.deliverTo}</p>
              {chosen && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#000000]">
                  <b>{addrFlag(chosen)} {addrName(chosen)}</b><br />
                  {addrDisplayLines(chosen).map((l, i) => <span key={i}>{l}<br /></span>)}
                  <span>{addrPhone(chosen)}</span>
                </p>
              )}
            </div>
            <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#000000]">{t.prizesCount(prizes.length)}</p>
            <div className="space-y-1.5">
              {prizes.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <PrizeArt rarity={p.rarity} size={32} />
                  <span className="flex-1 truncate text-[12px] text-[#000000]">{locName(p, lang)}</span>
                  <CoinChip value={p.coinValue} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FFF6E3] px-3 py-2">
              <span className="text-[12px] font-semibold text-[#000000]">{t.totalValue}</span>
              <CoinChip value={total} strong />
            </div>
            {/* The fee only exists once the monthly free quota is spent, and the
                note below then drops the free-shipping claim, keeping just the
                delivery estimate. */}
            {!freeShipAvailable && <p className="mt-2 text-right text-[12px] font-semibold text-[#0F0F0F]">{t.shipFeeLine}</p>}
            <p className="mt-2 text-center text-[11px] text-[#8a9099]">{freeShipAvailable ? t.freeShip : t.paidShipNote}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setStep("address")} className="rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#000000]">{t.back}</button>
              <div className="relative">
                {shipBadge}
                <button onClick={onConfirm} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}>{t.requestShippingBtn}</button>
              </div>
            </div>
          </>
        )}
        </div>
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
                    <span className="ml-1 inline-flex h-4 items-center rounded-[3px] bg-[#00A63D] px-2 text-[9px] font-bold uppercase text-white">{t.shippingDefaultLabel}</span>
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
  coinHistory: "/menu-coin-history.png",
};

/* Coins + free points strip. My Page and the Coin History header show the same
   design block: two equal halves split by a full-height 1px rule, a 14px label
   over a 24px amount in #0F0F0F, and a plus on the coin side that opens the
   store. */
function BalanceStrip({ t, coins, points = 10000, onOpenStore }: { t: Dict; coins: number; points?: number; onOpenStore?: () => void }) {
  return (
    <div className="flex items-stretch">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[14px] font-normal leading-none text-[#0F0F0F]">{t.chOripaCoins}</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <CoinIcon size={24} />
          <span className="text-[24px] font-bold leading-none text-[#0F0F0F]">{coins.toLocaleString()}</span>
          <button onClick={onOpenStore} aria-label={t.addCoinsAria} className="ml-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center transition active:scale-95">
            <img src="/plus-sign.png" alt="" className="h-full w-full object-contain" draggable={false} />
          </button>
        </div>
      </div>
      <div className="w-px shrink-0 bg-[#E7E7E7]" />
      <div className="min-w-0 flex-1 pl-5">
        <p className="text-[14px] font-normal leading-none text-[#0F0F0F]">{t.chFreePoints}</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <GemIcon size={21} />
          <span className="text-[24px] font-bold leading-none text-[#0F0F0F]">{points.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function myMenuIcon(key: string) {
  const c = "#D10005";
  if (MENU_ICON_IMG[key]) {
    return <img src={MENU_ICON_IMG[key]} alt="" className="h-[26px] w-[26px] shrink-0 object-contain" />;
  }
  switch (key) {
    case "shippingAddress":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case "subscriptions":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M6 10h4M6 13.5h8" /><path d="M16 3l2 3M8 3l-2 3" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><path d="M5 18v-2a7 7 0 0114 0v2l1.5 2H3.5z" /><circle cx="12" cy="20.5" r="1.4" fill="#fff" /></svg>;
  }
}

function MyPage({ lang, coins, displayName = "Username", onOpenQuest, onOpenPrizeHistory, onOpenMyLoot, onOpenPurchaseHistory, onOpenAnnouncements, onOpenShippingAddress, onOpenProfile, onHome, onLogout, onOpenStore }: { lang: Lang; coins: number; displayName?: string; onOpenQuest: () => void; onOpenPrizeHistory: () => void; onOpenMyLoot: () => void; onOpenPurchaseHistory: () => void; onOpenAnnouncements: () => void; onOpenShippingAddress: () => void; onOpenProfile: () => void; onHome: () => void; onLogout: () => void; onOpenStore?: () => void }) {
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
    { key: "quest", label: t.mmQuest, onClick: onOpenQuest },
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
              {/* 24px tall, 1px outline, 6px radius — the design's secondary CTA. */}
              <button onClick={onOpenProfile} className="mt-2.5 flex h-6 w-full items-center justify-center rounded-[6px] border border-[#D10005] text-[14px] font-bold leading-none text-[#D10005] active:bg-[#D10005]/[0.06]">{t.mpEditProfile}</button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-3 rounded-2xl bg-white px-4 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <BalanceStrip t={t} coins={coins} onOpenStore={onOpenStore} />
          </div>

          {/* Rank card — 8px radius inside a 2px #AA5225 outline over a peach
              vignette, with the badge, rank copy and benefits CTA on one row and
              the level bar underneath. */}
          <div
            className="relative mt-3 overflow-hidden rounded-lg border-2 border-[#AA5225] px-3.5 py-3.5"
            style={{
              background:
                "radial-gradient(55% 45% at 88% 6%, rgba(255,255,255,.6), transparent 72%), radial-gradient(45% 38% at 8% 96%, rgba(255,255,255,.5), transparent 72%), radial-gradient(125% 135% at 50% 45%, #FDF7F0 0%, #FCEEE1 45%, #FADCC0 85%, #F7CFA9 100%)",
            }}
          >
            {/* Flex wrapper so the chip carries no line-height leading. */}
            <div className="flex">
              <span className="inline-flex h-[18px] items-center rounded-[4px] bg-[#BA5919] px-2 text-[11px] font-bold leading-none text-white">{t.mpCurrentRank}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <img src="/rank-bronze.png" alt="" className="h-[80px] w-[80px] shrink-0 object-contain" draggable={false} />
              <div className="min-w-0 flex-1">
                <p className="text-[21px] font-extrabold uppercase leading-none text-[#572907]">{t.mpRankBronze}</p>
                <p className="mt-2 flex items-baseline gap-1.5 text-[13px] font-semibold leading-none text-[#572907]">
                  {t.mpNextLevel} <span className="text-[20px] font-extrabold leading-none text-[#BA5919]">1,000pt</span>
                </p>
                <button className="mt-2 flex h-[29px] w-full items-center justify-center rounded-[6px] bg-[#D10005] text-[14px] font-bold leading-none text-white active:scale-[0.99]">{t.mpRankPerks}</button>
              </div>
            </div>
            <div className="relative mt-3.5 h-[10px] w-full overflow-hidden rounded-full border border-[#D8A87F] bg-[#FBEEDF]">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: "75%", background: "linear-gradient(180deg,#F5A76B 0%,#ED8332 45%,#D16822 100%)", border: "0.5px solid #A34E19" }}
              />
            </div>
            <p className="mt-1.5 text-center text-[13px] font-semibold leading-none text-[#572907]">3,000/4,000</p>
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
        {/* Balance summary — same block as My Page. */}
        <div className="rounded-2xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <BalanceStrip t={t} coins={coins} onOpenStore={onOpenStore} />
        </div>

        {/* Note */}
        <p className="px-1 py-2.5 text-[10px] font-normal text-[#0F0F0FCC]">{t.chNote}</p>

        {/* Transactions */}
        <div className="space-y-2 pb-6">
          {items.map((tx, i) => {
            const isCoin = tx.currency === "coin";
            const positive = tx.sign === "+";
            // Credits read green, debits stay ink — same for coins and points.
            const amountColor = positive ? "#54AB11" : "#0F0F0F";
            const subLabel = sub(tx.kind);
            return (
              <div key={tx.id} className="animate-fade-slide rounded-xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.07)]" style={{ animationDelay: `${(i % PAGE) * 70}ms` }}>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#8a9099]">
                  {clock}
                  {tx.date}
                </div>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#0F0F0F]">{title(tx.kind)}</p>
                    {subLabel && <p className="text-[10px] font-normal text-[#0F0F0F]">{subLabel}</p>}
                    {tx.paymentId && <p className="text-[10px] font-normal text-[#0F0F0F]">{t.chPaymentId}: {tx.paymentId}</p>}
                    {tx.expires && <p className="text-[10px] font-normal text-[#0F0F0F]">{t.chExpiresOn} {tx.expires}</p>}
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

/* ── Quest: pack-purchase chain ──────────────────────────────────────────
   Engagement loop: buying oripa packs clears the steps of a chain. Steps
   unlock sequentially (finish one to reveal the next); clearing every step in
   a chain unlocks a grand Coin bonus. Self-contained POC — "Challenge"
   simulates a pack purchase so the whole flow is demoable without leaving the
   screen. Three parallel chains (Beginner / Daily / Weekly). */

// Numeric config (shared across languages so targets/rewards never drift).
const QUEST_CHAINS = [
  {
    id: "beginner",
    grand: 10000,
    steps: [
      { target: 1, inc: 1, reward: 100 },
      { target: 3, inc: 1, reward: 100 },
      { target: 5, inc: 1, reward: 150 },
      { target: 3000, inc: 1000, reward: 200 },
      { target: 10, inc: 5, reward: 300 },
    ],
  },
  {
    id: "daily",
    grand: 3000,
    steps: [
      { target: 1, inc: 1, reward: 50 },
      { target: 3, inc: 1, reward: 80 },
      { target: 1000, inc: 500, reward: 120 },
    ],
  },
  {
    id: "weekly",
    grand: 5000,
    steps: [
      { target: 10, inc: 3, reward: 150 },
      { target: 10000, inc: 3000, reward: 250 },
    ],
  },
] as const;

type QuestChainId = (typeof QUEST_CHAINS)[number]["id"];

const QUEST_TEXT: Record<Lang, {
  title: string;
  heroTitle: string;
  heroSub: string;
  endsIn: string;
  special: string;
  coinsUnit: string;
  cleared: (a: number, b: number) => string;
  reward: string;
  claim: string;
  claimed: string;
  challenge: string;
  showDetails: string;
  hideDetails: string;
  locked: string;
  claimGrand: string;
  grandLocked: (n: number) => string;
  grandDone: string;
  toastStep: (n: number) => string;
  toastGrand: (n: number) => string;
  simNote: string;
  labels: Record<QuestChainId, string>;
  steps: Record<QuestChainId, { title: string; detail: string }[]>;
}> = {
  en: {
    title: "Quests",
    heroTitle: "Unlock special rewards!",
    heroSub: "Buy oripa packs to clear each step of the chain, then claim the grand bonus.",
    endsIn: "Ends in",
    special: "Special reward",
    coinsUnit: "Oripa Coins",
    cleared: (a, b) => `${a}/${b} quests cleared`,
    reward: "Reward",
    claim: "Claim",
    claimed: "Claimed",
    challenge: "Challenge",
    showDetails: "Show details",
    hideDetails: "Hide details",
    locked: "Complete the previous quest to unlock",
    claimGrand: "Claim grand bonus",
    grandLocked: (n) => `Clear all ${n} steps to unlock`,
    grandDone: "Grand bonus claimed",
    toastStep: (n) => `+${n} points claimed!`,
    toastGrand: (n) => `Grand bonus unlocked! +${n.toLocaleString()} coins`,
    simNote: "Demo: each tap simulates buying a pack.",
    labels: { beginner: "Beginner", daily: "Daily", weekly: "Weekly" },
    steps: {
      beginner: [
        { title: "Buy your first oripa pack", detail: "Open any oripa pack from the lobby to take your first step into the chain and start earning bonus rewards." },
        { title: "Buy 3 oripa packs", detail: "Draw from any three packs. Purchases from every category count toward this step of the chain." },
        { title: "Buy 5 oripa packs", detail: "Keep the momentum going — five pack purchases unlock the next milestone of the beginner chain." },
        { title: "Spend 3,000 coins on packs", detail: "Spend a total of 3,000 Oripa Coins on pack draws. Bigger pulls clear this step faster." },
        { title: "Complete a 10-pull", detail: "Finish a single 10-pull to clear the final step and unlock the grand Coin bonus." },
      ],
      daily: [
        { title: "Open 1 pack today", detail: "Your daily chain resets every day. Open a single pack to get it started." },
        { title: "Open 3 packs today", detail: "Draw from three packs today to keep the daily streak alive." },
        { title: "Spend 1,000 coins today", detail: "Spend 1,000 Oripa Coins on today's draws to clear the daily chain." },
      ],
      weekly: [
        { title: "Open 10 packs this week", detail: "Open ten packs across the week to progress the weekly chain." },
        { title: "Spend 10,000 coins this week", detail: "Spend 10,000 Oripa Coins this week to unlock the weekly grand bonus." },
      ],
    },
  },
  ja: {
    title: "クエスト",
    heroTitle: "特別報酬を解放しよう！",
    heroSub: "オリパパックを購入してチェーンの各ステップを達成し、特別報酬を受け取ろう。",
    endsIn: "終了まで",
    special: "特別報酬",
    coinsUnit: "オリバコイン",
    cleared: (a, b) => `${a}/${b} クエスト達成`,
    reward: "報酬",
    claim: "受け取る",
    claimed: "受取済み",
    challenge: "挑戦する",
    showDetails: "詳細を表示",
    hideDetails: "詳細を閉じる",
    locked: "アンロックするには前のクエストを完了してください",
    claimGrand: "特別報酬を受け取る",
    grandLocked: (n) => `全${n}ステップを達成すると解放`,
    grandDone: "特別報酬を受け取りました",
    toastStep: (n) => `+${n}ポイント獲得！`,
    toastGrand: (n) => `特別報酬を解放！ +${n.toLocaleString()}コイン`,
    simNote: "デモ：タップするとパック購入をシミュレートします。",
    labels: { beginner: "ビギナー", daily: "デイリー", weekly: "ウィークリー" },
    steps: {
      beginner: [
        { title: "初めてのオリパパックを購入する", detail: "ロビーから好きなオリパパックを開封して、チェーンの最初のステップを踏み出し、ボーナス報酬を獲得しましょう。" },
        { title: "オリパパックを3つ購入する", detail: "任意の3つのパックを引きましょう。すべてのカテゴリーの購入がこのステップにカウントされます。" },
        { title: "オリパパックを5つ購入する", detail: "この調子で続けましょう。5回の購入でビギナーチェーンの次のマイルストーンが解放されます。" },
        { title: "パックに3,000コイン使用する", detail: "パックの抽選に合計3,000オリバコインを使用しましょう。大きな抽選ほど早く達成できます。" },
        { title: "10連を1回引く", detail: "10連を1回引いて最終ステップを達成し、特別なコインボーナスを解放しましょう。" },
      ],
      daily: [
        { title: "今日1パック開封する", detail: "デイリーチェーンは毎日リセットされます。まずは1パック開封しましょう。" },
        { title: "今日3パック開封する", detail: "今日3つのパックを引いてデイリーの連続記録を維持しましょう。" },
        { title: "今日1,000コイン使用する", detail: "今日の抽選で1,000オリバコインを使用してデイリーチェーンを達成しましょう。" },
      ],
      weekly: [
        { title: "今週10パック開封する", detail: "今週中に10パック開封してウィークリーチェーンを進めましょう。" },
        { title: "今週10,000コイン使用する", detail: "今週10,000オリバコインを使用してウィークリーの特別報酬を解放しましょう。" },
      ],
    },
  },
};

// Runtime state is purely numeric (progress / claimed) so language toggles
// never clobber it — all copy is derived from QUEST_TEXT at render time.
type QuestStepState = { id: string; target: number; inc: number; reward: number; progress: number; claimed: boolean };
type QuestChainState = { id: QuestChainId; grand: number; grandClaimed: boolean; steps: QuestStepState[] };

function buildQuestChains(): QuestChainState[] {
  return QUEST_CHAINS.map((c) => ({
    id: c.id,
    grand: c.grand,
    grandClaimed: false,
    steps: c.steps.map((s, i) => ({ id: `${c.id}-${i}`, target: s.target, inc: s.inc, reward: s.reward, progress: 0, claimed: false })),
  }));
}

function QuestLock({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2.5" fill="#c3c8d0" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="#c3c8d0" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.7" fill="#fff" />
    </svg>
  );
}

function QuestScreen({ lang, coins, setCoins, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; setCoins: Dispatch<SetStateAction<number>>; onBack: () => void; onHome: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const tx = QUEST_TEXT[lang];
  const countdown = useHeroCountdown(3 * 3600 + 8 * 60 + 32);
  const [chains, setChains] = useState<QuestChainState[]>(() => buildQuestChains());
  const [tab, setTab] = useState<QuestChainId>("beginner");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const chain = chains.find((c) => c.id === tab)!;
  const clearedCount = chain.steps.filter((s) => s.claimed).length;
  const totalSteps = chain.steps.length;
  const grandPct = totalSteps ? Math.round((clearedCount / totalSteps) * 100) : 0;
  const grandReady = clearedCount === totalSteps && !chain.grandClaimed;

  const mutateStep = (stepId: string, fn: (s: QuestStepState) => QuestStepState) =>
    setChains((prev) => prev.map((c) => (c.id === tab ? { ...c, steps: c.steps.map((s) => (s.id === stepId ? fn(s) : s)) } : c)));

  const challenge = (s: QuestStepState) => mutateStep(s.id, (st) => ({ ...st, progress: Math.min(st.target, st.progress + st.inc) }));
  const claimStep = (s: QuestStepState) => {
    mutateStep(s.id, (st) => ({ ...st, claimed: true }));
    flash(tx.toastStep(s.reward));
  };
  const claimGrand = () => {
    setChains((prev) => prev.map((c) => (c.id === tab ? { ...c, grandClaimed: true } : c)));
    setCoins((v) => v + chain.grand);
    flash(tx.toastGrand(chain.grand));
  };

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Title row */}
      <div className="shrink-0 flex items-center gap-2 border-b border-black/10 bg-white px-4 py-3">
        <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#D10005] hover:bg-black/5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1d2129]">{tx.title}</h1>
      </div>

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {/* Hero banner */}
        <div className="relative aspect-[16/7] w-full select-none overflow-hidden bg-[#2a1c11]">
          <img src="/hero/bg-day.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(180,20,10,0.82) 0%,rgba(180,20,10,0.35) 55%,rgba(180,20,10,0) 100%)" }} />
          <img src="/hero/hero.png" alt="" className="pointer-events-none absolute -right-2 bottom-0 h-[128%] max-w-none object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
          <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-4">
            <h2 className="max-w-[64%] text-[20px] font-extrabold leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">{tx.heroTitle}</h2>
            <p className="max-w-[58%] text-[11px] font-bold leading-snug text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{tx.heroSub}</p>
          </div>
        </div>

        {/* Chain tabs — each shows the number of steps still to clear. */}
        <div className="sticky top-0 z-10 flex items-stretch border-b border-black/10 bg-white">
          {chains.map((c) => {
            const on = c.id === tab;
            const remaining = c.steps.filter((s) => !s.claimed).length;
            return (
              <button key={c.id} onClick={() => setTab(c.id)} className="relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3">
                <span className="text-[14px] font-extrabold" style={{ color: on ? "#D10005" : "#1d2129" }}>{tx.labels[c.id]}</span>
                {remaining > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D10005] px-1 text-[10px] font-bold text-white">{remaining}</span>
                )}
                {on && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#D10005]" />}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-3">
          {/* Grand reward card */}
          <div className="overflow-hidden rounded-2xl border-2 border-[#D10005] bg-white shadow-[0_2px_8px_rgba(209,0,5,0.12)]">
            <div className="flex items-center justify-center gap-1.5 bg-[#D10005] py-1.5 text-[12px] font-bold text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              {tx.endsIn} <span className="tabular-nums">{countdown}</span>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center justify-center">
                <span className="rounded-md px-3 py-1 text-[15px] font-extrabold text-[#D10005]">{tx.special}</span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <CoinIcon size={40} />
                <span className="text-[26px] font-extrabold text-[#1d2129]">{chain.grand.toLocaleString()}</span>
                <span className="text-[13px] font-bold text-[#5b616b]">{tx.coinsUnit}</span>
              </div>
              {/* Progress toward the grand bonus */}
              <div className="relative mt-3 h-5 w-full overflow-hidden rounded-full bg-[#efe0e0]">
                <div className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500" style={{ width: `${grandPct}%`, background: "linear-gradient(90deg,#ff6a3d,#D10005)" }} />
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#1d2129]">{grandPct}%</span>
              </div>
              <p className="mt-1.5 text-center text-[12px] font-semibold text-[#5b616b]">{tx.cleared(clearedCount, totalSteps)}</p>
              <button
                onClick={grandReady ? claimGrand : undefined}
                disabled={!grandReady}
                className="mt-3 w-full rounded-xl py-2.5 text-[14px] font-extrabold transition active:scale-[0.99] disabled:active:scale-100"
                style={grandReady ? { background: "#FF8A00", color: "#fff" } : { background: "#f0f1f3", color: "#a2a8b0" }}
              >
                {chain.grandClaimed ? tx.grandDone : grandReady ? tx.claimGrand : tx.grandLocked(totalSteps)}
              </button>
            </div>
          </div>

          <p className="px-1 py-2 text-[10px] font-medium text-[#8a9099]">{tx.simNote}</p>

          {/* Chain steps */}
          <div className="space-y-2.5">
            {chain.steps.map((s, i) => {
              const prevClaimed = i === 0 || chain.steps[i - 1].claimed;
              const locked = !prevClaimed;
              const done = s.progress >= s.target;
              const claimable = done && !s.claimed;
              const pct = Math.min(100, Math.round((s.progress / s.target) * 100));
              const isOpen = !!open[s.id];
              const copy = tx.steps[chain.id][i];

              if (locked) {
                return (
                  <div key={s.id} className="rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <QuestLock />
                      <p className="text-[12px] font-medium text-[#8a9099]">{tx.locked}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-black/5 pt-2.5 text-[13px] font-bold text-[#8a9099]">
                      {tx.reward}<GemIcon size={16} /><span className="tabular-nums">{s.reward}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={s.id} className={`rounded-2xl border bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${s.claimed ? "border-black/5" : "border-[#f2c3c4]"}`}>
                  <div className="flex items-center gap-1.5">
                    {s.claimed ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#3DB54A" /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#D10005" /><path d="M12 7v6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="16.5" r="1.2" fill="#fff" /></svg>
                    )}
                    <span className="text-[12px] font-bold text-[#D10005]">{tx.labels[chain.id]} · {i + 1}</span>
                  </div>
                  <p className="mt-1 text-[15px] font-bold text-[#1d2129]">{copy.title}</p>

                  {/* Progress bar + CTA */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-[#eef0f3]">
                      <div className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: done ? "linear-gradient(90deg,#5fce6b,#3DB54A)" : "linear-gradient(90deg,#ff6a3d,#D10005)" }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1d2129]">{pct}%</span>
                    </div>
                    {s.claimed ? (
                      <span className="shrink-0 rounded-lg bg-[#eef7ee] px-4 py-2 text-[13px] font-bold text-[#3DB54A]">{tx.claimed}</span>
                    ) : claimable ? (
                      <button onClick={() => claimStep(s)} className="shrink-0 rounded-lg bg-[#3DB54A] px-4 py-2 text-[13px] font-bold text-white active:scale-95">{tx.claim}</button>
                    ) : (
                      <button onClick={() => challenge(s)} className="shrink-0 rounded-lg bg-[#D10005] px-4 py-2 text-[13px] font-bold text-white active:scale-95">{tx.challenge}</button>
                    )}
                  </div>

                  {/* Reward + details toggle */}
                  <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#1d2129]">{tx.reward}<GemIcon size={16} /><span className="tabular-nums">{s.reward}</span></span>
                    <button onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))} className="flex items-center gap-1 text-[12px] font-bold text-[#8a9099]">
                      {isOpen ? tx.hideDetails : tx.showDetails}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" stroke="#8a9099" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                  {isOpen && <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#5b616b]">{copy.detail}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>

      {/* Claim toast */}
      {toast && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1d2129] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg" style={{ animation: "heroBubbleIn .2s ease-out both" }}>
          {toast}
        </div>
      )}
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
  purchasedIds,
  onPackagePurchased,
  savedCards,
  onSaveCard,
  onDeleteCard,
}: {
  lang: Lang;
  coins: number;
  setCoins: Dispatch<SetStateAction<number>>;
  onBack: () => void;
  onHome?: () => void;
  onOpenStore?: () => void;
  onRequireKyc?: () => boolean;
  onDrawItem?: (item: OripaItem) => void;
  purchasedIds?: string[];
  onPackagePurchased?: (pkgId: string) => void;
  savedCards: SavedCard[];
  onSaveCard: (card: SavedCard) => void;
  onDeleteCard: (idx: number) => void;
}) {
  const t = STR[lang];
  const openLegal = useContext(LegalNavContext);
  const enableCurrencyCheckout = (() => {
    try {
      const auth = JSON.parse(sessionStorage.getItem("authData") || "{}");
      return String(auth.email || "").toLowerCase() === DEMO_INR_EMAIL;
    } catch {
      return false;
    }
  })();
  return (
    <CashierLegalContext.Provider value={openLegal}>
      <StorePageView
        lang={lang}
        coins={coins}
        setCoins={setCoins}
        onBack={onBack}
        purchasedIds={purchasedIds}
        onPackagePurchased={onPackagePurchased}
        chrome={{
          header: <AppHeader coins={coins} t={t} onHome={onHome ?? onBack} onOpenStore={onOpenStore} />,
          footer: <SiteFooter t={t} />,
          checkout: ({ pkg, onComplete, onClose, onSelectPackage }) => (
            <PurchaseFlow
              pkg={pkg}
              lang={lang}
              onComplete={onComplete}
              onClose={onClose}
              onSelectPackage={onSelectPackage}
              savedCards={savedCards}
              onSaveCard={onSaveCard}
              onDeleteCard={onDeleteCard}
              onRequireKyc={onRequireKyc}
              onDrawItem={onDrawItem}
              enableCurrencyCheckout={enableCurrencyCheckout}
            />
          ),
        }}
      />
    </CashierLegalContext.Provider>
  );
}

/* ── Not enough coins ────────────────────────────────────────────────────
   A paid draw that costs more than the wallet holds stops here first: the
   shortfall is spelled out before the store is offered, so topping up is a
   choice rather than something the app does on the user's behalf. */
function NotEnoughCoinsPopup({ lang, coins, cost, onCharge, onClose }: { lang: Lang; coins: number; cost: number; onCharge: () => void; onClose: () => void }) {
  const t = STR[lang];
  const shortBy = Math.max(0, cost - coins);
  return (
    <div
      className="animate-popup-backdrop absolute inset-0 z-[75] flex items-center justify-center p-4 backdrop-blur-[3px]"
      style={{ background: "rgba(20,8,4,0.45)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-popup-pop w-full max-w-[340px] rounded-2xl bg-white px-5 pb-5 pt-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        style={{ fontFamily: "var(--font-noto-sans-jp), system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[20px] font-extrabold leading-none text-[#0F0F0F]">{t.noCoinsTitle}</h3>
        {/* Balance before → after, in the same 39px box the draw popups use. */}
        <div className="mt-3.5 flex h-[39px] w-full items-center justify-center gap-3 rounded-lg border-2 border-[#e7e7e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <span className="flex items-center gap-2">
            <CoinIcon size={30} />
            <span className="text-[20px] font-extrabold leading-none text-[#0F0F0F]">{coins.toLocaleString()}</span>
          </span>
          <BalanceArrow />
          <span className="flex items-center gap-2">
            <CoinIcon size={30} />
            <span className="text-[20px] font-extrabold leading-none text-[#D10005]">{(coins - cost).toLocaleString()}</span>
          </span>
        </div>
        <p className="mx-auto mt-3 max-w-[290px] text-[13px] font-medium leading-[1.45] text-[#D10005]">
          {t.noCoinsShortPre}
          <span className="font-extrabold">{t.noCoinsShortAmount(shortBy.toLocaleString())}</span>
          {t.noCoinsShortPost}
        </p>
        <button onClick={onCharge} className="mt-3.5 h-[39px] w-full rounded-lg bg-[#D10005] text-[15px] font-extrabold leading-none text-white active:scale-[0.99]">
          {t.noCoinsCta}
        </button>
        <button onClick={onClose} className="mt-2.5 h-[39px] w-full rounded-lg border-2 border-[#696969] bg-white text-[15px] font-bold leading-none text-[#696969] active:scale-[0.99]">
          {t.drawLimitClose}
        </button>
      </div>
    </div>
  );
}

export function PhoneApp({ lang, noHistory, onScreenChange, initialKycScenario = "none", freeShipAvailable = true, onDrawResultsChange, addressProvided = true, dailyLimitReached = false, drawScenario = "off", multiCurrency = true }: {
  lang: Lang; noHistory: boolean; onScreenChange?: (s: Screen) => void; initialKycScenario?: KycScenario; freeShipAvailable?: boolean; onDrawResultsChange?: (open: boolean) => void; addressProvided?: boolean; dailyLimitReached?: boolean; drawScenario?: DrawScenario; multiCurrency?: boolean;
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
  // Shared across Store cashier + Quick Purchase so LAST USED stays in sync.
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [savedCards, setSavedCards] = useState<QuickSavedCard[]>([
    { last4: "1111", expiry: "08/29", brand: "Visa", name: "Taro Yamada" },
    // Demo-only cards that always decline in Store cashier (not Quick Purchase).
    { last4: "9999", expiry: "11/28", brand: "Visa", name: "Taro Yamada" },
    { last4: "8888", expiry: "09/27", brand: "Mastercard", name: "Taro Yamada" },
  ]);
  const promoteSavedCard = (card: QuickSavedCard) => {
    setSavedCards((prev) => {
      const rest = prev.filter((c) => !(c.last4 === card.last4 && c.brand === card.brand && c.expiry === card.expiry));
      return [card, ...rest];
    });
  };
  // Quick Purchase sheet when a paid draw costs more than the wallet balance.
  const [quickPurchase, setQuickPurchase] = useState<QuickPurchasePending | null>(null);
  // Draw interrupted by a top-up: its confirmation re-opens once the receipt
  // is closed.
  const [pendingConfirm, setPendingConfirm] = useState<{ count: number; token: number } | null>(null);
  const [quickPurchasePaid, setQuickPurchasePaid] = useState(false);
  // Shortfall popup shown before the Quick Purchase sheet; its CTA is what
  // actually opens the sheet.
  const [shortfall, setShortfall] = useState<QuickPurchasePending | null>(null);
  const attemptDraw = (count: number, billCount?: number) => {
    const billed = billCount ?? count;
    const cost = billed * DRAW_PRICE;
    if (cost > coins) {
      setShortfall({ drawCount: count, billCount: billed, cost });
      return false;
    }
    setCoins((c) => c - cost);
    return true;
  };
  // The draw confirmation states its own shortfall, so its Charge/Top Up CTA
  // opens the sheet directly instead of repeating it in the shortfall popup.
  const openTopUpForDraw = (count: number) => setQuickPurchase({ drawCount: count, billCount: count, cost: count * DRAW_PRICE });
  // john.inr@gmail.com → Quick Purchase / cashier show INR + JPY currency picker.
  const intlLocalCurrency: IntlCurrencyInfo | null = (() => {
    try {
      const auth = JSON.parse(sessionStorage.getItem("authData") || "{}");
      if (String(auth.email || "").toLowerCase() === DEMO_INR_EMAIL) {
        return { code: "INR", symbol: "₹", rateFromJpy: 0.6103 };
      }
    } catch {}
    return null;
  })();
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
  // Seeded with a default address when the demo "Address provided" toggle is
  // on; empty otherwise so the flow opens on the "Add address" form. Resets
  // whenever the toggle flips.
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddr[]>(addressProvided ? DEFAULT_SHIPPING_ADDRESSES : []);
  useEffect(() => {
    setShippingAddresses(addressProvided ? DEFAULT_SHIPPING_ADDRESSES : []);
  }, [addressProvided]);
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
  // Lobby scroll offset, tracked live and restored whenever the lobby remounts,
  // so returning from a draw (or another screen) lands the user where they were
  // instead of at the top. Owned by the root so it survives the lobby's remount.
  const homeScroll = useRef(0);
  // Applied lobby search/filter state. Owned by the root (not the lobby) so it
  // survives the lobby's remount — returning from a draw keeps the same filters
  // in place. Only the "Filter" CTA (or chip / clear actions) mutate these.
  const [lobbyQuery, setLobbyQuery] = useState("");
  const [lobbyFilters, setLobbyFilters] = useState<Record<string, boolean>>({});
  const [lobbyPriceMin, setLobbyPriceMin] = useState(0);
  const [lobbyPriceMax, setLobbyPriceMax] = useState(PRICE_MAX);
  const applyLobby = (q: string, f: Record<string, boolean>, min: number, max: number) => {
    setLobbyQuery(q); setLobbyFilters(f); setLobbyPriceMin(min); setLobbyPriceMax(max);
  };
  const toggleLobbyFilter = (k: string) => setLobbyFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearLobbyFilters = () => { setLobbyQuery(""); setLobbyFilters({}); setLobbyPriceMin(0); setLobbyPriceMax(PRICE_MAX); };
  // Returning to the lobby also ends any draw played out over it, so the
  // results screen can't outlive the tap that leaves it.
  const goHome = () => { setLobbyDraw(null); setScreen("oripa"); };
  // Tapping the logo is a fresh start: it drops the selected category, the search
  // text and any applied filters, and returns to the top of the lobby — what a
  // user sees right after logging in. Bumping the key remounts the lobby, which
  // is what clears the category and search state it owns. Back buttons keep using
  // goHome, which deliberately preserves all of that.
  const [homeKey, setHomeKey] = useState(0);
  const resetHome = () => {
    clearLobbyFilters();
    homeScroll.current = 0;
    setHomeKey((k) => k + 1);
    setLobbyDraw(null);
    setScreen("oripa");
  };
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
    // Resume in-place quick purchase sheet instead of bouncing to the store.
    if (_context === "purchase" && quickPurchase) return;
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
  // Quest (pack-purchase chain) is reached from the My Page "Quests" menu row;
  // back returns to My Page.
  const openQuest = () => setScreen("quest");
  // Draw screen (gacha pack detail) opens when a lobby pack's Draw / View is
  // tapped; back returns to the lobby.
  const [drawItem, setDrawItem] = useState<OripaItem | null>(null);
  // A lobby card's CTA draws without leaving the lobby: the pack and the
  // requested draw are held here and handed to a DrawFlow mounted over the feed.
  const [lobbyDraw, setLobbyDraw] = useState<{ item: OripaItem; request: DrawRequest } | null>(null);
  // Dropping the held lobby request keeps its DrawFlow from replaying the draw
  // when the lobby is next mounted.
  const openDraw = (item: OripaItem) => { setLobbyDraw(null); setDrawItem(item); setScreen("drawDetail"); };
  const requestLobbyDraw = (item: OripaItem, req: Omit<DrawRequest, "token">) =>
    setLobbyDraw({ item, request: { ...req, token: Date.now() } });
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
        {screen === "oripa" && <OripaHome key={homeKey} lang={lang} coins={coins} onHome={resetHome} onOpenStore={openStore} onOpenDraw={openDraw} onRequestDraw={requestLobbyDraw} scrollRef={homeScroll} query={lobbyQuery} filters={lobbyFilters} priceMin={lobbyPriceMin} priceMax={lobbyPriceMax} onApply={applyLobby} onToggleApplied={toggleLobbyFilter} onClearAll={clearLobbyFilters} />}
        {screen === "drawDetail" && drawItem && (
          <DrawDetail
            key={drawItem.id}
            lang={lang}
            item={drawItem}
            coins={coins}
            onBack={goHome}
            onHome={resetHome}
            onOpenStore={openStore}
            onOpenDraw={openDraw}
            freeShipAvailable={freeShipAvailable}
            dailyLimitReached={dailyLimitReached}
            drawScenario={drawScenario}
            multiCurrency={multiCurrency}
            onResultsChange={onDrawResultsChange}
            shippingAddresses={shippingAddresses}
            onShippingAddressesChange={setShippingAddresses}
            onAttemptPaidDraw={attemptDraw}
            onTopUp={openTopUpForDraw}
            pendingConfirm={pendingConfirm}
            onPendingConfirmConsumed={() => setPendingConfirm(null)}
          />
        )}
        {screen === "notifications" && <NotificationsScreen lang={lang} coins={coins} empty={noHistory} only={notifOnly} onBack={() => setScreen(prevScreen)} onHome={resetHome} onOpenStore={openStore} />}
        {screen === "mypage" && (
          <MyPage
            lang={lang}
            coins={coins}
            displayName={displayName}
            onOpenQuest={openQuest}
            onOpenPrizeHistory={() => setScreen("prizeHistory")}
            onOpenMyLoot={openMyLoot}
            onOpenPurchaseHistory={() => setScreen("purchaseHistory")}
            onOpenAnnouncements={openAnnouncements}
            onOpenShippingAddress={() => setScreen("shippingAddress")}
            onOpenProfile={() => setScreen("profile")}
            onHome={resetHome}
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
              header: <AppHeader coins={coins} t={t} onHome={resetHome} onOpenStore={openStore} />,
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
            onHome={resetHome}
            empty={false}
            onGoGacha={goHome}
            onRequestKyc={() => requestKyc("prizeHistory")}
            onOpenStore={openStore}
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
            onHome={resetHome}
            empty={false}
            onGoGacha={goHome}
            lootMode
            onRequestKyc={() => requestKyc("prizeHistory")}
            freeShipAvailable={freeShipAvailable}
            onOpenStore={openStore}
          />
        )}
        {screen === "purchaseHistory" && (
          <PurchaseHistoryPage
            lang={lang}
            coins={coins}
            onBack={() => setScreen("mypage")}
            onHome={resetHome}
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
            onHome={resetHome}
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
            onHome={resetHome}
            onOpenStore={openStore}
            onRequireKyc={() => requestKyc("purchase")}
            onDrawItem={openDraw}
            purchasedIds={purchasedIds}
            onPackagePurchased={(pkgId) => setPurchasedIds((prev) => (prev.includes(pkgId) ? prev : [...prev, pkgId]))}
            savedCards={savedCards}
            onSaveCard={promoteSavedCard}
            onDeleteCard={(idx) => setSavedCards((prev) => prev.filter((_, i) => i !== idx))}
          />
        )}
        {screen === "coinHistory" && (
          <CoinHistoryPage
            lang={lang}
            coins={coins}
            onBack={() => setScreen(coinHistoryReturn)}
            onHome={resetHome}
            onOpenStore={openStore}
          />
        )}
        {screen === "quest" && (
          <QuestScreen
            lang={lang}
            coins={coins}
            setCoins={setCoins}
            onBack={() => setScreen("mypage")}
            onHome={resetHome}
            onOpenStore={openStore}
          />
        )}
        </div>
        {shortfall && (
          <NotEnoughCoinsPopup
            lang={lang}
            coins={coins}
            cost={shortfall.cost}
            onCharge={() => { setQuickPurchase(shortfall); setShortfall(null); }}
            onClose={() => setShortfall(null)}
          />
        )}
        {quickPurchase && (
          <QuickPurchaseFlow
            lang={lang}
            neededCoins={Math.max(0, quickPurchase.cost - coins)}
            purchasedIds={purchasedIds}
            savedCards={savedCards}
            onSaveCard={promoteSavedCard}
            localCurrency={intlLocalCurrency}
            // Closing the receipt of a completed purchase returns to the draw
            // that needed the coins, at its confirmation popup. Closing without
            // paying just dismisses the sheet.
            onClose={() => {
              const pending = quickPurchase;
              const paid = quickPurchasePaid;
              setQuickPurchase(null);
              setQuickPurchasePaid(false);
              if (paid) setPendingConfirm({ count: pending.drawCount, token: Date.now() });
            }}
            onPaid={(pkg) => {
              setCoins((c) => c + pkg.coins);
              setPurchasedIds((prev) => [...prev, pkg.id]);
              setQuickPurchasePaid(true);
            }}
            onRequireKyc={() => requestKyc("purchase")}
          />
        )}
        {/* Draws started from a lobby card play out over the feed — the pack
            page is only reached by tapping a card's artwork. */}
        {screen === "oripa" && lobbyDraw && (
          <DrawFlow
            key={lobbyDraw.item.id}
            lang={lang}
            item={lobbyDraw.item}
            coins={coins}
            request={lobbyDraw.request}
            freeShipAvailable={freeShipAvailable}
            onResultsChange={onDrawResultsChange}
            shippingAddresses={shippingAddresses}
            onShippingAddressesChange={setShippingAddresses}
            dailyLimitReached={dailyLimitReached}
            drawScenario={drawScenario}
            multiCurrency={multiCurrency}
            onHome={resetHome}
            onOpenStore={openStore}
            onOpenDraw={openDraw}
            onAttemptPaidDraw={attemptDraw}
            onTopUp={openTopUpForDraw}
            pendingConfirm={pendingConfirm}
            onPendingConfirmConsumed={() => setPendingConfirm(null)}
          />
        )}
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
