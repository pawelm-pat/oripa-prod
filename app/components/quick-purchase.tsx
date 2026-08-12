"use client";

/**
 * Quick Purchase — exact port from HeorhiiPovstianyi_repo (insufficient coins → offer sheet).
 */

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "../lib/types";
import { STR } from "../lib/i18n";
import { PREFECTURES_EN, PREFECTURES_JA, US_STATES } from "../data/prizes";
import {
  SPECIAL_OFFERS,
  STORE_V3_HERO_PACKAGES,
  STORE_V3_PLAIN_PACKAGES,
  type PointPackage,
} from "./store-page";

export type IntlCurrencyInfo = { code: string; symbol: string; rateFromJpy: number };

function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/coin.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function PointsLogoIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/points_logo.svg" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function CardBrandIcon({ brand, large = false }: { brand: string; large?: boolean }) {
  const b = brand.toLowerCase();
  if (b === "visa") return <span className={`inline-block min-w-[36px] text-center font-black italic ${large ? "text-[15px]" : "text-[13px]"}`} style={{ color: "#1a1f71" }}>VISA</span>;
  if (b === "mastercard") return (
    <div className="relative flex h-6 w-9 shrink-0 items-center">
      <div className="absolute left-0 h-6 w-6 rounded-full" style={{ background: "#eb001b" }} />
      <div className="absolute left-3 h-6 w-6 rounded-full opacity-80" style={{ background: "#f79e1b" }} />
    </div>
  );
  if (b === "amex") return <span className={`inline-block rounded bg-[#006fcf] px-1.5 py-0.5 text-center font-black text-white ${large ? "text-[11px]" : "text-[10px]"}`}>AMEX</span>;
  return <svg width={large ? 42 : 36} height={large ? 28 : 24} viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#1d2129" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>;
}

function AcceptedCardBadge({ brand }: { brand: "visa" | "mastercard" | "amex" | "discover" | "unionpay" | "diners" | "jcb" }) {
  const tile = "flex h-5 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-[#e2e5ea]";
  if (brand === "visa") {
    return (
      <span className={`${tile} bg-[#1a1f71]`}>
        <span className="text-[8px] font-black italic tracking-wide text-white">VISA</span>
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className={`${tile} bg-white`}>
        <span className="relative flex h-3.5 w-5 items-center">
          <span className="absolute left-0 h-3.5 w-3.5 rounded-full bg-[#eb001b]" />
          <span className="absolute left-1.5 h-3.5 w-3.5 rounded-full bg-[#f79e1b] opacity-90" />
        </span>
      </span>
    );
  }
  if (brand === "amex") {
    return (
      <span className={`${tile} bg-[#006fcf]`}>
        <span className="px-0.5 text-center text-[5px] font-black leading-[1.05] tracking-tight text-white">AMERICAN<br />EXPRESS</span>
      </span>
    );
  }
  if (brand === "discover") {
    return (
      <span className={`${tile} bg-[#1d2129]`}>
        <span className="text-[6px] font-black tracking-wide text-white">
          DISC<span className="text-[#f76f20]">O</span>VER
        </span>
      </span>
    );
  }
  if (brand === "unionpay") {
    return (
      <span className={`${tile} bg-[#1d2129]`}>
        <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden>
          <rect x="2" y="2" width="8" height="12" rx="1" fill="#e21836" />
          <rect x="10" y="2" width="8" height="12" rx="1" fill="#00447c" />
          <rect x="18" y="2" width="8" height="12" rx="1" fill="#007b84" />
          <text x="14" y="10.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="800" fontFamily="Arial, sans-serif">UnionPay</text>
        </svg>
      </span>
    );
  }
  if (brand === "diners") {
    return (
      <span className={`${tile} bg-white`}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#0079BE" />
          <circle cx="12" cy="12" r="7.5" fill="white" />
          <path d="M8 12a4 4 0 018 0 4 4 0 01-8 0z" fill="#0079BE" />
          <rect x="10.2" y="8" width="1.4" height="8" fill="white" />
          <rect x="12.4" y="8" width="1.4" height="8" fill="white" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`${tile} bg-[#1d2129]`}>
      <svg width="22" height="14" viewBox="0 0 36 22" aria-hidden>
        <rect x="1" y="1" width="10" height="20" rx="1.5" fill="#0E4C96" />
        <rect x="13" y="1" width="10" height="20" rx="1.5" fill="#E60028" />
        <rect x="25" y="1" width="10" height="20" rx="1.5" fill="#00873F" />
        <text x="6" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="Arial, sans-serif">J</text>
        <text x="18" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="Arial, sans-serif">C</text>
        <text x="30" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="Arial, sans-serif">B</text>
      </svg>
    </span>
  );
}

function AcceptedCardsRow({ label, flush = false }: { label: string; flush?: boolean }) {
  const brands: Array<"visa" | "mastercard" | "amex" | "discover" | "unionpay" | "diners" | "jcb"> = [
    "visa", "mastercard", "amex", "discover", "unionpay", "diners", "jcb",
  ];
  return (
    <div className={flush ? "" : "pl-8"}>
      <p className="mb-1 text-[11px] font-medium text-[#5c626b]">{label}</p>
      <div className="flex flex-nowrap items-center gap-1">
        {brands.map((b) => <AcceptedCardBadge key={b} brand={b} />)}
      </div>
    </div>
  );
}

/* ── Quick purchase (insufficient coins → offer sheet) ───────────────── */
export type BillingAddress = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  country: string;
  city: string;
  state: string;
  zip: string;
};

type QuickOffer = PointPackage & {
  tag?: string;
  art?: string;
  gradient?: string;
  isSpecial?: boolean;
};

function buildQuickSpecialOffers(purchasedIds: string[]): QuickOffer[] {
  const heroes: QuickOffer[] = STORE_V3_HERO_PACKAGES
    .filter((h) => !purchasedIds.includes(h.id))
    .map((h) => ({
      id: h.id,
      coins: h.coins,
      freePoints: h.freePoints,
      jpy: h.jpy,
      inrApprox: h.jpy * 0.613,
      originalJpy: h.originalJpy,
      discount: h.discount,
      firstTimeOffer: /first/i.test(h.tag),
      tag: h.tag,
      art: h.art,
      gradient: h.gradient,
      isSpecial: true,
    }));
  const specials: QuickOffer[] = SPECIAL_OFFERS
    .filter((s) => !purchasedIds.includes(s.id))
    .map((s) => ({
      ...s,
      tag: "FIRST-TIME OFFER",
      art: "/coin-bag.png",
      gradient: "linear-gradient(135deg,#c50008,#8b0000)",
      isSpecial: true,
    }));
  return [...heroes, ...specials];
}

/** Covering packages for the initial 2 quick-purchase slots. */
function listFeaturedQuickOffers(needed: number, purchasedIds: string[]): QuickOffer[] {
  const specials = buildQuickSpecialOffers(purchasedIds)
    .filter((p) => p.coins >= needed)
    .sort((a, b) => {
      if (a.coins !== b.coins) return a.coins - b.coins;
      if (!!a.firstTimeOffer !== !!b.firstTimeOffer) return a.firstTimeOffer ? -1 : 1;
      return 0;
    });
  const specialIds = new Set(specials.map((p) => p.id));
  const regular = STORE_V3_PLAIN_PACKAGES
    .filter((p) => p.coins >= needed && !purchasedIds.includes(p.id) && !specialIds.has(p.id))
    .sort((a, b) => a.coins - b.coins || a.jpy - b.jpy)
    .map((p): QuickOffer => ({ ...p, art: "/coin.png" }));
  if (specials.length >= 2) return specials.slice(0, 2);
  if (specials.length === 1) {
    const s = specials[0];
    const next = regular.find((r) => r.coins > s.coins) || regular[0];
    return next ? [s, next] : [s];
  }
  return regular.slice(0, 2);
}

/** Full store catalog for "View More Packages" scroll. */
function listAllStoreOffers(purchasedIds: string[]): QuickOffer[] {
  const fromBuild = buildQuickSpecialOffers(purchasedIds);
  const seen = new Set(fromBuild.map((p) => p.id));
  const plain = STORE_V3_PLAIN_PACKAGES
    .filter((p) => !purchasedIds.includes(p.id) && !seen.has(p.id))
    .map((p): QuickOffer => ({ ...p, art: "/coin.png" }));
  return [...fromBuild, ...plain];
}

export type QuickPurchasePending = {
  drawCount: number;
  billCount: number;
  cost: number;
  opts?: { superBoost?: boolean; megaBoost?: boolean };
};

export type QuickSavedCard = { last4: string; expiry: string; brand: string; name: string; billingAddress?: BillingAddress };

export function QuickPurchaseFlow({
  lang,
  neededCoins,
  purchasedIds,
  savedCards,
  onSaveCard,
  onClose,
  onPaid,
  onDraw,
  onRequireKyc,
  localCurrency = null,
}: {
  lang: Lang;
  neededCoins: number;
  purchasedIds: string[];
  savedCards: QuickSavedCard[];
  onSaveCard: (card: QuickSavedCard) => void;
  onClose: () => void;
  onPaid: (pkg: PointPackage) => void;
  onDraw: () => void;
  onRequireKyc?: () => boolean;
  localCurrency?: IntlCurrencyInfo | null;
}) {
  const t = STR[lang];
  const isIntl = !!localCurrency;
  const intlLocal: IntlCurrencyInfo = localCurrency ?? { code: "INR", symbol: "₹", rateFromJpy: 0.6103 };
  const intlLocalFromJpy = (jpy: number) => Math.round(jpy * intlLocal.rateFromJpy);
  const intlAmountFor = (cur: string, jpy: number) => (cur === "JPY" ? jpy : intlLocalFromJpy(jpy));
  const intlSymbolFor = (cur: string) => (cur === "JPY" ? "¥" : intlLocal.symbol);
  const featuredOffers = useMemo(() => listFeaturedQuickOffers(neededCoins, purchasedIds), [neededCoins, purchasedIds]);
  const allStoreOffers = useMemo(() => listAllStoreOffers(purchasedIds), [purchasedIds]);
  const [step, setStep] = useState<"offers" | "pay" | "auth3ds" | "success">("offers");
  const [pkg, setPkg] = useState<QuickOffer | null>(null);
  const [showMorePkgs, setShowMorePkgs] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | "new">(savedCards.length > 0 ? 0 : "new");
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "applePay" | "googlePay">("card");
  const [intlCurrency, setIntlCurrency] = useState<string | null>(null);
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [cardName, setCardName] = useState("");
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [country, setCountry] = useState("Japan");
  const [credited, setCredited] = useState(false);
  const [paidCard, setPaidCard] = useState<QuickSavedCard | null>(null);

  // Keep selection valid when shared card list changes (e.g. after Store purchase).
  useEffect(() => {
    if (typeof selectedCardIdx === "number" && selectedCardIdx >= savedCards.length) {
      setSelectedCardIdx(savedCards.length > 0 ? 0 : "new");
    }
  }, [savedCards.length, selectedCardIdx]);

  // When expanded, list every store pack; keep featured order at the top.
  const scrollOffers = useMemo(() => {
    const featuredIds = new Set(featuredOffers.map((o) => o.id));
    const rest = allStoreOffers.filter((o) => !featuredIds.has(o.id));
    return [...featuredOffers, ...rest];
  }, [featuredOffers, allStoreOffers]);
  const hasMorePackages = scrollOffers.length > 2;

  const rawCardNum = cardNum.replace(/\s/g, "");
  const cardNumValid = rawCardNum.length >= 14 && rawCardNum.length <= 16;
  const expiryValid = (() => {
    const m = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const nowY = now.getFullYear() % 100;
    const nowM = now.getMonth() + 1;
    return yy > nowY || (yy === nowY && mm >= nowM);
  })();
  const isJapan = country === "Japan";
  const billingZipValid = isJapan ? /^\d{3}-\d{4}$/.test(billingZip) : /^\d{5}$/.test(billingZip.trim());
  const billingFilled =
    billingFirstName.trim().length > 0 &&
    billingLastName.trim().length > 0 &&
    billingAddress1.trim().length > 0 &&
    billingCity.trim().length > 0 &&
    billingState.length > 0 &&
    billingZipValid;
  const isNewCard = addOpen || selectedCardIdx === "new" || savedCards.length === 0;
  const newCardCvvValid = cvc.replace(/\D/g, "").length >= 3;
  const authCodeDigits = authCode.replace(/\D/g, "");
  const authCodeValid = authCodeDigits.length >= 4;
  const intlDisabled = isIntl && !intlCurrency;
  const payDisabled = !pkg || intlDisabled || (isNewCard
    ? (!cardNumValid || !expiryValid || !newCardCvvValid || cardName.trim().length < 2 || !billingFilled)
    : false);

  const dropdownCards = savedCards.slice(0, 3);
  const selectedCard = typeof selectedCardIdx === "number" ? savedCards[selectedCardIdx] : null;

  const sheetMaxH =
    step === "success" ? "78%"
    : step === "pay" && cardMenuOpen ? "84%"
    : step === "pay" && addOpen ? "88%"
    : step === "offers" && showMorePkgs ? "86%"
    : step === "pay" ? "84%"
    : "72%";

  function handleCardNumChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    setCardNum(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
  }
  function handleExpiryChange(value: string) {
    const raw = value.replace(/\D/g, "").slice(0, 4);
    setExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw);
  }
  function handleCardNameChange(value: string) {
    setCardName(value.replace(/\d/g, "").slice(0, 30));
  }
  function handleBillingZipChange(v: string) {
    if (isJapan) {
      const digits = v.replace(/\D/g, "").slice(0, 7);
      setBillingZip(digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits);
    } else {
      setBillingZip(v.replace(/\D/g, "").slice(0, 5));
    }
  }

  function selectOffer(offer: QuickOffer) {
    setPkg(offer);
    setShowMorePkgs(false);
    setAddOpen(savedCards.length === 0);
    setSelectedCardIdx(savedCards.length > 0 ? 0 : "new");
    setPayMethod("card");
    setAuthCode("");
    setIntlCurrency(null);
    setCardMenuOpen(false);
    setStep("pay");
  }

  function beginPay() {
    if (!pkg || payDisabled) return;
    if (onRequireKyc && !onRequireKyc()) return;
    let used: QuickSavedCard | null = selectedCard;
    if (isNewCard) {
      const digits = rawCardNum;
      const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : digits.startsWith("3") ? "Amex" : "Card";
      const last4 = digits.slice(-4);
      const card: QuickSavedCard = {
        last4,
        expiry,
        brand,
        name: cardName.trim(),
        billingAddress: {
          firstName: billingFirstName.trim(),
          lastName: billingLastName.trim(),
          address1: billingAddress1.trim(),
          address2: billingAddress2.trim(),
          country,
          city: billingCity.trim(),
          state: billingState,
          zip: billingZip,
        },
      };
      onSaveCard(card);
      setSelectedCardIdx(0);
      used = card;
    } else if (selectedCard) {
      // Promote to front — same LAST USED ordering as Store cashier.
      onSaveCard(selectedCard);
      setSelectedCardIdx(0);
      used = selectedCard;
    }
    setPaidCard(used);
    setPayMethod("card");
    setCardMenuOpen(false);
    setAuthCode("");
    setStep("auth3ds");
  }

  function completeCardAuth() {
    if (!pkg || !authCodeValid) return;
    if (!credited) {
      onPaid(pkg);
      setCredited(true);
    }
    setStep("success");
  }

  function payWithWallet(method: "applePay" | "googlePay") {
    if (!pkg || intlDisabled) return;
    if (onRequireKyc && !onRequireKyc()) return;
    setPaidCard(null);
    setPayMethod(method);
    if (!credited) {
      onPaid(pkg);
      setCredited(true);
    }
    setCardMenuOpen(false);
    setStep("success");
  }

  const paidMethod = (() => {
    if (payMethod === "applePay") {
      return {
        label: t.checkoutApplePay,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d2129" aria-hidden><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>,
      };
    }
    if (payMethod === "googlePay") {
      return { label: "Google Pay", icon: <img src="/g-pay.png" alt="" className="h-5 w-auto" /> };
    }
    if (paidCard) return { label: `${paidCard.brand} •••• ${paidCard.last4}`, icon: <CardBrandIcon brand={paidCard.brand} large /> };
    if (selectedCard) return { label: `${selectedCard.brand} •••• ${selectedCard.last4}`, icon: <CardBrandIcon brand={selectedCard.brand} large /> };
    const digits = rawCardNum;
    const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "Card";
    const last4 = digits.slice(-4);
    return { label: last4.length === 4 ? `${brand} •••• ${last4}` : t.checkoutCard, icon: <CardBrandIcon brand={brand} large /> };
  })();

  const inputCls = "w-full rounded-lg border border-[#e2e5ea] bg-white px-3 py-2.5 text-[14px] text-[#1d2129] placeholder:text-[#b0b6bf] focus:outline-none focus:border-[#7b88ff]";
  const selectCls = "w-full appearance-none rounded-lg border border-[#e2e5ea] bg-white px-3 py-2.5 text-[14px] text-[#1d2129] focus:outline-none focus:border-[#7b88ff]";
  const chevronSvg = <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const statePlaceholder = isJapan ? (lang === "ja" ? "都道府県" : "Prefecture") : t.checkoutBillingStatePh;
  const zipPlaceholder = isJapan ? "NNN-NNNN" : t.checkoutBillingZipPh;

  function renderOfferCard(offer: QuickOffer, opts?: { compact?: boolean; onPick?: () => void }) {
    const isSpecial = !!offer.isSpecial || !!offer.tag;
    const gradient = offer.gradient || (isSpecial ? "linear-gradient(135deg,#c50008,#8b0000)" : undefined);
    const compact = !!opts?.compact;
    if (compact) {
      return (
        <div
          className="overflow-hidden rounded-xl"
          style={gradient ? { background: gradient } : { background: "#fff", border: "1px solid #e5e8ec" }}
        >
          {(offer.tag || offer.discount != null) && (
            <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-1" style={{ background: gradient ? "rgba(0,0,0,0.15)" : "#f3f4f6" }}>
              {offer.tag && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{offer.tag}</span>
              )}
              {offer.discount != null && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: gradient ? "rgba(255,255,255,0.25)" : "#B40206" }}>{t.storeOff(offer.discount)}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={offer.art || "/coin.png"} alt="" className="h-8 w-8 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] font-extrabold ${gradient ? "text-white" : "text-[#1d2129]"}`}>{t.storeCoins(offer.coins)}</p>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: gradient ? "rgba(255,255,255,0.2)" : "#fef3c7" }}>
                <span className={`text-[10px] font-semibold ${gradient ? "text-white" : "text-[#92400e]"}`}>+</span>
                <PointsLogoIcon size={11} />
                <span className={`text-[10px] font-semibold ${gradient ? "text-white" : "text-[#92400e]"}`}>{t.storeFreePoints(offer.freePoints)}</span>
              </div>
            </div>
            <span className={`text-[14px] font-extrabold ${gradient ? "text-white" : "text-[#1d2129]"}`}>¥{offer.jpy.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={opts?.onPick}
        className="relative w-full cursor-pointer overflow-hidden rounded-xl text-left shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:scale-[0.99]"
        style={gradient ? { background: gradient } : { background: "#fff", border: "1px solid #e5e8ec" }}
      >
        {(offer.tag || offer.discount != null) && (
          <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-1" style={{ background: gradient ? "rgba(0,0,0,0.15)" : "#f3f4f6" }}>
            {offer.tag && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{offer.tag}</span>
            )}
            {offer.discount != null && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: gradient ? "rgba(255,255,255,0.25)" : "#B40206" }}>{t.storeOff(offer.discount)}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={offer.art || "/coin.png"} alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className={`text-[15px] font-extrabold ${gradient ? "text-white" : "text-[#1d2129]"}`}>{t.storeCoins(offer.coins)}</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: gradient ? "rgba(255,255,255,0.2)" : "#fef3c7" }}>
              <span className={`text-[11px] font-semibold ${gradient ? "text-white" : "text-[#92400e]"}`}>+</span>
              <PointsLogoIcon size={12} />
              <span className={`text-[11px] font-semibold ${gradient ? "text-white" : "text-[#92400e]"}`}>{t.storeFreePoints(offer.freePoints)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {offer.originalJpy != null && (
              <span className="text-[11px] line-through" style={{ color: gradient ? "rgba(255,255,255,0.55)" : "#8a9099" }}>¥{offer.originalJpy.toLocaleString()}</span>
            )}
            <span className="rounded-lg px-4 py-2 text-[13px] font-bold text-white" style={{ background: gradient ? "#f97316" : "#B40206" }}>
              ¥{offer.jpy.toLocaleString()}
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (step === "auth3ds" && pkg) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="relative mx-3 w-full max-w-sm overflow-hidden rounded-2xl bg-white">
          <button onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-bold text-[#5c626b] hover:bg-black/5">✕</button>
          <div className="border-b border-black/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-sm" style={{ background: "#1a5c3a" }} />
                <span className="text-[11px] font-bold text-[#333]">三井住友カード</span>
              </div>
              <span className="text-[22px] font-black italic" style={{ color: "#1a1f71" }}>VISA</span>
            </div>
          </div>
          <div className="px-5 pb-6 pt-4">
            <h3 className="text-[16px] font-bold text-[#1d2129]">認証コードをご入力ください</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#5c626b]">
              TRUSTHUB K.K.へ¥{pkg.jpy.toLocaleString()} JPYの決済を認証します。<br /><br />
              認証コードをa*****n@flatriver-inc.comへお送りしました。届いた認証コードをご入力いただき、「認証する」ボタンを押してください。<br />
              ※ドメイン指定受信を設定の場合は@payment.vpass.ne.jpからのメールを受信できるように設定をお願いします。
            </p>
            <div className="mt-4 text-center">
              <p className="text-[12px] text-[#5c626b]">{t.auth3dsRefCode}</p>
              <p className="text-[18px] font-black text-[#1d2129]">OTE</p>
            </div>
            <label className="mt-4 block text-[12px] font-medium text-[#5c626b]">認証コード</label>
            <input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder={t.auth3dsInputPh}
              inputMode="numeric"
              className={`mt-1 ${inputCls}`}
            />
            <button
              type="button"
              disabled={!authCodeValid}
              onClick={completeCardAuth}
              className="mt-4 w-full rounded-lg py-3 text-[15px] font-bold text-white disabled:cursor-not-allowed"
              style={{ background: authCodeValid ? "#2355c5" : "#c9ced6" }}
            >
              {t.auth3dsSubmit}
            </button>
            <button className="mt-3 block w-full text-center text-[13px] font-semibold text-[#2355c5] underline underline-offset-2">
              {t.auth3dsResend}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        className={`flex w-full flex-col rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] transition-[max-height] duration-300 ${cardMenuOpen ? "overflow-visible" : "overflow-hidden"}`}
        style={{ maxHeight: sheetMaxH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`shrink-0 px-4 pt-3 pb-2 ${cardMenuOpen ? "relative z-0" : ""}`}>
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {step === "pay" && (
                <button
                  onClick={() => { setStep("offers"); setAddOpen(false); setCardMenuOpen(false); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#B40206] hover:bg-black/5"
                  aria-label={t.backAria}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              <h3 className="text-[15px] font-bold text-[#1d2129]">{t.quickPurchaseTitle}</h3>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <div className={`min-h-0 flex-1 px-4 pb-5 ${cardMenuOpen ? "overflow-visible" : "no-scrollbar overflow-y-auto"}`}>
          {step === "success" && pkg ? (
            <div className="pb-1 pt-2">
              <div className="relative mx-auto w-full max-w-sm overflow-visible">
                <div className="relative z-10 flex justify-center" style={{ marginBottom: "-40px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/coin-bag.png" alt="" style={{ width: 96, height: 96, objectFit: "contain" }} />
                </div>
                <div className="rounded-2xl border border-black/8 bg-[#f8f9fb] px-4 pb-4 pt-12">
                  <h2 className="text-center text-[16px] font-extrabold leading-snug text-[#1d2129]">
                    {t.successTitle.split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
                  </h2>
                  <p className="mt-2 mb-2.5 text-center text-[12px] font-semibold text-[#5c626b]">{t.successPurchaseDetails}</p>
                  <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-center gap-5">
                      <div className="flex items-center gap-1.5">
                        <CoinIcon size={18} />
                        <span className="text-[15px] font-extrabold text-[#1d2129]">{pkg.coins.toLocaleString()}</span>
                      </div>
                      <div className="h-5 w-px bg-black/10" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-extrabold text-[#1d2129]">+</span>
                        <PointsLogoIcon size={18} />
                        <span className="text-[15px] font-extrabold text-[#1d2129]">{t.storeFreePoints(pkg.freePoints)}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 border-t border-dashed border-black/10 pt-2">
                      <span className="flex shrink-0 items-center">{paidMethod.icon}</span>
                      <span className="text-[11px] font-semibold text-[#5c626b]">{paidMethod.label}</span>
                    </div>
                  </div>
                  <button
                    onClick={onDraw}
                    className="mt-4 w-full rounded-xl py-3.5 text-[16px] font-extrabold text-white shadow-[0_4px_14px_rgba(180,2,6,0.35)] active:scale-[0.99]"
                    style={{ background: "#B40206" }}
                  >
                    {lang === "ja" ? "ドロー" : "Draw"}
                  </button>
                  <p className="mt-2 text-center text-[9px] leading-relaxed text-[#8a9099]">{t.successBillingNote}</p>
                </div>
              </div>
            </div>
          ) : step === "offers" ? (
            <>
              {/* Initial: 2 packages. View More: full store list, ~3 visible, vertical scroll. */}
              <div
                className={`space-y-2.5 ${showMorePkgs ? "max-h-[292px] overflow-y-auto overscroll-contain pr-0.5" : ""}`}
              >
                {(showMorePkgs ? scrollOffers : featuredOffers).length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-[#8a9099]">
                    {lang === "ja" ? "利用可能なパッケージがありません" : "No packages available"}
                  </p>
                ) : (
                  (showMorePkgs ? scrollOffers : featuredOffers).map((offer) => (
                    <div key={offer.id}>{renderOfferCard(offer, { onPick: () => selectOffer(offer) })}</div>
                  ))
                )}
              </div>

              {hasMorePackages && (
                <button
                  type="button"
                  onClick={() => setShowMorePkgs((v) => !v)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 py-1.5 text-[13px] font-semibold text-[#B40206] active:opacity-70"
                >
                  {showMorePkgs ? t.viewLessPackages : t.viewMorePackages}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: showMorePkgs ? "rotate(180deg)" : undefined }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </>
          ) : pkg ? (
            <div className="pb-1">
              <div className="mb-3">{renderOfferCard(pkg, { compact: true })}</div>

              {isIntl && (
                <div className="mb-3">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutChooseCurrency}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[intlLocal.code, "JPY"].map((cur) => {
                      const selected = intlCurrency === cur;
                      return (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setIntlCurrency(cur)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2"
                          style={{ borderColor: selected ? "#16a34a" : "#e2e5ea", background: selected ? "#f0fdf4" : "white" }}
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selected ? "#16a34a" : "#c9ced6" }}>
                            {selected && <span className="h-2 w-2 rounded-full" style={{ background: "#16a34a" }} />}
                          </span>
                          <span className="text-[11px] font-bold text-[#8a9099]">{cur}</span>
                          <span className="text-[14px] font-extrabold text-[#1d2129]">{intlSymbolFor(cur)}{intlAmountFor(cur, pkg.jpy).toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ background: "#fff7ed" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0"><path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 003 19.5h18a1 1 0 00.87-1.46L13.71 3.86a1 1 0 00-1.73 0z" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <p className="text-[12px] text-[#92400e]">
                      {intlCurrency === intlLocal.code ? t.checkoutIntlWarningLocal(intlLocal.rateFromJpy.toFixed(4), intlLocal.code) : t.checkoutIntlWarningJpy}
                    </p>
                  </div>
                </div>
              )}

              <p className="mb-2 text-[12px] font-semibold text-[#5c626b]">{t.selectPaymentMethod}</p>

              {!addOpen && savedCards.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCardMenuOpen((o) => !o)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-[#e2e5ea] bg-[#fafafa] px-3 py-3 text-left active:scale-[0.99]"
                  >
                    {selectedCard && <CardBrandIcon brand={selectedCard.brand} />}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1d2129]">
                      {selectedCard ? `**** ${selectedCard.last4}` : t.checkoutCard}
                    </span>
                    {selectedCard && <span className="shrink-0 text-[12px] text-[#8a9099]">{selectedCard.expiry}</span>}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ transform: cardMenuOpen ? "rotate(180deg)" : undefined }}>
                      <path d="M6 9l6 6 6-6" stroke="#8a9099" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {cardMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 z-30 mb-1.5 overflow-hidden rounded-xl border border-[#e2e5ea] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                      {dropdownCards.map((card, i) => {
                        const selected = selectedCardIdx === i;
                        return (
                          <button
                            key={`${card.last4}-${i}`}
                            type="button"
                            onClick={() => { setSelectedCardIdx(i); setCardMenuOpen(false); }}
                            className="flex w-full items-center gap-2.5 border-b border-[#f0f1f3] px-3 py-3 text-left last:border-b-0"
                            style={{ background: selected ? "#f0fdf4" : "#fff" }}
                          >
                            <CardBrandIcon brand={card.brand} />
                            <span className="text-[13px] font-semibold text-[#1d2129]">**** {card.last4}</span>
                            <span className="text-[12px] text-[#8a9099]">{card.expiry}</span>
                            {i === 0 && (
                              <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-white" style={{ background: "#16a34a" }}>
                                {t.checkoutLastUsed}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={intlDisabled}
                  onClick={() => payWithWallet("applePay")}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-xl text-[16px] font-medium text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "#000" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                  Pay
                </button>
                <button
                  type="button"
                  disabled={intlDisabled}
                  onClick={() => payWithWallet("googlePay")}
                  className="flex h-12 items-center justify-center overflow-hidden rounded-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "#1f1f1f" }}
                  aria-label="Google Pay"
                >
                  <img src="/gpay-btn.png" alt="Google Pay" className="h-[36px] w-auto max-w-[90%] object-contain" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddOpen((o) => !o);
                  setCardMenuOpen(false);
                  if (!addOpen) setSelectedCardIdx("new");
                  else if (savedCards.length > 0) setSelectedCardIdx(0);
                }}
                className="mt-2.5 flex w-full items-center gap-3 rounded-xl border border-[#e2e5ea] bg-[#fafafa] px-3 py-3 active:scale-[0.99]"
                style={{ borderColor: addOpen ? "#16a34a" : "#e2e5ea", background: addOpen ? "#f0fdf4" : "#fafafa" }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1d2129] text-[16px] font-bold leading-none text-white">+</span>
                <span className="flex-1 text-left text-[14px] font-semibold text-[#1d2129]">{t.checkoutAddNewCardShort}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: addOpen ? "rotate(90deg)" : undefined }}>
                  <path d="M9 5l7 7-7 7" stroke="#8a9099" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {addOpen && (
                <div className="mt-3 space-y-3 rounded-xl border border-[#e2e5ea] bg-white p-3">
                  <AcceptedCardsRow label={t.checkoutAcceptedCards} flush />
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        value={cardNum}
                        onChange={(e) => handleCardNumChange(e.target.value)}
                        placeholder={t.checkoutCardNumberLabel}
                        inputMode="numeric"
                        autoComplete="cc-number"
                        maxLength={19}
                        className={`${inputCls} pr-10 ${cardNum && !cardNumValid ? "text-red-500" : ""}`}
                      />
                      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#c9ced6" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={expiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        placeholder={t.checkoutExpiryPh}
                        maxLength={5}
                        className={`${inputCls} ${expiry && !expiryValid ? "text-red-500" : ""}`}
                      />
                      <input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="CVV"
                        inputMode="numeric"
                        className={inputCls}
                      />
                    </div>
                    <input
                      value={cardName}
                      onChange={(e) => handleCardNameChange(e.target.value)}
                      placeholder={t.checkoutNameOnCardPh}
                      maxLength={30}
                      className={inputCls}
                    />
                    <p className="px-0.5 text-[11px] text-[#8a9099]">{t.checkoutNameOnCardHint}</p>
                  </div>

                  <div className="border-t border-[#e2e5ea] pt-3">
                    <p className="mb-2 text-[14px] font-semibold text-[#1d2129]">{t.checkoutBillingAddress}</p>
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={billingFirstName} onChange={(e) => setBillingFirstName(e.target.value)} placeholder={t.checkoutBillingFirstNamePh} className={inputCls} />
                        <input value={billingLastName} onChange={(e) => setBillingLastName(e.target.value)} placeholder={t.checkoutBillingLastNamePh} className={inputCls} />
                      </div>
                      <input value={billingAddress1} onChange={(e) => setBillingAddress1(e.target.value)} placeholder={t.checkoutBillingAddress1Ph} className={inputCls} />
                      <p className="flex items-start gap-1 text-[11px] text-[#5c626b]">
                        {t.checkoutBillingPOBoxNote}
                        <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8a9099" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"/></svg>
                      </p>
                      <input value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} placeholder={t.checkoutBillingAddress2Ph} className={inputCls} />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <select
                            value={country}
                            onChange={(e) => { setCountry(e.target.value); setBillingState(""); setBillingZip(""); }}
                            className={selectCls}
                          >
                            <option>Japan</option>
                            <option>United States</option>
                          </select>
                          {chevronSvg}
                        </div>
                        <input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder={t.checkoutBillingCityPh} className={inputCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <select value={billingState} onChange={(e) => setBillingState(e.target.value)} className={selectCls}>
                            <option value="">{statePlaceholder}</option>
                            {isJapan
                              ? PREFECTURES_JA.map((ja, i) => <option key={ja} value={ja}>{lang === "ja" ? ja : PREFECTURES_EN[i]}</option>)
                              : US_STATES.map((s) => <option key={s}>{s}</option>)
                            }
                          </select>
                          {chevronSvg}
                        </div>
                        <input value={billingZip} onChange={(e) => handleBillingZipChange(e.target.value)} placeholder={zipPlaceholder} className={inputCls} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={payDisabled}
                onClick={beginPay}
                className="mt-4 w-full rounded-xl py-3.5 text-[16px] font-bold text-white disabled:cursor-not-allowed"
                style={{ background: payDisabled ? "#c9ced6" : "#B40206" }}
              >
                {t.checkoutPayNowBtn} {isIntl && intlCurrency ? `${intlSymbolFor(intlCurrency)}${intlAmountFor(intlCurrency, pkg.jpy).toLocaleString()}` : `¥${pkg.jpy.toLocaleString()}`}
              </button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8a9099]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {t.securePayment}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
