"use client";

/*
 * SlotReels — the inner "rolls" of the slot machine as a standalone, reusable
 * presentational component (brushed-steel cylinders, cylinder shading and the
 * red laser payline). It carries no game logic, so it can be dropped into
 * marketing surfaces, previews or the live SlotGame.
 *
 * The visual language matches the live slot (see slotgame.tsx): each column is
 * a brushed-steel drum, symbols are tilted on the poles to fake curvature, a
 * glass overlay darkens the poles and a continuous laser marks the pay row.
 */
import type { CSSProperties } from "react";

export const REEL_SYMBOLS = [
  "/slot/sym-emerald.png",
  "/slot/sym-bluestar.png",
  "/slot/sym-amber.png",
  "/slot/sym-amethyst.png",
  "/slot/sym-ruby.png",
  "/slot/sym-char-white.png",
  "/slot/sym-char-purple.png",
  "/slot/sym-char-blonde.png",
  "/slot/sym-char-red.png",
  "/slot/sym-char-hero.png",
];
/** Index of the premium "card" symbol (three across the pay row = a win). */
export const CARD_SYMBOL = 9;

export type SlotReelsProps = {
  /** [col][row] symbol indices into `symbols`. Falsy → a showcase spread of all items. */
  grid?: number[][];
  cols?: number;
  rows?: number;
  /** Row the laser payline sits on (0-based). Defaults to the centre row. */
  payRow?: number;
  symbols?: string[];
  /** Spin every column (boolean) or specific columns (boolean[]). */
  spinning?: boolean | boolean[];
  showPayline?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** A tidy spread that surfaces every symbol at least once (card on the pay row). */
export function showcaseGrid(cols = 5, rows = 3, payRow = Math.floor(rows / 2), symbols = REEL_SYMBOLS): number[][] {
  const amb = symbols.length - 1; // non-card symbols
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) =>
      r === payRow && c >= 2 && c <= 4 ? CARD_SYMBOL : (c * rows + r) % amb),
  );
}

export function SlotReels({
  grid,
  cols = 5,
  rows = 3,
  payRow = Math.floor(rows / 2),
  symbols = REEL_SYMBOLS,
  spinning = false,
  showPayline = true,
  className = "",
  style,
}: SlotReelsProps) {
  const g = grid ?? showcaseGrid(cols, rows, payRow, symbols);
  const isSpin = (ci: number) => (Array.isArray(spinning) ? !!spinning[ci] : spinning);
  const mid = (rows - 1) / 2;
  const tilt = (ri: number) => `rotateX(${Math.max(-40, Math.min(40, (mid - ri) * 30))}deg)`;

  return (
    <div className={`sr-root ${className}`} style={style}>
      <style>{CSS}</style>
      <div className="sr-grid" style={{ gap: 7 }}>
        {g.map((col, ci) => (
          <div className={`sr-col${isSpin(ci) ? " sr-spin" : ""}`} key={ci}>
            <div className="sr-strip">
              {col.map((s, ri) => (
                <div className="sr-cell" style={{ transform: tilt(ri) }} key={ri}>
                  <img src={symbols[s]} alt="" draggable={false} />
                </div>
              ))}
            </div>
            <span className="sr-glass" />
          </div>
        ))}
        {showPayline && <span className="sr-payline" style={{ top: `${((payRow + 0.5) / rows) * 100}%` }} />}
      </div>
    </div>
  );
}

const CSS = `
.sr-root{position:relative;width:100%;aspect-ratio:872/616}
.sr-grid{position:absolute;inset:0;display:flex;height:100%}
.sr-col{position:relative;flex:1;height:100%;border-radius:6px;overflow:hidden;perspective:640px;background:linear-gradient(180deg,#3c4048 0%,#565b64 7%,#868c96 20%,#c2c7ce 38%,#e8ebef 50%,#c2c7ce 62%,#868c96 80%,#565b64 93%,#3c4048 100%);box-shadow:inset 2px 0 3px rgba(255,255,255,.35),inset -2px 0 3px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3)}
.sr-strip{display:flex;flex-direction:column;gap:3px;padding:3px;height:100%;transform-style:preserve-3d;will-change:transform}
.sr-cell{flex:1;min-height:0;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;backface-visibility:hidden}
.sr-cell img{width:88%;height:88%;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.55))}
.sr-glass{position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:6px;background:linear-gradient(180deg,rgba(4,6,12,.6) 0%,rgba(4,6,12,0) 18%,rgba(255,255,255,.14) 49%,rgba(4,6,12,0) 82%,rgba(4,6,12,.6) 100%)}
.sr-payline{position:absolute;left:0;right:0;height:3px;transform:translateY(-50%);z-index:5;pointer-events:none;background:linear-gradient(90deg,rgba(255,40,50,0),rgba(255,40,50,.95) 12%,rgba(255,140,140,1) 50%,rgba(255,40,50,.95) 88%,rgba(255,40,50,0));box-shadow:0 0 10px 1px rgba(255,40,50,.85),0 0 22px 3px rgba(255,40,50,.5)}
.sr-col.sr-spin .sr-strip{animation:sr-drum .19s linear infinite}
@keyframes sr-drum{0%{transform:translateY(-7%)}100%{transform:translateY(7%)}}
.sr-col.sr-spin .sr-cell img{animation:sr-blur .07s linear infinite}
@keyframes sr-blur{0%{transform:translateY(-82%);filter:blur(1.9px) brightness(1.04)}100%{transform:translateY(82%);filter:blur(1.9px) brightness(1.04)}}
@media (prefers-reduced-motion: reduce){.sr-col.sr-spin .sr-strip,.sr-col.sr-spin .sr-cell img{animation:none}}
`;

export default SlotReels;
