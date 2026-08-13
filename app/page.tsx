"use client";

import { useState } from "react";
import type { DrawScenario, Lang, Screen } from "./lib/types";
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
  const [kycScenario, setKycScenario] = useState<KycScenario>("none");
  const [kycResetToken, setKycResetToken] = useState(0);
  // Demo control: whether the member still has free shipping quota left.
  // Drives the My Loot shipping badge (free vs. paid ¥500) and hint copy.
  const [freeShipping, setFreeShipping] = useState(true);
  // True only while the draw-results overlay is open (not draw selection).
  const [drawResultsOpen, setDrawResultsOpen] = useState(false);
  // Demo control: whether the member already has a saved shipping address.
  // No -> shipping flow opens on the "Add address" form; Yes -> pre-populated
  // "Choose shipping address" step.
  const [addressProvided, setAddressProvided] = useState(true);
  // Demo control (draw results only): whether today's draw limit is reached.
  // Yes -> "Draw again" shows the Daily Limit Reached popup; No -> it re-opens
  // the draw-confirmation popup.
  const [dailyLimit, setDailyLimit] = useState(false);
  // Demo control (draw screen only): whether the pack is expired/sold out.
  // Yes -> confirming a draw shows the "Sold Out" popup, then the draw screen
  // greys out with no CTAs; No -> normal draw flow.
  // Demo control (draw screen only): pick a draw scenario.
  //   off      -> normal draw flow
  //   expired  -> Sold Out popup, then greyed-out draw screen
  //   connError-> Connection Error popup (Retry succeeds, Cancel returns)
  //   stock    -> only 8 left; drawing more prompts "draw remaining 8"
  const [drawScenario, setDrawScenario] = useState<DrawScenario>("off");
  // Demo control (draw confirm popup): whether the pack accepts both currencies.
  // Yes -> confirm popup shows coins (top) + free points (below); No -> coins only.
  const [multiCurrency, setMultiCurrency] = useState(true);

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
          {/* Only relevant where prizes can be selected for shipping:
              My Loot, and the draw-results overlay (not draw selection). */}
          {(screen === "myLoot" || drawResultsOpen) && (
            <>
              <ToggleControl label="Free shipping" value={freeShipping} onChange={setFreeShipping} />
              <ToggleControl label="Address provided" value={addressProvided} onChange={setAddressProvided} />
              {drawResultsOpen && (
                <ToggleControl label="Daily limit" value={dailyLimit} onChange={setDailyLimit} />
              )}
            </>
          )}
          {/* Draw screen only: pick a draw scenario to simulate. */}
          {screen === "drawDetail" && !drawResultsOpen && (
            <>
              <SelectControl
                label="Draw scenario"
                value={drawScenario}
                onChange={setDrawScenario}
                options={[
                  ["Happy path", "off"],
                  ["Draw expired", "expired"],
                  ["Connection Error", "connError"],
                  ["Insufficient Stock Left", "stock"],
                ]}
              />
              <ToggleControl label="Multi-currency" value={multiCurrency} onChange={setMultiCurrency} />
            </>
          )}
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
                onDrawResultsChange={setDrawResultsOpen}
                addressProvided={addressProvided}
                dailyLimitReached={dailyLimit}
                drawScenario={drawScenario}
                multiCurrency={multiCurrency}
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
          onDrawResultsChange={setDrawResultsOpen}
          addressProvided={addressProvided}
          dailyLimitReached={dailyLimit}
          drawScenario={drawScenario}
          multiCurrency={multiCurrency}
        />
      </div>

      <DevPanels screen={screen} />
      <CommentsPanel screen={screen} />
      <UpdatePrompt />
      <VersionBadge />
    </main>
  );
}

// Demo Yes/No toggle (dev harness only). Used for "Free shipping" (free vs.
// paid ¥500 badge), "Address provided" (pre-populated address vs. add-new) and
// "Daily limit" (draw-again limit popup vs. re-open confirm). Fixed width with
// equal-width Yes/No halves so all toggles line up neatly in the rail.
function ToggleControl({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex w-[168px] flex-col items-start gap-2">
      <span className="whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/45">{label}</span>
      <div className="flex w-full overflow-hidden rounded-lg border border-white/15">
        {([["Yes", true], ["No", false]] as const).map(([lbl, v]) => (
          <button
            key={lbl}
            onClick={() => onChange(v)}
            className={`flex-1 py-1.5 text-[11px] font-semibold transition ${value === v ? "bg-[#f5670a] text-white" : "bg-[#202127] text-white/60"}`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

// Demo single-select (dev harness only): a stacked list of mutually exclusive
// options. Used for the draw-screen scenario picker.
function SelectControl<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [string, T])[] }) {
  return (
    <div className="flex w-[168px] flex-col items-start gap-2">
      <span className="whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/45">{label}</span>
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-white/15">
        {options.map(([lbl, v]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`w-full px-2.5 py-1.5 text-left text-[11px] font-semibold transition ${value === v ? "bg-[#f5670a] text-white" : "bg-[#202127] text-white/60"}`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
