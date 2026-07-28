"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import type { Lang } from "../lib/types";
import { STR, type Dict } from "../lib/i18n";

function GreenCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function AuthHeader({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  return (
    <header className="flex shrink-0 items-center justify-between bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.10)]">
      <img src="/oripa-logo-full.png" alt="オリパロット" className="h-8 w-auto shrink-0" />
      <div className="flex items-center gap-2">
        <button onClick={onSignUp} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#D10005" }}>{t.authSignUp}</button>
        <button onClick={onLogin} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#f59e0b" }}>{t.authLogin}</button>
      </div>
    </header>
  );
}


export function GoogleAuthIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function LineAuthIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="8" fill="#06C755" />
      <text x="20" y="28" textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">L</text>
    </svg>
  );
}

export function AuthSocialButtons({ signUp, t, onApple, onGoogle, onLine }: { signUp: boolean; t: Dict; onApple?: () => void; onGoogle?: () => void; onLine?: () => void }) {
  const appleLabel = signUp ? t.authSignUpApple : t.authLoginApple;
  const googleLabel = signUp ? t.authSignUpGoogle : t.authLoginGoogle;
  const lineLabel = signUp ? t.authSignUpLine : t.authLoginLine;

  if (!signUp) {
    const cardClass = "flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-[#e5e8ec] bg-white py-4 text-[13px] font-bold text-[#1d2129]";
    return (
      <div>
        <p className="mb-2.5 text-center text-[13px] font-bold text-[#1d2129]">{t.authLoginSocial as string}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onLine} className={cardClass}>
            <LineAuthIcon size={26} />
            <span>LINE</span>
          </button>
          <button type="button" onClick={onGoogle} className={cardClass}>
            <GoogleAuthIcon size={26} />
            <span>Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {onApple && (
        <button onClick={onApple} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d2129"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
          {appleLabel}
        </button>
      )}
      <button onClick={onGoogle} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <GoogleAuthIcon />
        {googleLabel}
      </button>
      <button onClick={onLine} className="relative flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#06C755] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <LineAuthIcon />
        {lineLabel}
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold text-white" style={{ background: "#06C755" }}>
          {t.authPreferredTag}
        </span>
      </button>
    </div>
  );
}

type GoogleAuthStep = "picker" | "permissions" | "processing" | "details";
type GoogleSignupDetails = {
  email: string;
  displayName: string;
  country: "JP" | "US";
  invite?: string;
  consentAccepted: true;
  consentedAt: string;
};
export type SocialAuthDetails = Partial<GoogleSignupDetails> & Pick<GoogleSignupDetails, "email" | "displayName"> & {
  lineOfficialAccountFriend?: boolean;
};

type EmailReviewVariant = "reset" | "setPassword";

const GOOGLE_LOGO = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export function GoogleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: (details?: SocialAuthDetails) => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<GoogleAuthStep>("picker");
  const [selectedAccount, setSelectedAccount] = useState<0 | 1 | 2 | null>(null);
  const [country, setCountry] = useState<AuthCountryCode>("JP");
  const [invite, setInvite] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);

  const accounts = [
    { name: t.authGoogleAccount1Name as string, email: t.authGoogleAccount1Email as string, initials: (t.authGoogleAccount1Name as string).charAt(0), color: "#4285F4" },
    { name: t.authGoogleAccount2Name as string, email: t.authGoogleAccount2Email as string, initials: (t.authGoogleAccount2Name as string).charAt(0), color: "#8e24aa" },
    { name: t.authGoogleOtherAccountName as string, email: signUp ? "" : DEMO_EXISTING_EMAIL, initials: "G", color: "#5f6368" },
  ];
  const selectedLoginEmail = accounts[selectedAccount ?? 0].email;
  const selectedLoginName = accounts[selectedAccount ?? 0].name;

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => {
      if (signUp) {
        setStep("details");
      } else {
        onSuccess({ email: selectedLoginEmail, displayName: selectedLoginName });
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [step, signUp, onSuccess, selectedLoginEmail, selectedLoginName]);

  const detailsValid = consentAccepted && selectedAccount !== null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ animation: "googleScreenSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }}>
      <style>{`
        @keyframes googleScreenSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes googleSpinnerRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

        {/* ── COMPLETE SIGNUP ── */}
        {step === "details" && selectedAccount !== null && (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black/55 px-4 py-5">
            <div className="max-h-full w-full overflow-y-auto rounded-2xl bg-white px-5 py-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-[#e5e8ec] pb-4">
                <div>
                  <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.authGoogleDetailsTitle as string}</h2>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#5c626b]">{t.authGoogleDetailsBody as string}</p>
                </div>
                <button type="button" onClick={onClose} aria-label={t.authGoogleCancel as string} className="text-[20px] text-[#8a9099]">×</button>
              </div>

              <div className="mt-4 space-y-4">
                <SignupCountryField lang={lang} country={country} onChange={setCountry} />
                <SignupReferralField lang={lang} invite={invite} onChange={setInvite} />
                <SignupConsentField
                  lang={lang}
                  checked={consentAccepted}
                  onChange={setConsentAccepted}
                  showError={!consentAccepted}
                />
              </div>

              <button
                type="button"
                disabled={!detailsValid}
                onClick={() => {
                  if (!detailsValid) return;
                  onSuccess({
                    email: accounts[selectedAccount].email,
                    displayName: accounts[selectedAccount].name,
                    country,
                    invite: invite || undefined,
                    consentAccepted: true,
                    consentedAt: new Date().toISOString(),
                  });
                }}
                className="mt-5 w-full rounded-xl py-3.5 text-[14px] font-bold text-white"
                style={{ background: "#D10005", opacity: detailsValid ? 1 : 0.45 }}
              >
                {t.authGoogleCompleteSignup as string}
              </button>
            </div>
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
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#dadce0] px-5">
              {GOOGLE_LOGO}
              <span className="text-[15px] font-medium text-[#3c4043]">{t.authGoogleSignInHeader as string}</span>
              <button onClick={onClose} aria-label={t.authGoogleCancel as string} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[18px] text-[#5f6368] hover:bg-[#f1f3f4]">✕</button>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-8">
              <h2 className="text-[27px] font-normal leading-tight text-[#202124]">{t.authGooglePermissionsTitle as string}</h2>

              <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#dadce0] px-2.5 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: accounts[selectedAccount].color }}>
                  {accounts[selectedAccount].initials}
                </div>
                <span className="truncate text-[12px] font-medium text-[#3c4043]">
                  {accounts[selectedAccount].email || accounts[selectedAccount].name}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                  <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <p className="mt-7 text-[14px] leading-relaxed text-[#3c4043]">{t.authGooglePermissionsBody as string}</p>

              <div className="mt-5 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#3c4043]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#3c4043]">{accounts[selectedAccount].name}</p>
                    <p className="mt-0.5 text-[12px] text-[#5f6368]">{t.authGooglePermissionItem1 as string}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#3c4043]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
                    </svg>
                  </div>
                  <div>
                    <p className="break-all text-[13px] font-medium text-[#3c4043]">
                      {accounts[selectedAccount].email || t.authGoogleOtherAccountName as string}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#5f6368]">{t.authGooglePermissionItem2 as string}</p>
                  </div>
                </div>
              </div>

              <p className="mt-7 text-[11px] leading-relaxed text-[#5f6368]">
                {t.authGooglePrivacyReview as string}
              </p>
              <p className="mt-4 text-[11px] leading-relaxed text-[#5f6368]">
                {t.authGoogleManageAccess as string}
              </p>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-[#f1f3f4] px-5 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-[#dadce0] py-2.5 text-[12px] font-semibold text-[#1a73e8]"
              >
                {t.authGoogleCancel as string}
              </button>
              <button
                onClick={() => setStep("processing")}
                className="flex-1 rounded-full border border-[#dadce0] py-2.5 text-[12px] font-semibold text-[#1a73e8]"
              >
                {t.authGoogleContinue as string}
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT PICKER ── */}
        {step === "picker" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#dadce0] px-5">
              {GOOGLE_LOGO}
              <span className="text-[15px] font-medium text-[#3c4043]">{t.authGoogleSignInHeader as string}</span>
              <button onClick={onClose} aria-label={t.authGoogleCancel as string} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[18px] text-[#5f6368] hover:bg-[#f1f3f4]">✕</button>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-8">
              <h2 className="text-[30px] font-normal leading-tight text-[#202124]">{t.authGooglePickerTitle as string}</h2>
              <p className="mt-3 text-[15px] text-[#3c4043]">{t.authGooglePickerSubtitle as string}</p>

              <div className="mt-8 border-b border-[#dadce0]">
                {accounts.slice(0, 2).map((acc, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedAccount(idx as 0 | 1); setStep("permissions"); }}
                    className="flex w-full items-center gap-3.5 border-t border-[#dadce0] py-4 text-left hover:bg-[#f8f9fa]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: acc.color }}>
                      {acc.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-[#202124]">{acc.name}</p>
                      <p className="mt-0.5 truncate text-[12px] text-[#5f6368]">{acc.email}</p>
                    </div>
                  </button>
                ))}

                <button type="button" onClick={() => { setSelectedAccount(2); setStep("permissions"); }} className="flex w-full items-center gap-3.5 border-t border-[#dadce0] py-4 text-left hover:bg-[#f8f9fa]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5f6368] text-[#5f6368]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-medium text-[#202124]">{t.authGoogleUseAnother as string}</span>
                </button>
              </div>

              <p className="mt-9 text-[11px] leading-relaxed text-[#5f6368]">{t.authGoogleBeforeUsing as string}</p>
            </div>

            <div className="shrink-0 border-t border-[#f1f3f4] px-5 py-3 text-[10px] text-[#5f6368]">
              {t.authGoogleLanguage as string}
            </div>
          </div>
        )}
    </div>
  );
}

type LineAuthStep = "verify" | "processing" | "details";

export function LineAuthSheet({ lang, signUp, onClose, onSuccess, onLogin, loginEmail = DEMO_LINE_ACCOUNT_EMAIL }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: (details?: SocialAuthDetails) => void; onLogin?: () => void; loginEmail?: string;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<LineAuthStep>("verify");
  const [addLineFriend, setAddLineFriend] = useState(false);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [country, setCountry] = useState<AuthCountryCode>("JP");
  const [invite, setInvite] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [showExistingAccount, setShowExistingAccount] = useState(false);

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => {
      if (signUp) setStep("details");
      else onSuccess({ email: loginEmail, displayName: "LINE User" });
    }, 1400);
    return () => clearTimeout(timer);
  }, [step, signUp, onSuccess, loginEmail]);

  const LINE_GREEN = "#06C755";
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const detailsValid = emailValid && consentAccepted;
  const emailError = email.length > 0 && !emailValid ? t.authEmailError as string : "";

  const ToggleOn = () => (
    <div className="relative shrink-0" style={{ width: 44, height: 26, opacity: 0.45 }}>
      <div className="absolute inset-0 rounded-full" style={{ background: LINE_GREEN }} />
      <div className="absolute top-[3px] right-[3px] h-5 w-5 rounded-full bg-white shadow-sm" />
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ animation: "lineScreenSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }}>
      <style>{`
        @keyframes lineScreenSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes lineSpinner { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── COMPLETE SIGNUP ── */}
      {step === "details" && (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/55 px-4 py-5">
          <div className="max-h-full w-full overflow-y-auto rounded-2xl bg-white px-5 py-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#e5e8ec] pb-4">
              <div>
                <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.authGoogleDetailsTitle as string}</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-[#5c626b]">{t.authGoogleDetailsBody as string}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t.authLineCancel as string} className="text-[20px] text-[#8a9099]">×</button>
            </div>

            <div className="mt-4 space-y-4">
              <SignupFormField label={t.authEmailLabel as string} required error={emailTouched ? emailError : ""}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v14H4z" /><path d="m4 7 8 6 8-6" /></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    autoComplete="email"
                    placeholder={t.authEmailPlaceholder as string}
                    className={authFieldCls(!!(emailTouched && emailError))}
                    style={{ paddingLeft: "36px", paddingRight: "14px" }}
                  />
                </div>
              </SignupFormField>
              <SignupCountryField lang={lang} country={country} onChange={setCountry} />
              <SignupReferralField lang={lang} invite={invite} onChange={setInvite} />
              <SignupConsentField
                lang={lang}
                checked={consentAccepted}
                onChange={setConsentAccepted}
                showError={!consentAccepted}
              />
            </div>

            <button
              type="button"
              disabled={!detailsValid}
              onClick={() => {
                setEmailTouched(true);
                if (!detailsValid) return;
                if (email.trim().toLowerCase() === DEMO_EXISTING_EMAIL) {
                  setShowExistingAccount(true);
                  return;
                }
                setShowEmailVerify(true);
              }}
              className="mt-5 w-full rounded-xl py-3.5 text-[14px] font-bold text-white"
              style={{ background: "#D10005", opacity: detailsValid ? 1 : 0.45 }}
            >
              {t.authGoogleCompleteSignup as string}
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {step === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <div style={{ animation: "lineSpinner 0.9s linear infinite", width: 52, height: 52 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="22" stroke="#e5e8ec" strokeWidth="4" />
              <path d="M26 4a22 22 0 0 1 22 22" stroke={LINE_GREEN} strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-5 text-[15px] font-semibold text-[#1d2129]">
            {lang === "ja" ? "サインイン中..." : "Signing in…"}
          </p>
        </div>
      )}

      {/* ── VERIFY SCREEN ── */}
      {step === "verify" && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[17px] font-medium text-[#1d2129]">{t.authLineVerificationTitle as string}</span>
            <button onClick={onClose} className="text-[15px] font-medium text-[#1d2129]">
              {t.authLineCancel as string}
            </button>
          </div>

          <div className="flex flex-col items-center px-5 pb-5 pt-6">
            {/* App logo */}
            <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#e5e8ec] bg-white">
              <img src="/oripa-logo.png" alt="OripaLot" className="h-12 w-12 object-contain" />
            </div>

            {/* App name */}
            <h2 className="text-[18px] font-bold text-[#1d2129]">{t.authLineAppName as string}</h2>

            {/* Provider row */}
            <p className="mt-1 text-[13px] text-[#8a9099]">{t.authLineProvider as string}</p>

            {/* Description */}
            <p className="mt-1.5 text-center text-[12px] text-[#8a9099]">{t.authLineDescription as string}</p>

            {/* Country */}
            <p className="mt-3 text-[13px] text-[#1d2129]">
              <span className="font-bold">{t.authLineCountry as string}</span>{" "}
              {t.authLineCountryValue as string}
            </p>
          </div>

          {signUp && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e5e8ec] bg-white">
                  <img src="/oripa-logo.png" alt="" className="h-9 w-9 object-contain" />
                </div>
                <p className="text-[14px] font-bold text-[#1d2129]">{t.authLineOfficialAccount as string}</p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-[14px] font-bold text-[#1d2129]">{t.authLineAddFriend as string}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={addLineFriend}
                  aria-label={t.authLineAddFriend as string}
                  onClick={() => setAddLineFriend(value => !value)}
                  className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors"
                  style={{ background: addLineFriend ? LINE_GREEN : "#d9dde2" }}
                >
                  <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${addLineFriend ? "right-[3px]" : "left-[3px]"}`} />
                </button>
              </div>

              <p className="mt-3 max-w-[310px] text-[12px] leading-relaxed text-[#8a9099]">
                {(addLineFriend ? t.authLineAddFriendOn : t.authLineAddFriendOff) as string}
              </p>
            </div>
          )}

          {/* Permissions section */}
          <div className="px-5 pb-5">
            <p className="mb-3 text-[13px] font-bold text-[#1d2129]">{t.authLineGrantTitle as string}</p>

            <div className="space-y-0 divide-y divide-[#f0f0f0]">
              {([t.authLinePermission1, t.authLinePermission2, t.authLinePermission3] as string[]).map((perm, i) => (
                <div key={i} className="flex items-center justify-between py-3.5">
                  <span className="text-[14px] text-[#1d2129] pr-4">{perm}</span>
                  <ToggleOn />
                </div>
              ))}
            </div>
          </div>

          {/* Important section */}
          <div className="mx-5 mb-5 border-t border-[#f0f0f0] pt-5">
            <p className="mb-2.5 text-[13px] font-bold text-[#1d2129]">{t.authLineImportantTitle as string}</p>
            <ol className="space-y-2.5 list-none pl-0">
              {([
                t.authLineImportant1,
                t.authLineImportant2,
                t.authLineImportant3,
                t.authLineImportant4,
                t.authLineImportant5,
                t.authLineImportant6,
                t.authLineImportant7,
              ] as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#5c626b]">
                  <span className="shrink-0 font-semibold text-[#1d2129]">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA buttons */}
          <div className="sticky bottom-0 bg-white px-5 pt-3 pb-8 space-y-2 border-t border-[#f0f0f0]">
            <button
              onClick={() => setStep("processing")}
              className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
              style={{ background: LINE_GREEN }}
            >
              {t.authLineAllow as string}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-[14px] font-semibold text-[#5c626b]"
            >
              {t.authLineCancel as string}
            </button>
          </div>
        </div>
      )}

      {showEmailVerify && (
        <EmailVerificationModal
          lang={lang}
          email={email.trim()}
          onExit={onClose}
          onVerified={() => {
            onSuccess({
              email: email.trim(),
              displayName: "LINE User",
              lineOfficialAccountFriend: addLineFriend,
              country,
              invite: invite || undefined,
              consentAccepted: true,
              consentedAt: new Date().toISOString(),
            });
          }}
        />
      )}

      {showExistingAccount && (
        <ExistingAccountModal
          lang={lang}
          method="email"
          value={email}
          showResetPassword={false}
          onLogin={() => { onLogin?.(); }}
          onUseDifferent={() => {
            setShowExistingAccount(false);
            setEmail("");
            setEmailTouched(false);
          }}
        />
      )}
    </div>
  );
}

export function LineLoginRedirectFlow({ lang, onSuccess }: { lang: Lang; onSuccess: () => void }) {
  const t = STR[lang];
  const [step, setStep] = useState<"connecting" | "returning">("connecting");

  useEffect(() => {
    const redirectTimer = setTimeout(() => setStep("returning"), 850);
    const successTimer = setTimeout(onSuccess, 1700);
    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(successTimer);
    };
  }, [onSuccess]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#fafafa] px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9fbf0]">
        <LineAuthIcon size={38} />
      </div>
      <div className="mt-6 h-10 w-10 animate-spin rounded-full border-4 border-[#d9f5e4] border-t-[#06C755]" />
      <p className="mt-5 text-[15px] font-bold text-[#1d2129]">
        {(step === "connecting" ? t.authLineLoginConnecting : t.authLineLoginReturning) as string}
      </p>
    </div>
  );
}

function AuthField({ label, value, onChange, type = "text", icon, valid, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; icon?: ReactNode;
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

const AUTH_COUNTRIES = [
  { code: "JP" as const, flag: "🇯🇵", nameEn: "Japan", nameJa: "日本", dial: "+81" },
  { code: "US" as const, flag: "🇺🇸", nameEn: "United States", nameJa: "アメリカ", dial: "+1" },
];
type AuthCountryCode = (typeof AUTH_COUNTRIES)[number]["code"];
export const DEMO_EXISTING_EMAIL = "existing.user@gmail.com";
const DEMO_EXISTING_PHONE = "9012345678";
const DEMO_GOOGLE_ACCOUNT_EMAILS = new Set([
  "john.doe@gmail.com",
  "john.work@gmail.com",
  "taro.yamada@gmail.com",
  "taro.work@gmail.com",
]);
export const DEMO_LINE_ACCOUNT_EMAIL = "line.user@gmail.com";
export const DEMO_SEON_STEP_UP_EMAIL = "seon.stepup@gmail.com";

function SignupFormField({ label, required, children, hint, error }: {
  label: string; required?: boolean; children: ReactNode; hint?: string; error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {label}{required && <span className="ml-0.5 text-[#D10005]">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-[#8a9099]">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-[#D10005]">{error}</p>}
    </div>
  );
}

function formatPhoneForOtp(dial: string, phone: string) {
  const grouped = phone.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
  return `${dial} ${grouped}`;
}

function authFieldCls(err?: boolean, fullWidth = true) {
  return `${fullWidth ? "w-full " : ""}rounded-xl border bg-white py-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${err ? "border-[#D10005]" : "border-[#e5e8ec]"}`;
}

function PhoneWithDialField({ lang, dialCountry, onDialCountryChange, phone, onPhoneChange, onBlur, error, inputRef }: {
  lang: Lang;
  dialCountry: AuthCountryCode;
  onDialCountryChange: (code: AuthCountryCode) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const t = STR[lang];
  const borderCls = error ? "border-[#D10005]" : "border-[#e5e8ec]";
  return (
    <SignupFormField label={t.authPhoneLabel as string} required error={error}>
      <div className={`flex overflow-hidden rounded-xl border bg-white ${borderCls}`}>
        <select
          value={dialCountry}
          onChange={e => onDialCountryChange(e.target.value as AuthCountryCode)}
          className="shrink-0 border-0 bg-transparent py-3 pl-3 pr-8 text-[14px] font-semibold text-[#1d2129] outline-none appearance-none"
          style={{ minWidth: "96px", maxWidth: "110px" }}
          aria-label={t.authDialCodeLabel as string}
        >
          {AUTH_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
          ))}
        </select>
        <div className="w-px shrink-0 self-stretch bg-[#e5e8ec]" />
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={phone}
          onChange={e => onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          onBlur={onBlur}
          placeholder={t.authPhonePlaceholder as string}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 pl-3 pr-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
          aria-label={t.authPhonePlaceholder as string}
        />
      </div>
    </SignupFormField>
  );
}

function SignupPasswordField({ lang, password, onChange, onBlur, error, showPassword, onToggleShow }: {
  lang: Lang; password: string; onChange: (v: string) => void; onBlur: () => void; error: string;
  showPassword: boolean; onToggleShow: () => void;
}) {
  const t = STR[lang];
  return (
    <SignupFormField label={t.authPasswordLabel as string} required error={error}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
        </span>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={t.authPasswordPlaceholder as string}
          className={authFieldCls(!!error)}
          style={{ paddingLeft: "36px", paddingRight: "40px" }}
        />
        <button type="button" onClick={onToggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {showPassword ? (
              <><path d="M2 2l20 20" /><path d="M10.58 10.58a2 2 0 002.84 2.84" /><path d="M9.88 5.09A10.94 10.94 0 0112 5c7 0 10 7 10 7a18.77 18.77 0 01-4.37 5.11" /><path d="M6.61 6.61A18.8 18.8 0 002 12s3 7 10 7a10.77 10.77 0 004.22-.84" /></>
            ) : (
              <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>
            )}
          </svg>
        </button>
      </div>
    </SignupFormField>
  );
}

function SignupCountryField({ lang, country, onChange }: {
  lang: Lang; country: AuthCountryCode; onChange: (c: AuthCountryCode) => void;
}) {
  const t = STR[lang];
  return (
    <SignupFormField label={t.authCountryLabel as string} required>
      <div className="relative">
        <select
          value={country}
          onChange={e => onChange(e.target.value as AuthCountryCode)}
          className={`${authFieldCls()} appearance-none`}
          style={{ paddingLeft: "14px", paddingRight: "36px" }}
        >
          {AUTH_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {lang === "ja" ? c.nameJa : c.nameEn}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </div>
    </SignupFormField>
  );
}

function SignupReferralField({ lang, invite, onChange }: {
  lang: Lang; invite: string; onChange: (v: string) => void;
}) {
  const t = STR[lang];
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-[#e5e8ec] bg-white">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-[12px] font-semibold text-[#1d2129]">{t.authInviteLabel as string}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a9099"
          strokeWidth="2.4"
          className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-[#e5e8ec] px-3.5 pb-3.5 pt-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16M4 15h16M8 5v14M16 5v14" /></svg>
            </span>
            <input
              value={invite}
              onChange={e => onChange(e.target.value)}
              placeholder={t.authInvitePlaceholder as string}
              className={authFieldCls()}
              style={{ paddingLeft: "36px", paddingRight: "14px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SignupConsentField({ lang, checked, onChange, showError }: {
  lang: Lang; checked: boolean; onChange: (checked: boolean) => void; showError: boolean;
}) {
  const t = STR[lang];
  return (
    <div>
      <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-3 ${showError ? "border-[#D10005] bg-[#fff7f7]" : "border-[#e5e8ec] bg-[#f8f9fa]"}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#D10005]"
        />
        <span className="text-[11px] leading-relaxed text-[#5c626b]">
          {t.authAgreePrefix}
          <span className="font-bold text-[#1d2129] underline">{t.authTermsOfService}</span>
          {t.authAnd}
          <span className="font-bold text-[#1d2129] underline">{t.authPrivacyPolicy}</span>
          {t.authAgreeEnd}
        </span>
      </label>
      {showError && <p className="mt-1 text-[11px] text-[#D10005]">{t.authConsentRequired as string}</p>}
    </div>
  );
}

function EmailReviewModal({
  lang,
  variant,
  onClose,
  onUnderstood,
}: {
  lang: Lang;
  variant: EmailReviewVariant;
  onClose: () => void;
  onUnderstood: () => void;
}) {
  const t = STR[lang];
  const body = variant === "reset" ? t.authForgotReviewBody : t.authPasswordReviewBody;

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="relative w-full max-w-[340px] rounded-[16px] bg-white px-5 pb-5 pt-6 shadow-[0_10px_36px_rgba(0,0,0,0.2)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-[#9ca3af]"
          aria-label={t.authGoogleCancel as string}
        >
          ×
        </button>
        <h2 className="pr-8 text-[20px] font-extrabold leading-tight text-[#1d2129]">{t.authForgotReviewTitle as string}</h2>
        <div className="mt-4 h-px bg-[#ece8e4]" />
        <p className="mt-5 text-left text-[14px] leading-[1.65] text-[#5c626b]">{body as string}</p>
        <button
          type="button"
          onClick={onUnderstood}
          className="mt-6 w-full rounded-xl bg-[#D10005] py-3.5 text-[15px] font-bold text-white"
        >
          {t.authForgotUnderstood as string}
        </button>
      </div>
    </div>
  );
}

function SignupGetStartedButton({ lang, disabled, onClick }: {
  lang: Lang; disabled: boolean; onClick: () => void;
}) {
  const t = STR[lang];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white"
      style={{
        background: disabled ? "#d1d5db" : "linear-gradient(90deg, #14b8a6, #22c55e)",
        opacity: disabled ? 0.85 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c7-7 8-7 15.5-7.5M4.5 16.5l2-2M4.5 16.5l2 2M19.5 9l-2 2M19.5 9l2 2" /></svg>
      {t.authGetStarted as string}
    </button>
  );
}

function AuthOrEmailDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-[#e5e8ec]" />
      <span className="text-[12px] font-medium text-[#8a9099]">{label}</span>
      <div className="h-px flex-1 bg-[#e5e8ec]" />
    </div>
  );
}

function AuthRegisterMethodButtons({ lang, active, onLine, onPhone, onGoogle }: {
  lang: Lang;
  active: "line" | "phone" | "google" | null;
  onLine: () => void;
  onPhone?: () => void;
  onGoogle: () => void;
}) {
  const t = STR[lang];
  const base = "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-[11px] font-bold transition-colors";
  const idle = "border-[#e5e8ec] bg-white text-[#1d2129]";
  const selected = "border-[#2563eb] bg-[#eff6ff] text-[#1d2129] ring-1 ring-[#2563eb]";

  return (
    <div>
      <p className="mb-2.5 text-center text-[13px] font-bold text-[#1d2129]">{t.authRegisterWith as string}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onLine} className={`relative ${base} ${active === "line" ? selected : idle}`}>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: "#06C755" }}>
            {t.authPreferredTag as string}
          </span>
          <LineAuthIcon />
          {t.authCompactLineSignup as string}
        </button>
        {onPhone && (
          <button type="button" onClick={onPhone} className={`${base} ${active === "phone" ? selected : idle}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
            {lang === "ja" ? "電話" : "Phone"}
          </button>
        )}
        <button type="button" onClick={onGoogle} className={`${base} ${active === "google" ? selected : idle}`}>
          <GoogleAuthIcon />
          {t.authCompactGoogleSignup as string}
        </button>
      </div>
    </div>
  );
}

export function PhoneOtpPage({ lang, phone, onBack, onSuccess, onLogin }: {
  lang: Lang; phone: string; onBack: () => void; onSuccess: () => void; onLogin?: () => void;
}) {
  const t = STR[lang];
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const maxAttempts = 5;
  const allFilled = digits.every(d => d.length === 1);
  const locked = attempts >= maxAttempts;
  const expired = timer === 0;
  const canResend = expired || locked;
  const displayError = expired && !locked ? t.authOtpExpired as string : error;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleDigitChange(index: number, value: string) {
    if (locked || expired) return;
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (error) setError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    setDigits(["", "", "", "", "", ""]);
    setTimer(30);
    setAttempts(0);
    setError("");
    inputRefs.current[0]?.focus();
    setToast(t.authOtpToast as string);
    setTimeout(() => setToast(""), 2500);
  }

  function handleVerify() {
    if (!allFilled || expired || locked) return;
    if (digits.join("") !== "123456") {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setError(nextAttempts >= maxAttempts ? t.authOtpLocked as string : t.authOtpInvalid as string);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
      return;
    }
    setError("");
    onSuccess();
  }

  const ss = (timer % 60).toString().padStart(2, "0");

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin ?? onBack} />
      <div className="h-[48px] w-full shrink-0" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-4 mt-4 rounded-2xl border border-[#e5e8ec] bg-white px-5 py-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fde8e8]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2">
              <rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" />
            </svg>
          </div>

          <h2 className="text-center text-[20px] font-extrabold text-[#1d2129]">{t.authOtpTitle as string}</h2>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-[#5c626b]">
            {lang === "ja" ? (
              <><span className="font-semibold text-[#1d2129]">{phone}</span>{t.authOtpBodyPost as string}</>
            ) : (
              <>{t.authOtpBodyPre as string}<br /><span className="font-semibold text-[#1d2129]">{phone}</span></>
            )}
          </p>

          <p className="mt-5 text-center text-[13px] font-semibold text-[#D10005]">
            {t.authOtpExpiry as string} 00:{ss}
          </p>
          <p className="mt-1 text-center text-[11px] font-semibold text-[#5c626b]">
            {t.authOtpDemoHint as string}
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
                disabled={expired || locked}
                className={`h-12 w-10 rounded-xl border bg-white text-center text-[20px] font-bold text-[#1d2129] outline-none focus:border-[#D10005] disabled:bg-[#f0f2f5] ${displayError ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
              />
            ))}
          </div>

          {displayError && <p className="mt-3 text-center text-[12px] font-semibold text-[#D10005]">{displayError}</p>}
          {attempts > 0 && !locked && !expired && (
            <p className="mt-1 text-center text-[11px] text-[#8a9099]">
              {t.authOtpAttempts(maxAttempts - attempts)}
            </p>
          )}

          <button
            onClick={handleVerify}
            disabled={!allFilled || expired || locked}
            className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#D10005", opacity: allFilled && !expired && !locked ? 1 : 0.45 }}
          >
            {t.authOtpAuthenticate as string}
          </button>

          <button
            onClick={handleResend}
            disabled={!canResend}
            className="mt-3 w-full rounded-xl border border-[#e5e8ec] bg-white py-3.5 text-[14px] font-semibold text-[#5c626b]"
            style={{ opacity: canResend ? 1 : 0.55 }}
          >
            {canResend ? (t.authOtpResend as string) : t.authOtpResendWait(timer)}
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
        <div className="absolute inset-x-4 top-20 z-50 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export function EmailVerificationModal({ lang, email, onExit, onVerified }: {
  lang: Lang; email: string; onExit: () => void; onVerified: () => void;
}) {
  const t = STR[lang];
  const [state, setState] = useState<"sent" | "checking" | "expired">("sent");
  const [, setExpiry] = useState(60);
  const [resendWait, setResendWait] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (state !== "sent") return;
    const id = setInterval(() => {
      setExpiry(prev => {
        if (prev <= 1) {
          setState("expired");
          return 0;
        }
        return prev - 1;
      });
      setResendWait(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  function simulateEmailOpen() {
    setState("checking");
    setTimeout(onVerified, 900);
  }

  function resendEmail() {
    if (state === "sent" && resendWait > 0) return;
    setState("sent");
    setExpiry(60);
    setResendWait(10);
    setToast(t.authEmailResent as string);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="relative w-full max-w-[370px] rounded-xl bg-white px-5 py-6 shadow-2xl">
        <button type="button" onClick={onExit} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[24px] text-[#8a9099] hover:bg-[#f5f6f8]" aria-label={t.authGoogleCancel as string}>×</button>
        {state === "sent" && (
          <>
            <img src="/verify-mascot.png" alt="" className="mx-auto h-[175px] w-[175px] object-contain" />
            <h2 className="mt-4 text-center text-[22px] font-extrabold text-[#111]">{t.authVerifyTitle}</h2>
            <p className="mt-3 text-center text-[13px] leading-[1.2] text-[#111]">
              {t.authVerifyBody(email || "HELLO@EMAIL.COM")}
            </p>
            <button type="button" onClick={simulateEmailOpen} className="mt-4 w-full rounded-lg py-2.5 text-[16px] font-bold text-white" style={{ background: "#D10005" }}>
              {t.authOpenEmailApp}
            </button>

            <div className="mt-3 text-center text-[11px] leading-[1.25] text-[#111]">
              <p>{t.authVerifyNote as string}</p>
              {(t.authVerifyBullets as string[]).map(item => <p key={item}>• {item}</p>)}
            </div>

            <div className="mt-3 border-t border-[#d7d7d7] pt-3 text-center text-[9px] font-semibold text-[#3f3f3f]">
              <span>{t.authResendPrompt as string} </span>
              <button
                type="button"
                onClick={resendEmail}
                disabled={resendWait > 0}
                className="underline disabled:opacity-50"
              >
                {resendWait > 0 ? t.authEmailResendWait(resendWait) : t.authResendAction}
              </button>
            </div>
          </>
        )}

        {state === "checking" && (
          <div className="flex flex-col items-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e5e8ec] border-t-[#D10005]" />
            <p className="mt-4 text-center text-[13px] font-semibold text-[#1d2129]">{t.authEmailChecking as string}</p>
          </div>
        )}

        {state === "expired" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fde8e8] text-[28px] font-bold text-[#D10005]">!</div>
            <h2 className="mt-4 text-center text-[18px] font-extrabold text-[#1d2129]">{t.authEmailExpired as string}</h2>
            <button type="button" onClick={resendEmail} className="mt-5 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#D10005" }}>
              {t.authResendEmail}
            </button>
          </>
        )}

        {toast && <div className="absolute inset-x-4 -top-14 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[12px] font-semibold text-white">{toast}</div>}
      </div>
    </div>
  );
}

export function SeonPhoneStepUpModal({ lang, dialCountry, phone, onDialCountryChange, onPhoneChange, onClose, onContinue }: {
  lang: Lang;
  dialCountry: AuthCountryCode;
  phone: string;
  onDialCountryChange: (country: AuthCountryCode) => void;
  onPhoneChange: (phone: string) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const t = STR[lang];
  const [touched, setTouched] = useState(false);
  const phoneValid = phone.length === 10;
  const phoneAlreadyUsed = phone === DEMO_EXISTING_PHONE;
  const phoneError = phoneAlreadyUsed
    ? t.authSeonPhoneUsed as string
    : touched && phone.length > 0 && !phoneValid
      ? t.authPhoneError as string
      : "";
  const canContinue = phoneValid && !phoneAlreadyUsed;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#f5f6f8]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e8ec] bg-white px-4">
        <img src="/oripa-logo.png" alt="OripaLot" className="h-10 w-auto object-contain" />
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[24px] text-[#8a9099]" aria-label={t.authGoogleCancel as string}>×</button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6">
          <h1 className="text-center text-[24px] font-extrabold uppercase leading-tight text-[#1d2129]">{t.authSeonPhoneHeading as string}</h1>

          <div
            className="mt-5 h-36 w-full rounded-xl border border-[#e5e8ec]"
            aria-label="Empty promotional banner"
            style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }}
          />

          <p className="mt-5 text-center text-[14px] leading-relaxed text-[#5c626b]">{t.authSeonPhoneBody as string}</p>

          <div className="mt-6">
            <PhoneWithDialField
              lang={lang}
              dialCountry={dialCountry}
              onDialCountryChange={onDialCountryChange}
              phone={phone}
              onPhoneChange={onPhoneChange}
              onBlur={() => setTouched(true)}
              error={phoneError}
            />
          </div>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => { if (canContinue) onContinue(); }}
            className="mt-5 w-full rounded-xl py-3.5 text-[14px] font-bold text-white"
            style={{ background: "#D10005", opacity: canContinue ? 1 : 0.45 }}
          >
            {t.authSeonPhoneContinue as string}
          </button>

          <p className="mt-4 text-center text-[10px] font-semibold text-[#D10005]">{t.authSeonPhoneDemo as string}</p>
        </div>
      </div>
    </div>
  );
}

export function SeonPhoneOtpPage({ lang, phone, onBack, onExit, onSuccess }: {
  lang: Lang;
  phone: string;
  onBack: () => void;
  onExit: () => void;
  onSuccess: () => void;
}) {
  const t = STR[lang];
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const maxAttempts = 5;
  const allFilled = digits.every(digit => digit.length === 1);
  const locked = attempts >= maxAttempts;
  const expired = timer === 0;
  const displayError = expired && !locked ? t.authOtpExpired as string : error;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(previous => previous - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function updateDigit(index: number, value: string) {
    if (locked || expired) return;
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits(previous => {
      const next = [...previous];
      next[index] = digit;
      return next;
    });
    setError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function verify() {
    if (!allFilled || expired || locked) return;
    if (digits.join("") === "123456") {
      onSuccess();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setError(nextAttempts >= maxAttempts ? t.authOtpLocked as string : t.authOtpInvalid as string);
    setDigits(["", "", "", "", "", ""]);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }

  function resend() {
    setDigits(["", "", "", "", "", ""]);
    setTimer(30);
    setAttempts(0);
    setError("");
    setToast(t.authOtpToast as string);
    setTimeout(() => setToast(""), 2500);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e8ec] bg-white px-4">
        <img src="/oripa-logo.png" alt="OripaLot" className="h-10 w-auto object-contain" />
        <button type="button" onClick={onExit} className="flex h-9 w-9 items-center justify-center rounded-full text-[24px] text-[#8a9099] hover:bg-[#f5f6f8]" aria-label={t.authGoogleCancel as string}>×</button>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="relative rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6">
          {toast && <div className="absolute inset-x-4 top-3 rounded-xl bg-[#1d2129] px-3 py-2 text-center text-[11px] font-semibold text-white">{toast}</div>}
          <h1 className="text-center text-[24px] font-extrabold uppercase leading-tight text-[#1d2129]">{t.authSeonPhoneHeading as string}</h1>
          <div
            className="mt-5 h-36 w-full rounded-xl border border-[#e5e8ec]"
            aria-label="Empty promotional banner"
            style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }}
          />
          <p className="mt-5 text-center text-[14px] leading-relaxed text-[#5c626b]">{t.authSeonPhoneBody as string}</p>

          <p className="mt-5 text-center text-[14px] leading-relaxed text-[#1d2129]">{t.authOtpCodeSentTo(phone)}</p>
          <button type="button" onClick={onBack} className="mx-auto mt-2.5 block rounded-lg border border-[#1d2129] bg-white px-3 py-1.5 text-[11px] font-bold text-[#1d2129]">
            {t.authOtpEditPhone as string}
          </button>

          <h2 className="mt-6 text-center text-[18px] font-extrabold text-[#1d2129]">{t.authOtpEnterCode as string}</h2>
          <div className="mt-4 flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={element => { inputRefs.current[index] = element; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={event => updateDigit(index, event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
                }}
                disabled={expired || locked}
                className={`h-14 w-11 rounded-xl border bg-[#f7f8fa] text-center text-[22px] font-bold text-[#1d2129] outline-none focus:border-[#D10005] disabled:bg-[#f0f2f5] ${displayError ? "border-[#D10005]" : "border-[#d7dbe0]"}`}
              />
            ))}
          </div>

          {displayError && <p className="mt-3 text-center text-[11px] font-semibold text-[#D10005]">{displayError}</p>}
          {attempts > 0 && !locked && !expired && <p className="mt-1 text-center text-[10px] text-[#8a9099]">{t.authOtpAttempts(maxAttempts - attempts)}</p>}

          <p className="mt-4 text-center text-[12px] text-[#5c626b]">
            {t.authOtpDidntGetCode as string}{" "}
            <button type="button" onClick={resend} className="font-bold text-[#1d2129] underline">
              {t.authOtpClickResend as string}
            </button>
          </p>

          <button
            type="button"
            onClick={verify}
            disabled={!allFilled || expired || locked}
            className="mt-5 w-full rounded-xl bg-[#D10005] py-3.5 text-[14px] font-bold text-white"
            style={{ opacity: allFilled && !expired && !locked ? 1 : 0.45 }}
          >
            {t.authOtpSubmitCode as string}
          </button>
          <p className="mt-4 text-center text-[10px] font-semibold text-[#D10005]">{t.authSeonPhoneDemo as string}</p>
        </div>
      </div>
    </div>
  );
}

export function ExistingAccountModal({ lang, method, value, onLogin, onResetPassword, onUseDifferent, showResetPassword = true }: {
  lang: Lang;
  method: "email" | "phone";
  value: string;
  onLogin: () => void;
  onResetPassword?: () => void;
  onUseDifferent: () => void;
  showResetPassword?: boolean;
}) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6">
        <button type="button" onClick={onUseDifferent} className="absolute right-4 top-3 text-[22px] text-[#8a9099]" aria-label="Close">×</button>
        <h2 className="pr-8 text-[21px] font-extrabold text-[#1d2129]">{t.authExistingTitle as string}</h2>
        <div className="my-5 h-px bg-[#e5e8ec]" />
        <p className="text-[14px] leading-relaxed text-[#5c626b]">
          {method === "email" ? t.authExistingBodyEmail(value) : t.authExistingBodyPhone(value)}
        </p>
        <button type="button" onClick={onLogin} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-bold text-white" style={{ background: "#D10005" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
          {t.authExistingLogin as string}
        </button>
        {showResetPassword && onResetPassword && (
          <button type="button" onClick={onResetPassword} className="mt-2.5 w-full rounded-xl border border-[#D10005] bg-white py-3.5 text-[14px] font-bold text-[#D10005]">
            {t.authExistingReset as string}
          </button>
        )}
        <button type="button" onClick={onUseDifferent} className="mt-3 w-full text-center text-[12px] font-bold text-[#5c626b] underline">
          {method === "email" ? t.authExistingDifferentEmail as string : t.authExistingDifferentPhone as string}
        </button>
        <p className="mt-5 text-center text-[12px] text-[#8a9099]">
          {t.authSocialAccountQuestions as string}{" "}
          <a href="mailto:support@oripalot.com" className="font-semibold text-[#D10005] underline">
            {t.authSocialAccountContact as string}
          </a>
        </p>
      </div>
    </div>
  );
}

export function RegistrationExitModal({ lang, onContinue, onQuit, onLogin }: {
  lang: Lang;
  onContinue: () => void;
  onQuit: () => void;
  onLogin: () => void;
}) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#e5e8ec] bg-white px-5 pb-5 pt-6 text-center shadow-2xl">
        <button type="button" onClick={onContinue} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[24px] text-[#8a9099] hover:bg-[#f5f6f8]" aria-label={t.authExitRegistrationContinue as string}>×</button>
        <img src="/welcome-mascot.png" alt="" className="mx-auto h-28 w-28 object-contain" />
        <h2 className="mt-2 text-[20px] font-extrabold leading-tight text-[#1d2129]">{t.authExitRegistrationTitle as string}</h2>
        <div className="mt-4 rounded-xl border-2 border-[#D10005] px-3 py-2.5 text-[13px] font-extrabold text-[#D10005]">
          {t.authExitRegistrationBonus as string}
        </div>
        <button type="button" onClick={onContinue} className="mt-3 w-full rounded-xl bg-[#D10005] py-3.5 text-[14px] font-bold text-white">
          {t.authExitRegistrationContinue as string}
        </button>
        <button type="button" onClick={onQuit} className="mt-3 w-full text-[12px] font-bold text-[#5c626b] underline">
          {t.authExitRegistrationQuit as string}
        </button>
        <div className="mt-4 border-t border-[#e5e8ec] pt-4 text-[11px] text-[#8a9099]">
          <span>{t.authExitRegistrationHaveAccount as string} </span>
          <button type="button" onClick={onLogin} className="font-bold text-[#D10005] underline">{t.authExitRegistrationLogin as string}</button>
        </div>
      </div>
    </div>
  );
}

/* ── SignupPage (email) ───────────────────────────────────────────────── */
export type SignupMethod = "email" | "phone" | "google" | "line";

export function SignupPage({ lang, onLogin, onQuit, onSuccess, initialEmailVerify = false }: {
  lang: Lang; onLogin: () => void; onQuit: () => void; onSuccess: (method: SignupMethod) => void;
  initialEmailVerify?: boolean;
}) {
  const t = STR[lang];

  const [registerMethod, setRegisterMethod] = useState<"line" | "google" | null>(null);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showLineAuth, setShowLineAuth] = useState(false);

  const [country, setCountry] = useState<AuthCountryCode>("JP");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [invite, setInvite] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(initialEmailVerify);
  const [showExistingAccount, setShowExistingAccount] = useState(false);
  const [showExistingReset, setShowExistingReset] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPasswordUpdated, setShowPasswordUpdated] = useState(false);
  const [showSeonPhone, setShowSeonPhone] = useState(false);
  const [showRegistrationExit, setShowRegistrationExit] = useState(false);
  const [seonDialCountry, setSeonDialCountry] = useState<AuthCountryCode>("JP");
  const [seonPhone, setSeonPhone] = useState("");
  const [seonOtpPhone, setSeonOtpPhone] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";
  const baseFieldsValid = emailValid && passwordValid;
  const canSubmit = baseFieldsValid && consentAccepted;
  const requestRegistrationExit = () => setShowRegistrationExit(true);

  function saveAuthAndSuccess(method: SignupMethod, extra: Record<string, unknown>) {
    try {
      sessionStorage.setItem("authData", JSON.stringify({
        ...(method === "email" ? { email, password } : {}),
        country, invite: invite || undefined,
        consentAccepted, consentedAt: new Date().toISOString(), ...extra,
      }));
    } catch {}
    onSuccess(method);
  }

  if (seonOtpPhone) {
    return (
      <div className="relative h-full">
        <SeonPhoneOtpPage
          lang={lang}
          phone={seonOtpPhone}
          onBack={() => {
            setSeonOtpPhone(null);
            setShowSeonPhone(true);
          }}
          onExit={requestRegistrationExit}
          onSuccess={() => {
            setSeonOtpPhone(null);
            saveAuthAndSuccess("email", {
              emailVerified: true,
              phoneVerified: true,
              phone: seonPhone,
              dialCountry: seonDialCountry,
              seonStepUp: true,
            });
          }}
        />
        {showRegistrationExit && (
          <RegistrationExitModal
            lang={lang}
            onContinue={() => setShowRegistrationExit(false)}
            onQuit={onQuit}
            onLogin={onLogin}
          />
        )}
      </div>
    );
  }

  if (showChangePassword) {
    return (
      <ChangePasswordPage
        lang={lang}
        onSuccess={() => {
          setShowChangePassword(false);
          setShowPasswordUpdated(true);
        }}
      />
    );
  }

  if (showPasswordUpdated) {
    return (
      <div className="relative h-full">
        <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin} />
        <PasswordUpdatedModal lang={lang} onLogin={onLogin} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[48px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-4">
          <div className="relative rounded-2xl border border-[#e5e8ec] bg-white px-4 pb-5 pt-12 space-y-4">
            <button type="button" onClick={requestRegistrationExit} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[24px] text-[#8a9099] hover:bg-[#f5f6f8]" aria-label={t.authGoogleCancel as string}>×</button>
            <AuthRegisterMethodButtons
              lang={lang}
              active={registerMethod}
              onLine={() => { setRegisterMethod("line"); setShowLineAuth(true); }}
              onGoogle={() => { setRegisterMethod("google"); setShowGoogleAuth(true); }}
            />

            <AuthOrEmailDivider label={t.authOrUseEmail as string} />

            <SignupFormField label={t.authEmailLabel as string} required error={emailTouched ? emailFieldError : ""}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder={t.authEmailPlaceholder as string}
                  className={authFieldCls(!!(emailTouched && emailFieldError))}
                  style={{ paddingLeft: "36px", paddingRight: "14px" }}
                />
              </div>
            </SignupFormField>

            <SignupPasswordField
              lang={lang}
              password={password}
              onChange={setPassword}
              onBlur={() => setPasswordTouched(true)}
              error={passwordTouched ? passwordError : ""}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword(v => !v)}
            />

            <SignupCountryField lang={lang} country={country} onChange={setCountry} />
            <SignupReferralField lang={lang} invite={invite} onChange={setInvite} />
            <SignupConsentField
              lang={lang}
              checked={consentAccepted}
              onChange={setConsentAccepted}
              showError={baseFieldsValid && !consentAccepted}
            />

            <SignupGetStartedButton
              lang={lang}
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                if (email.trim().toLowerCase() === DEMO_EXISTING_EMAIL) {
                  setShowExistingAccount(true);
                  return;
                }
                setShowEmailVerify(true);
              }}
            />
          </div>

          <p className="mt-4 text-center text-[13px] text-[#5c626b]">
            {t.authHaveAccount}{" "}
            <button type="button" onClick={onLogin} className="font-bold text-[#D10005] underline">{t.authLogInLink}</button>
          </p>
        </div>
      </div>

      {showEmailVerify && (
        <EmailVerificationModal
          lang={lang}
          email={email}
          onExit={requestRegistrationExit}
          onVerified={() => {
            if (email.trim().toLowerCase() === DEMO_SEON_STEP_UP_EMAIL) {
              setShowEmailVerify(false);
              setShowSeonPhone(true);
              return;
            }
            saveAuthAndSuccess("email", { emailVerified: true });
          }}
        />
      )}

      {showSeonPhone && (
        <SeonPhoneStepUpModal
          lang={lang}
          dialCountry={seonDialCountry}
          phone={seonPhone}
          onDialCountryChange={setSeonDialCountry}
          onPhoneChange={setSeonPhone}
          onClose={requestRegistrationExit}
          onContinue={() => {
            const dialMeta = AUTH_COUNTRIES.find(countryOption => countryOption.code === seonDialCountry) ?? AUTH_COUNTRIES[0];
            setShowSeonPhone(false);
            setSeonOtpPhone(formatPhoneForOtp(dialMeta.dial, seonPhone));
          }}
        />
      )}

      {showExistingAccount && !showExistingReset && (
        <ExistingAccountModal
          lang={lang}
          method="email"
          value={email}
          onLogin={onLogin}
          onResetPassword={() => setShowExistingReset(true)}
          onUseDifferent={() => {
            setShowExistingAccount(false);
            setEmail("");
            setEmailTouched(false);
          }}
        />
      )}

      {showExistingReset && (
        <ForgotPasswordModal
          lang={lang}
          initialValue={email}
          onClose={() => setShowExistingReset(false)}
          onBackToLogin={onLogin}
          onLinkOpened={() => {
            setShowExistingReset(false);
            setShowChangePassword(true);
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp
          onClose={requestRegistrationExit}
          onSuccess={(details) => {
            saveAuthAndSuccess("google", {
              googleId: "google_demo_user",
              displayName: details?.displayName ?? t.authGoogleAccount1Name,
              ...details,
            });
            setShowGoogleAuth(false);
          }}
        />
      )}

      {showLineAuth && (
        <LineAuthSheet
          lang={lang}
          signUp
          onClose={requestRegistrationExit}
          onLogin={() => {
            setShowLineAuth(false);
            onLogin();
          }}
          onSuccess={(details) => {
            saveAuthAndSuccess("line", {
              lineId: "line_user",
              displayName: details?.displayName ?? "LINE User",
              ...details,
            });
            setShowLineAuth(false);
          }}
        />
      )}

      {showRegistrationExit && (
        <RegistrationExitModal
          lang={lang}
          onContinue={() => setShowRegistrationExit(false)}
          onQuit={onQuit}
          onLogin={onLogin}
        />
      )}
    </div>
  );
}

/* ── SignupPhonePage ──────────────────────────────────────────────────── */
export function SignupPhonePage({ lang, onLogin, onEmailSignup, onSuccess, initialOtp = false }: {
  lang: Lang; onLogin: () => void; onEmailSignup: () => void; onSuccess: (method: SignupMethod) => void; initialOtp?: boolean;
}) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">(initialOtp ? "otp" : "form");
  const [otpPhone, setOtpPhone] = useState(initialOtp ? "+81 90-1234-5678" : "");
  const [registerMethod, setRegisterMethod] = useState<"line" | "phone" | "google" | null>("phone");
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showLineAuth, setShowLineAuth] = useState(false);

  const [dialCountry, setDialCountry] = useState<AuthCountryCode>("JP");
  const [country, setCountry] = useState<AuthCountryCode>("JP");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [invite, setInvite] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showExistingAccount, setShowExistingAccount] = useState(false);
  const [showExistingReset, setShowExistingReset] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  const dialMeta = AUTH_COUNTRIES.find(c => c.code === dialCountry) ?? AUTH_COUNTRIES[0];
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";
  const passwordValid = password.length >= 8;
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";
  const baseFieldsValid = phoneValid && passwordValid;
  const canSubmit = baseFieldsValid && consentAccepted;

  function saveAuthAndSuccess(method: SignupMethod, extra: Record<string, unknown>) {
    try {
      sessionStorage.setItem("authData", JSON.stringify({
        phone, dialCountry, password, country, invite: invite || undefined,
        phoneVerified: true, consentAccepted, consentedAt: new Date().toISOString(), ...extra,
      }));
    } catch {}
    onSuccess(method);
  }

  if (view === "otp") {
    return (
      <PhoneOtpPage
        lang={lang}
        phone={otpPhone}
        onBack={() => setView("form")}
        onLogin={onLogin}
        onSuccess={() => saveAuthAndSuccess("phone", {})}
      />
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[48px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-4">
          <div className="rounded-2xl border border-[#e5e8ec] bg-white px-4 py-5 space-y-4">
            <AuthRegisterMethodButtons
              lang={lang}
              active={registerMethod}
              onLine={() => { setRegisterMethod("line"); setShowLineAuth(true); }}
              onPhone={() => { setRegisterMethod("phone"); phoneRef.current?.focus(); }}
              onGoogle={() => { setRegisterMethod("google"); setShowGoogleAuth(true); }}
            />

            <h2 className="text-center text-[15px] font-bold text-[#1d2129]">{t.authSignUpWithPhone as string}</h2>

            <PhoneWithDialField
              lang={lang}
              dialCountry={dialCountry}
              onDialCountryChange={setDialCountry}
              phone={phone}
              onPhoneChange={setPhone}
              onBlur={() => setPhoneTouched(true)}
              error={phoneError}
              inputRef={phoneRef}
            />

            <SignupPasswordField
              lang={lang}
              password={password}
              onChange={setPassword}
              onBlur={() => setPasswordTouched(true)}
              error={passwordTouched ? passwordError : ""}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword(v => !v)}
            />

            <SignupCountryField lang={lang} country={country} onChange={setCountry} />
            <SignupReferralField lang={lang} invite={invite} onChange={setInvite} />
            <SignupConsentField
              lang={lang}
              checked={consentAccepted}
              onChange={setConsentAccepted}
              showError={baseFieldsValid && !consentAccepted}
            />

            <SignupGetStartedButton
              lang={lang}
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                if (phone === DEMO_EXISTING_PHONE) {
                  setShowExistingAccount(true);
                  return;
                }
                setOtpPhone(formatPhoneForOtp(dialMeta.dial, phone));
                setView("otp");
              }}
            />
          </div>

          <p className="mt-3 text-center text-[13px] text-[#5c626b]">
            <button type="button" onClick={onEmailSignup} className="font-bold text-[#D10005] underline">{t.authUseEmailInstead as string}</button>
          </p>

          <p className="mt-2 text-center text-[13px] text-[#5c626b]">
            {t.authHaveAccount}{" "}
            <button type="button" onClick={onLogin} className="font-bold text-[#D10005] underline">{t.authLogInLink}</button>
          </p>
        </div>
      </div>

      {showExistingAccount && !showExistingReset && (
        <ExistingAccountModal
          lang={lang}
          method="phone"
          value={formatPhoneForOtp(dialMeta.dial, phone)}
          onLogin={onLogin}
          onResetPassword={() => setShowExistingReset(true)}
          onUseDifferent={() => {
            setShowExistingAccount(false);
            setPhone("");
            setPhoneTouched(false);
            setTimeout(() => phoneRef.current?.focus(), 0);
          }}
        />
      )}

      {showExistingReset && (
        <ForgotPasswordModal
          lang={lang}
          onClose={() => setShowExistingReset(false)}
          onBackToLogin={onLogin}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={(details) => {
            saveAuthAndSuccess("google", {
              googleId: "google_demo_user",
              displayName: details?.displayName ?? t.authGoogleAccount1Name,
              ...details,
            });
            setShowGoogleAuth(false);
          }}
        />
      )}

      {showLineAuth && (
        <LineAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowLineAuth(false)}
          onLogin={() => {
            setShowLineAuth(false);
            onLogin();
          }}
          onSuccess={(details) => {
            saveAuthAndSuccess("line", {
              lineId: "line_user",
              displayName: details?.displayName ?? "LINE User",
              ...details,
            });
            setShowLineAuth(false);
          }}
        />
      )}
    </div>
  );
}

function AuthPasswordEyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function ChangePasswordPage({ lang, onSuccess }: { lang: Lang; onSuccess: () => void }) {
  const t = STR[lang];
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const ruleChecks = {
    length: password.length >= 8 && password.length <= 20,
    number: /\d/.test(password),
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
  };
  const passwordValid = ruleChecks.length && ruleChecks.number && ruleChecks.upper && ruleChecks.lower;
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const canSubmit = passwordValid && passwordsMatch;
  const mismatch = confirmation.length > 0 && password !== confirmation;

  const ruleItems: { key: keyof typeof ruleChecks; label: string }[] = [
    { key: "length", label: (t.authChangePasswordRules as string[])[0] },
    { key: "number", label: (t.authChangePasswordRules as string[])[1] },
    { key: "upper", label: (t.authChangePasswordRules as string[])[2] },
    { key: "lower", label: (t.authChangePasswordRules as string[])[3] },
  ];

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-[#f5f6f8] px-4 py-5 text-[#1d2129]">
      <div className="mx-auto flex min-h-full w-full max-w-sm items-center">
        <div className="w-full rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fde8e8] text-[#D10005]">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3M12 14v3" />
          </svg>
        </div>
        <h1 className="mt-4 text-center text-[22px] font-extrabold leading-tight">{t.authChangePasswordTitle as string}</h1>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5c626b]">{t.authChangePasswordBody as string}</p>
        <ul className="mx-auto mt-3 w-fit space-y-1.5 text-[13px] leading-relaxed">
          {ruleItems.map(rule => {
            const passed = ruleChecks[rule.key];
            return (
              <li key={rule.key} className="flex items-center gap-2">
                {passed ? (
                  <GreenCheck />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
                    <circle cx="10" cy="10" r="9" fill="none" stroke="#c7cad1" strokeWidth="1.5" />
                  </svg>
                )}
                <span className={passed ? "text-[#168a49] font-medium" : "text-[#5c626b]"}>{rule.label}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={t.authChangePasswordNew as string}
              className="w-full rounded-xl border border-[#e5e8ec] bg-white px-4 py-3.5 pr-12 text-[14px] text-[#1d2129] outline-none placeholder:text-[#8a9099] focus:border-[#D10005]"
            />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label="Toggle password visibility" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a9099]">
              <AuthPasswordEyeIcon hidden={!showPassword} />
            </button>
          </div>
          <div>
            <div className="relative">
              <input
                type={showConfirmation ? "text" : "password"}
                value={confirmation}
                onChange={event => setConfirmation(event.target.value)}
                placeholder={t.authChangePasswordConfirm as string}
                className={`w-full rounded-xl border bg-white px-4 py-3.5 pr-12 text-[14px] text-[#1d2129] outline-none placeholder:text-[#8a9099] focus:border-[#D10005] ${mismatch ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
              />
              <button type="button" onClick={() => setShowConfirmation(value => !value)} aria-label="Toggle password visibility" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <AuthPasswordEyeIcon hidden={!showConfirmation} />
              </button>
            </div>
            {mismatch && <p className="mt-2 text-[11px] font-semibold text-[#D10005]">{t.authChangePasswordMismatch as string}</p>}
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (!canSubmit) return;
            onSuccess();
          }}
          className="mt-6 w-full rounded-xl bg-[#D10005] py-3.5 text-[15px] font-bold text-white"
          style={{ opacity: canSubmit ? 1 : 0.45 }}
        >
          {t.authChangePasswordSubmit as string}
        </button>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordModal({ lang, initialValue = "", onClose, onBackToLogin, onResetRequested, onLinkOpened }: {
  lang: Lang;
  initialValue?: string;
  onClose: () => void;
  onBackToLogin?: () => void;
  onResetRequested?: (email: string) => void;
  onLinkOpened?: (email: string) => void;
}) {
  const t = STR[lang];
  const [email, setEmail] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid;
  const emailError = touched && email.length > 0 && !emailValid ? t.authEmailError as string : "";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6">
        <button type="button" onClick={onClose} className="absolute right-4 top-3 text-[22px] text-[#8a9099]" aria-label="Close">×</button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fde8e8] text-[#D10005]">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3M12 14v3" />
          </svg>
        </div>
        <h2 className="mt-4 text-center text-[20px] font-extrabold text-[#1d2129]">{t.authForgotTitle as string}</h2>
        <p className="mt-2 text-center text-[12px] leading-relaxed text-[#5c626b]">{t.authForgotBody as string}</p>

        <p className="mb-2 mt-4 text-[12px] text-[#5c626b]">
          {t.authForgotEmailHelp as string}
        </p>

        <SignupFormField label={t.authEmailLabel as string} required error={emailError}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z" /><path d="M4 6l8 7 8-7" /></svg>
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t.authEmailPlaceholder as string}
              className={authFieldCls(!!emailError)}
              style={{ paddingLeft: "38px", paddingRight: "14px" }}
            />
          </div>
        </SignupFormField>

        <button
          type="button"
          onClick={() => {
            if (!canSubmit) return;
            if (onResetRequested) onResetRequested(email);
            else setShowReview(true);
          }}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-xl py-3.5 text-[14px] font-bold text-white"
          style={{ background: "#D10005", opacity: canSubmit ? 1 : 0.45 }}
        >
          {t.authResetPassword as string}
        </button>

        {onBackToLogin && (
          <button type="button" onClick={onBackToLogin} className="mt-3 w-full text-center text-[12px] font-bold text-[#5c626b] underline">
            {t.authBackToLogin as string}
          </button>
        )}
      </div>
      {showReview && (
        <EmailReviewModal
          lang={lang}
          variant="reset"
          onClose={() => setShowReview(false)}
          onUnderstood={() => {
            try { sessionStorage.removeItem("authData"); } catch {}
            setShowReview(false);
            if (onLinkOpened) onLinkOpened(email);
            else onClose();
          }}
        />
      )}
    </div>
  );
}

export function SocialLinkedAccountModal({ lang, onClose, onLoginWithGoogle, onConnectAccount }: {
  lang: Lang;
  onClose: () => void;
  onLoginWithGoogle: () => void;
  onConnectAccount: () => void;
}) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6">
        <button type="button" onClick={onClose} className="absolute right-4 top-3 text-[22px] text-[#8a9099]" aria-label="Close">×</button>
        <h2 className="pr-8 text-[21px] font-extrabold text-[#1d2129]">{t.authSocialAccountTitle as string}</h2>
        <div className="my-5 h-px bg-[#e5e8ec]" />
        <p className="text-[14px] leading-relaxed text-[#5c626b]">
          {t.authSocialAccountBody as string}
        </p>
        <button
          type="button"
          onClick={onLoginWithGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3.5 text-[14px] font-bold text-[#1d2129]"
        >
          <GoogleAuthIcon size={20} />
          {t.authSocialAccountGoogle as string}
        </button>
        <button
          type="button"
          onClick={onConnectAccount}
          className="mt-2.5 w-full rounded-xl bg-[#D10005] py-3.5 text-[14px] font-bold text-white"
        >
          {t.authSocialAccountConnect as string}
        </button>
        <p className="mt-5 text-center text-[12px] text-[#8a9099]">
          {t.authSocialAccountQuestions as string}{" "}
          <a href="mailto:support@oripalot.com" className="font-semibold text-[#D10005] underline">
            {t.authSocialAccountContact as string}
          </a>
        </p>
      </div>
    </div>
  );
}

export function PasswordUpdatedModal({ lang, onLogin }: { lang: Lang; onLogin: () => void }) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-[#e5e8ec] bg-white px-5 py-6 text-[#1d2129] shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f7ee] text-[#168a49]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l4 4L19 6" /></svg>
        </div>
        <h2 className="mt-4 text-center text-[20px] font-extrabold">{t.authPasswordUpdatedTitle as string}</h2>
        <div className="my-4 h-px bg-[#e5e8ec]" />
        <p className="text-center text-[13px] leading-relaxed text-[#5c626b]">{t.authPasswordUpdatedBody as string}</p>
        <button type="button" onClick={onLogin} className="mt-5 w-full rounded-xl bg-[#D10005] py-3.5 text-[14px] font-bold text-white">
          {t.authPasswordUpdatedLogin as string}
        </button>
      </div>
    </div>
  );
}

/* ── LoginPage ────────────────────────────────────────────────────────── */
export function LoginPage({ lang, onSignUp, onSuccess }: { lang: Lang; onSignUp: () => void; onSuccess: (method?: "line") => void }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showLineAuth, setShowLineAuth] = useState(false);
  const [socialLinkedEmail, setSocialLinkedEmail] = useState<string | null>(null);
  const [emailReviewState, setEmailReviewState] = useState<{ variant: EmailReviewVariant; email: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPasswordUpdated, setShowPasswordUpdated] = useState(false);
  const [forgotMethod, setForgotMethod] = useState<"email" | "phone" | null>(null);
  const [forgotEmailDraft, setForgotEmailDraft] = useState("");

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phonePassword, setPhonePassword] = useState("");
  const [phonePasswordTouched, setPhonePasswordTouched] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";
  const phonePasswordValid = phonePassword.length >= 8;
  const phonePasswordError = phonePassword.length > 0 && !phonePasswordValid ? t.authPasswordError as string : "";
  const canPhoneSubmit = phoneValid && phonePasswordValid;

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
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, password: phonePassword, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  if (showChangePassword) {
    return <ChangePasswordPage lang={lang} onSuccess={() => {
      setShowChangePassword(false);
      setShowPasswordUpdated(true);
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={() => {}} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="flex flex-col gap-3 px-4 py-5">

          {/* ── Social login ── */}
          <div className="order-1">
            <AuthSocialButtons
              signUp={false}
              t={t}
              onGoogle={() => setShowGoogleAuth(true)}
              onLine={() => setShowLineAuth(true)}
            />
          </div>

          {/* ── Email Section ── */}
          <div className="order-2 overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
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
                  type="button"
                  onClick={() => {
                    setForgotEmailDraft(email);
                    setForgotMethod("email");
                  }}
                  className="-mt-1 block w-full text-right text-[12px] font-bold text-[#D10005] underline"
                >
                  {t.authForgotPassword as string}
                </button>

                <button
                  onClick={() => {
                    if (!canEmailSubmit) return;
                    const normalizedEmail = email.trim().toLowerCase();
                    if (DEMO_GOOGLE_ACCOUNT_EMAILS.has(normalizedEmail)) {
                      setSocialLinkedEmail(normalizedEmail);
                      return;
                    }
                    if (normalizedEmail === DEMO_LINE_ACCOUNT_EMAIL) {
                      setEmailReviewState({ variant: "setPassword", email: normalizedEmail });
                      return;
                    }
                    try { sessionStorage.setItem("authData", JSON.stringify({ email })); } catch {}
                    onSuccess();
                  }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#D10005", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section ── */}
          <div className="hidden">
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
                        placeholder={t.authPhonePlaceholder as string}
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
                <AuthField
                  label={t.authPasswordLabel}
                  value={phonePassword}
                  onChange={setPhonePassword}
                  type="password"
                  valid={phonePasswordValid && phonePassword.length > 0}
                  error={phonePasswordTouched ? phonePasswordError : ""}
                  onBlur={() => setPhonePasswordTouched(true)}
                />
                <button
                  type="button"
                  onClick={() => setForgotMethod("phone")}
                  className="-mt-1 block w-full text-right text-[12px] font-bold text-[#D10005] underline"
                >
                  {t.authForgotPassword as string}
                </button>

                <button
                  onClick={() => { if (canPhoneSubmit) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!canPhoneSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#D10005", opacity: canPhoneSubmit ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>

          <p className="order-4 text-center text-[13px] text-[#5c626b]">
            {t.authNoAccount}{" "}
            <button onClick={onSignUp} className="font-bold text-[#D10005] underline">{t.authSignUpNow}</button>
          </p>
        </div>
      </div>

      {forgotMethod && (
        <ForgotPasswordModal
          lang={lang}
          initialValue={forgotEmailDraft}
          onClose={() => setForgotMethod(null)}
          onResetRequested={(resetEmail) => {
            setForgotEmailDraft(resetEmail);
            setForgotMethod(null);
            setEmailReviewState({ variant: "reset", email: resetEmail });
          }}
        />
      )}

      {socialLinkedEmail && (
        <SocialLinkedAccountModal
          lang={lang}
          onClose={() => setSocialLinkedEmail(null)}
          onLoginWithGoogle={() => {
            setSocialLinkedEmail(null);
            setShowGoogleAuth(true);
          }}
          onConnectAccount={() => {
            const emailForSetup = socialLinkedEmail;
            setSocialLinkedEmail(null);
            if (emailForSetup) setEmailReviewState({ variant: "setPassword", email: emailForSetup });
          }}
        />
      )}

      {emailReviewState && (
        <EmailReviewModal
          lang={lang}
          variant={emailReviewState.variant}
          onClose={() => {
            const reviewState = emailReviewState;
            setEmailReviewState(null);
            if (reviewState.variant === "reset") {
              setForgotEmailDraft(reviewState.email);
              setForgotMethod("email");
            }
          }}
          onUnderstood={() => {
            if (!emailReviewState) return;
            try { sessionStorage.removeItem("authData"); } catch {}
            setEmailReviewState(null);
            // Prototype: treat Understood as having followed the email link —
            // route straight to Change Your Password while remaining logged out.
            // Do not open the obsolete illustrated "Open your email" modal.
            setShowChangePassword(true);
          }}
        />
      )}

      {showPasswordUpdated && (
        <PasswordUpdatedModal
          lang={lang}
          onLogin={() => {
            setShowPasswordUpdated(false);
            setEmail("");
            setPassword("");
            setEmailTouched(false);
            setPasswordTouched(false);
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={(details) => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: "google_demo_user",
                displayName: t.authGoogleAccount1Name,
                email: details?.email,
                linkedAutomatically: details?.email === DEMO_EXISTING_EMAIL,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showLineAuth && (
        <LineLoginRedirectFlow
          lang={lang}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                lineId: "line_user",
                displayName: "LINE User",
                email: DEMO_EXISTING_EMAIL,
                linkedAutomatically: true,
              }));
            } catch {}
            setShowLineAuth(false);
            onSuccess("line");
          }}
        />
      )}
    </div>
  );
}
