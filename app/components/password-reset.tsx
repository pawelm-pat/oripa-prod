"use client";

import { useState } from "react";
import type { Lang } from "../lib/types";

const COPY = {
  en: {
    forgotPassword: "Forgot Password?",
    resetPassword: "Reset Password",
    reviewTitle: "Please review the below",
    reviewBody: "Please check your email and follow the link to reset your password",
    understood: "Understood",
    emailLabel: "Email Address",
    emailError: "Please enter a valid email address.",
    changePassword: "Change Password",
    newPassword: "New Password",
    repeatPassword: "Repeat New Password",
    changePasswordBtn: "Change Password",
    passwordError: "Password must be at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    back: "Back",
    cancel: "Cancel",
  },
  ja: {
    forgotPassword: "パスワードをお忘れですか？",
    resetPassword: "パスワードをリセット",
    reviewTitle: "以下をご確認ください",
    reviewBody: "メールをご確認のうえ、リンクからパスワードを再設定してください",
    understood: "了解しました",
    emailLabel: "メールアドレス",
    emailError: "有効なメールアドレスを入力してください。",
    changePassword: "パスワード変更",
    newPassword: "新しいパスワード",
    repeatPassword: "新しいパスワード（確認）",
    changePasswordBtn: "パスワードを変更",
    passwordError: "パスワードは8文字以上で入力してください。",
    passwordMismatch: "パスワードが一致しません。",
    back: "戻る",
    cancel: "キャンセル",
  },
} as const;

function AuthField({ label, value, onChange, type = "text", valid, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
  valid?: boolean; error?: string; onBlur?: () => void;
}) {
  const showTick = valid === true;
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {label}<span className="ml-0.5 text-[#D10005]">*</span>
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Placeholder"
          className={`w-full rounded-xl bg-white py-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none border ${error ? "border-[#D10005]" : "border-[#e5e8ec]"}`}
          style={{ paddingLeft: "14px", paddingRight: showTick ? "40px" : "14px" }}
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

/** Review modal matching the approved password-reset design image. */
export function ForgotPasswordReviewModal({ lang, onClose, onUnderstood }: {
  lang: Lang; onClose: () => void; onUnderstood: () => void;
}) {
  const t = COPY[lang];
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <h2 className="text-[18px] font-bold leading-snug text-[#1d2129]">{t.reviewTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 shrink-0 text-[#8a9099]"
            aria-label={t.cancel}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="border-t border-[#e8eaed]" />
        <div className="px-5 pt-5 pb-5">
          <p className="text-[14px] leading-relaxed text-[#5c626b]">{t.reviewBody}</p>
          <button
            type="button"
            onClick={onUnderstood}
            className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#D10005" }}
          >
            {t.understood}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage({ lang, initialEmail = "", onBack, onContinueToChangePassword }: {
  lang: Lang;
  initialEmail?: string;
  onBack: () => void;
  onContinueToChangePassword: () => void;
}) {
  const t = COPY[lang];
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [forgotEmailTouched, setForgotEmailTouched] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const forgotEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail);
  const forgotEmailError = forgotEmail.length > 0 && !forgotEmailValid ? t.emailError : "";
  const canResetPassword = forgotEmailValid;

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/8 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f0f2f5]"
          aria-label={t.back}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#1d2129" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1d2129]">{t.forgotPassword}</h1>
      </header>

      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-4 rounded-2xl border border-[#e5e8ec] bg-white px-4 py-4">
          <AuthField
            label={t.emailLabel}
            value={forgotEmail}
            onChange={setForgotEmail}
            type="email"
            valid={forgotEmailValid && forgotEmail.length > 0}
            error={forgotEmailTouched ? forgotEmailError : ""}
            onBlur={() => setForgotEmailTouched(true)}
          />
          <button
            type="button"
            onClick={() => { if (canResetPassword) setShowReview(true); }}
            disabled={!canResetPassword}
            className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#D10005", opacity: canResetPassword ? 1 : 0.45 }}
          >
            {t.resetPassword}
          </button>
        </div>
      </div>

      {showReview && (
        <ForgotPasswordReviewModal
          lang={lang}
          onClose={() => setShowReview(false)}
          onUnderstood={() => {
            setShowReview(false);
            onContinueToChangePassword();
          }}
        />
      )}
    </div>
  );
}

/** Logged-out Change Password page opened after the reset email review modal. */
export function ChangePasswordPage({ lang, onBack, onDone }: {
  lang: Lang; onBack: () => void; onDone: () => void;
}) {
  const t = COPY[lang];
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [repeatPasswordTouched, setRepeatPasswordTouched] = useState(false);

  const newPasswordValid = newPassword.length >= 8;
  const repeatPasswordValid = repeatPassword.length >= 8 && repeatPassword === newPassword;
  const canChangePassword = newPasswordValid && repeatPasswordValid;
  const newPasswordError = newPassword.length > 0 && !newPasswordValid ? t.passwordError : "";
  const repeatPasswordError = repeatPassword.length > 0 && repeatPassword !== newPassword ? t.passwordMismatch : "";

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/8 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f0f2f5]"
          aria-label={t.back}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#1d2129" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1d2129]">{t.changePassword}</h1>
      </header>
      <div className="animate-screen-in no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-4 rounded-2xl border border-[#e5e8ec] bg-white px-4 py-4">
          <AuthField
            label={t.newPassword}
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            valid={newPasswordValid && newPassword.length > 0}
            error={newPasswordTouched ? newPasswordError : ""}
            onBlur={() => setNewPasswordTouched(true)}
          />
          <AuthField
            label={t.repeatPassword}
            value={repeatPassword}
            onChange={setRepeatPassword}
            type="password"
            valid={repeatPasswordValid && repeatPassword.length > 0}
            error={repeatPasswordTouched ? repeatPasswordError : ""}
            onBlur={() => setRepeatPasswordTouched(true)}
          />
          <button
            type="button"
            onClick={() => { if (canChangePassword) onDone(); }}
            disabled={!canChangePassword}
            className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#D10005", opacity: canChangePassword ? 1 : 0.45 }}
          >
            {t.changePasswordBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

export function forgotPasswordLabel(lang: Lang) {
  return COPY[lang].forgotPassword;
}
