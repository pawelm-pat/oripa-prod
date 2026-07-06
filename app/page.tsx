"use client";

import { useState } from "react";
import type { Lang, Screen } from "./lib/types";
import { LangToggle, PhoneApp, UpdatePrompt, VersionBadge } from "./components/oripa";
import { CommentsPanel } from "./components/comments";

// Near-production shell: renders only the phone experience. Entry point is the
// logged-out lobby (V1); the internal POC config panel / flow-map are dropped.
export default function Page() {
  const [lang, setLang] = useState<Lang>("en");
  // Drives the per-screen review comments panel.
  const [screen, setScreen] = useState<Screen>("landing");
  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-[linear-gradient(180deg,#16171c_0%,#0f1014_100%)]">
      {/* Desktop: phone centred in a simple device frame */}
      <div className="relative hidden sm:block py-8">
        <div className="absolute right-full top-3 mr-4 w-max"><LangToggle lang={lang} setLang={setLang} /></div>
        <div className="rounded-[2.6rem] border border-white/12 bg-[#1b1c22] p-3 shadow-[0_35px_90px_rgba(0,0,0,0.55)]">
          <div className="rounded-[2.1rem] border border-white/8 bg-black p-2">
            <div className="mx-auto mb-2 h-6 w-28 rounded-full bg-white/10" />
            <div className="relative h-[812px] w-[390px] overflow-hidden rounded-[1.7rem] bg-[#eef0f3]">
              <PhoneApp lang={lang} noHistory={false} onScreenChange={setScreen} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: full-bleed phone */}
      <div className="relative w-full max-w-[440px] flex-1 overflow-hidden bg-[#eef0f3] sm:hidden" style={{ height: "100svh" }}>
        <PhoneApp lang={lang} noHistory={false} onScreenChange={setScreen} />
      </div>

      <CommentsPanel screen={screen} />
      <UpdatePrompt />
      <VersionBadge />
    </main>
  );
}
