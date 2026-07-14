"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang, Rarity } from "../lib/types";
import { RARITY_IMG } from "../data/prizes";

/* ─────────────────────────────────────────────────────────────────────────
   Slot game (pack opening). Opened from the Store "Buy a pack" CTA.
   Three reels spin classic symbols; a matching line drops a card into the
   player's stack, big wins drop a small pile. When the spins run out we show
   the "your stack" summary. Styling follows the oripa brand (red #D10005,
   Noto Sans JP, oripa card art).
   ───────────────────────────────────────────────────────────────────────── */

type WonCard = { id: number; name: string; nameJa: string; rarity: Rarity };

type Props = {
  packName: string;
  credits: number;
  spins: number;
  lang: Lang;
  // Real app header (white bar with logo + balance) kept visible above the game.
  header?: ReactNode;
  onClose: () => void;
};

// Shared font + surface so the game matches the app shell (white header + the
// light app body). Noto Sans JP is inherited from the body but set explicitly.
const FONT = "var(--font-noto-sans-jp), system-ui, sans-serif";
const SURFACE = "#eef0f3";

const SYMBOLS = ["🍒", "⭐", "🔔", "7️⃣", "💎", "🍀"] as const;

const CARD_POOL: { name: string; nameJa: string; rarity: Rarity }[] = [
  { name: "Flamepup",       nameJa: "フレイムパップ",     rarity: "N" },
  { name: "Aquafin",        nameJa: "アクアフィン",       rarity: "N" },
  { name: "Mossling",       nameJa: "モスリング",         rarity: "N" },
  { name: "Pebblit",        nameJa: "ペブリット",         rarity: "N" },
  { name: "Leafling",       nameJa: "リーフリング",       rarity: "SR" },
  { name: "Sparkbat",       nameJa: "スパークバット",     rarity: "SR" },
  { name: "Frostcub",       nameJa: "フロストカブ",       rarity: "SR" },
  { name: "Emberdrake",     nameJa: "エンバードレイク",   rarity: "UR" },
  { name: "Celestidragon",  nameJa: "セレスティドラゴン", rarity: "UR" },
];

const STR = {
  en: {
    spinsLeft: (n: number) => `${n} spins left`,
    toPayout: "to payout",
    stacked: (n: number) => `${n} cards stacked — the bar tracks credits spent, at 100% the stack is yours`,
    winsDrop: "Wins drop a card into your stack — BIG WINS drop a pile",
    spin: (cost: number) => `SPIN · ${cost} cr`,
    exit: "Exit",
    quickSpin: "Quick spin",
    fastForward: "Fast-forward",
    keepSpinning: "Keep spinning",
    bigWin: "BIG WIN!",
    yourStack: (pack: string) => `${pack} — your stack`,
    summary: (credits: number, spins: number, cards: number) =>
      `${credits} credits · ${spins} spins · ${cards} cards won`,
    backToShop: "Back to shop",
    openAnother: "Open another",
    noCards: "No cards won this time.",
    version1: "Classic",
    version2: "Real slot",
    balance: "Balance",
    spinSize: "Spin size",
    winLabel: "Win",
    jpMinor: "MINOR",
    jpMajor: "MAJOR",
    jpGrand: "GRAND",
    featSpins: "Extra spins",
    featRows: "Extra rows",
    featBoost: "Boosters",
    rarity: { N: "Common", SR: "Rare", UR: "Ultra Rare" } as Record<Rarity, string>,
  },
  ja: {
    spinsLeft: (n: number) => `残り${n}回`,
    toPayout: "達成まで",
    stacked: (n: number) => `${n}枚ストック — バーは消費クレジットを表示、100%でストックがあなたのものに`,
    winsDrop: "当たりでカードがストックに、大当たりでまとめてゲット",
    spin: (cost: number) => `スピン · ${cost}cr`,
    exit: "退出",
    quickSpin: "クイックスピン",
    fastForward: "早送り",
    keepSpinning: "続けてスピン",
    bigWin: "大当たり！",
    yourStack: (pack: string) => `${pack} — あなたのストック`,
    summary: (credits: number, spins: number, cards: number) =>
      `${credits}クレジット · ${spins}スピン · ${cards}枚獲得`,
    backToShop: "ショップに戻る",
    openAnother: "もう一つ開ける",
    noCards: "今回はカードを獲得できませんでした。",
    version1: "クラシック",
    version2: "リアルスロット",
    balance: "残高",
    spinSize: "ベット",
    winLabel: "配当",
    jpMinor: "マイナー",
    jpMajor: "メジャー",
    jpGrand: "グランド",
    featSpins: "追加スピン",
    featRows: "追加ライン",
    featBoost: "ブースター",
    rarity: { N: "ノーマル", SR: "レア", UR: "ウルトラレア" } as Record<Rarity, string>,
  },
};

const RARITY_COLOR: Record<Rarity, string> = { N: "#8a9099", SR: "#2f6fed", UR: "#D10005" };

const CELL_H = 74;

// Reel column: builds a fresh random strip each spin and scrolls to the
// target symbol with an ease-out transition. spinKey===0 shows the card back.
function Reel({ spinKey, target, durationMs }: { spinKey: number; target: string; durationMs: number }) {
  const strip = useMemo(() => {
    if (spinKey === 0) return [target];
    const arr: string[] = [];
    for (let i = 0; i < 18; i++) arr.push(SYMBOLS[(Math.random() * SYMBOLS.length) | 0]);
    arr.push(target);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const stripRef = useRef<HTMLDivElement>(null);

  // Drive the scroll imperatively: reset to the top with no transition, force a
  // reflow, then animate to the final symbol. Avoids setState-in-effect churn.
  useEffect(() => {
    if (spinKey === 0) return;
    const el = stripRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = "translateY(0)";
    void el.offsetHeight; // force reflow so the reset is committed
    el.style.transition = `transform ${durationMs}ms cubic-bezier(.16,.84,.28,1)`;
    el.style.transform = `translateY(${-(strip.length - 1) * CELL_H}px)`;
  }, [spinKey, strip, durationMs]);

  return (
    <div
      className="relative flex-1 overflow-hidden rounded-xl border border-black/10 bg-[#f4f5f7]"
      style={{ height: CELL_H, boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)" }}
    >
      {spinKey === 0 ? (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#e7e9ed 0 8px,#f4f5f7 8px 16px)" }}
        />
      ) : (
        <div ref={stripRef}>
          {strip.map((s, i) => (
            <div key={i} className="flex items-center justify-center" style={{ height: CELL_H, fontSize: 38 }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Version 2: "real slot" casino grid ─────────────────────────────────────
   A 5×3 themed grid with glossy symbol tiles, jackpot tiers, a big central
   spin button and a control cluster — modelled on a classic hold-and-win slot
   but in the oripa brand (deep red felt, gold accents, Noto Sans JP). */
const GRID_COLS = 5;
const GRID_ROWS = 3;
const GCELL = 60;

// Symbols are oripa trading cards: high-value tiles use the real rarity card
// art, low-value tiles are clean rank "card faces" (10/J/Q/K/A).
type Sym =
  | { kind: "card"; img: string; glow: string }
  | { kind: "rank"; label: string; color: string };

const GRID_SYMBOLS: Sym[] = [
  { kind: "rank", label: "10", color: "#16a34a" },
  { kind: "rank", label: "J", color: "#2f6fed" },
  { kind: "rank", label: "Q", color: "#7c3aed" },
  { kind: "rank", label: "K", color: "#e0113b" },
  { kind: "rank", label: "A", color: "#e8a91d" },
  { kind: "card", img: RARITY_IMG.N, glow: "#8a9099" },
  { kind: "card", img: RARITY_IMG.SR, glow: "#2f6fed" },
  { kind: "card", img: RARITY_IMG.UR, glow: "#D10005" },
];

// Weighted reel strip — ranks are common, cards get rarer toward UR.
const WEIGHTED: Sym[] = (() => {
  const w: [Sym, number][] = [
    [GRID_SYMBOLS[0], 4], [GRID_SYMBOLS[1], 4], [GRID_SYMBOLS[2], 4],
    [GRID_SYMBOLS[3], 3], [GRID_SYMBOLS[4], 3],
    [GRID_SYMBOLS[5], 3], [GRID_SYMBOLS[6], 2], [GRID_SYMBOLS[7], 1],
  ];
  const out: Sym[] = [];
  for (const [s, n] of w) for (let i = 0; i < n; i++) out.push(s);
  return out;
})();

function SymbolTile({ sym }: { sym: Sym }) {
  return (
    <div className="p-[2.5px]" style={{ height: GCELL, width: GCELL }}>
      <div
        className="relative h-full w-full overflow-hidden rounded-lg"
        style={{ border: "1.5px solid rgba(255,215,107,0.5)", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
      >
        {sym.kind === "card" ? (
          <>
            <img src={sym.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="pointer-events-none absolute inset-0 rounded-lg" style={{ boxShadow: `inset 0 0 12px ${sym.glow}` }} />
          </>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(160deg, rgba(255,255,255,0.92), rgba(255,255,255,0.62)), ${sym.color}` }}
          >
            <span className="text-[26px] font-black leading-none" style={{ color: sym.color, textShadow: "0 1px 0 rgba(255,255,255,0.7)" }}>{sym.label}</span>
          </div>
        )}
        {/* top gloss */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.3), transparent)" }} />
      </div>
    </div>
  );
}

// One reel column of the 5×3 grid: scrolls a random strip and stops after
// `durationMs` (+ a per-column `delayMs` stagger) leaving GRID_ROWS visible.
function GridColumn({ spinKey, durationMs, delayMs }: { spinKey: number; durationMs: number; delayMs: number }) {
  const strip = useMemo(() => {
    const n = spinKey === 0 ? GRID_ROWS : 22;
    const arr: Sym[] = [];
    for (let i = 0; i < n; i++) arr.push(WEIGHTED[(Math.random() * WEIGHTED.length) | 0]);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (spinKey === 0) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = "translateY(0)";
    void el.offsetHeight;
    el.style.transition = `transform ${durationMs}ms cubic-bezier(.16,.84,.28,1) ${delayMs}ms`;
    el.style.transform = `translateY(${-(strip.length - GRID_ROWS) * GCELL}px)`;
  }, [spinKey, strip, durationMs, delayMs]);

  return (
    <div className="relative overflow-hidden" style={{ height: GRID_ROWS * GCELL, width: GCELL }}>
      <div ref={ref}>
        {strip.map((s, i) => <SymbolTile key={i} sym={s} />)}
      </div>
    </div>
  );
}

// A jackpot tier plaque (MINOR / MAJOR / GRAND) with a gilded bevel.
function JackpotBadge({ label, mult, tone }: { label: string; mult: string; tone: [string, string] }) {
  return (
    <div className="flex-1 rounded-lg p-[2px]" style={{ background: "linear-gradient(180deg,#ffe6a3,#8a5e12)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
      <div className="rounded-[6px] px-2 py-1 text-center" style={{ background: `linear-gradient(180deg, ${tone[0]}, ${tone[1]})`, boxShadow: "inset 0 1px 1px rgba(255,255,255,0.45)" }}>
        <p className="text-[13px] font-black leading-none text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}>{mult}</p>
        <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white/95">{label}</p>
      </div>
    </div>
  );
}

export function SlotGame({ packName, credits, spins, lang, header, onClose }: Props) {
  const L = STR[lang === "ja" ? "ja" : "en"];
  const costPerSpin = Math.max(1, Math.round(credits / spins));

  const [spinsLeft, setSpinsLeft] = useState(spins);
  const [creditsSpent, setCreditsSpent] = useState(0);
  const [won, setWon] = useState<WonCard[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [targets, setTargets] = useState<string[]>([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
  const [reveal, setReveal] = useState<{ cards: WonCard[]; big: boolean } | null>(null);
  const [phase, setPhase] = useState<"play" | "summary">("play");
  const [quick, setQuick] = useState(false);
  // Experiment toggle: 1 = current "Classic" look, 2 = "Real slot" casino grid.
  const [version, setVersion] = useState<1 | 2>(1);

  const idRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  const payoutPct = Math.min(100, Math.round((creditsSpent / credits) * 100));

  // Decide a spin outcome: win probability + rarity distribution. UR wins pay
  // out a small pile (big win).
  const rollOutcome = useCallback(() => {
    const win = Math.random() < 0.5;
    if (!win) return { rarity: null as Rarity | null, count: 0, big: false };
    const r = Math.random();
    const rarity: Rarity = r < 0.06 ? "UR" : r < 0.32 ? "SR" : "N";
    const big = rarity === "UR";
    const count = big ? 2 + ((Math.random() * 2) | 0) : 1;
    return { rarity, count, big };
  }, []);

  const drawCards = useCallback((rarity: Rarity, count: number): WonCard[] => {
    const pool = CARD_POOL.filter((c) => c.rarity === rarity);
    const out: WonCard[] = [];
    for (let i = 0; i < count; i++) {
      const pick = pool[(Math.random() * pool.length) | 0];
      out.push({ id: ++idRef.current, name: pick.name, nameJa: pick.nameJa, rarity });
    }
    return out;
  }, []);

  const finishIfDone = useCallback((remaining: number) => {
    if (remaining <= 0) after(quick ? 200 : 500, () => setPhase("summary"));
  }, [quick]);

  const doSpin = useCallback(() => {
    if (spinning || spinsLeft <= 0 || reveal) return;
    const outcome = rollOutcome();

    // Choose landing symbols: matching line on a win, deliberately mixed on a loss.
    let next: string[];
    if (outcome.rarity) {
      const s = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      next = [s, s, s];
    } else {
      const a = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      let b = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      if (b === a) b = SYMBOLS[(SYMBOLS.indexOf(b) + 1) % SYMBOLS.length];
      const c = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      next = [a, b, c];
    }

    setTargets(next);
    setSpinning(true);
    setSpinKey((k) => k + 1);
    const nextSpins = spinsLeft - 1;
    setSpinsLeft(nextSpins);
    setCreditsSpent((c) => c + costPerSpin);

    const settle = quick ? 650 : 1000 + 2 * 450 + 150;
    after(settle, () => {
      setSpinning(false);
      if (outcome.rarity) {
        const cards = drawCards(outcome.rarity, outcome.count);
        setWon((w) => [...w, ...cards]);
        setReveal({ cards, big: outcome.big });
      } else {
        finishIfDone(nextSpins);
      }
    });
  }, [spinning, spinsLeft, reveal, rollOutcome, quick, costPerSpin, drawCards, finishIfDone]);

  const dismissReveal = useCallback(() => {
    setReveal(null);
    finishIfDone(spinsLeft);
  }, [spinsLeft, finishIfDone]);

  const fastForward = useCallback(() => {
    if (phase !== "play") return;
    setReveal(null);
    setSpinning(false);
    let remaining = spinsLeft;
    const collected: WonCard[] = [];
    let spent = creditsSpent;
    while (remaining > 0) {
      const o = rollOutcome();
      if (o.rarity) collected.push(...drawCards(o.rarity, o.count));
      spent += costPerSpin;
      remaining--;
    }
    if (collected.length) setWon((w) => [...w, ...collected]);
    setCreditsSpent(spent);
    setSpinsLeft(0);
    setPhase("summary");
  }, [phase, spinsLeft, creditsSpent, rollOutcome, drawCards, costPerSpin]);

  const openAnother = useCallback(() => {
    idRef.current = 0;
    setSpinsLeft(spins);
    setCreditsSpent(0);
    setWon([]);
    setReveal(null);
    setSpinning(false);
    setSpinKey(0);
    setPhase("play");
  }, [spins]);

  /* ── Summary ── */
  if (phase === "summary") {
    return (
      <div className="absolute inset-0 z-[70] flex flex-col text-[#1d2129]" style={{ animation: "slotIn .25s ease", background: SURFACE, fontFamily: FONT }}>
        {header}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
          <h2 className="text-[18px] font-extrabold leading-tight">
            <span style={{ color: "#D10005" }}>{packName}</span>
            <span className="text-[#1d2129]"> {lang === "ja" ? "— あなたのストック" : "— your stack"}</span>
          </h2>
          <p className="mt-1 text-[11px] font-medium text-[#8a9099]">{L.summary(credits, spins, won.length)}</p>
          {won.length === 0 ? (
            <p className="mt-10 text-center text-[13px] text-[#8a9099]">{L.noCards}</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {won.map((c) => (
                <div key={c.id} className="flex flex-col items-center">
                  <img src={RARITY_IMG[c.rarity]} alt="" className="w-full rounded-lg object-cover" style={{ aspectRatio: "5/7", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }} />
                  <p className="mt-1.5 text-center text-[10px] font-bold leading-tight">{lang === "ja" ? c.nameJa : c.name}</p>
                  <p className="text-[8px] font-extrabold uppercase tracking-wide" style={{ color: RARITY_COLOR[c.rarity] }}>{L.rarity[c.rarity]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-3 border-t border-black/10 bg-white px-4 py-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129] active:scale-[0.99]">{L.backToShop}</button>
          <button onClick={openAnother} className="flex-1 rounded-xl py-3 text-[14px] font-extrabold text-white active:scale-[0.99]" style={{ background: "#D10005" }}>{L.openAnother}</button>
        </div>
        <style>{`@keyframes slotIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      </div>
    );
  }

  /* ── Shared bits used by both versions ── */
  const toggleNode = (
    <div className="shrink-0 px-4 pt-3">
      <div className="mx-auto flex w-full max-w-[240px] rounded-full bg-black/[0.06] p-1" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.12)" }}>
        {([1, 2] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVersion(v)}
            className="flex-1 rounded-full py-1.5 text-[12px] font-bold transition-colors"
            style={version === v ? { background: "#D10005", color: "#fff", boxShadow: "0 1px 4px rgba(209,0,5,0.4)" } : { color: "#6b7280" }}
          >
            {v === 1 ? L.version1 : L.version2}
          </button>
        ))}
      </div>
    </div>
  );

  const revealNode = reveal && (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 px-6" onClick={dismissReveal}>
      <div className="w-full max-w-[300px] rounded-2xl bg-white p-5 text-center" style={{ animation: "revealPop .3s cubic-bezier(.2,.9,.3,1.2)" }} onClick={(e) => e.stopPropagation()}>
        {reveal.big && <p className="mb-2 text-[15px] font-black tracking-wide" style={{ color: "#D10005" }}>{L.bigWin}</p>}
        <div className={`flex items-end justify-center ${reveal.cards.length > 1 ? "gap-2" : ""}`}>
          {reveal.cards.map((c, i) => (
            <img
              key={c.id}
              src={RARITY_IMG[c.rarity]}
              alt=""
              className="rounded-lg object-cover"
              style={{
                width: reveal.cards.length > 1 ? 84 : 150,
                aspectRatio: "5/7",
                boxShadow: `0 4px 20px ${RARITY_COLOR[c.rarity]}66`,
                transform: reveal.cards.length > 1 ? `rotate(${(i - (reveal.cards.length - 1) / 2) * 8}deg)` : undefined,
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-[16px] font-extrabold text-[#1d2129]">{lang === "ja" ? reveal.cards[0].nameJa : reveal.cards[0].name}{reveal.cards.length > 1 ? ` ×${reveal.cards.length}` : ""}</p>
        <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: RARITY_COLOR[reveal.cards[0].rarity] }}>{L.rarity[reveal.cards[0].rarity]}</p>
        <button onClick={dismissReveal} className="mt-4 w-full rounded-xl py-3 text-[14px] font-extrabold text-white active:scale-[0.99]" style={{ background: "#D10005" }}>{L.keepSpinning}</button>
      </div>
    </div>
  );

  const styleNode = <style>{`@keyframes slotIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes revealPop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}@keyframes slotShimmer{0%{transform:translateX(-160%) skewX(-18deg)}60%,100%{transform:translateX(460%) skewX(-18deg)}}@keyframes ctaPulse{0%,100%{box-shadow:0 0 0 4px rgba(255,215,107,0.5),0 6px 18px rgba(209,0,5,0.55)}50%{box-shadow:0 0 0 8px rgba(255,215,107,0.16),0 6px 24px rgba(209,0,5,0.75)}}@keyframes paylinePulse{0%,100%{opacity:.5;box-shadow:0 0 8px rgba(255,215,107,0.5)}50%{opacity:1;box-shadow:0 0 18px rgba(255,215,107,0.95)}}@keyframes jpGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}`}</style>;

  /* ── Version 2: real slot casino grid ── */
  if (version === 2) {
    const creditsLeft = Math.max(0, credits - creditsSpent);
    return (
      <div className="absolute inset-0 z-[70] flex flex-col text-white" style={{ animation: "slotIn .25s ease", background: "linear-gradient(180deg,#2a0608 0%,#160305 55%,#0b0203 100%)", fontFamily: FONT }}>
        {/* Immersive scene backdrop: existing banner art, blurred + darkened */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: "url(/oripa-banner-2.png)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.15, filter: "blur(7px)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: "radial-gradient(120% 55% at 50% 4%, rgba(209,0,5,0.28), transparent 60%)" }} />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {header}
        {toggleNode}

        {/* Themed banner */}
        <div className="shrink-0 px-4 pt-3">
          <div className="relative flex h-[74px] items-center justify-between overflow-hidden rounded-xl px-4" style={{ background: "linear-gradient(120deg,#7a0a0f,#D10005 60%,#ff7a00)", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.25), 0 3px 10px rgba(0,0,0,0.5)" }}>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)", animation: "slotShimmer 4s ease-in-out infinite" }} />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">ORIPA</p>
              <p className="text-[20px] font-black leading-none tracking-tight" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>JACKPOT</p>
            </div>
            <div className="relative text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/70">{L.spinsLeft(spinsLeft)}</p>
              <p className="text-[13px] font-extrabold" style={{ color: "#ffd36b" }}>{packName}</p>
            </div>
          </div>
          {/* Feature pills (decorative) */}
          <div className="mt-2.5 flex gap-2">
            {[L.featSpins, L.featRows, L.featBoost].map((f, i) => (
              <div key={f} className="flex-1 rounded-full py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ background: "rgba(0,0,0,0.35)", border: `1.5px solid ${["#e0113b", "#e8a91d", "#2f6fed"][i]}` }}>{f}</div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex flex-1 flex-col justify-center px-4">
          <div
            className="relative mx-auto rounded-2xl p-[3px]"
            style={{ background: "linear-gradient(180deg,#ffe6a3,#8a5e12)", boxShadow: "0 10px 34px rgba(0,0,0,0.65)" }}
          >
            <div
              className="relative overflow-hidden rounded-[14px] p-2"
              style={{ background: "linear-gradient(180deg,#1a0405,#0a0102)", boxShadow: "inset 0 0 26px rgba(0,0,0,0.9)" }}
            >
              <div className="flex gap-1">
                {Array.from({ length: GRID_COLS }).map((_, c) => (
                  <GridColumn
                    key={c}
                    spinKey={spinKey}
                    durationMs={quick ? 420 : 850}
                    delayMs={c * (quick ? 90 : 170)}
                  />
                ))}
              </div>
              {/* Top / bottom depth shadow over the reel window */}
              <div className="pointer-events-none absolute inset-0 rounded-[14px]" style={{ boxShadow: "inset 0 16px 20px -12px rgba(0,0,0,0.95), inset 0 -16px 20px -12px rgba(0,0,0,0.95)" }} />
              {/* Centre payline — subtle at rest, lights up on a win */}
              <div
                className="pointer-events-none absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{ background: "linear-gradient(90deg,transparent,#ffd36b,transparent)", animation: reveal ? "paylinePulse .5s ease-in-out infinite" : "paylinePulse 3s ease-in-out infinite" }}
              />
              {/* Idle shimmer sweep across the glass */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)", animation: "slotShimmer 5s ease-in-out infinite" }} />
              {/* Win amount flourish */}
              {reveal && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded-lg px-4 py-1.5 text-[26px] font-black text-white" style={{ background: "rgba(0,0,0,0.6)", textShadow: "0 0 16px rgba(255,211,107,0.95)", animation: "revealPop .3s ease" }}>
                    +{reveal.cards.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Jackpot tiers */}
          <div className="mt-3 flex gap-2">
            <JackpotBadge label={L.jpMinor} mult="100x" tone={["#c97b2c", "#7a3d0e"]} />
            <JackpotBadge label={L.jpMajor} mult="500x" tone={["#c9ccd2", "#7c8088"]} />
            <div style={{ animation: "jpGlow 2.2s ease-in-out infinite" }} className="flex-1">
              <JackpotBadge label={L.jpGrand} mult="5000x" tone={["#ffd36b", "#c8930f"]} />
            </div>
          </div>
        </div>

        {/* Spin cluster */}
        <div className="shrink-0 px-4 pb-4 pt-1">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 active:text-white" style={{ background: "rgba(255,255,255,0.08)" }} aria-label={L.exit}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              onClick={() => setQuick((q) => !q)}
              className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
              style={{ background: "rgba(255,255,255,0.08)", color: quick ? "#ffd36b" : "rgba(255,255,255,0.7)" }}
              aria-label={L.quickSpin}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
            </button>

            {/* Big central spin button */}
            <button
              onClick={doSpin}
              disabled={spinning || spinsLeft <= 0}
              className="relative flex h-[74px] w-[74px] items-center justify-center rounded-full active:scale-95 disabled:opacity-60"
              style={{ background: "radial-gradient(circle at 50% 35%,#ff5a3c,#D10005)", boxShadow: "0 0 0 4px rgba(255,215,107,0.55), 0 6px 18px rgba(209,0,5,0.55)", animation: spinning || spinsLeft <= 0 ? undefined : "ctaPulse 1.8s ease-in-out infinite" }}
              aria-label="Spin"
            >
              {spinning ? (
                <span className="h-6 w-6 rounded-[3px] bg-white" />
              ) : (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
              )}
            </button>

            <button
              onClick={fastForward}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 active:text-white"
              style={{ background: "rgba(255,255,255,0.08)" }}
              aria-label={L.fastForward}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l7 7-7 7zM13 5l7 7-7 7z" /></svg>
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full text-white/70" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span className="text-[15px]">🎴</span>
            </div>
          </div>

          {/* Balance bar */}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-white">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">{L.balance}</p>
              <p className="text-[13px] font-extrabold tabular-nums">{creditsLeft.toLocaleString()} cr</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">{L.spinSize}</p>
              <p className="text-[13px] font-extrabold tabular-nums">{costPerSpin} cr</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">{L.winLabel}</p>
              <p className="text-[13px] font-extrabold tabular-nums" style={{ color: "#ffd36b" }}>{won.length}</p>
            </div>
          </div>
        </div>
        </div>

        {revealNode}
        {styleNode}
      </div>
    );
  }

  /* ── Version 1: Classic ── */
  return (
    <div className="absolute inset-0 z-[70] flex flex-col text-[#1d2129]" style={{ animation: "slotIn .25s ease", background: SURFACE, fontFamily: FONT }}>
      {header}
      {toggleNode}
      {/* Game status bar */}
      <div className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold">
            <span style={{ color: "#D10005" }}>{packName}</span>
            <span className="text-[#8a9099]"> · {L.spinsLeft(spinsLeft)}</span>
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-extrabold">{payoutPct}% <span className="text-[10px] font-medium text-[#8a9099]">{L.toPayout}</span></p>
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[#e5e8ec] bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <span style={{ fontSize: 15 }}>🎴</span>
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white" style={{ background: "#D10005" }}>{won.length}</span>
            </div>
          </div>
        </div>
        {/* Payout bar */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full" style={{ width: `${payoutPct}%`, background: "linear-gradient(90deg,#ff7a00,#D10005)", transition: "width .4s ease" }} />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[#8a9099]">{L.stacked(won.length)}</p>
      </div>

      {/* Reels */}
      <div className="flex flex-1 flex-col justify-center px-4">
        <div className="relative rounded-2xl border border-[#e5e8ec] bg-white p-3" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}>
          <div className="flex gap-2.5">
            <Reel spinKey={spinKey} target={targets[0]} durationMs={quick ? 500 : 1000} />
            <Reel spinKey={spinKey} target={targets[1]} durationMs={quick ? 620 : 1450} />
            <Reel spinKey={spinKey} target={targets[2]} durationMs={quick ? 740 : 1900} />
          </div>
          {/* Win line */}
          <div className="pointer-events-none absolute inset-x-3 top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ background: "linear-gradient(90deg,transparent,rgba(209,0,5,0.5),transparent)" }} />
        </div>
        <p className="mt-3 text-center text-[10px] font-medium text-[#8a9099]">{L.winsDrop}</p>
      </div>

      {/* Spin + controls */}
      <div className="shrink-0 px-4 pb-4">
        <button
          onClick={doSpin}
          disabled={spinning || spinsLeft <= 0}
          className="relative flex w-full items-center justify-center rounded-xl py-3.5 text-[16px] font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
          style={{ background: "#D10005" }}
        >
          {spinning ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            L.spin(costPerSpin)
          )}
        </button>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#6b7280]">
          <button onClick={onClose} className="flex items-center gap-1 active:text-[#1d2129]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            {L.exit}
          </button>
          <button onClick={() => setQuick((q) => !q)} className="flex items-center gap-1" style={{ color: quick ? "#D10005" : undefined }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
            {L.quickSpin}{quick ? " ✓" : ""}
          </button>
          <button onClick={fastForward} className="flex items-center gap-1 active:text-[#1d2129]">
            {L.fastForward}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l7 7-7 7zM13 5l7 7-7 7z" /></svg>
          </button>
        </div>
      </div>

      {revealNode}
      {styleNode}
    </div>
  );
}
