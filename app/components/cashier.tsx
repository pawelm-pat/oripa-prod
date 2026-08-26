"use client";

/**
 * Cashier V1 — exact port of HeorhiiPovstianyi_repo PurchaseFlow cashierVariant="v1".
 */

import { useEffect, useMemo, useState, createContext, useContext } from "react";
import type { Lang, OripaItem } from "../lib/types";
import { STR } from "../lib/i18n";
import type { LegalDocKey } from "../data/legal";
import { PREFECTURES_EN, PREFECTURES_JA, US_STATES } from "../data/prizes";
import { RECOMMENDED_ORIPA, LIST_ORIPA } from "../data/lobby";
import type { PointPackage } from "./store-page";
import { STORE_V3_PLAIN_PACKAGES } from "./store-page";

export const CashierLegalContext = createContext<(doc: LegalDocKey) => void>(() => {});

function CoinIcon({ size = 16 }: { size?: number }) {
  return <img src="/coin.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />;
}

function StoreCoinIcon({ size = 32 }: { size?: number }) {
  return <img src="/coin.png" alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

type ExpressWallet = "applePay" | "googlePay" | "payPay" | "rakutenPay" | "melPay" | "famiPay";
type PayMethod = "card" | ExpressWallet;
const JP_EXPRESS_WALLETS: ExpressWallet[] = ["payPay", "rakutenPay", "melPay", "famiPay"];

function GoogleGMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.64-.23-2.43H12v4.6h6.46a5.52 5.52 0 01-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.93l-3.88-3c-1.08.73-2.47 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0012 24z" />
      <path fill="#FBBC05" d="M5.27 14.27A7.2 7.2 0 014.9 12c0-.79.13-1.55.36-2.27V6.64H1.27A12 12 0 000 12c0 1.94.46 3.77 1.27 5.36l4-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 001.27 6.64l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function ApplePayMark({ size = 18, fill = "white" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PayPayMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#FF0033" />
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Arial, sans-serif">P</text>
    </svg>
  );
}

function RakutenPayMark() {
  return (
    <svg width="22" height="18" viewBox="0 0 28 22" aria-hidden>
      <rect width="28" height="22" rx="4" fill="#BF0000" />
      <text x="14" y="15.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif">R Pay</text>
    </svg>
  );
}

function MelPayMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#E60012" />
      <path d="M5 17V8.2l3.6 5.1L12.2 8.2V17h2.4V7H12L8.6 12.2 5.2 7H2.6v10H5z" fill="white" />
    </svg>
  );
}

function FamiPayMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle cx="9" cy="12" r="8" fill="#00A040" />
      <circle cx="15" cy="12" r="8" fill="#00A0E9" />
      <circle cx="12" cy="12" r="5.2" fill="white" />
      <text x="12" y="15" textAnchor="middle" fill="#00A040" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif">F</text>
    </svg>
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
export type SavedCard = { last4: string; expiry: string; brand: string; name: string; billingAddress?: BillingAddress };

const BILLING_ADDRESS_SUGGESTIONS = [
  { address1: "1-1 Marunouchi", country: "Japan", city: "Chiyoda-ku", state: "東京都", zip: "100-0005" },
  { address1: "2-21-1 Shibuya", country: "Japan", city: "Shibuya", state: "東京都", zip: "150-0002" },
  { address1: "3-1-1 Minami-Aoyama", country: "Japan", city: "Minato-ku", state: "東京都", zip: "107-0062" },
  { address1: "1-1 Umeda", country: "Japan", city: "Kita-ku", state: "大阪府", zip: "530-0001" },
  { address1: "Karasuma-dori", country: "Japan", city: "Nakagyo-ku", state: "京都府", zip: "604-8091" },
  { address1: "1 Market St", country: "United States", city: "San Francisco", state: "California", zip: "94105" },
  { address1: "350 Fifth Ave", country: "United States", city: "New York", state: "New York", zip: "10118" },
];
type PurchaseStep = "checkout" | "auth3ds" | "success" | "failed";
type FailureReason = "insufficientFunds" | "bankDecline";

/** Demo-only: these card endings always decline after 3DS. */
const DECLINED_CARD_LAST4_INSUFFICIENT_FUNDS = "9999";
const DECLINED_CARD_LAST4_BANK_DECLINE = "8888";

export function PurchaseFlow({
  pkg,
  lang,
  onComplete,
  onClose,
  onDrawItem,
  savedCards,
  onSaveCard,
  onDeleteCard,
  onRequireKyc,
  enableCurrencyCheckout = false,
  onSelectPackage,
}: {
  pkg: PointPackage;
  lang: Lang;
  onComplete: (pts: number) => void;
  onClose: () => void;
  onDrawItem?: (item: OripaItem) => void;
  savedCards?: SavedCard[];
  onSaveCard?: (card: SavedCard) => void;
  onDeleteCard?: (idx: number) => void;
  onRequireKyc?: () => boolean;
  /** INR/JPY currency selector (demo: john.inr@gmail.com). */
  enableCurrencyCheckout?: boolean;
  onSelectPackage?: (pkg: PointPackage) => void;
}) {
  const t = STR[lang];
  const openLegal = useContext(CashierLegalContext);
  const beginPayment = (go: () => void) => {
    if (onRequireKyc && !onRequireKyc()) return;
    go();
  };
  const [step, setStep] = useState<PurchaseStep>("checkout");
  const [failureReason, setFailureReason] = useState<FailureReason | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [checkoutCurrency, setCheckoutCurrency] = useState<"INR" | "JPY">(
    enableCurrencyCheckout ? "INR" : "JPY",
  );
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | "new">((savedCards && savedCards.length > 0) ? 0 : "new");
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [country, setCountry] = useState("Japan");
  const [authCode, setAuthCode] = useState("");
  const [showMyCards, setShowMyCards] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingEditMode, setBillingEditMode] = useState(false);
  const [billingAddressMode, setBillingAddressMode] = useState<"search" | "fields">("search");
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [billingSearchDebounced, setBillingSearchDebounced] = useState("");
  const [activeOripaIdx, setActiveOripaIdx] = useState(0);
  // V1 cashier: main checkout vs dedicated Add Card Details page
  const [v1Page, setV1Page] = useState<"main" | "addCard">("main");
  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(id);
  }, [toastMsg]);
  useEffect(() => {
    if (selectedCardIdx === "new") {
      // Pre-populate from the most recent saved card's billing address
      const lastAddr = savedCards?.find(c => c.billingAddress)?.billingAddress;
      if (lastAddr) {
        setBillingFirstName(lastAddr.firstName);
        setBillingLastName(lastAddr.lastName);
        setBillingAddress1(lastAddr.address1);
        setBillingAddress2(lastAddr.address2);
        setCountry(lastAddr.country);
        setBillingCity(lastAddr.city);
        setBillingState(lastAddr.state);
        setBillingZip(lastAddr.zip);
      } else {
        setBillingFirstName(""); setBillingLastName(""); setBillingAddress1("");
        setBillingAddress2(""); setBillingCity(""); setBillingState(""); setBillingZip("");
      }
      setBillingEditMode(true);
      setBillingAddressMode("search");
      setBillingSearchQuery("");
    }
  }, [selectedCardIdx]);
  useEffect(() => {
    const timer = window.setTimeout(() => setBillingSearchDebounced(billingSearchQuery.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [billingSearchQuery]);
  const billingSuggestions = useMemo(() => {
    if (billingSearchDebounced.length < 2) return [];
    const q = billingSearchDebounced.toLowerCase();
    return BILLING_ADDRESS_SUGGESTIONS.filter((item) =>
      `${item.zip} ${item.state} ${item.city} ${item.address1} ${item.country}`.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [billingSearchDebounced]);
  useEffect(() => {
    setPayMethod("card");
  }, []);
  useEffect(() => {
    setV1Page("main");
    if (savedCards && savedCards.length > 0) {
      setSelectedCardIdx(0);
      setPayMethod("card");
    } else {
      setSelectedCardIdx("new");
    }
  }, [savedCards?.length]);

  const inputCls = "w-full rounded-lg border border-[#e2e5ea] bg-white px-3 py-2.5 text-[14px] text-[#1d2129] placeholder:text-[#b0b6bf] focus:outline-none focus:border-[#7b88ff]";
  const labelCls = "block mb-1 mt-3 text-[12px] font-medium text-[#5c626b]";

  const rawCardNum = cardNum.replace(/\s/g, "");
  const cardNumValid = rawCardNum.length >= 14 && rawCardNum.length <= 16;
  function handleCardNumChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    setCardNum(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
  }
  function handleCardNameChange(value: string) {
    setCardName(value.replace(/\d/g, "").slice(0, 30));
  }
  function handleExpiryChange(value: string) {
    const raw = value.replace(/\D/g, "").slice(0, 4);
    setExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw);
  }
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
  const authCodeDigits = authCode.replace(/\D/g, "");
  const authCodeValid = authCodeDigits.length >= 4;
  const isNewCard = payMethod === "card" && (!savedCards || savedCards.length === 0 || selectedCardIdx === "new");
  // Which card's last 4 digits are about to be charged — used to trigger the demo
  // decline scenario below (saved card or digits typed into the new-card form).
  const activeCardLast4 = payMethod !== "card" ? null : (typeof selectedCardIdx === "number" ? (savedCards?.[selectedCardIdx]?.last4 ?? null) : (rawCardNum.slice(-4) || null));
  const pendingFailureReason: FailureReason | null =
    activeCardLast4 === DECLINED_CARD_LAST4_INSUFFICIENT_FUNDS ? "insufficientFunds" :
    activeCardLast4 === DECLINED_CARD_LAST4_BANK_DECLINE ? "bankDecline" :
    null;
  // Lower-priced packages to suggest after an insufficient-funds decline: the (up
  // to) two packages priced just below the one that failed.
  const lowerPricedPackages = [...STORE_V3_PLAIN_PACKAGES]
    .filter((p) => p.jpy < pkg.jpy)
    .sort((a, b) => b.jpy - a.jpy)
    .slice(0, 2);
  // Alternate payment methods to suggest after a bank decline: any two methods
  // other than the one that just failed.
  const alternatePaymentMethods: ("card" | "applePay" | "googlePay")[] =
    payMethod === "applePay" ? ["card", "googlePay"] :
    payMethod === "googlePay" ? ["card", "applePay"] :
    ["applePay", "googlePay"];
  const isJapan = country === "Japan";
  const billingZipValid = isJapan ? /^\d{3}-\d{4}$/.test(billingZip) : /^\d{5}$/.test(billingZip.trim());
  const billingFilled = billingFirstName.trim().length > 0 && billingLastName.trim().length > 0 && billingAddress1.trim().length > 0 && billingCity.trim().length > 0 && billingState.length > 0 && billingZipValid;
  const payDisabled = isNewCard && (!cardNumValid || !expiryValid || !billingFilled);
  const statePlaceholder = isJapan ? (lang === "ja" ? "都道府県" : "Prefecture") : t.checkoutBillingStatePh;
  const zipPlaceholder = isJapan ? "NNN-NNNN" : t.checkoutBillingZipPh;
  function handleBillingCountryChange(c: string) {
    setCountry(c);
    setBillingState("");
    setBillingZip("");
    setBillingEditMode(true);
  }
  function handleBillingZipChange(v: string) {
    if (isJapan) {
      const digits = v.replace(/\D/g, "").slice(0, 7);
      setBillingZip(digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits);
    } else {
      setBillingZip(v.replace(/\D/g, "").slice(0, 5));
    }
  }
  const selectCls = "w-full appearance-none rounded-lg border border-[#e2e5ea] bg-white px-3 py-2.5 text-[14px] text-[#1d2129] focus:outline-none focus:border-[#7b88ff]";
  const chevronSvg = <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

  const useInr = enableCurrencyCheckout && checkoutCurrency === "INR";
  const inrWalletsOnly = enableCurrencyCheckout && checkoutCurrency === "INR";
  const INR_PER_JPY = 0.6103;
  const INR_PER_JPY_LABEL = "0.6103";
  const inrAmount = Math.round(pkg.jpy * INR_PER_JPY);
  const formatInr = (n: number) => n.toLocaleString("en-IN");
  const priceLabel = useInr
    ? `${formatInr(inrAmount)} INR`
    : `${pkg.jpy.toLocaleString()} JPY`;
  const priceSymbolAmount = useInr
    ? `₹${formatInr(inrAmount)}`
    : `¥${pkg.jpy.toLocaleString()}`;
  const originalPriceLabel = pkg.originalJpy
    ? useInr
      ? `${formatInr(Math.round(pkg.originalJpy * INR_PER_JPY))} INR`
      : `${pkg.originalJpy.toLocaleString()} JPY`
    : null;
  const currencySelectGreen = "#16a34a";

  const renderBillingForm = () => (
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
          <select value={country} onChange={(e) => handleBillingCountryChange(e.target.value)} className={selectCls}>
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
              : US_STATES.map(s => <option key={s}>{s}</option>)
            }
          </select>
          {chevronSvg}
        </div>
        <input value={billingZip} onChange={(e) => handleBillingZipChange(e.target.value)} placeholder={zipPlaceholder} className={inputCls} />
      </div>
    </div>
  );

  if (step === "auth3ds") {
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
              onClick={() => {
                if (pendingFailureReason) {
                  setFailureReason(pendingFailureReason);
                  setStep("failed");
                } else {
                  setStep("success");
                }
              }}
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

  if (step === "failed") {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white px-5 pb-5 pt-6">
          <button onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-bold text-[#5c626b] hover:bg-black/5">✕</button>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#fdecea" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#c0392b" strokeWidth="2" /><path d="M15 9l-6 6M9 9l6 6" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <h2 className="mt-3 text-center text-[17px] font-extrabold text-[#1d2129]">{t.failedTitle}</h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5c626b]">
            {failureReason === "bankDecline" ? t.failedBankDecline : t.failedInsufficientFunds}
          </p>
          {failureReason === "insufficientFunds" && lowerPricedPackages.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#8a9099]">{t.failedTryLower}</p>
              <div className="flex flex-col gap-2">
                {lowerPricedPackages.map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    onClick={() => {
                      onSelectPackage?.(lp);
                      setAuthCode("");
                      setFailureReason(null);
                      setStep("checkout");
                    }}
                    className="flex items-center gap-2.5 rounded-xl border border-[#e5e8ec] px-3 py-2.5 text-left active:scale-[0.99] hover:border-[#c0392b]"
                  >
                    <StoreCoinIcon />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold text-[#1d2129]">{t.storeCoins(lp.coins)}</p>
                    </div>
                    <span className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-bold text-white" style={{ background: "#B40206" }}>¥{lp.jpy.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {failureReason === "bankDecline" && (
            <div className="mt-4">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#8a9099]">{t.failedTryAlternateMethod}</p>
              <div className="flex flex-col gap-2">
                {alternatePaymentMethods.map((method) => {
                  const retry = () => {
                    setAuthCode("");
                    setFailureReason(null);
                    if (method === "card") {
                      setPayMethod("card");
                      setStep("checkout");
                      return;
                    }
                    beginPayment(() => { setPayMethod(method); setStep("success"); });
                  };
                  if (method === "card") {
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={retry}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#e2e5ea] bg-white text-[15px] font-bold text-[#1d2129] active:scale-[0.98]"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#1d2129" strokeWidth="2" /><path d="M3 10h18" stroke="#1d2129" strokeWidth="2" /></svg>
                        {t.checkoutCard}
                      </button>
                    );
                  }
                  if (method === "applePay") {
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={retry}
                        className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-[16px] font-medium text-white active:scale-[0.98]"
                        style={{ background: "#000" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                        {t.checkoutApplePay}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={retry}
                      className="flex h-12 w-full items-center justify-center overflow-hidden rounded-xl active:scale-[0.98]"
                      style={{ background: "#1f1f1f" }}
                      aria-label="Google Pay"
                    >
                      <img src="/gpay-btn.png" alt="Google Pay" className="h-[36px] w-auto max-w-[90%] object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#1d2129]"
          >
            {t.failedClose}
          </button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    const isSubscription = !!pkg.subscriptionName;
    const successHeading = isSubscription ? t.storeSuccessSubscription : t.successTitle;
    const paidMethod = (() => {
      if (payMethod === "applePay") {
        return { label: t.checkoutApplePay, icon: <ApplePayMark fill="#1d2129" /> };
      }
      if (payMethod === "googlePay") {
        return { label: "Google Pay", icon: <GoogleGMark /> };
      }
      if (payMethod === "payPay") {
        return { label: "PayPay", icon: <PayPayMark /> };
      }
      if (payMethod === "rakutenPay") {
        return { label: "Rakuten Pay", icon: <RakutenPayMark /> };
      }
      if (payMethod === "melPay") {
        return { label: "MelPay", icon: <MelPayMark /> };
      }
      if (payMethod === "famiPay") {
        return { label: "FamiPay", icon: <FamiPayMark /> };
      }
      if (typeof selectedCardIdx === "number" && savedCards?.[selectedCardIdx]) {
        const c = savedCards[selectedCardIdx];
        return { label: `${c.brand} •••• ${c.last4}`, icon: <CardBrandIcon brand={c.brand} large /> };
      }
      const digits = cardNum.replace(/\s/g, "");
      const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : digits.startsWith("3") ? "Amex" : "Card";
      const last4 = digits.slice(-4);
      return { label: last4.length === 4 ? `${brand} •••• ${last4}` : t.checkoutCard, icon: <CardBrandIcon brand={brand} large /> };
    })();
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
        <div className="relative w-full max-w-sm overflow-visible">
          {/* Floating treasure bag illustration */}
          <div className="relative z-10 flex justify-center" style={{ marginBottom: "-48px" }}>
            <img src="/coin-bag.png" alt="Coin bag" style={{ width: 112, height: 112, objectFit: "contain" }} />
          </div>
          {/* Card */}
          <div className="rounded-2xl bg-white px-5 pb-4 pt-14">
            <h2 className="text-center text-[17px] font-extrabold leading-snug text-[#1d2129]">
              {successHeading.split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
            </h2>
            <p className="mt-2 mb-2.5 text-center text-[12px] font-semibold text-[#5c626b]">{t.successPurchaseDetails}</p>
            {isSubscription ? (
              /* Subscription success detail */
              <div className="rounded-xl border border-black/10 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[18px]">🎴</span>
                  <span className="text-[15px] font-extrabold text-[#1d2129]">{pkg.subscriptionName}</span>
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#16a34a" }}>{t.storeSubscribedActive}</span>
                </div>
                {t.storeCollectorsPassPerks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1.5">
                    <span className="text-[13px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                    <span className="text-[12px] text-[#5c626b]">{perk}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Coins + points + payment method */
              <div className="rounded-xl border border-black/10 px-3 py-2.5">
                <div className="flex items-center justify-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <CoinIcon size={18} />
                    <span className="text-[15px] font-extrabold text-[#1d2129]">{pkg.coins.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 border-t border-dashed border-black/10 pt-2">
                  <span className="flex shrink-0 items-center">{paidMethod.icon}</span>
                  <span className="text-[11px] font-semibold text-[#5c626b]">{paidMethod.label}</span>
                </div>
              </div>
            )}
            {/* Oripa mini tiles carousel */}
            {!isSubscription && (() => {
              const oripaItems = [...RECOMMENDED_ORIPA, ...LIST_ORIPA];
              const current = oripaItems[activeOripaIdx];
              const total = oripaItems.length;
              return (
                <div className="mt-3">
                  <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#8a9099]">Play Now</p>
                  <div className="flex items-center gap-2">
                    {/* Left arrow */}
                    <button
                      onClick={() => setActiveOripaIdx((i) => (i - 1 + total) % total)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white shadow-sm active:scale-90"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#1d2129" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    {/* Tile */}
                    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-black/[0.07] bg-[#f8f9fa]">
                      {current.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={current.image} alt="" className="aspect-[2.2/1] w-full object-cover" />
                      ) : (
                        <div className="aspect-[2.2/1] w-full bg-[#e5e7eb]" />
                      )}
                      <div className="px-2.5 py-2">
                        <p className="truncate text-[12px] font-bold leading-tight text-[#1d2129]">{current.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[10px] text-[#5c626b]">
                            {t.storeRemainingOf(current.remaining, current.total)}
                            <span className="mx-1.5 text-[#d1d5db]">|</span>
                            <span className="font-semibold text-[#B40206]">{t.remainingTimeLabel} {t.minUnit(current.endsIn)}</span>
                          </p>
                          <button
                            onClick={() => { onComplete(pkg.coins); onDrawItem?.(current); }}
                            className="shrink-0 rounded-lg px-4 py-2 text-[12px] font-extrabold text-white"
                            style={{ background: "#B40206" }}
                          >
                            Draw
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Right arrow */}
                    <button
                      onClick={() => setActiveOripaIdx((i) => (i + 1) % total)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white shadow-sm active:scale-90"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="#1d2129" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                  {/* Dot indicators */}
                  <div className="mt-1.5 flex justify-center gap-1">
                    {oripaItems.map((_, i) => (
                      <button key={i} onClick={() => setActiveOripaIdx(i)} className="rounded-full transition-all" style={{ width: i === activeOripaIdx ? 14 : 5, height: 5, background: i === activeOripaIdx ? "#B40206" : "#d1d5db" }} />
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Close button */}
            <button
              onClick={() => { onComplete(pkg.coins); }}
              className="mt-2.5 w-full rounded-xl border border-black/20 py-2.5 text-[14px] font-bold text-[#1d2129]"
            >
              {t.successClose}
            </button>
            {/* Billing note */}
            <p className="mt-2 text-center text-[9px] leading-relaxed text-[#8a9099]">{t.successBillingNote}</p>
          </div>
        </div>
      </div>
    );
  }

  if (showMyCards) {
    return (
      <div className="absolute inset-0 z-50">
        {/* Scrollable cards list */}
        <div className="h-full overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex items-center border-b border-black/10 bg-white px-4 py-3">
            <button onClick={() => setShowMyCards(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b] hover:bg-black/5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#e60012" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold text-[#1d2129]">My Cards</span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-4 pb-32">
            {(savedCards ?? []).map((card, i) => (
              <div
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-xl border p-4"
                style={{ borderColor: selectedCardIdx === i ? "#1d2129" : "#e2e5ea", background: selectedCardIdx === i ? "#f8f9fa" : "white" }}
                onClick={() => setSelectedCardIdx(i)}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selectedCardIdx === i ? "#1d2129" : "#c9ced6" }}>
                  {selectedCardIdx === i && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
                </span>
                <CardBrandIcon brand={card.brand} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#1d2129]">{card.brand} •••• {card.last4}</p>
                  <p className="text-[12px] text-[#8a9099]">{card.expiry}</p>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmIdx(i); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#B40206" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 11v6M14 11v6" stroke="#B40206" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Sticky Pay button */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-black/10 bg-white px-4 py-4">
          <button
            onClick={() => { if (onRequireKyc && !onRequireKyc()) return; setShowMyCards(false); setStep("auth3ds"); }}
            className="w-full rounded-xl py-3.5 text-[16px] font-bold text-white"
            style={{ background: "#c0392b" }}
          >
            Pay Now {priceSymbolAmount}
          </button>
        </div>
        {/* Delete confirmation modal */}
        {deleteConfirmIdx !== null && savedCards && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
              <button
                onClick={() => setDeleteConfirmIdx(null)}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#5c626b] hover:bg-black/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
              <div className="px-6 pb-6 pt-5">
                <h3 className="text-[18px] font-bold text-[#1d2129]">Delete Card?</h3>
                <div className="my-3 h-px bg-black/10" />
                <p className="text-[14px] leading-relaxed text-[#5c626b]">
                  Are you sure you want to remove {savedCards[deleteConfirmIdx]?.brand} •••• {savedCards[deleteConfirmIdx]?.last4}?
                </p>
                <button
                  onClick={() => {
                    const newLen = (savedCards?.length ?? 0) - 1;
                    onDeleteCard?.(deleteConfirmIdx);
                    setToastMsg("Card removed successfully");
                    setDeleteConfirmIdx(null);
                    if (selectedCardIdx === deleteConfirmIdx) {
                      setSelectedCardIdx(newLen > 0 ? 0 : "new");
                    } else if (typeof selectedCardIdx === "number" && selectedCardIdx > deleteConfirmIdx) {
                      setSelectedCardIdx(selectedCardIdx - 1);
                    }
                    if (newLen === 0) setShowMyCards(false);
                  }}
                  className="mt-5 w-full rounded-xl py-3 text-[15px] font-bold text-white"
                  style={{ background: "#c0392b" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirmIdx(null)}
                  className="mt-2.5 w-full rounded-xl border border-[#e2e5ea] py-3 text-[15px] font-semibold text-[#1d2129]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Toast */}
        {toastMsg && (
          <div className="pointer-events-none absolute bottom-24 left-4 right-4 flex justify-center">
            <div className="rounded-full bg-[#1d2129] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">
              {toastMsg}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Cashier V1 ── */
  {
    const cards = savedCards ?? [];
    const hasCards = cards.length > 0;
    const visibleCardIndexes = (() => {
      const idxs = cards.slice(0, 3).map((_, i) => i);
      if (typeof selectedCardIdx === "number" && selectedCardIdx >= 3 && selectedCardIdx < cards.length && !idxs.includes(selectedCardIdx)) {
        idxs.push(selectedCardIdx);
      }
      return idxs;
    })();
    const v1SelectGreen = "#16a34a";
    const v1Cta = "#c0392b";
    const v1CardSelected = payMethod === "card" && typeof selectedCardIdx === "number";
    const v1NewCardReady = cardNumValid && expiryValid && billingFilled;
    const v1MainPayDisabled = !v1CardSelected;

    function v1SaveNewCardAndAuth() {
      if (onRequireKyc && !onRequireKyc()) return;
      if (cardNum && onSaveCard) {
        const digits = cardNum.replace(/\s/g, "");
        const last4 = digits.slice(-4) || "0000";
        const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : digits.startsWith("3") ? "Amex" : "Card";
        onSaveCard({ last4, expiry, brand, name: cardName, billingAddress: { firstName: billingFirstName, lastName: billingLastName, address1: billingAddress1, address2: billingAddress2, country, city: billingCity, state: billingState, zip: billingZip } });
        setSelectedCardIdx(0);
        setPayMethod("card");
        setCardNum(""); setExpiry(""); setCvc(""); setCardName("");
      }
      setV1Page("main");
      setStep("auth3ds");
    }

    function v1PayWithSelectedCard() {
      if (onRequireKyc && !onRequireKyc()) return;
      setPayMethod("card");
      setV1Page("main");
      setStep("auth3ds");
    }

    function openV1AddCard() {
      setSelectedCardIdx("new");
      setPayMethod("card");
      setBillingAddressMode("search");
      setBillingSearchQuery("");
      setBillingEditMode(true);
      setV1Page("addCard");
    }

    const renderV1BillingFields = () => (
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutBillingFirstNamePh}</p>
            <input value={billingFirstName} onChange={(e) => setBillingFirstName(e.target.value)} placeholder={t.checkoutBillingFirstNamePh} className={`${inputCls} bg-[#f5f6f8]`} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutBillingLastNamePh}</p>
            <input value={billingLastName} onChange={(e) => setBillingLastName(e.target.value)} placeholder={t.checkoutBillingLastNamePh} className={`${inputCls} bg-[#f5f6f8]`} />
          </div>
        </div>
        {billingAddressMode === "search" ? (
          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b6bf]">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="M16 16.5 21 21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </span>
              <input
                value={billingSearchQuery}
                onChange={(e) => setBillingSearchQuery(e.target.value)}
                placeholder={t.checkoutFindAddressPh}
                className={`${inputCls} bg-[#f5f6f8] pl-8`}
              />
            </div>
            {billingSuggestions.length > 0 && (
              <ul className="mt-1 overflow-hidden rounded-lg border border-[#e2e5ea] bg-white">
                {billingSuggestions.map((item) => (
                  <li key={`${item.zip}-${item.address1}`} className="border-b border-[#e2e5ea] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCountry(item.country);
                        setBillingAddress1(item.address1);
                        setBillingCity(item.city);
                        setBillingState(item.state);
                        setBillingZip(item.zip);
                        setBillingSearchQuery("");
                        setBillingAddressMode("fields");
                      }}
                      className="w-full px-3 py-2.5 text-left text-[14px] text-[#1d2129]"
                    >
                      {item.zip} {item.state} {item.city}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                if (billingSearchQuery.trim()) setBillingAddress1(billingSearchQuery.trim());
                setBillingAddressMode("fields");
              }}
              className="mt-2 text-[12px] font-medium text-[#5c626b] underline underline-offset-2"
            >
              {t.enterManually}
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutAddressLine1Label}</p>
              <input value={billingAddress1} onChange={(e) => setBillingAddress1(e.target.value)} placeholder={t.checkoutBillingAddress1StreetPh} className={`${inputCls} bg-[#f5f6f8]`} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">
                {t.checkoutAddressLine2Label} <span className="font-medium normal-case tracking-normal text-[#b0b6bf]">{t.checkoutOptional}</span>
              </p>
              <input value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} placeholder={t.checkoutBillingAddress2AptPh} className={`${inputCls} bg-[#f5f6f8]`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutCountryFieldLabel}</p>
                <div className="relative">
                  <select value={country} onChange={(e) => handleBillingCountryChange(e.target.value)} className={`${selectCls} bg-[#f5f6f8]`}>
                    <option>Japan</option>
                    <option>United States</option>
                  </select>
                  {chevronSvg}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutBillingStateRegionPh}</p>
                <div className="relative">
                  <select
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    className={`${selectCls} bg-[#f5f6f8]`}
                    style={{ color: billingState ? "#1d2129" : "#b0b6bf" }}
                  >
                    <option value="">{statePlaceholder}</option>
                    {isJapan
                      ? PREFECTURES_JA.map((ja, i) => <option key={ja} value={ja} style={{ color: "#1d2129" }}>{lang === "ja" ? ja : PREFECTURES_EN[i]}</option>)
                      : US_STATES.map(s => <option key={s} style={{ color: "#1d2129" }}>{s}</option>)
                    }
                  </select>
                  {chevronSvg}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutCityLabel}</p>
                <input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder={t.checkoutBillingCityPh.replace("*", "")} className={`${inputCls} bg-[#f5f6f8]`} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutZipPostalLabel}</p>
                <input value={billingZip} onChange={(e) => handleBillingZipChange(e.target.value)} placeholder={zipPlaceholder} className={`${inputCls} bg-[#f5f6f8]`} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setBillingSearchQuery(""); setBillingAddressMode("search"); }}
              className="self-start text-[12px] font-medium text-[#5c626b] underline underline-offset-2"
            >
              {t.checkoutSearchDifferentAddress}
            </button>
          </>
        )}
      </div>
    );

    const payWithWallet = (method: ExpressWallet) => beginPayment(() => { setPayMethod(method); setStep("success"); });
    const walletPrimaryCls = "flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-medium text-white active:scale-[0.98]";
    const walletSecondaryCls = "flex h-12 items-center justify-center gap-1.5 rounded-xl border border-[#e2e5ea] bg-white px-1.5 text-[12px] font-bold text-[#1d2129] active:scale-[0.98]";
    const googlePayBtn = (
      <button type="button" onClick={() => payWithWallet("googlePay")} className={walletPrimaryCls} style={{ background: "#000" }} aria-label="Google Pay">
        <GoogleGMark />
        Pay
      </button>
    );
    const applePayBtn = (
      <button type="button" onClick={() => payWithWallet("applePay")} className={walletPrimaryCls} style={{ background: "#000" }} aria-label="Apple Pay">
        <ApplePayMark />
        Pay
      </button>
    );
    const payPayBtn = (
      <button type="button" onClick={() => payWithWallet("payPay")} className={walletSecondaryCls} aria-label="PayPay">
        <PayPayMark />
        Paypay
      </button>
    );
    const rakutenPayBtn = (
      <button type="button" onClick={() => payWithWallet("rakutenPay")} className={walletSecondaryCls} aria-label="Rakuten Pay">
        <RakutenPayMark />
        Rakuten Pay
      </button>
    );
    const melPayBtn = (
      <button type="button" onClick={() => payWithWallet("melPay")} className={walletSecondaryCls} aria-label="MelPay">
        <MelPayMark />
        MelPay
      </button>
    );
    const famiPayBtn = (
      <button type="button" onClick={() => payWithWallet("famiPay")} className={walletSecondaryCls} aria-label="FamiPay">
        <FamiPayMark />
        FamiPay
      </button>
    );

    const v1ExpressGrid = (
      <div className="grid grid-cols-2 gap-2.5">
        {googlePayBtn}
        {applePayBtn}
        {!inrWalletsOnly && (
          <>
            {payPayBtn}
            {rakutenPayBtn}
            {melPayBtn}
            {famiPayBtn}
          </>
        )}
      </div>
    );

    const v1PackageSummary = (
      <div className="mb-4 overflow-hidden rounded-xl border bg-white" style={{ borderColor: (pkg.firstTimeOffer || pkg.popularOffer) ? "#B40206" : "#e5e8ec" }}>
        {(pkg.firstTimeOffer || pkg.popularOffer) && (
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5" style={{ background: "rgba(230,0,18,0.07)" }}>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{pkg.popularOffer ? t.storePopularOffer : t.storeFirstTimeOffer}</span>
            {pkg.discount && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{t.storeOff(pkg.discount)}</span>}
          </div>
        )}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {pkg.subscriptionName ? (
            <>
              <span className="text-[28px]">🎴</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-[#1d2129]">{pkg.subscriptionName}</p>
                <p className="text-[11px] text-[#6b7280]">{t.storeCollectorsPassTagline}</p>
              </div>
            </>
          ) : (
            <>
              <StoreCoinIcon />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-[#1d2129]">{t.storeCoins(pkg.coins)}</p>
              </div>
            </>
          )}
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {originalPriceLabel && <span className="text-[11px] text-[#8a9099] line-through">{originalPriceLabel}</span>}
            <span className="text-[15px] font-extrabold text-[#1d2129]">{priceLabel}</span>
          </div>
        </div>
      </div>
    );

    const v1Toast = toastMsg && (
      <div className="pointer-events-none absolute bottom-24 left-4 right-4 z-30 flex justify-center">
        <div className="rounded-full bg-[#1d2129] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">{toastMsg}</div>
      </div>
    );

    /* V1 Add Card Details page */
    if (v1Page === "addCard") {
      return (
        <div className="absolute inset-0 z-50 flex flex-col bg-white">
          <div className="sticky top-0 z-10 flex items-center border-b border-black/10 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setV1Page("main");
                if (hasCards) { setSelectedCardIdx(0); setPayMethod("card"); }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f1f3] text-[#5c626b] hover:bg-black/5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#5c626b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold text-[#1d2129]">{t.checkoutAddCardDetails}</span>
            <div className="ml-auto h-8 w-8" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4" style={{ background: "#f5f6f8" }}>
            <div className="mb-3 rounded-2xl border border-[#e2e5ea] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg width="18" height="14" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill={v1SelectGreen} /><rect x="2" y="8" width="32" height="4" fill="white" opacity="0.85" /><rect x="2" y="16" width="8" height="4" rx="1" fill="white" opacity="0.85" /></svg>
                <p className="text-[15px] font-bold text-[#1d2129]">{t.checkoutCardInfo}</p>
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutCardNumberLabel}</p>
              <div className="relative mb-3">
                <input
                  value={cardNum}
                  onChange={(e) => handleCardNumChange(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  maxLength={19}
                  className={`${inputCls} bg-[#f5f6f8] pr-10 ${cardNum && !cardNumValid ? "text-red-500" : ""}`}
                />
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#c9ced6" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutExpiryDateLabel}</p>
                  <input
                    value={expiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    placeholder="MM / YY"
                    maxLength={5}
                    className={`${inputCls} bg-[#f5f6f8] ${expiry && !expiryValid ? "text-red-500" : ""}`}
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutCvvCvcLabel}</p>
                  <input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="***"
                    className={`${inputCls} bg-[#f5f6f8]`}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutCardNameLabel}</p>
                <input
                  value={cardName}
                  onChange={(e) => handleCardNameChange(e.target.value)}
                  placeholder={t.checkoutCardNameAsAppearsPh}
                  maxLength={30}
                  className={`${inputCls} bg-[#f5f6f8]`}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e2e5ea] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" stroke={v1SelectGreen} strokeWidth="2" /><circle cx="12" cy="10" r="2.5" stroke={v1SelectGreen} strokeWidth="2" /></svg>
                  <p className="text-[15px] font-bold text-[#1d2129]">{t.checkoutBillingAddress}</p>
                </div>
                {billingFilled && (
                  <button
                    type="button"
                    onClick={() => setBillingEditMode((v) => !v)}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5"
                    aria-label="Edit billing address"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </div>
              {billingFilled && !billingEditMode ? (
                <div className="space-y-0.5">
                  <p className="text-[13px] text-[#1d2129]">{billingFirstName} {billingLastName}</p>
                  <p className="text-[13px] text-[#1d2129]">{billingAddress1}{billingAddress2 ? `, ${billingAddress2}` : ""}</p>
                  <p className="text-[13px] text-[#1d2129]">{billingCity}, {billingState} {billingZip}</p>
                  <p className="text-[13px] text-[#1d2129]">{country}</p>
                </div>
              ) : (
                renderV1BillingFields()
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-black/10 bg-white px-4 pb-5 pt-3">
            <button
              type="button"
              disabled={!v1NewCardReady}
              onClick={v1SaveNewCardAndAuth}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white disabled:cursor-not-allowed"
              style={{ background: v1NewCardReady ? v1Cta : "#c9ced6" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="2" /><path d="M8 11V8a4 4 0 118 0v3" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
              {t.checkoutAddCardAndPay(priceSymbolAmount)}
            </button>
          </div>
          {v1Toast}
        </div>
      );
    }

    /* V1 main checkout */
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white">
        <div className="sticky top-0 z-10 flex items-center border-b border-black/10 bg-white px-4 py-3">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b] hover:bg-black/5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#e60012" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <img src="/oripa-logo.png" alt="オリパロット" className="absolute left-1/2 h-7 w-auto -translate-x-1/2" />
          <div className="ml-auto h-8 w-8" />
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-4 pt-4 ${hasCards ? "pb-36" : "pb-24"}`}>
          {v1PackageSummary}

          {enableCurrencyCheckout && (
            <div className="mb-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutChooseCurrency}</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { code: "INR" as const, amount: `₹${formatInr(inrAmount)}` },
                  { code: "JPY" as const, amount: `¥${pkg.jpy.toLocaleString()}` },
                ]).map(({ code, amount }) => {
                  const selected = checkoutCurrency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCheckoutCurrency(code);
                        if (code === "INR" && JP_EXPRESS_WALLETS.includes(payMethod as ExpressWallet)) {
                          setPayMethod("card");
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl border px-3 py-3 text-left active:scale-[0.99]"
                      style={{
                        borderColor: selected ? currencySelectGreen : "#e2e5ea",
                        background: selected ? "#f0fdf4" : "white",
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                        style={{ borderColor: selected ? currencySelectGreen : "#c9ced6" }}
                      >
                        {selected && (
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: currencySelectGreen }} />
                        )}
                      </span>
                      <span className="min-w-0 truncate text-[14px] leading-none">
                        <span className="font-semibold text-[#8a9099]">
                          {code === "INR" ? t.checkoutCurrencyInr : t.checkoutCurrencyJpy}
                        </span>{" "}
                        <span className="font-bold text-[#1d2129]">{amount}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                className="mt-2 flex items-center gap-1.5 overflow-hidden rounded-lg px-2.5 py-2"
                style={{ background: "#fff4e5" }}
              >
                <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3.5L22 20.5H2L12 3.5Z" stroke="#b45309" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 10v5" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="17.5" r="1" fill="#b45309" />
                </svg>
                <p className="min-w-0 truncate whitespace-nowrap text-[11px] font-medium leading-none text-[#b45309]">
                  {checkoutCurrency === "INR"
                    ? t.checkoutInrRateBankFeeWarning(INR_PER_JPY_LABEL)
                    : t.checkoutExRateAndBankFeeMayApply}
                </p>
              </div>
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-[#e2e5ea] bg-white p-3">
            <p className="mb-2.5 text-[12px] font-extrabold uppercase tracking-wide text-[#1d2129]">{t.checkoutPaymentMethods}</p>
            {v1ExpressGrid}
          </div>

          <div className="mb-2 mt-4 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutPayWithCard}</p>
            {hasCards && (
              <button
                type="button"
                onClick={() => setShowMyCards(true)}
                className="text-[13px] font-semibold underline underline-offset-2"
                style={{ color: v1SelectGreen }}
              >
                {t.checkoutManageCards}
              </button>
            )}
          </div>

          {hasCards ? (
            <>
              <div className="flex flex-col gap-2.5">
                {visibleCardIndexes.map((i) => {
                  const card = cards[i];
                  const selected = payMethod === "card" && selectedCardIdx === i;
                  return (
                    <button
                      key={`${card.last4}-${i}`}
                      type="button"
                      onClick={() => { setSelectedCardIdx(i); setPayMethod("card"); }}
                      className="flex w-full items-center gap-3 rounded-xl border px-3 py-3.5 text-left"
                      style={{ borderColor: selected ? v1SelectGreen : "#e2e5ea", background: selected ? "#f0fdf4" : "white" }}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selected ? v1SelectGreen : "#c9ced6" }}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full" style={{ background: v1SelectGreen }} />}
                      </span>
                      <CardBrandIcon brand={card.brand} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#1d2129]">{card.brand} •••• {card.last4}</p>
                        <p className="text-[12px] text-[#8a9099]">{t.checkoutExpires(card.expiry)}</p>
                      </div>
                      {i === 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: v1SelectGreen }}>
                          {t.checkoutLastUsed}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={openV1AddCard}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#c9ced6] bg-white px-3 py-3.5 text-left active:scale-[0.99]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-[18px] font-semibold text-[#8a9099]">+</span>
                  <span className="flex-1 text-[14px] font-semibold text-[#1d2129]">{t.checkoutAddNewCardShort}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="#8a9099" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={openV1AddCard}
              className="flex w-full flex-col gap-2.5 rounded-xl border border-[#e2e5ea] bg-white px-3 py-3.5 text-left active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#c9ced6]" />
                <svg width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#1d2129" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
                <span className="flex-1 text-[14px] font-semibold text-[#1d2129]">{t.checkoutAddNewCardShort}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#8a9099" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="flex flex-nowrap items-center gap-1 pl-8">
                {(["visa", "mastercard", "amex", "discover", "jcb"] as const).map((b) => (
                  <AcceptedCardBadge key={b} brand={b} />
                ))}
              </div>
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-black/10 bg-white px-4 pb-5 pt-3">
          {hasCards && (
            <button
              type="button"
              disabled={v1MainPayDisabled}
              onClick={v1PayWithSelectedCard}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-bold text-white disabled:cursor-not-allowed"
              style={{ background: v1MainPayDisabled ? "#c9ced6" : v1Cta }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="2" /><path d="M8 11V8a4 4 0 118 0v3" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
              {t.checkoutPayNowBtn} {priceSymbolAmount}
            </button>
          )}
          <div className="flex w-full items-center justify-center gap-x-4 text-center text-[11px] text-[#8a9099]">
            <button type="button" onClick={() => openLegal("terms")} className="underline underline-offset-1">{t.checkoutTerms}</button>
            <button type="button" onClick={() => openLegal("privacy")} className="underline underline-offset-1">{t.checkoutPrivacy}</button>
          </div>
        </div>
        {v1Toast}
      </div>
    );
  }
}
