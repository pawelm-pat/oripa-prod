"use client";

import { useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Lang } from "../lib/types";
import { STR } from "../lib/i18n";

/**
 * Store V1 — exact port of HeorhiiPovstianyi_repo StorePage with storeVariant="v3"
 * (UI label "Store V1": Special Offers + Coin Purchase heroes/plain packs).
 */

export type PointPackage = {
  id: string;
  coins: number;
  freePoints: number;
  jpy: number;
  inrApprox: number;
  originalJpy?: number;
  firstTimeOffer?: boolean;
  popularOffer?: boolean;
  discount?: number;
  subscriptionName?: string;
};

export const SPECIAL_OFFERS: PointPackage[] = [
  { id: "so1", coins: 5000, freePoints: 500, jpy: 500, inrApprox: 306.64, firstTimeOffer: true, discount: 90 },
  { id: "so2", coins: 5000, freePoints: 500, jpy: 5000, inrApprox: 3066.44, originalJpy: 10000, firstTimeOffer: true, discount: 90 },
];

type StoreV3HeroPackage = {
  id: string;
  coins: number;
  freePoints: number;
  jpy: number;
  originalJpy: number;
  discount: number;
  tag: string;
  art: string;
  gradient: string;
};

const STORE_V3_HERO_PACKAGES: StoreV3HeroPackage[] = [
  { id: "v3hero1", coins: 100000, freePoints: 500, jpy: 100000, originalJpy: 10000, discount: 88, tag: "FIRST-TIME OFFER", art: "/coin-bag.png", gradient: "linear-gradient(135deg,#c50008,#8b0000)" },
  { id: "v3hero2", coins: 100000, freePoints: 500, jpy: 100000, originalJpy: 10000, discount: 90, tag: "MEGA SALE", art: "/coin-chest.png", gradient: "linear-gradient(135deg,#1d4ed8,#1e3a8a)" },
];

const STORE_V3_PLAIN_PACKAGES: PointPackage[] = [500, 1000, 5000, 10000, 20000, 50000, 100000].map((c) => ({
  id: `v3plain${c}`,
  coins: c,
  freePoints: 500,
  jpy: c,
  inrApprox: c * 0.613,
}));

function StoreCoinIcon({ size = 32 }: { size?: number }) {
  return <img src="/coin.png" alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

function PointsLogoIcon({ size = 16 }: { size?: number }) {
  return (
    <img src="/points_logo.svg" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
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

export function StorePage({
  lang,
  coins,
  setCoins,
  onBack,
  chrome,
  purchasedIds: purchasedIdsProp,
}: {
  lang: Lang;
  coins: number;
  setCoins: Dispatch<SetStateAction<number>>;
  onBack: () => void;
  chrome: StorePageChrome;
  /** Optional controlled purchased ids (defaults to session-local). */
  purchasedIds?: string[];
}) {
  const t = STR[lang];
  const [selectedPkg, setSelectedPkg] = useState<PointPackage | null>(null);
  const [localPurchasedIds, setLocalPurchasedIds] = useState<string[]>([]);
  const purchasedIds = purchasedIdsProp ?? localPurchasedIds;

  function selectPackage(pkg: PointPackage) {
    setSelectedPkg(pkg);
  }

  function handleComplete(coinsEarned: number) {
    const pkgId = selectedPkg?.id ?? "";
    if (selectedPkg?.subscriptionName) {
      // subscription: no coin credit
    } else {
      setCoins((c) => c + coinsEarned);
    }
    if (pkgId && purchasedIdsProp === undefined) {
      setLocalPurchasedIds((prev) => (prev.includes(pkgId) ? prev : [...prev, pkgId]));
    }
    setSelectedPkg(null);
  }

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      {chrome.header}

      {/* Page title row — exact POC Store V1 */}
      <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center text-[#1d2129]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[15px] font-bold text-[#1d2129]">{t.storeTitle}</h1>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {/* Special Offers grid (Store V1 / internal v3) */}
        {purchasedIds.length === 0 && (
          <div className="px-4 pt-4">
            <p className="mb-2.5 text-[14px] font-extrabold text-[#1d2129]">{t.storeSpecialOffers}</p>
            <div className="grid grid-cols-2 gap-3">
              {SPECIAL_OFFERS.map((offer, idx) => {
                const highlighted = idx === 1;
                return (
                  <div
                    key={offer.id}
                    onClick={() => selectPackage(offer)}
                    role="button"
                    className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                    style={{ border: highlighted ? "2px solid #B40206" : "1px solid #e5e8ec" }}
                  >
                    <div className="flex h-[92px] items-center justify-center bg-[#fbf6ee]">
                      <img src={idx === 0 ? "/coin-bag.png" : "/coin-chest.png"} alt="" className="h-[76px] w-[76px] object-contain" />
                    </div>
                    <div className="flex flex-col items-center gap-1 px-2.5 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <StoreCoinIcon size={14} />
                        <span className="text-[13px] font-extrabold text-[#1d2129]">{t.storeCoins(offer.coins)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] font-semibold text-[#92400e]">+</span>
                        <PointsLogoIcon size={11} />
                        <span className="text-[10px] font-semibold text-[#92400e]">{t.storeFreePoints(offer.freePoints)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-center gap-1.5">
                        <span className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: "#e6a817" }}>{t.storeFirstTimeOffer}</span>
                        {offer.discount && <span className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: "#B40206" }}>{t.storeOff(offer.discount)}</span>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); selectPackage(offer); }}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[13px] font-black text-white"
                        style={{ background: "#B40206" }}
                      >
                        {offer.originalJpy && <span className="text-[10px] font-semibold line-through text-white/60">¥{offer.originalJpy.toLocaleString()}</span>}
                        ¥{offer.jpy.toLocaleString()}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buy Coins (Store V1 — hero rows + flat list) */}
        <div className="px-4 pt-4 pb-4">
          <div className="mb-3">
            <p className="text-[14px] font-extrabold text-[#1d2129]">{t.storeCoinPurchase}</p>
          </div>
          <div className="space-y-2.5">
            {STORE_V3_HERO_PACKAGES.map((hero) => {
              const pkg: PointPackage = {
                id: hero.id,
                coins: hero.coins,
                freePoints: hero.freePoints,
                jpy: hero.jpy,
                inrApprox: hero.jpy * 0.613,
                originalJpy: hero.originalJpy,
                firstTimeOffer: hero.tag === "FIRST-TIME OFFER",
                discount: hero.discount,
              };
              return (
                <div
                  key={hero.id}
                  onClick={() => selectPackage(pkg)}
                  role="button"
                  className="relative cursor-pointer overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:scale-[0.99]"
                  style={{ background: hero.gradient }}
                >
                  <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-1" style={{ background: "rgba(0,0,0,0.15)" }}>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{hero.tag}</span>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "rgba(255,255,255,0.25)" }}>{t.storeOff(hero.discount)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <img src={hero.art} alt="" className="h-9 w-9 shrink-0 object-contain" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold text-white">{t.storeCoins(hero.coins)}</p>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <span className="text-[11px] font-semibold text-white">+</span>
                        <PointsLogoIcon size={12} />
                        <span className="text-[11px] font-semibold text-white">{t.storeFreePoints(hero.freePoints)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-[11px] line-through" style={{ color: "rgba(255,255,255,0.55)" }}>¥{hero.originalJpy.toLocaleString()}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); selectPackage(pkg); }}
                        className="rounded-lg px-4 py-2 text-[13px] font-bold text-white"
                        style={{ background: "#f97316" }}
                      >
                        ¥{hero.jpy.toLocaleString()}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {STORE_V3_PLAIN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => selectPackage(pkg)}
                role="button"
                className="relative cursor-pointer rounded-xl border border-[#e5e8ec] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <img src="/oripa-coin.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-extrabold text-[#1d2129]">{t.storeCoins(pkg.coins)}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "#fef3c7" }}>
                      <span className="text-[11px] font-semibold text-[#92400e]">+</span>
                      <PointsLogoIcon size={12} />
                      <span className="text-[11px] font-semibold text-[#92400e]">{t.storeFreePoints(pkg.freePoints)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); selectPackage(pkg); }}
                    className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-bold text-white"
                    style={{ background: "#B40206" }}
                  >
                    ¥{pkg.jpy.toLocaleString()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="-mx-4 mt-3">{chrome.footer}</div>
      </div>

      {selectedPkg && chrome.checkout({
        pkg: selectedPkg,
        onComplete: handleComplete,
        onClose: () => setSelectedPkg(null),
      })}
    </div>
  );
}
