"use client";

import { useState } from "react";
import type { Lang, Screen } from "./lib/types";
import { LangToggle, PhoneApp, UpdatePrompt, VersionBadge } from "./components/oripa";
import { CommentsPanel } from "./components/comments";
import { DevPanels } from "./components/devpanels";
import { KycScenarioControl, KYC_SESSION_KEY, type KycScenario } from "./components/kyc";

// Near-production shell: renders only the phone experience. Entry point is the
// logged-out lobby (V1); the internal POC config panel / flow-map are dropped.
export default function Page() {
  const [lang, setLang] = useState<Lang>("en");
  // Drives the per-screen review comments panel.
  const [screen, setScreen] = useState<Screen>("landing");
  const [kycScenario, setKycScenario] = useState<KycScenario>("happy");
  const [kycResetToken, setKycResetToken] = useState(0);
  // Demo control: whether the member still has free shipping quota left.
  // Drives the My Loot shipping badge (free vs. paid ¥500) and hint copy.
  const [freeShipping, setFreeShipping] = useState(true);

  function changeKycScenario(value: KycScenario) {
    try { sessionStorage.removeItem(KYC_SESSION_KEY); } catch {}
    setKycScenario(value);
    setKycResetToken((token) => token + 1);
  }

  function resetKycSession() {
    try { sessionStorage.removeItem(KYC_SESSION_KEY); } catch {}
    setKycResetToken((token) => token + 1);
  }

  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-[linear-gradient(180deg,#16171c_0%,#0f1014_100%)]">
      {/* Desktop: phone centred in a simple device frame */}
      <div className="relative hidden sm:block py-8">
        <div className="absolute right-full top-3 mr-4 flex w-max flex-col items-end gap-4">
          <LangToggle lang={lang} setLang={setLang} />
          <KycScenarioControl value={kycScenario} onChange={changeKycScenario} onReset={resetKycSession} />
          <FreeShippingControl value={freeShipping} onChange={setFreeShipping} />
        </div>
        <div className="rounded-[2.6rem] border border-white/12 bg-[#1b1c22] p-3 shadow-[0_35px_90px_rgba(0,0,0,0.55)]">
          <div className="rounded-[2.1rem] border border-white/8 bg-black p-2">
            <div className="mx-auto mb-2 h-6 w-28 rounded-full bg-white/10" />
            <div className="relative h-[812px] w-[390px] overflow-hidden rounded-[1.7rem] bg-[#eef0f3]">
              <PhoneApp
                key={kycResetToken}
                lang={lang}
                noHistory={false}
                initialKycScenario={kycScenario}
                onScreenChange={setScreen}
                freeShipAvailable={freeShipping}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: full-bleed phone */}
      <div className="relative w-full max-w-[440px] flex-1 overflow-hidden bg-[#eef0f3] sm:hidden" style={{ height: "100svh" }}>
        <PhoneApp
          key={kycResetToken}
          lang={lang}
          noHistory={false}
          initialKycScenario={kycScenario}
          onScreenChange={setScreen}
          freeShipAvailable={freeShipping}
        />
      </div>

      <DevPanels screen={screen} />
      <CommentsPanel screen={screen} />
      <UpdatePrompt />
      <VersionBadge />
    </main>
  );
}

// Demo toggle (dev harness only): switch the My Loot shipping badge between
// "free shipping remaining" and "no free quota → pay ¥500 at checkout".
function FreeShippingControl({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/45">Free shipping</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-white/15">
        {([["Yes", true], ["No", false]] as const).map(([label, v]) => (
          <button
            key={label}
            onClick={() => onChange(v)}
            className={`px-4 py-1.5 text-[11px] font-semibold transition ${value === v ? "bg-[#f5670a] text-white" : "bg-[#202127] text-white/60"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
