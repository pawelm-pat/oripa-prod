"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Lang, Rarity } from "../lib/types";
import { RARITY_META } from "../data/prizes";

/* ─────────────────────────────────────────────────────────────────────────
   Slot game (pack opening) — a 5×4 grid cabinet ported from the PackSpin V2
   reference (packspin-demo.vercel.app/v2.html) using its art assets, kept in
   /public/slot. Opened from the Store "Buy a pack" CTA.

   Mechanics: every WIN drops cards into the stack until credits hit 0. Most
   wins drop a single card; BIG WINS flood the grid and drop 5–30 at once.
   The payline is the 2nd row; three CARD symbols there = a win. When the spins
   run out we show the oripa "your stack" summary where cards can be exchanged
   for coins or shipped.
   ───────────────────────────────────────────────────────────────────────── */

const FONT = "var(--font-noto-sans-jp), system-ui, sans-serif";
const SURFACE = "#eef0f3";
const INK = "#1d2129";
const MUTED = "#8a9099";
const BRAND = "#D10005";
const SHIP = "#f5670a";
const SHIP_MIN_COINS = 1500;
// Per-card stagger of the summary flip ceremony (veils flip away one by one).
// v7 pacing for small stacks; compressed for card floods so the whole
// ceremony stays ~3s instead of 10s+ on a 30-card session.
const flipStep = (n: number) => (n <= 10 ? 320 : Math.max(80, Math.round(3200 / n)));

type DemoRarity = "COMMON" | "RARE" | "CHASE";
const DEMO_TO_ORIPA: Record<DemoRarity, Rarity> = { COMMON: "N", RARE: "SR", CHASE: "UR" };

type WonCard = { id: number; name: string; nameJa: string; rarity: Rarity; demoRarity: DemoRarity; img: string };

type Props = {
  packId: string;
  packName: string;
  // Store pack artwork used for the pack-open intro animation.
  packImage: string;
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

/* Slot symbols — sliced 1:1 from the reel artwork: 5 faceted gems + 4 character cards
   (ambient), and the hero card as the CARD hit symbol (last → three across = win). */
const SYMS = [
  "/slot/sym-emerald.png", "/slot/sym-bluestar.png", "/slot/sym-amber.png",
  "/slot/sym-amethyst.png", "/slot/sym-ruby.png",
  "/slot/sym-char-white.png", "/slot/sym-char-purple.png",
  "/slot/sym-char-blonde.png", "/slot/sym-char-red.png",
  "/slot/sym-char-hero.png",
];
const CARD_SYM = 9;
const COLS = 5, ROWS = 3, PAYROW = 1;

/* ── Slot engine — demo-tuned hot: frequent wins, chunky multi-card drops
   (up to 30 in one spin) and a generous rare/chase mix so the face-down
   aura moments show up often. ─────────────────────────────────────────── */
const V2 = {
  baseHit: 0.45,
  pityCap: 3,
  rarityWeights: [["CHASE", 0.10], ["RARE", 0.35], ["COMMON", 0.55]] as [DemoRarity, number][],
  bigWinChance: 0.12,
  bigWinMin: 5,
  bigWinMax: 30,
};
function bigWinSize() {
  const r = Math.random();
  // Mild skew towards the small end, but 20–30 card floods stay reachable.
  return V2.bigWinMin + Math.floor(Math.pow(r, 1.6) * (V2.bigWinMax - V2.bigWinMin + 1));
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

const randAmb = () => Math.floor(Math.random() * CARD_SYM);
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
    toPayout: "% to payout",
    winsDrop: "Wins bank face-down cards — the aura colour hints how rare",
    spin: (n: number, total: number) => `SPIN · ${n} of ${total}`,
    exit: "← Exit",
    quickSpin: (on: boolean) => `⚡ Quick spin ${on ? "on" : "off"}`,
    fastForward: "Fast-forward ⏩",
    banked: "Card banked face-down — flips at 100%",
    bankedRare: "✨ A RARE aura joined your stack",
    bankedChase: "★ Something legendary is in your stack — flips at 100%",
    bankedBig: (n: number) => `💥 ${n} cards banked face-down`,
    stackComplete: "Stack complete — flipping your cards…",
    soClose: "So close…",
    cardWin: "CARD WIN!",
    rareGlow: "✨ A rare glow…",
    legendaryAura: "★ A LEGENDARY AURA…",
    bigWinLine: (n: number) => `💥 BIG WIN — ${n} cards incoming!`,
    stackTitle: (n: number) => `Your stack — ${n} card${n === 1 ? "" : "s"}`,
    faceDownHint: "Face-down until 100% — the auras hint at what's inside.",
    cardN: (i: number) => `Card #${i}`,
    auraChase: "★ LEGENDARY AURA",
    auraRare: "✨ RARE AURA",
    faceDown: "FACE-DOWN",
    nothingYet: "Nothing yet — keep spinning.",
    close: "Close",
    flipping: "flipping them over…",
    summary: (credits: number, spins: number, cards: number) => `${credits} credits · ${spins} spins · ${cards} cards won`,
    backToShop: "Back to shop",
    openAnother: "Open another",
    noCards: "No cards won this time.",
    exchange: "Exchange to coins",
    requestShip: "Request shipping",
    reset: "Reset",
    coinsUnit: "coins",
    selectHint: "Select cards to exchange for coins, or request shipping (min 1,500 coins).",
    selectHintSingle: "Exchange this card for coins, or request shipping (min 1,500 coins).",
    tapToSelect: "Tap cards to select",
    itemSelected: "Selected",
    itemSelect: "Select",
    exchanged: (n: number, c: number) => `Exchanged ${n} card${n > 1 ? "s" : ""} for ${c.toLocaleString()} coins`,
    shipRequested: "Shipping requested",
    shortfall: (n: number) => `Select ${n.toLocaleString()} more coins to request shipping`,
    rarity: { N: "COMMON", SR: "RARE", UR: "CHASE" } as Record<Rarity, string>,
  },
  ja: {
    toPayout: "% 達成まで",
    winsDrop: "当たりはカードが裏向きでストックへ — オーラの色がレア度のヒント",
    spin: (n: number, total: number) => `スピン · ${n} / ${total}`,
    exit: "← 退出",
    quickSpin: (on: boolean) => `⚡ クイックスピン ${on ? "オン" : "オフ"}`,
    fastForward: "早送り ⏩",
    banked: "カードを裏向きでストック — 100%でオープン",
    bankedRare: "✨ レアのオーラがストックに加わった",
    bankedChase: "★ 伝説の気配がストックに — 100%でオープン",
    bankedBig: (n: number) => `💥 ${n}枚を裏向きでストック！`,
    stackComplete: "ストック完成 — カードをオープン中…",
    soClose: "惜しい…",
    cardWin: "カード当たり！",
    rareGlow: "✨ レアな輝き…",
    legendaryAura: "★ 伝説のオーラ…",
    bigWinLine: (n: number) => `💥 大当たり — ${n}枚がやってくる！`,
    stackTitle: (n: number) => `ストック — ${n}枚`,
    faceDownHint: "100%まで裏向き — オーラが中身のヒント。",
    cardN: (i: number) => `カード #${i}`,
    auraChase: "★ 伝説のオーラ",
    auraRare: "✨ レアオーラ",
    faceDown: "裏向き",
    nothingYet: "まだありません",
    close: "閉じる",
    flipping: "オープン中…",
    summary: (credits: number, spins: number, cards: number) => `${credits}クレジット · ${spins}スピン · ${cards}枚獲得`,
    backToShop: "ショップに戻る",
    openAnother: "もう一つ開ける",
    noCards: "今回はカードを獲得できませんでした。",
    exchange: "コインに交換",
    requestShip: "発送を申請",
    reset: "リセット",
    coinsUnit: "コイン",
    selectHint: "カードを選んでコインに交換、または発送を申請（最低1,500コイン）。",
    selectHintSingle: "このカードをコインに交換、または発送を申請（最低1,500コイン）。",
    tapToSelect: "カードをタップして選択",
    itemSelected: "選択中",
    itemSelect: "選択",
    exchanged: (n: number, c: number) => `${n}枚を${c.toLocaleString()}コインに交換しました`,
    shipRequested: "発送を申請しました",
    shortfall: (n: number) => `発送申請にはあと${n.toLocaleString()}コイン必要です`,
    rarity: { N: "COMMON", SR: "RARE", UR: "CHASE" } as Record<Rarity, string>,
  },
};

export function SlotGame({ packId, packName, packImage, credits, spins, lang, header, onExchange, onClose }: Props) {
  const L = STR[lang];
  const cat = CATALOG.find((c) => c.id === packId) ?? CATALOG[0];
  const spinCost = Math.max(1, Math.round(credits / Math.max(1, spins)));

  // Live game values kept in refs so the imperative reel animation never fights
  // React re-renders; a forced tick reconciles the DOM at rest points.
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const wonRef = useRef<WonCard[]>([]);
  // Stack count SHOWN in the header — lags wonRef during the fly animation so
  // a won card never appears in the stack before it visually lands there.
  const shownWonRef = useRef(0);
  const creditsLeftRef = useRef(credits);
  const spinIndexRef = useRef(0);
  const dryStreakRef = useRef(0);
  const idRef = useRef(0);
  const restGridRef = useRef<number[][] | null>(null);
  const spinningRef = useRef(false);
  const [spinning, setSpinning] = useState(false);
  const setSpin = (v: boolean) => { spinningRef.current = v; setSpinning(v); };
  const tokenRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!restGridRef.current) restGridRef.current = newRestGrid();

  const [phase, setPhase] = useState<"intro" | "play" | "summary">(reduceMotion() ? "play" : "intro");
  const [quick, setQuick] = useState(false);
  const [stackOpen, setStackOpen] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  // v7 mystery banking: the summary flips the face-down stack over card by card;
  // selection unlocks only once every veil has flipped away.
  const [flipDone, setFlipDone] = useState(false);
  // Gates the SPIN CTA until the cabinet's intro reel-roll settles.
  const [ready, setReady] = useState(reduceMotion());

  const at = (ms: number, fn: () => void) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  useEffect(() => {
    // Preload art so reels/reveals never pop in blank.
    [...cat.pool.map((c) => c.img), cat.chase.img, packImage, "/slot/gacha-bg.jpg", "/slot/crack-mask.png", "/slot/card-back.png", ...SYMS].forEach((s) => { const im = new Image(); im.src = s; });
    return () => { timersRef.current.forEach(clearTimeout); tokenRef.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // When the cabinet first appears (intro → play), bounce it in and roll the
  // reels once so the board feels alive; the SPIN CTA unlocks only once the
  // reels settle, so the first tap always lands on a live machine.
  useEffect(() => {
    if (phase !== "play") return;
    if (reduceMotion()) { setReady(true); return; }
    setReady(false);
    const token = ++tokenRef.current;
    const live = () => tokenRef.current === token && rootRef.current;
    const cab = rootQ(".cab");
    if (cab) { cab.classList.remove("cab-in"); void cab.offsetWidth; cab.classList.add("cab-in"); }
    const ts: ReturnType<typeof setTimeout>[] = [];
    const cols: (HTMLElement | null)[] = [];
    for (let ci = 0; ci < COLS; ci++) {
      const col = rootQ(`[data-col="${ci}"]`);
      cols[ci] = col;
      if (col) { col.classList.remove("land"); col.classList.add("spin"); }
    }
    const stops = [520, 660, 800, 940, 1080];
    for (let ci = 0; ci < COLS; ci++) {
      ts.push(setTimeout(() => {
        if (!live()) return;
        const col = cols[ci]; if (!col) return;
        col.classList.remove("spin"); col.classList.add("land");
      }, stops[ci]));
    }
    ts.push(setTimeout(() => cab?.classList.remove("cab-in"), 650));
    ts.push(setTimeout(() => { if (live()) setReady(true); }, stops[COLS - 1] + 300));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Kick the summary flip ceremony: veils flip away staggered (commons first,
  // chase last); selection unlocks once the last veil is gone.
  useEffect(() => {
    if (phase !== "summary") return;
    const n = wonRef.current.length;
    if (reduceMotion() || n === 0) { setFlipDone(true); return; }
    const t = setTimeout(() => setFlipDone(true), 400 + n * flipStep(n) + 500);
    return () => clearTimeout(t);
  }, [phase]);

  function makeCard(): WonCard {
    const d = drawDemoCard(cat);
    return { id: idRef.current++, name: d.name, nameJa: d.name, rarity: DEMO_TO_ORIPA[d.demoRarity], demoRarity: d.demoRarity, img: d.img };
  }

  /* v7 mystery banking: won cards fly FACE-DOWN from the cabinet into the
     stack — the aura (border glow) shows the tier, never the card. Commons
     stream over first; the batch's best rare/chase flies LAST as a hero
     flight with a charge-up swell, sparkle trail and landing shockwave. */
  const AURA = { COMMON: "#c9ced6", RARE: SHIP, CHASE: BRAND } as const;

  function spark(root: HTMLElement, x: number, y: number, col: string) {
    const d = document.createElement("div");
    d.className = "spark";
    d.style.left = (x - 3) + "px"; d.style.top = (y - 3) + "px";
    d.style.setProperty("--sc", col);
    d.style.setProperty("--dx", (Math.random() * 74 - 37) + "px");
    d.style.setProperty("--dy", (Math.random() * 74 - 37) + "px");
    root.appendChild(d);
    setTimeout(() => d.remove(), 720);
  }
  function ringAt(root: HTMLElement, x: number, y: number, col: string, size: number) {
    const r = document.createElement("div");
    r.className = "shockring";
    r.style.left = (x - size / 2) + "px"; r.style.top = (y - size / 2) + "px";
    r.style.width = size + "px"; r.style.height = size + "px";
    r.style.setProperty("--sc", col);
    root.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  function flyCards(cards: WonCard[], preWon: number, done: () => void) {
    const root = rootRef.current;
    const cab = root?.querySelector(".cab") as HTMLElement | null;
    const st = root?.querySelector(".stack") as HTMLElement | null;
    if (!root || !cab || !st || reduceMotion()) { shownWonRef.current = preWon + cards.length; done(); return; }
    const R = root.getBoundingClientRect();
    const a = cab.getBoundingClientRect(), b = st.getBoundingClientRect();
    const n = cards.length, show = Math.min(n, 8);
    const RANK = { COMMON: 0, RARE: 1, CHASE: 2 };
    const batch = cards.slice(0, show).sort((x, y) => RANK[x.demoRarity] - RANK[y.demoRarity]); // hero last
    const per = quick ? 65 : 95;
    const badge = st.querySelector("b");
    let landed = 0;
    const landTick = () => {
      landed++;
      shownWonRef.current = Math.round(preWon + (landed / show) * n);
      if (badge) badge.textContent = String(shownWonRef.current);
      st.classList.remove("bump"); void st.offsetWidth; st.classList.add("bump");
      if (landed === show) { shownWonRef.current = preWon + n; if (badge) badge.textContent = String(preWon + n); done(); }
    };
    batch.forEach((card, i) => at(i * per, () => {
      const hero = i === show - 1 && card.demoRarity !== "COMMON";
      if (hero) heroFly(root, card, a, b, R, landTick);
      else plainFly(root, card, a, b, R, landTick);
    }));
  }

  function plainFly(root: HTMLElement, card: WonCard, a: DOMRect, b: DOMRect, R: DOMRect, cb: () => void) {
    const flight = quick ? 330 : 540;
    const el = document.createElement("div");
    el.className = "flycard fd-" + card.demoRarity;
    el.innerHTML = `<img src="/slot/card-back.png" alt="">`;
    const jx = Math.random() * 90 - 45, jy = Math.random() * 46 - 23;
    const sx = (a.left - R.left) + a.width / 2 - 22 + jx, sy = (a.top - R.top) + a.height / 2 - 29 + jy;
    el.style.left = sx + "px"; el.style.top = sy + "px";
    root.appendChild(el);
    el.animate([
      { transform: "none", opacity: 1 },
      { transform: `translate(${((b.left - R.left) + b.width / 2 - 22) - sx}px,${((b.top - R.top) + b.height / 2 - 29) - sy}px) rotate(${160 + Math.random() * 140}deg) scale(.3)`, opacity: 0.35 },
    ], { duration: flight, easing: "cubic-bezier(.3,.75,.35,1)", fill: "forwards" });
    at(flight, () => { el.remove(); cb(); });
  }

  function heroFly(root: HTMLElement, card: WonCard, a: DOMRect, b: DOMRect, R: DOMRect, cb: () => void) {
    const chase = card.demoRarity === "CHASE";
    const col = AURA[chase ? "CHASE" : "RARE"];
    const hw = chase ? 30 : 26, hh = chase ? 39 : 34;
    const dim = document.createElement("div");
    dim.className = "flydim";
    root.appendChild(dim);
    requestAnimationFrame(() => { dim.style.opacity = "1"; });
    const el = document.createElement("div");
    el.className = "flycard fd-" + card.demoRarity;
    el.innerHTML = `<img src="/slot/card-back.png" alt="">`;
    const sx = (a.left - R.left) + a.width / 2 - hw, sy = (a.top - R.top) + a.height / 2 - hh;
    el.style.left = sx + "px"; el.style.top = sy + "px";
    root.appendChild(el);
    ringAt(root, sx + hw, sy + hh, col, chase ? 190 : 130);
    const swell = `translateY(-26px) scale(${chase ? 1.75 : 1.4}) rotate(${Math.random() * 10 - 5}deg)`;
    el.animate([{ transform: "none" }, { transform: swell }],
      { duration: 340, easing: "cubic-bezier(.2,1.35,.4,1)", fill: "forwards" });
    const hold = quick ? (chase ? 420 : 260) : (chase ? 700 : 420);
    at(340 + hold, () => {
      const fl = quick ? 380 : (chase ? 620 : 520);
      el.animate([
        { transform: swell, opacity: 1 },
        { transform: `translate(${((b.left - R.left) + b.width / 2 - hw) - sx}px,${((b.top - R.top) + b.height / 2 - hh) - sy}px) rotate(${chase ? 280 : 220}deg) scale(.3)`, opacity: 0.45 },
      ], { duration: fl, easing: "cubic-bezier(.3,.7,.35,1)", fill: "forwards" });
      const trail = setInterval(() => {
        const r = el.getBoundingClientRect();
        spark(root, r.left - R.left + r.width / 2, r.top - R.top + r.height / 2, col);
        if (chase) spark(root, r.left - R.left + r.width / 2 + (Math.random() * 18 - 9), r.top - R.top + r.height / 2 + (Math.random() * 18 - 9), "#fff");
      }, 45);
      at(fl, () => {
        clearInterval(trail);
        el.remove();
        dim.style.opacity = "0";
        setTimeout(() => dim.remove(), 320);
        const bx = (b.left - R.left) + b.width / 2, by = (b.top - R.top) + b.height / 2;
        ringAt(root, bx, by, col, chase ? 170 : 120);
        for (let k = 0; k < (chase ? 14 : 9); k++) spark(root, bx, by, k % 3 ? col : "#fff");
        cb();
      });
    });
  }

  function confetti(el: Element | null, chase: boolean) {
    if (!el) return;
    const colors = chase ? [BRAND, SHIP, "#fff"] : [BRAND, SHIP, "#16a34a", "#fff"];
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
    if (spinningRef.current) return;
    if (creditsLeftRef.current <= 0) return;
    const winN = decideSpin(creditsLeftRef.current, spinCost, wonRef.current.length, dryStreakRef.current);
    const hit = winN > 0, isBig = winN > 1;
    const cards = Array.from({ length: winN }, () => makeCard());

    spinIndexRef.current += 1;
    creditsLeftRef.current -= spinCost;
    if (hit) { wonRef.current = [...wonRef.current, ...cards]; dryStreakRef.current = 0; }
    else dryStreakRef.current += 1;
    const sessionOver = creditsLeftRef.current <= 0;
    const preWon = wonRef.current.length - winN;
    // The header keeps showing the pre-spin count until the cards land.
    shownWonRef.current = preWon;
    const isChase = cards.some((c) => c.demoRarity === "CHASE");
    const topRar: DemoRarity = isChase ? "CHASE" : cards.some((c) => c.demoRarity === "RARE") ? "RARE" : "COMMON";
    const nearMiss = !hit && Math.random() < 0.35;
    const { g: finalG, winCells } = buildGrid(winN, nearMiss);
    const Q = quick;

    // Win → face-down cards fly straight into the stack (no reveal — the aura
    // is the only tell until the 100% flip).
    const afterWin = () => {
      flyCards(cards, preWon, () => {
        setSpin(false);
        if (sessionOver) { setStatusDom(L.stackComplete, "hint-win"); at(Q ? 450 : 800, () => setPhase("summary")); }
        else {
          setStatusDom(
            isBig ? L.bankedBig(winN)
            : topRar === "CHASE" ? L.bankedChase
            : topRar === "RARE" ? L.bankedRare
            : L.banked,
            topRar === "CHASE" ? "hint-chase" : topRar === "RARE" ? "hint-near" : "hint-win");
          tick();
        }
      });
    };
    const finishDry = () => {
      setSpin(false);
      setStatusDom(nearMiss ? L.soClose : "", nearMiss ? "hint-near" : "");
      if (sessionOver) at(Q ? 400 : 800, () => setPhase("summary"));
      else tick();
    };

    if (reduceMotion()) {
      restGridRef.current = finalG;
      tick();
      if (!hit) { finishDry(); return; }
      setSpin(true);
      afterWin();
      return;
    }

    setSpin(true);
    const token = ++tokenRef.current;
    const live = () => tokenRef.current === token && rootRef.current;
    setStatusDom("", "");
    updateBarDom(preWon);

    const ivs: (ReturnType<typeof setInterval> | null)[] = [];
    for (let ci = 0; ci < COLS; ci++) {
      const col = rootQ(`[data-col="${ci}"]`);
      if (!col) continue;
      col.classList.remove("land"); col.classList.add("spin");
      // Each column cycles symbols at its own cadence so the five reels are visibly out
      // of sync (never one moving block), and each cell rolls its own random item.
      const swapMs = 48 + ci * 13;
      ivs[ci] = setInterval(() => {
        col.querySelectorAll<HTMLImageElement>(".cell img").forEach((img) => { img.src = SYMS[randAmb()]; });
      }, swapMs);
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
      cab?.classList.add(isChase ? "chaseflash" : isBig ? "goldflash" : "winflash");
      if (isBig && cab) {
        const sp = document.createElement("div");
        sp.className = "bigsplash"; sp.textContent = "BIG WIN";
        cab.appendChild(sp);
        setTimeout(() => sp.remove(), 1600);
      }
      confetti(cab, isChase || isBig);
      if (isChase || isBig) rootQ(".room")?.classList.add("shake");
      setStatusDom(
        isBig ? L.bigWinLine(winN)
        : topRar === "CHASE" ? L.legendaryAura
        : topRar === "RARE" ? L.rareGlow
        : L.cardWin,
        topRar === "CHASE" ? "hint-chase" : topRar === "RARE" ? "hint-near" : "hint-win");
      at(isBig ? (Q ? 550 : 950) : (Q ? 300 : 620), () => { if (live()) afterWin(); });
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
    shownWonRef.current = wonRef.current.length;
    setPhase("summary");
  }

  /* ── Summary helpers (exchange / ship) ── */
  const coinOf = (r: Rarity) => RARITY_META[r].coin;
  const won = wonRef.current;
  // A lone card is auto-selected so the Exchange / Request shipping CTAs are
  // available immediately — tap-to-select only applies when 2+ cards are won.
  const singleCard = won.length === 1;
  const sel = singleCard ? new Set<number>(won.map((c) => c.id)) : picked;
  const pickedCards = won.filter((c) => sel.has(c.id));
  const pickedTotal = pickedCards.reduce((s, c) => s + coinOf(c.rarity), 0);
  const canShip = pickedTotal >= SHIP_MIN_COINS;
  const togglePick = (id: number) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const showToast = (msg: string) => { setToast(msg); at(2200, () => setToast(null)); };
  const doExchange = () => {
    if (sel.size === 0) return;
    const ids = new Set(sel);
    const n = ids.size, total = pickedTotal;
    onExchange?.(total);
    wonRef.current = won.filter((c) => !ids.has(c.id));
    setPicked(new Set());
    showToast(L.exchanged(n, total));
    tick();
  };
  const doShip = () => {
    if (sel.size === 0 || !canShip) return;
    const ids = new Set(sel);
    wonRef.current = won.filter((c) => !ids.has(c.id));
    setPicked(new Set());
    showToast(L.shipRequested);
    tick();
  };

  const rarityCls = (d: DemoRarity) => (d === "CHASE" ? "CHASE" : d === "RARE" ? "RARE" : "COMMON");

  /* ── Summary screen — the 100% flip ceremony, then exchange / ship ── */
  if (phase === "summary") {
    // Commons flip first — chase last (v7 ceremony order).
    const RANK = { COMMON: 0, RARE: 1, CHASE: 2 };
    const display = [...won].sort((a, b) => RANK[a.demoRarity] - RANK[b.demoRarity]);
    return (
      <div ref={rootRef} className="sg-root absolute inset-0 z-[70] flex flex-col text-[#1d2129]" style={{ fontFamily: FONT, background: SURFACE }}>
        {header}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 bg-white px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold leading-tight" style={{ color: BRAND }}>{packName}</p>
            <p className="text-[10px] font-medium" style={{ color: MUTED }}>{L.summary(credits, spins, won.length)}{!flipDone && won.length > 0 ? <b style={{ color: BRAND }}> — {L.flipping}</b> : null}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={onClose} className="rounded-lg border border-[#e5e8ec] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1d2129] active:scale-95">{L.backToShop}</button>
            <button onClick={onClose} className="rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold text-white active:scale-95" style={{ background: BRAND }}>{L.openAnother}</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {won.length === 0 ? (
            <p className="mt-10 text-center text-[13px]" style={{ color: MUTED }}>{L.noCards}</p>
          ) : singleCard ? (
            <div className="flex flex-col items-center pt-2">
              <div className="relative w-[168px]" style={{ aspectRatio: "5/7" }}>
                <img src={won[0].img} alt="" className="h-full w-full rounded-xl object-cover" style={{ boxShadow: "0 10px 26px rgba(0,0,0,0.22)" }} />
                {!flipDone && <div className="veil" style={{ animationDelay: "400ms" }}>?</div>}
              </div>
              <p className="mt-3 text-center text-[15px] font-extrabold leading-tight text-[#1d2129]">{lang === "ja" ? won[0].nameJa : won[0].name}</p>
              <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: won[0].demoRarity === "CHASE" ? BRAND : won[0].demoRarity === "RARE" ? SHIP : MUTED }}>{L.rarity[won[0].rarity]} · {coinOf(won[0].rarity).toLocaleString()} {L.coinsUnit}</p>
            </div>
          ) : (
            <>
              {flipDone && picked.size === 0 && <p className="mb-2 text-[11px] font-semibold" style={{ color: MUTED }}>{L.tapToSelect}</p>}
              <div className="space-y-3">
                {display.map((c, i) => {
                  const isSel = picked.has(c.id);
                  const rc = c.demoRarity === "CHASE" ? BRAND : c.demoRarity === "RARE" ? SHIP : MUTED;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { if (flipDone) togglePick(c.id); }}
                      className="flex w-full gap-3 rounded-2xl bg-white p-2.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition active:scale-[0.995]"
                      style={{ border: isSel ? "2.5px solid #FF7A1A" : "1.5px solid rgba(0,0,0,0.08)" }}
                    >
                      <div className="relative shrink-0" style={{ width: 82, aspectRatio: "5/7" }}>
                        <img src={c.img} alt="" className="h-full w-full rounded-lg object-cover" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
                        {!flipDone && <div className="veil" style={{ animationDelay: (400 + i * flipStep(display.length)) + "ms", borderRadius: 8, fontSize: 18 }}>?</div>}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: rc }}>{L.rarity[c.rarity]}</span>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: isSel ? "#FF7A1A" : MUTED }}>
                            {isSel ? L.itemSelected : L.itemSelect}
                            <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={isSel ? "#FF7A1A" : "#c9ced6"} /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                          </span>
                        </div>
                        <p className="mt-1.5 text-[14px] font-bold leading-tight text-[#1d2129]">{lang === "ja" ? c.nameJa : c.name}</p>
                        <div className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white pb-2 pt-2" style={{ marginTop: 8 }}>
                          <span className="inline-block h-[18px] w-[18px] rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #ffe9a8, #f5a623 60%, #e08600)" }} />
                          <span className="text-[18px] font-bold text-[#1d2129]">{coinOf(c.rarity).toLocaleString()}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {flipDone && won.length > 0 && sel.size > 0 && (
          <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
              <span style={{ color: MUTED }}>{sel.size} · {pickedTotal.toLocaleString()} {L.coinsUnit}</span>
              {!singleCard && <button onClick={() => setPicked(new Set())} className="underline" style={{ color: MUTED }}>{L.reset}</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { if (!canShip) { showToast(L.shortfall(SHIP_MIN_COINS - pickedTotal)); return; } doShip(); }} className="rounded-xl border-2 py-2 text-[12.5px] font-bold leading-tight transition" style={{ borderColor: SHIP, color: SHIP, background: "#fff", opacity: canShip ? 1 : 0.6 }}>
                ← {L.requestShip} · {sel.size}
                <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{pickedTotal.toLocaleString()} {L.coinsUnit}</span>
              </button>
              <button onClick={doExchange} className="rounded-xl py-2 text-[12.5px] font-bold leading-tight text-white transition" style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)" }}>
                {L.exchange} · {sel.size} →
                <span className="mt-0.5 block text-[10px] font-semibold opacity-90">{pickedTotal.toLocaleString()} {L.coinsUnit}</span>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10.5px] leading-tight" style={{ color: MUTED }}>{singleCard ? L.selectHintSingle : L.selectHint}</p>
          </div>
        )}
        {toast && <div className="pointer-events-none absolute bottom-24 left-1/2 z-[85] -translate-x-1/2 rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.4)]" style={{ background: INK }}>{toast}</div>}
        <SlotStyle />
      </div>
    );
  }

  /* ── Play screen (5×4 grid cabinet) ── */
  const spent = credits - creditsLeftRef.current;
  const pct = Math.round((spent / credits) * 100);
  const spinsLeft = Math.ceil(creditsLeftRef.current / spinCost);
  const totalSpins = Math.max(1, Math.ceil(credits / spinCost));
  const spinNo = Math.min(totalSpins - spinsLeft + 1, totalSpins);
  // Mid-flight renders show the lagged count; the pile aura also only counts
  // cards that have already landed, so nothing "arrives" ahead of its flight.
  const shownWon = shownWonRef.current;
  const bankedSoFar = wonRef.current.slice(0, shownWon);

  return (
    <div ref={rootRef} className="sg-root absolute inset-0 z-[70] flex flex-col text-[#1d2129]" style={{ fontFamily: FONT, background: SURFACE }}>
      {header}
      <div className="flex-1 overflow-y-auto px-3.5 pb-6 pt-3">
        <div className="room">
          <div className="bar-wrap">
            <div className="bar-label">
              <span>{packName} · {lang === "ja" ? "残り" : ""}<b className="spins-n" style={{ color: INK }}>{spinsLeft}</b>{lang === "ja" ? "回" : " spins left"}</span>
              <span className="crnum"><span className="pct-n">{pct}</span><span style={{ fontSize: 11, color: MUTED }}>{L.toPayout}</span></span>
            </div>
            <div className="stackbar">
              <div className="bar" style={{ flex: 1 }}><div className="fill" style={{ width: pct + "%" }} /></div>
              <button
                className={`stack ${bankedSoFar.some((w) => w.demoRarity === "CHASE") ? "has-chase" : bankedSoFar.some((w) => w.demoRarity === "RARE") ? "has-rare" : ""}`}
                onClick={() => { if (!spinningRef.current) setStackOpen(true); }}
                aria-label="Your face-down card stack"
              >
                <span className="pileimg p3" /><span className="pileimg p2" /><span className="pileimg p1" />
                <b>{shownWon}</b>
              </button>
            </div>
            <div className="bar-sub">
              {lang === "ja" ? (
                <><span className="cnt-n">{shownWon}</span>枚を裏向きでストック — バーは消費クレジット、<b>100%</b>で全てオープン</>
              ) : (
                <><span className="cnt-n">{shownWon}</span> card{shownWon === 1 ? "" : "s"} banked face-down — the bar tracks credits spent; at <b>100%</b> they all flip</>
              )}
            </div>
          </div>

          <div className="cab">
            <img className="frame-img" src="/slot/frame-neon.png" alt="" aria-hidden="true" />
            {/* Each column is one sliced roll strip; it scrolls on its own speed while
                spinning and stops staggered when you hit SPIN (driven by .spin/.hold/.land) */}
            <div className="reelframe">
              <div className="rgrid">
                {Array.from({ length: COLS }).map((_, ci) => (
                  <div className="rcol" data-col={ci} key={ci}>
                    <div className="rtrack" style={{ backgroundImage: `url(/slot/rolls/roll-${ci + 1}.png)` }} />
                  </div>
                ))}
              </div>
              <span className="payline" />
            </div>
          </div>

          <div className="status">{spinIndexRef.current === 0 ? L.winsDrop : ""}</div>
          <button className="spin-btn" onClick={() => doSpin()} disabled={spinning || !ready || creditsLeftRef.current <= 0}>{L.spin(spinNo, totalSpins)}</button>
          <div className="aux">
            <button onClick={() => { if (!spinningRef.current) onClose(); }}>{L.exit}</button>
            <button onClick={() => { if (!spinningRef.current) setQuick((q) => !q); }} style={{ color: quick ? BRAND : undefined }}>{L.quickSpin(quick)}</button>
            <button onClick={fastForward}>{L.fastForward}</button>
          </div>
        </div>
      </div>

      {/* Pack-open intro — the POC gacha "draw" sequence with the pack's art */}
      {phase === "intro" && (
        <PackOpenIntro image={packImage} name={packName} lang={lang} onDone={() => setPhase("play")} />
      )}

      {/* Mid-session stack peek — face-down until 100%; auras hint at the tier */}
      {stackOpen && (
        <div className="ovl" onClick={() => setStackOpen(false)}>
          <div className="rev" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="r-name" style={{ marginBottom: 4 }}>{L.stackTitle(wonRef.current.length)}</div>
            <p style={{ fontSize: 10.5, color: "#a0a6af", marginBottom: 12 }}>{L.faceDownHint}</p>
            {wonRef.current.length ? (
              <div className="sum-cards" style={{ margin: "0 0 4px", maxHeight: "46vh", overflowY: "auto" }}>
                {wonRef.current.map((g, i) => (
                  <div className={`sc fd-sc-${rarityCls(g.demoRarity)}`} key={g.id}>
                    <div className="backpat">?</div>
                    <div className="n">{L.cardN(i + 1)}</div>
                    <div className="r" style={{ color: g.demoRarity === "CHASE" ? BRAND : g.demoRarity === "RARE" ? SHIP : MUTED }}>
                      {g.demoRarity === "CHASE" ? L.auraChase : g.demoRarity === "RARE" ? L.auraRare : L.faceDown}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: MUTED, padding: "16px 0" }}>{L.nothingYet}</p>
            )}
            <button onClick={() => setStackOpen(false)}>{L.close}</button>
          </div>
        </div>
      )}

      <SlotStyle />
    </div>
  );
}

/* Scoped styles — Oripa brand palette (light surface + brand red CTAs). */
function SlotStyle() {
  return (
    <style>{`
.sg-root{--brand:#D10005;--ship:#f5670a;--good:#16a34a;--muted:#8a9099;--dim:#a0a6af;--text:#1d2129;--surface:#eef0f3;--cta:#D10005}
.sg-root *{box-sizing:border-box}
.sg-root .room{position:relative;border:1px solid #e5e8ec;border-radius:20px;padding:14px 13px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.06);overflow:hidden}
.sg-root .bar-wrap{margin-bottom:4px;background:#f7f8fa;border:1px solid #e5e8ec;border-radius:14px;padding:10px 11px}
.sg-root .bar-label{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:7px}
.sg-root .bar-label span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.sg-root .bar-label .crnum{font-size:15px;color:var(--text);white-space:nowrap;flex-shrink:0}
.sg-root .bar{height:14px;border-radius:999px;background:rgba(0,0,0,.08);border:none;overflow:hidden}
.sg-root .fill{position:relative;height:100%;border-radius:999px;background:var(--brand);transition:width .5s cubic-bezier(.22,.61,.36,1);overflow:hidden}
.sg-root .fill::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.45) 50%,transparent 80%);transform:translateX(-100%);animation:sgsheen 2.4s linear infinite}
@keyframes sgsheen{to{transform:translateX(100%)}}
.sg-root .stackbar{display:flex;align-items:center;gap:10px}
.sg-root .stack{position:relative;width:52px;height:48px;border:none;background:none;cursor:pointer;flex-shrink:0}
.sg-root .stack .pileimg{position:absolute;left:50%;top:50%;width:30px;height:40px;border-radius:5px;background:url(/slot/card-back.png) center/cover;border:1.5px solid rgba(209,0,5,.35);box-shadow:0 3px 7px rgba(0,0,0,.18)}
.sg-root .stack.has-rare .p1{border-color:rgba(245,103,10,.95);box-shadow:0 0 13px rgba(245,103,10,.65)}
.sg-root .stack.has-chase .p1{border-color:rgba(209,0,5,.95);box-shadow:0 0 17px rgba(209,0,5,.9);animation:sgfdpulse 1.1s ease-in-out infinite}
@keyframes sgfdpulse{50%{filter:brightness(1.45)}}
.sg-root .stack .p1{transform:translate(-50%,-50%)}
.sg-root .stack .p2{transform:translate(-50%,-50%) rotate(-9deg) translateX(-4px)}
.sg-root .stack .p3{transform:translate(-50%,-50%) rotate(10deg) translateX(4px)}
.sg-root .stack b{position:absolute;right:-4px;top:-6px;min-width:20px;height:20px;border-radius:999px;background:var(--brand);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 2px 8px rgba(209,0,5,.35);z-index:2}
.sg-root .stack.bump .pileimg,.sg-root .stack.bump b{animation:sgstackbump .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes sgstackbump{40%{transform:translate(-50%,-50%) scale(1.28)}}
.sg-root .stack.bump b{animation:sgbadgebump .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes sgbadgebump{40%{transform:scale(1.4)}}
.sg-root .bar-sub{font-size:10px;color:var(--dim);margin-top:6px}
.sg-root .bar-sub b{color:var(--brand)}
/* Cabinet = exported PNG frame overlay; reels sit in its transparent window (1:1 with the PNG) */
.sg-root .cab{position:relative;margin:12px 0;filter:drop-shadow(0 0 10px rgba(255,45,55,.4)) drop-shadow(0 14px 28px rgba(0,0,0,.22))}
.sg-root .frame-img{position:relative;display:block;width:100%;height:auto;z-index:2;pointer-events:none;user-select:none}
.sg-root .cab.winflash{animation:sgcabwin .6s ease-in-out 2}
@keyframes sgcabwin{50%{filter:drop-shadow(0 0 20px rgba(22,163,74,.75)) drop-shadow(0 14px 28px rgba(0,0,0,.22))}}
.sg-root .cab.goldflash{animation:sgcabgold .55s ease-in-out 3}
@keyframes sgcabgold{50%{filter:drop-shadow(0 0 24px rgba(255,180,60,.8)) drop-shadow(0 14px 28px rgba(0,0,0,.22))}}
.sg-root .cab.chaseflash{animation:sgcabchase .6s ease-in-out 3}
@keyframes sgcabchase{50%{filter:drop-shadow(0 0 26px rgba(209,0,5,.85)) drop-shadow(0 14px 28px rgba(0,0,0,.22))}}
.sg-root .cab.cab-in{animation:sgcabin .6s cubic-bezier(.2,1.45,.35,1) both}
@keyframes sgcabin{0%{transform:translateY(24px) scale(.9);opacity:0}55%{transform:translateY(0) scale(1.04);opacity:1}100%{transform:translateY(0) scale(1)}}
/* Reels fill the transparent window of frame-neon.png (measured insets, tucked ~0.6% under the neon) */
.sg-root .reelframe{position:absolute;top:6.9%;left:6.7%;right:6.9%;bottom:15.8%;z-index:1;overflow:hidden;border-radius:14px}
/* Sliced roll strips as reels. Each column shows one strip (top:0, size 100%×50% of a
   200%-tall track that repeats) so a -50% roll loops seamlessly; per-column speeds keep
   the five reels out of sync. The payline is a separate overlay (healed out of the art). */
.sg-root .rgrid{position:absolute;inset:0;display:flex;height:100%}
.sg-root .rcol{position:relative;flex:1;height:100%;overflow:hidden;border-radius:6px}
.sg-root .rtrack{position:absolute;left:0;right:0;top:0;height:200%;background-repeat:repeat-y;background-size:100% 50%;background-position:top center;will-change:transform;transform:translateY(0)}
.sg-root .rcol.spin .rtrack{animation:sgcolroll .4s linear infinite;filter:blur(1.6px) brightness(1.04)}
@keyframes sgcolroll{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}
.sg-root .rcol.land .rtrack{animation:sgcolland .42s cubic-bezier(.18,1.5,.4,1)}
@keyframes sgcolland{0%{transform:translateY(-9%)}55%{transform:translateY(2.2%)}100%{transform:translateY(0)}}
.sg-root .rcol.hold{animation:sgholdpulse .5s ease-in-out infinite}
.sg-root .rcol.spin:nth-child(1) .rtrack{animation-duration:.34s}
.sg-root .rcol.spin:nth-child(2) .rtrack{animation-duration:.44s}
.sg-root .rcol.spin:nth-child(3) .rtrack{animation-duration:.39s}
.sg-root .rcol.spin:nth-child(4) .rtrack{animation-duration:.5s}
.sg-root .rcol.spin:nth-child(5) .rtrack{animation-duration:.37s}
@media (prefers-reduced-motion:reduce){.sg-root .rcol.spin .rtrack,.sg-root .rcol.land .rtrack{animation:none;filter:none}}
/* Each column is a brushed-steel cylinder: dark steel poles, bright specular centre */
.sg-root .col{position:relative;flex:1;height:100%;border-radius:6px;overflow:hidden;perspective:640px;background:linear-gradient(180deg,#3c4048 0%,#565b64 7%,#868c96 20%,#c2c7ce 38%,#e8ebef 50%,#c2c7ce 62%,#868c96 80%,#565b64 93%,#3c4048 100%);box-shadow:inset 2px 0 3px rgba(255,255,255,.35),inset -2px 0 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3)}
.sg-root .strip{display:flex;flex-direction:column;gap:3px;padding:3px;height:100%;transform-style:preserve-3d;will-change:transform}
.sg-root .cell{flex:1;min-height:0;border-radius:8px;background:transparent;border:1.5px solid transparent;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;backface-visibility:hidden}
.sg-root .cell img{width:88%;height:88%;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.55))}
/* Curve the drum by tilting the poles away from the viewer (3 rows) */
.sg-root .strip .cell:nth-child(1){transform:rotateX(30deg)}
.sg-root .strip .cell:nth-child(2){transform:rotateX(0deg)}
.sg-root .strip .cell:nth-child(3){transform:rotateX(-30deg)}
/* Cylinder shading: strong dark poles, faint centre sheen (continuous drum) */
.sg-root .reel-glass{position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:6px;background:linear-gradient(180deg,rgba(4,6,12,.6) 0%,rgba(4,6,12,0) 18%,rgba(255,255,255,.14) 49%,rgba(4,6,12,0) 82%,rgba(4,6,12,.6) 100%)}
/* Continuous red laser payline across the whole deck (centre row) */
.sg-root .payline{position:absolute;left:0;right:0;top:50%;height:3px;transform:translateY(-50%);z-index:5;pointer-events:none;background:linear-gradient(90deg,rgba(255,40,50,0),rgba(255,40,50,.95) 12%,rgba(255,140,140,1) 50%,rgba(255,40,50,.95) 88%,rgba(255,40,50,0));box-shadow:0 0 10px 1px rgba(255,40,50,.85),0 0 22px 3px rgba(255,40,50,.5)}
/* Spinning: the whole drum rolls, symbols sweep with motion blur */
.sg-root .col.spin .strip{animation:sgdrum .19s linear infinite}
@keyframes sgdrum{0%{transform:translateY(-11%)}100%{transform:translateY(11%)}}
.sg-root .col.spin .cell img{animation:sgreelblur .07s linear infinite}
@keyframes sgreelblur{0%{transform:translateY(-88%);filter:blur(2px) brightness(1.05)}100%{transform:translateY(88%);filter:blur(2px) brightness(1.05)}}
/* Each of the five drums runs at its own speed so they spin independently, not as one block */
.sg-root .col.spin:nth-child(1) .strip{animation-duration:.165s}
.sg-root .col.spin:nth-child(2) .strip{animation-duration:.225s}
.sg-root .col.spin:nth-child(3) .strip{animation-duration:.195s}
.sg-root .col.spin:nth-child(4) .strip{animation-duration:.255s}
.sg-root .col.spin:nth-child(5) .strip{animation-duration:.18s}
.sg-root .col.spin:nth-child(1) .cell img{animation-duration:.055s}
.sg-root .col.spin:nth-child(2) .cell img{animation-duration:.078s}
.sg-root .col.spin:nth-child(3) .cell img{animation-duration:.066s}
.sg-root .col.spin:nth-child(4) .cell img{animation-duration:.084s}
.sg-root .col.spin:nth-child(5) .cell img{animation-duration:.06s}
/* Landing bounce */
.sg-root .col.land .strip{animation:sgstripland .34s cubic-bezier(.2,1.4,.4,1)}
@keyframes sgstripland{from{transform:translateY(-7%)}}
.sg-root .col.land .cell img{animation:sgreelland .34s cubic-bezier(.2,1.5,.4,1)}
@keyframes sgreelland{from{transform:translateY(-54%) scale(1.16)}}
.sg-root .col.hold{animation:sgholdpulse .5s ease-in-out infinite}
@keyframes sgholdpulse{50%{box-shadow:inset 0 0 0 2px rgba(209,0,5,.9),0 0 16px rgba(209,0,5,.5),inset 0 12px 16px -8px rgba(0,0,0,.5),inset 0 -12px 16px -8px rgba(0,0,0,.5)}}
.sg-root .cell.win-cell{border-color:rgba(22,163,74,.95)}
.sg-root .cell.win-cell::after{content:"";position:absolute;inset:0;border-radius:8px;box-shadow:0 0 14px rgba(22,163,74,.6),inset 0 0 10px rgba(22,163,74,.3);animation:sgwinpulse .7s ease-in-out infinite;z-index:2}
@keyframes sgwinpulse{50%{opacity:.35}}
.sg-root .cell.win-cell img{animation:sgwinpop .5s cubic-bezier(.2,1.7,.4,1)}
@keyframes sgwinpop{45%{transform:scale(1.22)}}
.sg-root .sweep{position:absolute;background:linear-gradient(90deg,transparent,rgba(209,0,5,.9),transparent);height:4px;border-radius:4px;z-index:4;pointer-events:none;animation:sgsweepx .75s cubic-bezier(.3,.6,.3,1) both;box-shadow:0 0 12px rgba(209,0,5,.55)}
@keyframes sgsweepx{from{transform:translateX(-30%) scaleX(.15);opacity:0}30%{opacity:1}to{transform:translateX(30%) scaleX(1.05);opacity:0}}
.sg-root .bigsplash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;font-size:42px;font-weight:900;letter-spacing:.04em;color:var(--brand);text-shadow:0 2px 0 rgba(255,255,255,.9),0 6px 18px rgba(209,0,5,.35);animation:sgsplash .9s cubic-bezier(.2,1.4,.4,1) both}
@keyframes sgsplash{from{transform:scale(.2) rotate(-7deg);opacity:0}55%{transform:scale(1.12) rotate(2deg)}to{transform:scale(1)}}
.sg-root .shake{animation:sgshake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes sgshake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}
.sg-root .confetti{position:absolute;width:8px;height:8px;border-radius:2px;z-index:30;pointer-events:none;animation:sgconf 1s ease-out forwards}
@keyframes sgconf{to{transform:translate(var(--dx),var(--dy)) rotate(540deg);opacity:0}}
.sg-root .status{min-height:34px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:800;color:var(--muted);margin-bottom:10px;line-height:1.35}
.sg-root .status.hint-near{color:var(--ship)}
.sg-root .status.hint-win{color:var(--good)}
.sg-root .status.hint-chase{color:var(--brand);animation:sgchpulse 1.1s ease-in-out infinite}
@keyframes sgchpulse{50%{opacity:.55}}
.sg-root .spin-btn{position:relative;width:100%;border:none;border-radius:14px;padding:15px;font-size:16px;font-weight:900;letter-spacing:.04em;cursor:pointer;background:var(--brand);color:#fff;box-shadow:0 6px 18px rgba(209,0,5,.28);transition:transform .12s}
.sg-root .spin-btn:not(:disabled){animation:sgbtnring 2.6s ease-in-out infinite}
@keyframes sgbtnring{50%{box-shadow:0 8px 24px rgba(209,0,5,.42)}}
.sg-root .spin-btn:active{transform:scale(.97)}
.sg-root .spin-btn:disabled{opacity:.55;cursor:default;transform:none;animation:none}
.sg-root .aux{display:flex;justify-content:space-between;margin-top:12px;position:relative;z-index:1}
.sg-root .aux button{border:none;background:none;color:var(--muted);font-size:11.5px;font-weight:700;cursor:pointer;text-decoration:underline;padding:6px 2px}
/* Face-down flycards: the v7 golden card back + rarity aura is all you see mid-session */
.sg-root .flycard{position:absolute;width:44px;height:58px;border-radius:7px;overflow:hidden;z-index:55;pointer-events:none;border:1.5px solid rgba(255,205,110,.85);box-shadow:0 8px 20px rgba(0,0,0,.3),0 0 14px rgba(255,190,80,.5)}
.sg-root .flycard img{width:100%;height:100%;object-fit:cover}
.sg-root .flycard.fd-RARE{width:52px;height:68px;border-color:rgba(245,103,10,.95);box-shadow:0 8px 20px rgba(0,0,0,.35),0 0 28px rgba(245,103,10,.8)}
.sg-root .flycard.fd-CHASE{width:60px;height:78px;border-color:rgba(209,0,5,.95);box-shadow:0 8px 20px rgba(0,0,0,.35),0 0 36px rgba(209,0,5,.95);animation:sgfdpulse .45s ease-in-out infinite}
.sg-root .flydim{position:absolute;inset:0;background:rgba(29,33,41,.45);z-index:52;pointer-events:none;opacity:0;transition:opacity .3s}
.sg-root .spark{position:absolute;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:56;background:radial-gradient(circle,#fff,var(--sc,#f5a623) 55%,transparent 78%);animation:sgsparkfade .7s ease-out forwards}
@keyframes sgsparkfade{to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
.sg-root .shockring{position:absolute;border-radius:50%;pointer-events:none;z-index:54;border:2.5px solid var(--sc,#f5a623);box-shadow:0 0 18px var(--sc,#f5a623);animation:sgringout .55s ease-out forwards}
@keyframes sgringout{from{transform:scale(.2);opacity:.95}to{transform:scale(1);opacity:0}}
/* Card backs: stack-peek tiles and the summary flip veils */
.sg-root .backpat{width:100%;aspect-ratio:3/4;border-radius:8px;border:1px solid rgba(0,0,0,.1);background:repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 5px,#b40206 5px 10px);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:rgba(255,255,255,.85)}
.sg-root .veil{position:absolute;inset:0;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:repeating-linear-gradient(135deg,rgba(255,255,255,.16) 0 5px,#b40206 5px 10px);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:rgba(255,255,255,.9);z-index:2;transform-origin:center;animation:sgveilout .45s ease forwards}
@keyframes sgveilout{55%{opacity:1}to{transform:rotateY(90deg) scale(1.06);opacity:0}}
.sg-root .ovl{position:absolute;inset:0;background:rgba(29,33,41,.55);display:flex;align-items:center;justify-content:center;z-index:40;padding:20px;backdrop-filter:blur(3px)}
.sg-root .rev{background:#fff;border:1px solid #e5e8ec;border-radius:20px;padding:26px 22px;text-align:center;max-width:320px;width:100%;animation:sgpop .35s cubic-bezier(.2,1.4,.4,1);box-shadow:0 24px 50px rgba(0,0,0,.22)}
@keyframes sgpop{from{transform:scale(.7);opacity:0}}
.sg-root .rev .r-name{font-size:17px;font-weight:800;color:var(--text)}
.sg-root .rev button{margin-top:16px;width:100%;border:none;border-radius:12px;padding:13px;font-weight:800;cursor:pointer;background:var(--brand);color:#fff;font-size:14px;box-shadow:0 4px 14px rgba(209,0,5,.28)}
.sg-root .sum-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px}
.sg-root .sc{border:1px solid #e5e8ec;border-radius:12px;background:#f7f8fa;padding:10px 6px;text-align:center;position:relative}
.sg-root .sc .n{font-size:10.5px;font-weight:800;margin-top:5px;line-height:1.3;color:var(--text)}
.sg-root .sc .r{font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-top:2px}
.sg-root .sc.fd-sc-CHASE{box-shadow:0 0 14px rgba(209,0,5,.25);border-color:rgba(209,0,5,.5)}
.sg-root .sc.fd-sc-RARE{border-color:rgba(245,103,10,.5)}
@media(prefers-reduced-motion:reduce){.sg-root *{animation:none!important;transition:none!important}.sg-root .veil{display:none}}
`}</style>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pack-open intro — a faithful port of the oripa-poc "draw" gacha sequence
   (charge → breaking → flash → settle) using the selected pack's artwork and
   the anime backdrop, before the slot cabinet appears.
   ───────────────────────────────────────────────────────────────────────── */
function PackOpenIntro({ image, name, lang, onDone }: { image: string; name: string; lang: Lang; onDone: () => void }) {
  const H = 4;                 // crack steps
  const X = 1300;              // charge duration (ms)
  const STEP = 520;            // per-crack step
  const P = STEP * H;          // total breaking window
  const END = X + P + 1000 + 750;

  const [g, setG] = useState<"charge" | "breaking" | "flash" | "settle">("charge");
  const [m, setM] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDoneRef.current(); };

  useEffect(() => {
    if (reduceMotion()) { finish(); return; }
    const ts: ReturnType<typeof setTimeout>[] = [];
    ts.push(setTimeout(() => setG("breaking"), X));
    for (let t = 1; t <= H; t++) ts.push(setTimeout(() => setM(t), X + STEP * t));
    ts.push(setTimeout(() => setG("flash"), X + P));
    ts.push(setTimeout(() => setG("settle"), X + P + 1000));
    ts.push(setTimeout(finish, END));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conv = Array.from({ length: 16 }).map((_, t) => {
    const a = (t / 16) * Math.PI * 2, r = 150 + (t % 5) * 26;
    return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r), d: (t % 8) * 0.14 };
  });
  const sparks = Array.from({ length: 18 }).map((_, t) => {
    const a = (t / 18) * Math.PI * 2, r = 90 + (t % 4) * 30;
    return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r), d: (t % 6) * 0.12 };
  });
  const petals = Array.from({ length: 14 }).map((_, t) => ({ left: (37 * t) % 100, delay: (t % 7) * 0.5, dur: 4 + (t % 5), size: 8 + (t % 4) * 4 }));
  const bokeh = Array.from({ length: 12 }).map((_, t) => {
    const s = 6 + (t % 4) * 5;
    const bg = t % 3 === 0 ? "rgba(255,225,150,.9)" : t % 3 === 1 ? "rgba(255,150,200,.85)" : "rgba(160,200,255,.85)";
    return { left: (53 * t) % 100, size: s, bg, dur: 3.4 + (t % 5) * 0.7, delay: (t % 6) * 0.55 };
  });

  const o = m / H, c = 0.3 + 0.7 * o;
  const eyebrow = lang === "ja" ? "ガチャ" : "DRAW";
  const status = g === "charge" ? (lang === "ja" ? "チャージ中…" : "CHARGING…") : g === "breaking" ? (lang === "ja" ? "開封中…" : "OPENING…") : "";
  const packBox: CSSProperties = { width: 212, height: 300 };
  const packImg: CSSProperties = { height: 300, width: "auto", maxWidth: 212, objectFit: "contain" };
  const maskBase: CSSProperties = {
    WebkitMaskImage: "url(/slot/crack-mask.png)", maskImage: "url(/slot/crack-mask.png)",
    WebkitMaskSize: "auto 100%", maskSize: "auto 100%", WebkitMaskPosition: "center", maskPosition: "center",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
  };

  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center overflow-hidden"
      style={{ fontFamily: FONT, opacity: g === "settle" ? 0 : 1, transition: "opacity 750ms ease", cursor: "pointer" }}
      onClick={finish}
    >
      <style>{`
        @keyframes gaSky { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes gaRays { to { transform: rotate(360deg); } }
        @keyframes gaRaysRev { to { transform: rotate(-360deg); } }
        @keyframes gaFocus { 0%{opacity:.15; transform:scale(1.4)} 50%{opacity:.5; transform:scale(1)} 100%{opacity:.15; transform:scale(1.4)} }
        @keyframes gaPulse { 0%,100% { transform: scale(.9); opacity:.7 } 50% { transform: scale(1.2); opacity:1 } }
        @keyframes gaFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes gaText { 0%{opacity:0; transform:translateY(14px) scale(.85)} 40%{opacity:1; transform:translateY(0) scale(1.06)} 60%{transform:scale(1)} 100%{opacity:1} }
        @keyframes gaLabelZoom { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.16) } }
        @keyframes gaPetal { 0%{ transform: translateY(-40px) rotate(0); opacity:0 } 12%{opacity:.9} 100%{ transform: translateY(760px) rotate(420deg); opacity:0 } }
        @keyframes gaStreak { 0%{ transform: translateX(-60%) skewX(-18deg); opacity:0 } 40%{opacity:.8} 100%{ transform: translateX(160%) skewX(-18deg); opacity:0 } }
        @keyframes gaPackJolt { 0%{ transform: scale(1) rotate(0) } 14%{ transform: scale(1.1) rotate(-5deg) } 30%{ transform: scale(.97) rotate(5deg) } 46%{ transform: scale(1.05) rotate(-3deg) } 64%{ transform: scale(1) rotate(2deg) } 100%{ transform: scale(1) rotate(0) } }
        @keyframes gaPackBob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-6px) } }
        @keyframes gaCrackPop { 0%{ opacity:0; transform: scale(.4) } 40%{ opacity:1; transform: scale(1.25) } 100%{ opacity:0; transform: scale(1.6) } }
        @keyframes gaSplitL { 0%{ transform: translate(0,0) rotate(0); opacity:1 } 100%{ transform: translate(-180px,40px) rotate(-26deg); opacity:0 } }
        @keyframes gaSplitR { 0%{ transform: translate(0,0) rotate(0); opacity:1 } 100%{ transform: translate(180px,40px) rotate(26deg); opacity:0 } }
        @keyframes gaShock { 0%{ transform: scale(.2); opacity:.9 } 100%{ transform: scale(2.6); opacity:0 } }
        @keyframes gaBurstFlash { 0%{ opacity:0 } 18%{ opacity:1 } 60%{ opacity:.85 } 100%{ opacity:0 } }
        @keyframes gaPackIn { 0%{ opacity:0; transform: translateY(60px) scale(.3) rotate(-8deg) } 60%{ opacity:1; transform: translateY(0) scale(1.06) rotate(2deg) } 100%{ transform: translateY(0) scale(1) rotate(0) } }
        @keyframes gaChargeShake { 0%,100%{ transform: translate(0,0) rotate(0) } 25%{ transform: translate(-2px,1px) rotate(-1.2deg) } 50%{ transform: translate(2px,-1px) rotate(1.2deg) } 75%{ transform: translate(-1px,1px) rotate(-.8deg) } }
        @keyframes gaConverge { 0%{ transform: translate(var(--dx),var(--dy)) scale(.2); opacity:0 } 25%{ opacity:1 } 100%{ transform: translate(0,0) scale(1); opacity:0 } }
        @keyframes gaAura { 0%,100%{ transform: scale(.85); opacity:.5 } 50%{ transform: scale(1.18); opacity:.95 } }
        @keyframes gaBokeh { 0%{ transform: translateY(40px) scale(.6); opacity:0 } 15%{ opacity:.85 } 85%{ opacity:.7 } 100%{ transform: translateY(-220px) scale(1.1); opacity:0 } }
        @keyframes gaSpark { 0% { transform: translate(0,0) scale(0); opacity:0 } 25% { opacity:1 } 100% { transform: translate(var(--dx),var(--dy)) scale(1.1); opacity:0 } }
        @keyframes gaCirclePulse { 0%,100%{ opacity:.45; transform: scale(.97) } 50%{ opacity:.85; transform: scale(1.03) } }
        @keyframes gaBgZoom { 0%{ transform: scale(1.04) } 50%{ transform: scale(1.14) } 100%{ transform: scale(1.04) } }
        @keyframes gaFadeIn { from{ opacity:0 } to{ opacity:1 } }
        @keyframes gaCrackBeam { 0%{ opacity:.2 } 50%{ opacity:1 } 100%{ opacity:.6 } }
        @keyframes gaSeamPulse { 0%,100%{ opacity:.85 } 50%{ opacity:1 } }
      `}</style>

      {/* Backdrop layers */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(125deg,#3a0d6b,#7a1648,#c81d6b,#2a0b3f,#10081f)", backgroundSize: "400% 400%", animation: "gaSky 6s ease infinite" }} />
      <div className="absolute h-[150vh] w-[150vh]" style={{ animation: "gaRays 14s linear infinite", background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 2deg, rgba(255,255,255,0) 2deg 6deg)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, #000 60%)", maskImage: "radial-gradient(circle, transparent 18%, #000 60%)" }} />
      <div className="absolute h-[150vh] w-[150vh]" style={{ animation: "gaFocus 2.6s ease-in-out infinite", background: "repeating-conic-gradient(from 0deg, rgba(255,210,90,.16) 0deg 1deg, rgba(255,210,90,0) 1deg 7deg)", WebkitMaskImage: "radial-gradient(circle, transparent 22%, #000 64%)", maskImage: "radial-gradient(circle, transparent 22%, #000 64%)" }} />
      <div className="absolute h-[620px] w-[620px]" style={{ animation: "gaRaysRev 10s linear infinite", background: "conic-gradient(from 0deg, rgba(255,210,80,0) 0deg, rgba(255,210,80,.34) 10deg, rgba(255,210,80,0) 22deg, rgba(255,210,80,.34) 34deg, rgba(255,210,80,0) 46deg, rgba(255,210,80,.34) 58deg, rgba(255,210,80,0) 70deg)", borderRadius: "9999px", WebkitMaskImage: "radial-gradient(circle, #000 24%, transparent 70%)", maskImage: "radial-gradient(circle, #000 24%, transparent 70%)" }} />
      <svg className="pointer-events-none absolute h-[480px] w-[480px]" viewBox="0 0 200 200" style={{ animation: "gaRays 22s linear infinite, gaCirclePulse 3s ease-in-out infinite" }}>
        <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,228,150,.55)" strokeWidth="1.4" strokeDasharray="4 6" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,228,150,.3)" strokeWidth="0.8" />
        {Array.from({ length: 24 }).map((_, t) => { const a = (t / 24) * Math.PI * 2; return <line key={t} x1={100 + 78 * Math.cos(a)} y1={100 + 78 * Math.sin(a)} x2={100 + 86 * Math.cos(a)} y2={100 + 86 * Math.sin(a)} stroke="rgba(255,228,150,.5)" strokeWidth="1" />; })}
      </svg>
      <svg className="pointer-events-none absolute h-[330px] w-[330px]" viewBox="0 0 200 200" style={{ animation: "gaRaysRev 16s linear infinite", opacity: 0.6 }}>
        <polygon points="100,16 121,76 184,76 133,113 152,173 100,136 48,173 67,113 16,76 79,76" fill="none" stroke="rgba(255,228,150,.5)" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,228,150,.4)" strokeWidth="1" strokeDasharray="2 7" />
      </svg>
      {bokeh.map((b, t) => (
        <span key={`b${t}`} className="absolute bottom-[-20px] rounded-full" style={{ left: `${b.left}%`, width: b.size, height: b.size, background: `radial-gradient(circle at 30% 30%, #fff, ${b.bg})`, animation: `gaBokeh ${b.dur}s ease-in ${b.delay}s infinite`, filter: "blur(0.3px) drop-shadow(0 0 6px rgba(255,235,170,.7))" }} />
      ))}
      {petals.map((p, t) => (
        <span key={`p${t}`} className="absolute top-0 rounded-full" style={{ left: `${p.left}%`, width: p.size, height: p.size, background: "radial-gradient(circle at 30% 30%, #ffd6ec, #ff77b6)", animation: `gaPetal ${p.dur}s linear ${p.delay}s infinite`, filter: "drop-shadow(0 0 4px rgba(255,150,200,.6))" }} />
      ))}
      {Array.from({ length: 4 }).map((_, t) => (
        <span key={`s${t}`} className="absolute h-[3px] w-1/2 rounded-full bg-white/70" style={{ top: `${18 + 20 * t}%`, animation: `gaStreak ${1.1 + 0.2 * t}s ease-in ${0.25 * t}s infinite` }} />
      ))}
      <img src="/slot/gacha-bg.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ animation: "gaFadeIn .6s ease both, gaBgZoom 12s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 30%, rgba(0,0,0,.35) 72%, rgba(0,0,0,.6) 100%)" }} />
      <div className="absolute h-[300px] w-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,230,140,.55), rgba(255,150,40,0) 70%)", animation: "gaPulse 1.3s ease-in-out infinite" }} />

      {/* Charge */}
      {g === "charge" && (
        <div className="relative flex items-center justify-center">
          <span className="pointer-events-none absolute h-[280px] w-[280px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,235,150,.6), rgba(255,150,40,0) 68%)", animation: "gaAura 1s ease-in-out infinite" }} />
          {conv.map((e, t) => (
            <span key={t} className="absolute h-2 w-2 rounded-full bg-white" style={{ ["--dx" as string]: `${e.dx}px`, ["--dy" as string]: `${e.dy}px`, animation: `gaConverge ${0.9 + e.d}s ease-in ${e.d}s infinite`, boxShadow: "0 0 8px 2px rgba(255,235,160,.95)" }} />
          ))}
          <div className="relative" style={{ animation: "gaPackIn 700ms cubic-bezier(.2,.8,.2,1) both, gaChargeShake 240ms ease-in-out 760ms infinite", filter: "drop-shadow(0 0 40px rgba(255,210,120,.9))" }}>
            <img src={image} alt="" style={packImg} draggable={false} />
          </div>
        </div>
      )}

      {/* Breaking */}
      {g === "breaking" && (
        <div className="relative flex items-center justify-center" style={{ animation: "gaPackBob 1.3s ease-in-out infinite" }}>
          <div className="relative" style={{ ...packBox, animation: "gaPackJolt 460ms cubic-bezier(.36,.07,.19,.97) both", filter: `drop-shadow(0 0 ${22 + 9 * m}px rgba(255,205,110,.9))` }}>
            <img src={image} alt="" className="absolute inset-0 m-auto" style={packImg} draggable={false} />
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: "150%", height: "120%", background: "radial-gradient(ellipse 40% 55% at 50% 48%, rgba(255,255,255,.9), rgba(255,230,140,.45) 48%, rgba(255,200,80,0) 74%)", opacity: 0.85 * c, mixBlendMode: "screen", animation: "gaCrackBeam 460ms ease-out both" }} />
            <div className="pointer-events-none absolute inset-0 m-auto" style={{ ...packBox, clipPath: `inset(${(1 - o) * 50}% 0% ${(1 - o) * 50}% 0%)` }}>
              <div className="absolute inset-0" style={{ background: "#0a0014", transform: "scale(1.06)", filter: "blur(0.5px)", ...maskBase }} />
              <div className="absolute inset-0" style={{ background: "#ffffff", opacity: c, animation: "gaSeamPulse 600ms ease-in-out infinite", filter: "drop-shadow(0 0 6px rgba(255,235,160,1)) drop-shadow(0 0 16px rgba(255,200,90,.85))", ...maskBase }} />
            </div>
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,1), rgba(255,220,120,0) 70%)", animation: "gaCrackPop 460ms ease-out both" }} />
          </div>
        </div>
      )}

      {/* Flash / split */}
      {g === "flash" && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "gaBurstFlash 1000ms ease-out forwards" }} />
          <span className="pointer-events-none absolute h-[260px] w-[260px] rounded-full" style={{ border: "6px solid rgba(255,235,160,.9)", animation: "gaShock 700ms ease-out forwards", boxShadow: "0 0 40px rgba(255,210,120,.8)" }} />
          <div className="relative" style={packBox}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ clipPath: "inset(0 50% 0 0)", animation: "gaSplitL 700ms cubic-bezier(.4,0,.6,1) forwards" }}>
              <img src={image} alt="" style={packImg} draggable={false} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ clipPath: "inset(0 0 0 50%)", animation: "gaSplitR 700ms cubic-bezier(.4,0,.6,1) forwards" }}>
              <img src={image} alt="" style={packImg} draggable={false} />
            </div>
          </div>
          {sparks.map((e, t) => (
            <span key={t} className="absolute h-2.5 w-2.5 rounded-full bg-white" style={{ ["--dx" as string]: `${e.dx}px`, ["--dy" as string]: `${e.dy}px`, animation: `gaSpark ${1.1 + e.d}s ease-out ${e.d}s`, boxShadow: "0 0 10px 3px rgba(255,235,160,.95)" }} />
          ))}
        </>
      )}

      {g === "settle" && <div className="pointer-events-none absolute inset-0 bg-white" />}

      {/* Titles */}
      <div className="absolute top-[60px] left-0 right-0 flex flex-col items-center text-center px-6" style={{ animation: "gaText .7s ease both" }}>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.42em] text-white/85">{eyebrow}</span>
        <span className="mt-1 inline-block max-w-full truncate whitespace-nowrap rounded-xl px-5 py-1.5 text-[24px] font-black italic leading-none tracking-[0.02em] text-white" style={{ background: "linear-gradient(135deg,#ff3b4e,#B40206)", border: "2px solid rgba(255,255,255,.85)", boxShadow: "0 4px 18px rgba(230,0,18,.6)", textShadow: "0 2px 8px rgba(120,0,10,.6)", animation: "gaLabelZoom 1.5s ease-in-out infinite" }}>{name}</span>
      </div>
      <p className="absolute bottom-[80px] text-center text-[30px] font-black italic tracking-[0.14em] text-white" style={{ animation: "gaText .7s ease both", textShadow: "0 2px 16px rgba(255,180,60,.85)" }}>{status}</p>
    </div>
  );
}
