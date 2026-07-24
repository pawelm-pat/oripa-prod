"use client";

import { useState } from "react";
import type { Lang } from "../lib/types";

const COPY = {
  en: {
    forgotPassword: "Forgot Password?",
    resetTitle: "Reset your password",
    resetSubtitle: "Please enter your email to get started.",
    resetHint: "Enter the email address linked to your account.",
    resetPassword: "Reset Password",
    emailLabel: "Email Address",
    emailError: "Please enter a valid email address.",
    changeTitle: "Change Your Password",
    changeIntro: "In order to protect your account, make sure your password has:",
    ruleLength: "8 to 20 characters",
    ruleNumber: "at least one number",
    ruleUpper: "at least one uppercase letter",
    ruleLower: "at least one lowercase letter",
    newPasswordPh: "New password",
    reenterPasswordPh: "Re-enter New Password",
    changePasswordBtn: "Change password",
    passwordMismatch: "Passwords do not match.",
    successTitle: "Please review the information below",
    successBody: "Password changed successfully. Please log in again.",
    login: "Login",
    cancel: "Cancel",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  ja: {
    forgotPassword: "パスワードをお忘れですか？",
    resetTitle: "パスワードをリセット",
    resetSubtitle: "メールアドレスを入力して開始してください。",
    resetHint: "アカウントに登録されているメールアドレスを入力してください。",
    resetPassword: "パスワードをリセット",
    emailLabel: "メールアドレス",
    emailError: "有効なメールアドレスを入力してください。",
    changeTitle: "パスワードの変更",
    changeIntro: "アカウント保護のため、パスワードは次の条件を満たしてください：",
    ruleLength: "8〜20文字",
    ruleNumber: "数字を1文字以上含む",
    ruleUpper: "大文字を1文字以上含む",
    ruleLower: "小文字を1文字以上含む",
    newPasswordPh: "新しいパスワード",
    reenterPasswordPh: "新しいパスワード（再入力）",
    changePasswordBtn: "パスワードを変更",
    passwordMismatch: "パスワードが一致しません。",
    successTitle: "以下をご確認ください",
    successBody: "パスワードが変更されました。再度ログインしてください。",
    login: "ログイン",
    cancel: "キャンセル",
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを隠す",
  },
} as const;

function LockBadge() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#fde8e8" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D10005" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EyeToggle({ show, onToggle, showLabel, hideLabel }: {
  show: boolean; onToggle: () => void; showLabel: string; hideLabel: string;
}) {
  return (
    <button type="button" onClick={onToggle} className="p-0.5" aria-label={show ? hideLabel : showLabel}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2">
        {show ? (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.02-2.86 2.98-5.1 5.35-6.39M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.7 11.7 0 01-2.16 3.19M1 1l22 22" strokeLinecap="round" />
            <path d="M14.12 14.12A3 3 0 019.88 9.88" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}

function RuleRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {ok ? (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
          <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        </span>
      ) : (
        <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#d1d5db]" />
      )}
      <span className={`text-[13px] ${ok ? "font-medium text-[#16a34a]" : "text-[#8a9099]"}`}>{label}</span>
    </div>
  );
}

/** Step 1 — email entry modal over the login page. */
export function ResetPasswordEmailModal({ lang, initialEmail = "", onClose, onContinue }: {
  lang: Lang; initialEmail?: string; onClose: () => void; onContinue: (email: string) => void;
}) {
  const t = COPY[lang];
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const error = touched && email.length > 0 && !valid ? t.emailError : "";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="relative w-full max-w-[340px] rounded-2xl bg-white px-5 pb-6 pt-5 shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-[#8a9099]"
          aria-label={t.cancel}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>

        <LockBadge />
        <h2 className="mt-4 text-center text-[20px] font-bold text-[#1d2129]">{t.resetTitle}</h2>
        <p className="mt-1.5 text-center text-[13px] text-[#8a9099]">{t.resetSubtitle}</p>
        <p className="mt-3 text-center text-[13px] text-[#5c626b]">{t.resetHint}</p>

        <div className="mt-5">
          <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
            {t.emailLabel}<span className="ml-0.5 text-[#D10005]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" />
              </svg>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t.emailLabel}
              className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${error ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
            />
          </div>
          {error && <p className="mt-1 text-[11px] text-[#D10005]">{error}</p>}
        </div>

        <button
          type="button"
          onClick={() => { if (valid) onContinue(email); }}
          disabled={!valid}
          className="mt-5 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
          style={{ background: "#E07A7A", opacity: valid ? 1 : 0.45 }}
        >
          {t.resetPassword}
        </button>
      </div>
    </div>
  );
}

/** Step 2 — change password card with live rule checklist. */
export function ChangePasswordPage({ lang, onBack: _onBack, onDone }: {
  lang: Lang; onBack: () => void; onDone: () => void;
}) {
  const t = COPY[lang];
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeatTouched, setRepeatTouched] = useState(false);

  const lengthOk = newPassword.length >= 8 && newPassword.length <= 20;
  const numberOk = /\d/.test(newPassword);
  const upperOk = /[A-Z]/.test(newPassword);
  const lowerOk = /[a-z]/.test(newPassword);
  const rulesOk = lengthOk && numberOk && upperOk && lowerOk;
  const matchOk = repeatPassword.length > 0 && repeatPassword === newPassword;
  const mismatch = repeatTouched && repeatPassword.length > 0 && repeatPassword !== newPassword;
  const canSubmit = rulesOk && matchOk;

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <div className="animate-screen-in no-scrollbar flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-8">
        <div className="w-full max-w-[360px] rounded-2xl bg-white px-5 pb-6 pt-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          <LockBadge />
          <h2 className="mt-4 text-center text-[20px] font-bold text-[#1d2129]">{t.changeTitle}</h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-[#8a9099]">{t.changeIntro}</p>

          <div className="mt-4 space-y-2.5 px-1">
            <RuleRow ok={lengthOk} label={t.ruleLength} />
            <RuleRow ok={numberOk} label={t.ruleNumber} />
            <RuleRow ok={upperOk} label={t.ruleUpper} />
            <RuleRow ok={lowerOk} label={t.ruleLower} />
          </div>

          <div className="mt-5 space-y-3">
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value.slice(0, 20))}
                placeholder={t.newPasswordPh}
                className="w-full rounded-xl border border-[#e5e8ec] bg-white py-3 pl-3.5 pr-10 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <EyeToggle show={showNew} onToggle={() => setShowNew((v) => !v)} showLabel={t.showPassword} hideLabel={t.hidePassword} />
              </span>
            </div>

            <div>
              <div className="relative">
                <input
                  type={showRepeat ? "text" : "password"}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value.slice(0, 20))}
                  onBlur={() => setRepeatTouched(true)}
                  placeholder={t.reenterPasswordPh}
                  className={`w-full rounded-xl border bg-white py-3 pl-3.5 pr-10 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${mismatch ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <EyeToggle show={showRepeat} onToggle={() => setShowRepeat((v) => !v)} showLabel={t.showPassword} hideLabel={t.hidePassword} />
                </span>
              </div>
              {mismatch && <p className="mt-1.5 text-[12px] font-medium text-[#D10005]">{t.passwordMismatch}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => { if (canSubmit) onDone(); }}
            disabled={!canSubmit}
            className="mt-5 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: canSubmit ? "#D10005" : "#E07A7A", opacity: canSubmit ? 1 : 0.55 }}
          >
            {t.changePasswordBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Step 3 — success modal over login asking user to sign in again. */
export function PasswordChangedSuccessModal({ lang, onLogin }: {
  lang: Lang; onLogin: () => void;
}) {
  const t = COPY[lang];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col items-center px-5 pt-7 pb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dcfce7]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#22c55e" />
              <path d="M10 16l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-4 text-center text-[18px] font-bold leading-snug text-[#1d2129]">{t.successTitle}</h2>
        </div>
        <div className="border-t border-[#e8eaed]" />
        <div className="px-5 pt-4 pb-5">
          <p className="text-center text-[14px] leading-relaxed text-[#5c626b]">{t.successBody}</p>
          <button
            type="button"
            onClick={onLogin}
            className="mt-5 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#D10005" }}
          >
            {t.login}
          </button>
        </div>
      </div>
    </div>
  );
}

export function forgotPasswordLabel(lang: Lang) {
  return COPY[lang].forgotPassword;
}
