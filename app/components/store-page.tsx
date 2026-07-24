"use client";

import { useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Lang } from "../lib/types";
import { STR } from "../lib/i18n";

/* ── Catalog ─────────────────────────────────────────────────────────── */
export type StoreArt = "coin" | "bag" | "chest";
export type StoreTag = "firstTime" | "megaSale";
export type PointPackage = {
  id: string;
  coins: number;
  freePoints: number;
  jpy: number;
  inrApprox: number;
  originalJpy?: number;
  discount?: number;
  tag?: StoreTag;
  art?: StoreArt;
  highlighted?: boolean;
  /** Kept for PurchaseFlow subscription success path (unused by store catalog). */
  subscriptionName?: string;
};

const INR_PER_JPY = 0.613328;
const jpyToInr = (jpy: number) => Math.round(jpy * INR_PER_JPY * 100) / 100;

/** Section 1 — first-purchase Special Offers (hidden after any session purchase). */
export const SPECIAL_OFFERS: PointPackage[] = [
  { id: "so1", coins: 5000, freePoints: 500, jpy: 500, inrApprox: jpyToInr(500), art: "bag", tag: "firstTime" },
  { id: "so2", coins: 5000, freePoints: 500, jpy: 5000, inrApprox: jpyToInr(5000), originalJpy: 10000, discount: 90, art: "chest", tag: "firstTime", highlighted: true },
];

/** Section 2A — always-visible hero rows. */
export const HERO_PACKAGES: PointPackage[] = [
  { id: "hero-first", coins: 100000, freePoints: 500, jpy: 100000, inrApprox: jpyToInr(100000), originalJpy: 10000, discount: 88, art: "bag", tag: "firstTime" },
  { id: "hero-mega", coins: 100000, freePoints: 500, jpy: 100000, inrApprox: jpyToInr(100000), originalJpy: 10000, discount: 90, art: "chest", tag: "megaSale" },
];

/** Section 2B — plain white packs (price equals coin amount). */
export const PLAIN_PACKAGES: PointPackage[] = [500, 1000, 5000, 10000, 20000, 50000, 100000].map((n) => ({
  id: `pp${n}`,
  coins: n,
  freePoints: 500,
  jpy: n,
  inrApprox: jpyToInr(n),
  art: "coin" as const,
}));

function StoreCoinIcon({ size = 32 }: { size?: number }) {
  return <img src="/coin.png" alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

function StoreArtImg({ art = "coin", size }: { art?: StoreArt; size: number }) {
  const src = art === "bag" ? "/coin-bag.png" : art === "chest" ? "/coin-chest.png" : "/oripa-coin.png";
  return <img src={src} alt="" width={size} height={size} className="shrink-0 object-contain" draggable={false} />;
}

function GemIcon({ size = 16 }: { size?: number }) {
  return <img src="/freepoint.png" alt="" width={size} height={size} className="shrink-0 object-contain" draggable={false} />;
}

export type StorePageChrome = {
  header: ReactNode;
  footer: ReactNode;
  checkout: (args: {
    pkg: PointPackage;
    onComplete: (coinsEarned: number) => void;
    onClose: () => void;
  }) => ReactNode;
};

/**
 * Purchase Coins store — Special Offers (session-first) + Coin Purchase
 * (2 heroes + 7 plain packs). No loyalty, bundles, subs, welcome bar, or tabs.
 */
export function StorePage({
  lang,
  coins,
  setCoins,
  onBack,
  chrome,
}: {
  lang: Lang;
  coins: number;
  setCoins: Dispatch<SetStateAction<number>>;
  onBack: () => void;
  chrome: StorePageChrome;
}) {
  const t = STR[lang];
  const [selectedPkg, setSelectedPkg] = useState<PointPackage | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const showSpecialOffers = purchasedIds.length === 0;

  function handleComplete(coinsEarned: number) {
    if (selectedPkg) {
      setPurchasedIds((ids) => (ids.includes(selectedPkg.id) ? ids : [...ids, selectedPkg.id]));
      setCoins((c) => c + coinsEarned);
    }
    setSelectedPkg(null);
  }

  const tagLabel = (tag?: StoreTag) =>
    tag === "megaSale" ? t.storeMegaSale : t.storeFirstTimeOffer;

  const heroGradient = (pkg: PointPackage) =>
    pkg.tag === "megaSale"
      ? "linear-gradient(135deg, #1d4ed8, #1e3a8a)"
      : "linear-gradient(135deg, #c50008, #8b0000)";

  const heroTagBg = (pkg: PointPackage) =>
    pkg.tag === "megaSale" ? "rgba(30, 58, 138, 0.85)" : "rgba(139, 0, 0, 0.85)";

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      {chrome.header}

      {/* Title row */}
      <div className="shrink-0 flex items-center gap-2 border-b border-black/10 bg-white px-4 py-3">
        <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center text-[#B40206] hover:bg-black/5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1d2129]">{t.storeTitle}</h1>
      </div>

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {showSpecialOffers && (
          <div className="px-4 pt-4">
            <p className="mb-3 text-[14px] font-extrabold text-[#1d2129]">{t.storeSpecialOffers}</p>
            <div className="grid grid-cols-2 gap-3">
              {SPECIAL_OFFERS.map((pkg) => (
                <div
                  key={pkg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPkg(pkg)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPkg(pkg); }}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                  style={{ border: pkg.highlighted ? "2px solid #B40206" : "1px solid #e5e8ec" }}
                >
                  <div className="flex h-[92px] items-center justify-center bg-[#fbf6ee]">
                    <StoreArtImg art={pkg.art} size={76} />
                  </div>
                  <div className="flex flex-1 flex-col items-center px-2.5 pb-3 pt-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <StoreCoinIcon size={16} />
                      <span className="text-[14px] font-extrabold text-[#1d2129]">{t.storeCoins(pkg.coins)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-0.5 text-[11px] font-semibold text-[#92400e]">
                      <span>+</span>
                      <GemIcon size={11} />
                      <span>{t.storeFreePoints(pkg.freePoints)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ background: "#e6a817" }}>{t.storeFirstTimeOffer}</span>
                      {pkg.discount != null && (
                        <span className="rounded-full bg-[#B40206] px-2 py-0.5 text-[9px] font-bold text-white">{t.storeOff(pkg.discount)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedPkg(pkg); }}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#B40206] py-2 text-[13px] font-bold text-white active:scale-[0.98]"
                    >
                      {pkg.originalJpy != null && (
                        <span className="text-[11px] font-semibold line-through text-white/60">¥{pkg.originalJpy.toLocaleString()}</span>
                      )}
                      <span>¥{pkg.jpy.toLocaleString()}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`px-4 pb-4 ${showSpecialOffers ? "pt-5" : "pt-4"}`}>
          <p className="mb-3 text-[14px] font-extrabold text-[#1d2129]">{t.storeCoinPurchase}</p>
          <div className="space-y-2.5">
            {HERO_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPkg(pkg)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPkg(pkg); }}
                className="cursor-pointer overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:scale-[0.99]"
                style={{ background: heroGradient(pkg) }}
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "rgba(0,0,0,0.15)" }}>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: heroTagBg(pkg) }}>{tagLabel(pkg.tag)}</span>
                  {pkg.discount != null && (
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">{t.storeOff(pkg.discount)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <StoreArtImg art={pkg.art} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-extrabold text-white">{t.storeCoins(pkg.coins)}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5">
                      <span className="text-[11px] font-semibold text-white">+</span>
                      <GemIcon size={12} />
                      <span className="text-[11px] font-semibold text-white">{t.storeFreePoints(pkg.freePoints)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {pkg.originalJpy != null && (
                      <span className="text-[11px] line-through text-white/60">¥{pkg.originalJpy.toLocaleString()}</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedPkg(pkg); }}
                      className="rounded-lg bg-[#f97316] px-3.5 py-2 text-[13px] font-bold text-white active:scale-[0.98]"
                    >
                      ¥{pkg.jpy.toLocaleString()}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {PLAIN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPkg(pkg)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPkg(pkg); }}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:scale-[0.99]"
              >
                <StoreArtImg art="coin" size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-[#1d2129]">{t.storeCoins(pkg.coins)}</p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2 py-0.5">
                    <span className="text-[11px] font-semibold text-[#92400e]">+</span>
                    <GemIcon size={12} />
                    <span className="text-[11px] font-semibold text-[#92400e]">{t.storeFreePoints(pkg.freePoints)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedPkg(pkg); }}
                  className="shrink-0 rounded-lg bg-[#B40206] px-4 py-2 text-[13px] font-bold text-white active:scale-[0.98]"
                >
                  ¥{pkg.jpy.toLocaleString()}
                </button>
              </div>
            ))}
          </div>
        </div>

        {chrome.footer}
      </div>

      {selectedPkg && chrome.checkout({
        pkg: selectedPkg,
        onComplete: handleComplete,
        onClose: () => setSelectedPkg(null),
      })}
    </div>
  );
}
