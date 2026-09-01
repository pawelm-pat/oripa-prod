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
  ErrorScenario,
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
import { NOTIF_YOU, NOTIF_NOTICE, NOTIF_UNREAD_TOTAL, randomNotif } from "../data/notifications";
import { LEGAL, type LegalDocKey } from "../data/legal";
import { FAQ, type FaqCategoryKey } from "../data/faq";
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
// Unread notifications left in the two lists — what the bell badge counts.
const NotifBadgeContext = createContext<number>(NOTIF_UNREAD_TOTAL);
// Tapping the currency balances in the header opens the Coin History screen.
const CoinHistoryNavContext = createContext<() => void>(() => {});
// Opening a legal document (Terms / Privacy / SCTA) reader from anywhere.
const LegalNavContext = createContext<(doc: LegalDocKey) => void>(() => {});
// Picking a category from the footer, which behaves like the lobby's own
// category bar: it selects the category and parks that bar at the top.
const CatNavContext = createContext<(key: string) => void>(() => {});
// The support inquiry form. It is a modal rather than a screen, so the footer
// and the FAQ page can both raise it without anyone losing their place.
const InquiryNavContext = createContext<() => void>(() => {});
// A category request travels as a token so the same category tapped twice
// still re-scrolls the feed.
type CatRequest = { key: string; token: number };

// A draw that ends in "Sold Out!" or "Expired" retires that pack for the rest
// of the session, so the lobby card and its page keep saying so after the
// player walks away. Keyed by pack id; the harness clears it when the draw
// scenario goes back to the happy path.
type PackStatus = "soldOut" | "expired";
const PackStatusContext = createContext<Record<string, PackStatus>>({});
const PackRetireContext = createContext<(id: string, status: PackStatus) => void>(() => {});
function withPackStatus(item: OripaItem, statuses: Record<string, PackStatus>): OripaItem {
  const status = statuses[item.id];
  if (!status) return item;
  return status === "soldOut"
    ? { ...item, soldOut: true, remaining: 0 }
    : { ...item, expired: true, remaining: 0 };
}
// Cards and the pack page both read the live status rather than the raw
// catalogue entry.
function useLivePack(item: OripaItem) {
  const statuses = useContext(PackStatusContext);
  return useMemo(() => withPackStatus(item, statuses), [item, statuses]);
}

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

// Counts stop reading at 99; anything past that shows as "99+" so the badge
// keeps its pill shape.
const badgeCount = (n: number) => (n > 99 ? "99+" : String(n));

function BellIcon({ label }: { label: string }) {
  const openNotif = useContext(NotifNavContext);
  const unread = useContext(NotifBadgeContext);
  return (
    <button onClick={openNotif} aria-label={label} className="relative flex h-8 w-8 items-center justify-center">
      {/* 24×24 per design. */}
      <img src="/bell-notification.png" alt="" className="h-6 w-6 object-contain" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#D10005] px-1 text-[9px] font-extrabold leading-none text-white ring-2 ring-white">{badgeCount(unread)}</span>
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
function PriceStack({ t, showPoint, price = DRAW_PRICE }: { t: Dict; showPoint: boolean; price?: number }) {
  const row = (icon: React.ReactNode) => (
    <span className="flex h-10 items-center gap-[8.5px]">
      <span className="flex w-9 shrink-0 justify-end">{icon}</span>
      {/* No thousands separator here: the design draws "1000/draw", and a comma's
          tail would sit in the gap the red rule needs. */}
      <span className="flex items-baseline border-b-[3px] border-[#D10005] pb-[3px]">
        <span className="text-[21px] font-extrabold leading-none text-[#1d2129]">{price}</span>
        <span className="ml-[1px] text-[14px] font-extrabold leading-none text-[#1d2129]">{t.perDraw}</span>
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

function OripaCard({ item: pack, t, onView, onRequestDraw }: { item: OripaItem; t: Dict; onView?: () => void; /** A tapped CTA draws in place; only the banner opens the pack page. */ onRequestDraw?: (req: Omit<DrawRequest, "token">) => void }) {
  // A pack retired earlier in the session reads as sold out / expired here too.
  const item = useLivePack(pack);
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
          <PriceStack t={t} showPoint={item.gem} price={packPrice(item)} />
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

// The slides stand in for campaign creative, so a tapped banner opens a pack
// that can actually be drawn — sold-out and expired packs are skipped, and the
// slide index picks one so a given banner always leads to the same oripa.
const BANNER_PACKS = ALL_ORIPA.filter((it) => !it.expired && !it.soldOut && it.remaining > 0);
const bannerPack = (slide: number) => BANNER_PACKS[slide % BANNER_PACKS.length];

// V1 homepage top: auto-advancing promo carousel. Slides walk into a cloned
// first slide for a seamless wrap, then snap back without animation.
function PromoCarousel({ onOpenSlide }: { onOpenSlide?: (slide: number) => void }) {
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
          {Array.from({ length: slideCount }).map((_, i) => {
            // Each slide owns its 8:3 ratio so its height never depends on a
            // fragile h-full chain through the flex track. The cloned wrap
            // slide leads to the same pack as the first one.
            const slide = i % n;
            const art = (
              <>
                <img src="/placeholder-banner.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center text-[18px] font-extrabold tracking-wide text-[#1d2129]">
                  PROMO BANNER
                </span>
              </>
            );
            return onOpenSlide ? (
              <button key={i} type="button" onClick={() => onOpenSlide(slide)} className="relative aspect-[8/3] w-full shrink-0">
                {art}
              </button>
            ) : (
              <div key={i} className="relative aspect-[8/3] w-full shrink-0">
                {art}
              </div>
            );
          })}
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

// Footer category chips map onto the lobby's category bar, in the order the
// labels are listed in `ftCats`.
const FOOTER_CAT_KEYS = ["new", "popular", "pokemon", "limited", "other", "all"];
// The operator behind Oripalot; its own site opens in a new tab.
const OPERATOR_URL = "https://ks-limited.com/";

function SiteFooter({ t }: { t: Dict }) {
  const openLegal = useContext(LegalNavContext);
  const openCat = useContext(CatNavContext);
  const openInquiry = useContext(InquiryNavContext);
  // The first two chips are the operator's own site and the support desk; the
  // rest are legal documents shown in the overlay.
  const chip = (label: string, i: number) => {
    const doc: LegalDocKey | null = label === t.mpTerms ? "terms" : label === t.mpPrivacy ? "privacy" : label === t.mpLegal ? "legal" : label === t.mpAntisocial ? "antisocial" : null;
    // Height and padding follow the footer button in the design.
    const chipClass = "inline-flex h-[26px] items-center rounded-full bg-white px-5 text-[12px] font-bold text-[#1d2129]";
    if (i === 0) {
      return (
        <a key={label} href={OPERATOR_URL} target="_blank" rel="noreferrer" style={{ color: "#1d2129" }} className={`${chipClass} active:bg-white/80`}>{label}</a>
      );
    }
    if (i === 1) {
      return <button key={label} onClick={openInquiry} className={`${chipClass} active:bg-white/80`}>{label}</button>;
    }
    return doc ? (
      <button key={label} onClick={() => openLegal(doc)} className={`${chipClass} active:bg-white/80`}>{label}</button>
    ) : (
      <span key={label} className={chipClass}>{label}</span>
    );
  };
  return (
    <footer className="bg-black px-4 py-7 text-white">
      <img src="/oripa-logo-footer.png" alt="オリパロット" className="h-[55px] w-[199px] object-contain" />
      <p className="mt-3 text-[11px] text-white">{t.ftCopyright}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-white">{t.ftBlurb}</p>

      <h4 className="mt-6 text-[14px] font-bold">{t.ftAbout}</h4>
      <div className="mt-3 flex flex-wrap gap-2.5">{t.ftLinks.map((label, i) => chip(label, i))}</div>

      <h4 className="mt-6 text-[14px] font-bold">{t.ftCategories}</h4>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {t.ftCats.map((label, i) => (
          <button
            key={label}
            onClick={() => openCat(FOOTER_CAT_KEYS[i] ?? "all")}
            className="inline-flex h-[26px] items-center rounded-full bg-white px-5 text-[12px] font-bold text-[#1d2129] active:bg-white/80"
          >
            {label}
          </button>
        ))}
      </div>

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
        {t.ftSupport.split(":")[0]}: <button onClick={openInquiry} className="underline decoration-white/50 active:opacity-70">{t.ftSupport.split(":").slice(1).join(":").trim()}</button>
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
function LobbyNavFeed({ t, lang, query, filters, priceMin, priceMax, onApply, onToggleApplied, onClearAll, onView, onOpenDraw, onRequestDraw, catRequest, showPromo = false }: { t: Dict; lang: Lang; query: string; filters: Record<string, boolean>; priceMin: number; priceMax: number; onApply: (q: string, f: Record<string, boolean>, min: number, max: number) => void; onToggleApplied: (k: string) => void; onClearAll: () => void; onView?: () => void; onOpenDraw?: (item: OripaItem) => void; onRequestDraw?: (item: OripaItem, req: Omit<DrawRequest, "token">) => void; catRequest?: CatRequest | null; showPromo?: boolean }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  const [cat, setCat] = useState(catRequest?.key ?? "all");
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

  // A category picked in the footer acts like its twin in the category bar,
  // then brings that bar to the top of the screen — the feed starts where the
  // hero banner ends, which is where the lobby's own chips would leave it.
  const catToken = catRequest?.token;
  const catSeenRef = useRef(catToken);
  useEffect(() => {
    if (!catToken) return;
    if (catToken !== catSeenRef.current) {
      catSeenRef.current = catToken;
      selectCat(catRequest!.key);
    }
    const el = rootRef.current;
    const scroller = el?.closest(".overflow-y-auto") as HTMLElement | null;
    if (el && scroller) {
      const top = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTo({ top });
      // The jump is navigation, not a scroll gesture, so the search bar stays
      // open. Lock the collapse logic while the expansion and the reflow it
      // causes settle, then re-anchor it at wherever the feed ended up.
      searchHiddenRef.current = false;
      setSearchHidden(false);
      lastScrollY.current = top;
      scrollLockRef.current = true;
      window.setTimeout(() => {
        scrollLockRef.current = false;
        lastScrollY.current = scroller.scrollTop;
      }, 380);
    }
    // selectCat is recreated every render; the token guard is what gates this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catToken]);

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
    // Price range reads each pack's own draw price; a max at the slider ceiling
    // means "and above", so it stops capping.
    if (priceActive) {
      arr = arr.filter((it) => {
        const p = packPrice(it);
        return p >= priceMin && (priceMax >= PRICE_TOP || p <= priceMax);
      });
    }
    // Tag filters have no data behind them, so they thin the feed instead.
    if (filterCount) arr = arr.filter((_, i) => i % (filterCount + 1) !== 0);
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
  // real art later. Only the logged-in lobby shows it (the logged-out landing
  // carries its own carousel at the top), and a tapped slide opens its pack.
  const promoBanners = showPromo ? (
    <div className="px-3.5 pt-3"><PromoCarousel onOpenSlide={(s) => openCard(bannerPack(s))} /></div>
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

function OripaHome({ lang, coins, onHome, onOpenStore, onOpenDraw, onRequestDraw, scrollRef, query, filters, priceMin, priceMax, onApply, onToggleApplied, onClearAll, catRequest }: { lang: Lang; coins: number; onHome: () => void; onOpenStore?: () => void; onOpenDraw?: (item: OripaItem) => void; onRequestDraw?: (item: OripaItem, req: Omit<DrawRequest, "token">) => void; scrollRef?: { current: number }; query: string; filters: Record<string, boolean>; priceMin: number; priceMax: number; onApply: (q: string, f: Record<string, boolean>, min: number, max: number) => void; onToggleApplied: (k: string) => void; onClearAll: () => void; catRequest?: CatRequest | null }) {
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

        <LobbyNavFeed t={t} lang={lang} query={query} filters={filters} priceMin={priceMin} priceMax={priceMax} onApply={onApply} onToggleApplied={onToggleApplied} onClearAll={onClearAll} onOpenDraw={onOpenDraw} onRequestDraw={onRequestDraw} catRequest={catRequest} showPromo />

        <SiteFooter t={t} />
      </FeedScroller>
    </div>
  );
}

/* ── Draw screen (gacha pack detail) ─────────────────────────────────────
   Opened from the lobby when a pack's Draw / View is tapped. Shows the pack
   banner, remaining/period, and the prize line-up by tier (1st = UR / holo,
   2nd = SR / gold, 3rd = N / silver), with a sticky draw CTA. */
const DRAW_PRICE = 1000; // coins per single draw where a pack doesn't set its own
// Packs price their own draws; the constant is the fallback.
const packPrice = (item?: Pick<OripaItem, "price">) => item?.price ?? DRAW_PRICE;
// Free-point balance shown as the "before" value in the draw-confirmation
// popup (mirrors the static free-point figure shown across the app).
const DRAW_FREE_POINTS = 10000;
const MAX_CUSTOM_DRAW = 100; // cap for the custom-draw quantity stepper
const DEFAULT_CUSTOM_DRAW = 5; // quantity the custom-draw popup opens on
// +5 / +10 / MAX buttons under the custom-draw stepper. The two increments
// keep the design's fixed width; MAX takes the rest of the row because its
// label spells the cap out.
const quickAddCls = "flex h-[30px] shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] border-2 border-[#0F0F0F] bg-white font-bold leading-none text-[#0F0F0F] active:scale-95";
const quickAddFixedCls = `${quickAddCls} w-[90px] text-[14px]`;
const quickAddMaxCls = `${quickAddCls} min-w-0 flex-1 px-1 text-[13px]`;

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
function DrawFlow({ lang, item, coins, request, soldOut = false, onSoldOut, freeShipAvailable = true, onResultsChange, shippingAddresses, onShippingAddressesChange, dailyLimitReached = false, drawScenario = "off", multiCurrency = true, onHome, onOpenStore, onOpenDraw, onResetScroll, onAttemptPaidDraw, onTopUp, pendingConfirm, onPendingConfirmConsumed }: { lang: Lang; item: OripaItem; coins: number; request: DrawRequest | null; soldOut?: boolean; /** The sold-out popup was dismissed, so the host can latch its greyed state. */ onSoldOut?: () => void; freeShipAvailable?: boolean; onResultsChange?: (open: boolean) => void; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; dailyLimitReached?: boolean; drawScenario?: DrawScenario; multiCurrency?: boolean; onHome: () => void; onOpenStore?: () => void; onOpenDraw?: (item: OripaItem) => void; /** Send the pack page behind the results back to the top when they close. */ onResetScroll?: () => void; /** Returns true if coins were debited and the draw may proceed; false if Quick Purchase opened. */ onAttemptPaidDraw?: (count: number) => boolean; /** The confirmation's Charge/Top Up CTA: open the store for a draw the wallet can't cover. */ onTopUp?: (count: number) => void; /** After Quick Purchase success, host re-opens this count's confirmation. */ pendingConfirm?: { count: number; token: number } | null; onPendingConfirmConsumed?: () => void }) {
  const t = STR[lang];
  // What one draw of this pack costs, in coins or in points.
  const price = packPrice(item);
  // Opens a stored legal document (T&Cs, etc.) in the shared overlay.
  const openLegal = useContext(LegalNavContext);
  // Draw demo scenarios (dev harness): expired pack, sold-out pack, connection
  // error, or insufficient remaining stock.
  const soldOutScenario = drawScenario === "soldOut";
  // Both scenarios stop the draw the same way: nothing is charged, a popup
  // explains why, and closing it greys the pack out.
  const expired = drawScenario === "expired" || soldOutScenario;
  const connError = drawScenario === "connError";
  const insufficientStock = drawScenario === "stock";
  // In the insufficient-stock scenario only this many draws remain.
  const STOCK_LEFT = 8;
  // "Expired" / "Sold Out" popup, shown when such a pack's draw is confirmed.
  const [expiredPopup, setExpiredPopup] = useState(false);
  // Dismissing it retires the pack for the session, so the lobby card and the
  // pack page keep the state after the player leaves.
  const retirePack = useContext(PackRetireContext);
  const closeExpiredPopup = () => {
    setExpiredPopup(false);
    retirePack(item.id, soldOutScenario ? "soldOut" : "expired");
    onSoldOut?.();
  };
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
  const [customQty, setCustomQty] = useState(DEFAULT_CUSTOM_DRAW);
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
    // Free draws leave both balances untouched.
    if (confirmFree) { runDraw(count); return; }
    // Free points leave the coin balance untouched, but a draw they can't cover
    // routes to the store just like a coin shortfall does.
    if (payCurrency === "points") {
      if (shortfallFor(count) > 0) { requestTopUp(count); return; }
      runDraw(count);
      return;
    }
    // Paid draw: debit via host (or open Quick Purchase if short).
    if (onAttemptPaidDraw) {
      setConfirmCount(null);
      if (!onAttemptPaidDraw(count)) return;
      runDraw(count);
      return;
    }
    if (coins < price * count) { pushToast(t.drawInsufficient); return; }
    runDraw(count);
  }

  function openCustom() {
    if (soldOut) return;
    setSheetClosing(false);
    setCustomQty(DEFAULT_CUSTOM_DRAW);
    setCustomOpen(true);
  }
  const setQty = (n: number) => setCustomQty(() => Math.min(MAX_CUSTOM_DRAW, Math.max(1, n)));
  // MAX is 100 draws whenever the chosen balance covers them, and the largest
  // affordable count when it doesn't, so nobody has to divide their wallet by
  // the draw price. It never lands below 1 so the popup keeps a drawable count
  // (the balance rows then show the shortfall).
  const maxAffordableQty = () => {
    const balance = payCurrency === "points" ? DRAW_FREE_POINTS : coins;
    return Math.min(MAX_CUSTOM_DRAW, Math.max(1, Math.floor(balance / price)));
  };

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
    if (payCurrency === "points") {
      if (shortfallFor(customQty) > 0) { requestTopUp(customQty); return; }
      runDraw(customQty);
      return;
    }
    if (onAttemptPaidDraw) {
      setCustomOpen(false);
      if (!onAttemptPaidDraw(customQty)) return;
      runDraw(customQty);
      return;
    }
    if (coins < price * customQty) { pushToast(t.drawInsufficient); return; }
    runDraw(customQty);
  }

  // Balance change for a draw of `count` — coins and free points shown as
  // current → after-draw. When the pack accepts both currencies each row is a
  // radio option (highlighted by its border) and only the chosen balance is
  // spent; the other stays greyed out and unchanged.
  function balanceRows(count: number) {
    const cost = price * count;
    const rows = [
      { key: "coins" as const, Icon: CoinIcon, balance: coins },
      { key: "points" as const, Icon: GemIcon, balance: DRAW_FREE_POINTS },
    ].filter((r) => multiCurrency || r.key === "coins");
    return (
      <div className="mt-3.5 space-y-2" role={multiCurrency ? "radiogroup" : undefined} aria-label={multiCurrency ? t.drawPayWith : undefined}>
        {rows.map(({ key, Icon, balance }) => {
          const selected = payCurrency === key;
          // A wallet can't go below zero, so a draw it can't cover reads as 0
          // rather than a negative figure — the shortfall note under the rows
          // is what states how much is missing.
          const after = Math.max(0, balance - cost);
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

  // A draw that costs more than the chosen wallet holds keeps its confirmation
  // open: the shortfall is spelled out under the balance and the confirm CTA
  // becomes the store, so topping up stays a choice. Coin packages grant free
  // points too, so a points shortfall leads to the same place.
  const shortfallFor = (count: number) =>
    Math.max(0, price * count - (payCurrency === "points" ? DRAW_FREE_POINTS : coins));
  const shortfallNote = (amount: number) => (
    <p className="mx-auto mt-3 max-w-[300px] text-center text-[13px] font-medium leading-[1.45] text-[#D10005]">
      {t.noCoinsShortPre}
      <span className="font-extrabold">
        {payCurrency === "points" ? t.noPointsShortAmount(amount.toLocaleString()) : t.noCoinsShortAmount(amount.toLocaleString())}
      </span>
      {payCurrency === "points" ? t.noPointsShortPost : t.noCoinsShortPost}
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

              {/* Quick-add — 30px tall on a 10px gap; the increments hold the
                  design's 94px width and MAX spans what's left. */}
              <div className="mt-3 flex items-center justify-center gap-[10px]">
                <button onClick={() => setQty(customQty + 5)} className={quickAddFixedCls}>{t.drawCustomAdd(5)}</button>
                <button onClick={() => setQty(customQty + 10)} className={quickAddFixedCls}>{t.drawCustomAdd(10)}</button>
                <button onClick={() => setQty(maxAffordableQty())} className={quickAddMaxCls}>{t.drawCustomMax(MAX_CUSTOM_DRAW)}</button>
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
          onClick={closeExpiredPopup}
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
            <h3 className={soldOutScenario ? "mt-4 text-[22px] font-extrabold text-[#1d2129]" : "mt-4 text-[12px] font-medium text-[#1d2129]"}>{soldOutScenario ? t.soldOutTitle : t.expiredTitle}</h3>
            <p className="mx-auto mt-2 max-w-[280px] text-[12px] font-medium leading-relaxed text-[#6b7075]">{soldOutScenario ? t.soldOutBody : t.expiredBody}</p>
            <button
              onClick={closeExpiredPopup}
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
              <span className="text-[20px] font-bold leading-none text-[#0F0F0F]">{(price * stockReqCount).toLocaleString()}</span>
              <span className="text-[10px] font-bold leading-tight text-[#878787]">{t.stockDrawCost(stockReqCount)}</span>
              <BalanceArrow height={15} />
              <CoinIcon size={26} />
              <span className="text-[20px] font-bold leading-none text-[#D10005]">{(price * STOCK_LEFT).toLocaleString()}</span>
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
          // Either way the pack page behind the results starts from the top,
          // so nobody lands mid-page where they left off before the draw.
          onDrawAgain={() => { const c = results?.length ?? 1; setResults(null); onResetScroll?.(); setConfirmCount(c); }}
          // Always lands on this pack's info page, including for draws started
          // from a lobby card (which never left the feed).
          onBackToInfo={() => { setResults(null); onResetScroll?.(); onOpenDraw?.(item); }}
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
function DrawDetail({ lang, item: pack, coins, onBack, onHome, onOpenStore, freeShipAvailable = true, onResultsChange, shippingAddresses, onShippingAddressesChange, dailyLimitReached = false, drawScenario = "off", multiCurrency = true, onOpenDraw, onAttemptPaidDraw, onTopUp, pendingConfirm, onPendingConfirmConsumed, guest }: { lang: Lang; item: OripaItem; coins: number; onBack: () => void; onHome: () => void; onOpenStore?: () => void; freeShipAvailable?: boolean; onResultsChange?: (open: boolean) => void; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; dailyLimitReached?: boolean; drawScenario?: DrawScenario; multiCurrency?: boolean; onOpenDraw?: (item: OripaItem) => void; /** Returns true if coins were debited and the draw may proceed; false if Quick Purchase opened. */ onAttemptPaidDraw?: (count: number) => boolean; /** The confirmation's Charge/Top Up CTA: open the store for a draw the wallet can't cover. */ onTopUp?: (count: number) => void; /** After Quick Purchase success, host re-opens this count's confirmation. */ pendingConfirm?: { count: number; token: number } | null; onPendingConfirmConsumed?: () => void; /** Signed-out visitor: the page is browsable, but any draw CTA asks for an account. */ guest?: { onSignUp: () => void; onLogin: () => void } }) {
  const t = STR[lang];
  // A pack retired in an earlier draw opens straight into its sold-out state.
  const item = useLivePack(pack);
  const price = packPrice(item);
  const openLegal = useContext(LegalNavContext);
  const [cautionOpen, setCautionOpen] = useState(false);
  // What the tapped CTA asked the flow to open.
  const [request, setRequest] = useState<DrawRequest | null>(null);
  // A visitor's draw never starts: every CTA on the page — fixed counts, custom
  // and free draws alike — goes through here, so all of them ask for a login.
  const requestDraw = (req: Omit<DrawRequest, "token">) => {
    if (guest) { guest.onLogin(); return; }
    setRequest({ ...req, token: Date.now() });
  };
  // A failed draw on an expired pack latches the greyed-out sold-out state;
  // `item.expired` packs open that way to begin with.
  const [soldOutHit, setSoldOutHit] = useState(false);
  const soldOut = item.remaining <= 0 || soldOutHit || !!item.expired || !!item.soldOut;
  // Only this many draws remain in the insufficient-stock scenario.
  const remainingShown = soldOut ? 0 : (drawScenario === "stock" ? 8 : item.remaining);
  const pct = soldOut ? 0 : Math.round((remainingShown / item.total) * 100);
  // Leaving the draw results (roll again or back to this page) rewinds the
  // page underneath them.
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      {/* A visitor has no wallet to show, so the page keeps the landing page's
          sign-up / login header instead of the balance pill. */}
      {guest
        ? <AuthHeader lang={lang} onSignUp={guest.onSignUp} onLogin={guest.onLogin} onHome={onHome} />
        : <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />}

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

      <div ref={scrollerRef} className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#eef0f3]">
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
              <PriceStack t={t} showPoint={multiCurrency} price={price} />
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
                // An expired pack says so here too, matching its lobby card.
                <p className="mt-2 text-center text-[15px] font-extrabold text-[#D10005]">{!item.soldOut && item.expired ? t.expiredLabel : t.soldOutLabel}</p>
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

      {/* Nothing to draw for a visitor, so the flow (and its wallet, shipping
          and results machinery) never mounts. */}
      {!guest && <DrawFlow
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
        onResetScroll={() => scrollerRef.current?.scrollTo({ top: 0 })}
        onAttemptPaidDraw={onAttemptPaidDraw}
        onTopUp={onTopUp}
        pendingConfirm={pendingConfirm}
        onPendingConfirmConsumed={onPendingConfirmConsumed}
      />}
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
        /* The remainder reads as one more card in the fan: a pale tile with the
           count in ink rather than a black slab behind the artwork. */
        <div
          className="absolute top-0 flex items-center justify-center rounded-[5px] bg-gradient-to-b from-[#F7F8FA] to-[#E4E7EC] text-[14px] font-extrabold leading-none text-[#0F0F0F] shadow-[0_2px_6px_rgba(0,0,0,0.22)] ring-1 ring-black/10"
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
            <h3 className="text-[20px] font-bold text-[#0F0F0F]">{t.exConfirmTitle}</h3>
            <p className="mx-auto mt-2 max-w-[300px] text-[12px] font-medium leading-relaxed text-[#0F0F0FB2]">{t.exConfirmBody}</p>
          </>
        )}
        {/* Card pile: makes it clear how many cards are being exchanged. Shows
            up to 5 faces; anything beyond collapses into a "+N" tile. */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <CardStack prizes={ordered} cardW={46} cardH={62} />
          {prizes.length > 1 && (
            <span className={`text-[12px] font-bold ${hasRare ? "text-[#6b7075]" : "text-[#0F0F0FB2]"}`}>{t.exCardCount(prizes.length)}</span>
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
      : screen === "prizeHistory" || screen === "purchaseHistory" || screen === "shippingAddress" || screen === "profile" || screen === "refer" || screen === "faq"
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
// category-filtered card sections. A visitor can browse any pack page; only a
// draw CTA asks them to log in.
function LandingPage({ lang, onSignUp, onLogin, onOpenDraw, onRequireLogin, catRequest }: { lang: Lang; onSignUp: () => void; onLogin: () => void; onOpenDraw: (item: OripaItem) => void; onRequireLogin: (item: OripaItem) => void; catRequest?: CatRequest | null }) {
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
        <div className="px-3 pb-4 pt-3"><PromoCarousel onOpenSlide={(s) => onOpenDraw(bannerPack(s))} /></div>

        {/* Card art opens the pack page; its inline draw CTAs need an account,
            so they route to login and come back to the same pack. */}
        <LobbyNavFeed t={t} lang={lang} query={query} filters={filters} priceMin={priceMin} priceMax={priceMax} onApply={applyLobby} onToggleApplied={toggleApplied} onClearAll={clearAll} onOpenDraw={onOpenDraw} onRequestDraw={(item) => onRequireLogin(item)} catRequest={catRequest} />

        <SiteFooter t={t} />
      </FeedScroller>
    </div>
  );
}

/* ── Error pages (dev harness scenarios) ──────────────────────────────────
   Dead-end pages the harness can arm: the next navigation lands here instead
   of the screen the user asked for. Both are a centred column over the site
   footer, with a single CTA out — home for the 404, and the page that was
   actually wanted for the maintenance notice. */
function ErrorScreen({ t, variant, coins, onHome, onRetry, onOpenStore }: { t: Dict; variant: "notFound" | "maintenance"; coins: number; onHome: () => void; onRetry: () => void; onOpenStore?: () => void }) {
  const notFound = variant === "notFound";
  return (
    <div className="flex h-full flex-col bg-white">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />
      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 pb-9 pt-9">
          <h1 className="max-w-[320px] text-center text-[34px] font-extrabold uppercase leading-[1.16] tracking-[-0.01em] text-[#0F0F0F33]">
            {notFound ? t.errNotFoundTitle : t.errMaintTitle}
          </h1>
          <img
            src={notFound ? "/error-notfound.png" : "/error-maintenance.png"}
            alt=""
            className="mt-3 h-[182px] w-auto select-none object-contain"
            draggable={false}
          />
          <p className="mt-4 max-w-[340px] text-center text-[12px] leading-[15px] text-[#0F0F0F80]">
            {notFound ? t.errNotFoundBody : t.errMaintBody}
          </p>
          {!notFound && (
            <p className="mt-4 max-w-[340px] text-center text-[12px] leading-[15px] text-[#0F0F0F80]">{t.errMaintBody2}</p>
          )}
          <button
            onClick={notFound ? onHome : onRetry}
            className="mt-5 h-[38px] w-full rounded-md bg-[#D10005] text-[15px] font-bold text-white active:scale-[0.99]"
          >
            {notFound ? t.errNotFoundCta : t.errMaintCta}
          </button>
        </div>
        <SiteFooter t={t} />
      </div>
    </div>
  );
}

/* ── PhoneApp ─────────────────────────────────────────────────────────── */


// A notification that slides to the left to uncover a bin. The row settles
// either fully open or closed on release, and the swipe that opened it is
// swallowed so it never reads as a tap on the notification underneath.
const NOTIF_BIN_W = 76;

function SwipeToDeleteRow({ open, removing, entering = false, onEntered, onOpen, onClose, onDelete, deleteLabel, children }: { open: boolean; removing: boolean; /** Just delivered: unfold into the list instead of appearing at full height. */ entering?: boolean; onEntered?: () => void; onOpen: () => void; onClose: () => void; onDelete: () => void; deleteLabel: string; children: React.ReactNode }) {
  const [drag, setDrag] = useState<number | null>(null);
  // A deleted row slides out and folds up, so the list closes the gap instead
  // of the rows below jumping. Pin the height first, then collapse from it.
  const foldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = foldRef.current;
    if (!el || !removing) return;
    el.style.maxHeight = `${el.scrollHeight}px`;
    const id = requestAnimationFrame(() => {
      el.style.maxHeight = "0px";
      el.style.opacity = "0";
      el.style.paddingBottom = "0px";
    });
    return () => cancelAnimationFrame(id);
  }, [removing]);
  // The entrance is a CSS animation, so it only has to be claimed once —
  // after that the row is an ordinary member of the list.
  useEffect(() => {
    if (entering) onEntered?.();
    // Deliberately mount-only: a re-render must not replay the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<"none" | "x" | "y">("none");
  const swipedRef = useRef(false);
  const offset = drag ?? (open ? -NOTIF_BIN_W : 0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    axisRef.current = "none";
    swipedRef.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (axisRef.current === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // A mostly-vertical move belongs to the list's own scrolling.
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisRef.current === "x") {
        swipedRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (axisRef.current !== "x") return;
    const base = open ? -NOTIF_BIN_W : 0;
    setDrag(Math.max(-NOTIF_BIN_W, Math.min(0, base + dx)));
  };
  const endDrag = () => {
    if (axisRef.current === "x") {
      const settled = (drag ?? 0) < -NOTIF_BIN_W / 2;
      if (settled) onOpen(); else onClose();
    }
    startRef.current = null;
    axisRef.current = "none";
    setDrag(null);
  };

  return (
    <div ref={foldRef} className={`grid overflow-hidden pb-2.5 transition-all duration-300 ease-out ${entering ? "animate-notif-in" : ""}`}>
    <div className={`relative overflow-hidden rounded-xl transition-transform duration-300 ease-out ${removing ? "-translate-x-6" : ""}`}>
      <button
        onClick={onDelete}
        aria-label={deleteLabel}
        className="absolute inset-y-0 right-0 flex w-[76px] flex-col items-center justify-center gap-1 bg-[#D10005] text-white active:bg-[#b00004]"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 13h10l1-13" />
        </svg>
        <span className="text-[11px] font-bold leading-none">{deleteLabel}</span>
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          // The click that trails a swipe isn't a tap on the notification.
          if (swipedRef.current) {
            e.preventDefault();
            e.stopPropagation();
            swipedRef.current = false;
            return;
          }
          // While the bin is showing, the next tap just puts the row back.
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        className={drag === null ? "transition-transform duration-200" : ""}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
      >
        {children}
      </div>
    </div>
    </div>
  );
}

function NotificationsScreen({ lang, coins, empty = false, only, sent, readIds, deletedIds, onRead, onDelete, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; empty?: boolean; only?: "you" | "notice"; /** Demo deliveries from the harness toggle, newest first. */ sent?: { you: NotifItem[]; notice: NotifItem[] }; readIds: Set<string>; deletedIds: Set<string>; onRead: (id: string) => void; onDelete: (id: string) => void; onBack: () => void; onHome: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const [tab, setTab] = useState<"you" | "notice">(only ?? "you");
  // Only one row shows its bin at a time.
  const [swipedId, setSwipedId] = useState<string | null>(null);
  // Which notifications have been opened or swiped away is owned by the app
  // root, so the bell badge counts the same items this screen lists.
  const isUnread = (it: NotifItem) => !empty && !!it.unread && !readIds.has(it.id);
  const markRead = onRead;
  // The row folds away first and leaves the list a beat later, so the panel
  // shrinks into the gap rather than snapping shut under the remaining rows.
  const [removingId, setRemovingId] = useState<string | null>(null);
  const deleteNotif = (id: string) => {
    if (removingId) return;
    setSwipedId((cur) => (cur === id ? null : cur));
    setRemovingId(id);
    window.setTimeout(() => {
      setRemovingId((cur) => (cur === id ? null : cur));
      onDelete(id);
    }, 300);
  };
  const alive = (l: NotifItem[]) => l.filter((it) => !deletedIds.has(it.id));
  const unreadCount = (l: NotifItem[]) => alive(l).filter(isUnread).length;
  // Anything the harness delivered sits above the seeded feed.
  const youAll = [...(sent?.you ?? []), ...NOTIF_YOU];
  const noticeAll = [...(sent?.notice ?? []), ...NOTIF_NOTICE];
  // Everything present when the screen opened is "already there"; whatever
  // turns up afterwards unfolds into the list on its first render.
  const [seenIds] = useState<Set<string>>(() => new Set([...youAll, ...noticeAll].map((n) => n.id)));
  const youUnread = unreadCount(youAll);
  const noticeUnread = unreadCount(noticeAll);

  const list = alive(tab === "you" ? youAll : noticeAll);
  const listEmpty = empty || list.length === 0;
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
                      <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#D10005] px-1 text-[10px] font-extrabold leading-none text-white">{badgeCount(tb.count)}</span>
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
        {/* Same mascot-and-message treatment the card screens use when their
            list runs out. It stays mounted and folds either way, so it grows
            into the space the last deleted row left and folds back out of the
            way as a freshly delivered one arrives. */}
        <div
          className={`grid transition-all duration-[420ms] ease-[cubic-bezier(0.2,0.75,0.25,1)] ${listEmpty ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col items-center py-16">
              <img src="/prize-character-wave.webp" alt="" className="mb-5 h-48 w-48 object-contain" />
              <p className="max-w-[334px] text-center text-[14px] leading-[17px] text-[#0F0F0F80]">{tab === "notice" ? t.notifEmptyNotice : t.notifEmpty}</p>
            </div>
          </div>
        </div>
        {!listEmpty && (
          <div className="px-3 pb-0.5 pt-3">
            {list.map((it) => {
              const un = isUnread(it);
              return (
                <SwipeToDeleteRow
                  key={it.id}
                  open={swipedId === it.id}
                  removing={removingId === it.id}
                  entering={!seenIds.has(it.id)}
                  onEntered={() => seenIds.add(it.id)}
                  onOpen={() => setSwipedId(it.id)}
                  onClose={() => setSwipedId((cur) => (cur === it.id ? null : cur))}
                  onDelete={() => deleteNotif(it.id)}
                  deleteLabel={t.notifDelete}
                >
                <button
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
                </SwipeToDeleteRow>
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
                {/* The selected tab's label picks up the same red as its
                    underline and count pill; the others stay ink. */}
                <span className={`text-[12px] font-bold ${active ? "text-[#D10005]" : "text-[#0F0F0F]"}`}>
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
                          {/* Winning History is an audit view, so each card
                              also states where the prize ended up. */}
                          {!lootMode && (
                            <p className="mt-1.5 text-[10px] font-normal leading-none tracking-normal text-[#0F0F0F]">
                              {`${t.itemsStatus} ${t.itemsStatusLabels[p.status ?? "notSelected"]}`}
                            </p>
                          )}
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
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setStep("address")} className="rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#000000]">{t.back}</button>
              <div className="relative">
                {shipBadge}
                <button onClick={onConfirm} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}>{freeShipAvailable ? t.requestShippingBtn : t.payRequestBtn}</button>
              </div>
            </div>
            {/* Footnote sits under the CTAs in both variants: the quota line
                changes with the free allowance, the delivery estimate doesn't. */}
            <p className="mt-3 text-center text-[11px] leading-[15px] text-[#8a9099]">
              {freeShipAvailable ? t.freeShip : t.paidShipNote}
              <br />
              {t.shipDeliveryNote}
            </p>
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

/* ── Refer a friend ──────────────────────────────────────────────────────
   Reached from the My Page "Invite Friends" tile. The member's promo code
   and invite link with their share routes, the referral tallies, what each
   milestone pays out and the latest activity on the link. */
// Both fields and both Copy buttons in the link card share this height, as
// the design draws them.
const REFER_CTA_H = "h-[34px]";
const referIcon = (src: string, size: number) => <img src={src} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} draggable={false} />;

/* Share destinations under the link. The POC has nothing to hand the link
   to, so a destination just reports which app would open. */
const X_GLYPH = (
  <span className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] bg-[#0F0F0F]">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M17.53 3h3.02l-6.6 7.54L21.7 21h-6.05l-4.74-6.2L5.48 21H2.46l7.06-8.07L2.3 3h6.2l4.29 5.67L17.53 3zm-1.06 16.2h1.67L7.6 4.7H5.8l10.67 14.5z" /></svg>
  </span>
);
const LINE_GLYPH = (
  <span className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] bg-[#06C755]">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 3.6c-4.7 0-8.5 3-8.5 6.8 0 3.4 3 6.2 7.1 6.7.27.06.65.18.75.42.09.22.06.55.03.77l-.12.72c-.04.21-.17.84.74.46s4.9-2.89 6.69-4.95c1.23-1.35 1.82-2.72 1.82-4.12 0-3.75-3.81-6.8-8.51-6.8zM8.3 12.5H6.6a.35.35 0 01-.35-.35V9.05c0-.2.16-.35.35-.35s.36.16.36.35v2.74H8.3c.2 0 .35.16.35.36a.35.35 0 01-.35.35zm1.4-.35a.35.35 0 01-.71 0V9.05a.35.35 0 01.71 0v3.1zm3.6 0a.35.35 0 01-.63.21l-1.6-2.16v1.95a.35.35 0 01-.71 0V9.05a.35.35 0 01.63-.21l1.6 2.17V9.05a.35.35 0 01.71 0v3.1zm2.4-1.9c.2 0 .36.16.36.35a.35.35 0 01-.36.36h-1.34v.79h1.34c.2 0 .36.16.36.35a.35.35 0 01-.36.35h-1.7a.35.35 0 01-.35-.35V9.05c0-.2.16-.35.35-.35h1.7c.2 0 .36.16.36.35a.35.35 0 01-.36.36h-1.34v.79h1.34z" /></svg>
  </span>
);

function ShareChip({ glyph, label, onClick }: { glyph: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-[44px] items-center gap-1.5 rounded-[10px] border border-[#EDEDED] bg-white px-2 text-[11.5px] font-medium text-[#0F0F0F] shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:bg-black/[0.03]">
      {glyph}
      <span className="truncate">{label}</span>
    </button>
  );
}

// Row icons for the reward table: the friend who signs up, the shop they
// buy their first coins in, then the ranks they climb.
const peopleGlyph = (color: string, size = 19) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <circle cx="9.2" cy="8.4" r="3.1" />
    <path d="M3.6 19c0-3 2.5-4.7 5.6-4.7s5.6 1.7 5.6 4.7" />
    <path d="M15.8 6.1a2.9 2.9 0 010 5.3M17.1 13.9c2 .6 3.3 2.2 3.3 4.3" />
  </svg>
);
/* What has happened on the member's link lately. The first four rows show
   on arrival; "View More Activity" reveals the rest. */
type ReferActivity = { user: string; deposit: boolean; ago: number; unit: "h" | "d"; avatar: string };
const REFER_ACTIVITY: ReferActivity[] = [
  { user: "User123", deposit: false, ago: 2, unit: "h", avatar: "/refer-avatar-2.png" },
  { user: "User456", deposit: true, ago: 5, unit: "h", avatar: "/refer-avatar-3.png" },
  { user: "User789", deposit: false, ago: 1, unit: "d", avatar: "/refer-avatar-4.png" },
  { user: "User101", deposit: true, ago: 2, unit: "d", avatar: "/refer-avatar-1.png" },
  { user: "User202", deposit: false, ago: 3, unit: "d", avatar: "/refer-avatar-3.png" },
  { user: "User303", deposit: true, ago: 4, unit: "d", avatar: "/refer-avatar-1.png" },
  { user: "User404", deposit: false, ago: 6, unit: "d", avatar: "/refer-avatar-2.png" },
];

function ReferFriendPage({ lang, coins, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; onBack: () => void; onHome: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const [toast, setToast] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [allActivity, setAllActivity] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function pushToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }
  function copy(text: string, confirmation: string) {
    // Clipboard access needs a secure context and permission, and rejects
    // asynchronously when it has neither; the confirmation shows either way.
    try {
      navigator.clipboard?.writeText(text).catch(() => {});
    } catch { /* no clipboard API */ }
    pushToast(confirmation);
  }

  // One field + Copy pair, used for the promo code and for the invite link.
  const copyRow = (value: string, clipboard: string, confirmation: string) => (
    <div className="mt-1.5 flex items-center gap-2">
      <div className={`flex ${REFER_CTA_H} min-w-0 flex-1 items-center truncate rounded-lg border border-[#DEDEDE] bg-white px-3 text-[12px] font-medium text-[#9d9d9d]`}>
        {value}
      </div>
      <button onClick={() => copy(clipboard, confirmation)} className={`flex ${REFER_CTA_H} w-[84px] shrink-0 items-center justify-center rounded-lg text-[14px] font-bold text-white active:scale-[0.98]`} style={{ background: "#D10005" }}>
        {t.rafCopy}
      </button>
    </div>
  );

  // A tally card. The Silver milestone is not live yet, so its card reads as
  // a placeholder rather than a count.
  const stat = (label: string, icon: ReactNode, value: string, dim = false) => (
    <div className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3.5 ${dim ? "bg-[#F2F4F6]" : "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]"}`}>
      <p className={`text-center text-[13px] font-bold leading-[1.15] ${dim ? "text-[#E3A6A9]" : "text-[#D10005]"}`}>{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className={`text-[16px] font-medium leading-[100%] ${dim ? "text-[#8a9099]" : "uppercase text-[#0F0F0F]"}`}>{value}</span>
      </div>
    </div>
  );

  const step = (n: number, icon: ReactNode, title: string, desc: string) => (
    <div className="relative flex items-center gap-2.5 rounded-2xl bg-[#F3F4F6] py-3.5 pl-2.5 pr-3.5">
      <span className="relative z-30 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#D10005] text-[12px] font-bold text-white">{n}</span>
      <span className="flex w-[34px] shrink-0 items-center justify-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold leading-tight text-[#0F0F0F]">{title}</p>
        <p className="mt-1 text-[12px] font-medium leading-[1.35] text-[#0F0F0F]">{desc}</p>
      </div>
    </div>
  );

  // One reward cell: a coin and an amount, or the placeholder the Silver row
  // and the introducer's sign-up cell carry instead.
  // One reward cell. Coins start at the column edge so every amount in a
  // column lines up, as the design draws them; the introducer's sign-up cell
  // carries a centred placeholder instead.
  const reward = (value: string | null, dim = false) => (
    <div className={`flex items-center gap-2 ${value === null ? "justify-center" : ""}`}>
      {value === null ? (
        <span className="text-[14px] font-bold text-[#C9CBD0]">—</span>
      ) : (
        <>
          <CoinIcon size={23} />
          <span className={`text-[14px] font-bold leading-tight ${dim ? "text-[#8a9099]" : "text-[#0F0F0F]"}`}>{value}</span>
        </>
      )}
    </div>
  );

  const rewardRow = (icon: ReactNode, label: string, you: ReactNode, friend: ReactNode, dim = false) => (
    <div className={`grid grid-cols-3 items-center border-t border-[#EFEFEF] py-3 pl-[15px] ${dim ? "bg-[#F2F4F6]" : "bg-white"}`}>
      <div className="flex items-center gap-2 pr-2">
        {icon}
        <span className={`text-[13px] font-bold leading-[1.25] ${dim ? "text-[#8a9099]" : "text-[#0F0F0F]"}`}>{label}</span>
      </div>
      {you}
      {friend}
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-[#F9F9F9]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-6 pt-4">
          {/* Title row — back returns to My Page */}
          <div className="flex items-center gap-2">
            <button onClick={onBack} aria-label={t.backAria} className="flex h-9 w-9 items-center justify-center active:opacity-70">
              {referIcon("/refer-back.png", 26)}
            </button>
            <h1 className="text-[20px] font-bold text-[#0F0F0F]">{t.rafTitle}</h1>
          </div>

          {/* Hero banner */}
          <img src="/refer-banner.png" alt={t.rafBannerTitle} className="mt-2 w-full rounded-xl" draggable={false} />

          {/* Promo code, invite link and the three ways to pass them on */}
          <div className="mt-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="text-[13px] font-bold text-[#D10005]">{t.rafPromoLabel}</p>
            {copyRow(t.rafPromoCode, t.rafPromoCode, t.rafCodeCopied)}
            <p className="mt-3 text-[13px] font-bold text-[#D10005]">{t.rafLinkLabel}</p>
            {copyRow(t.rafLinkShort, t.rafLinkFull, t.rafCopied)}
            <p className="mt-3.5 text-[13px] font-bold text-[#0F0F0F]">{t.rafShareVia}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <ShareChip glyph={X_GLYPH} label={t.rafShareX} onClick={() => pushToast(t.rafShareOpening(t.rafShareX))} />
              <ShareChip glyph={LINE_GLYPH} label={t.rafShareLine} onClick={() => pushToast(t.rafShareOpening(t.rafShareLine))} />
              <ShareChip glyph={referIcon("/refer-qrcode.png", 21)} label={t.rafQr} onClick={() => setQrOpen(true)} />
            </div>
          </div>

          {/* Referral tallies */}
          <h2 className="mb-2 mt-5 text-[15px] font-bold text-[#0F0F0F]">{t.rafMyStats}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {stat(t.rafInvited, referIcon("/refer-handshake.png", 22), "100")}
            {stat(t.rafPendingDeposit, referIcon("/refer-handshake.png", 22), "100")}
            {stat(t.rafQualifiedBronze, referIcon("/refer-tier-1.png", 24), "70")}
            {stat(t.rafQualifiedSilver, referIcon("/refer-tier-2.png", 24), t.rafComingSoon, true)}
          </div>
          <div className="mt-2.5">
            {stat(t.rafTotalRewards, <CoinIcon size={20} />, "200,000")}
          </div>

          {/* How the programme pays out. The dotted rule threads the step
              numbers together, so it sits above the cards it crosses. */}
          <h2 className="mb-2.5 mt-5 text-[15px] font-bold text-[#0F0F0F]">{t.rafHowItWorks}</h2>
          <div className="relative space-y-2.5">
            {/* Drawn as the design's rule: a fine 2px stroke in short dashes
                with an even gap between them. */}
            <div
              className="pointer-events-none absolute bottom-[46px] left-[21px] top-[46px] z-20 w-[2px]"
              style={{ background: "repeating-linear-gradient(to bottom,#D10005 0 5px,transparent 5px 11px)" }}
            />
            {step(1, referIcon("/refer-handshake.png", 30), t.rafStep1TitleShort, t.rafStep1DescShort)}
            {step(2, peopleGlyph("#D10005", 30), t.rafStep2Title, t.rafStep2DescNew)}
            {step(3, <CoinIcon size={30} />, t.rafStep3Title, t.rafStep3DescNew)}
          </div>

          {/* What each milestone pays the introducer and their friend */}
          <h2 className="mb-2.5 mt-5 text-[15px] font-bold text-[#0F0F0F]">{t.rafRewardBreakdown}</h2>
          <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <div className="grid grid-cols-3 gap-1 bg-[#D10005] px-1.5 py-3.5 text-center text-[13px] font-bold leading-[1.2] text-white">
              <span>{t.rafColTrigger}</span>
              <span>{t.rafColYouGet}</span>
              <span>{t.rafColFriendGets}</span>
            </div>
            {rewardRow(
              peopleGlyph("#D10005"),
              t.rafRowRegisters,
              reward(null),
              <div className="pr-2">
                {reward("100")}
                <span className="mt-1.5 flex h-[19px] w-fit items-center rounded-full border border-[#D10005] px-2.5 text-[10px] font-bold leading-none text-[#D10005]">{t.rafWelcomeBonus}</span>
              </div>,
            )}
            {rewardRow(referIcon("/refer-store.png", 19), t.rafRowFirstDeposit, reward("100"), reward("100"))}
            {rewardRow(referIcon("/refer-tier-1.png", 19), t.rafRowBronze, reward("100"), reward("100"))}
            {rewardRow(
              referIcon("/refer-tier-2.png", 19),
              t.rafRowSilver,
              reward(t.rafComingSoon, true),
              reward(t.rafComingSoon, true),
              true,
            )}
          </div>

          {/* Latest activity on the member's link */}
          <h2 className="mb-2.5 mt-5 text-[15px] font-bold text-[#0F0F0F]">{t.rafRecentActivity}</h2>
          <div className="space-y-2">
            {(allActivity ? REFER_ACTIVITY : REFER_ACTIVITY.slice(0, 4)).map((a) => (
              <div key={a.user} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
                <img src={a.avatar} alt="" className="h-[32px] w-[32px] shrink-0 rounded-full object-contain" draggable={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-tight text-[#0F0F0F]">{a.user}</p>
                  <p className={`mt-0.5 text-[11px] font-medium leading-tight ${a.deposit ? "text-[#D10005]" : "text-[#8a9099]"}`}>
                    {a.deposit ? t.rafActDeposit : t.rafActRegistered}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] font-medium text-[#9aa0a8]">{a.unit === "h" ? t.rafAgoHours(a.ago) : t.rafAgoDays(a.ago)}</span>
                  {a.deposit && (
                    <span className="flex items-center gap-1 text-[12px] font-bold text-[#FF8A00]">
                      <CoinIcon size={14} />+500
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!allActivity && (
            <button onClick={() => setAllActivity(true)} className="mt-2.5 flex h-[38px] w-full items-center justify-center rounded-2xl bg-white text-[13px] font-bold text-[#0F0F0F] shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:bg-black/[0.03]">
              {t.rafViewMore}
            </button>
          )}

          {/* Terms — collapsed to its first line until opened */}
          <div className="mt-4 rounded-2xl bg-[#FDE7BE] px-3.5 py-3">
            <button onClick={() => setNotesOpen((v) => !v)} className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[13px] font-bold text-[#0F0F0F]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#0F0F0F"><path d="M12 3.6L22.2 20.4H1.8L12 3.6zm0 5.6a1 1 0 00-1 1.06l.3 4.2a.7.7 0 001.4 0l.3-4.2A1 1 0 0012 9.2zm0 7.1a1.05 1.05 0 100 2.1 1.05 1.05 0 000-2.1z" /></svg>
                {t.rafNotesTitle}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <p className="mt-2 flex gap-1.5 text-[11px] font-bold leading-[1.45] text-[#0F0F0F]">
              <span className="shrink-0">■</span>
              <span className={notesOpen ? "" : "truncate"}>{t.rafNotesIntro}</span>
            </p>
            {notesOpen && (
              <ol className="mt-2 space-y-2">
                {t.rafNotesTerms.map((n, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] leading-[1.5] text-[#0F0F0F]">
                    <span className="shrink-0 font-bold">{i + 1}.</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>

      {/* QR overlay — the shareable invite card; closes on the X or the scrim */}
      {qrOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onClick={() => setQrOpen(false)}>
          <div className="relative w-full max-w-[358px]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setQrOpen(false)} aria-label="Close" className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center active:opacity-70">
              <img src="/refer-qr-close.png" alt="" width={30} height={30} draggable={false} />
            </button>
            <div className="overflow-hidden rounded-[18px] border-2 border-[#E9A53C] bg-[#FEF8EE] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <img src="/refer-qr-banner.webp" alt={t.rafBannerTitle} className="block w-full" draggable={false} />

              <div className="p-3">
                {/* Code panel — QR beside the member's own referral code */}
                <div className="flex items-center gap-3 rounded-xl border border-[#F3D39D] bg-white p-2.5">
                  <img src="/refer-qr.svg" alt={t.rafQr} className="h-[104px] w-[104px] shrink-0 rounded-md border border-[#EFE3CB] p-1" draggable={false} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-tight text-[#0F0F0F]">{t.rafQrCodeLabel}</p>
                    <span className="mt-1.5 inline-flex h-[28px] items-center justify-center rounded-md bg-[#D10005] px-4 text-[13px] font-bold text-white">{t.rafPromoCode}</span>
                    <p className="mt-1.5 text-[11px] font-medium leading-[1.35] text-[#0F0F0F]">{t.rafQrShareHint}</p>
                  </div>
                </div>

                {/* Three reasons to pass the code on */}
                <div className="mt-2.5 grid grid-cols-3 rounded-xl border border-[#F3D39D] bg-white">
                  {([
                    ["/refer-qr-benefit-1.png", t.rafQrPerk1, t.rafQrPerk1Body],
                    ["/refer-qr-benefit-2.png", t.rafQrPerk2, t.rafQrPerk2Body],
                    ["/refer-qr-benefit-3.png", t.rafQrPerk3, t.rafQrPerk3Body],
                  ] as const).map(([icon, title, body], i) => (
                    <div key={title} className={`flex items-center gap-1.5 px-1.5 py-2 ${i > 0 ? "border-l border-[#F1E5CD]" : ""}`}>
                      <img src={icon} alt="" width={28} height={28} className="shrink-0" draggable={false} />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold leading-[1.2] text-[#0F0F0F]">{title}</p>
                        <p className="mt-0.5 text-[8px] font-medium leading-[1.25] text-[#0F0F0F]">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Keep the card: the QR downloads as an image */}
                <a
                  href="/refer-qr.svg"
                  download="oripalot-invite-qr.svg"
                  onClick={() => pushToast(t.rafQrSaved)}
                  // `a { color: inherit }` in globals.css outranks the utility layer.
                  style={{ color: "#FFFFFF" }}
                  className="mt-2.5 flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#D10005] text-[16px] font-bold active:scale-[0.98]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 19h16" /></svg>
                  {t.rafQrSave}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[70] flex justify-center px-6">
          <div className="animate-fade-slide rounded-full bg-black/85 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)]">{toast}</div>
        </div>
      )}
    </div>
  );
}

/* ── FAQ & Support ───────────────────────────────────────────────────────
   One page for the whole help centre: category chips jump to a section, every
   question opens in place, and the card at the bottom hands the visitor to the
   inquiry form (a modal, so the answers stay behind it). */
const faqIcon = (src: string) => <img src={src} alt="" width={22} height={22} className="shrink-0 object-contain" style={{ width: 22, height: 22 }} draggable={false} />;

const FAQ_CAT_ICON: Record<FaqCategoryKey, ReactNode> = {
  account: faqIcon("/faq-cat-account.png"),
  payment: faqIcon("/faq-cat-payment.png"),
  gacha: faqIcon("/faq-cat-gacha.png"),
  shipping: faqIcon("/faq-cat-shipping.png"),
  other: faqIcon("/faq-cat-other.png"),
};

function FaqSupportPage({ lang, coins, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; onBack: () => void; onHome: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const cats = FAQ[lang];
  const [open, setOpen] = useState<string | null>(null);
  const openInquiry = useContext(InquiryNavContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function jumpTo(key: FaqCategoryKey) {
    const scroller = scrollRef.current;
    const el = sectionRefs.current[key];
    if (!scroller || !el) return;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 10;
    scroller.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div className="relative flex h-full flex-col bg-[#F1F2F4]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      <div ref={scrollRef} className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-6 pt-4">
          {/* Title row — back returns to My Page */}
          <div className="flex items-center gap-2">
            <button onClick={onBack} aria-label={t.backAria} className="flex h-9 w-9 items-center justify-center active:opacity-70">
              {referIcon("/refer-back.png", 26)}
            </button>
            <h1 className="text-[20px] font-bold text-[#0F0F0F]">{t.faqTitle}</h1>
          </div>

          {/* Category chips jump down to their section */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {cats.map((c) => (
              <button
                key={c.key}
                onClick={() => jumpTo(c.key)}
                className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:bg-black/[0.03]"
              >
                {FAQ_CAT_ICON[c.key]}
                <span className="text-[12px] font-bold leading-[1.25] text-[#0F0F0F]">{c.title}</span>
              </button>
            ))}
          </div>

          {/* Answers, grouped by category */}
          {cats.map((c) => (
            <div key={c.key} ref={(el) => { sectionRefs.current[c.key] = el; }} className="mt-5 scroll-mt-4">
              <div className="mb-2 flex items-center gap-2">
                {FAQ_CAT_ICON[c.key]}
                <h2 className="text-[15px] font-bold text-[#0F0F0F]">{c.title}</h2>
              </div>
              <div className="space-y-2">
                {c.entries.map((e, i) => {
                  const id = `${c.key}-${i}`;
                  const isOpen = open === id;
                  return (
                    <div key={id} className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
                      <button
                        onClick={() => setOpen(isOpen ? null : id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-black/[0.02]"
                      >
                        <span className="min-w-0 flex-1 text-[13px] font-bold leading-[1.3] text-[#0F0F0F]">{e.q}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}><path d="M5 9l7 7 7-7" /></svg>
                      </button>
                      <div className={`grid transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <div className="space-y-2 px-3.5 pb-3.5">
                            {e.a.map((p, k) => (
                              <p key={k} className="text-[12px] font-normal leading-[1.5] text-[#0F0F0FB2]">{p}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Still stuck — the inquiry form */}
          <div className="mt-6 rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <div className="flex items-center gap-2">
              <img src="/menu-contact.png" alt="" className="h-[22px] w-[22px] shrink-0 object-contain" draggable={false} />
              <h2 className="text-[14px] font-bold text-[#0F0F0F]">{t.faqContactTitle}</h2>
            </div>
            <div className="mt-2.5 rounded-lg bg-[#FDF0F0] px-3 py-2.5">
              <p className="flex items-start gap-2 text-[12px] font-bold leading-[1.35] text-[#0F0F0F]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#0F0F0F" className="mt-[1px] shrink-0"><path d="M12 3l10 17H2L12 3z" /><path d="M11.2 9h1.6v5h-1.6zM11.2 15.4h1.6V17h-1.6z" fill="#FDF0F0" /></svg>
                {t.faqContactWarning}
              </p>
              <p className="mt-2 text-[11px] font-medium leading-[1.45] text-[#0F0F0F]">{t.faqContactWarningBody}</p>
            </div>
            <button
              onClick={openInquiry}
              className="mt-3 flex h-[44px] w-full items-center justify-center rounded-lg bg-[#D10005] text-[15px] font-bold text-white active:scale-[0.99]"
            >
              {t.faqContactCta}
            </button>
            <p className="mt-3 text-[10px] font-normal leading-[1.45] text-[#0F0F0F]">{t.faqContactNote}</p>
          </div>
        </div>

        <SiteFooter t={t} />
      </div>
    </div>
  );
}

/* The inquiry form itself. It opens over the answers instead of taking the
   visitor to another page, so closing it returns them to where they read. */
function InquiryFormModal({ t, onClose, onSent }: { t: Dict; onClose: () => void; onSent: () => void }) {
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = category !== "" && details.trim() !== "";
  const labelCls = "block text-[12px] font-bold text-[#0F0F0F]";

  return (
    <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/55 px-3 pb-3 pt-8" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-fade-slide flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-[#EFEFEF] px-4 py-3">
          <h2 className="text-[17px] font-bold text-[#0F0F0F]">{t.faqInquiryTitle}</h2>
          <button onClick={onClose} aria-label={t.closeAria} className="flex h-7 w-7 items-center justify-center active:opacity-70">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          <label className={labelCls}>{t.faqInquiryCategory}<span className="ml-0.5 text-[#D10005]">*</span></label>
          <div className="relative mt-1.5">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`h-[42px] w-full appearance-none rounded-[6px] border border-[#9D9D9D] bg-white px-3 pr-9 text-[14px] outline-none focus:border-[#D10005] ${category ? "text-[#0F0F0F]" : "text-[#9D9D9D]"}`}
            >
              <option value="">{t.faqInquiryCategoryPlaceholder}</option>
              {t.faqInquiryCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><path d="M5 9l7 7 7-7" /></svg>
          </div>

          <label className={`${labelCls} mt-4`}>{t.faqInquiryDetails}<span className="ml-0.5 text-[#D10005]">*</span></label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t.faqInquiryDetailsPlaceholder}
            rows={5}
            className="mt-1.5 w-full resize-none rounded-[6px] border border-[#9D9D9D] px-3 py-2.5 text-[14px] leading-[1.45] text-[#0F0F0F] outline-none placeholder:text-[#9D9D9D] focus:border-[#D10005]"
          />

          <div className="mt-4 flex items-center justify-between">
            <label className={labelCls}>{t.faqInquiryImage}</label>
            <span className="text-[12px] font-medium text-[#0F0F0F80]">({files.length}/3)</span>
          </div>
          {files.map((name, i) => (
            <p key={`${name}-${i}`} className="mt-1.5 flex items-center gap-2 text-[12px] font-medium text-[#0F0F0F]">
              <span className="truncate">{t.faqInquiryImageNth(i + 1)} — {name}</span>
              <button onClick={() => setFiles((f) => f.filter((_, k) => k !== i))} aria-label={t.closeAria} className="shrink-0 text-[#D10005]">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </p>
          ))}
          {files.length < 3 && (
            <>
              <p className="mt-1.5 text-[12px] font-medium text-[#0F0F0F80]">{t.faqInquiryImageNth(files.length + 1)}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/bmp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFiles((prev) => [...prev, f.name].slice(0, 3));
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 flex h-[42px] w-full items-center justify-center gap-2 rounded-[6px] border border-[#DEDEDE] bg-white text-[14px] font-medium text-[#0F0F0F] active:bg-black/[0.03]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 18a4 4 0 01-.4-7.98 5.5 5.5 0 0110.7-1.5A4.25 4.25 0 0117.5 18" /><path d="M12 12v6m0-6l-2.4 2.4M12 12l2.4 2.4" /></svg>
                {t.faqInquirySelectFile}
              </button>
            </>
          )}

          <ul className="mt-3.5 space-y-1.5">
            {t.faqInquiryNotes.map((n) => (
              <li key={n} className="flex gap-2 text-[11px] font-normal leading-[1.4] text-[#0F0F0F80]">
                <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-[#0F0F0F80]" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-[#EFEFEF] px-4 py-3">
          <button
            onClick={ready ? onSent : undefined}
            disabled={!ready}
            className={`flex h-[46px] w-full items-center justify-center rounded-lg text-[15px] font-bold text-white ${ready ? "bg-[#D10005] active:scale-[0.99]" : "bg-[#D10005]/40"}`}
          >
            {t.faqInquirySend}
          </button>
        </div>
      </div>
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
function BalanceStrip({ t, coins, points = 10000, onOpenStore, onOpenHistory }: { t: Dict; coins: number; points?: number; onOpenStore?: () => void; onOpenHistory?: () => void }) {
  // Both amounts open the ledger wherever one is given, matching the header
  // pill; the plus stays its own target so it still reaches the store.
  const amount = (children: React.ReactNode) =>
    onOpenHistory ? (
      <button type="button" onClick={onOpenHistory} aria-label={t.coinHistoryTitle} className="flex items-center gap-1.5 transition active:scale-[0.97]">
        {children}
      </button>
    ) : (
      <div className="flex items-center gap-1.5">{children}</div>
    );
  return (
    <div className="flex items-stretch">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[14px] font-normal leading-none text-[#0F0F0F]">{t.chOripaCoins}</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          {amount(
            <>
              <CoinIcon size={24} />
              <span className="text-[24px] font-bold leading-none text-[#0F0F0F]">{coins.toLocaleString()}</span>
            </>
          )}
          <button onClick={onOpenStore} aria-label={t.addCoinsAria} className="ml-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center transition active:scale-95">
            <img src="/plus-sign.png" alt="" className="h-full w-full object-contain" draggable={false} />
          </button>
        </div>
      </div>
      <div className="w-px shrink-0 bg-[#E7E7E7]" />
      <div className="min-w-0 flex-1 pl-5">
        <p className="text-[14px] font-normal leading-none text-[#0F0F0F]">{t.chFreePoints}</p>
        <div className="mt-2.5">
          {amount(
            <>
              <GemIcon size={21} />
              <span className="text-[24px] font-bold leading-none text-[#0F0F0F]">{points.toLocaleString()}</span>
            </>
          )}
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

function MyPage({ lang, coins, displayName = "Username", onOpenPrizeHistory, onOpenMyLoot, onOpenPurchaseHistory, onOpenAnnouncements, onOpenShippingAddress, onOpenProfile, onOpenRefer, onOpenFaq, onHome, onLogout, onOpenStore }: { lang: Lang; coins: number; displayName?: string; onOpenPrizeHistory: () => void; onOpenMyLoot: () => void; onOpenPurchaseHistory: () => void; onOpenAnnouncements: () => void; onOpenShippingAddress: () => void; onOpenProfile: () => void; onOpenRefer: () => void; onOpenFaq: () => void; onHome: () => void; onLogout: () => void; onOpenStore?: () => void }) {
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

  // Every row navigates. Quests is hidden for now — the chain is still being
  // designed — and FAQ and Support are one row, as the help centre answers
  // both from the same page.
  const menu: { key: string; label: string; onClick?: () => void }[] = [
    { key: "items", label: t.mmItems, onClick: onOpenMyLoot },
    { key: "history", label: t.mmPrizeHistory, onClick: onOpenPrizeHistory },
    { key: "purchases", label: t.mmPurchases, onClick: onOpenPurchaseHistory },
    { key: "coinHistory", label: t.coinHistoryTitle, onClick: openCoinHistory },
    { key: "invite", label: t.mmInvite, onClick: onOpenRefer },
    { key: "faq", label: t.mmFaqSupport, onClick: onOpenFaq },
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
              <p className="mt-0.5 text-[12px] font-normal text-[#0F0F0F]">{t.mpId} : XXXXXX</p>
              {/* 175x24 with a 1px outline and 6px radius — the design's secondary CTA. */}
              <button onClick={onOpenProfile} className="mt-2.5 flex h-6 w-[175px] max-w-full items-center justify-center rounded-[6px] border border-[#D10005] text-[14px] font-bold leading-none text-[#D10005] active:bg-[#D10005]/[0.06]">{t.mpEditProfile}</button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-3 rounded-2xl bg-white px-4 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <BalanceStrip t={t} coins={coins} onOpenStore={onOpenStore} onOpenHistory={openCoinHistory} />
            {/* Ledger link sits under the points column. */}
            <div className="mt-4 flex items-center justify-end">
              <button onClick={openCoinHistory} className="flex h-6 w-[146px] max-w-[50%] shrink-0 items-center justify-center rounded-[6px] border border-[#0F0F0F] text-[14px] font-bold leading-none text-[#0F0F0F] active:bg-black/[0.04]">{t.mpViewDetails}</button>
            </div>
          </div>

          {/* Rank card — 8px radius inside a 2px #AA5225 outline over a peach
              vignette, with the badge, rank copy and benefits CTA on one row and
              the level bar underneath. */}
          <div
            className="relative mt-3 overflow-hidden rounded-lg border-2 border-[#AA5225] px-3.5 py-3.5"
            style={{ backgroundImage: "url(/rank-card-bg.png)", backgroundSize: "cover", backgroundPosition: "center" }}
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
            // Credits carry their currency's colour — amber for coins, green for
            // points — while every debit stays ink.
            const amountColor = !positive ? "#0F0F0F" : isCoin ? "#FF8A00" : "#54AB11";
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
            {/* Floors at zero like the confirmation rows; the line below says
                how far short the wallet is. */}
            <span className="text-[20px] font-extrabold leading-none text-[#D10005]">{Math.max(0, coins - cost).toLocaleString()}</span>
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

export function PhoneApp({ lang, noHistory, onScreenChange, initialKycScenario = "none", freeShipAvailable = true, onDrawResultsChange, addressProvided = true, dailyLimitReached = false, drawScenario = "off", multiCurrency = true, sendNotifications = false, onNotificationSent, errorScenario = "off" }: {
  lang: Lang; noHistory: boolean; onScreenChange?: (s: Screen) => void; initialKycScenario?: KycScenario; freeShipAvailable?: boolean; onDrawResultsChange?: (open: boolean) => void; addressProvided?: boolean; dailyLimitReached?: boolean; drawScenario?: DrawScenario; multiCurrency?: boolean; /** Dev harness: deliver one fresh unread notification or announcement. */ sendNotifications?: boolean; /** Fired once the item has been delivered, so the harness can re-arm its toggle. */ onNotificationSent?: () => void; /** Dev harness: swallow the next navigation and show this error page instead. */ errorScenario?: ErrorScenario;
}) {
  const t = STR[lang];
  const [screen, setScreenRaw] = useState<Screen>("landing");
  const [prevScreen, setPrevScreen] = useState<Screen>("oripa");
  // Dev harness: with an error scenario armed, the next navigation is swallowed
  // and its destination remembered — the maintenance page's CTA goes on to it,
  // the 404's goes home. Every route in the app runs through `setScreen`, so
  // arming this catches the bottom nav, the footer and in-page links alike.
  const [errorTarget, setErrorTarget] = useState<Screen | null>(null);
  const errorPage = errorScenario !== "off" && errorTarget ? errorScenario : null;
  const setScreen = (next: Screen) => {
    if (errorScenario !== "off" && next !== screen) { setErrorTarget(next); return; }
    setScreenRaw(next);
  };
  // Support inquiry form. It is raised from the FAQ page and from the footer's
  // support links, so it lives here and floats over whatever screen is up.
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryToast, setInquiryToast] = useState(false);
  const inquiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (inquiryTimer.current) clearTimeout(inquiryTimer.current); }, []);
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
      const valid: Screen[] = ["landing", "signup", "login", "oripa", "notifications", "prizeHistory", "myLoot", "purchaseHistory", "shippingAddress", "quest", "store", "coinHistory", "mypage", "profile", "refer", "faq"];
      const target = new URLSearchParams(window.location.search).get("screen");
      // Straight to the requested screen: a deep link is where the session
      // starts, not a navigation an armed error scenario should swallow.
      if (target && valid.includes(target as Screen)) setScreenRaw(target as Screen);
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
  // The pack being drawn: the one open over the lobby, else the pack page's.
  const drawingPrice = () => packPrice(lobbyDraw?.item ?? drawItem ?? undefined);
  const attemptDraw = (count: number, billCount?: number) => {
    const billed = billCount ?? count;
    const cost = billed * drawingPrice();
    if (cost > coins) {
      setShortfall({ drawCount: count, billCount: billed, cost });
      return false;
    }
    setCoins((c) => c - cost);
    return true;
  };
  // The draw confirmation states its own shortfall, so its Charge/Top Up CTA
  // opens the sheet directly instead of repeating it in the shortfall popup.
  const openTopUpForDraw = (count: number) => setQuickPurchase({ drawCount: count, billCount: count, cost: count * drawingPrice() });
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
  // Category picked from the footer. It reaches the lobby (or the logged-out
  // landing feed) as a request, so tapping a chip from any screen lands on the
  // feed with that category open — exactly like its twin in the category bar.
  const [catRequest, setCatRequest] = useState<CatRequest | null>(null);
  const resetHome = () => {
    clearLobbyFilters();
    homeScroll.current = 0;
    setHomeKey((k) => k + 1);
    setLobbyDraw(null);
    setScreen("oripa");
  };
  // A visitor sent to authenticate from a pack page (its draw CTA, or the
  // sign-up / login buttons in its header) is owed that pack back once they're
  // in, so it is parked here until the auth screen succeeds.
  const [authReturn, setAuthReturn] = useState<OripaItem | null>(null);
  // PROD: login/sign-up land straight on the lobby (no onboarding flow), unless
  // a pack is owed — then they land on it, ready to draw.
  const enterHome = (method?: "line") => {
    const pack = authReturn;
    setAuthReturn(null);
    if (pack) { setDrawItem(pack); setScreen("drawDetail"); }
    else setScreen("oripa");
    if (method === "line") setLineLoginToast(true);
  };
  // Leaving the visitor's pack page for the logged-out lobby drops that debt:
  // logging in from the landing header belongs on the lobby.
  const goLanding = () => { setAuthReturn(null); setScreen("landing"); };
  const logout = () => {
    try {
      sessionStorage.removeItem("authData");
    } catch {}
    setDisplayName("");
    setScreen("landing");
  };
  // Notifications the user has opened or swiped away. Owned here so the state
  // survives the notifications screen's remount and so the header bell counts
  // what's actually left unread.
  const [notifRead, setNotifRead] = useState<Set<string>>(new Set());
  const [notifDeleted, setNotifDeleted] = useState<Set<string>>(new Set());
  const markNotifRead = (id: string) => setNotifRead((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const deleteNotif = (id: string) => setNotifDeleted((prev) => new Set(prev).add(id));
  // Demo deliveries from the harness toggle, newest first, kept per tab.
  const [sentNotifs, setSentNotifs] = useState<{ you: NotifItem[]; notice: NotifItem[] }>({ you: [], notice: [] });
  // Flipping the toggle on delivers exactly one item, alternating between the
  // inbox and the announcements so repeated sends fill both tabs. The harness
  // resets the toggle afterwards, leaving it ready for the next one.
  useEffect(() => {
    if (!sendNotifications) return;
    const sent = sentNotifs.you.length + sentNotifs.notice.length;
    const kind = sent % 2 === 0 ? "you" : "notice";
    const item = randomNotif(kind, sent);
    // A frame's delay keeps this off the synchronous render path.
    const id = requestAnimationFrame(() => {
      setSentNotifs((prev) => ({ ...prev, [kind]: [item, ...prev[kind]] }));
      onNotificationSent?.();
    });
    return () => cancelAnimationFrame(id);
    // Only a fresh flip of the toggle sends; re-renders in between must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendNotifications]);
  const notifUnread = noHistory
    ? 0
    : [...NOTIF_YOU, ...NOTIF_NOTICE, ...sentNotifs.you, ...sentNotifs.notice].filter((n) => n.unread && !notifRead.has(n.id) && !notifDeleted.has(n.id)).length;
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
  // Quest (pack-purchase chain) has no entry point while the chain is hidden;
  // the screen still renders when it is restored from the URL.
  // Draw screen (gacha pack detail) opens when a lobby pack's Draw / View is
  // tapped; back returns to the lobby.
  const [drawItem, setDrawItem] = useState<OripaItem | null>(null);
  // A lobby card's CTA draws without leaving the lobby: the pack and the
  // requested draw are held here and handed to a DrawFlow mounted over the feed.
  const [lobbyDraw, setLobbyDraw] = useState<{ item: OripaItem; request: DrawRequest } | null>(null);
  // Dropping the held lobby request keeps its DrawFlow from replaying the draw
  // when the lobby is next mounted.
  const openDraw = (item: OripaItem) => { setLobbyDraw(null); setDrawItem(item); setScreen("drawDetail"); };
  // The visitor's read-only view of the same pack page.
  const openGuestDraw = (item: OripaItem) => { setDrawItem(item); setScreen("guestDraw"); };
  // Any draw a visitor asks for: hold the pack, then send them to authenticate.
  const requireAuthForDraw = (item: OripaItem, to: "login" | "signup" = "login") => {
    setDrawItem(item);
    setAuthReturn(item);
    setScreen(to);
  };
  const requestLobbyDraw = (item: OripaItem, req: Omit<DrawRequest, "token">) =>
    setLobbyDraw({ item, request: { ...req, token: Date.now() } });
  // Packs retired by a Sold Out / Expired draw. Switching the harness back to
  // the happy path puts them all back in stock.
  const [packStatus, setPackStatus] = useState<Record<string, PackStatus>>({});
  const [statusScenario, setStatusScenario] = useState(drawScenario);
  if (statusScenario !== drawScenario) {
    setStatusScenario(drawScenario);
    if (drawScenario === "off" && Object.keys(packStatus).length > 0) setPackStatus({});
  }
  const retirePack = (id: string, status: PackStatus) => setPackStatus((m) => (m[id] === status ? m : { ...m, [id]: status }));
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
  // Signed-out screens, the visitor's pack page included: no bottom nav, and no
  // route into the member-only notification or coin-history screens.
  const onLanding = screen === "landing" || screen === "signup" || screen === "login" || screen === "guestDraw";
  const showNav = !onLanding && !kyc.activeScreen;
  // A footer category returns to the feed the visitor belongs on — the landing
  // page while signed out, the lobby once signed in — and opens that category
  // there, dropping any search or filters the way the category bar does.
  const openCategory = (key: string) => {
    setCatRequest({ key, token: Date.now() });
    if (onLanding) { goLanding(); return; }
    clearLobbyFilters();
    setLobbyDraw(null);
    setScreen("oripa");
  };
  return (
    <PackStatusContext.Provider value={packStatus}>
    <PackRetireContext.Provider value={retirePack}>
    <NotifNavContext.Provider value={onLanding ? () => {} : openNotifications}>
    <NotifBadgeContext.Provider value={notifUnread}>
    <CoinHistoryNavContext.Provider value={onLanding ? () => {} : openCoinHistory}>
    <CatNavContext.Provider value={openCategory}>
    <InquiryNavContext.Provider value={() => setInquiryOpen(true)}>
    <LegalNavContext.Provider value={setLegalDoc}>
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <div className="relative min-h-0 flex-1">
        {/* Keyed on `screen` so each navigation remounts and replays the
            body-only fade/slide-in (headers are excluded per-screen). */}
        <div key={screen} className="h-full">
        {/* Logged-out lobby — V1 homepage layout */}
        {screen === "landing" && (
          <LandingPage
            lang={lang}
            onSignUp={() => setScreen("signup")}
            onLogin={() => setScreen("login")}
            onOpenDraw={openGuestDraw}
            onRequireLogin={(item) => requireAuthForDraw(item)}
            catRequest={catRequest}
          />
        )}
        {/* Visitor's pack page: same design, no wallet, CTAs route to auth. */}
        {screen === "guestDraw" && drawItem && (
          <DrawDetail
            key={drawItem.id}
            lang={lang}
            item={drawItem}
            coins={coins}
            onBack={goLanding}
            onHome={goLanding}
            freeShipAvailable={freeShipAvailable}
            drawScenario={drawScenario}
            multiCurrency={multiCurrency}
            shippingAddresses={shippingAddresses}
            onShippingAddressesChange={setShippingAddresses}
            guest={{
              onSignUp: () => requireAuthForDraw(drawItem, "signup"),
              onLogin: () => requireAuthForDraw(drawItem),
            }}
          />
        )}
        {screen === "signup" && (
          <SignupPage
            lang={lang}
            onQuit={goLanding}
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
        {screen === "oripa" && <OripaHome key={homeKey} lang={lang} coins={coins} onHome={resetHome} onOpenStore={openStore} onOpenDraw={openDraw} onRequestDraw={requestLobbyDraw} scrollRef={homeScroll} query={lobbyQuery} filters={lobbyFilters} priceMin={lobbyPriceMin} priceMax={lobbyPriceMax} onApply={applyLobby} onToggleApplied={toggleLobbyFilter} onClearAll={clearLobbyFilters} catRequest={catRequest} />}
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
        {screen === "notifications" && <NotificationsScreen lang={lang} coins={coins} empty={noHistory} only={notifOnly} sent={sentNotifs} readIds={notifRead} deletedIds={notifDeleted} onRead={markNotifRead} onDelete={deleteNotif} onBack={() => setScreen(prevScreen)} onHome={resetHome} onOpenStore={openStore} />}
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
            onOpenRefer={() => setScreen("refer")}
            onOpenFaq={() => setScreen("faq")}
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
        {screen === "refer" && <ReferFriendPage lang={lang} coins={coins} onBack={() => setScreen("mypage")} onHome={resetHome} onOpenStore={openStore} />}
        {screen === "faq" && <FaqSupportPage lang={lang} coins={coins} onBack={() => setScreen("mypage")} onHome={resetHome} onOpenStore={openStore} />}
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
        {inquiryOpen && (
          <InquiryFormModal
            t={t}
            onClose={() => setInquiryOpen(false)}
            onSent={() => {
              setInquiryOpen(false);
              setInquiryToast(true);
              if (inquiryTimer.current) clearTimeout(inquiryTimer.current);
              inquiryTimer.current = setTimeout(() => setInquiryToast(false), 2600);
            }}
          />
        )}
        {inquiryToast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[90] flex justify-center px-6">
            <div className="animate-fade-slide rounded-2xl bg-black/85 px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)]">{t.faqInquirySent}</div>
          </div>
        )}
        {lineLoginToast && (
          <div className="absolute bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1d2129] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            <LineAuthIcon size={20} />
            {t.authLineLoginSuccess as string}
          </div>
        )}
        <KycOverlay lang={lang} state={kyc} setState={setKyc} onExit={exitKycToLobby} onContextReturn={returnFromKyc} />
        {/* Covers the screen the user was on, but stops above the bottom nav:
            the tabs stay reachable while the error page is up. */}
        {errorPage && (
          <div className="absolute inset-0 z-[95]">
            <ErrorScreen
              t={t}
              variant={errorPage}
              coins={coins}
              onHome={() => { setErrorTarget(null); setScreenRaw("oripa"); }}
              onRetry={() => { const target = errorTarget; setErrorTarget(null); if (target) setScreenRaw(target); }}
              onOpenStore={openStore}
            />
          </div>
        )}
      </div>
      {showNav && <BottomNav screen={screen} t={t} onNavigate={navigate} />}
    </div>
    </LegalNavContext.Provider>
    </InquiryNavContext.Provider>
    </CatNavContext.Provider>
    </CoinHistoryNavContext.Provider>
    </NotifBadgeContext.Provider>
    </NotifNavContext.Provider>
    </PackRetireContext.Provider>
    </PackStatusContext.Provider>
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
