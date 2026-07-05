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
import { HOME_SECTIONS, ALL_ORIPA } from "../data/lobby";
import { NOTIF_YOU, NOTIF_NOTICE, NOTIF_UNREAD_TOTAL } from "../data/notifications";
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
  RARITY_IMG,
  SHIP_MIN_COINS,
  SHIP_WINDOW_DAYS,
  SORT_KEYS,
  US_STATES,
  formatShippingAddr,
} from "../data/prizes";

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
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative mr-2.5">
        <button
          type="button"
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
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

function OripaCard({ item, t, lang, onView, onDraw }: { item: OripaItem; t: Dict; lang: Lang; onView?: () => void; onDraw?: (count: number, free?: boolean) => void }) {
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
function catIcon(key: string, color: string) {
  switch (key) {
    case "all":
      return <svg width="23" height="23" viewBox="0 0 24 24" fill={color}><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></svg>;
    case "new":
      return (
        <svg width="27" height="27" viewBox="0 0 24 24">
          <path d="M12 1.3l2.2 2.5 3.2-1.1.2 3.4 3.4 1-1.9 2.8 1.9 2.8-3.4 1-.2 3.4-3.2-1.1L12 22.7l-2.2-2.5-3.2 1.1-.2-3.4-3.4-1 1.9-2.8L3 11.3l3.4-1 .2-3.4 3.2 1.1z" fill="#D10005" />
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
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z" /></svg>;
  }
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

/* ── Lobby navigation (V2) ───────────────────────────────────────────────
   Competitor-style browse: a category chip bar + "Narrow down" / sort toolbar
   over a sectioned feed (each lane has a "See all" jump). A bottom sheet holds
   search + quick filters. All filtering / sorting is client-side (POC data). */
const LOBBY_NAV_STR = {
  en: {
    seeAll: "See all",
    empty: "No packs match your search.",
    narrowDown: "Narrow down",
    searchPlaceholder: "Search packs & cards",
    quickFilters: "Quick filters",
    clear: "Clear",
    apply: "Apply",
    sorts: [["rec", "Recommended order"], ["popular", "Most popular"], ["new", "Newest"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"]] as [string, string][],
    quickOpts: [["popular", "Most popular"], ["newarrivals", "New Arrivals"], ["fewleft", "Only a few left"], ["psa10", "PSA10 confirmed"], ["guarantee60", "High return"], ["pokemon", "Pokémon"], ["onepiece", "One Piece"], ["box", "BOX"]] as [string, string][],
  },
  ja: {
    seeAll: "すべて見る",
    empty: "一致するオリパがありません。",
    narrowDown: "絞り込み",
    searchPlaceholder: "オリパ・カードを検索",
    quickFilters: "クイックフィルター",
    clear: "クリア",
    apply: "適用",
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

// Compact card used in the search / category grid.
function LobbyMiniCard({ item, t, lang, fullWidth, onView }: { item: OripaItem; t: Dict; lang: Lang; fullWidth?: boolean; onView?: () => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  return (
    <button
      onClick={onView}
      className={`flex flex-col overflow-hidden rounded-xl bg-white text-left shadow-[0_2px_8px_rgba(0,0,0,0.1)] active:scale-[0.98] ${fullWidth ? "w-full" : "w-[152px] shrink-0"}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ededf0]">
        {item.image ? (
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c2c6cc" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#D10005] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">{item.gem ? t.tagSsr : t.tagPopular}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h4 className="line-clamp-2 text-[12px] font-extrabold leading-tight text-[#1d2129]">{locTitle(item, lang)}</h4>
        <span className="mt-auto flex items-center gap-1">
          <CoinIcon size={15} />
          <span className="text-[13px] font-extrabold text-[#1d2129]">1,000</span>
          <span className="text-[10px] font-bold text-[#8a9099]">{t.perDraw}</span>
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#D10005]" style={{ width: `${pct}%` }} /></div>
        <span className="text-[10px] font-bold text-[#D10005]">{t.remainingTimeLabel} {t.minUnit(item.endsIn)}</span>
      </div>
    </button>
  );
}

// "Narrow down" bottom sheet: search on top, quick filters below, Clear / Apply.
function LobbyFilterSheet({ lang, filters, query, onToggle, onQueryChange, onClear, onClose }: { lang: Lang; filters: Record<string, boolean>; query: string; onToggle: (k: string) => void; onQueryChange: (v: string) => void; onClear: () => void; onClose: () => void }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="flex max-h-[90%] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()} style={{ animation: "lobbySheetUp .28s cubic-bezier(.2,.8,.2,1) both" }}>
        <style>{`@keyframes lobbySheetUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
        <div className="relative flex shrink-0 items-center justify-center border-b border-black/5 px-4 py-3.5">
          <h3 className="text-[16px] font-extrabold text-[#1d2129]">{L.narrowDown}</h3>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] active:bg-black/5">
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
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="w-full rounded-xl bg-[#f4f5f7] py-3 pl-11 pr-3 text-[14px] font-semibold text-[#1d2129] outline-none placeholder:text-[#9aa0a8] focus:bg-white focus:ring-2 focus:ring-[#D10005]/30"
            />
          </div>

          <div className="mt-5">
            <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{L.quickFilters}</h4>
            <div className="flex flex-wrap gap-2.5">
              {L.quickOpts.map(([key, label]) => {
                const on = !!filters[key];
                return (
                  <button key={key} onClick={() => onToggle(key)} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "border-[#D10005] bg-[#D10005] text-white" : "border-black/15 bg-white text-[#5c626b] active:bg-black/[0.03]"}`}>{label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-black/10 px-4 py-3">
          <button onClick={onClear} className="flex-1 rounded-xl bg-[#f2f3f5] py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{L.clear}</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-[#D10005] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{L.apply}</button>
        </div>
      </div>
    </div>
  );
}

// V2 lobby feed. `onView` (tap on any card) is inert in the logged-in lobby
// and routes to Sign-up on the logged-out landing.
function LobbyNavFeed({ t, lang, filters, query, onOpenFilters, onView }: { t: Dict; lang: Lang; filters: Record<string, boolean>; query: string; onOpenFilters: () => void; onView?: () => void }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  const [cat, setCat] = useState("all");
  const [sortKey, setSortKey] = useState("rec");
  const [sortOpen, setSortOpen] = useState(false);
  const filterCount = Object.keys(filters).length;
  const qq = query.trim().toLowerCase();
  const searching = qq.length > 0;

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
    if (sortKey === "new") arr.reverse();
    else if (sortKey === "popular" || sortKey === "priceAsc") arr.sort((a, b) => a.remaining - b.remaining);
    else if (sortKey === "priceDesc") arr.sort((a, b) => b.remaining - a.remaining);
    return arr;
  }

  const sortLabel = (L.sorts.find(([k]) => k === sortKey) || L.sorts[0])[1];
  const mini = (it: OripaItem, fw?: boolean) => (
    <LobbyMiniCard key={it.id} item={it} t={t} lang={lang} fullWidth={fw} onView={onView} />
  );
  const full = (it: OripaItem) => (
    <OripaCard key={it.id} item={it} t={t} lang={lang} onView={onView} onDraw={onView ? () => onView() : undefined} />
  );

  let body: React.ReactNode;
  if (searching) {
    const items = transform(ALL_ORIPA);
    body = items.length === 0
      ? <div className="px-6 py-16 text-center text-[13px] font-semibold text-[#8a9099]">{L.empty}</div>
      : <div className="grid grid-cols-2 gap-3 px-3.5 py-3">{items.map((it) => mini(it, true))}</div>;
  } else if (cat === "all") {
    body = (
      <div>
        {HOME_SECTIONS.map((s) => {
          const title = (t as unknown as Record<string, string>)[s.titleKey];
          const seeAllCat = s.cats[0];
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
              </div>
            );
          }
          return (
            <div key={s.id} className="border-t border-black/10 px-3.5 py-3.5 first:border-t-0">
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
          {rest.length > 0 && <div className="flex flex-col gap-3 px-3.5 py-3">{rest.map(full)}</div>}
        </div>
      );
  }

  return (
    <div ref={rootRef} className="bg-[#eef0f3]">
      {/* Sticky lobby nav: category chips + narrow-down/sort toolbar stay
          pinned under the header while the feed scrolls. */}
      <div className="sticky top-0 z-20">
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

      {/* Toolbar — "Narrow down" (filters) on the left, sort on the right */}
      <div className="relative flex items-stretch border-b border-black/10 bg-white">
        <button onClick={() => { onOpenFilters(); setSortOpen(false); }} className="flex flex-1 items-center justify-center gap-2 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="7" cy="8" r="2" /><circle cx="16" cy="16" r="2" /><path d="M9 8h11M4 8h1M15 16h5M4 16h9" /></svg>
          {L.narrowDown}
          {filterCount > 0 && <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#D10005] px-1 text-[10px] font-extrabold leading-none text-white">{filterCount}</span>}
        </button>
        <span className="my-2 w-px bg-black/10" />
        <div className="relative flex-1">
          <button onClick={() => setSortOpen((o) => !o)} className="flex w-full items-center justify-center gap-1.5 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
            {sortLabel}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute right-2 top-[calc(100%-2px)] z-40 min-w-[210px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                {L.sorts.map(([key, label]) => (
                  <button key={key} onClick={() => { setSortKey(key); setSortOpen(false); }} className={`block w-full px-3.5 py-2.5 text-left text-[13px] ${key === sortKey ? "font-extrabold text-[#D10005]" : "text-[#41464e]"}`}>{label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      {body}
    </div>
  );
}

function OripaHome({ lang, coins, onHome }: { lang: Lang; coins: number; onHome: () => void }) {
  const t = STR[lang];
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toggleFilter = (k: string) => setFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearFilters = () => { setFilters({}); setQuery(""); };
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 pb-4 pt-3">
          <PromoCarousel />
        </div>

        <LobbyNavFeed t={t} lang={lang} filters={filters} query={query} onOpenFilters={() => setFilterOpen(true)} />

        <SiteFooter t={t} />
      </div>

      {filterOpen && (
        <LobbyFilterSheet lang={lang} filters={filters} query={query} onToggle={toggleFilter} onQueryChange={setQuery} onClear={clearFilters} onClose={() => setFilterOpen(false)} />
      )}
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

// PROD bottom nav. Only the Oripa (lobby) and My Account tabs navigate; the
// Prize history / Quests / Store tabs are shown but inert. My Account and its
// sub-screens (Prize History, Shipping Address) all highlight the My Account
// tab.
function BottomNav({ screen, t, onNavigate }: { screen: Screen; t: Dict; onNavigate?: (s: Screen) => void }) {
  const items: { key: Screen; label: string }[] = [
    { key: "oripa", label: t.navOripa },
    { key: "prizeHistory", label: t.navPrizeHistory },
    { key: "quest", label: t.navQuest },
    { key: "store", label: t.navStore },
    { key: "mypage", label: t.navMyPage },
  ];
  const activeKey: Screen = screen === "prizeHistory" || screen === "shippingAddress" ? "mypage" : screen;
  return (
    <nav className="shrink-0 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((it) => {
          const active = activeKey === it.key;
          const color = active ? "#D10005" : "#1d2129";
          const navigable = it.key === "oripa" || it.key === "mypage";
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

/* ── Auth shared components ───────────────────────────────────────────── */
function AuthHeader({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  return (
    <header className="flex shrink-0 items-center justify-between bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.10)]">
      { }
      <img src="/oripa-logo-full.png" alt="オリパロット" className="h-8 w-auto shrink-0" />
      <div className="flex items-center gap-2">
        <button onClick={onSignUp} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#D10005" }}>{t.authSignUp}</button>
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
        {label}<span className="ml-0.5 text-[#D10005]">*</span>
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-[#8a9099]">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Placeholder"
          className={`w-full rounded-xl bg-white py-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none border ${error ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
          style={{ paddingLeft: icon ? "36px" : "14px", paddingRight: showTick ? "40px" : "14px" }}
        />
        {showTick && (
          <span className="absolute right-3">
            <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-[#D10005]">{error}</p>}
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
                        className="rounded-xl bg-[#D10005] px-5 py-2 text-[14px] font-bold text-white">
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
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toggleFilter = (k: string) => setFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearFilters = () => { setFilters({}); setQuery(""); };
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={onLogin} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 pb-4 pt-3"><PromoCarousel /></div>

        <LobbyNavFeed t={t} lang={lang} filters={filters} query={query} onOpenFilters={() => setFilterOpen(true)} onView={onSignUp} />

        <SiteFooter t={t} />
      </div>

      {filterOpen && (
        <LobbyFilterSheet lang={lang} filters={filters} query={query} onToggle={toggleFilter} onQueryChange={setQuery} onClear={clearFilters} onClose={() => setFilterOpen(false)} />
      )}
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
                className="h-12 w-10 rounded-xl border border-[#e5e8ec] bg-white text-center text-[20px] font-bold text-[#1d2129] outline-none focus:border-[#D10005]"
              />
            ))}
          </div>

          <button
            onClick={() => { if (allFilled) onSuccess(); }}
            disabled={!allFilled}
            className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#D10005", opacity: allFilled ? 1 : 0.45 }}
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
            className="mt-3 w-full text-center text-[13px] font-bold text-[#D10005] underline"
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
        {t.authDobLabel}<span className="ml-0.5 text-[#D10005]">*</span>
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
          style={{ background: checked ? "#D10005" : "white", border: checked ? "none" : "2px solid #d1d5db" }}
        >
          {checked && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        </div>
      </div>
      <span className="text-[12px] leading-relaxed text-[#5c626b]">
        {t.authAgreePrefix}
        <span className="text-[#D10005] underline">{t.authTermsOfService}</span>
        {t.authAnd}
        <span className="text-[#D10005] underline">{t.authPrivacyPolicy}</span>
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
                  style={{ background: "#D10005", opacity: canEmailSubmit ? 1 : 0.45 }}
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
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#D10005]">*</span>
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
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#D10005]">{phoneError}</p>}
                </div>

                {renderDobButton(phoneDob, () => setShowPhoneDobPicker(true))}
                {renderInviteField(phoneInvite, setPhoneInvite)}
                {renderTermsCheckbox(phoneAgreed, setPhoneAgreed)}

                <button
                  onClick={() => { if (canPhoneSubmit) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!canPhoneSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#D10005", opacity: canPhoneSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authHaveAccount}{" "}
            <button onClick={onLogin} className="font-bold text-[#D10005] underline">{t.authLogInLink}</button>
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
                  <path d="M16 39l14 10 14-10" stroke="#D10005" strokeWidth="1.5" fill="none" />
                  <circle cx="36" cy="34" r="5" fill="#D10005" />
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
            }} className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#D10005" }}>
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
                  style={{ background: "#D10005", opacity: canEmailSubmit ? 1 : 0.45 }}
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
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#D10005]">*</span>
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
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#D10005]">{phoneError}</p>}
                </div>

                <button
                  onClick={() => { if (phoneValid) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!phoneValid}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#D10005", opacity: phoneValid ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authNoAccount}{" "}
            <button onClick={onSignUp} className="font-bold text-[#D10005] underline">{t.authSignUpNow}</button>
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
                    <span className={`text-[13px] font-bold ${active ? "text-[#D10005]" : "text-[#1d2129]"}`}>{tb.label}</span>
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
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                  {un && <span className="absolute inset-y-0 left-0 w-1 bg-[#D10005]" />}
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[#9aa0a8]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {lang === "ja" ? it.atJa : it.at}
                    {un && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-[#D10005] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">
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

function PrizeHistory({ lang, coins, setCoins, shippingAddresses, onShippingAddressesChange, onBack, onHome, empty = false, onGoGacha }: { lang: Lang; coins: number; setCoins: Dispatch<SetStateAction<number>>; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onHome: () => void; empty?: boolean; onGoGacha?: () => void }) {
  const t = STR[lang];

  const [tab, setTab] = useState<PrizeTab>("won");
  const [won, setWon] = useState<WonPrize[]>(INITIAL_WON);
  const [waiting, setWaiting] = useState<WaitingPrize[]>(INITIAL_WAITING);
  const [shipped] = useState<ShippedPrize[]>(INITIAL_SHIPPED);

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

  if (empty) {
    return (
      <div className="flex h-full flex-col bg-[#eef0f3]">
        <header className="shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
            <BrandLogo onClick={onHome} />
            <BalancePill coins={coins} t={t} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.prizeHistory}</h2>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
          <img src="/refer-mascot.png" alt="" className="mb-5 h-44 w-44 object-contain" />
          <p className="text-center text-[14px] leading-relaxed text-[#9aa0a8]">{t.winEmptyTitle}</p>
          <p className="mt-1 max-w-[300px] text-center text-[14px] leading-relaxed text-[#9aa0a8]">{t.winEmptySub}</p>
          <button
            onClick={onGoGacha ?? onHome}
            className="mt-7 w-full rounded-xl bg-[#D10005] py-3.5 text-[15px] font-extrabold tracking-wide text-white shadow-[0_6px_18px_rgba(230,0,18,0.35)] active:scale-[0.99]"
          >
            {t.winEmptyCta}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.prizeHistory}</h2>
        </div>

        {/* Top navigation (Won/Waiting/Shipped) stays sticky together with the
            top section (logo, balance, back arrow and title) while the list
            scrolls beneath it. */}
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
      </header>

      <div ref={tabScrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">

        {tab === "won" && (
          won.length === 0 ? (
            <EmptyState icon="🎁" title={t.wonEmptyTitle} subtitle={t.wonEmptySub} />
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
                  {displayedWon.map((p) => {
                    const isSel = listSelected.has(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => listToggle(p.id)}
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
                <div className="-mx-3 mt-3"><SiteFooter t={t} /></div>
              </div>
            </>
          )
        )}
        {tab === "waiting" && <WaitingTab prizes={waiting} t={t} lang={lang} />}
        {tab === "shipped" && <ShippedTab prizes={shipped} onCopy={(c) => pushToast(t.toastCopied(c))} t={t} lang={lang} />}
      </div>

      {tab === "won" && won.length > 0 && listSelected.size > 0 && (
        <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          {listSelected.size > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-[#8a9099]">{t.deckSorted}</span>
                <button onClick={listReset} className="text-[#8a9099] underline">{t.itemsReset}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { if (!listCanShip) { pushToast(t.toastShort(listShortfall)); return; } setListShipOpen(true); }}
                  className="rounded-xl border-2 py-2 text-[12.5px] font-bold leading-tight transition"
                  style={{ borderColor: "#f5670a", color: "#f5670a", background: "#fff", opacity: listCanShip ? 1 : 0.6 }}
                >
                  ← {t.requestShipping} · {listSelected.size}
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{listTotal.toLocaleString()} coins</span>
                </button>
                <button
                  onClick={listExchange}
                  className="rounded-xl py-2 text-[12.5px] font-bold leading-tight text-white transition"
                  style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)" }}
                >
                  {t.exchange} · {listSelected.size} →
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-90">{listTotal.toLocaleString()} coins</span>
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10.5px] leading-tight text-[#8a9099]">
                {t.shipSelectHint}
              </p>
            </>
          )}
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
                    className="w-full rounded-xl bg-[#f4f5f7] py-3 pl-11 pr-3 text-[14px] font-semibold text-[#1d2129] outline-none placeholder:text-[#9aa0a8] focus:bg-white focus:ring-2 focus:ring-[#D10005]/30"
                  />
                </div>
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
                <button onClick={clearFilters} className="flex-1 rounded-xl bg-[#f2f3f5] py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{LF.clear}</button>
                <button onClick={() => setFilterOpen(false)} className="flex-1 rounded-xl bg-[#D10005] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{LF.apply}</button>
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
                <span className="font-mono text-[11px] font-bold text-[#1d2129]">{p.tracking}</span>
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
function ShippingAddressPage({ lang, coins, addresses, onAddressesChange, onBack, onOpenStore }: { lang: Lang; coins: number; addresses: ShippingAddr[]; onAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onOpenStore?: () => void }) {
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
      <AppHeader coins={coins} t={t} onOpenStore={onOpenStore} />

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
          <button onClick={view === "form" ? () => setView("main") : onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[15px] font-bold text-[#1d2129]">{view === "form" ? t.shippingFormTitle : t.shippingTitle}</h1>
        </div>
      </div>

      {view === "form" && (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
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

/* ── My Account (trimmed MyPage) ─────────────────────────────────────────
   Visual layout mirrors the POC's MyPage (profile / balance / rank cards +
   menu grid + account/other sections). Only "Prize history" and "Shipping
   address" are wired; every other menu row renders but is inert. The heavy
   POC dependencies (subscriptions, purchase history, refer, quests, FAQ,
   profile editor, ranking overlay) are intentionally NOT ported. */
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
    case "shippingAddress":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case "subscriptions":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M6 10h4M6 13.5h8" /><path d="M16 3l2 3M8 3l-2 3" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><path d="M5 18v-2a7 7 0 0114 0v2l1.5 2H3.5z" /><circle cx="12" cy="20.5" r="1.4" fill="#fff" /></svg>;
  }
}

function MyPage({ lang, coins, displayName = "Username", onOpenPrizeHistory, onOpenShippingAddress, onHome }: { lang: Lang; coins: number; displayName?: string; onOpenPrizeHistory: () => void; onOpenShippingAddress: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [tnc, setTnc] = useState(false);

  // Only "history" (Prize History) and "shippingAddress" navigate. Every other
  // row renders but is inert (no onClick) — the underlying screens are not
  // ported into PROD yet.
  const menu: { key: string; label: string; onClick?: () => void }[] = [
    { key: "quest", label: t.mmQuest },
    { key: "items", label: t.mmItems },
    { key: "history", label: t.mmPrizeHistory, onClick: onOpenPrizeHistory },
    { key: "purchases", label: t.mmPurchases },
    { key: "shippingAddress", label: t.mmShippingAddress, onClick: onOpenShippingAddress },
    { key: "subscriptions", label: t.mmSubscriptions },
    { key: "invite", label: t.mmInvite },
    { key: "faq", label: t.mmFaq },
    { key: "contact", label: t.mmContact },
    { key: "notices", label: t.mmNotices },
  ];

  const linkRow = (label: string, onClick?: () => void) => (
    <button key={label} onClick={onClick} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">{label}</button>
  );

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 py-4">
          {/* Profile card */}
          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <img src="/account-avatar.png" alt="" className="h-[86px] w-[86px] shrink-0 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-extrabold text-[#1d2129]">{displayName.trim() || t.accountName}</p>
              <p className="mt-0.5 text-[12px] font-normal text-[#8a9099]">{t.mpId} : XXXXXX</p>
              <button className="mt-2 w-full rounded-lg border-2 border-[#D10005] py-1.5 text-[13px] font-bold text-[#D10005]">{t.mpEditProfile}</button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="flex items-stretch">
              <div className="flex-1 pr-3">
                <p className="text-[13px] font-normal text-[#5b616b]">{t.mpOripaCoin}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[22px] font-extrabold text-[#1d2129]">
                  <CoinIcon size={22} />{coins.toLocaleString()}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D10005] text-[15px] leading-none text-white">+</span>
                </p>
              </div>
              <div className="w-px bg-black/10" />
              <div className="flex-1 pl-4">
                <p className="text-[13px] font-normal text-[#5b616b]">{t.mpFreePoint}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[22px] font-extrabold text-[#1d2129]"><GemIcon size={22} />10,000</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold text-[#D10005]">{t.mpCoinExpiry}</p>
              <button className="shrink-0 rounded-lg border border-black/25 px-4 py-1.5 text-[13px] font-bold text-[#1d2129] active:bg-black/[0.03]">{t.mpViewDetails}</button>
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
                className="absolute left-0 top-1/2 h-[14px] -translate-y-1/2 rounded-full border border-[#c56a1f]"
                style={{ width: "75%", background: "linear-gradient(180deg,#f7b866,#e07f22)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.55)" }}
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

          {/* Promo banners — 8:3 placeholders per Figma. */}
          <div className="mt-4 space-y-3">
            <div className="aspect-[8/3] overflow-hidden rounded-xl">
              <img src="/placeholder-banner.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="aspect-[8/3] overflow-hidden rounded-xl">
              <img src="/placeholder-banner.png" alt="" className="h-full w-full object-cover" />
            </div>
          </div>

          {/* Account section */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpAccountSection}</h3>
          <div className="space-y-2">
            <button className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">{t.mpEditAccount}</button>
            <button className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">{t.menuLogout}</button>
          </div>

          {/* Other section */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpOtherSection}</h3>
          <div className="space-y-2">
            {linkRow(t.mpTerms, () => setTnc(true))}
            {linkRow(t.mpPrivacy)}
            {linkRow(t.mpLegal)}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>
      {tnc && <TermsOverlay lang={lang} onClose={() => setTnc(false)} />}
    </div>
  );
}

export function PhoneApp({ lang, noHistory }: { lang: Lang; noHistory: boolean }) {
  const t = STR[lang];
  const [screen, setScreen] = useState<Screen>("landing");
  const [prevScreen, setPrevScreen] = useState<Screen>("oripa");
  // Prize History adjusts `coins` when exchanging prizes / paying shipping fees.
  const [coins, setCoins] = useState(10000);
  // Shipping addresses are shared between the Shipping Address page and the
  // in-flow "request shipping" address picker.
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddr[]>([]);
  const [notifOnly, setNotifOnly] = useState<"you" | "notice" | undefined>(undefined);
  const goHome = () => setScreen("oripa");
  // PROD: login/sign-up land straight on the lobby (no onboarding flow).
  const enterHome = () => setScreen("oripa");
  const openNotifications = () => { setNotifOnly(undefined); setPrevScreen((p) => (screen === "notifications" ? p : screen)); setScreen("notifications"); };
  // Bottom-nav navigation: only the Oripa (lobby) and My Account tabs are live.
  const navigate = (s: Screen) => {
    if (s === "oripa") { goHome(); return; }
    if (s === "mypage") { setScreen("mypage"); return; }
    // prizeHistory / quest / store tabs remain inert.
  };
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
        {screen === "mypage" && (
          <MyPage
            lang={lang}
            coins={coins}
            onOpenPrizeHistory={() => setScreen("prizeHistory")}
            onOpenShippingAddress={() => setScreen("shippingAddress")}
            onHome={goHome}
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
          />
        )}
        {screen === "shippingAddress" && (
          <ShippingAddressPage
            lang={lang}
            coins={coins}
            addresses={shippingAddresses}
            onAddressesChange={setShippingAddresses}
            onBack={() => setScreen("mypage")}
          />
        )}
      </div>
      {showNav && <BottomNav screen={screen} t={t} onNavigate={navigate} />}
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
