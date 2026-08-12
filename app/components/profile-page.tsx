"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang, ShippingCountry } from "../lib/types";
import { STR, type Dict } from "../lib/i18n";
import { PREFECTURES_EN, PREFECTURES_JA, US_STATES } from "../data/prizes";
import type { KycState } from "./kyc";

/* ── My Profile (Edit profile / Account Settings) ──────────────────────
   Ported from the POC ProfilePage. Both My Account CTAs open this screen.
   Accordion sections: Account ID, Personal Information, Social Connect,
   Change Password, Communication Preferences, plus Account Verifications
   (ID / Payment Method / Document Upload) with Jumio + KYC + phone OTP. */

export type ProfilePageChrome = {
  header: ReactNode;
};

function CrownEmblem({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" aria-hidden>
      <circle cx="50" cy="50" r="50" fill="#c8061a" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.5" />
      {/* wings */}
      <path d="M50 40c-9-7-20-9-29-6 4 6 12 11 22 12M50 40c9-7 20-9 29-6-4 6-12 11-22 12" fill="#fff" opacity="0.92" />
      {/* crown */}
      <path d="M38 30l4 6 8-9 8 9 4-6 1.5 9h-27z" fill="#fff" />
      {/* O */}
      <text x="50" y="72" textAnchor="middle" fontSize="40" fontWeight="900" fontStyle="italic" fill="#fff">O</text>
    </svg>
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


function DocUploadOverlay({ state, t, onOkay }: {
  state: "pending" | "success";
  t: { profileDocumentPending: string; profileDocumentPendingNote: string; profileDocumentSuccess: string; profileDocumentSuccessNote: string; profileDocumentOkay: string };
  onOkay: () => void;
}) {
  const isPending = state === "pending";
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="w-full max-w-xs rounded-2xl bg-white px-6 py-8 text-center shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: isPending ? "#fff8e7" : "#e8f9f4" }}>
          {isPending ? (
            /* Upload pending — cloud with arrow */
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
              <ellipse cx="23" cy="28" rx="14" ry="9" fill="#fde68a" />
              <path d="M11 27c0-5 3.5-9 8-10.5a10 10 0 0 1 19 3.5C40.5 20 43 22.5 43 26a6 6 0 0 1-6 6H11a6 6 0 0 1 0-5z" fill="#fbbf24" />
              <path d="M11 27c0-3.3 2.2-6.1 5.3-7.1A9 9 0 0 1 33.2 23C35 22.9 37 24.3 37 26.5A4.5 4.5 0 0 1 32.5 31H13.5A4.5 4.5 0 0 1 11 27z" fill="#f59e0b" />
              <path d="M23 36v-9m0 0l-3 3m3-3l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="34" cy="12" r="6" fill="#22c55e" />
              <path d="M31.5 12l2 2 3.5-3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            /* Upload success — cloud with checkmark */
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
              <ellipse cx="23" cy="28" rx="14" ry="9" fill="#bbf7d0" />
              <path d="M11 27c0-5 3.5-9 8-10.5a10 10 0 0 1 19 3.5C40.5 20 43 22.5 43 26a6 6 0 0 1-6 6H11a6 6 0 0 1 0-5z" fill="#4ade80" />
              <path d="M11 27c0-3.3 2.2-6.1 5.3-7.1A9 9 0 0 1 33.2 23C35 22.9 37 24.3 37 26.5A4.5 4.5 0 0 1 32.5 31H13.5A4.5 4.5 0 0 1 11 27z" fill="#22c55e" />
              <path d="M18 27l3.5 3.5L28 24" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="34" cy="12" r="6" fill="#22c55e" />
              <path d="M31.5 12l2 2 3.5-3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <h3 className="mb-2 text-[17px] font-extrabold" style={{ color: isPending ? "#f59e0b" : "#22c55e" }}>
          {isPending ? t.profileDocumentPending : t.profileDocumentSuccess}
        </h3>
        <p className="text-[12px] leading-relaxed text-[#5c626b]">
          {isPending ? t.profileDocumentPendingNote : t.profileDocumentSuccessNote}
        </p>
        {!isPending && (
          <button onClick={onOkay} className="mt-5 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#D10005" }}>
            {t.profileDocumentOkay}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Document Upload sub-page ────────────────────────────────────────── */
type DocHistoryEntry = { id: string; type: string; date: string; status: "Approved" | "Pending" | "Review" };

function DocumentUploadPage({ t, coins, onBack, onOpenStore, docHistory, onAddHistory, chrome }: {
  t: Dict; coins: number; onBack: () => void; onOpenStore?: () => void;
  docHistory: DocHistoryEntry[];
  onAddHistory: (entry: DocHistoryEntry) => void;
  chrome: ProfilePageChrome;
}) {
  const [docType, setDocType] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "pending" | "success">("idle");

  function handleSubmit() {
    setUploadState("pending");
    setTimeout(() => setUploadState("success"), 2000);
  }

  function handleOkay() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" }) +
      " @ " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const statuses: Array<"Approved" | "Pending" | "Review"> = ["Approved", "Pending", "Review"];
    onAddHistory({ id: String(Date.now()), type: docType, date: dateStr, status: statuses[docHistory.length % 3] });
    setDocType("");
    setDocFileName("");
    setUploadState("idle");
  }

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]" style={{ position: "relative" }}>
      {/* Pending / success overlay */}
      {uploadState !== "idle" && (
        <DocUploadOverlay state={uploadState} t={t} onOkay={handleOkay} />
      )}

      {chrome.header}

      {/* Page title */}
      <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center text-[#D10005]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[16px] font-bold text-[#1d2129]">{t.profileDocumentUpload}</h1>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Upload form card */}
        <div className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <p className="mb-4 text-[12px] leading-relaxed text-[#5c626b]">{t.profileDocumentNote}</p>

          {/* Select + Submit row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={docType}
                onChange={(e) => { setDocType(e.target.value); setDocFileName(""); }}
                className="w-full appearance-none rounded-xl border border-[#e5e8ec] bg-white py-2.5 pl-3 pr-8 text-[13px] text-[#1d2129] outline-none"
              >
                <option value="">{t.profileDocumentSelect}</option>
                {(t.profileDocumentTypes as string[]).map((dt: string) => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
            <button
              disabled={!docFileName}
              onClick={handleSubmit}
              className="shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white"
              style={{ background: docFileName ? "#D10005" : "#d1d5db", cursor: docFileName ? "pointer" : "not-allowed" }}
            >
              {t.profileDocumentSubmit}
            </button>
          </div>

          {/* File picker — shows after document type selected */}
          {docType && (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e5e8ec] py-5 text-[13px] font-semibold text-[#8a9099] hover:border-[#D10005] hover:text-[#D10005] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" /></svg>
              {docFileName
                ? <span className="text-[#1d2129] font-medium">{docFileName}</span>
                : <span>{t.profileDocumentUploadBtn}</span>
              }
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => { if (e.target.files?.[0]) setDocFileName(e.target.files[0].name); }} />
            </label>
          )}
        </div>

        {/* Upload History */}
        {docHistory.length > 0 && (
          <div className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileDocumentHistory}</p>
            <div className="space-y-2">
              {docHistory.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-[#e5e8ec] bg-white px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#f4f5f7" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" /><line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" /><line x1="8" y1="17" x2="12" y2="17" strokeLinecap="round" /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#1d2129]">{entry.type}</p>
                    <p className="text-[10px] text-[#8a9099]">{entry.date}</p>
                  </div>
                  {entry.status === "Approved" && (
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      <span className="text-[11px] font-semibold text-[#22c55e]">{t.profileDocumentApproved}</span>
                    </div>
                  )}
                  {entry.status === "Pending" && (
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#f59e0b" /><path d="M10 6v4l2.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span className="text-[11px] font-semibold text-[#f59e0b]">{t.profileDocumentPendingStatus}</span>
                    </div>
                  )}
                  {entry.status === "Review" && (
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#3b82f6" /><path d="M10 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" stroke="white" strokeWidth="1.5" fill="none" /><circle cx="10" cy="10" r="1" fill="white" /></svg>
                      <span className="text-[11px] font-semibold text-[#3b82f6]">{t.profileDocumentReview}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Veriff flow components ──────────────────────────────────────────── */
type VeriffStrings = {
  veriffIdTitle: string; veriffIdDesc: string; veriffAddrTitle: string; veriffAddrDesc: string;
  veriffLetsGo: string; veriffPrivacy: string; veriffFullyVerified: string; veriffCongrats: string;
  veriffUnderstood: string; veriffProceed: string; profileIdCheckDone: string; profileAddressCheckDone: string;
  profileStep2Pending: string; profileStep1: string; profileStep2: string;
};

function VeriffModalScreen({ type, t, onClose, onLetGo }: { type: "id" | "address"; t: VeriffStrings; onClose: () => void; onLetGo: () => void }) {
  const isId = type === "id";
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
        <svg width="72" height="22" viewBox="0 0 72 22">
          <text x="0" y="16" fontSize="15" fontWeight="800" fill="#00c4a7" fontFamily="system-ui,sans-serif">veriff</text>
          <circle cx="67" cy="11" r="8" fill="#00c4a7" />
          <path d="M63.5 11l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <div className="w-8" />
      </div>

      {/* Illustration */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6">
          {isId ? (
            <svg width="190" height="155" viewBox="0 0 190 155">
              <circle cx="95" cy="78" r="72" fill="#e4f8f4" />
              {/* Person head */}
              <circle cx="78" cy="52" r="17" fill="#f5c5a3" />
              {/* Person body */}
              <rect x="59" y="67" width="38" height="46" rx="8" fill="#4a90d9" />
              {/* Arm */}
              <rect x="91" y="63" width="11" height="32" rx="5" fill="#f5c5a3" />
              {/* Phone */}
              <rect x="99" y="54" width="26" height="44" rx="5" fill="#1d2129" />
              <rect x="102" y="58" width="20" height="33" rx="3" fill="#6ee7de" opacity="0.85" />
              {/* ID card on phone */}
              <rect x="104" y="64" width="16" height="10" rx="2" fill="white" opacity="0.9" />
              <circle cx="108" cy="69" r="3" fill="#d1d5db" />
              <line x1="113" y1="67" x2="119" y2="67" stroke="#d1d5db" strokeWidth="1" />
              <line x1="113" y1="70" x2="117" y2="70" stroke="#d1d5db" strokeWidth="1" />
              {/* Shield */}
              <path d="M144 28 L158 34 L158 51 Q158 61 144 66 Q130 61 130 51 L130 34 Z" fill="#00c4a7" />
              <path d="M138 49l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          ) : (
            <svg width="190" height="155" viewBox="0 0 190 155">
              <circle cx="95" cy="78" r="72" fill="#e4f8f4" />
              <circle cx="78" cy="52" r="17" fill="#f5c5a3" />
              <rect x="59" y="67" width="38" height="46" rx="8" fill="#5b8fd9" />
              <rect x="91" y="63" width="11" height="32" rx="5" fill="#f5c5a3" />
              {/* Document */}
              <rect x="100" y="50" width="32" height="42" rx="4" fill="white" stroke="#e5e8ec" strokeWidth="1.5" />
              <line x1="106" y1="60" x2="126" y2="60" stroke="#d1d5db" strokeWidth="1.5" />
              <line x1="106" y1="66" x2="126" y2="66" stroke="#d1d5db" strokeWidth="1.5" />
              <line x1="106" y1="72" x2="120" y2="72" stroke="#d1d5db" strokeWidth="1.5" />
              <line x1="106" y1="78" x2="124" y2="78" stroke="#d1d5db" strokeWidth="1.5" />
              {/* Shield */}
              <path d="M144 28 L158 34 L158 51 Q158 61 144 66 Q130 61 130 51 L130 34 Z" fill="#00c4a7" />
              <path d="M138 49l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </div>
        <h2 className="mb-2.5 text-[21px] font-bold text-[#1d2129] leading-snug">
          {isId ? t.veriffIdTitle : t.veriffAddrTitle}
        </h2>
        <p className="text-[13px] leading-relaxed text-[#5c626b]">
          {isId ? t.veriffIdDesc : t.veriffAddrDesc}
        </p>
      </div>

      {/* CTA */}
      <div className="shrink-0 px-5 pb-8 pt-4">
        <button onClick={onLetGo} className="w-full rounded-xl py-4 text-[15px] font-bold text-white" style={{ background: "#0d1b2a" }}>
          {t.veriffLetsGo}
        </button>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-[#8a9099]">
          {t.veriffPrivacy}
        </p>
      </div>
    </div>
  );
}

function VeriffSuccessOverlay({ type, idDone, addrDone, t, onDismiss }: {
  type: "id" | "address"; idDone: boolean; addrDone: boolean; t: VeriffStrings; onDismiss: () => void;
}) {
  const bothDone = idDone && addrDone;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-white">
        {/* Veriff logo bar */}
        <div className="flex justify-center pt-5 pb-2">
          <svg width="72" height="22" viewBox="0 0 72 22">
            <text x="0" y="16" fontSize="15" fontWeight="800" fill="#00c4a7" fontFamily="system-ui,sans-serif">veriff</text>
            <circle cx="67" cy="11" r="8" fill="#00c4a7" />
            <path d="M63.5 11l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="px-6 pb-6 text-center">
          {/* Checkmark */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#00c4a7" }}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M6 15l6 6 12-12" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p className="mb-1 text-[11px] text-[#8a9099]">{t.veriffFullyVerified}</p>
          <h2 className="text-[19px] font-extrabold text-[#1d2129] leading-tight">{t.veriffCongrats}</h2>
          <h2 className="mb-2 text-[19px] font-extrabold text-[#1d2129] leading-tight">Taro Yamada</h2>
          <p className="mb-4 text-[10px] text-[#8a9099]">Account ID: 839473754</p>

          {/* Step status */}
          <div className="rounded-xl px-4 py-3 text-left space-y-2 mb-5" style={{ background: "#f4f5f7" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileStep1}</p>
            <div className="flex items-start gap-2">
              <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#00c4a7" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              <p className="text-[12px] text-[#1d2129]">{t.profileIdCheckDone}</p>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a9099] pt-1">{t.profileStep2}</p>
            <div className="flex items-start gap-2">
              {addrDone ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#00c4a7" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  <p className="text-[12px] text-[#1d2129]">{t.profileAddressCheckDone}</p>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#f59e0b" /><path d="M10 6v4.5M10 13v.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  <p className="text-[12px] text-[#1d2129]">{t.profileStep2Pending}</p>
                </>
              )}
            </div>
          </div>

          <button onClick={onDismiss} className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white" style={{ background: "#D10005" }}>
            {bothDone ? t.veriffProceed : t.veriffUnderstood}
          </button>
        </div>
      </div>
    </div>
  );
}

void VeriffModalScreen;
void VeriffSuccessOverlay;


type JumioStrings = {
  jumioStartTitle: string; jumioStartDesc: string; jumioStartBullets: string[];
  jumioNext: string; jumioUploadCardTitle: string; jumioUploadCardDesc: string;
  jumioCaptureImage: string; jumioUploadFile: string;
  jumioPageUploaded: string; jumioProcessingTitle: string; jumioFinishing: string;
};

type JumioStep = "start" | "upload" | "scan" | "processing";

function JumioLogo() {
  return (
    <svg width="72" height="22" viewBox="0 0 90 22">
      <text x="0" y="16" fontSize="14" fontWeight="800" fill="#1d2129" fontFamily="system-ui,sans-serif">jumio</text>
      <circle cx="82" cy="11" r="8" fill="#D10005" />
      <path d="M78.5 11l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function JumioPaymentModal({ t, onClose, onComplete }: {
  t: JumioStrings; onClose: () => void; onComplete: () => void;
}) {
  const [step, setStep] = useState<JumioStep>("start");
  const [frontUploaded, setFrontUploaded] = useState(false);

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => { onComplete(); }, 2200);
    return () => clearTimeout(timer);
  }, [step, onComplete]);

  if (step === "processing") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white">
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{ background: "#22c55e", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <h2 className="text-[18px] font-bold text-[#1d2129] mb-1">{t.jumioProcessingTitle}</h2>
        <p className="text-[13px] text-[#8a9099]">{t.jumioFinishing}</p>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
          <button onClick={() => setStep("upload")} className="flex h-8 w-8 items-center justify-center text-[#5c626b]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <JumioLogo />
          <div className="w-8" />
        </div>

        <div className="px-5 pt-2 pb-3 shrink-0 border-b border-[#e5e8ec]">
          <h2 className="text-[16px] font-bold text-[#1d2129]">{t.jumioUploadCardTitle}</h2>
          <p className="text-[11px] text-[#5c626b] mt-0.5 leading-relaxed">{t.jumioUploadCardDesc}</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 gap-4">
          {/* Front card slot */}
          <button
            onClick={() => setFrontUploaded(true)}
            className="w-full h-36 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-colors"
            style={{ borderColor: frontUploaded ? "#22c55e" : "#e5e8ec", background: frontUploaded ? "#f0fdf4" : "#f9fafb" }}
          >
            {frontUploaded ? (
              <>
                <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#22c55e" /><path d="M8 14l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <span className="text-[12px] font-semibold text-[#22c55e]">Front uploaded</span>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                <span className="text-[12px] text-[#8a9099]">Front of card</span>
              </>
            )}
          </button>
          {/* Back card slot */}
          <div className="w-full h-36 rounded-xl border-2 border-dashed border-[#e5e8ec] bg-[#f9fafb] flex flex-col items-center justify-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.5"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
            <span className="text-[12px] text-[#8a9099]">Back of card</span>
          </div>

          {frontUploaded && (
            <p className="text-[12px] font-semibold text-[#22c55e]">{t.jumioPageUploaded}</p>
          )}
        </div>

        <div className="shrink-0 px-5 pb-8 pt-3">
          <button
            onClick={() => { if (frontUploaded) setStep("processing"); }}
            className="w-full rounded-xl py-4 text-[15px] font-bold text-white transition-opacity"
            style={{ background: "#22c55e", opacity: frontUploaded ? 1 : 0.45 }}
          >
            {t.jumioNext}
          </button>
          <p className="mt-2 text-center text-[10px] text-[#8a9099]">Powered by <span className="font-bold">Jumio</span></p>
        </div>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
          <button onClick={() => setStep("start")} className="flex h-8 w-8 items-center justify-center text-[#5c626b]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <JumioLogo />
          <div className="w-8" />
        </div>

        <div className="px-5 pt-2 pb-3 shrink-0 border-b border-[#e5e8ec]">
          <h2 className="text-[16px] font-bold text-[#1d2129]">{t.jumioUploadCardTitle}</h2>
          <p className="text-[11px] text-[#5c626b] mt-0.5 leading-relaxed">{t.jumioUploadCardDesc}</p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 gap-3">
          <button
            onClick={() => setStep("scan")}
            className="flex items-center gap-4 rounded-xl border border-[#e5e8ec] bg-white px-4 py-4 text-left shadow-sm active:bg-[#f9fafb]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f5f7]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="1.7"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </div>
            <span className="text-[14px] font-semibold text-[#1d2129]">{t.jumioCaptureImage}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" className="ml-auto"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button
            onClick={() => setStep("scan")}
            className="flex items-center gap-4 rounded-xl border border-[#e5e8ec] bg-white px-4 py-4 text-left shadow-sm active:bg-[#f9fafb]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f5f7]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="1.7"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
            </div>
            <span className="text-[14px] font-semibold text-[#1d2129]">{t.jumioUploadFile}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" className="ml-auto"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div className="shrink-0 px-5 pb-8 pt-3">
          <p className="text-center text-[10px] text-[#8a9099]">Powered by <span className="font-bold">Jumio</span></p>
        </div>
      </div>
    );
  }

  /* step === "start" */
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <div className="w-8" />
        <JumioLogo />
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-3 overflow-y-auto">
        {/* Globe icon */}
        <div className="flex justify-center mb-5">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="#e8f4fd" stroke="#bee3f8" strokeWidth="1.5" />
            <ellipse cx="40" cy="40" rx="15" ry="36" fill="none" stroke="#90cdf4" strokeWidth="1.5" />
            <line x1="4" y1="40" x2="76" y2="40" stroke="#90cdf4" strokeWidth="1.5" />
            <path d="M9 24 Q40 32 71 24" fill="none" stroke="#90cdf4" strokeWidth="1.5" />
            <path d="M9 56 Q40 48 71 56" fill="none" stroke="#90cdf4" strokeWidth="1.5" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[#1d2129] mb-2">{t.jumioStartTitle}</h2>
        <p className="text-[13px] leading-relaxed text-[#5c626b] mb-5">{t.jumioStartDesc}</p>
        <ul className="space-y-3">
          {(t.jumioStartBullets as string[]).map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-[13px] text-[#1d2129]">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 px-5 pb-8 pt-4">
        <button
          onClick={() => setStep("upload")}
          className="w-full rounded-xl py-4 text-[15px] font-bold text-white"
          style={{ background: "#22c55e" }}
        >
          {t.jumioNext}
        </button>
        <p className="mt-2 text-center text-[10px] text-[#8a9099]">Powered by <span className="font-bold">Jumio</span></p>
      </div>
    </div>
  );
}

/* ── ProfilePage helpers (defined outside to prevent focus loss on re-render) ── */
type AccordionKey = "accountId" | "personalInfo" | "socialLinks" | "accountVerifications" | "idVerification" | "paymentMethod" | "documentUpload" | "changePassword" | "notifications";

function GreenCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative h-7 w-12 rounded-full transition-colors duration-200"
      style={{ background: on ? "#D10005" : "#d1d5db" }}
    >
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}

function Field({ label, value, onChange, onBlur, half = false, required = false, type = "text", placeholder, valid: validProp, error, onClear, readOnly = false }: {
  label: string; value: string; onChange: (val: string) => void; onBlur?: () => void; half?: boolean; required?: boolean; type?: string; placeholder: string; valid?: boolean; error?: string; onClear?: () => void; readOnly?: boolean;
}) {
  const filled = validProp !== undefined ? validProp : value.trim().length > 0;
  const hasError = !!error && !readOnly;
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">
        {label}{required && <span className="ml-0.5 text-[#D10005]">*</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => { if (!readOnly) onChange(e.target.value); }}
          onBlur={onBlur}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full rounded-lg border py-2.5 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none transition"
          style={{
            paddingLeft: "10px",
            paddingRight: filled || hasError ? "32px" : "10px",
            borderColor: hasError ? "#D10005" : filled ? "#d1d5db" : "#e5e8ec",
            background: readOnly ? "#f5f6f8" : hasError ? "rgba(230,0,18,0.04)" : "white",
            color: readOnly ? "#5c626b" : "#1d2129",
            cursor: readOnly ? "default" : undefined,
          }}
        />
        {filled && !hasError && !readOnly && <span className="absolute right-2"><GreenCheck /></span>}
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

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className="w-full">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••"
        className="w-full rounded-lg border border-[#e5e8ec] py-2.5 pl-3 text-[13px] text-[#1d2129] outline-none"
      />
    </div>
  );
}

/* ── PhoneVerifyModal ────────────────────────────────────────────────── */
function PhoneVerifyModal({ lang, phone, onClose, onVerified }: {
  lang: Lang; phone: string; onClose: () => void; onVerified: () => void;
}) {
  const t = STR[lang];
  const [view, setView] = useState<"otp" | "success">("otp");
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

  useEffect(() => {
    if (view !== "success") return;
    const id = setTimeout(() => onVerified(), 3000);
    return () => clearTimeout(id);
  }, [view]);

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
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full rounded-t-3xl bg-white shadow-2xl" style={{ maxHeight: "85vh", overflowY: "auto" }}>
        {/* Handle + close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-7" />
          <div className="h-1 w-10 rounded-full bg-[#e5e8ec]" />
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f6f8]">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1l-10 10" stroke="#8a9099" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        {view === "otp" ? (
          <div className="px-5 pb-8 pt-2">
            <h2 className="text-center text-[20px] font-extrabold text-[#1d2129]">{t.authOtpTitle as string}</h2>
            <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5c626b]">
              {t.authOtpBodyPre as string}
              {(t.authOtpBodyPre as string) && <br />}
              <span className="font-semibold text-[#1d2129]">{phone}</span>
              {t.authOtpBodyPost as string}
            </p>
            <p className="mt-4 text-center text-[12px] font-semibold text-[#1d2129]">
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
              onClick={() => { if (allFilled) setView("success"); }}
              disabled={!allFilled}
              className="mt-5 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
              style={{ background: "#D10005", opacity: allFilled ? 1 : 0.45 }}
            >
              {t.authOtpAuthenticate as string}
            </button>
            <button
              onClick={handleResend}
              disabled={!canResend}
              className="mt-3 w-full rounded-xl border border-[#e5e8ec] bg-white py-3 text-[13px] font-semibold text-[#5c626b]"
              style={{ opacity: canResend ? 1 : 0.45 }}
            >
              {t.authOtpResend as string}
            </button>
            <button onClick={onClose} className="mt-3 w-full text-center text-[13px] font-bold text-[#D10005] underline">
              {t.authOtpChangePhone as string}
            </button>
          </div>
        ) : (
          /* Success view */
          <div className="flex flex-col items-center px-5 pb-10 pt-4">
            <style>{`
              @keyframes pvm-scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
              @keyframes pvm-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div className="relative mt-4">
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ animation: "pvm-scale-in 0.35s ease-out" }}>
                <rect x="22" y="6" width="56" height="88" rx="10" fill="#f0f4ff" stroke="#c7d2fe" strokeWidth="2" />
                <rect x="28" y="18" width="44" height="56" rx="4" fill="#dbeafe" />
                <rect x="40" y="10" width="20" height="4" rx="2" fill="#c7d2fe" />
                <circle cx="50" cy="94" r="3.5" fill="#c7d2fe" />
                <rect x="34" y="38" width="5" height="18" rx="2" fill="#3b82f6" opacity="0.5" />
                <rect x="43" y="31" width="5" height="25" rx="2" fill="#3b82f6" opacity="0.75" />
                <rect x="52" y="25" width="5" height="31" rx="2" fill="#3b82f6" />
                <rect x="61" y="34" width="5" height="22" rx="2" fill="#3b82f6" opacity="0.6" />
              </svg>
              <div className="absolute -bottom-2 -right-3" style={{ animation: "pvm-scale-in 0.4s ease-out 0.25s both" }}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="17" fill="#22c55e" />
                  <path d="M10 18l6 6 10-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>
            <h3 className="mt-7 text-center text-[22px] font-extrabold text-[#1d2129]" style={{ animation: "pvm-fade-up 0.4s ease-out 0.3s both" }}>
              {t.profilePhoneVerifySuccess as string}
            </h3>
          </div>
        )}

        {toast && (
          <div className="absolute inset-x-4 top-4 z-10 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ProfilePage ─────────────────────────────────────────────────────── */

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

export function ProfilePage({ lang, coins, displayName, onDisplayNameChange, onBack, onOpenStore, kyc, onStartKyc, chrome }: { lang: Lang; coins: number; displayName: string; onDisplayNameChange: (name: string) => void; onBack: () => void; onOpenStore?: () => void; kyc: KycState; onStartKyc: () => void; chrome: ProfilePageChrome }) {
  const t = STR[lang];
  const [open, setOpen] = useState<AccordionKey | null>(null);
  const [accVerifOpen, setAccVerifOpen] = useState(false);

  // Form state
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  type ProfileForm = {
    lastName: string; firstName: string; lastNameKana: string; firstNameKana: string;
    email: string; dob: string; phone: string;
    country: ShippingCountry;
    postalCode: string; prefecture: string; city: string; streetNumber: string; apartment: string;
    cityStreetNumber: string; state: string; zipCode: string;
  };
  const emptyProfileForm = (): ProfileForm => ({
    lastName: "", firstName: "", lastNameKana: "", firstNameKana: "",
    email: "", dob: "", phone: "",
    country: "japan",
    postalCode: "", prefecture: "", city: "", streetNumber: "", apartment: "",
    cityStreetNumber: "", state: "", zipCode: "",
  });
  const [form, setForm] = useState<ProfileForm>(() => {
    const empty = emptyProfileForm();
    try {
      const saved = sessionStorage.getItem("profileForm");
      if (saved) return { ...empty, ...JSON.parse(saved) } as ProfileForm;
      const authStr = sessionStorage.getItem("authData");
      if (authStr) {
        const auth = JSON.parse(authStr);
        const country: ShippingCountry = auth.country === "US" || auth.country === "usa" ? "usa" : "japan";
        return { ...empty, email: auth.email || "", dob: auth.dob || "", phone: auth.phone || "", country };
      }
    } catch {}
    return empty;
  });
  const [infoSaved, setInfoSaved] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [postalTouched, setPostalTouched] = useState(false);
  const [zipTouched, setZipTouched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<{ prefecture: string; city: string; streetNumber: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(() => {
    try {
      const authStr = sessionStorage.getItem("authData");
      if (authStr) { const auth = JSON.parse(authStr); return !!auth.phoneVerified; }
    } catch {}
    return false;
  });
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [connectedSocials] = useState<Record<string, boolean>>(() => {
    try {
      const authStr = sessionStorage.getItem("authData");
      if (authStr) {
        const auth = JSON.parse(authStr);
        return { LINE: !!auth.lineId, Google: !!auth.googleId };
      }
    } catch {}
    return { LINE: false, Google: false };
  });
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const phoneValid = form.phone.length === 10;
  const postalValid = /^\d{3}-\d{4}$/.test(form.postalCode);
  const zipValid = /^\d{5}$/.test(form.zipCode);
  const phoneError = phoneTouched && form.phone.length > 0 && !phoneValid ? "Phone number must be 10 digits" : "";
  const postalError = postalTouched && form.postalCode.length > 0 && !postalValid ? "NNN-NNNN" : "";
  const zipError = zipTouched && form.zipCode.length > 0 && !zipValid ? "5 digits required" : "";
  const addressValid = form.country === "japan"
    ? postalValid && !!form.prefecture && form.city.trim().length > 0
    : form.cityStreetNumber.trim().length > 0 && !!form.state && zipValid;
  const canSave = !!(emailValid && form.dob && addressValid && (form.phone.length === 0 || phoneValid));
  const countryLabel = form.country === "usa" ? t.shippingUSA : t.shippingJapan;
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState("");
  const [paymentCardNumber, setPaymentCardNumber] = useState("");
  const [showJumioModal, setShowJumioModal] = useState(false);
  const [verifiedCards, setVerifiedCards] = useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = useState({ old: "", newPw: "", repeat: "" });
  const [pwChanged, setPwChanged] = useState(false);
  const [prefs, setPrefs] = useState({ email: true, push: false, sms: false });
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [showDocUploadPage, setShowDocUploadPage] = useState(false);
  const [docHistory, setDocHistory] = useState<DocHistoryEntry[]>([]);

  function toggle(key: AccordionKey) {
    setOpen((prev) => (prev === key ? null : key));
  }

  function setField(field: keyof typeof form, val: string) {
    setForm((f) => {
      const updated = { ...f, [field]: val };
      try { sessionStorage.setItem("profileForm", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setInfoSaved(false);
  }

  function persistForm(updater: (f: ProfileForm) => ProfileForm) {
    setForm((f) => {
      const updated = updater(f);
      try { sessionStorage.setItem("profileForm", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setInfoSaved(false);
  }

  function genProfileCandidates(postal: string): { prefecture: string; city: string; streetNumber: string }[] {
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

  function chooseProfileCandidate(c: { prefecture: string; city: string; streetNumber: string }) {
    persistForm((f) => ({ ...f, prefecture: c.prefecture, city: c.city, streetNumber: c.streetNumber }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setCandidates([]);
    setSearching(false);
  }

  function setPostalCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    persistForm((f) => ({ ...f, postalCode: formatted }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (digits.length >= 3) {
      setSearching(true);
      setCandidates([]);
      searchTimer.current = setTimeout(() => {
        setCandidates(genProfileCandidates(formatted));
        setSearching(false);
      }, 900);
    } else {
      setSearching(false);
      setCandidates([]);
    }
  }

  const formatDob = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (lang === "ja") return `${y}年${Number(m)}月${Number(d)}日`;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  };

  function handleInfoSave() {
    if (!canSave) return;
    setInfoSaved(true);
  }

  const socialProviders = [
    { name: "LINE", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#06C755" /><text x="20" y="27" textAnchor="middle" fontSize="20" fill="white" fontWeight="bold">L</text></svg> },
    { name: "Google", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="white" stroke="#e5e8ec" strokeWidth="1.5" /><text x="20" y="27" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#4285F4">G</text></svg> },
    { name: "Facebook", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#1877F2" /><text x="20" y="28" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">f</text></svg> },
    { name: "Apple", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#1d2129" /><text x="20" y="27" textAnchor="middle" fontSize="18" fill="white"></text></svg> },
  ];

  type SectionDef = { key: AccordionKey; label: string; required?: boolean; badge?: { label: string; bg: string }; content: ReactNode };

  const sections: SectionDef[] = [
    {
      key: "accountId",
      label: t.profileAccountId,
      content: (
        <div className="px-4 pb-4">
          <p className="mb-3 text-[13px] font-semibold text-[#8a9099]">xxxxxx</p>
          <div className="flex justify-center mb-4">
            <CrownEmblem size={72} />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profileDisplayName}<span className="ml-0.5 text-[#D10005]">*</span></label>
            <div className="relative flex items-center">
              <input
                value={displayName}
                onChange={(e) => { onDisplayNameChange(e.target.value); setDisplayNameSaved(false); }}
                placeholder={t.profilePlaceholder}
                className="w-full rounded-lg border border-[#e5e8ec] py-2.5 pl-3 pr-9 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
              />
              {displayName.trim() && <span className="absolute right-2"><GreenCheck /></span>}
            </div>
          </div>
          <button
            onClick={() => setDisplayNameSaved(true)}
            className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white transition"
            style={{ background: displayNameSaved ? "#22c55e" : "#D10005" }}
          >
            {displayNameSaved ? t.profileSaved : t.profileSave}
          </button>
        </div>
      ),
    },
    {
      key: "personalInfo",
      label: t.profilePersonalInfo,
      content: (
        <div className="px-4 pb-4">
          <div>
            <Field label={t.profileEmail} value={form.email} onChange={() => {}} required type="email" placeholder={t.profilePlaceholder} valid={form.email.length > 0 && emailValid} readOnly />
          </div>
          <div className="mt-2">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profileDob}</label>
            <button
              type="button"
              onClick={() => setShowDobPicker(true)}
              className="relative w-full rounded-lg border py-2.5 text-left text-[13px] outline-none transition"
              style={{ paddingLeft: "36px", paddingRight: form.dob ? "32px" : "10px", borderColor: form.dob ? "#d1d5db" : "#e5e8ec", background: "white" }}
            >
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </span>
              <span className={form.dob ? "text-[#1d2129]" : "text-[#bbbec4]"}>{form.dob ? formatDob(form.dob) : t.profilePlaceholder}</span>
              {form.dob && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2"><GreenCheck /></span>
              )}
            </button>
          </div>
          <div className="mt-2">
            <Field label={t.profilePhone} value={form.phone} onChange={(v) => { setField("phone", v.replace(/\D/g, "").slice(0, 10)); }} onBlur={() => setPhoneTouched(true)} type="tel" placeholder={t.profilePlaceholder} valid={phoneValid && phoneVerified} error={phoneError} />
            {!phoneVerified && (
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => { if (phoneValid) setShowPhoneVerifyModal(true); }}
                  disabled={!phoneValid}
                  className="text-[11px] font-bold underline"
                  style={{ color: phoneValid ? "#D10005" : "#bbbec4" }}
                >
                  {t.profileVerifyPhone as string}
                </button>
              </div>
            )}
          </div>

          {/* Country (read-only) */}
          <div className="mt-2">
            <Field label={t.shippingCountry} value={countryLabel} onChange={() => {}} required placeholder="" readOnly />
          </div>

          {/* Japan address fields */}
          {form.country === "japan" && (
            <>
              <div className="mt-2 flex gap-2">
                <Field label={t.profilePostalCode} value={form.postalCode} onChange={setPostalCode} onBlur={() => setPostalTouched(true)} half required placeholder="NNN-NNNN" valid={postalValid && form.postalCode.length > 0} error={postalError} />
                <PrefectureSelect value={form.prefecture} onChange={(v) => setField("prefecture", v)} label={t.profilePrefecture} lang={lang} />
              </div>
              {!searching && candidates.length === 0 && (
                <p className="mt-1 mb-1 text-[10.5px] text-[#a2a8b0]">{t.postcodeHint}</p>
              )}
              {searching && (
                <div className="mt-1 mb-1 flex items-center gap-2 text-[12px] font-semibold text-[#8a9099]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#D10005]" />
                  {t.searching}
                </div>
              )}
              {!searching && candidates.length > 0 && (
                <div className="mt-1 mb-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.selectAddress}</p>
                  <div className="space-y-2">
                    {candidates.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => chooseProfileCandidate(c)}
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
              <div className="mt-2">
                <Field label={t.profileAddress} value={form.city} onChange={(v) => setField("city", v)} required placeholder={lang === "ja" ? "住所" : "Address"} />
              </div>
              <div className="mt-2">
                <Field label={t.profileAddressLine2} value={form.streetNumber} onChange={(v) => setField("streetNumber", v)} placeholder={lang === "ja" ? "住所2行目（任意）" : "Address line 2 (optional)"} />
              </div>
            </>
          )}

          {/* USA address fields */}
          {form.country === "usa" && (
            <>
              <div className="mt-2">
                <Field label={t.profileAddress} value={form.cityStreetNumber} onChange={(v) => setField("cityStreetNumber", v)} required placeholder="e.g. 123 Main St, Springfield" />
              </div>
              <div className="mt-2">
                <Field label={t.profileAddressLine2} value={form.streetNumber} onChange={(v) => setField("streetNumber", v)} placeholder="Address line 2 (optional)" />
              </div>
              <div className="mt-2">
                <USStateSelect value={form.state} onChange={(v) => setField("state", v)} label={t.shippingState} />
              </div>
              <div className="mt-2">
                <Field label={t.shippingZipCode} value={form.zipCode} onChange={(v) => setField("zipCode", v.replace(/\D/g, "").slice(0, 5))} onBlur={() => setZipTouched(true)} required placeholder="e.g. 90210" valid={zipValid && form.zipCode.length > 0} error={zipError} />
              </div>
            </>
          )}

          <button
            onClick={handleInfoSave}
            disabled={!canSave}
            className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white transition"
            style={{ background: infoSaved ? "#22c55e" : "#D10005", opacity: canSave || infoSaved ? 1 : 0.45 }}
          >
            {infoSaved ? t.profileSaved : t.profileSave}
          </button>
        </div>
      ),
    },
    {
      key: "socialLinks",
      label: t.profileSocialLinks,
      content: (
        <div className="px-4 pb-3 space-y-2">
          {socialProviders.map((p) => {
            const isConnected = !!connectedSocials[p.name];
            return (
              <button
                key={p.name}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                style={{ borderColor: isConnected ? "#22c55e" : "#e5e8ec", background: isConnected ? "#f0fdf4" : "white" }}
              >
                {p.icon}
                {p.name}
                {isConnected && (
                  <span className="ml-auto flex items-center gap-1 text-[12px] font-bold text-[#168a49]">
                    <GreenCheck />
                    {t.profileSocialConnected}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      key: "idVerification",
      label: t.profileIdVerification,
      badge: kyc.poiStatus === "approved" && kyc.poaStatus === "approved"
        ? { label: t.profileVerifVerified, bg: "#22c55e" }
        : { label: t.profileVerifNeeded, bg: "#D10005" },
      content: (
        <div className="px-4 pb-4 space-y-3">
          {/* Step 1 */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileStep1}</p>
            {kyc.poiStatus === "approved" ? (
              <div className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <p className="text-[13px] text-[#1d2129]">{t.profileIdCheckDone}</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-[12px] leading-relaxed text-[#5c626b]">{t.profileStep1Desc}</p>
                <button
                  onClick={onStartKyc}
                  className="w-full rounded-xl py-3 text-[14px] font-bold text-white"
                  style={{ background: "#D10005" }}
                >
                  {kyc.poiStatus === "needsAttention" ? (lang === "ja" ? "本人確認を再試行" : "Retry identity check") : kyc.poiStatus === "inProgress" ? (lang === "ja" ? "審査状況を確認" : "View review status") : t.profileStep1Btn}
                </button>
              </>
            )}
          </div>

          <div className="border-t border-black/[0.06]" />

          {/* Step 2 */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileStep2}</p>
            {kyc.poaStatus === "approved" ? (
              <div className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <p className="text-[13px] text-[#1d2129]">{t.profileAddressCheckDone}</p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[12px] leading-relaxed text-[#5c626b]">{t.profileStep2Desc}</p>
                <ul className="mb-3 space-y-1">
                  {(t.profileStep2Bullets as string[]).map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[12px] text-[#5c626b]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#5c626b]" />{b}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { if (kyc.poiStatus === "approved") onStartKyc(); }}
                  className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity"
                  style={{ background: kyc.poiStatus === "approved" ? "#D10005" : "#d1d5db", cursor: kyc.poiStatus === "approved" ? "pointer" : "not-allowed" }}
                >
                  {kyc.poaStatus === "needsAttention" ? (lang === "ja" ? "住所証明を再提出" : "Resubmit proof of address") : kyc.poaStatus === "inProgress" ? (lang === "ja" ? "審査状況を確認" : "View review status") : t.profileStep2Btn}
                </button>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: t.profilePaymentMethod,
      content: (
        <div className="px-4 pb-4">
          {/* Payment method dropdown */}
          <div className="w-full">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profilePaymentMethodField}<span className="ml-0.5 text-[#D10005]">*</span></label>
            <div className="relative">
              <select
                value={paymentMethodType}
                onChange={(e) => { setPaymentMethodType(e.target.value); setPaymentCardNumber(""); }}
                className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-3 pr-10 text-[13px] text-[#1d2129] outline-none"
              >
                <option value="">{t.profilePlaceholder}</option>
                <option value="card">Card</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
          </div>
          {/* Card number dropdown — shown when card is selected */}
          {paymentMethodType === "card" && (
            <div className="mt-3 w-full">
              <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profileCardNumber}<span className="ml-0.5 text-[#D10005]">*</span></label>
              <div className="relative">
                <select
                  value={paymentCardNumber}
                  onChange={(e) => setPaymentCardNumber(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-3 pr-10 text-[13px] text-[#1d2129] outline-none"
                >
                  <option value="">{t.profileSelectCard}</option>
                  <option value="card1">**** **** **** 1111</option>
                  <option value="card2">**** **** **** 4242</option>
                  <option value="card3">**** **** **** 9876</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
              {paymentCardNumber && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#f4f5f7] px-3 py-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                  <span className="text-[12px] font-semibold text-[#1d2129]">
                    {paymentCardNumber === "card1" ? "****1111" : paymentCardNumber === "card2" ? "****4242" : "****9876"}
                  </span>
                  <span className="ml-auto">
                    <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  </span>
                </div>
              )}
            </div>
          )}
          <ul className="mt-3 space-y-1.5">
            {(t.profilePaymentBullets as string[]).map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-[#5c626b]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5c626b]" />
                {bullet}
              </li>
            ))}
          </ul>
          {paymentCardNumber && verifiedCards[paymentCardNumber] && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#22c55e]" />
              <span className="text-[12px] font-semibold text-[#22c55e]">{t.profileVerifiedCard}</span>
            </div>
          )}
          <button
            onClick={() => {
              const canSubmit = paymentMethodType && (paymentMethodType !== "card" || paymentCardNumber) && !verifiedCards[paymentCardNumber];
              if (canSubmit) setShowJumioModal(true);
            }}
            className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity"
            style={{ background: "#D10005", opacity: (paymentMethodType && (paymentMethodType !== "card" || paymentCardNumber) && !verifiedCards[paymentCardNumber]) ? 1 : 0.5, cursor: verifiedCards[paymentCardNumber] ? "not-allowed" : "pointer" }}
          >
            {t.profileSubmitProof}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8a9099]">{t.profileKycNote}</p>
        </div>
      ),
    },
    {
      key: "documentUpload",
      label: t.profileDocumentUpload,
      content: (
        <div className="px-4 pb-4">
          <p className="mb-3 text-[12px] leading-relaxed text-[#5c626b]">{t.profileDocumentNote}</p>
          <button
            onClick={() => setShowDocUploadPage(true)}
            className="w-full rounded-xl py-3 text-[14px] font-bold text-white"
            style={{ background: "#D10005" }}
          >
            {t.profileDocumentUploadBtn}
          </button>
        </div>
      ),
    },
    {
      key: "changePassword",
      label: t.profileChangePassword,
      content: (
        <div className="px-4 pb-4 space-y-3">
          <PwField label={t.profileOldPassword} value={passwords.old} onChange={(v) => { setPasswords((p) => ({ ...p, old: v })); setPwChanged(false); }} />
          <PwField label={t.profileNewPassword} value={passwords.newPw} onChange={(v) => { setPasswords((p) => ({ ...p, newPw: v })); setPwChanged(false); }} />
          <PwField label={t.profileRepeatPassword} value={passwords.repeat} onChange={(v) => { setPasswords((p) => ({ ...p, repeat: v })); setPwChanged(false); }} />
          <button
            onClick={() => { if (passwords.newPw && passwords.newPw === passwords.repeat) { setPwChanged(true); setPasswords({ old: "", newPw: "", repeat: "" }); } }}
            className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition"
            style={{ background: pwChanged ? "#22c55e" : "#D10005" }}
          >
            {pwChanged ? t.profileSaved : t.profileChangePasswordBtn}
          </button>
        </div>
      ),
    },
    {
      key: "notifications",
      label: t.profileNotifications,
      content: (
        <div className="px-4 pb-4 space-y-3">
          {([["email", t.profileEmailPref], ["push", t.profilePushPref], ["sms", t.profileSmsPref]] as [keyof typeof prefs, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#1d2129]">{label}</span>
              <Toggle on={prefs[key]} onToggle={() => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setPrefsSaved(false); }} />
            </div>
          ))}
          <button
            onClick={() => setPrefsSaved(true)}
            className="mt-1 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-colors"
            style={{ background: prefsSaved ? "#22c55e" : "#D10005" }}
          >
            {prefsSaved ? t.profileSaved : t.profileSave}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]" style={{ position: "relative" }}>
      {/* Phone verification modal */}
      {showPhoneVerifyModal && (
        <PhoneVerifyModal
          lang={lang}
          phone={form.phone}
          onClose={() => setShowPhoneVerifyModal(false)}
          onVerified={() => {
            setPhoneVerified(true);
            setShowPhoneVerifyModal(false);
            try {
              const authStr = sessionStorage.getItem("authData");
              const auth = authStr ? JSON.parse(authStr) : {};
              sessionStorage.setItem("authData", JSON.stringify({ ...auth, phone: form.phone, phoneVerified: true }));
            } catch {}
          }}
        />
      )}
      {/* Jumio payment verification modal */}
      {showJumioModal && (
        <div className="absolute inset-0 z-50">
          <JumioPaymentModal
            t={t}
            onClose={() => setShowJumioModal(false)}
            onComplete={() => { setShowJumioModal(false); setVerifiedCards((prev) => ({ ...prev, [paymentCardNumber]: true })); }}
          />
        </div>
      )}
      {/* Document upload sub-page */}
      {showDocUploadPage && (
        <div className="absolute inset-0 z-40">
          <DocumentUploadPage
            t={t}
            coins={coins}
            onBack={() => setShowDocUploadPage(false)}
            onOpenStore={onOpenStore}
            docHistory={docHistory}
            onAddHistory={(entry) => setDocHistory((h) => [entry, ...h])}
            chrome={chrome}
          />
        </div>
      )}
      {chrome.header}

      {/* Page title row */}
      <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center text-[#D10005]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#D10005" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[16px] font-bold text-[#1d2129]">{t.profileTitle}</h1>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sections.filter((s) => !["idVerification", "paymentMethod", "documentUpload"].includes(s.key)).map((sec) => (
          <div key={sec.key} className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <button
              onClick={() => toggle(sec.key)}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
            >
              <span className="flex-1 text-[14px] font-semibold text-[#1d2129]">{sec.label}</span>
              {sec.badge && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: sec.badge.bg }}>{sec.badge.label}</span>
              )}
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"
                className="shrink-0 transition-transform"
                style={{ transform: open === sec.key ? "rotate(180deg)" : "none" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open === sec.key && <div className="border-t border-black/[0.06] pt-3">{sec.content}</div>}
          </div>
        ))}
        {/* Account Verifications group */}
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <button
            onClick={() => setAccVerifOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
          >
            <span className="flex-1 text-[14px] font-semibold text-[#1d2129]">{t.profileAccountVerifications}</span>
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"
              className="shrink-0 transition-transform"
              style={{ transform: accVerifOpen ? "rotate(180deg)" : "none" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {accVerifOpen && (
            <div className="border-t border-black/[0.06] pt-2 pb-2 px-3 space-y-2">
              {sections.filter((s) => ["idVerification", "paymentMethod", "documentUpload"].includes(s.key)).map((sec) => (
                <div key={sec.key} className="overflow-hidden rounded-xl bg-[#f8f9fa] border border-[#e5e8ec]">
                  <button
                    onClick={() => toggle(sec.key)}
                    className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
                  >
                    <span className="flex-1 text-[13px] font-semibold text-[#1d2129]">{sec.label}</span>
                    {sec.badge && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: sec.badge.bg }}>{sec.badge.label}</span>
                    )}
                    <svg
                      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"
                      className="shrink-0 transition-transform"
                      style={{ transform: open === sec.key ? "rotate(180deg)" : "none" }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {open === sec.key && <div className="border-t border-black/[0.06] pt-3 bg-white">{sec.content}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowDobPicker(false)}
                        onConfirm={(iso) => { setField("dob", iso); setShowDobPicker(false); }} />
      )}
    </div>
  );
}

