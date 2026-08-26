"use client";

import { useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Lang } from "../lib/types";
import { STR } from "../lib/i18n";

/**
 * Store — Buy Coins catalog (1:1 coin-to-JPY packs).
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

export const STORE_V3_PLAIN_PACKAGES: PointPackage[] = [
  1000, 3000, 5000, 10000, 30000, 50000, 100000, 300000, 500000, 1000000,
].map((c) => ({
  id: `v3plain${c}`,
  coins: c,
  freePoints: 0,
  jpy: c,
  inrApprox: c * 0.613,
}));

export type StorePageChrome = {
  header: ReactNode;
  footer: ReactNode;
  checkout: (args: {
    pkg: PointPackage;
    onComplete: (coinsEarned: number) => void;
    onClose: () => void;
    onSelectPackage: (pkg: PointPackage) => void;
  }) => ReactNode;
};

export function StorePage({
  lang,
  coins,
  setCoins,
  onBack,
  chrome,
  purchasedIds: purchasedIdsProp,
  onPackagePurchased,
}: {
  lang: Lang;
  coins: number;
  setCoins: Dispatch<SetStateAction<number>>;
  onBack: () => void;
  chrome: StorePageChrome;
  /** Optional controlled purchased ids (defaults to session-local). */
  purchasedIds?: string[];
  /** Fired when a package is purchased (for controlled purchasedIds). */
  onPackagePurchased?: (pkgId: string) => void;
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
    if (pkgId) {
      if (purchasedIdsProp === undefined) {
        setLocalPurchasedIds((prev) => (prev.includes(pkgId) ? prev : [...prev, pkgId]));
      }
      onPackagePurchased?.(pkgId);
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
        {/* Buy Coins */}
        <div className="px-4 pt-4 pb-4">
          <div className="mb-3">
            <p className="text-[14px] font-extrabold text-[#1d2129]">{t.storeCoinPurchase}</p>
          </div>
          <div className="space-y-2.5">
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
        onSelectPackage: selectPackage,
      })}
    </div>
  );
}
