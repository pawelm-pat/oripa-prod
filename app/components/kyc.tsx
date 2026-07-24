"use client";

import { type Dispatch, type SetStateAction } from "react";

export type KycEntryContext = "purchase" | "prizeHistory" | "profile";
export type KycStatus = "notStarted" | "inProgress" | "approved" | "needsAttention";
export type KycScenario = "none" | "happy" | "identityReview" | "identityAttention" | "poaReview" | "poaAttention";
export type KycScreen =
  | "required" | "details" | "beforeStart" | "identityProgress" | "identityComplete" | "identityAttention"
  | "poaProgress" | "poaAttention" | "complete" | "providerIdIntro" | "providerIdMethod"
  | "providerIdCapture" | "providerSelfie" | "providerIdSubmitted"
  | "providerPoaIntro" | "providerPoaMethod" | "providerPoaCapture" | "providerPoaSubmitted";

export type KycDetails = {
  lastName: string; firstName: string; lastNameKana: string; firstNameKana: string;
  email: string; dob: string; postalCode: string; prefecture: string; city: string;
  street: string; streetNumber: string; apartment: string; country: string;
};

export type KycState = {
  entryContext: KycEntryContext;
  poiStatus: KycStatus;
  poaStatus: KycStatus;
  activeScreen: KycScreen | null;
  scenario: KycScenario;
  details: KycDetails;
};

export const KYC_SESSION_KEY = "oripalotPrototypeKyc";

export const DEFAULT_KYC_DETAILS: KycDetails = {
  lastName: "Yamada", firstName: "Taro", lastNameKana: "ヤマダ", firstNameKana: "タロウ",
  email: "taro.yamada@example.com", dob: "1990-01-01", postalCode: "100-0005",
  prefecture: "Tokyo", city: "Chiyoda-ku", street: "Marunouchi", streetNumber: "1-1",
  apartment: "", country: "Japan",
};

export function createDefaultKycState(scenario: KycScenario = "happy"): KycState {
  return {
    entryContext: "profile", poiStatus: "notStarted", poaStatus: "notStarted",
    activeScreen: null, scenario, details: DEFAULT_KYC_DETAILS,
  };
}

type KycCopy = {
  close: string; requiredTitle: string; requiredBody: string; start: string; support: string;
  detailsTitle: string; detailsBody: string; continue: string; fields: Record<keyof KycDetails, string>;
  beforeTitle: string; beforeBody: string; identityDocs: string; poaDocs: string;
  passport: string; myNumber: string; driver: string; utility: string; bank: string; jyuminhyo: string;
  issued: string; secure: string; progressTitle: string; progressBody: string;
  poaProgressTitle: string; poaProgressBody: string;
  identity: string; poa: string; approved: string; reviewing: string; notStarted: string;
  availableAfterIdentity: string; actionRequired: string; identityCompleteTitle: string;
  identityCompleteBody: string; continueToPoa: string; documentErrorTitle: string;
  documentErrorBullets: string[];
  purchaseCta: string; shippingCta: string; profileCta: string; understood: string; identityAttentionTitle: string;
  identityAttentionBody: string; retry: string; poaAttentionTitle: string; poaAttentionBody: string;
  poaErrorTitle: string; poaErrorSubtitle: string; poaErrorBullets: string[]; nextUpload: string;
  resubmit: string; completeTitle: string; completeBody: string; proceedStore: string;
  accountId: string; proceedShipping: string; proceedProfile: string; providerIdTitle: string; providerIdBody: string;
  providerPoaTitle: string; providerPoaBody: string; letsGo: string; chooseMethod: string;
  takePhoto: string; uploadFile: string; captureId: string; capturePoa: string; captureHint: string;
  uploadId: string; uploadPoa: string; uploadHint: string; usePhoto: string; useFile: string;
  selfieTitle: string; selfieBody: string; takeSelfie: string;
  submittedTitle: string; submittedBody: string; done: string; providerPrivacy: string;
};

const COPY: Record<"en" | "ja", KycCopy> = {
  en: {
    close: "Close", requiredTitle: "Verification required", requiredBody: "Complete account verification before continuing with this action.",
    start: "Start verification", support: "Need help? Contact support", detailsTitle: "Confirm your details",
    detailsBody: "Your information must match your identity document.", continue: "Continue",
    fields: { lastName: "Last Name", firstName: "First Name", lastNameKana: "Katakana Last Name", firstNameKana: "Katakana First Name", email: "Email Address", dob: "Date of Birth", postalCode: "Postal Code", prefecture: "Prefecture", city: "City", street: "Street", streetNumber: "Street Number", apartment: "Apartment", country: "Country" },
    beforeTitle: "Before you start", beforeBody: "Have these documents ready before verification.",
    identityDocs: "Accepted identity documents", poaDocs: "Proof of address", passport: "Passport",
    myNumber: "My Number Card", driver: "Driver’s License", utility: "Utility bill", bank: "Bank statement",
    jyuminhyo: "Jyuminhyo", issued: "Bills, statements and Jyuminhyo must show your current address and be issued within the last 90 days.",
    secure: "Identity verification is completed securely by our verification partner.",
    progressTitle: "Identity check in progress", progressBody: "Most checks finish quickly, but some take longer. We’ll notify you as soon as yours is complete.",
    poaProgressTitle: "Proof of address check in progress", poaProgressBody: "Most checks finish quickly, but some take longer. We’ll notify you as soon as yours is complete.",
    identity: "Identity and selfie", poa: "Proof of address", approved: "Completed", reviewing: "In review", notStarted: "Not started",
    availableAfterIdentity: "Available after identity check", actionRequired: "Action required",
    identityCompleteTitle: "Identity check complete",
    identityCompleteBody: "Your identity and selfie have been approved. Complete proof of address to finish verification.",
    continueToPoa: "Continue to proof of address", documentErrorTitle: "Document could not be verified",
    documentErrorBullets: ["Use an accepted, valid document", "Make sure all details are clear", "Avoid glare or cropped edges"],
    purchaseCta: "Get more coins", shippingCta: "Shipping prizes", profileCta: "Continue playing games",
    understood: "Understood",
    identityAttentionTitle: "Identity check needs attention", identityAttentionBody: "We couldn’t verify your identity document.",
    retry: "Retry identity check", poaAttentionTitle: "Proof of address needs attention",
    poaAttentionBody: "We couldn’t accept the document you submitted.",
    poaErrorTitle: "Proof of address could not be verified",
    poaErrorSubtitle: "Please check the requirements below before submitting another document.",
    poaErrorBullets: ["Name and current address must be visible", "Bills, statements and Jyuminhyo must be issued within 90 days."],
    nextUpload: "Next upload will be available at 05:14 (PT) 17 Jul 26",
    resubmit: "Please re-submit", completeTitle: "Verification complete", completeBody: "Your account is fully verified.",
    accountId: "Account ID", proceedStore: "Proceed to store", proceedShipping: "Continue shipping", proceedProfile: "Continue playing games",
    providerIdTitle: "Confirm your identity", providerIdBody: "We’ll ask for your ID and a selfie. It’s quick and secure, and trusted by millions of users worldwide.",
    providerPoaTitle: "Confirm your address", providerPoaBody: "Upload a recent document that shows your full name and current address.",
    letsGo: "Let’s go!", chooseMethod: "How would you like to continue?", takePhoto: "Take a photo", uploadFile: "Upload a file",
    captureId: "Take a photo of your document", capturePoa: "Photograph your proof of address",
    captureHint: "Place the whole document inside the frame. Make sure all text is clear.",
    uploadId: "Upload your identity document", uploadPoa: "Upload your proof of address",
    uploadHint: "Select a clear file that shows the entire document.", usePhoto: "Use this photo", useFile: "Use this file",
    selfieTitle: "Take a selfie", selfieBody: "Center your face in the oval and make sure the room is well lit.",
    takeSelfie: "Take selfie", submittedTitle: "Thank you!", submittedBody: "Your verification data has been successfully submitted.",
    done: "Continue", providerPrivacy: "Veriff uses automation to verify your identity. Read more about personal data processing and cookie usage in Veriff’s Privacy Notice.",
  },
  ja: {
    close: "閉じる", requiredTitle: "本人確認が必要です", requiredBody: "この操作を続けるには、アカウントの本人確認を完了してください。",
    start: "本人確認を開始", support: "お困りですか？サポートに連絡", detailsTitle: "登録情報を確認",
    detailsBody: "本人確認書類と一致する情報を入力してください。", continue: "続ける",
    fields: { lastName: "姓", firstName: "名", lastNameKana: "セイ（カタカナ）", firstNameKana: "メイ（カタカナ）", email: "メールアドレス", dob: "生年月日", postalCode: "郵便番号", prefecture: "都道府県", city: "市区町村", street: "町名", streetNumber: "番地", apartment: "建物名・部屋番号", country: "国" },
    beforeTitle: "開始する前に", beforeBody: "確認に必要な書類を準備してください。",
    identityDocs: "利用できる本人確認書類", poaDocs: "住所証明書類", passport: "パスポート",
    myNumber: "マイナンバーカード", driver: "運転免許証", utility: "公共料金の請求書", bank: "銀行取引明細書",
    jyuminhyo: "住民票", issued: "請求書、明細書、住民票には現住所が記載され、90日以内に発行されたものが必要です。",
    secure: "本人確認は認証パートナーにより安全に行われます。",
    progressTitle: "本人確認を審査中です", progressBody: "情報を確認しています。更新があり次第お知らせします。",
    poaProgressTitle: "住所確認を審査中です", poaProgressBody: "通常はすぐに完了しますが、時間がかかる場合があります。完了次第お知らせします。",
    identity: "本人確認・自撮り", poa: "住所確認", approved: "完了", reviewing: "審査中", notStarted: "未開始",
    availableAfterIdentity: "本人確認完了後に利用可能", actionRequired: "対応が必要",
    identityCompleteTitle: "本人確認が完了しました",
    identityCompleteBody: "本人確認と自撮り写真が承認されました。住所確認を完了してください。",
    continueToPoa: "住所確認へ進む", documentErrorTitle: "書類を確認できませんでした",
    documentErrorBullets: ["有効な対象書類を使用してください", "すべての情報が鮮明か確認してください", "反射や切れた端を避けてください"],
    purchaseCta: "コインを購入", shippingCta: "賞品を発送", profileCta: "ゲームを続ける",
    // JA CTA pending product approval — keep English until localized wording is approved.
    understood: "Understood",
    identityAttentionTitle: "本人確認を完了できませんでした", identityAttentionBody: "書類が鮮明で有効期限内であり、登録情報と一致していることを確認してください。",
    retry: "本人確認を再試行", poaAttentionTitle: "住所確認書類を確認できませんでした",
    poaAttentionBody: "提出された書類を受け付けることができませんでした。",
    poaErrorTitle: "住所確認書類を確認できませんでした",
    poaErrorSubtitle: "別の書類を提出する前に、以下の要件をご確認ください。",
    poaErrorBullets: ["氏名と現住所が確認できる必要があります", "請求書、明細書、住民票は90日以内に発行されたものが必要です。"],
    nextUpload: "次回アップロード可能時刻：7月17日 05:14（PT）",
    resubmit: "再提出してください", completeTitle: "本人確認が完了しました", completeBody: "アカウントの本人確認が完了しました。",
    accountId: "アカウントID", proceedStore: "ストアへ進む", proceedShipping: "発送手続きへ", proceedProfile: "ゲームを続ける",
    providerIdTitle: "本人確認を始めましょう", providerIdBody: "本人確認書類と自撮り写真を使って確認します。",
    providerPoaTitle: "住所を確認", providerPoaBody: "氏名と現住所が記載された最近の書類をアップロードしてください。",
    letsGo: "始める", chooseMethod: "提出方法を選択", takePhoto: "写真を撮る", uploadFile: "ファイルをアップロード",
    captureId: "本人確認書類を撮影", capturePoa: "住所証明書類を撮影",
    captureHint: "書類全体を枠内に収め、文字が鮮明に見えるようにしてください。",
    uploadId: "本人確認書類をアップロード", uploadPoa: "住所証明書類をアップロード",
    uploadHint: "書類全体が鮮明に見えるファイルを選択してください。", usePhoto: "この写真を使用", useFile: "このファイルを使用",
    selfieTitle: "自撮り写真を撮影", selfieBody: "顔を楕円の中央に合わせ、明るい場所で撮影してください。",
    takeSelfie: "撮影する", submittedTitle: "ありがとうございます！", submittedBody: "確認データが正常に送信されました。",
    done: "続ける", providerPrivacy: "Veriffは本人確認に自動処理を使用します。個人データ処理、Cookieの使用、Veriffのプライバシーポリシーをご確認ください。",
  },
};

function XButton({ label, onClick, dark = false }: { label: string; onClick: () => void; dark?: boolean }) {
  return <button onClick={onClick} aria-label={label} className={`absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full ${dark ? "bg-white/15 text-white" : "bg-black/5 text-[#1d2129]"}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>;
}

function OripalotLogo() {
  return <div className="flex items-center justify-center gap-1.5"><span className="h-4 w-4 rounded-full border-[4px] border-[#e60012]" /><span className="text-[10px] font-black tracking-[0.16em] text-[#1d2129]">ORIPALOT</span></div>;
}

function VeriffLogo() {
  return <div className="flex items-center justify-center gap-1 text-[34px] font-black tracking-[-0.06em] text-[#082f32]">veriff<span className="ml-1 flex gap-[2px]"><i className="h-7 w-2 skew-y-[-28deg] bg-[#22dbc3]" /><i className="h-7 w-2 skew-y-[28deg] bg-[#22dbc3]" /></span></div>;
}

function VerificationBadge() {
  return <svg aria-hidden="true" width="54" height="54" viewBox="0 0 54 54" fill="none"><circle cx="27" cy="27" r="25" fill="#FFF1F1" /><circle cx="27" cy="27" r="15" stroke="#E60012" strokeWidth="4" strokeDasharray="62 18" /><path d="m21 27 4 4 8-9" stroke="#E60012" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DocumentIcon({ kind }: { kind: "passport" | "card" | "license" | "paper" | "lock" }) {
  if (kind === "lock") return <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="11" rx="2" stroke="#31363B" strokeWidth="1.7" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="#31363B" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  if (kind === "paper") return <svg aria-hidden="true" width="27" height="27" viewBox="0 0 28 28" fill="none"><path d="M6 3h10l6 6v16H6V3Z" stroke="#31363B" strokeWidth="1.6" /><path d="M16 3v6h6M9 14h10M9 18h10" stroke="#31363B" strokeWidth="1.5" /></svg>;
  if (kind === "license") return <svg aria-hidden="true" width="29" height="25" viewBox="0 0 30 26" fill="none"><path d="m5 10 2-6h16l2 6M4 10h22v10H4V10Z" stroke="#31363B" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="9" cy="16" r="2" stroke="#31363B" strokeWidth="1.4" /><circle cx="21" cy="16" r="2" stroke="#31363B" strokeWidth="1.4" /><path d="M7 20v3M23 20v3" stroke="#31363B" strokeWidth="1.6" /></svg>;
  if (kind === "card") return <svg aria-hidden="true" width="28" height="25" viewBox="0 0 30 26" fill="none"><rect x="2" y="3" width="26" height="20" rx="2" stroke="#31363B" strokeWidth="1.6" /><circle cx="10" cy="11" r="3" stroke="#31363B" strokeWidth="1.4" /><path d="M5.5 19c.8-3 2.3-4.5 4.5-4.5s3.7 1.5 4.5 4.5M18 9h7M18 13h7M18 17h5" stroke="#31363B" strokeWidth="1.4" strokeLinecap="round" /></svg>;
  return <svg aria-hidden="true" width="27" height="27" viewBox="0 0 28 28" fill="none"><rect x="4" y="2" width="20" height="24" rx="2" stroke="#31363B" strokeWidth="1.6" /><circle cx="14" cy="12" r="4" stroke="#31363B" strokeWidth="1.4" /><path d="M9 19h10M11 7h6" stroke="#31363B" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function VeriffHeroIllustration() {
  return <svg aria-hidden="true" className="h-[260px] w-[260px]" viewBox="0 0 260 260" fill="none"><circle cx="130" cy="132" r="104" fill="#E0FAF7" stroke="#17383B" /><path d="M92 220c5-53 20-83 44-83s39 30 44 83" fill="#F7F8F8" stroke="#17383B" strokeWidth="2" /><circle cx="136" cy="104" r="29" fill="#D8DADB" stroke="#17383B" strokeWidth="2" /><path d="M112 99c2-28 14-38 37-32 14 4 21 13 21 29-12-8-23-11-34-7-7 3-15 6-24 10Z" fill="#303538" /><path d="M106 148 72 92M72 92 62 50" stroke="#17383B" strokeWidth="13" strokeLinecap="round" /><rect x="48" y="26" width="26" height="42" rx="4" fill="#444A4D" stroke="#17383B" strokeWidth="2" transform="rotate(-8 48 26)" /><path d="M190 84 218 74l28 10v30c0 23-13 39-28 46-15-7-28-23-28-46V84Z" fill="#28DCC5" stroke="#17383B" strokeWidth="2" /><path d="m205 113 9 9 17-20" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function KycResultIllustration({ complete = false }: { complete?: boolean }) {
  return <svg aria-hidden="true" width="118" height="118" viewBox="0 0 118 118" fill="none"><path d="M23 8h46l25 25v70H23V8Z" stroke="#263143" strokeWidth="2.2" strokeLinejoin="round" /><path d="M69 8v25h25M38 56h30M38 69h25M38 82h20" stroke="#263143" strokeWidth="2" strokeLinecap="round" />{complete && <><rect x="36" y="29" width="23" height="21" rx="3" stroke="#263143" strokeWidth="2" /><circle cx="47.5" cy="36.5" r="3.2" stroke="#263143" strokeWidth="1.7" /><path d="M41 46c1-3.3 3.2-4.8 6.5-4.8S53 42.7 54 46" stroke="#263143" strokeWidth="1.7" strokeLinecap="round" /></>}<circle cx="84" cy="84" r="28" fill="white" stroke="#263143" strokeWidth="2.3" />{complete ? <path d="m71 84 9 9 18-21" stroke="#263143" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : <><path d="M84 69v17h12" stroke="#263143" strokeWidth="2.5" strokeLinecap="round" /><circle cx="84" cy="84" r="20" stroke="#263143" strokeWidth="1.4" /></>}</svg>;
}

function KycStepTimeline({ mode, c }: { mode: "review" | "complete" | "attention" | "poaReview" | "poaAttention"; c: KycCopy }) {
  const firstStatus = mode === "review" ? c.reviewing : mode === "attention" ? c.actionRequired : c.approved;
  const firstTone = mode === "attention" ? "text-[#E60012]" : "text-[#334155]";
  const firstIcon = mode === "complete" || mode === "poaReview" || mode === "poaAttention" ? "✓" : mode === "attention" ? "!" : <i className="h-2.5 w-2.5 rounded-full bg-[#111827]" />;
  const secondNeedsAction = mode === "complete" || mode === "poaAttention";
  const secondStatus = mode === "poaReview" ? c.reviewing : secondNeedsAction ? c.actionRequired : c.availableAfterIdentity;
  return <div className="relative my-5"><div className="absolute left-[13px] top-7 h-[58px] w-px bg-[#D8DCE1]" /><div className="relative flex items-center gap-3 border-b border-[#E1E4E8] py-3"><span className={`z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white ${mode === "attention" ? "border border-[#FFB3B6] text-[#E60012]" : "border border-[#C9CDD2] text-[#111827]"}`}>{firstIcon}</span><span className="flex-1 text-[12px] font-bold text-[#20252B]">{c.identity}</span><span className={`max-w-[92px] text-right text-[10px] font-semibold ${firstTone}`}>{firstStatus}</span></div><div className="relative flex items-center gap-3 py-3"><span className={`z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white ${secondNeedsAction ? "border border-[#FFB3B6]" : "border border-[#D4D7DB]"}`}>{secondNeedsAction ? (mode === "poaAttention" ? <span className="font-black text-[#E60012]">!</span> : <i className="h-3 w-3 rounded-full bg-[#E60012]" />) : mode === "attention" ? <DocumentIcon kind="lock" /> : mode === "poaReview" ? <i className="h-2.5 w-2.5 rounded-full bg-[#111827]" /> : null}</span><span className="flex-1 text-[12px] font-bold text-[#20252B]">{c.poa}</span><span className={`max-w-[105px] text-right text-[10px] font-semibold leading-tight ${secondNeedsAction ? "text-[#E60012]" : mode === "poaReview" ? "text-[#334155]" : "text-[#6B7280]"}`}>{secondStatus}</span></div></div>;
}

function KycDetailsFields({ lang, c, details, onChange }: { lang: "en" | "ja"; c: KycCopy; details: KycDetails; onChange: (details: KycDetails) => void }) {
  const inputClass = "w-full rounded-md border border-[#C8CFDA] px-3 py-2.5 text-[11px] outline-none focus:border-[#E60012]";
  const labelClass = "mb-1 block text-[9px] font-bold text-[#303640]";
  const required = <span className="text-[#E60012]">*</span>;
  const field = (key: keyof KycDetails, span = false, type = "text") => <label key={key} className={span ? "col-span-2" : ""}><span className={labelClass}>{c.fields[key]} {required}</span><input type={type} value={details[key]} onChange={(event) => onChange({ ...details, [key]: event.target.value })} className={inputClass} /></label>;
  const cityStreet = [details.city, details.street].filter(Boolean).join(", ");
  const streetApartment = [details.streetNumber, details.apartment].filter(Boolean).join(" / ");
  return <div className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-3">{field("lastName")}{field("firstName")}{field("lastNameKana")}{field("firstNameKana")}{field("email", true)}{field("dob", true, "date")}<div className="col-span-2 border-t border-[#E3E5E8]" />{field("postalCode")}{field("prefecture")}<label className="col-span-2"><span className={labelClass}>{lang === "ja" ? "市区町村・町名" : "City, Street"} {required}</span><input value={cityStreet} onChange={(event) => onChange({ ...details, city: event.target.value, street: "" })} className={inputClass} /></label><label className="col-span-2"><span className={labelClass}>{lang === "ja" ? "番地・建物名・部屋番号" : "Street Number / Apartment"} {required}</span><input value={streetApartment} onChange={(event) => onChange({ ...details, streetNumber: event.target.value, apartment: "" })} className={inputClass} /></label><div className="col-span-2"><span className={labelClass}>{c.fields.country} {required}</span><div aria-readonly="true" className="w-full cursor-default rounded-md border border-[#D8DCE3] bg-[#F3F4F6] px-3 py-2.5 text-[11px] text-[#6B7280]">Japan</div></div></div>;
}

export function KycOverlay({ lang, state, setState, onExit, onContextReturn }: {
  lang: "en" | "ja"; state: KycState; setState: Dispatch<SetStateAction<KycState>>;
  onExit: () => void; onContextReturn: (context: KycEntryContext, completed: boolean) => void;
}) {
  const c = COPY[lang];
  const screen = state.activeScreen;
  if (!screen) return null;
  const update = (patch: Partial<KycState>) => setState((s) => ({ ...s, ...patch }));
  const returnToPreparation = () => update({ activeScreen: "beforeStart" });
  const provider = screen.startsWith("provider");
  const completeCta =
    state.entryContext === "prizeHistory" ? c.proceedShipping
    : state.entryContext === "profile" ? c.proceedProfile
    : c.proceedStore;
  const card = "relative w-full max-w-[350px] rounded-2xl bg-white px-5 pb-5 pt-5 shadow-[0_18px_55px_rgba(0,0,0,.3)]";
  const redButton = "w-full rounded-lg bg-[#e60012] py-3 text-[14px] font-extrabold text-white active:scale-[.99]";

  const finishIdSubmission = () => {
    if (state.scenario === "identityAttention") update({ poiStatus: "needsAttention", activeScreen: "identityAttention" });
    else if (state.scenario === "identityReview") update({ poiStatus: "inProgress", activeScreen: "identityProgress" });
    else update({ poiStatus: "approved", activeScreen: "identityComplete" });
  };
  const finishPoaSubmission = () => {
    if (state.scenario === "poaAttention") update({ poaStatus: "needsAttention", activeScreen: "poaAttention" });
    else if (state.scenario === "poaReview") update({ poaStatus: "inProgress", activeScreen: "poaProgress" });
    else update({ poaStatus: "approved", activeScreen: "complete" });
  };

  if (provider) {
    const isPoa = screen.includes("Poa");
    if (screen === "providerIdIntro" || screen === "providerPoaIntro") return <div className="absolute inset-0 z-[120] flex flex-col bg-white">
      <button onClick={returnToPreparation} aria-label={c.close} className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-[#202629]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      <div className="pt-4"><VeriffLogo /></div>
      <div className="px-5 pt-3"><h2 className="text-[22px] font-black text-[#24282d]">{isPoa ? c.providerPoaTitle : c.providerIdTitle}</h2><p className="mt-1 text-[15px] leading-[1.55] text-[#505563]">{isPoa ? c.providerPoaBody : c.providerIdBody}</p></div>
      <div className="flex flex-1 items-start justify-center pt-8"><VeriffHeroIllustration /></div>
      <div className="px-5 pb-4 text-center"><button onClick={() => update({ activeScreen: isPoa ? "providerPoaCapture" : "providerIdCapture" })} className="mx-auto block w-[196px] rounded-lg bg-[#003B3B] py-4 text-[15px] font-bold text-white">{c.letsGo}</button><p className="mt-5 text-[10px] leading-relaxed text-[#7D828B]">{c.providerPrivacy}</p><p className="mt-2 text-[11px] font-semibold text-[#D0D3D5]">Powered by <span className="font-black">veriff</span></p></div>
    </div>;
    if (screen === "providerIdMethod" || screen === "providerPoaMethod" || screen === "providerIdCapture" || screen === "providerPoaCapture") return <div className="absolute inset-0 z-[120] flex flex-col bg-[#102f31] text-white">
      <button onClick={returnToPreparation} aria-label={c.close} className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button><div className="pt-5 text-center text-[11px] font-bold tracking-wide text-white/75">veriff</div><div className="flex flex-1 flex-col items-center justify-center px-5 text-center"><h2 className="mb-2 text-[16px] font-bold">{isPoa ? c.capturePoa : c.captureId}</h2><p className="mb-5 max-w-[280px] text-[11px] text-white/70">{c.captureHint}</p><button aria-label={isPoa ? c.capturePoa : c.captureId} onClick={() => update({ activeScreen: isPoa ? "providerPoaSubmitted" : "providerSelfie" })} className="relative flex h-[290px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-white/40 bg-[linear-gradient(165deg,#688083_0%,#c9b28f_55%,#333f3f_56%,#172e31_100%)]"><span className="h-[176px] w-[280px] rounded-md border-2 border-white/80" /></button></div><div className="px-5 pb-7"><button aria-label={isPoa ? c.capturePoa : c.captureId} onClick={() => update({ activeScreen: isPoa ? "providerPoaSubmitted" : "providerSelfie" })} className="mx-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-white/20 shadow-[0_0_0_3px_rgba(255,255,255,.35)]"><span className="pointer-events-none h-12 w-12 rounded-full bg-white" /></button></div>
    </div>;
    if (screen === "providerSelfie") return <div className="absolute inset-0 z-[120] flex flex-col bg-[#173c3d] text-white">
      <button onClick={returnToPreparation} aria-label={c.close} className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button><div className="pt-5 text-center"><VeriffLogo /></div><div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><h2 className="text-[21px] font-black">{c.selfieTitle}</h2><p className="mt-2 text-[12px] text-white/70">{c.selfieBody}</p><div className="my-8 h-64 w-44 rounded-[50%] border-4 border-white/80 bg-[radial-gradient(circle_at_50%_38%,#dfb69b_0_18%,#223e41_19%_100%)]" /></div><div className="px-5 pb-7"><button onClick={() => update({ activeScreen: "providerIdSubmitted" })} className="w-full rounded-lg bg-[#00a990] py-3.5 font-bold">{c.takeSelfie}</button></div>
    </div>;
    return <div className="absolute inset-0 z-[120] flex flex-col bg-white px-6 text-center"><div className="pt-5"><VeriffLogo /></div><div className="flex flex-1 flex-col items-center justify-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#24DCC4] text-[28px] font-black text-white">✓</div><h2 className="mt-5 text-[22px] font-black text-[#24282D]">{c.submittedTitle}</h2><p className="mt-2 max-w-[260px] text-[12px] leading-relaxed text-[#4F5660]">{c.submittedBody}</p></div><button onClick={isPoa ? finishPoaSubmission : finishIdSubmission} className="mb-10 w-full rounded-md bg-[#003B3B] py-3.5 text-[13px] font-bold text-white">{c.done}</button></div>;
  }

  if (screen === "details") return <div className="absolute inset-0 z-[120] overflow-y-auto bg-black/55 px-4 py-5"><div className={`${card} mx-auto px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-4 text-[20px] font-black text-[#1d2129]">{c.detailsTitle}</h2><p className="mt-1 text-[11px] text-[#3157A4]">{c.detailsBody}</p><h3 className="mt-3 text-[12px] font-black text-[#1D2129]">{lang === "ja" ? "個人情報" : "Personal Information"}</h3><KycDetailsFields lang={lang} c={c} details={state.details} onChange={(details) => update({ details })} /><button onClick={() => update({ activeScreen: "beforeStart" })} className={`${redButton} mt-4`}>{c.continue}</button><p className="mt-2 text-center text-[9px] text-[#3157A4]">♙ {lang === "ja" ? "安全な暗号化で情報を保護します。" : "We use secure encryption to protect your information."}</p></div></div>;

  if (screen === "required") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/55 px-5"><div className={card}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><div className="mx-auto mt-5 flex justify-center"><VerificationBadge /></div><h2 className="mt-3 text-center text-[19px] font-black text-[#1d2129]">{c.requiredTitle}</h2><p className="mt-2 text-center text-[12px] leading-relaxed text-[#69717a]">{c.requiredBody}</p><button onClick={() => update({ activeScreen: "details" })} className={`${redButton} mt-5`}>{c.start}</button><p className="mt-3 text-center text-[10px] text-[#8a9099] underline">{c.support}</p></div></div>;

  if (screen === "beforeStart") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/55 px-4"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-4 text-[21px] font-black text-[#1d2129]">{c.beforeTitle}</h2><p className="mt-1 text-[11px] text-[#69717a]">{c.beforeBody}</p><h3 className="mt-4 text-[11px] font-black text-[#1d2129]">{c.identityDocs}</h3><div className="mt-2 space-y-2.5">{[[c.passport,"passport"],[c.myNumber,"card"],[c.driver,"license"]].map(([label,kind]) => <div key={label} className="flex items-center gap-3 text-[12px] text-[#252A30]"><span className="flex w-7 justify-center"><DocumentIcon kind={kind as "passport" | "card" | "license"} /></span><span>{label}</span></div>)}</div><div className="my-3 border-t border-[#E1E3E6]" /><h3 className="text-[11px] font-black text-[#1d2129]">{c.poaDocs}</h3><div className="mt-2 space-y-2.5"><div className="flex items-center gap-3 text-[11px] text-[#252A30]"><span className="flex w-7 justify-center"><DocumentIcon kind="card" /></span><span>{c.myNumber} / {c.driver}</span></div><div className="flex items-center gap-3 text-[11px] text-[#252A30]"><span className="flex w-7 justify-center"><DocumentIcon kind="paper" /></span><span>{c.utility}, {c.bank} / {c.jyuminhyo}</span></div></div><div className="my-3 border-t border-[#E1E3E6]" /><p className="text-[10px] leading-relaxed text-[#69717a]">{c.issued}</p><div className="my-3 border-t border-[#E1E3E6]" /><p className="flex items-center gap-3 text-[10px] leading-relaxed text-[#69717a]"><DocumentIcon kind="lock" />{c.secure}</p><button onClick={() => update({ activeScreen: state.poiStatus === "approved" ? "providerPoaIntro" : "providerIdIntro" })} className={`${redButton} mt-4`}>{c.start}</button></div></div>;

  if (screen === "identityProgress") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[#F4F5F7] px-5"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-5 text-[20px] font-black text-[#1d2129]">{c.progressTitle}</h2><p className="mt-2 text-[11px] leading-relaxed text-[#4F5660]">{c.progressBody}</p><div className="mx-auto my-5 flex justify-center"><KycResultIllustration /></div><KycStepTimeline mode="review" c={c} /><button onClick={onExit} className={redButton}>{c.understood}</button><p className="mt-4 text-center text-[10px] text-[#5F6670]">{c.support}</p></div></div>;

  if (screen === "poaProgress") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[#F4F5F7] px-5"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-5 text-[20px] font-black text-[#1d2129]">{c.poaProgressTitle}</h2><p className="mt-2 text-[11px] leading-relaxed text-[#4F5660]">{c.poaProgressBody}</p><div className="mx-auto my-5 flex justify-center"><KycResultIllustration /></div><KycStepTimeline mode="poaReview" c={c} /><button onClick={onExit} className={redButton}>{c.understood}</button><p className="mt-4 text-center text-[10px] text-[#5F6670]">{c.support}</p></div></div>;

  if (screen === "identityComplete") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[#F4F5F7] px-5"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-5 text-[20px] font-black text-[#1d2129]">{c.identityCompleteTitle}</h2><p className="mt-2 text-[11px] leading-relaxed text-[#4F5660]">{c.identityCompleteBody}</p><div className="mx-auto my-5 flex justify-center"><KycResultIllustration complete /></div><KycStepTimeline mode="complete" c={c} /><button onClick={() => update({ activeScreen: "providerPoaIntro" })} className={redButton}>{c.continueToPoa}</button><p className="mt-4 text-center text-[10px] text-[#5F6670]">{c.support}</p></div></div>;

  if (screen === "identityAttention") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[#F4F5F7] px-5"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-5 text-[19px] font-black text-[#1d2129]">{c.identityAttentionTitle}</h2><p className="mt-2 text-[11px] text-[#4F5660]">{c.identityAttentionBody}</p><KycStepTimeline mode="attention" c={c} /><div className="rounded-xl border border-[#FFCFD1] bg-[#FFF4F4] p-4"><div className="flex items-center gap-3 text-[#D9000D]"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#E60012] font-black">!</span><h3 className="text-[13px] font-black">{c.documentErrorTitle}</h3></div><ul className="mt-3 space-y-2 pl-10 text-[11px] text-[#20252B]">{c.documentErrorBullets.map(item => <li key={item} className="list-disc">{item}</li>)}</ul></div><button onClick={() => update({ poiStatus: "notStarted", poaStatus: "notStarted", activeScreen: "providerIdIntro" })} className={`${redButton} mt-5`}>{c.retry}</button><p className="mt-4 text-center text-[10px] text-[#5F6670]">{c.support}</p></div></div>;

  if (screen === "poaAttention") return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[#F4F5F7] px-5"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-5 text-[19px] font-black text-[#1d2129]">{c.poaAttentionTitle}</h2><p className="mt-2 text-[11px] text-[#4F5660]">{c.poaAttentionBody}</p><KycStepTimeline mode="poaAttention" c={c} /><div className="rounded-xl border border-[#FFCFD1] bg-[#FFF4F4] p-4"><div className="flex items-start gap-3 text-[#D9000D]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#E60012] font-black">!</span><div><h3 className="text-[13px] font-black">{c.poaErrorTitle}</h3><p className="mt-2 text-[11px] leading-relaxed text-[#303640]">{c.poaErrorSubtitle}</p></div></div><div className="my-3 border-t border-[#F2C8CA]" /><ul className="space-y-2 pl-10 text-[11px] text-[#20252B]">{c.poaErrorBullets.map(item => <li key={item} className="list-disc">{item}</li>)}</ul></div><button type="button" disabled className="mt-5 w-full cursor-not-allowed rounded-lg bg-[#FFD9DB] py-3 text-[14px] font-extrabold text-[#FF7C82]">{c.resubmit}</button><p className="mt-3 text-center text-[10px] text-[#E60012]">{c.nextUpload}</p><p className="mt-4 text-center text-[10px] text-[#5F6670]">{c.support}</p></div></div>;

  return <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[#F4F5F7] px-5"><div className={`${card} px-6`}><XButton label={c.close} onClick={onExit} /><OripalotLogo /><h2 className="mt-5 text-center text-[21px] font-black text-[#1d2129]">{c.completeTitle}</h2><p className="mt-2 text-center text-[12px] text-[#4F5660]">{c.completeBody}</p><div className="mx-auto my-5 flex justify-center"><KycResultIllustration complete /></div><p className="text-center text-[12px] text-[#303640]">{c.accountId}: <strong>839473754</strong></p><div className="relative my-5"><div className="absolute left-[13px] top-7 h-[58px] w-px bg-[#D8DCE1]" /><div className="relative flex items-center gap-3 border-b border-[#E1E4E8] py-3"><span className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#C9CDD2] bg-white text-[14px] font-black">✓</span><span className="flex-1 text-[12px] font-bold text-[#20252B]">{c.identity}</span><span className="text-[10px] font-semibold text-[#4B5563]">{c.approved}</span></div><div className="relative flex items-center gap-3 py-3"><span className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#C9CDD2] bg-white text-[14px] font-black">✓</span><span className="flex-1 text-[12px] font-bold text-[#20252B]">{c.poa}</span><span className="text-[10px] font-semibold text-[#4B5563]">{c.approved}</span></div></div><button onClick={() => { update({ activeScreen: null }); onContextReturn(state.entryContext, true); }} className={redButton}>{completeCta}</button><p className="mt-4 text-center text-[10px] text-[#5F6670]">{c.support}</p></div></div>;
}

export function KycScenarioControl({ value, onChange, onReset }: { value: KycScenario; onChange: (value: KycScenario) => void; onReset: () => void }) {
  return <div className="flex flex-col items-start gap-2"><span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/45">KYC scenario</span><select value={value} onChange={(e) => onChange(e.target.value as KycScenario)} className="w-[154px] rounded-lg border border-white/15 bg-[#202127] px-2 py-1.5 text-[11px] font-semibold text-white outline-none"><option value="none">No KYC requested</option><option value="happy">Happy path</option><option value="identityReview">Identity review</option><option value="identityAttention">Identity attention</option><option value="poaReview">PoA review</option><option value="poaAttention">PoA attention</option></select><button onClick={onReset} className="text-[10px] font-semibold text-white/50 underline underline-offset-2">Reset KYC session</button></div>;
}
