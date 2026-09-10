"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "../lib/types";

const MIN_YEAR = 1931;
const MAX_YEAR = 2010;
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDisplay(iso: string, lang: Lang) {
  const parsed = parseIso(iso);
  if (!parsed) return "";
  if (lang === "ja") return `${parsed.year}年${parsed.month}月${parsed.day}日`;
  return `${MONTHS_EN[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

export function CalendarDateField({
  lang, label, required, value, onChange, placeholder = "Placeholder",
}: {
  lang: Lang; label: string; required?: boolean; value: string; onChange: (iso: string) => void; placeholder?: string;
}) {
  const parsed = parseIso(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? 1990);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? 1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, parsed?.year, parsed?.month]);

  const weekdays = lang === "ja" ? WEEKDAYS_JA : WEEKDAYS_EN;
  const years = useMemo(() => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i), []);
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const dim = daysInMonth(viewYear, viewMonth);
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const canPrev = viewYear > MIN_YEAR || viewMonth > 1;
  const canNext = viewYear < MAX_YEAR || viewMonth < 12;

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, d.getFullYear()));
    setViewYear(y);
    setViewMonth(y === d.getFullYear() ? d.getMonth() + 1 : y === MAX_YEAR ? 12 : 1);
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">
        {label}{required && <span className="ml-0.5 text-[#D10005]">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-left text-[13px] outline-none"
        style={{ borderColor: open ? "#2dd4bf" : "#e5e8ec" }}
      >
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        </span>
        <span className={value ? "text-[#1d2129]" : "text-[#bbbec4]"}>{value ? formatDisplay(value, lang) : placeholder}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-[#e5e8ec] bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.12)]">
          <div className="mb-3 flex items-center gap-1.5">
            <button type="button" disabled={!canPrev} onClick={() => shiftMonth(-1)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e5e8ec] text-[#334155] disabled:opacity-30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <div className="relative min-w-0 flex-1">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="h-8 w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white pl-2.5 pr-6 text-[12px] font-semibold text-[#1d2129] outline-none"
              >
                {MONTHS_EN.map((m, i) => <option key={m} value={i + 1}>{lang === "ja" ? `${i + 1}月` : m}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
            <div className="relative min-w-0 flex-1">
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="h-8 w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white pl-2.5 pr-6 text-[12px] font-semibold text-[#1d2129] outline-none"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
            <button type="button" disabled={!canNext} onClick={() => shiftMonth(1)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e5e8ec] text-[#334155] disabled:opacity-30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#64748b]">
            {weekdays.map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="h-8" />;
              const selected = parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(`${viewYear}-${pad(viewMonth)}-${pad(day)}`);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-8 min-w-8 items-center justify-center px-1.5 text-[13px] ${
                    selected ? "rounded-full border border-[#1e293b] font-semibold text-[#1e293b]" : "text-[#334155]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
