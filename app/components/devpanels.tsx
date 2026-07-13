"use client";

import { useState } from "react";
import type { Screen } from "../lib/types";
import { SCREEN_REQUIREMENTS } from "../data/requirements";
import { figmaEmbedUrl, figmaFileUrl, nodeForScreen } from "../data/figma";

type Panel = "none" | "req" | "design";

// Reviewer tooling shown beside the phone frame. Two right-edge tabs open
// slide-out panels that reflect the screen currently shown in the frame:
//  • Product requirements — the current screen's functionality + validation.
//  • Product designs      — the matching Figma frame, embedded.
export function DevPanels({ screen }: { screen: Screen }) {
  const [panel, setPanel] = useState<Panel>("none");
  const req = SCREEN_REQUIREMENTS[screen];
  const node = nodeForScreen(screen);

  const close = () => setPanel("none");

  const reqPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b border-black/10 px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" className="mt-0.5">
          <path d="M9 5h9M9 12h9M9 19h9M4 5h.01M4 12h.01M4 19h.01" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight text-[#1d2129]">Product requirements</p>
          <p className="truncate text-[11px] text-[#8a9099]">{req.label}</p>
        </div>
        <button onClick={close} aria-label="Close requirements" className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[12.5px] leading-relaxed text-[#5c626b]">{req.summary}</p>

        {req.groups.map((g, gi) => (
          <section key={gi} className="mt-5">
            <h4 className="flex items-center gap-2 text-[12.5px] font-bold text-[#1d2129]">
              <span className="h-3.5 w-1 shrink-0 rounded-full bg-[#2563eb]" />
              {g.title}
            </h4>

            {g.items.length > 0 && (
              <ul className="mt-2 space-y-2">
                {g.items.map((it, i) => {
                  const text = typeof it === "string" ? it : it.text;
                  const sub = typeof it === "string" ? undefined : it.sub;
                  return (
                    <li key={i} className="text-[12.5px] leading-relaxed text-[#2a2f36]">
                      <div className="flex gap-2">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                        <span>{text}</span>
                      </div>
                      {sub && sub.length > 0 && (
                        <ul className="ml-[23px] mt-1 space-y-1 border-l border-black/10 pl-3">
                          {sub.map((s, si) => (
                            <li key={si} className="text-[11.5px] leading-relaxed text-[#5c626b]">{s}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {g.validation && g.validation.length > 0 && (
              <div className="mt-2 rounded-lg bg-[#eff6ff] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#2563eb]">Validation & rules</p>
                <ul className="mt-1 space-y-1">
                  {g.validation.map((v, i) => (
                    <li key={i} className="text-[11.5px] leading-relaxed text-[#2a2f36]">{v}</li>
                  ))}
                </ul>
              </div>
            )}

            {g.tbc && g.tbc.length > 0 && (
              <div className="mt-2 rounded-lg bg-[#fff7ed] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#b45309]">TBC / TBA</p>
                <ul className="mt-1 space-y-1">
                  {g.tbc.map((v, i) => (
                    <li key={i} className="text-[11.5px] leading-relaxed text-[#7c5312]">{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="border-t border-black/10 px-4 py-2.5">
        <p className="text-center text-[10px] text-[#a4aab2]">Reflects the screen currently shown in the frame</p>
      </div>
    </div>
  );

  const designPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M8 2h4v6H8a3 3 0 010-6z" fill="#f24e1e" /><path d="M12 2h4a3 3 0 010 6h-4V2z" fill="#a259ff" /><path d="M8 8h4v6H8a3 3 0 010-6z" fill="#1abcfe" /><circle cx="15" cy="11" r="3" fill="#0acf83" /><path d="M8 14h4v3a3 3 0 11-4-3z" fill="#ff7262" /></svg>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight text-[#1d2129]">Product designs</p>
          <p className="truncate text-[11px] text-[#8a9099]">{req.label}</p>
        </div>
        <a href={figmaFileUrl(node)} target="_blank" rel="noopener noreferrer" className="mr-1 flex items-center gap-1 rounded-md border border-black/10 px-2 py-1 text-[11px] font-semibold text-[#1d2129] hover:bg-black/5">
          Open
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-9 9M10 5H5v14h14v-5" /></svg>
        </a>
        <button onClick={close} aria-label="Close designs" className="flex h-7 w-7 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-1 bg-[#f5f5f7]">
        <iframe
          key={node}
          title={`Figma — ${req.label}`}
          src={figmaEmbedUrl(node)}
          className="h-full w-full border-0"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="border-t border-black/10 px-4 py-2.5">
        <p className="text-center text-[10px] text-[#a4aab2]">
          If the preview is blank, the Figma file needs link sharing set to “Anyone with the link”.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Collapsed — desktop side tabs (stacked near the top-right edge) */}
      {panel === "none" && (
        <div className="fixed right-0 top-16 z-[95] hidden flex-col gap-2 sm:flex">
          <button
            onClick={() => setPanel("req")}
            aria-label="Open product requirements"
            className="flex flex-col items-center gap-2 rounded-l-xl bg-[#2563eb] px-2.5 py-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5h9M9 12h9M9 19h9M4 5h.01M4 12h.01M4 19h.01" strokeLinecap="round" /></svg>
            <span className="text-[11px] font-bold [writing-mode:vertical-rl]">Requirements</span>
          </button>
          <button
            onClick={() => setPanel("design")}
            aria-label="Open product designs"
            className="flex flex-col items-center gap-2 rounded-l-xl bg-[#7c3aed] px-2.5 py-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></svg>
            <span className="text-[11px] font-bold [writing-mode:vertical-rl]">Designs</span>
          </button>
        </div>
      )}

      {/* Collapsed — mobile FABs (bottom-left, clear of the Comments FAB) */}
      {panel === "none" && (
        <div className="fixed bottom-4 left-4 z-[95] flex flex-col gap-2 sm:hidden">
          <button onClick={() => setPanel("req")} aria-label="Open product requirements" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5h9M9 12h9M9 19h9M4 5h.01M4 12h.01M4 19h.01" strokeLinecap="round" /></svg>
          </button>
          <button onClick={() => setPanel("design")} aria-label="Open product designs" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}

      {/* Expanded */}
      {panel !== "none" && (
        <>
          <div className="fixed inset-0 z-[96] bg-black/40 sm:hidden" onClick={close} />
          <aside className="fixed inset-x-0 bottom-0 z-[97] h-[85vh] rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.3)] sm:inset-x-auto sm:right-0 sm:top-0 sm:h-full sm:rounded-none sm:shadow-[-8px_0_30px_rgba(0,0,0,0.25)] sm:w-[380px]">
            {panel === "req" ? reqPanel : designPanel}
          </aside>
        </>
      )}
    </>
  );
}
