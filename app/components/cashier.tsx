"use client";

/**
 * Cashier V1 — full coin purchase flow.
 * Screens: checkout → addCard | myCards → auth3ds → success.
 * Express wallets (Apple Pay / Google Pay / Link / PayPay) skip 3DS.
 * Card pay goes through mock SMBC Visa 3DS (auth code ≥ 4 digits).
 */

import { useContext, useEffect, useMemo, useState, createContext } from "react";
import type { Lang, OripaItem } from "../lib/types";
import { STR, locTitle } from "../lib/i18n";
import type { LegalDocKey } from "../data/legal";
import { PREFECTURES_EN, PREFECTURES_JA, US_STATES } from "../data/prizes";
import { ALL_ORIPA } from "../data/lobby";
import type { PointPackage } from "./store-page";

/** Optional legal opener — parent provides via context or prop. */
export const CashierLegalContext = createContext<(doc: LegalDocKey) => void>(() => {});

function CoinIcon({ size = 16 }: { size?: number }) {
  return <img src="/coin.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />;
}

function GemIcon({ size = 16 }: { size?: number }) {
  return <img src="/freepoint.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />;
}

function StoreCoinIcon({ size = 32 }: { size?: number }) {
  return <img src="/coin.png" alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

function CardBrandIcon({ brand, compact }: { brand: string; compact?: boolean }) {
  const b = brand.toLowerCase();
  if (b === "visa") return <span className={`inline-block text-center font-black italic ${compact ? "min-w-[28px] text-[11px]" : "min-w-[36px] text-[13px]"}`} style={{ color: "#1a1f71" }}>VISA</span>;
  if (b === "mastercard") return (
    <div className={`relative flex shrink-0 items-center ${compact ? "h-4 w-6" : "h-6 w-9"}`}>
      <div className={`absolute left-0 rounded-full ${compact ? "h-4 w-4" : "h-6 w-6"}`} style={{ background: "#eb001b" }} />
      <div className={`absolute rounded-full opacity-80 ${compact ? "left-2 h-4 w-4" : "left-3 h-6 w-6"}`} style={{ background: "#f79e1b" }} />
    </div>
  );
  if (b === "amex" || b === "american express") return <span className={`inline-block rounded bg-[#006fcf] font-black text-white ${compact ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[10px]"}`}>AMEX</span>;
  if (b === "discover") return <span className={`inline-block font-black ${compact ? "text-[9px]" : "text-[11px]"}`} style={{ color: "#ff6000" }}>Discover</span>;
  if (b === "jcb") return <span className={`inline-flex items-center justify-center rounded bg-[#0e4c96] font-black text-white ${compact ? "h-4 px-1 text-[8px]" : "h-5 px-1.5 text-[10px]"}`}>JCB</span>;
  return (
    <svg width={compact ? 28 : 36} height={compact ? 18 : 24} viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="3" fill="#1d2129" />
      <rect x="2" y="8" width="32" height="4" fill="#8a9099" />
      <rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" />
    </svg>
  );
}

function CardBrandBadges() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-8">
      <CardBrandIcon brand="visa" compact />
      <CardBrandIcon brand="mastercard" compact />
      <CardBrandIcon brand="amex" compact />
      <CardBrandIcon brand="discover" compact />
      <CardBrandIcon brand="jcb" compact />
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
type PurchaseStep = "checkout" | "addCard" | "myCards" | "auth3ds" | "success";
type PayWallet = "applePay" | "googlePay" | "payPay" | "link";
type PayMethodUsed = "card" | PayWallet;

function detectCardBrand(num: string): string {
  const d = num.replace(/\s/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6(?:011|5)/.test(d)) return "Discover";
  if (/^35/.test(d)) return "JCB";
  return "Card";
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function normalizeExpiry(value: string): string {
  const m = value.replace(/\s/g, "").match(/^(\d{2})\/?(\d{2})$/);
  return m ? `${m[1]}/${m[2]}` : value.replace(/\s/g, "");
}

function isExpiryValid(value: string): boolean {
  const m = normalizeExpiry(value).match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mm = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  const nowY = now.getFullYear() % 100;
  const nowM = now.getMonth() + 1;
  return yy > nowY || (yy === nowY && mm >= nowM);
}

function isZipValid(country: string, zip: string): boolean {
  const z = zip.trim();
  if (country === "Japan") return /^\d{3}-\d{4}$/.test(z);
  if (country === "United States") return /^\d{5}$/.test(z);
  return z.length >= 3;
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RadioDot({ selected, green }: { selected: boolean; green?: boolean }) {
  const on = green ? "#16a34a" : "#1d2129";
  const off = "#c9ced6";
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selected ? on : off }}>
      {selected && <span className="h-2.5 w-2.5 rounded-full" style={{ background: on }} />}
    </span>
  );
}

export function PurchaseFlow({
  pkg,
  lang,
  onComplete,
  onClose,
  savedCards = [],
  onSaveCard,
  onDeleteCard,
  onRequireKyc,
  onDrawItem,
}: {
  pkg: PointPackage;
  lang: Lang;
  onComplete: (pts: number) => void;
  onClose: () => void;
  savedCards?: SavedCard[];
  onSaveCard?: (card: SavedCard) => void;
  onDeleteCard?: (idx: number) => void;
  /** Return false to block payment and open KYC. */
  onRequireKyc?: () => boolean;
  /** Success "Draw" opens a pack detail. */
  onDrawItem?: (item: OripaItem) => void;
}) {
  const t = STR[lang];
  const openLegal = useContext(CashierLegalContext);
  const [step, setStep] = useState<PurchaseStep>("checkout");
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(savedCards.length > 0 ? 0 : null);
  const [payMethodUsed, setPayMethodUsed] = useState<PayMethodUsed>("card");
  const [paidCard, setPaidCard] = useState<SavedCard | null>(null);
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [country, setCountry] = useState("Japan");
  const [authCode, setAuthCode] = useState("");
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingEditMode, setBillingEditMode] = useState(true);
  const [playIdx, setPlayIdx] = useState(0);
  const playNowItems = useMemo(() => ALL_ORIPA.slice(0, 6), []);

  const beginPayment = (go: () => void) => {
    if (onRequireKyc && !onRequireKyc()) return;
    go();
  };

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(id);
  }, [toastMsg]);

  useEffect(() => {
    if (savedCards.length === 0) {
      setSelectedCardIdx(null);
      return;
    }
    setSelectedCardIdx((prev) => {
      if (prev === null || prev >= savedCards.length) return 0;
      return prev;
    });
  }, [savedCards.length]);

  const rawCardNum = cardNum.replace(/\s/g, "");
  const cardNumValid = rawCardNum.length >= 14 && rawCardNum.length <= 16;
  const expiryValid = isExpiryValid(expiry);
  const zipValid = isZipValid(country, billingZip);
  const billingFilled =
    billingFirstName.trim().length > 0 &&
    billingLastName.trim().length > 0 &&
    billingAddress1.trim().length > 0 &&
    billingCity.trim().length > 0 &&
    billingState.trim().length > 0 &&
    zipValid;
  const addCardReady = cardNumValid && expiryValid && billingFilled;

  const inputCls = "w-full rounded-xl border border-[#e2e5ea] bg-white px-3 py-3 text-[14px] text-[#1d2129] placeholder:text-[#b0b6bf] focus:outline-none focus:border-[#16a34a]";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]";
  const selectCls = "w-full appearance-none rounded-xl border border-[#e2e5ea] bg-white px-3 py-3 pr-8 text-[14px] text-[#1d2129] focus:outline-none focus:border-[#16a34a]";
  const chevronSvg = (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="#8a9099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const amountStr = pkg.jpy.toLocaleString();
  const hasCards = savedCards.length > 0;
  const stateOptions = country === "Japan" ? (lang === "ja" ? PREFECTURES_JA : PREFECTURES_EN) : country === "United States" ? US_STATES : null;

  function applyBilling(addr: BillingAddress | undefined, edit: boolean) {
    if (addr) {
      setBillingFirstName(addr.firstName);
      setBillingLastName(addr.lastName);
      setBillingAddress1(addr.address1);
      setBillingAddress2(addr.address2);
      setCountry(addr.country);
      setBillingCity(addr.city);
      setBillingState(addr.state);
      setBillingZip(addr.zip);
      setBillingEditMode(edit);
    } else {
      setBillingFirstName("");
      setBillingLastName("");
      setBillingAddress1("");
      setBillingAddress2("");
      setCountry("Japan");
      setBillingCity("");
      setBillingState("");
      setBillingZip("");
      setBillingEditMode(true);
    }
  }

  function openAddCard() {
    setCardNum("");
    setExpiry("");
    setCvc("");
    setCardName("");
    const lastAddr = savedCards.find((c) => c.billingAddress)?.billingAddress;
    // First card / no prior billing: fields open. Later cards: prefill + summary.
    applyBilling(lastAddr, !lastAddr);
    setStep("addCard");
  }

  function currentBilling(): BillingAddress {
    return {
      firstName: billingFirstName.trim(),
      lastName: billingLastName.trim(),
      address1: billingAddress1.trim(),
      address2: billingAddress2.trim(),
      country,
      city: billingCity.trim(),
      state: billingState,
      zip: billingZip.trim(),
    };
  }

  function startCardPay(card: SavedCard) {
    beginPayment(() => {
      setPayMethodUsed("card");
      setPaidCard(card);
      setAuthCode("");
      setStep("auth3ds");
    });
  }

  function payWithSelectedCard() {
    if (selectedCardIdx === null || !savedCards[selectedCardIdx]) return;
    startCardPay(savedCards[selectedCardIdx]);
  }

  function submitNewCard() {
    if (!addCardReady) return;
    const brand = detectCardBrand(rawCardNum);
    const last4 = rawCardNum.slice(-4);
    const exp = normalizeExpiry(expiry);
    const card: SavedCard = {
      last4,
      expiry: exp,
      brand,
      name: cardName.trim(),
      billingAddress: currentBilling(),
    };
    onSaveCard?.(card);
    setSelectedCardIdx(0);
    startCardPay(card);
  }

  function payWithWallet(wallet: PayWallet) {
    beginPayment(() => {
      setPayMethodUsed(wallet);
      setPaidCard(null);
      setStep("success");
    });
  }

  function checkoutDisplayCards(): { card: SavedCard; idx: number }[] {
    if (!hasCards) return [];
    const top = savedCards.slice(0, 3).map((card, idx) => ({ card, idx }));
    if (selectedCardIdx === null || selectedCardIdx < 3) return top;
    // Selected beyond top 3: still show it, plus first 2 of top 3.
    return [{ card: savedCards[selectedCardIdx], idx: selectedCardIdx }, ...top.slice(0, 2)];
  }

  function renderBillingForm() {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>{t.checkoutBillingFirstNameLabel}</label>
            <input value={billingFirstName} onChange={(e) => setBillingFirstName(e.target.value)} placeholder={t.checkoutBillingFirstNamePh} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.checkoutBillingLastNameLabel}</label>
            <input value={billingLastName} onChange={(e) => setBillingLastName(e.target.value)} placeholder={t.checkoutBillingLastNamePh} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{t.checkoutBillingAddress1Label}</label>
          <input value={billingAddress1} onChange={(e) => setBillingAddress1(e.target.value)} placeholder={t.checkoutBillingAddress1Ph} className={inputCls} />
          <p className="mt-1 flex items-start gap-1 text-[11px] text-[#5c626b]">
            {t.checkoutBillingPOBoxNote}
            <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8a9099" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"/></svg>
          </p>
        </div>
        <div>
          <label className={labelCls}>{t.checkoutBillingAddress2Label}</label>
          <input value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} placeholder={t.checkoutBillingAddress2Ph} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>{t.checkoutCountryLabel}</label>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => {
                  const next = e.target.value;
                  setCountry(next);
                  setBillingState("");
                  setBillingZip("");
                  setBillingEditMode(true);
                }}
                className={selectCls}
              >
                <option>Japan</option>
                <option>United States</option>
              </select>
              {chevronSvg}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t.checkoutStateLabel}</label>
            {stateOptions ? (
              <div className="relative">
                <select value={billingState} onChange={(e) => setBillingState(e.target.value)} className={selectCls}>
                  <option value="">{country === "Japan" ? t.profilePrefecture : t.checkoutBillingStatePh}</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {chevronSvg}
              </div>
            ) : (
              <input value={billingState} onChange={(e) => setBillingState(e.target.value)} placeholder={t.checkoutBillingStatePh} className={inputCls} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>{t.checkoutBillingCityLabel}</label>
            <input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder={t.checkoutBillingCityPh} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.checkoutBillingZipLabel}</label>
            <input
              value={billingZip}
              onChange={(e) => {
                let v = e.target.value;
                if (country === "Japan") {
                  const d = v.replace(/\D/g, "").slice(0, 7);
                  v = d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
                }
                setBillingZip(v);
              }}
              placeholder={country === "Japan" ? "123-4567" : t.checkoutBillingZipPh}
              className={inputCls}
            />
          </div>
        </div>
      </div>
    );
  }

  function paymentMethodRow() {
    if (payMethodUsed !== "card" || !paidCard) {
      const label =
        payMethodUsed === "applePay" ? "Apple Pay" :
        payMethodUsed === "googlePay" ? "Google Pay" :
        payMethodUsed === "payPay" ? "PayPay" :
        payMethodUsed === "link" ? "link" : "Card";
      return <span className="text-[14px] font-semibold text-[#1d2129]">{label}</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <CardBrandIcon brand={paidCard.brand} compact />
        <span className="text-[14px] font-semibold text-[#1d2129]">{paidCard.brand} •••• {paidCard.last4}</span>
      </div>
    );
  }

  /* ── 3DS ── */
  if (step === "auth3ds") {
    const authEnabled = authCode.replace(/\D/g, "").length >= 4;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center px-3" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white">
          <button
            onClick={() => { setStep("checkout"); setAuthCode(""); }}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
          <div className="border-b border-black/10 px-4 py-3">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-sm" style={{ background: "#1a5c3a" }} />
                <span className="text-[11px] font-bold text-[#333]">三井住友カード</span>
              </div>
              <span className="text-[20px] font-black italic" style={{ color: "#1a1f71" }}>VISA</span>
            </div>
          </div>
          <div className="px-5 pb-6 pt-4">
            <h3 className="text-center text-[16px] font-bold text-[#1d2129]">認証コードをご入力ください</h3>
            <p className="mt-2 text-center text-[12.5px] leading-relaxed text-[#5c626b]">
              TRUSTHUB K.K.へ¥{amountStr} JPYの決済を認証します。<br /><br />
              認証コードを a*****n@flatriver-inc.comへお送りしました。届いた認証コードをご入力いただき、「認証する」ボタンを押してください。<br />
              ※ドメイン指定受信を設定の場合は@payment.vpass.ne.jpからのメールを受信できるように設定をお願いします。
            </p>
            <div className="mt-4 text-center">
              <p className="text-[12px] text-[#5c626b]">{t.auth3dsRefCode}</p>
              <p className="text-[18px] font-black text-[#1d2129]">OTE</p>
            </div>
            <label className="mt-4 block text-[12px] font-medium text-[#5c626b]">認証コード</label>
            <input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
              placeholder={t.auth3dsInputPh}
              inputMode="numeric"
              className={`mt-1 ${inputCls}`}
            />
            <button
              disabled={!authEnabled}
              onClick={() => setStep("success")}
              className="mt-4 w-full rounded-xl py-3 text-[15px] font-bold text-white disabled:cursor-not-allowed"
              style={{ background: authEnabled ? "#2355c5" : "#c9ced6" }}
            >
              {t.auth3dsSubmit}
            </button>
            <button type="button" className="mt-3 block w-full text-center text-[13px] font-semibold text-[#2355c5] underline underline-offset-2">
              {t.auth3dsResend}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (step === "success") {
    const isSubscription = !!pkg.subscriptionName;
    const successHeading = isSubscription ? t.storeSuccessSubscription : t.successTitle;
    const item = playNowItems[playIdx] ?? playNowItems[0];
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
        <div className="relative w-full max-w-sm overflow-visible">
          <div className="relative z-10 flex justify-center" style={{ marginBottom: "-56px" }}>
            <img src="/coin-bag.png" alt="" style={{ width: 140, height: 140, objectFit: "contain" }} />
          </div>
          <div className="rounded-2xl bg-white px-5 pb-5 pt-16">
            <h2 className="text-center text-[20px] font-bold leading-snug text-[#1d2129]">
              {successHeading.split("\n").map((line, i) => (
                <span key={i}>{line}{i < successHeading.split("\n").length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="mt-3 mb-3 text-center text-[13px] font-semibold text-[#8a9099]">{t.successPurchaseDetails}</p>
            {isSubscription ? (
              <div className="rounded-xl border border-[#e2e5ea] px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[18px]">🎴</span>
                  <span className="text-[15px] font-extrabold text-[#1d2129]">{pkg.subscriptionName}</span>
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#16a34a" }}>{t.storeSubscribedActive}</span>
                </div>
                {t.storeCollectorsPassPerks.map((perk, i) => (
                  <div key={i} className="mt-1.5 flex items-center gap-2">
                    <span className="text-[13px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                    <span className="text-[12px] text-[#5c626b]">{perk}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#e2e5ea] px-4 py-3">
                <div className="flex items-center justify-center gap-5">
                  <div className="flex items-center gap-2">
                    <CoinIcon size={22} />
                    <span className="text-[16px] font-bold text-[#1d2129]">{pkg.coins.toLocaleString()}</span>
                  </div>
                  <div className="h-6 w-px bg-[#e2e5ea]" />
                  <div className="flex items-center gap-2">
                    <GemIcon size={22} />
                    <span className="text-[16px] font-medium text-[#1d2129]">{t.storeFreePoints(pkg.freePoints)}</span>
                  </div>
                </div>
                <div className="my-3 border-t border-dashed border-[#e2e5ea]" />
                <div className="flex justify-center">{paymentMethodRow()}</div>
              </div>
            )}

            {!isSubscription && item && (
              <div className="mt-4">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.successPlayNow}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayIdx((i) => (i - 1 + playNowItems.length) % playNowItems.length)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e2e5ea] text-[#8a9099]"
                    aria-label="Previous"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#e2e5ea]">
                    <img src={item.image} alt="" className="h-24 w-full object-cover" />
                    <div className="flex items-center gap-2 px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-[#1d2129]">{locTitle(item, lang)}</p>
                        <p className="text-[10px] text-[#8a9099]">{t.successRemaining(item.remaining, item.total)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onComplete(pkg.coins);
                          if (item) onDrawItem?.(item);
                        }}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white"
                        style={{ background: "#c0392b" }}
                      >
                        {t.successDraw}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlayIdx((i) => (i + 1) % playNowItems.length)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e2e5ea] text-[#8a9099]"
                    aria-label="Next"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
                <div className="mt-2 flex justify-center gap-1.5">
                  {playNowItems.map((_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === playIdx ? "#c0392b" : "#c9ced6" }} />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => onComplete(pkg.coins)}
              className="mt-4 w-full rounded-xl border border-[#c9ced6] py-3 text-[16px] font-bold text-[#1d2129]"
            >
              {t.successClose}
            </button>
            <p className="mt-3 text-center text-[10px] font-medium leading-relaxed text-[#8a9099]">{t.successBillingNote}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── My Cards ── */
  if (step === "myCards") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white">
        <div className="shrink-0 flex items-center border-b border-black/10 bg-white px-4 py-3">
          <button onClick={() => setStep("checkout")} className="flex h-8 w-8 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#e60012" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold text-[#1d2129]">{t.checkoutMyCards}</span>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28">
          <div className="flex flex-col gap-3">
            {savedCards.map((card, i) => (
              <div
                key={`${card.brand}-${card.last4}-${i}`}
                className="flex cursor-pointer items-center gap-3 rounded-xl border p-4"
                style={{ borderColor: selectedCardIdx === i ? "#c9ced6" : "#e2e5ea", background: "#fff" }}
                onClick={() => setSelectedCardIdx(i)}
              >
                <RadioDot selected={selectedCardIdx === i} />
                <CardBrandIcon brand={card.brand} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#1d2129]">{card.brand} •••• {card.last4}</p>
                  <p className="text-[12px] text-[#8a9099]">{card.expiry}</p>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmIdx(i); }}
                  aria-label="Delete card"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 11v6M14 11v6" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-black/5 bg-white px-4 py-3">
          <button
            onClick={payWithSelectedCard}
            disabled={selectedCardIdx === null}
            className="w-full rounded-xl py-3.5 text-[16px] font-bold text-white disabled:cursor-not-allowed"
            style={{ background: selectedCardIdx === null ? "#c9ced6" : "#c0392b" }}
          >
            {t.checkoutPayNow(amountStr)}
          </button>
        </div>

        {deleteConfirmIdx !== null && savedCards[deleteConfirmIdx] && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <h3 className="text-[18px] font-bold text-[#1d2129]">{t.checkoutDeleteCard}</h3>
                <button onClick={() => setDeleteConfirmIdx(null)} className="flex h-7 w-7 items-center justify-center text-[#8a9099]" aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="px-5 pb-5 pt-4">
                <p className="text-[14px] leading-relaxed text-[#1d2129]">
                  {t.checkoutDeleteCardBody(savedCards[deleteConfirmIdx].brand, savedCards[deleteConfirmIdx].last4)}
                </p>
                <button
                  onClick={() => {
                    const idx = deleteConfirmIdx;
                    const newLen = savedCards.length - 1;
                    onDeleteCard?.(idx);
                    setToastMsg(t.checkoutCardRemoved);
                    setDeleteConfirmIdx(null);
                    if (selectedCardIdx === idx) setSelectedCardIdx(newLen > 0 ? 0 : null);
                    else if (selectedCardIdx !== null && selectedCardIdx > idx) setSelectedCardIdx(selectedCardIdx - 1);
                    if (newLen === 0) setStep("checkout");
                  }}
                  className="mt-5 w-full rounded-xl py-3 text-[15px] font-bold text-white"
                  style={{ background: "#c0392b" }}
                >
                  {t.checkoutDelete}
                </button>
                <button
                  onClick={() => setDeleteConfirmIdx(null)}
                  className="mt-2.5 w-full rounded-xl border border-[#c9ced6] py-3 text-[15px] font-semibold text-[#1d2129]"
                >
                  {t.checkoutCancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="pointer-events-none absolute bottom-24 left-4 right-4 z-20 flex justify-center">
            <div className="rounded-full bg-[#1d2129] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">
              {toastMsg}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Add Card Details ── */
  if (step === "addCard") {
    const showSummary = !billingEditMode && billingFilled;
    return (
      <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "#f5f6f8" }}>
        <div className="shrink-0 flex items-center bg-white px-4 py-3">
          <button
            onClick={() => setStep("checkout")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef0f3]"
            aria-label={t.backAria}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#5c626b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold text-[#1d2129]">{t.checkoutAddCardTitle}</span>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28">
          {/* Card information */}
          <div className="mb-3 rounded-2xl border border-[#e2e5ea] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#16a34a" strokeWidth="2" /><path d="M2 10h20" stroke="#16a34a" strokeWidth="2" /></svg>
              <p className="text-[15px] font-bold text-[#16a34a]">{t.checkoutCardInfo}</p>
            </div>
            <div className="mb-3">
              <label className={labelCls}>{t.checkoutCardNumLabel}</label>
              <div className="relative">
                <input
                  value={cardNum}
                  onChange={(e) => setCardNum(formatCardNumber(e.target.value))}
                  placeholder={t.checkoutCardNumPh}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  maxLength={19}
                  className={`${inputCls} pr-10 ${cardNum && !cardNumValid ? "text-red-500" : ""}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#c9ced6]">
                  <svg width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#c9ced6" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
                </span>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>{t.checkoutExpiryLabel}</label>
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                  placeholder={t.checkoutExpiryPh}
                  inputMode="numeric"
                  maxLength={7}
                  className={`${inputCls} ${expiry && !expiryValid ? "text-red-500" : ""}`}
                />
              </div>
              <div>
                <label className={labelCls}>{t.checkoutCvcLabel}</label>
                <input
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder={t.checkoutCvcPh}
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t.checkoutCardNameLabel}</label>
              <input
                value={cardName}
                onChange={(e) => setCardName(e.target.value.replace(/\d/g, "").slice(0, 30))}
                placeholder={t.checkoutCardNamePh}
                maxLength={30}
                className={inputCls}
              />
            </div>
          </div>

          {/* Billing Address */}
          <div className="rounded-2xl border border-[#e2e5ea] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" stroke="#16a34a" strokeWidth="2" /><circle cx="12" cy="10" r="2.5" stroke="#16a34a" strokeWidth="2" /></svg>
                <p className="text-[15px] font-bold text-[#16a34a]">{t.checkoutBillingAddress}</p>
              </div>
              {(showSummary || billingFilled) && (
                <button
                  type="button"
                  onClick={() => setBillingEditMode((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                  aria-label="Edit billing address"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#8a9099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#8a9099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
            </div>
            {showSummary ? (
              <div className="space-y-0.5 text-[14px] leading-relaxed text-[#1d2129]">
                <p>{billingFirstName} {billingLastName}</p>
                <p>{billingAddress1}{billingAddress2 ? `, ${billingAddress2}` : ""}</p>
                <p>{billingCity}, {billingState} {billingZip}</p>
                <p>{country}</p>
              </div>
            ) : (
              renderBillingForm()
            )}
          </div>
        </div>

        <div className="shrink-0 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button
            disabled={!addCardReady}
            onClick={submitNewCard}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-bold text-white disabled:cursor-not-allowed"
            style={{ background: addCardReady ? "#c0392b" : "#c9ced6" }}
          >
            <LockIcon />
            {t.checkoutAddCardAndPay(amountStr)}
          </button>
        </div>
      </div>
    );
  }

  /* ── Main checkout ── */
  const displayCards = checkoutDisplayCards();
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="shrink-0 flex items-center border-b border-black/10 bg-white px-4 py-3">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center" aria-label={t.backAria}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#e60012" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <img src="/oripa-logo.png" alt="オリパロット" className="absolute left-1/2 h-7 w-auto -translate-x-1/2" />
        <div className="ml-auto h-8 w-8" />
      </div>

      <div className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-4 ${hasCards ? "pb-36" : "pb-24"}`}>
        {/* Package summary */}
        <div className="mb-5 overflow-hidden rounded-xl border bg-white" style={{ borderColor: (pkg.tag || pkg.discount) ? "#B40206" : "#e2e5ea" }}>
          {(pkg.tag || pkg.discount != null) && (
            <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5" style={{ background: "rgba(230,0,18,0.07)" }}>
              {pkg.tag && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: pkg.tag === "megaSale" ? "#1e3a8a" : "#B40206" }}>
                  {pkg.tag === "megaSale" ? t.storeMegaSale : t.storeFirstTimeOffer}
                </span>
              )}
              {pkg.discount != null && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{t.storeOff(pkg.discount)}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2.5 px-3 py-3">
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
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "#fef3c7" }}>
                    <span className="text-[11px] font-semibold text-[#92400e]">+</span>
                    <GemIcon size={12} />
                    <span className="text-[11px] font-semibold text-[#92400e]">{t.storeFreePoints(pkg.freePoints)}</span>
                  </div>
                </div>
              </>
            )}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {pkg.originalJpy != null && (
                <span className="text-[11px] text-[#8a9099] line-through">{pkg.originalJpy.toLocaleString()} JPY</span>
              )}
              <span className="text-[15px] font-extrabold text-[#1d2129]">{amountStr} JPY</span>
            </div>
          </div>
        </div>

        {/* Express wallets */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutPaymentMethod}</p>
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => payWithWallet("applePay")}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl text-white active:scale-[0.98]"
            style={{ background: "#000" }}
            aria-label="Apple Pay"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
            <span className="text-[17px] font-medium tracking-tight">Pay</span>
          </button>
          <button
            type="button"
            onClick={() => payWithWallet("googlePay")}
            className="flex h-12 items-center justify-center overflow-hidden rounded-xl active:scale-[0.98]"
            style={{ background: "#1f1f1f" }}
            aria-label="Google Pay"
          >
            <img src="/gpay-btn.png" alt="Google Pay" className="h-[36px] w-auto max-w-[90%] object-contain" />
          </button>
          <button
            type="button"
            onClick={() => payWithWallet("link")}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl text-white active:scale-[0.98]"
            style={{ background: "#00d64f" }}
            aria-label="Link"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.2" /><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" /><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[16px] font-semibold">link</span>
          </button>
          <button
            type="button"
            onClick={() => payWithWallet("payPay")}
            className="flex h-12 items-center justify-center rounded-xl active:scale-[0.98]"
            style={{ background: "#FF0033" }}
            aria-label="PayPay"
          >
            <span className="text-[17px] font-black tracking-tight text-white">PayPay</span>
          </button>
        </div>

        {/* Pay with card */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.checkoutPayWithCard}</p>
          {hasCards && (
            <button
              type="button"
              onClick={() => setStep("myCards")}
              className="text-[13px] font-semibold underline underline-offset-2"
              style={{ color: "#16a34a" }}
            >
              {t.checkoutManageCards}
            </button>
          )}
        </div>

        {!hasCards ? (
          <button
            type="button"
            onClick={openAddCard}
            className="w-full rounded-xl border border-[#e2e5ea] bg-white px-3 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <RadioDot selected={false} />
              <svg width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#1d2129" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
              <span className="min-w-0 flex-1 text-[14px] font-medium text-[#1d2129]">{t.checkoutAddNewCard}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#8a9099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <CardBrandBadges />
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            {displayCards.map(({ card, idx }) => {
              const selected = selectedCardIdx === idx;
              const isNewest = idx === 0;
              return (
                <button
                  key={`${card.brand}-${card.last4}-${idx}`}
                  type="button"
                  onClick={() => setSelectedCardIdx(idx)}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left"
                  style={{
                    borderColor: selected ? "#16a34a" : "#e2e5ea",
                    background: selected ? "#f0fdf4" : "#fff",
                  }}
                >
                  <RadioDot selected={selected} green />
                  <CardBrandIcon brand={card.brand} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[#1d2129]">{card.brand} •••• {card.last4}</p>
                    <p className="text-[12px] text-[#8a9099]">{t.checkoutExpires(card.expiry)}</p>
                  </div>
                  {isNewest && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#16a34a" }}>
                      {t.checkoutLastUsed}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={openAddCard}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#c9ced6] bg-white px-3 py-3 text-left"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-medium text-[#1d2129]">{t.checkoutAddNewCard}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="#8a9099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-black/5 bg-white px-4 py-3">
        {hasCards && (
          <button
            type="button"
            disabled={selectedCardIdx === null}
            onClick={payWithSelectedCard}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-bold text-white disabled:cursor-not-allowed"
            style={{ background: selectedCardIdx === null ? "#c9ced6" : "#c0392b" }}
          >
            <LockIcon />
            {t.checkoutPayNow(amountStr)}
          </button>
        )}
        <div className="flex w-full items-center justify-center gap-x-4 text-center text-[11px] text-[#8a9099]">
          <button type="button" onClick={() => openLegal("terms")} className="underline underline-offset-1">{t.checkoutTerms}</button>
          <button type="button" onClick={() => openLegal("privacy")} className="underline underline-offset-1">{t.checkoutPrivacy}</button>
        </div>
      </div>

      {toastMsg && (
        <div className="pointer-events-none absolute bottom-28 left-4 right-4 z-20 flex justify-center">
          <div className="rounded-full bg-[#1d2129] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
