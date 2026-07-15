"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import type { Lang, Rarity } from "../lib/types";
import { RARITY_META } from "../data/prizes";

/* ─────────────────────────────────────────────────────────────────────────
   Slot game (pack opening) — a 5×4 grid cabinet ported from the PackSpin V2
   reference (packspin-demo.vercel.app/v2.html) using its art assets, kept in
   /public/slot. Opened from the Store "Buy a pack" CTA.

   Mechanics: every WIN drops cards into the stack until credits hit 0. Most
   wins drop a single card; rare BIG WINS flood the grid and drop 5–20 at once.
   The payline is the 2nd row; three CARD symbols there = a win. When the spins
   run out we show the oripa "your stack" summary where cards can be exchanged
   for coins or shipped.
   ───────────────────────────────────────────────────────────────────────── */

const FONT = "var(--font-noto-sans-jp), system-ui, sans-serif";
const SHIP_MIN_COINS = 1500;

type DemoRarity = "COMMON" | "RARE" | "CHASE";
const DEMO_TO_ORIPA: Record<DemoRarity, Rarity> = { COMMON: "N", RARE: "SR", CHASE: "UR" };

type WonCard = { id: number; name: string; nameJa: string; rarity: Rarity; demoRarity: DemoRarity; img: string };

type Props = {
  packId: string;
  packName: string;
  credits: number;
  spins: number;
  lang: Lang;
  // Legacy skin flag (kept so the outside-frame toggle keeps working); the
  // 5×4 machine is now the only game, so it is ignored.
  version?: 1 | 2;
  header?: ReactNode;
  onExchange?: (coins: number) => void;
  onClose: () => void;
};

/* ── Catalog & card pools (from the reference, matched to oripa pack ids) ── */
type PackCat = {
  id: string;
  packImg: string;
  hue: string;
  pool: { name: string; img: string }[];
  chase: { name: string; img: string };
};
const CATALOG: PackCat[] = [
  { id: "cp1", packImg: "/slot/pack-pocket.png", hue: "linear-gradient(160deg,#2f6fed,#7C5CFF)",
    pool: [
      { name: "Sparkmouse", img: "/slot/card-pocket-c1.png" },
      { name: "Leafling", img: "/slot/card-pocket-c2.png" },
      { name: "Flamepup", img: "/slot/card-pocket-c3.png" },
    ],
    chase: { name: "Prism Dragon", img: "/slot/chase-pocket.png" } },
  { id: "cp2", packImg: "/slot/pack-bonanza.png", hue: "linear-gradient(160deg,#FFB300,#FF6B4A)",
    pool: [
      { name: "Lucky Clover", img: "/slot/card-bonanza-c1.png" },
      { name: "Gold Bar", img: "/slot/card-bonanza-c2.png" },
      { name: "Coin Fountain", img: "/slot/card-bonanza-c3.png" },
      { name: "Jackpot Bell", img: "/slot/card-bonanza-c4.png" },
    ],
    chase: { name: "Midas Crown", img: "/slot/chase-bonanza.png" } },
  { id: "cp3", packImg: "/slot/pack-vault.png", hue: "linear-gradient(160deg,#38D9A9,#2f6fed)",
    pool: [
      { name: "Ancient Coin", img: "/slot/card-vault-c1.png" },
      { name: "Sealed Scroll", img: "/slot/card-vault-c2.png" },
      { name: "Jade Idol", img: "/slot/card-vault-c3.png" },
      { name: "Silver Sigil", img: "/slot/card-vault-c4.png" },
      { name: "Amber Relic", img: "/slot/card-vault-c5.png" },
    ],
    chase: { name: "The First Edition", img: "/slot/chase-vault.png" } },
  { id: "cp4", packImg: "/slot/pack-grand.png", hue: "linear-gradient(160deg,#B16CEA,#FF6B4A)",
    pool: [
      { name: "Storm Wyrm", img: "/slot/card-grand-c1.png" },
      { name: "Ember Fox", img: "/slot/card-grand-c2.png" },
      { name: "Moon Oracle", img: "/slot/card-grand-c3.png" },
      { name: "Celestial Wing", img: "/slot/card-grand-c4.png" },
      { name: "Iron Golem", img: "/slot/card-grand-c5.png" },
      { name: "Frost Naga", img: "/slot/card-grand-c6.png" },
      { name: "Sun Phoenix", img: "/slot/card-grand-c7.png" },
    ],
    chase: { name: "Eternal Dragon", img: "/slot/chase-grand.png" } },
];

/* Slot symbols — 8 ambient + the CARD hit symbol (index 8). */
const SYMS = [
  "/slot/sym-bell.png", "/slot/sym-ruby.png", "/slot/sym-seven.png", "/slot/sym-clover.png",
  "/slot/sym-coins.png", "/slot/sym-diamond.png", "/slot/sym-star.png", "/slot/sym-horseshoe.png",
  "/slot/sym-card.png",
];
const CARD_SYM = 8;
const COLS = 5, ROWS = 4, PAYROW = 1;

/* ── Slot engine ──────────────────────────────────────────────────────── */
const V2 = {
  baseHit: 0.30,
  pityCap: 4,
  rarityWeights: [["CHASE", 0.06], ["RARE", 0.30], ["COMMON", 0.64]] as [DemoRarity, number][],
  bigWinChance: 0.025,
  bigWinMin: 5,
  bigWinMax: 20,
};
function bigWinSize() {
  const r = Math.random();
  return V2.bigWinMin + Math.floor(r * r * (V2.bigWinMax - V2.bigWinMin + 1));
}
function decideSpin(creditsLeft: number, spinCost: number, wonLen: number, dryStreak: number) {
  const spinsLeft = Math.ceil(creditsLeft / spinCost);
  if (Math.random() < V2.bigWinChance) return bigWinSize();
  if (wonLen === 0 && spinsLeft <= 1) return 1;
  if (dryStreak >= V2.pityCap) return 1;
  return Math.random() < V2.baseHit ? 1 : 0;
}
function drawDemoCard(cat: PackCat): { name: string; img: string; demoRarity: DemoRarity } {
  const r = Math.random();
  let acc = 0, rarity: DemoRarity = "COMMON";
  for (const [rar, w] of V2.rarityWeights) { acc += w; if (r < acc) { rarity = rar; break; } }
  if (rarity === "CHASE") return { name: cat.chase.name, img: cat.chase.img, demoRarity: "CHASE" };
  const half = Math.ceil(cat.pool.length / 2);
  const pool = rarity === "RARE" ? cat.pool.slice(0, half) : cat.pool.slice(half);
  const src = pool.length ? pool : cat.pool;
  const pick = src[Math.floor(Math.random() * src.length)];
  return { name: pick.name, img: pick.img, demoRarity: rarity };
}

const randAmb = () => Math.floor(Math.random() * 8);
function newRestGrid(): number[][] {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS }, randAmb));
}
function buildGrid(winN: number, nearMiss: boolean) {
  const g = newRestGrid();
  for (let c = 2; c < COLS; c++) {
    while (g[c][PAYROW] === g[c - 1][PAYROW] && g[c][PAYROW] === g[c - 2][PAYROW]) g[c][PAYROW] = randAmb();
  }
  const winCells: [number, number][] = [];
  if (winN === 0 && nearMiss) {
    g[0][PAYROW] = CARD_SYM; g[1][PAYROW] = CARD_SYM;
  } else if (winN === 1) {
    for (let c = 0; c < 3; c++) { g[c][PAYROW] = CARD_SYM; winCells.push([c, PAYROW]); }
  } else if (winN > 1) {
    for (let c = 0; c < COLS; c++) { g[c][PAYROW] = CARD_SYM; winCells.push([c, PAYROW]); }
    let extra = Math.min(3 + Math.ceil(winN / 2), 11), guard = 0;
    while (extra > 0 && guard++ < 300) {
      const c = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
      if (r === PAYROW || g[c][r] === CARD_SYM) continue;
      g[c][r] = CARD_SYM; winCells.push([c, r]); extra--;
    }
  }
  return { g, winCells };
}

const reduceMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── i18n ─────────────────────────────────────────────────────────────── */
const STR = {
  en: {
    spinsLeft: (n: number) => `${n} spins left`,
    toPayout: "% to payout",
    stacked: "cards stacked — the bar tracks credits spent, at 100% the stack is yours",
    winsDrop: "Wins drop a card into your stack — BIG WINS drop a pile",
    spin: (cost: number) => `SPIN · ${cost} cr`,
    exit: "← Exit",
    quickSpin: (on: boolean) => `⚡ Quick spin ${on ? "on" : "off"}`,
    fastForward: "Fast-forward ⏩",
    banked: "Banked — keep spinning",
    bankedBig: (n: number) => `💥 ${n} cards banked!`,
    stackComplete: "Stack complete — collecting…",
    soClose: "So close…",
    cardWin: "CARD WIN!",
    bigWinLine: (n: number) => `💥 BIG WIN — ${n} cards!`,
    theChase: "★ THE CHASE ★",
    bankIt: "Bank it →",
    bankThem: "Bank them →",
    takeStack: "Take your stack ✓",
    bigWin: "💥 BIG WIN 💥",
    cardsInSpin: (n: number) => `${n} cards in one spin`,
    chaseIncluded: "★ chase included ★",
    tapOpen: "Tap to rip it open",
    yourStack: "your stack",
    summary: (credits: number, spins: number, cards: number) => `${credits} credits · ${spins} spins · ${cards} cards won`,
    backToShop: "Back to shop",
    openAnother: "Open another",
    noCards: "No cards won this time.",
    exchange: "Exchange to coins",
    requestShip: "Request shipping",
    reset: "Reset",
    coinsUnit: "coins",
    selectHint: "Select cards to exchange for coins, or request shipping (min 1,500 coins).",
    tapToSelect: "Tap cards to select",
    exchanged: (n: number, c: number) => `Exchanged ${n} card${n > 1 ? "s" : ""} for ${c.toLocaleString()} coins`,
    shipRequested: "Shipping requested",
    shortfall: (n: number) => `Select ${n.toLocaleString()} more coins to request shipping`,
    rarity: { N: "COMMON", SR: "RARE", UR: "CHASE" } as Record<Rarity, string>,
  },
  ja: {
    spinsLeft: (n: number) => `残り${n}回`,
    toPayout: "% 達成まで",
    stacked: "枚ストック — バーは消費クレジット、100%でストックがあなたのものに",
    winsDrop: "当たりでカードがストックに、大当たりでまとめてゲット",
    spin: (cost: number) => `スピン · ${cost}cr`,
    exit: "← 退出",
    quickSpin: (on: boolean) => `⚡ クイックスピン ${on ? "オン" : "オフ"}`,
    fastForward: "早送り ⏩",
    banked: "獲得 — 続けてスピン",
    bankedBig: (n: number) => `💥 ${n}枚獲得！`,
    stackComplete: "ストック完成 — 回収中…",
    soClose: "惜しい…",
    cardWin: "カード当たり！",
    bigWinLine: (n: number) => `💥 大当たり — ${n}枚！`,
    theChase: "★ ザ・チェイス ★",
    bankIt: "獲得する →",
    bankThem: "まとめて獲得 →",
    takeStack: "ストックを受け取る ✓",
    bigWin: "💥 大当たり 💥",
    cardsInSpin: (n: number) => `1スピンで${n}枚`,
    chaseIncluded: "★ チェイス含む ★",
    tapOpen: "タップして開封",
    yourStack: "あなたのストック",
    summary: (credits: number, spins: number, cards: number) => `${credits}クレジット · ${spins}スピン · ${cards}枚獲得`,
    backToShop: "ショップに戻る",
    openAnother: "もう一つ開ける",
    noCards: "今回はカードを獲得できませんでした。",
    exchange: "コインに交換",
    requestShip: "発送を申請",
    reset: "リセット",
    coinsUnit: "コイン",
    selectHint: "カードを選んでコインに交換、または発送を申請（最低1,500コイン）。",
    tapToSelect: "カードをタップして選択",
    exchanged: (n: number, c: number) => `${n}枚を${c.toLocaleString()}コインに交換しました`,
    shipRequested: "発送を申請しました",
    shortfall: (n: number) => `発送申請にはあと${n.toLocaleString()}コイン必要です`,
    rarity: { N: "COMMON", SR: "RARE", UR: "CHASE" } as Record<Rarity, string>,
  },
};

export function SlotGame({ packId, packName, credits, spins, lang, header, onExchange, onClose }: Props) {
  const L = STR[lang];
  const cat = CATALOG.find((c) => c.id === packId) ?? CATALOG[0];
  const spinCost = Math.max(1, Math.round(credits / Math.max(1, spins)));

  // Live game values kept in refs so the imperative reel animation never fights
  // React re-renders; a forced tick reconciles the DOM at rest points.
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const wonRef = useRef<WonCard[]>([]);
  const creditsLeftRef = useRef(credits);
  const spinIndexRef = useRef(0);
  const dryStreakRef = useRef(0);
  const idRef = useRef(0);
  const restGridRef = useRef<number[][] | null>(null);
  const spinningRef = useRef(false);
  const tokenRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const afterRevealRef = useRef<() => void>(() => {});
  if (!restGridRef.current) restGridRef.current = newRestGrid();

  const [phase, setPhase] = useState<"intro" | "play" | "summary">(reduceMotion() ? "play" : "intro");
  const [introGo, setIntroGo] = useState(false);
  const [quick, setQuick] = useState(false);
  const [reveal, setReveal] = useState<{ cards: WonCard[]; big: boolean; done: boolean } | null>(null);
  const [stackOpen, setStackOpen] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const at = (ms: number, fn: () => void) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  useEffect(() => {
    // Preload art so reels/reveals never pop in blank.
    [...cat.pool.map((c) => c.img), cat.chase.img, cat.packImg, ...SYMS].forEach((s) => { const im = new Image(); im.src = s; });
    return () => { timersRef.current.forEach(clearTimeout); tokenRef.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intro auto-advance.
  useEffect(() => {
    if (phase !== "intro") return;
    const t = at(1600, endIntro);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function endIntro() {
    if (introGo) return;
    setIntroGo(true);
    at(560, () => setPhase("play"));
  }

  const rootQ = (sel: string) => rootRef.current?.querySelector(sel) as HTMLElement | null;
  const setStatusDom = (msg: string, cls = "") => {
    const el = rootQ(".status");
    if (el) { el.className = "status " + cls; el.textContent = msg; }
  };
  const updateBarDom = (shownWon: number) => {
    const pct = Math.round(((credits - creditsLeftRef.current) / credits) * 100);
    const set = (sel: string, v: string) => { const e = rootQ(sel); if (e) e.textContent = v; };
    const fill = rootQ(".fill"); if (fill) fill.style.width = pct + "%";
    set(".pct-n", String(pct));
    set(".spins-n", String(Math.ceil(creditsLeftRef.current / spinCost)));
    set(".stack b", String(shownWon));
    set(".cnt-n", String(shownWon));
  };

  function makeCard(): WonCard {
    const d = drawDemoCard(cat);
    return { id: idRef.current++, name: d.name, nameJa: d.name, rarity: DEMO_TO_ORIPA[d.demoRarity], demoRarity: d.demoRarity, img: d.img };
  }

  /* Won cards fly from the cabinet into the stack; the badge counts up. */
  function flyCards(cards: WonCard[], preWon: number, done: () => void) {
    const root = rootRef.current;
    const cab = root?.querySelector(".cab") as HTMLElement | null;
    const st = root?.querySelector(".stack") as HTMLElement | null;
    if (!root || !cab || !st || reduceMotion()) { done(); return; }
    const R = root.getBoundingClientRect();
    const a = cab.getBoundingClientRect(), b = st.getBoundingClientRect();
    const n = cards.length, show = Math.min(n, 8);
    const per = quick ? 65 : 95, flight = quick ? 330 : 540;
    const badge = st.querySelector("b");
    let landed = 0;
    for (let i = 0; i < show; i++) {
      at(i * per, () => {
        const el = document.createElement("div");
        el.className = "flycard";
        el.style.transitionDuration = (flight / 1000) + "s," + (flight / 1000) + "s";
        if (cards[i].img) el.innerHTML = `<img src="${cards[i].img}" alt="">`;
        const jx = Math.random() * 90 - 45, jy = Math.random() * 46 - 23;
        const sx = (a.left - R.left) + a.width / 2 - 22 + jx, sy = (a.top - R.top) + a.height / 2 - 29 + jy;
        el.style.left = sx + "px"; el.style.top = sy + "px";
        root.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const dx = ((b.left - R.left) + b.width / 2 - 22) - sx, dy = ((b.top - R.top) + b.height / 2 - 29) - sy;
          el.style.transform = `translate(${dx}px,${dy}px) rotate(${160 + Math.random() * 140}deg) scale(.3)`;
          el.style.opacity = ".35";
        }));
        at(flight, () => {
          el.remove(); landed++;
          if (badge) badge.textContent = String(Math.round(preWon + (landed / show) * n));
          st.classList.remove("bump"); void st.offsetWidth; st.classList.add("bump");
          if (landed === show) { if (badge) badge.textContent = String(preWon + n); done(); }
        });
      });
    }
  }

  function confetti(el: Element | null, chase: boolean) {
    if (!el) return;
    const colors = chase ? ["#B16CEA", "#FFB300", "#fff"] : ["#FFB300", "#FF6B4A", "#38D9A9", "#fff"];
    for (let i = 0; i < (chase ? 26 : 16); i++) {
      const d = document.createElement("div");
      d.className = "confetti";
      d.style.left = "50%"; d.style.top = "50%";
      d.style.background = colors[i % colors.length];
      d.style.setProperty("--dx", (Math.random() * 280 - 140) + "px");
      d.style.setProperty("--dy", (Math.random() * -200 - 30) + "px");
      el.appendChild(d);
      setTimeout(() => d.remove(), 1050);
    }
  }

  function doSpin() {
    if (spinningRef.current || creditsLeftRef.current <= 0) return;
    const winN = decideSpin(creditsLeftRef.current, spinCost, wonRef.current.length, dryStreakRef.current);
    const hit = winN > 0, isBig = winN > 1;
    const cards = Array.from({ length: winN }, () => makeCard());

    spinIndexRef.current += 1;
    creditsLeftRef.current -= spinCost;
    if (hit) { wonRef.current = [...wonRef.current, ...cards]; dryStreakRef.current = 0; }
    else dryStreakRef.current += 1;
    const sessionOver = creditsLeftRef.current <= 0;
    const preWon = wonRef.current.length - winN;
    const isChase = cards.some((c) => c.demoRarity === "CHASE");
    const nearMiss = !hit && Math.random() < 0.35;
    const { g: finalG, winCells } = buildGrid(winN, nearMiss);
    const Q = quick;

    const afterWin = () => {
      flyCards(cards, preWon, () => {
        spinningRef.current = false;
        if (sessionOver) { setStatusDom(L.stackComplete, "hint-win"); at(Q ? 450 : 800, () => setPhase("summary")); }
        else { setStatusDom(isBig ? L.bankedBig(winN) : L.banked, "hint-win"); tick(); }
      });
    };
    const finishDry = () => {
      spinningRef.current = false;
      setStatusDom(nearMiss ? L.soClose : "", nearMiss ? "hint-near" : "");
      if (sessionOver) at(Q ? 400 : 800, () => setPhase("summary"));
      else tick();
    };

    if (reduceMotion()) {
      restGridRef.current = finalG;
      tick();
      if (!hit) { finishDry(); return; }
      spinningRef.current = true;
      afterRevealRef.current = afterWin;
      setReveal({ cards, big: isBig, done: sessionOver });
      return;
    }

    spinningRef.current = true;
    const token = ++tokenRef.current;
    const live = () => tokenRef.current === token && rootRef.current;
    const btn = rootQ(".spin-btn") as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    setStatusDom("", "");
    updateBarDom(preWon);

    const ivs: (ReturnType<typeof setInterval> | null)[] = [];
    for (let ci = 0; ci < COLS; ci++) {
      const col = rootQ(`[data-col="${ci}"]`);
      if (!col) continue;
      col.classList.remove("land"); col.classList.add("spin");
      ivs[ci] = setInterval(() => {
        col.querySelectorAll<HTMLImageElement>(".cell img").forEach((img) => { img.src = SYMS[randAmb()]; });
      }, 85);
    }
    const clearAll = () => ivs.forEach((iv) => iv && clearInterval(iv));

    const needHold = hit || (nearMiss && Math.random() < 0.6);
    const holdMs = needHold ? (Q ? 450 : 1400) : 0;
    const base = Q ? [260, 380, 500, 620, 740] : [650, 900, 1150, 1400, 1650];
    const stops = base.map((t, i) => (i >= 2 ? t + holdMs : t));

    const stopCol = (ci: number) => {
      if (!live()) { ivs[ci] && clearInterval(ivs[ci]!); return; }
      ivs[ci] && clearInterval(ivs[ci]!);
      const col = rootQ(`[data-col="${ci}"]`);
      if (!col) return;
      col.classList.remove("spin", "hold"); col.classList.add("land");
      col.querySelectorAll<HTMLImageElement>(".cell img").forEach((img, ri) => { img.src = SYMS[finalG[ci][ri]]; });
    };

    if (holdMs) at(base[2], () => { if (live()) rootQ(`[data-col="2"]`)?.classList.add("hold"); });
    for (let ci = 0; ci < COLS; ci++) at(stops[ci], () => stopCol(ci));

    at(stops[COLS - 1] + (Q ? 180 : 320), () => {
      if (!live()) { clearAll(); return; }
      clearAll();
      restGridRef.current = finalG;
      if (!hit) { finishDry(); return; }

      const cab = rootQ(".cab");
      winCells.forEach(([ci, ri]) => rootQ(`[data-cell="${ci}-${ri}"]`)?.classList.add("win-cell"));
      const first = rootQ(`[data-cell="0-${PAYROW}"]`), cabR = cab?.getBoundingClientRect();
      if (cab && first && cabR && winN >= 1) {
        const fr = first.getBoundingClientRect();
        const sw = document.createElement("div");
        sw.className = "sweep";
        sw.style.left = (fr.left - cabR.left) + "px";
        sw.style.top = (fr.top - cabR.top + fr.height / 2 - 2) + "px";
        sw.style.width = (cabR.width - (fr.left - cabR.left) * 2) + "px";
        cab.appendChild(sw);
        setTimeout(() => sw.remove(), 800);
      }
      cab?.classList.add(isBig ? "goldflash" : "winflash");
      if (isBig && cab) {
        const sp = document.createElement("div");
        sp.className = "bigsplash"; sp.textContent = "BIG WIN";
        cab.appendChild(sp);
        setTimeout(() => sp.remove(), 1600);
      }
      confetti(cab, isChase || isBig);
      if (isChase || isBig) rootQ(".room")?.classList.add("shake");
      setStatusDom(isBig ? L.bigWinLine(winN) : L.cardWin, "hint-win");
      afterRevealRef.current = afterWin;
      at(isBig ? (Q ? 550 : 950) : (Q ? 300 : 620), () => { if (live()) setReveal({ cards, big: isBig, done: sessionOver }); });
    });
  }

  function fastForward() {
    if (spinningRef.current) return;
    while (creditsLeftRef.current > 0) {
      const winN = decideSpin(creditsLeftRef.current, spinCost, wonRef.current.length, dryStreakRef.current);
      spinIndexRef.current += 1;
      creditsLeftRef.current -= spinCost;
      if (winN > 0) { wonRef.current = [...wonRef.current, ...Array.from({ length: winN }, () => makeCard())]; dryStreakRef.current = 0; }
      else dryStreakRef.current += 1;
    }
    setPhase("summary");
  }

  function dismissReveal() {
    setReveal(null);
    const fn = afterRevealRef.current;
    afterRevealRef.current = () => {};
    fn();
  }

  /* ── Summary helpers (exchange / ship) ── */
  const coinOf = (r: Rarity) => RARITY_META[r].coin;
  const won = wonRef.current;
  const pickedCards = won.filter((c) => picked.has(c.id));
  const pickedTotal = pickedCards.reduce((s, c) => s + coinOf(c.rarity), 0);
  const canShip = pickedTotal >= SHIP_MIN_COINS;
  const togglePick = (id: number) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const showToast = (msg: string) => { setToast(msg); at(2200, () => setToast(null)); };
  const doExchange = () => {
    if (picked.size === 0) return;
    const ids = new Set(picked);
    const n = ids.size, total = pickedTotal;
    onExchange?.(total);
    wonRef.current = won.filter((c) => !ids.has(c.id));
    setPicked(new Set());
    showToast(L.exchanged(n, total));
    tick();
  };
  const doShip = () => {
    if (picked.size === 0 || !canShip) return;
    const ids = new Set(picked);
    wonRef.current = won.filter((c) => !ids.has(c.id));
    setPicked(new Set());
    showToast(L.shipRequested);
    tick();
  };

  const rarityCls = (d: DemoRarity) => (d === "CHASE" ? "CHASE" : d === "RARE" ? "RARE" : "COMMON");

  /* ── Summary screen ── */
  if (phase === "summary") {
    return (
      <div ref={rootRef} className="sg-root absolute inset-0 z-[70] flex flex-col" style={{ fontFamily: FONT, background: "radial-gradient(900px 500px at 50% -10%,rgba(255,179,0,.07),transparent 60%),#0A0A12", color: "#F2F2F7" }}>
        {header}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
          <div className="min-w-0">
            <p className="sg-grad truncate text-[14px] font-extrabold leading-tight">{packName}</p>
            <p className="text-[10px] font-medium" style={{ color: "#9A9AAE" }}>{L.summary(credits, spins, won.length)}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={onClose} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95">{L.backToShop}</button>
            <button onClick={onClose} className="sg-gold rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold active:scale-95" style={{ color: "#241000" }}>{L.openAnother}</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {won.length === 0 ? (
            <p className="mt-10 text-center text-[13px]" style={{ color: "#9A9AAE" }}>{L.noCards}</p>
          ) : (
            <>
              {picked.size === 0 && <p className="mb-2 text-[11px] font-semibold" style={{ color: "#9A9AAE" }}>{L.tapToSelect}</p>}
              <div className="grid grid-cols-3 gap-3">
                {won.map((c) => {
                  const sel = picked.has(c.id);
                  return (
                    <button key={c.id} onClick={() => togglePick(c.id)} className="flex flex-col items-center text-center active:scale-[0.98]">
                      <div className="relative w-full">
                        <img src={c.img} alt="" className="w-full rounded-lg object-cover transition" style={{ aspectRatio: "5/7", boxShadow: sel ? "0 0 0 3px #FFB300, 0 2px 10px rgba(255,179,0,0.4)" : "0 2px 8px rgba(0,0,0,0.5)", opacity: sel ? 1 : 0.9 }} />
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 transition" style={{ background: sel ? "#FFB300" : "rgba(0,0,0,0.4)", borderColor: sel ? "#fff" : "rgba(255,255,255,0.7)", color: "#241000" }}>
                          {sel && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-1 w-full text-[10px] font-bold leading-tight text-white">{lang === "ja" ? c.nameJa : c.name}</p>
                      <p className="text-[8.5px] font-extrabold uppercase tracking-wider" style={{ color: c.demoRarity === "CHASE" ? "#B16CEA" : c.demoRarity === "RARE" ? "#FFB300" : "#9A9AAE" }}>{L.rarity[c.rarity]} · {coinOf(c.rarity).toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {won.length > 0 && picked.size > 0 && (
          <div className="shrink-0 border-t border-white/10 px-3 pb-3 pt-2" style={{ background: "rgba(10,8,22,.6)", boxShadow: "0 -8px 24px rgba(0,0,0,0.35)" }}>
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
              <span style={{ color: "#9A9AAE" }}>{picked.size} · {pickedTotal.toLocaleString()} {L.coinsUnit}</span>
              <button onClick={() => setPicked(new Set())} className="underline" style={{ color: "#9A9AAE" }}>{L.reset}</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { if (!canShip) { showToast(L.shortfall(SHIP_MIN_COINS - pickedTotal)); return; } doShip(); }} className="rounded-xl border-2 py-2 text-[12.5px] font-bold leading-tight transition" style={{ borderColor: "#FFB300", color: "#FFB300", background: "transparent", opacity: canShip ? 1 : 0.6 }}>
                {L.requestShip} · {picked.size}
                <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{pickedTotal.toLocaleString()} {L.coinsUnit}</span>
              </button>
              <button onClick={doExchange} className="sg-gold rounded-xl py-2 text-[12.5px] font-bold leading-tight transition" style={{ color: "#241000" }}>
                {L.exchange} · {picked.size}
                <span className="mt-0.5 block text-[10px] font-semibold opacity-90">{pickedTotal.toLocaleString()} {L.coinsUnit}</span>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10.5px] leading-tight" style={{ color: "#9A9AAE" }}>{L.selectHint}</p>
          </div>
        )}
        {toast && <div className="pointer-events-none absolute bottom-24 left-1/2 z-[85] -translate-x-1/2 rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.5)]" style={{ background: "#191226" }}>{toast}</div>}
        <SlotStyle />
      </div>
    );
  }

  /* ── Play screen (5×4 grid cabinet) ── */
  const spent = credits - creditsLeftRef.current;
  const pct = Math.round((spent / credits) * 100);
  const spinsLeft = Math.ceil(creditsLeftRef.current / spinCost);
  const shownWon = wonRef.current.length;
  const grid = restGridRef.current!;
  const revCard = reveal?.cards[0];

  return (
    <div ref={rootRef} className="sg-root absolute inset-0 z-[70] flex flex-col" style={{ fontFamily: FONT, background: "radial-gradient(900px 500px at 50% -10%,rgba(255,179,0,.07),transparent 60%),#0A0A12", color: "#F2F2F7" }}>
      {header}
      <div className="flex-1 overflow-y-auto px-3.5 pb-6 pt-3">
        <div className="room">
          <div className="bar-wrap">
            <div className="bar-label">
              <span>{packName} · {lang === "ja" ? "残り" : ""}<b style={{ color: "#F2F2F7" }} className="spins-n">{spinsLeft}</b>{lang === "ja" ? "回" : " spins left"}</span>
              <span className="crnum"><span className="pct-n">{pct}</span><span style={{ fontSize: 11, color: "#9A9AAE" }}>{L.toPayout}</span></span>
            </div>
            <div className="stackbar">
              <div className="bar" style={{ flex: 1 }}><div className="fill" style={{ width: pct + "%" }} /></div>
              <button className="stack" onClick={() => { if (!spinningRef.current) setStackOpen(true); }} aria-label="Your card stack">
                <img className="pileimg p3" src="/slot/sym-card.png" alt="" />
                <img className="pileimg p2" src="/slot/sym-card.png" alt="" />
                <img className="pileimg p1" src="/slot/sym-card.png" alt="" />
                <b>{shownWon}</b>
              </button>
            </div>
            <div className="bar-sub">
              {lang === "ja" ? (
                <><span className="cnt-n">{shownWon}</span>枚ストック — バーは消費クレジットを表示、<b>100%</b>でストックがあなたのものに</>
              ) : (
                <><span className="cnt-n">{shownWon}</span> card{shownWon === 1 ? "" : "s"} stacked — the bar tracks credits spent, at <b>100%</b> the stack is yours</>
              )}
            </div>
          </div>

          <div className="cab">
            <div className="grid">
              {grid.map((col, ci) => (
                <div className="col" data-col={ci} key={ci}>
                  {col.map((s, ri) => (
                    <div className="cell" data-cell={`${ci}-${ri}`} key={ri}><img src={SYMS[s]} alt="" /></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="status">{spinIndexRef.current === 0 ? L.winsDrop : ""}</div>
          <button className="spin-btn" onClick={doSpin} disabled={creditsLeftRef.current <= 0}>{L.spin(spinCost)}</button>
          <div className="aux">
            <button onClick={() => { if (!spinningRef.current) onClose(); }}>{L.exit}</button>
            <button onClick={() => { if (!spinningRef.current) setQuick((q) => !q); }} style={{ color: quick ? "#FFB300" : undefined }}>{L.quickSpin(quick)}</button>
            <button onClick={fastForward}>{L.fastForward}</button>
          </div>
        </div>
      </div>

      {/* Pack-open intro */}
      {phase === "intro" && (
        <div className={`intro ${introGo ? "go" : ""}`} onClick={endIntro}>
          <div className="i-rays" />
          <div className="i-pack" style={{ background: cat.hue }}><img src={cat.packImg} alt="" /></div>
          <div className="i-burst" />
          <div className="i-tip">{L.tapOpen}</div>
        </div>
      )}

      {/* Reveal overlay */}
      {reveal && !reveal.big && revCard && (
        <div className="ovl" onClick={dismissReveal}>
          <div className={`rev r-${revCard.demoRarity}`} onClick={(e) => e.stopPropagation()}>
            {revCard.demoRarity === "CHASE" && <div className="chasebanner">{L.theChase}</div>}
            <div className="big-card"><img src={revCard.img} alt="" /></div>
            <div className="r-name">{revCard.name}</div>
            <div className="r-rar">{revCard.demoRarity}</div>
            <button onClick={dismissReveal}>{reveal.done ? L.takeStack : L.bankIt}</button>
          </div>
        </div>
      )}
      {reveal && reveal.big && (
        <div className="ovl" onClick={dismissReveal}>
          <div className="rev" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="chasebanner" style={{ color: "#FFB300" }}>{L.bigWin}</div>
            <div className="r-name">{L.cardsInSpin(reveal.cards.length)}</div>
            {reveal.cards.some((c) => c.demoRarity === "CHASE") && <div className="r-rar" style={{ color: "#B16CEA" }}>{L.chaseIncluded}</div>}
            <div className="sum-cards stagger" style={{ margin: "12px 0 4px", maxHeight: "46vh", overflowY: "auto" }}>
              {[...reveal.cards].sort((a, b) => ({ CHASE: 0, RARE: 1, COMMON: 2 }[a.demoRarity] - { CHASE: 0, RARE: 1, COMMON: 2 }[b.demoRarity])).map((cd, i) => (
                <div className={`sc ${rarityCls(cd.demoRarity)}`} style={{ animationDelay: Math.min(i * 60, 700) + "ms" }} key={cd.id}>
                  <img className="aimg" src={cd.img} alt="" />
                  <div className="n">{cd.name}</div>
                  <div className="r">{cd.demoRarity}</div>
                </div>
              ))}
            </div>
            <button onClick={dismissReveal}>{reveal.done ? L.takeStack : L.bankThem}</button>
          </div>
        </div>
      )}

      {/* Mid-session stack peek */}
      {stackOpen && (
        <div className="ovl" onClick={() => setStackOpen(false)}>
          <div className="rev" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="r-name" style={{ marginBottom: 4 }}>{lang === "ja" ? `ストック — ${wonRef.current.length}枚` : `Your stack — ${wonRef.current.length} card${wonRef.current.length === 1 ? "" : "s"}`}</div>
            {wonRef.current.length ? (
              <div className="sum-cards" style={{ margin: "8px 0 4px", maxHeight: "46vh", overflowY: "auto" }}>
                {wonRef.current.map((g) => (
                  <div className={`sc ${rarityCls(g.demoRarity)}`} key={g.id}>
                    <img className="aimg" src={g.img} alt="" />
                    <div className="n">{g.name}</div>
                    <div className="r">{g.demoRarity}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#63637A", padding: "16px 0" }}>{lang === "ja" ? "まだありません" : "Nothing yet — keep spinning."}</p>
            )}
            <button onClick={() => setStackOpen(false)}>{lang === "ja" ? "閉じる" : "Close"}</button>
          </div>
        </div>
      )}

      <SlotStyle />
    </div>
  );
}

/* Scoped styles ported from the reference (keyframes prefixed sg- to avoid
   clashes with the app's own animations). */
function SlotStyle() {
  return (
    <style>{`
.sg-root{--acc:#FFB300;--acc2:#FF6B4A;--good:#38D9A9;--chase:#B16CEA;--muted:#9A9AAE;--dim:#63637A;--text:#F2F2F7;--gold:linear-gradient(180deg,#ffd76a,#ffb300 45%,#ff8a3d);--grad:linear-gradient(92deg,#FFB300,#FF6B4A)}
.sg-root *{box-sizing:border-box}
.sg-grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.sg-gold{background:var(--gold);box-shadow:0 6px 16px rgba(255,150,40,.4),inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 0 rgba(140,50,0,.3)}
.sg-root .room{position:relative;border:1px solid rgba(255,190,80,.22);border-radius:22px;padding:14px 13px;box-shadow:0 22px 55px rgba(0,0,0,.55);overflow:hidden;isolation:isolate}
.sg-root .room::before{content:"";position:absolute;inset:0;background:url(/slot/room-bg.jpg) center/cover;opacity:.85;z-index:-2}
.sg-root .room::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,6,18,.35),rgba(8,6,18,.68) 55%,rgba(8,6,18,.82));z-index:-1}
.sg-root .bar-wrap{margin-bottom:4px;background:rgba(10,8,22,.55);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:10px 11px;backdrop-filter:blur(6px)}
.sg-root .bar-label{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:7px}
.sg-root .bar-label span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.sg-root .bar-label .crnum{font-size:15px;color:var(--text);white-space:nowrap;flex-shrink:0}
.sg-root .bar{height:18px;border-radius:999px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.13);overflow:hidden;box-shadow:inset 0 2px 5px rgba(0,0,0,.65)}
.sg-root .fill{position:relative;height:100%;border-radius:999px;background:var(--grad);transition:width .5s cubic-bezier(.22,.61,.36,1);box-shadow:0 0 14px rgba(255,150,40,.55);overflow:hidden}
.sg-root .fill::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.4) 50%,transparent 80%);transform:translateX(-100%);animation:sgsheen 2.4s linear infinite}
@keyframes sgsheen{to{transform:translateX(100%)}}
.sg-root .stackbar{display:flex;align-items:center;gap:10px}
.sg-root .stack{position:relative;width:52px;height:48px;border:none;background:none;cursor:pointer;flex-shrink:0}
.sg-root .stack .pileimg{position:absolute;left:50%;top:50%;width:30px;height:40px;border-radius:5px;object-fit:cover;border:1.5px solid rgba(255,215,120,.55);box-shadow:0 3px 7px rgba(0,0,0,.55)}
.sg-root .stack .p1{transform:translate(-50%,-50%)}
.sg-root .stack .p2{transform:translate(-50%,-50%) rotate(-9deg) translateX(-4px)}
.sg-root .stack .p3{transform:translate(-50%,-50%) rotate(10deg) translateX(4px)}
.sg-root .stack b{position:absolute;right:-4px;top:-6px;min-width:20px;height:20px;border-radius:999px;background:var(--gold);color:#1a0e00;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 2px 8px rgba(0,0,0,.5);z-index:2}
.sg-root .stack.bump .pileimg,.sg-root .stack.bump b{animation:sgstackbump .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes sgstackbump{40%{transform:translate(-50%,-50%) scale(1.28)}}
.sg-root .stack.bump b{animation:sgbadgebump .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes sgbadgebump{40%{transform:scale(1.4)}}
.sg-root .bar-sub{font-size:10px;color:var(--dim);margin-top:6px}
.sg-root .bar-sub b{color:var(--acc)}
.sg-root .cab{position:relative;border-radius:20px;padding:11px;margin:12px 0;background:linear-gradient(180deg,rgba(64,38,102,.75),rgba(18,12,34,.9) 60%);border:1px solid rgba(255,195,80,.5);box-shadow:0 0 0 3px rgba(20,12,40,.85),0 0 0 4px rgba(255,190,80,.28),0 16px 42px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 40px rgba(120,60,200,.22)}
.sg-root .cab.winflash{animation:sgcabwin .6s ease-in-out 2}
@keyframes sgcabwin{50%{border-color:rgba(56,217,169,.9);box-shadow:0 0 0 3px rgba(20,12,40,.85),0 0 30px rgba(56,217,169,.55),0 16px 42px rgba(0,0,0,.6)}}
.sg-root .cab.goldflash{animation:sgcabgold .55s ease-in-out 3}
@keyframes sgcabgold{50%{border-color:#ffd76a;box-shadow:0 0 0 3px rgba(20,12,40,.85),0 0 44px rgba(255,200,80,.8),0 16px 42px rgba(0,0,0,.6)}}
.sg-root .grid{display:flex;gap:5px}
.sg-root .col{flex:1;display:flex;flex-direction:column;gap:5px;border-radius:11px}
.sg-root .cell{aspect-ratio:1;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(6,4,16,.88) 62%);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 2px 7px rgba(0,0,0,.6);position:relative}
.sg-root .cell img{width:88%;height:88%;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.55))}
.sg-root .col.spin .cell img{animation:sgreelblur .09s linear infinite}
@keyframes sgreelblur{0%{transform:translateY(-16%);filter:blur(1.6px) brightness(1.1)}100%{transform:translateY(16%);filter:blur(1.6px) brightness(1.1)}}
.sg-root .col.land .cell img{animation:sgreelland .3s cubic-bezier(.2,1.5,.4,1)}
@keyframes sgreelland{from{transform:translateY(-46%) scale(1.14)}}
.sg-root .col.hold .cell{border-color:rgba(255,195,70,.9);animation:sgholdpulse .45s ease-in-out infinite}
@keyframes sgholdpulse{50%{box-shadow:0 0 18px rgba(255,185,55,.75),inset 0 2px 7px rgba(0,0,0,.6)}}
.sg-root .cell.win-cell{border-color:rgba(56,217,169,.95)}
.sg-root .cell.win-cell::after{content:"";position:absolute;inset:0;border-radius:10px;box-shadow:0 0 16px rgba(56,217,169,.7),inset 0 0 12px rgba(56,217,169,.35);animation:sgwinpulse .7s ease-in-out infinite}
@keyframes sgwinpulse{50%{opacity:.35}}
.sg-root .cell.win-cell img{animation:sgwinpop .5s cubic-bezier(.2,1.7,.4,1)}
@keyframes sgwinpop{45%{transform:scale(1.22)}}
.sg-root .sweep{position:absolute;background:linear-gradient(90deg,transparent,rgba(255,225,140,.95),transparent);height:5px;border-radius:4px;z-index:4;pointer-events:none;animation:sgsweepx .75s cubic-bezier(.3,.6,.3,1) both;box-shadow:0 0 14px rgba(255,215,120,.8)}
@keyframes sgsweepx{from{transform:translateX(-30%) scaleX(.15);opacity:0}30%{opacity:1}to{transform:translateX(30%) scaleX(1.05);opacity:0}}
.sg-root .bigsplash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;font-size:46px;font-weight:900;letter-spacing:.04em;background:linear-gradient(180deg,#fff3c4,#ffd76a 38%,#ff9a3d 70%,#ff6b4a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 rgba(120,40,0,.55)) drop-shadow(0 8px 22px rgba(0,0,0,.6));animation:sgsplash .9s cubic-bezier(.2,1.4,.4,1) both}
@keyframes sgsplash{from{transform:scale(.2) rotate(-7deg);opacity:0}55%{transform:scale(1.12) rotate(2deg)}to{transform:scale(1)}}
.sg-root .shake{animation:sgshake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes sgshake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}
.sg-root .confetti{position:absolute;width:8px;height:8px;border-radius:2px;z-index:30;pointer-events:none;animation:sgconf 1s ease-out forwards}
@keyframes sgconf{to{transform:translate(var(--dx),var(--dy)) rotate(540deg);opacity:0}}
.sg-root .status{min-height:34px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13.5px;font-weight:800;color:var(--muted);margin-bottom:10px;line-height:1.35}
.sg-root .status.hint-near{color:var(--acc)}
.sg-root .status.hint-win{color:var(--good)}
.sg-root .spin-btn{position:relative;width:100%;border:none;border-radius:18px;padding:17px;font-size:17px;font-weight:900;letter-spacing:.05em;cursor:pointer;background:var(--gold);color:#241000;box-shadow:0 10px 28px rgba(255,150,40,.45),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 0 rgba(140,50,0,.35);transition:transform .12s;text-shadow:0 1px 0 rgba(255,255,255,.35)}
.sg-root .spin-btn:not(:disabled){animation:sgbtnring 2.6s ease-in-out infinite}
@keyframes sgbtnring{50%{box-shadow:0 10px 34px rgba(255,170,50,.65),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 0 rgba(140,50,0,.35)}}
.sg-root .spin-btn:active{transform:scale(.97)}
.sg-root .spin-btn:disabled{opacity:.55;cursor:default;transform:none;animation:none}
.sg-root .aux{display:flex;justify-content:space-between;margin-top:12px;position:relative;z-index:1}
.sg-root .aux button{border:none;background:none;color:rgba(255,255,255,.55);font-size:11.5px;font-weight:700;cursor:pointer;text-decoration:underline;padding:6px 2px}
.sg-root .flycard{position:absolute;width:44px;height:58px;border-radius:7px;overflow:hidden;z-index:55;pointer-events:none;border:1.5px solid rgba(255,220,140,.85);box-shadow:0 8px 20px rgba(0,0,0,.6),0 0 18px rgba(255,190,80,.45);transition:transform .55s cubic-bezier(.3,.75,.35,1),opacity .55s}
.sg-root .flycard img{width:100%;height:100%;object-fit:cover}
.sg-root .intro{position:absolute;inset:0;z-index:70;background:radial-gradient(700px 700px at 50% 42%,rgba(80,40,140,.55),rgba(5,4,12,.97) 70%);display:flex;align-items:center;justify-content:center;cursor:pointer}
.sg-root .i-rays{position:absolute;width:640px;height:640px;background:conic-gradient(from 0deg,transparent 0 14deg,rgba(255,195,80,.14) 14deg 22deg,transparent 22deg 40deg,rgba(255,195,80,.10) 40deg 48deg,transparent 48deg 72deg,rgba(255,195,80,.14) 72deg 80deg,transparent 80deg 104deg,rgba(255,195,80,.10) 104deg 112deg,transparent 112deg 140deg,rgba(255,195,80,.14) 140deg 148deg,transparent 148deg 176deg,rgba(255,195,80,.10) 176deg 184deg,transparent 184deg 212deg,rgba(255,195,80,.14) 212deg 220deg,transparent 220deg 248deg,rgba(255,195,80,.10) 248deg 256deg,transparent 256deg 284deg,rgba(255,195,80,.14) 284deg 292deg,transparent 292deg 320deg,rgba(255,195,80,.10) 320deg 328deg,transparent 328deg);border-radius:50%;animation:sgrayspin 9s linear infinite;mask:radial-gradient(circle,black 0 58%,transparent 72%)}
@keyframes sgrayspin{to{transform:rotate(360deg)}}
.sg-root .i-pack{position:relative;width:196px;height:258px;border-radius:18px;overflow:hidden;box-shadow:0 26px 60px rgba(0,0,0,.7),0 0 0 1.5px rgba(255,215,130,.7),0 0 46px rgba(255,180,60,.5);animation:sgpackin .75s cubic-bezier(.2,1.4,.4,1) both,sgpackfloat 2.4s ease-in-out .75s infinite}
.sg-root .i-pack img{width:100%;height:100%;object-fit:cover}
.sg-root .i-pack::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 25%,rgba(255,255,255,.4) 46%,transparent 62%);transform:translateX(-130%);animation:sgpackshine 1.5s ease .4s infinite}
@keyframes sgpackin{from{transform:scale(.3) translateY(90px) rotate(-8deg);opacity:0}60%{transform:scale(1.06) translateY(-6px) rotate(1.5deg)}to{transform:scale(1)}}
@keyframes sgpackfloat{50%{transform:translateY(-7px)}}
@keyframes sgpackshine{to{transform:translateX(130%)}}
.sg-root .i-burst{position:absolute;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,#fff8e0,rgba(255,205,90,.85) 40%,transparent 70%);transform:scale(0);opacity:0;pointer-events:none}
.sg-root .intro.go .i-burst{animation:sgburst .6s ease-out both}
@keyframes sgburst{20%{opacity:1}to{transform:scale(22);opacity:0}}
.sg-root .intro.go .i-pack{animation:sgpackout .5s ease-in both}
@keyframes sgpackout{to{transform:scale(1.5);opacity:0;filter:brightness(2.4)}}
.sg-root .intro.go .i-rays{opacity:0;transition:opacity .4s}
.sg-root .i-tip{position:absolute;bottom:9%;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);animation:sgtippulse 1.4s ease-in-out infinite}
@keyframes sgtippulse{50%{opacity:.4}}
.sg-root .ovl{position:absolute;inset:0;background:rgba(4,4,10,.85);display:flex;align-items:center;justify-content:center;z-index:40;padding:20px;backdrop-filter:blur(3px)}
.sg-root .rev{background:linear-gradient(180deg,#191226,#100b1c);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:26px 22px;text-align:center;max-width:320px;width:100%;animation:sgpop .35s cubic-bezier(.2,1.4,.4,1);box-shadow:0 30px 70px rgba(0,0,0,.6)}
@keyframes sgpop{from{transform:scale(.7);opacity:0}}
.sg-root .rev .big-card{position:relative;width:176px;height:235px;border-radius:14px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;box-shadow:0 16px 38px rgba(0,0,0,.6);overflow:hidden;animation:sgcardflip .55s cubic-bezier(.2,1.4,.4,1) both}
@keyframes sgcardflip{from{transform:rotateY(85deg) scale(.72);opacity:0}}
.sg-root .rev .big-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sg-root .rev .big-card::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 28%,rgba(255,255,255,.38) 46%,transparent 62%);transform:translateX(-130%);animation:sgcardshine 1s ease .45s forwards}
@keyframes sgcardshine{to{transform:translateX(130%)}}
.sg-root .rev .r-name{font-size:17px;font-weight:800}
.sg-root .rev .r-rar{font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-top:4px}
.sg-root .rev button{margin-top:16px;width:100%;border:none;border-radius:12px;padding:13px;font-weight:800;cursor:pointer;background:var(--gold);color:#241000;font-size:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 0 rgba(140,50,0,.3)}
.sg-root .r-COMMON .r-rar{color:var(--muted)} .sg-root .r-RARE .r-rar{color:var(--acc)} .sg-root .r-CHASE .r-rar{color:var(--chase)}
.sg-root .r-RARE .big-card{box-shadow:0 0 42px rgba(255,179,0,.45)}
.sg-root .r-CHASE .big-card{box-shadow:0 0 60px rgba(177,108,234,.6)}
.sg-root .chasebanner{font-size:12px;font-weight:800;letter-spacing:.2em;color:var(--chase);margin-bottom:6px}
.sg-root .sum-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px}
.sg-root .sc{border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.045);padding:10px 6px;text-align:center;position:relative}
.sg-root .sum-cards.stagger .sc{animation:sgtilein .45s cubic-bezier(.2,1.3,.4,1) both}
@keyframes sgtilein{from{transform:translateY(14px) scale(.85);opacity:0}}
.sg-root .sc .aimg{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;display:block}
.sg-root .sc .n{font-size:10.5px;font-weight:800;margin-top:5px;line-height:1.3;color:var(--text)}
.sg-root .sc .r{font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-top:2px}
.sg-root .sc.CHASE{box-shadow:0 0 18px rgba(177,108,234,.35);border-color:rgba(177,108,234,.5)}
.sg-root .sc.CHASE .r{color:var(--chase)} .sg-root .sc.RARE .r{color:var(--acc)} .sg-root .sc.COMMON .r{color:var(--muted)}
@media(prefers-reduced-motion:reduce){.sg-root *{animation:none!important;transition:none!important}}
`}</style>
  );
}
