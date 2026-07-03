"use client";

import { type Dispatch, Fragment, type SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { APP_VERSION } from "./version";

const NotifNavContext = createContext<() => void>(() => {});

/* ════════════════════════════════════════════════════════════════════
   PRIZE HISTORY — POC
   Light "Oripa" theme. Three categories shown as tabs:
     1. Prizes Won      (selectable → exchange to coins / request shipping)
     2. Waiting to Ship
     3. Shipped
   Bilingual: EN / 日本語 toggle in the header.
   Rules baked in:
     - Won prizes auto-convert to coins after a 7-day shipping window
     - Shipping request needs selected prizes totalling >= 1,500 coins
     - Delivery within 14 business days of the request
═══════════════════════════════════════════════════════════════════════ */

/* Fixed reference "now" so SSR and client render identically. */
const NOW = Date.UTC(2025, 11, 12, 9, 30); // 2025-12-12 09:30 UTC
const DAY = 24 * 60 * 60 * 1000;
const SHIP_WINDOW_DAYS = 7;
const SHIP_MIN_COINS = 1500;

type Rarity = "UR" | "SR" | "N";
type Lang = "en" | "ja";

type Category = "pokemon" | "onepiece" | "baseball" | "football";
const CATEGORIES: Category[] = ["pokemon", "onepiece", "baseball", "football"];

type WonPrize = {
  id: string;
  name: string;
  nameJa: string;
  desc: string;
  descJa: string;
  rarity: Rarity;
  coinValue: number;
  wonAt: number;
  category?: Category;
};

type WaitingPrize = {
  id: string;
  name: string;
  nameJa: string;
  desc: string;
  descJa: string;
  rarity: Rarity;
  coinValue: number;
  requestedAt: number;
};

type ShippedPrize = {
  id: string;
  name: string;
  nameJa: string;
  desc: string;
  descJa: string;
  rarity: Rarity;
  coinValue: number;
  requestedAt: number;
  tracking: string;
};

const INITIAL_WON: WonPrize[] = [
  // Pokémon
  { id: "w1", name: "Pokémon — Charizard UR", nameJa: "ポケモン — リザードン UR", desc: "Holographic 1st edition", descJa: "ホログラフィック 初版", rarity: "UR", coinValue: 50000, wonAt: NOW - 1 * DAY - 3 * 60 * 60 * 1000, category: "pokemon" },
  { id: "w2", name: "Pokémon — Pikachu SR", nameJa: "ポケモン — ピカチュウ SR", desc: "Foil promo card", descJa: "フォイルプロモ", rarity: "SR", coinValue: 5000, wonAt: NOW - 2 * DAY, category: "pokemon" },
  { id: "w3", name: "Pokémon — Eevee", nameJa: "ポケモン — イーブイ", desc: "Standard pull", descJa: "通常排出", rarity: "N", coinValue: 500, wonAt: NOW - 6 * DAY - 4 * 60 * 60 * 1000, category: "pokemon" },
  // One Piece
  { id: "w4", name: "One Piece — Luffy Gear 5 UR", nameJa: "ワンピース — ルフィ ギア5 UR", desc: "Special parallel", descJa: "スペシャルパラレル", rarity: "UR", coinValue: 50000, wonAt: NOW - 2 * DAY - 5 * 60 * 60 * 1000, category: "onepiece" },
  { id: "w5", name: "One Piece — Zoro SR", nameJa: "ワンピース — ゾロ SR", desc: "Foil edition", descJa: "フォイル版", rarity: "SR", coinValue: 5000, wonAt: NOW - 5 * DAY, category: "onepiece" },
  { id: "w6", name: "One Piece — Chopper", nameJa: "ワンピース — チョッパー", desc: "Standard card", descJa: "通常カード", rarity: "N", coinValue: 500, wonAt: NOW - 3 * DAY, category: "onepiece" },
  // Baseball
  { id: "w7", name: "Baseball — Ohtani Signature SR", nameJa: "野球 — 大谷 サイン SR", desc: "Autograph relic", descJa: "直筆サイン", rarity: "SR", coinValue: 5000, wonAt: NOW - 4 * DAY, category: "baseball" },
  { id: "w8", name: "Baseball — Rookie Card", nameJa: "野球 — ルーキーカード", desc: "Standard rookie", descJa: "通常ルーキー", rarity: "N", coinValue: 500, wonAt: NOW - 7 * DAY, category: "baseball" },
  // Football
  { id: "w9", name: "Football — Messi Icon UR", nameJa: "サッカー — メッシ アイコン UR", desc: "Limited gold", descJa: "限定ゴールド", rarity: "UR", coinValue: 50000, wonAt: NOW - 3 * DAY - 2 * 60 * 60 * 1000, category: "football" },
  { id: "w10", name: "Football — Team Sticker", nameJa: "サッカー — チームステッカー", desc: "Collectible sticker", descJa: "コレクタブルステッカー", rarity: "N", coinValue: 300, wonAt: NOW - 3 * DAY, category: "football" },
];

const INITIAL_WAITING: WaitingPrize[] = [
  { id: "p1", name: "Premium Figure — Deluxe", nameJa: "プレミアムフィギュア デラックス", desc: "1/7 scale figure", descJa: "1/7スケールフィギュア", rarity: "UR", coinValue: 18000, requestedAt: NOW - 2 * DAY },
  { id: "p2", name: "Signed Poster Set", nameJa: "サイン入りポスターセット", desc: "Numbered edition", descJa: "ナンバリング版", rarity: "SR", coinValue: 3000, requestedAt: NOW - 4 * DAY },
];

const INITIAL_SHIPPED: ShippedPrize[] = [
  { id: "s1", name: "Collector Card Case", nameJa: "コレクターカードケース", desc: "Hard shell case", descJa: "ハードシェルケース", rarity: "SR", coinValue: 2500, requestedAt: NOW - 20 * DAY, tracking: "JP1234567890" },
  { id: "s2", name: "Anniversary Tote Bag", nameJa: "記念トートバッグ", desc: "Canvas, limited run", descJa: "キャンバス地・限定生産", rarity: "N", coinValue: 1500, requestedAt: NOW - 26 * DAY, tracking: "JP9876543210" },
];

const RARITY_META: Record<Rarity, { coin: number; name: string; nameJa: string; desc: string; descJa: string }> = {
  UR: { coin: 50000, name: "[1BOX] Shiny Treasure", nameJa: "【1BOX】シャイニートレジャー", desc: "Holographic UR card", descJa: "ホログラフィック URカード" },
  SR: { coin: 5000, name: "[1BOX] Shiny Treasure", nameJa: "【1BOX】シャイニートレジャー", desc: "Special gold edition", descJa: "スペシャルゴールド版" },
  N: { coin: 500, name: "[1BOX] Shiny Treasure", nameJa: "【1BOX】シャイニートレジャー", desc: "Standard pull", descJa: "通常排出" },
};

/* Weighted rarity roll — UR (1st prize) has the lowest chance, N (3rd) the highest. */
function rollRarity(): Rarity {
  const r = Math.random();
  if (r < 0.03) return "UR";
  if (r < 0.25) return "SR";
  return "N";
}

function generateDraw(count: number): WonPrize[] {
  const out: WonPrize[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity();
    const meta = RARITY_META[rarity];
    out.push({
      id: `d${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      name: meta.name, nameJa: meta.nameJa, desc: meta.desc, descJa: meta.descJa,
      rarity, coinValue: meta.coin, wonAt: NOW - i * 60 * 1000,
    });
  }
  return out;
}

type SortKey = "coinDesc" | "coinAsc" | "wonNew" | "wonOld" | "expSoon";
const SORT_KEYS: SortKey[] = ["coinDesc", "coinAsc", "wonNew", "wonOld", "expSoon"];

type PointPackage = { id: string; coins: number; freePoints: number; jpy: number; inrApprox: number; originalJpy?: number; firstTimeOffer?: boolean; popularOffer?: boolean; discount?: number; subscriptionName?: string };
const SPECIAL_OFFERS: PointPackage[] = [
  { id: "so1", coins: 5000, freePoints: 500,   jpy: 500,   inrApprox: 306.64,   firstTimeOffer: true, discount: 90 },
  { id: "so2", coins: 5000, freePoints: 500,   jpy: 500,   inrApprox: 306.64,   firstTimeOffer: true },
];
const POINT_PACKAGES: PointPackage[] = [
  { id: "pp25000", coins: 25000, freePoints: 25000, jpy: 25000, inrApprox: 15332.20, originalJpy: 30000, firstTimeOffer: true, discount: 90 },
  { id: "pp20000", coins: 20000, freePoints: 20000, jpy: 20000, inrApprox: 12265.76, originalJpy: 30000, popularOffer: true, discount: 66 },
  { id: "pp500",   coins: 500,   freePoints: 500,   jpy: 500,   inrApprox: 306.64 },
  { id: "pp1000",  coins: 1000,  freePoints: 1000,  jpy: 1000,  inrApprox: 613.29 },
  { id: "pp5000",  coins: 5000,  freePoints: 5000,  jpy: 5000,  inrApprox: 3066.44 },
  { id: "pp10000", coins: 10000, freePoints: 10000, jpy: 10000, inrApprox: 6132.88 },
];

const FIRST_TIME_OFFER: PointPackage = { id: "fto1", coins: 500, freePoints: 50, jpy: 500, inrApprox: 306.64, originalJpy: 1000, firstTimeOffer: true, discount: 90 };

type LimitedBundle = { id: string; name: string; coins: number; freePoints: number; jpy: number; originalJpy: number; remaining: number; total: number; discount: number; hot?: boolean };
const LIMITED_BUNDLES: LimitedBundle[] = [
  { id: "lb1", name: "Starter Pack",  coins: 3000,  freePoints: 800,   jpy: 1200,  originalJpy: 2400,  remaining: 23, total: 50, discount: 50, hot: true },
  { id: "lb2", name: "Power Pack",    coins: 8000,  freePoints: 2000,  jpy: 4000,  originalJpy: 8000,  remaining: 8,  total: 30, discount: 50 },
  { id: "lb3", name: "Whale Pack",    coins: 20000, freePoints: 6000,  jpy: 6000,  originalJpy: 12000, remaining: 5,  total: 20, discount: 50 },
  { id: "lb4", name: "Elite Pack",    coins: 15000, freePoints: 4000,  jpy: 9000,  originalJpy: 18000, remaining: 12, total: 25, discount: 50 },
  { id: "lb5", name: "Mega Pack",     coins: 50000, freePoints: 15000, jpy: 24000, originalJpy: 48000, remaining: 3,  total: 10, discount: 50 },
];

type DealPackage = { id: string; coins: number; freePoints: number; jpy: number; originalJpy: number; remaining: number; total: number; discount: number; timerSeconds: number; color: string; label: string };
const DEAL_PACKAGES: DealPackage[] = [
  { id: "dp1", coins: 6000, freePoints: 1000, jpy: 2990, originalJpy: 5980, remaining: 23, total: 50, discount: 50, timerSeconds: 6407,  color: "#e60012", label: "Selling Fast" },
  { id: "dp2", coins: 3000, freePoints: 500,  jpy: 2090, originalJpy: 2990, remaining: 11, total: 30, discount: 30, timerSeconds: 9823,  color: "#f97316", label: "Booster Pack" },
  { id: "dp3", coins: 5000, freePoints: 800,  jpy: 4000, originalJpy: 5000, remaining: 8,  total: 20, discount: 20, timerSeconds: 14400, color: "#7c3aed", label: "Weekend Special" },
];

type MegaBundle = { id: string; coins: number; freePoints: number; jpy: number; originalJpy: number; discount?: number; badge: "premium" | "bestValue" | "mega"; benefits: [string, string] };
const MEGA_BUNDLES: MegaBundle[] = [
  { id: "mb1", coins: 50000,  freePoints: 5000,  jpy: 4980,  originalJpy: 9960,  badge: "premium",   benefits: ["drawTicket",     "exclusivePack"] },
  { id: "mb2", coins: 120000, freePoints: 15000, jpy: 9980,  originalJpy: 19960, discount: 50, badge: "bestValue", benefits: ["rateBoost",      "jackpotTicket"] },
  { id: "mb3", coins: 350000, freePoints: 50000, jpy: 24980, originalJpy: 49960, discount: 50, badge: "mega",      benefits: ["jackpotTicketX3","exclusivePack"] },
];

type Address = {
  id: string;
  name: string;
  line: string;
  city: string;
  phone: string;
  countryCode?: string;
  nameJa?: string;
  lineJa?: string;
  cityJa?: string;
};
const SAVED_ADDRESSES: Address[] = [
  { id: "a1", name: "Taro Yamada", nameJa: "山田 太郎", line: "1-2-3 Shibuya, Shibuya-ku", lineJa: "渋谷区渋谷1-2-3", city: "Tokyo 150-0002", cityJa: "東京都 150-0002", phone: "080-1234-5678", countryCode: "JP" },
  { id: "a2", name: "Taro Yamada (Office)", nameJa: "山田 太郎（会社）", line: "4-5-6 Umeda, Kita-ku", lineJa: "北区梅田4-5-6", city: "Osaka 530-0001", cityJa: "大阪府 530-0001", phone: "080-8765-4321", countryCode: "JP" },
];

const COUNTRIES: { code: string; en: string; ja: string }[] = [
  { code: "JP", en: "Japan", ja: "日本" },
  { code: "US", en: "United States", ja: "アメリカ合衆国" },
  { code: "GB", en: "United Kingdom", ja: "イギリス" },
  { code: "AU", en: "Australia", ja: "オーストラリア" },
];
function countryLabel(code: string | undefined, lang: Lang) {
  if (!code) return "";
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? (lang === "ja" ? c.ja : c.en) : code;
}

type AddressCandidate = { name: string; nameJa: string; line: string; lineJa: string; city: string; cityJa: string };

type CountryAddressPool = {
  names: { en: string; ja?: string }[];
  streets: { en: string; ja?: string }[];
  cities: { en: string; ja?: string }[];
};
const ADDRESS_POOL: Record<string, CountryAddressPool> = {
  JP: {
    names: [
      { en: "Taro Yamada", ja: "山田 太郎" },
      { en: "Hanako Sato", ja: "佐藤 花子" },
      { en: "Ken Tanaka", ja: "田中 健" },
      { en: "Yuki Suzuki", ja: "鈴木 由紀" },
    ],
    streets: [
      { en: "1-2-3 Shibuya, Shibuya-ku", ja: "渋谷区渋谷1-2-3" },
      { en: "2-21-1 Shibuya, Shibuya-ku", ja: "渋谷区渋谷2-21-1" },
      { en: "4-5-6 Umeda, Kita-ku", ja: "北区梅田4-5-6" },
      { en: "1-1 Chiyoda, Chiyoda-ku", ja: "千代田区千代田1-1" },
      { en: "3-15-2 Ginza, Chuo-ku", ja: "中央区銀座3-15-2" },
      { en: "5-1-1 Nishi-Shinjuku", ja: "新宿区西新宿5-1-1" },
      { en: "2-8-1 Roppongi, Minato-ku", ja: "港区六本木2-8-1" },
      { en: "1-9-3 Akihabara, Taito-ku", ja: "台東区秋葉原1-9-3" },
      { en: "3-1-1 Marunouchi, Chiyoda-ku", ja: "千代田区丸の内3-1-1" },
      { en: "4-22-7 Nakameguro, Meguro-ku", ja: "目黒区中目黒4-22-7" },
    ],
    cities: [
      { en: "Tokyo", ja: "東京都" },
      { en: "Osaka", ja: "大阪府" },
      { en: "Kyoto", ja: "京都府" },
    ],
  },
  US: {
    names: [
      { en: "John Smith" },
      { en: "Emily Johnson" },
      { en: "Michael Brown" },
      { en: "Sarah Davis" },
    ],
    streets: [
      { en: "123 Main St" },
      { en: "456 Oak Ave" },
      { en: "789 Maple Dr" },
      { en: "12 Park Blvd" },
      { en: "350 5th Ave" },
      { en: "1600 Market St" },
      { en: "88 Sunset Blvd" },
      { en: "240 Elm St" },
      { en: "57 Lakeview Rd" },
      { en: "910 Pine St" },
    ],
    cities: [
      { en: "New York, NY" },
      { en: "Los Angeles, CA" },
      { en: "Chicago, IL" },
    ],
  },
  GB: {
    names: [
      { en: "Oliver Wilson" },
      { en: "Amelia Taylor" },
      { en: "Harry Evans" },
      { en: "Charlotte Clarke" },
    ],
    streets: [
      { en: "10 Downing St" },
      { en: "221B Baker St" },
      { en: "34 King's Rd" },
      { en: "5 Abbey Rd" },
      { en: "78 Oxford St" },
      { en: "12 Church Ln" },
      { en: "9 Victoria St" },
      { en: "44 High St" },
      { en: "17 Queensway" },
      { en: "63 Camden Rd" },
    ],
    cities: [
      { en: "London" },
      { en: "Manchester" },
      { en: "Bristol" },
    ],
  },
  AU: {
    names: [
      { en: "Jack Williams" },
      { en: "Olivia Jones" },
      { en: "Noah Martin" },
      { en: "Mia Thompson" },
    ],
    streets: [
      { en: "42 George St" },
      { en: "8 Bourke St" },
      { en: "15 Collins St" },
      { en: "200 Queen St" },
      { en: "9 Pitt St" },
      { en: "55 Flinders St" },
      { en: "23 Elizabeth St" },
      { en: "77 Adelaide St" },
      { en: "31 William St" },
      { en: "150 Bondi Rd" },
    ],
    cities: [
      { en: "Sydney NSW" },
      { en: "Melbourne VIC" },
      { en: "Brisbane QLD" },
    ],
  },
};
// Generate a few plausible address suggestions for the selected country, seeded by
// the partial postcode so the list stays stable as the user keeps typing.
function generateAddresses(country: string, postcode: string): AddressCandidate[] {
  const pool = ADDRESS_POOL[country] ?? ADDRESS_POOL.JP;
  const digits = postcode.replace(/\D/g, "");
  const seed = digits.length ? parseInt(digits.slice(0, 4), 10) : postcode.length;
  const pc = postcode.trim();
  return Array.from({ length: pool.streets.length }, (_, i) => {
    const n = pool.names[(seed + i) % pool.names.length];
    const s = pool.streets[(seed + i) % pool.streets.length];
    const c = pool.cities[(seed + i * 2) % pool.cities.length];
    return {
      name: n.en,
      nameJa: n.ja ?? n.en,
      line: s.en,
      lineJa: s.ja ?? s.en,
      city: pc ? `${c.en} ${pc}` : c.en,
      cityJa: pc ? `${c.ja ?? c.en} ${pc}` : c.ja ?? c.en,
    };
  });
}

/* ── i18n strings ────────────────────────────────────────────────────── */
const EN = {
  langLabel: "EN",
  prizeHistory: "Prize History",
  tabWon: "Prizes Won",
  tabWaiting: "Waiting to Ship",
  tabShipped: "Shipped",
  simulateExpiry: "Simulate expiry",
  wonAt: (d: string) => `Won ${d}`,
  shipBy: (d: string, e: string) => `Ship by ${d} · ${e}`,
  expired: "Expired",
  hLeft: (h: number) => `${h}h left`,
  dLeft: (d: number) => `${d}d left`,
  wonFooter: "Prizes not requested for shipping within 7 days are automatically converted to Oripa Coins.",
  wonEmptyTitle: "No prizes to action",
  wonEmptySub: "Prizes you win will appear here.",
  selected: "Selected",
  selOff: "Unselected",
  deckAll: "All",
  deckSwipeLeft: "Ship",
  deckSwipeRight: "Exchange",
  deckSwipeDown: "Skip for now",
  deckHint: "Swipe ← ship · → exchange · ↓ skip for now",
  deckBulkOn: "Bulk mode: one swipe moves every card shown",
  deckSorted: "Sorted prizes",
  deckEmpty: "All sorted!",
  deckEmptySub: "No prizes left in this view.",
  prizeTier: (n: number) => (["", "Ultra", "Gold", "Silver"][n] ?? `No.${n} prize`),
  deckCategoryAll: "All categories",
  cardCategory: (c: Category) => ({ pokemon: "Pokémon", onepiece: "One Piece", baseball: "Baseball", football: "Football" }[c]),
  searchOption: "Search…",
  searchPlaceholder: "Type to filter cards…",
  searchNoResults: "No cards match your search.",
  lobbySearchPlaceholder: "Search draws & cards…",
  lobbySearchResults: "Search results",
  lobbySearchEmpty: "No draws match your search.",
  selectAll: "Select all",
  reset: "Reset",
  viewAll: "List view",
  viewAllTitle: (n: number) => `All cards · ${n}`,
  exchange: "Exchange to Coins",
  requestShipping: "Request Shipping",
  helperNone: "Select prizes to exchange or request shipping.",
  helperReady: "Shipping is free · delivery within 14 business days.",
  helperShort: (n: number) => `Select ${n.toLocaleString()} more coins of prizes to request shipping (min ${SHIP_MIN_COINS.toLocaleString()}).`,
  toastSelectFirst: "Select one or more prizes first",
  toastShort: (n: number) => `Select ${n.toLocaleString()} more coins of prizes to request shipping (min ${SHIP_MIN_COINS.toLocaleString()})`,
  sortTitle: "Sort prizes",
  sortLabels: {
    coinDesc: "Coin value: high → low",
    coinAsc: "Coin value: low → high",
    wonNew: "Win date: newest first",
    wonOld: "Win date: oldest first",
    expSoon: "Expiration: soonest first",
  } as Record<SortKey, string>,
  convertTitle: "Exchange to Oripa Coins",
  convertQuestion: (n: number, c: number) => `Exchange ${n} prize${n > 1 ? "s" : ""} for ${c.toLocaleString()} coins?`,
  cantUndo: "This can't be undone.",
  cancel: "Cancel",
  exchangeBtn: "Exchange",
  silverBulkTitle: "Silver cards bundled",
  silverBulkBody: (n: number, c: number) => `We selected all ${n} Silver card${n > 1 ? "s" : ""} for you — exchange them together for ${c.toLocaleString()} coins.`,
  silverBulkCta: "Exchange for coins",
  silverBulkPick: "Choose individually",
  toastConverted: (n: number, c: number) => `${n} prize${n > 1 ? "s" : ""} exchanged for ${c.toLocaleString()} coins`,
  chooseAddress: "Choose shipping address",
  addNewAddress: "+ Add new address",
  continueBtn: "Continue",
  addNewTitle: "Add new address",
  country: "Country",
  postcode: "Postcode",
  postcodeHint: "Start typing your postcode to see suggestions",
  searching: "Searching addresses…",
  enterManually: "Enter address manually",
  selectAddress: "Select your address",
  phName: "Full name",
  phLine: "Street address",
  phCity: "City / postal code",
  phPhone: "Phone number",
  back: "Back",
  saveAddress: "Save address",
  confirmTitle: "Confirm shipping request",
  deliverTo: "Deliver to",
  prizesCount: (n: number) => `${n} prize${n > 1 ? "s" : ""}`,
  totalValue: "Total value",
  freeShip: "Free shipping · delivery within 14 business days.",
  requestShippingBtn: "Request Shipping",
  toastShipReq: "Shipping requested · delivery within 14 business days",
  requested: (d: string) => `Requested ${d}`,
  preparing: "Preparing shipment",
  waitingFooter: "Delivery within 14 business days from the request date.",
  waitingEmptyTitle: "Nothing waiting to ship",
  waitingEmptySub: "Prizes you request for shipping appear here.",
  tracking: "Tracking",
  copyAria: "Copy tracking code",
  toastCopied: (code: string) => `Tracking ${code} copied`,
  shippedEmptyTitle: "No shipped prizes yet",
  shippedEmptySub: "Delivered prizes are kept here for your records.",
  toastNoExpired: "No prizes past their 7-day window",
  toastAutoConverted: (n: number, total: number) => `${n} expired prize${n > 1 ? "s" : ""} auto-converted (+${total.toLocaleString()})`,
  backAria: "Back",
  notificationsAria: "Notifications",
  addCoinsAria: "Add coins",
  menuAria: "Open menu",
  menuTitle: "Menu",
  menuHome: "Home",
  navOripa: "Oripa",
  navItems: "Items won",
  navPrizeHistory: "Prize history",
  navQuest: "Quests",
  navMyPage: "My Account",
  comingSoon: "Coming soon",
  welcomeTitle: "Welcome to Oripa!",
  welcomeSub: "Claim your free coins now",
  welcomeCta: "Claim",
  welcomeVoice: "オリパへようこそ！",
  dailyTitle: "Daily Rewards",
  dailySub: "Log in every day to claim free coins!",
  dailyDay: (n: number) => `Day ${n}`,
  dailyToday: "Today",
  dailyClaim: (n: number) => `Claim ${n.toLocaleString()} coins`,
  dailyClaimShort: "Claim",
  dailyClaimed: "Claimed",
  dailyLocked: "Locked",
  dailyClaimedToast: (n: number) => `+${n.toLocaleString()} coins claimed!`,
  dailyComeBack: "Come back tomorrow for more!",
  dailyDone: "Done",
  dailyUltimate: "7-Day Login Bonus",
  dailyFreePt: "Free Pt",
  dailyTapClaim: "Tap to claim",
  dailyTapHint: "Tap Day 1 to claim your free coins",
  firstDrawTitle: "Time for your first draw!",
  firstDrawSub: "Your free coins are ready — pick the number of cards to draw and reveal your first prize!",
  firstDrawCta: "Draw now",
  firstDrawSkip: "Maybe later",
  firstDrawSelect: "Now select your draw",
  itemsTabNotSelected: "Not selected",
  itemsTabPending: "Pending",
  itemsTabShipped: "Shipped",
  itemsSortLabel: "Sort by highest coin value",
  itemsNotSelected: "Not selected",
  itemsSelected: "Selected",
  itemsExchangePeriod: "Exchange period:",
  itemsSelectAll: "Select All",
  itemsReset: "Reset",
  itemsExchangeForCoins: "Exchange for coins",
  itemsRequestDelivery: "Request Delivery",
  itemsDeliveryNote: "To request shipping, you must select items totaling 500 coins or more.",
  itemsName: "[1BOX] SHINY TREASURE",
  itemsDesc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.",
  accountName: "Taro Yamada",
  accountTier: "Member",
  menuAddresses: "Shipping addresses",
  menuPayment: "Payment methods",
  menuSettings: "Settings",
  menuLogout: "Log out",
  notifBar: "Notice: your points are expiring soon!",
  notifTabYou: "Notifications for You",
  notifTabNotice: "Announcements",
  notifEmpty: "No notifications",
  notifNew: "New",
  promoBanner: "PROMO BANNER",
  rewardHeadline: "Unlock special rewards!",
  rwDaily: "Daily",
  rwQuest: "Quest",
  rwInvite: "Invite",
  rwBox: "Daily Box",
  rwFirst: "First bonus",
  heroPts: (a: number, b: number) => `${a}/${b} pt`,
  heroDraw: "Oripa Draw",
  qmTitle: "MATSURI QUEST",
  qmUltimate: "ULTIMATE REWARD",
  qmMaxPrize: "MAX PRIZE",
  qmUrCard: "UR CARD",
  qmTask1: "Play 3 Pokémon draws",
  qmR1: "1 Free Draw",
  qmR2: "500 Coins",
  qmR3: "50 Free Pt",
  qmGetCoins: "Get Coins",
  coBadge: "Chain Offer",
  coTitle: "CHAIN OFFER",
  coSubtitle: "Each purchase unlocks the next step — bigger bonus every time.",
  coStep: (n: number) => `STEP ${n}`,
  coStep1: "Starter Reload",
  coStep2: "Value Pack",
  coStep3: "Mega Bundle",
  coBonus: (p: string) => `${p} BONUS`,
  coBuy: "Buy",
  coLocked: "Complete the previous step to unlock",
  coClaimed: "Purchased",
  coAllDone: "All steps claimed — enjoy!",
  coToast: (n: number) => `${n.toLocaleString()} coins added`,
  coEndsIn: "Ends in",
  catAll: "All",
  catNew: "New",
  catPopular: "Hot",
  catPokemon: "Pokemon",
  catLimited: "Limited",
  catOther: "Others",
  secRecommended: "Recommended Oripa",
  secList: "Oripa List",
  secNew: "New Arrivals",
  secJustAdded: "Just Added",
  secHot: "Hot Right Now",
  secTrending: "Trending Now",
  secPokemon: "Pokémon Featured",
  secPokemonClassic: "Pokémon Classics",
  secLimited: "Limited Time",
  secLastChance: "Last Chance",
  secOther: "Other Picks",
  tagPopular: "Popular",
  tagPokemon: "Pokémon",
  tagLv5: "LV5 only",
  tagSsr: "SSR guaranteed",
  periodLabel: (d: string) => `Open until ${d} (info area)`,
  perDraw: "/draw",
  endsIn: (m: number) => `Ends in ${m} min`,
  remainingLabel: "Remaining",
  remainingTimeLabel: "Remaining time",
  minUnit: (m: number) => `${m}min`,
  btn1Draw: "Draw ×1",
  btnDraw: "Draw",
  btnFree: "Free draw",
  btnView: "View",
  promo1: "PROMO BANNER 1 (e.g. LINE campaign / beginner guide)",
  promo2: "PROMO BANNER 2 (e.g. LINE campaign / beginner guide)",
  ftAbout: "About Oripalot",
  ftCategories: "Oripa Categories",
  ftFollow: "Follow us",
  ftCopyright: "© 2026 oripalot.com All rights reserved.",
  ftBlurb: "Oripalot (oripalot.com) lets you enjoy our social games for free anytime. Purchases are not required. Void where prohibited by law. T&Cs apply.",
  ftLinks: ["About Oripalot", "Customer support", "T&Cs", "Campaign terms", "Responsible play", "Privacy policy"],
  ftCats: ["Latest", "Trending", "Pokémon TCG", "Limited", "Other", "All"],
  ftSupport: "24/7 online support: Contact us",
  homeBannerTitle: "10,000 bonus coins",
  homeBannerSub: "First purchase campaign",
  homeFeatured: "Featured Oripa",
  draw1: "Draw ×1",
  draw10: "Draw ×10",
  remaining: (n: number) => `${n} left`,
  soldOut: "Sold out",
  homeFooter: "© Oripa Lot — demo",
  giBack: "Top",
  giPeriod: "Recruitment period: 2026/01/01 (limited time left)",
  giCardsLeft: (n: number) => `${n} cards until the prize`,
  giNotice: "Notes & usage guide",
  giNoticeBody: "Once a prize is drawn it cannot be drawn again. Prizes of 2nd place or higher are added to your Prize History.",
  gi1st: "1st Prize",
  gi2nd: "2nd Prize",
  gi3rd: "3rd Prize",
  giContents: "Prize line-up",
  giDrawn: "Drawn",
  giAvailable: "Available",
  giItem: "Item",
  giPrizeName: "Charizard ex",
  giDraw1: "Draw ×1",
  giDraw10: "Draw ×10",
  giDraw100: "Draw ×100",
  giDrawsLabel: "draws",
  giDrawCta: (n: number) => `Draw ×${n}`,
  giHaulNote: (n: number) => `Estimated prizes for ×${n} draws`,
  giBoostTitle: "Apply ×10 booster?",
  giBoostDesc: (n: number) => `Multiply your ${n} ${n === 1 ? "draw" : "draws"} by 10 — get ${n * 10} cards instead of ${n}!`,
  giBoostApply: (fee: number) => `Apply ×10 booster (+${fee.toLocaleString()})`,
  giBoostSkip: (n: number) => `No thanks, draw ×${n}`,
  giBoostBadge: "BEST VALUE",
  giBoostFeeNote: (fee: number) => `Only +${fee.toLocaleString()} coins for 10× the cards`,
  giModalTitle: "Gacha title",
  giModalDesc: "Gacha details! Gacha details! Gacha details! Gacha details! Gacha details! Gacha details!",
  giTnc: "T&Cs",
  giTncLink: "Here",
  giCancel: "Cancel",
  giTncTitle: "Terms & Conditions",
  giTncBody: [
    "1. Eligibility — You must hold a valid account and have sufficient Oripa Coins to participate in a draw. Coins are deducted at the moment the draw is confirmed.",
    "2. Draws are final — Once a draw is confirmed, the spent coins are non-refundable and the result cannot be cancelled, exchanged, or reversed.",
    "3. Prizes — Each prize is awarded as displayed. Prizes of 2nd place or higher are added to your Prize History and may be exchanged for coins or requested for shipping.",
    "4. Expiry — Prizes that are not requested for shipping within 7 days are automatically converted into Oripa Coins at their listed value.",
    "5. Shipping — Shipping requests require a minimum total of 1,500 coins of selected prizes. Delivery is made within 14 business days of a valid request.",
    "6. Odds — Rarity is determined randomly. Higher-tier prizes (1st prize) have a lower probability of being drawn.",
    "7. Fair use — Any fraudulent activity, abuse, or exploitation of bugs may result in suspension of your account and forfeiture of prizes.",
    "8. Changes — These terms may be updated at any time. Continued use of the service constitutes acceptance of the latest terms.",
  ],
  gachaResultTitle: "Gacha result",
  mpEditProfile: "Edit profile",
  mpId: "ID",
  mpOripaCoin: "Oripa Coin",
  mpFreePoint: "Free Point",
  mpCoinExpiry: "Your coins expire in 3 days!",
  mpViewDetails: "View details",
  mpCurrentRank: "Current rank",
  mpRankBronze: "Bronze",
  mpNextLevel: "to next level",
  mpRankPerks: "View ranking",
  mpRankingTitle: "Ranking",
  mpRankingSubtitle: "This month's top players",
  mpRankingYou: "You",
  mpRankingPts: (n: number) => `${n.toLocaleString()} pt`,
  mpMyMenu: "My Menu",
  mmQuest: "Quest",
  mmItems: "Items won",
  mmPrizeHistory: "Prize history",
  mmPurchases: "Purchase history",
  mmInvite: "Refer a Friend",
  mmFaq: "FAQ",
  mmContact: "Contact",
  mmNotices: "Notices",
  mmShippingAddress: "Shipping Address",
  mmSubscriptions: "Subscriptions",
  cancelSubscription: "Cancel Subscription",
  cancelSubTitle: "Cancel subscription?",
  cancelSubBody: "You'll lose all Collector's Pass perks at the end of your current period.",
  cancelSubYes: "Yes, cancel",
  cancelSubNo: "Keep plan",
  subCurrentPeriod: "Current period",
  shippingTitle: "Add or Change Shipping Address",
  shippingDesc: "Manage your delivery addresses below. You can add multiple addresses and choose a default.",
  shippingEmpty: "There are no registered delivery addresses.",
  shippingAddNew: "Add a new delivery address",
  shippingConfirmBtn: "Confirm",
  shippingDefaultLabel: "Default",
  shippingSetDefault: "Set as Default",
  shippingFormTitle: "Shipping Address",
  shippingCountry: "Country or Region",
  shippingJapan: "Japan",
  shippingUSA: "United States of America",
  shippingStreetNumber: "Street Number",
  shippingApartment: "Apartment, Room Number",
  shippingCityStreetNumber: "City, Street, Street Number",
  shippingState: "State",
  shippingZipCode: "Zip Code",
  shippingRegister: "Register",
  shippingConfirmTitle: "Address Confirmation",
  shippingConfirmQ: "Would you like to register this address?",
  shippingRegisterBtn: "Register Address",
  shippingCancel: "Cancel",
  shippingDeleteTitle: "Do you want to delete this delivery address?",
  shippingDeleteBtn: "Delete",
  toastShippingAdded: "Added a Shipping Address",
  toastShippingEdited: "Updated Shipping Address",
  toastShippingDeleted: "Deleted Shipping Address",
  mpAccountSection: "Account",
  mpEditAccount: "Account Settings",
  mpOtherSection: "Other",
  mpTerms: "T&Cs",
  mpPrivacy: "Privacy policy",
  mpLegal: "Legal notice (SCTA)",

  rafTitle: "Refer a friend",
  rafHeroTitle: "Earn extra rewards when you unlock milestones! Invite friends now!",
  rafHeroLead: "Get up to ",
  rafHeroCoins: "200,000 gold coins",
  rafHeroAnd: " and ",
  rafHeroPoints: "100 free sweepstakes",
  rafHeroTail: " coins when you refer friends.",
  rafCopy: "Copy",
  rafCopied: "Copied",
  rafShare: "Share Link",
  rafMilestones: "My Milestones",
  rafUnlocked: "Achievement unlocked!",
  rafClaim: "Claim",
  rafLevel: "Level 1",
  rafMyFriends: "My Friends",
  rafInvited: "Invited Friends",
  rafRewardsEarned: "Rewards Earned",
  rafQualified1: "Qualified For level 1",
  rafQualified2: "Qualified For level 2",
  rafFriendBoosts: "Friend Boosts",
  rafBoostDesc: "Remind a friend, unlock perks for them and progress toward your next reward",
  rafSendAll: "Send to All",
  rafFilter: "Filter",
  rafSendBoost: "Send Boost",
  rafSent: "Sent",
  rafLockedBtn: "Not available yet",
  rafFriendName: "Oripa Taro",
  rafFriendId: "ID : XXXXXX",
  rafTagFreeSpin: "+10 FREE SPIN",
  rafTagSpecial: "SPECIAL BOOST",
  rafTagQuests: "QUESTLINES",
  rafTagScSpin: "+10 FREE SC SPINS",
  rafHowItWorks: "How it works",
  rafStep1Title: "Share Your Exclusive Link",
  rafStep1Desc: "Send your exclusive invitation link to your friends.",
  rafStepRewardLead: "Get up to ",
  rafStepRewardCoins: "50,000 Coins",
  rafStepRewardMid: " + ",
  rafStepRewardPoints: "25 Points",
  rafStepRewardBang: "!",
  rafStep2Desc: "Rewards will be granted when the invited friend completes account verification and purchases a cumulative total of $100 or more in coins.",
  rafStep3Desc: "Furthermore, if the friend makes additional purchases reaching a cumulative total of $1,400 or more in coins, additional step-up rewards will be applied.",

  qHeroTitle: "Unlock Special Rewards!",
  qHeroDesc: "Take on the quests! Clear daily missions to earn quest rewards and aim for the ultimate reward!",
  qUltimate: "Ultimate Reward",
  qCoinsSuffix: "COINS",
  qEndsIn: "ENDS IN",
  qMission: "MISSION",
  qMissionTitle: "Win FREE SC 25 on slot games",
  qClaim: "Claim Reward",
  qGo: "Go",
  qRewards: "Rewards",
  qShowDetails: "Show Details",
  qDetailsBody: "Complete this mission by playing eligible slot games. Rewards are credited automatically once the target is reached.",
  qLocked: "Complete previous quests to unlock",

  faqTitle: "FAQ",

  profileTitle: "My Profile",
  profileAccountId: "Account ID",
  profileDisplayName: "Display Name",
  profilePersonalInfo: "Personal Information",
  profileRequired: "Required",
  profileSocialLinks: "Social Connect",
  profileAccountVerifications: "Account Verifications",
  profileIdVerification: "Verification Status",
  profilePaymentMethod: "Payment Method Verification",
  profilePaymentMethodField: "Payment Method",
  profilePaymentBullets: ["Both Front and Back of card must be uploaded.", "Must correspond with credit card number used on site.", "Please ensure that your card number is fully visible when submitting your document. Do not hide or mask any part of the card number, as this may result in verification failure."],
  profileCardNumber: "Card number",
  profileSelectCard: "Select card",
  profileSubmitProof: "Submit Proof of Payment Method",
  profilePendingVerification: "Pending verification",
  profileVerifiedCard: "Verified",
  jumioStartTitle: "Start verification",
  jumioStartDesc: "This process is designed to verify your identity and protect you from identity theft.",
  jumioStartBullets: ["Upload credit card", "Use a valid document", "Ensure that all the details on your document are clear and readable."],
  jumioNext: "Next",
  jumioUploadCardTitle: "Upload credit card",
  jumioUploadCardDesc: "Upload a color image of the whole document. Max. size: 2 images or 10 MB.",
  jumioCaptureImage: "Capture image",
  jumioUploadFile: "Upload file",
  jumioPageUploaded: "1 page uploaded",
  jumioProcessingTitle: "This will take a moment",
  jumioFinishing: "Finishing up...",
  profileSubmit: "Submit",
  profileKycNote: "We use our trusted partner for verification to meet with global KYC standards.",
  profileDocumentUpload: "Document Upload",
  profileDocumentNote: "Please upload the documents requested by our team. You can upload maximum of 15 documents under this section.",
  profileDocumentSelect: "Select Document",
  profileDocumentSubmit: "Submit",
  profileDocumentUploadBtn: "Upload",
  profileDocumentTypes: ["Bank Statement", "Tax Return", "Purchase Agreement", "Sale of an Asset", "Payslips", "Notarized ID", "Others"],
  profileDocumentHistory: "Upload History",
  profileDocumentPending: "UPLOAD PENDING...",
  profileDocumentPendingNote: "Wait until your document will be uploaded.",
  profileDocumentSuccess: "UPLOAD SUCCESSFUL!",
  profileDocumentSuccessNote: "You have successfully uploaded the document.",
  profileDocumentOkay: "Okay",
  profileDocumentApproved: "Approved",
  profileDocumentPendingStatus: "Pending",
  profileDocumentReview: "Review",
  profileChangePassword: "Change Password",
  profileOldPassword: "Old Password",
  profileNewPassword: "New Password",
  profileRepeatPassword: "Repeat New Password",
  profileChangePasswordBtn: "Change Password",
  profileNotifications: "Communication Preferences",
  profileEmailPref: "Email",
  profilePushPref: "Push",
  profileSmsPref: "SMS",
  profileLastName: "Last Name",
  profileFirstName: "First Name",
  profileLastNameKana: "Last Name (Kana)",
  profileFirstNameKana: "First Name (Kana)",
  profileEmail: "Email address",
  profileDob: "Date of Birth",
  profilePhone: "Phone Number",
  profilePostalCode: "Postal Code",
  profilePrefecture: "Prefecture",
  profileCity: "City, Street",
  profileBuilding: "Street Number / Apartment",
  profileSaveNote: "If your personal information changes, please contact Customer Support.",
  profileSave: "Save",
  profileSaved: "Saved!",
  profileStep1: "STEP ONE: ID VERIFICATION",
  profileStep2: "STEP TWO: PROOF OF ADDRESS",
  profileIdCheckDone: "You have successfully verified your ID.",
  profileAddressCheckDone: "You have successfully verified your address.",
  profileVerifNeeded: "Needed",
  profileVerifVerified: "Verified",
  profileStep1Desc: "In order to verify your identity, you need to upload a government-issued photo ID, such as a State or National ID, Passport or Driving Licence. You will also be required to take a selfie.",
  profileStep1Btn: "Submit ID",
  profileStep2Desc: "To verify your address, you must submit a utility bill, phone bill, bank statement or credit card statement. The document you submit must:",
  profileStep2Bullets: ["Be a high-quality scan or photograph", "Clearly show your name and address", "Be less than 90 days old"],
  profileStep2Pending: "Please submit document for proof of address",
  profileStep2Btn: "Submit proof of address",
  veriffIdTitle: "Confirm your identity",
  veriffIdDesc: "We'll ask for your ID and a selfie. It's quick and secure, and trusted by millions of users worldwide.",
  veriffAddrTitle: "Let's get your address confirmed",
  veriffAddrDesc: "We'll ask for proof of your address. It's quick and secure, and trusted by millions of users worldwide.",
  veriffLetsGo: "Let's go!",
  veriffPrivacy: "Your session audio and video may be recorded. Read more from Veriff's Privacy Notice.",
  veriffFullyVerified: "Your account is now fully verified",
  veriffCongrats: "CONGRATULATIONS,",
  veriffUnderstood: "Understood",
  veriffProceed: "Proceed to Lobby",
  profilePlaceholder: "Placeholder",
  purchaseHistoryTitle: "Purchase History",
  purchaseHistoryFilter: "Filter",
  purchaseHistoryNote: "*History from the past 3 months can be viewed. For older history, please contact customer support.",
  purchaseEmpty: "No purchase history",
  winEmptyTitle: "No prizes have been won yet.",
  winEmptySub: "This message will be displayed if you have won a prize of 2nd place or higher.",
  winEmptyCta: "GO TO ORIPA GACHA",
  purchaseStatusCompleted: "Completed",
  purchaseStatusCancelled: "Cancelled",
  purchaseFreePoints: (n: number) => `+ ${n.toLocaleString()} Free Points`,
  purchasePaymentMethod: "Payment Method",
  purchasePaymentId: "Payment ID",
  storeTitle: "Purchase Coins",
  storeSelectAmount: "Please select a top-up amount",
  storeLegalLink: "Click here for notation based on the Specified Commercial Transactions Act (Payment, Delivery, Cancellation, etc.)",
  storeSpecialOffers: "Special Offers",
  storeEduTitle: "Welcome to Oripalot!",
  storeEduSub: "Grab your first-time offer to start drawing — 90% OFF, just for new players!",
  storeEduSkip: "Maybe later",
  storeEduPick: "Recommended — start here!",
  storeCoinPurchase: "Coin Purchase",
  storeFirstTimeOffer: "FIRST-TIME OFFER",
  storePopularOffer: "POPULAR OFFER",
  storeWelcomeOfferTagline: "FIRST PURCHASE ONLY · LIMITED TIME",
  storeWelcomeOfferTitle: "Welcome Offer",
  storeWelcomeOfferSub: "New users only — one time offer",
  storeWelcomeOfferBonus: "+50 free bonus",
  loyaltyVipStatus: "VIP STATUS",
  loyaltyNextTier: "Next tier",
  loyaltySilver: "Silver",
  loyaltyGold: "Gold",
  loyaltyCoinsSpent: "coins spent",
  loyaltyToNext: (n: number, tier: string) => `${n.toLocaleString()} to ${tier}`,
  loyaltyShowPerks: "Show perks & rewards",
  loyaltyHidePerks: "Hide",
  loyaltyYourPerks: "YOUR PERKS",
  loyaltyUnlockNext: "UNLOCK NEXT",
  loyaltyPerk: "+10% coin bonus on purchase",
  loyaltyUnlock: "+15% coin bonus on purchase · Priority access",
  storeLimitedBundles: "Limited Bundles",
  storeLimitedTag: "LIMITED",
  storeEndsSoon: "Ends soon",
  storeHot: "HOT",
  storeRemaining: (n: number) => `Remaining ${n}`,
  storeRemainingOf: (n: number, t: number) => `Remaining ${n} / ${t}`,
  storeSoldPct: (n: number) => `${n}% sold`,
  storeFree: "free",
  storeBuy: "Buy",
  storeSpecialOffer: "Special Offer",
  storeBundleNames: ["Starter Pack", "Power Pack", "Whale Pack", "Elite Pack", "Mega Pack"] as string[],
  storeMegaBundles: "Mega Bundles",
  storeMegaHighValue: "HIGH VALUE",
  storeMegaBestFor: "Best for high spenders",
  storeMegaBadgePremium: "PREMIUM PACK",
  storeMegaBadgeBestValue: "BEST VALUE",
  storeMegaBadgeMega: "MEGA BUNDLE",
  storeMegaGetCta: (jpy: number) => `Get Mega Bundle — ¥${jpy.toLocaleString()}`,
  storeMegaBenefits: {
    drawTicket:     "Bonus draw ticket",
    exclusivePack:  "Exclusive pack access",
    rateBoost:      "Coin return rate up",
    jackpotTicket:  "Jackpot ticket",
    jackpotTicketX3:"Jackpot ticket ×3",
  } as Record<string, string>,
  storeCoins: (n: number) => `${n.toLocaleString()} Coins`,
  storeFreePoints: (n: number) => `Free Points ${n.toLocaleString()}`,
  storeOff: (n: number) => `${n}% OFF`,
  storeMemberRank: "Membership Rank",
  storePointsLabel: "Points",
  storePaymentMethod: "Payment Method",
  storeCreditCard: "Credit Card",
  storePurchasePoints: "Purchase Points",
  storeBuyNow: "Buy Now",
  storeApprox: "approx.",
  storeBeginner: "Beginner",
  storeRefreshAria: "Refresh balance",
  checkoutChooseCurrency: "Choose a currency:",
  checkoutExRate: (rate: string) => `1 JPY = ${rate} INR`,
  checkoutFee: "(includes 4% conversion fee)",
  checkoutOr: "OR",
  checkoutEmailLabel: "Email",
  checkoutPaymentMethod: "Payment method",
  checkoutCard: "Card",
  checkoutCardInfo: "Card information",
  checkoutCardNumPh: "1234 1234 1234 1234",
  checkoutExpiryPh: "MM / YY",
  checkoutCvcPh: "CVC",
  checkoutCardNameLabel: "Cardholder name",
  checkoutCardNamePh: "Full name on card",
  checkoutCountryLabel: "Country or region",
  checkoutBillingAddress: "Billing Address",
  checkoutBillingFirstNamePh: "First name",
  checkoutBillingLastNamePh: "Last name",
  checkoutBillingAddress1Ph: "Address*",
  checkoutBillingAddress2Ph: "Address (Optional)",
  checkoutBillingPOBoxNote: "Please do not enter a PO box address. Use a valid address",
  checkoutBillingCityPh: "City*",
  checkoutBillingStatePh: "Select state",
  checkoutBillingZipPh: "ZIP*",
  checkoutApplePay: "Apple Pay",
  checkoutSaveInfo: "Save my information for faster checkout",
  checkoutSaveSub: (m: string) => `Pay securely at ${m} and everywhere Link is accepted.`,
  checkoutPayBtn: "Pay",
  checkoutPoweredBy: "Powered by",
  checkoutDisclosures: "Commerce disclosures",
  checkoutTerms: "Terms of Service",
  checkoutPrivacy: "Privacy Policy",
  auth3dsCancel: "CANCEL",
  auth3dsInstructions: "Enter the authentication code sent to your email to authorise this payment.",
  auth3dsRefCode: "Reference Code:",
  auth3dsInputPh: "Auth code",
  auth3dsSubmit: "Authenticate",
  auth3dsResend: "Resend authentication code",
  successTitle: "Thank you for\nyour purchase!",
  successSub: "Your points have been added to your account",
  successOrderDetails: "ORDER DETAILS",
  successPaymentMethod: "PAYMENT METHOD",
  successDone: "Done",
  successPurchaseDetails: "Purchase Details",
  successClose: "Close",
  successBillingNote: "YOUR BILLING STATEMENT (BANK STATEMENT) WILL DISPLAY AS \"Oripalot\".",
  storeSubscriptions: "Subscriptions",
  storeCollectorsPass: "Collector's Pass",
  storeCollectorsPassTagline: "200 coins / day",
  storeCollectorsPassPerks: ["200 coins / day", "1 free pull / week", "Early access to new drops", "Exclusive drop alerts"] as string[],
  storeCollectorsPassPerkIcons: ["🟡", "🎴", "⚡", "🔔"] as string[],
  storeSubscribeCta: "Subscribe ¥980/mo",
  storeSubscribeLegal: "Cancel anytime · auto-renews monthly",
  storeManageSubscription: "Manage Subscription",
  storeSubscribedActive: "Active",
  storeSubscribedTitle: "Your active subscription",
  storeSuccessSubscription: "Collector's Pass\nActivated!",
  authSignUp: "SIGN UP",
  authLogin: "LOGIN",
  landingFeatured: "FEATURED ORIPA",
  tagRankLimited: "RANK LIMITED",
  tagSsrGuarantee: "SSR GUARANTEE",
  authEmailLabel: "Email Address",
  authPasswordLabel: "Password (At least 8 alphanumeric characters)",
  authDobLabel: "Date of Birth",
  authInviteLabel: "Invitation Code (Optional)",
  authAgreePrefix: "By registering, you agree to the ",
  authTermsOfService: "Terms of Service",
  authAnd: " and ",
  authPrivacyPolicy: "Privacy Policy",
  authAgreeEnd: ".",
  authSignUpFree: "Sign Up for Free",
  authSignUpOther: "Sign up with other methods",
  authSignUpApple: "Sign up with Apple",
  authSignUpGoogle: "Sign up with Google",
  authSignUpLine: "Sign up with LINE",
  authHaveAccount: "Already have an account?",
  authLogInLink: "Log In",
  authVerifyTitle: "Email Verification",
  authVerifyBody: (email: string) => `We have sent an email to ${email}. Please click the link within the email to complete the verification.`,
  authOpenEmailApp: "Open Email App",
  authVerifyNote: "If you didn't receive the email:",
  authVerifyBullets: ["It might have been filtered into your spam folder.", "Please double-check if the entered email address is correct."],
  authResendEmail: "DIDN'T RECEIVE THE EMAIL? RESEND EMAIL",
  authLoginTitle: "Login",
  authLoginSocial: "Login with Social",
  authLoginApple: "Login with Apple",
  authLoginGoogle: "Login with Google",
  authLoginLine: "Login with LINE",
  authAppleSheetTitle: "Sign in with Apple",
  authAppleSheetSignUp: "Create your Oripalot account using your Apple ID.",
  authAppleSheetLogin: "Sign in to Oripalot using your Apple ID.",
  authAppleAccountName: "John Appleseed",
  authAppleAccountEmail: "john.apple@icloud.com",
  authAppleFaceIdHint: "Tap anywhere to verify with Face ID",
  authAppleFaceIdScanning: "Face ID",
  authAppleSuccess: "Signed in successfully",
  authAppleSuccessSubSignUp: "Welcome to Oripalot!",
  authAppleSuccessSubLogin: "Welcome back!",
  authNoAccount: "Don't have an account?",
  authSignUpNow: "Sign up now",
  authGooglePickerTitle: "Choose an account",
  authGooglePickerSubtitle: "to continue to Oripalot",
  authGoogleAccount1Name: "John Doe",
  authGoogleAccount1Email: "john.doe@gmail.com",
  authGoogleAccount2Name: "John Work",
  authGoogleAccount2Email: "john.work@gmail.com",
  authGooglePermissionsTitle: "Sign in to Oripalot",
  authGooglePermissionsBody: "Oripalot wants to access your Google Account",
  authGooglePermissionItem1: "View your basic profile info (Name and Date of birth)",
  authGooglePermissionItem2: "View your email address",
  authGoogleContinue: "Continue",
  authGoogleCancel: "Cancel",
  authGoogleSuccess: "Signed in with Google",
  authGoogleSuccessSubSignUp: "Welcome to Oripalot!",
  authGoogleSuccessSubLogin: "Welcome back!",
  authLineVerificationTitle: "Verification",
  authLineCancel: "Cancel",
  authLineAppName: "OripaLot",
  authLineProvider: "Provider: OripaLot",
  authLineCertified: "Certified",
  authLineDescription: "OripaLot — Sign in with LINE",
  authLineCountry: "Country or region:",
  authLineCountryValue: "Japan",
  authLineGrantTitle: "Grant the following permissions to this service.",
  authLinePermission1: "Main profile info (Required)",
  authLinePermission2: "Your internal identifier (Required)",
  authLinePermission3: "Email address (Required)",
  authLineImportantTitle: "Important",
  authLineImportant1: "Make sure that you downloaded this app from OripaLot. OripaLot's provider is not liable for any damages caused by using unofficial sources of distribution.",
  authLineImportant2: "The handling of any personal information provided to this service, now and in the future, is the responsibility of OripaLot. Please refer to the service's Terms and Conditions of Use and Privacy Policy for more information.",
  authLineAllow: "Allow",
  authLineSuccess: "Signed in with LINE",
  authLineSuccessSubSignUp: "Welcome to Oripalot!",
  authLineSuccessSubLogin: "Welcome back!",
  authEmailError: "Please enter a valid email address.",
  authPasswordError: "Password must be at least 8 characters.",
  authDobPickerCancel: "Cancel",
  authDobPickerDone: "Done",
  authDobPickerYear: "YEAR",
  authDobPickerMonth: "MONTH",
  authDobPickerDay: "DAY",
  authPhoneSection: "Sign up with Phone Number",
  authEmailSection: "Sign up with Email",
  authPhoneLabel: "Phone Number",
  authPhoneError: "Phone number must be 10 digits.",
  authOtpTitle: "Enter Authentication Code",
  authOtpBodyPre: "Enter the 6-digit verification code sent to",
  authOtpBodyPost: "",
  authOtpExpiry: "Expiration:",
  authOtpAuthenticate: "Authenticate",
  authOtpResend: "Resend Verification Code",
  authOtpChangePhone: "Change Phone number",
  authOtpToast: "Verification code sent successfully",
  authLoginPhoneSection: "Login with Phone Number",
  authLoginEmailSection: "Login with Email",
  profileVerifyPhone: "Verify Phone Number",
  profilePhoneVerifySuccess: "Verification Successful!",
};

type Dict = typeof EN;

const JA: Dict = {
  langLabel: "日本語",
  prizeHistory: "景品履歴",
  tabWon: "獲得景品",
  tabWaiting: "発送待ち",
  tabShipped: "発送済み",
  simulateExpiry: "期限切れを再現",
  wonAt: (d) => `獲得 ${d}`,
  shipBy: (d, e) => `発送期限 ${d} · ${e}`,
  expired: "期限切れ",
  hLeft: (h) => `残り${h}時間`,
  dLeft: (d) => `残り${d}日`,
  wonFooter: "7日以内に発送依頼がない景品は、自動的にオリパコインに交換されます。",
  wonEmptyTitle: "対象の景品はありません",
  wonEmptySub: "獲得した景品はここに表示されます。",
  selected: "選択中",
  selOff: "未選択",
  deckAll: "すべて",
  deckSwipeLeft: "発送",
  deckSwipeRight: "交換",
  deckSwipeDown: "スキップ",
  deckHint: "← 発送依頼 · → 交換 · ↓ 後でスキップ",
  deckBulkOn: "一括モード：1回のスワイプで表示中のすべてを移動",
  deckSorted: "仕分けした景品",
  deckEmpty: "すべて仕分け完了！",
  deckEmptySub: "この表示に景品は残っていません。",
  prizeTier: (n) => (["", "ウルトラ", "ゴールド", "シルバー"][n] ?? `${n}等`),
  deckCategoryAll: "すべてのカテゴリ",
  cardCategory: (c) => ({ pokemon: "ポケモン", onepiece: "ワンピース", baseball: "野球", football: "サッカー" }[c]),
  searchOption: "検索…",
  searchPlaceholder: "カードを絞り込む…",
  searchNoResults: "検索に一致するカードがありません。",
  lobbySearchPlaceholder: "オリパ・カードを検索…",
  lobbySearchResults: "検索結果",
  lobbySearchEmpty: "検索に一致するオリパがありません。",
  selectAll: "すべて選択",
  reset: "リセット",
  viewAll: "リスト表示",
  viewAllTitle: (n) => `すべてのカード · ${n}`,
  exchange: "コインに交換",
  requestShipping: "発送依頼",
  helperNone: "交換または発送する景品を選択してください。",
  helperReady: "送料無料 · 14営業日以内にお届け。",
  helperShort: (n) => `発送依頼にはあと${n.toLocaleString()}コイン分の景品の選択が必要です（最低${SHIP_MIN_COINS.toLocaleString()}）。`,
  toastSelectFirst: "景品を1つ以上選択してください",
  toastShort: (n) => `発送依頼にはあと${n.toLocaleString()}コイン分の景品の選択が必要です（最低${SHIP_MIN_COINS.toLocaleString()}）`,
  sortTitle: "並び替え",
  sortLabels: {
    coinDesc: "コインが高い順",
    coinAsc: "コインが低い順",
    wonNew: "獲得日が新しい順",
    wonOld: "獲得日が古い順",
    expSoon: "期限が近い順",
  },
  convertTitle: "オリパコインに交換",
  convertQuestion: (n, c) => `${n}個の景品を ${c.toLocaleString()} コインに交換しますか？`,
  cantUndo: "この操作は取り消せません。",
  cancel: "キャンセル",
  exchangeBtn: "交換する",
  silverBulkTitle: "シルバーカードをまとめました",
  silverBulkBody: (n, c) => `${n}枚のシルバーカードをすべて選択しました。まとめて ${c.toLocaleString()} コインに交換できます。`,
  silverBulkCta: "コインに交換",
  silverBulkPick: "1枚ずつ選ぶ",
  toastConverted: (n, c) => `${n}個の景品を ${c.toLocaleString()} コインに交換しました`,
  chooseAddress: "お届け先を選択",
  addNewAddress: "＋ 新しい住所を追加",
  continueBtn: "次へ",
  addNewTitle: "新しい住所を追加",
  country: "国",
  postcode: "郵便番号",
  postcodeHint: "郵便番号を入力すると候補が表示されます",
  searching: "住所を検索中…",
  enterManually: "住所を手入力する",
  selectAddress: "住所を選択してください",
  phName: "氏名",
  phLine: "住所",
  phCity: "市区町村 / 郵便番号",
  phPhone: "電話番号",
  back: "戻る",
  saveAddress: "住所を保存",
  confirmTitle: "発送依頼の確認",
  deliverTo: "お届け先",
  prizesCount: (n) => `${n}個の景品`,
  totalValue: "合計価値",
  freeShip: "送料無料 · 14営業日以内にお届け。",
  requestShippingBtn: "発送を依頼",
  toastShipReq: "発送を依頼しました · 14営業日以内にお届け",
  requested: (d) => `依頼日 ${d}`,
  preparing: "発送準備中",
  waitingFooter: "依頼日から14営業日以内にお届けします。",
  waitingEmptyTitle: "発送待ちの景品はありません",
  waitingEmptySub: "発送依頼した景品はここに表示されます。",
  tracking: "追跡番号",
  copyAria: "追跡番号をコピー",
  toastCopied: (code) => `追跡番号 ${code} をコピーしました`,
  shippedEmptyTitle: "発送済みの景品はありません",
  shippedEmptySub: "お届け済みの景品は記録としてここに保存されます。",
  toastNoExpired: "7日間の期限を過ぎた景品はありません",
  toastAutoConverted: (n, total) => `期限切れの景品${n}個を自動交換しました（+${total.toLocaleString()}）`,
  backAria: "戻る",
  notificationsAria: "お知らせ",
  addCoinsAria: "コインを追加",
  menuAria: "メニューを開く",
  menuTitle: "メニュー",
  menuHome: "ホーム",
  navOripa: "オリパ",
  navItems: "獲得商品",
  navPrizeHistory: "プライズ履歴",
  navQuest: "クエスト",
  navMyPage: "マイページ",
  comingSoon: "準備中",
  welcomeTitle: "オリパへようこそ！",
  welcomeSub: "無料コインを今すぐ受け取ろう",
  welcomeCta: "受け取る",
  welcomeVoice: "オリパへようこそ！",
  dailyTitle: "デイリーボーナス",
  dailySub: "毎日ログインして無料コインをゲット！",
  dailyDay: (n) => `${n}日目`,
  dailyToday: "今日",
  dailyClaim: (n) => `${n.toLocaleString()}コインを受け取る`,
  dailyClaimShort: "受け取る",
  dailyClaimed: "受取済",
  dailyLocked: "ロック中",
  dailyClaimedToast: (n) => `+${n.toLocaleString()}コインを獲得！`,
  dailyComeBack: "また明日受け取ってね！",
  dailyDone: "とじる",
  dailyUltimate: "7日間ログインボーナス",
  dailyFreePt: "フリーPt",
  dailyTapClaim: "タップで受取",
  dailyTapHint: "DAY 1 をタップして無料コインを受け取ろう",
  firstDrawTitle: "初めてのドローをしよう！",
  firstDrawSub: "無料コインをゲット！引く枚数を選んで、初めてのオリパを引いてみよう！",
  firstDrawCta: "引いてみる",
  firstDrawSkip: "あとで",
  firstDrawSelect: "引く枚数を選んでね",
  itemsTabNotSelected: "未選択",
  itemsTabPending: "配送待ち",
  itemsTabShipped: "発送済み",
  itemsSortLabel: "コイン価値が高い順",
  itemsNotSelected: "未選択",
  itemsSelected: "選択中",
  itemsExchangePeriod: "交換期限：",
  itemsSelectAll: "全選択",
  itemsReset: "リセット",
  itemsExchangeForCoins: "コインに交換",
  itemsRequestDelivery: "配送申請",
  itemsDeliveryNote: "配送申請には500コイン以上の商品を選択してください。",
  itemsName: "[1BOX] SHINY TREASURE",
  itemsDesc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.",
  accountName: "山田 太郎",
  accountTier: "会員",
  menuAddresses: "お届け先住所",
  menuPayment: "お支払い方法",
  menuSettings: "設定",
  menuLogout: "ログアウト",
  notifBar: "通知メッセージ、ポイントの有効期限が迫っています！",
  notifTabYou: "あなたへの通知",
  notifTabNotice: "お知らせ",
  notifEmpty: "通知がありません",
  notifNew: "新着",
  promoBanner: "PROMO BANNER",
  rewardHeadline: "特別報酬を解放しよう！",
  rwDaily: "デイリー",
  rwQuest: "クエスト",
  rwInvite: "友達招待",
  rwBox: "デイリーBOX",
  rwFirst: "初回限定特典",
  heroPts: (a, b) => `${a}/${b} pt`,
  heroDraw: "オリパを引く",
  qmTitle: "祭りクエスト",
  qmUltimate: "アルティメット報酬",
  qmMaxPrize: "最大賞品",
  qmUrCard: "URカード",
  qmTask1: "ポケモンオリパを3回引く",
  qmR1: "無料ドロー ×1",
  qmR2: "コイン 500",
  qmR3: "フリーPt 50",
  qmGetCoins: "コインを購入",
  coBadge: "連続オファー",
  coTitle: "連続オファー",
  coSubtitle: "購入するたびに次のステップが解放。ボーナスもアップ！",
  coStep: (n) => `ステップ ${n}`,
  coStep1: "スターターリロード",
  coStep2: "バリューパック",
  coStep3: "メガバンドル",
  coBonus: (p) => `${p} ボーナス`,
  coBuy: "購入する",
  coLocked: "前のステップを完了すると解放されます",
  coClaimed: "購入済み",
  coAllDone: "全ステップ受取済み！",
  coToast: (n) => `${n.toLocaleString()} コインを獲得しました`,
  coEndsIn: "終了まで",
  catAll: "すべて",
  catNew: "新着",
  catPopular: "人気",
  catPokemon: "ポケモン",
  catLimited: "限定",
  catOther: "その他",
  secRecommended: "おすすめオリパ",
  secList: "オリパ一覧",
  secNew: "新着オリパ",
  secJustAdded: "入荷したばかり",
  secHot: "人気急上昇",
  secTrending: "急上昇ランキング",
  secPokemon: "ポケモン特集",
  secPokemonClassic: "ポケモン定番",
  secLimited: "期間限定",
  secLastChance: "ラストチャンス",
  secOther: "その他のおすすめ",
  tagPopular: "人気",
  tagPokemon: "ポケモン",
  tagLv5: "LV5限定",
  tagSsr: "SSR確定",
  periodLabel: (d) => `開催期間：${d} まで (重要情報エリア)`,
  perDraw: "/1回",
  endsIn: (m) => `終了まであと${m}分`,
  remainingLabel: "残り",
  remainingTimeLabel: "残り時間",
  minUnit: (m) => `${m}分`,
  btn1Draw: "1回ガチャ",
  btnDraw: "ガチャを引く",
  btnFree: "無料ガチャ",
  btnView: "内容を見る",
  promo1: "PROMO BANNER 1（例：LINEキャンペーン / 初心者ガイド）",
  promo2: "PROMO BANNER 2（例：LINEキャンペーン / 初心者ガイド）",
  ftAbout: "オリパロットについて",
  ftCategories: "オリパカテゴリー",
  ftFollow: "SNSをフォロー",
  ftCopyright: "© 2026 oripalot.com All rights reserved.",
  ftBlurb: "オリパロット（oripalot.com）では、当社のソーシャルゲームをいつでも無料でお楽しみいただけます。購入は必須ではありません。法律で禁止されている地域では無効となります。利用規約が適用されます。",
  ftLinks: ["オリパロットについて", "カスタマーサポート", "利用規約", "キャンペーン規約", "健全なプレイへの取り組み", "プライバシーポリシー"],
  ftCats: ["最新オリパ", "人気急上昇", "ポケカ", "限定", "その他", "すべて"],
  ftSupport: "24時間年中無休オンラインサポート: お問い合わせ",
  homeBannerTitle: "ボーナスコイン10,000",
  homeBannerSub: "初回購入キャンペーン",
  homeFeatured: "注目のオリパ",
  draw1: "1回引く",
  draw10: "10回引く",
  remaining: (n) => `残り${n}`,
  soldOut: "完売",
  homeFooter: "© オリパロット — デモ",
  giBack: "トップ",
  giPeriod: "募集期間：2026/01/01 まで（残り期限あり）",
  giCardsLeft: (n: number) => `カードまで残り${n}枚`,
  giNotice: "注意事項・ご利用ガイド",
  giNoticeBody: "一度排出された商品は再度排出されません。2等以上の商品は当選履歴に追加されます。",
  gi1st: "1等",
  gi2nd: "2等",
  gi3rd: "3等",
  giContents: "商品ラインナップ",
  giDrawn: "排出済み",
  giAvailable: "排出可能",
  giItem: "アイテム",
  giPrizeName: "リザードンex",
  giDraw1: "1回ガチャ",
  giDraw10: "10回ガチャ",
  giDraw100: "100回ガチャ",
  giDrawsLabel: "回",
  giDrawCta: (n) => `${n}回引く`,
  giHaulNote: (n) => `×${n}回の予想内訳`,
  giBoostTitle: "×10ブースターを適用しますか？",
  giBoostDesc: (n) => `${n}回を10倍に — ${n}枚ではなく${n * 10}枚ゲット！`,
  giBoostApply: (fee) => `×10ブースター適用 (+${fee.toLocaleString()})`,
  giBoostSkip: (n) => `そのまま${n}回引く`,
  giBoostBadge: "最高にお得",
  giBoostFeeNote: (fee) => `たった+${fee.toLocaleString()}コインでカード10倍`,
  giModalTitle: "ガチャタイトル",
  giModalDesc: "ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！",
  giTnc: "T&Cs",
  giTncLink: "Here",
  giCancel: "キャンセル",
  giTncTitle: "利用規約",
  giTncBody: [
    "1. 参加条件 — ガチャに参加するには有効なアカウントと十分なオリパコインが必要です。コインはガチャ確定時に消費されます。",
    "2. 確定後の取消不可 — ガチャを確定すると、消費したコインは返金されず、結果のキャンセル・交換・取り消しはできません。",
    "3. 景品 — 各景品は表示どおりに付与されます。2等以上の景品は当選履歴に追加され、コインへの交換または発送依頼が可能です。",
    "4. 有効期限 — 7日以内に発送依頼がない景品は、表示価値に基づき自動的にオリパコインへ交換されます。",
    "5. 発送 — 発送依頼には選択した景品の合計が1,500コイン以上である必要があります。発送は有効なご依頼から14営業日以内に行われます。",
    "6. 排出確率 — レアリティはランダムに決定されます。上位景品（1等）ほど排出確率は低くなります。",
    "7. 不正利用 — 不正行為・濫用・不具合の悪用が確認された場合、アカウント停止および景品の没収となることがあります。",
    "8. 規約の変更 — 本規約は予告なく変更される場合があります。サービスの継続利用をもって最新の規約に同意したものとみなされます。",
  ],
  gachaResultTitle: "ガチャ結果",
  mpEditProfile: "プロフィール編集",
  mpId: "ID",
  mpOripaCoin: "オリパコイン",
  mpFreePoint: "フリーポイント",
  mpCoinExpiry: "コインの有効期限はあと3日です！",
  mpViewDetails: "詳細を確認",
  mpCurrentRank: "現在ランク",
  mpRankBronze: "ブロンズ",
  mpNextLevel: "次のレベルまで",
  mpRankPerks: "ランキングを見る",
  mpRankingTitle: "ランキング",
  mpRankingSubtitle: "今月のトップランカー",
  mpRankingYou: "あなた",
  mpRankingPts: (n: number) => `${n.toLocaleString()} pt`,
  mpMyMenu: "マイメニュー",
  mmQuest: "クエスト",
  mmItems: "獲得商品",
  mmPrizeHistory: "当選履歴",
  mmPurchases: "購入履歴",
  mmInvite: "友達紹介",
  mmFaq: "よくある質問",
  mmContact: "お問い合わせ",
  mmNotices: "お知らせ",
  mmShippingAddress: "配送先住所",
  mmSubscriptions: "サブスクリプション",
  cancelSubscription: "解約する",
  cancelSubTitle: "解約しますか？",
  cancelSubBody: "現在の期間終了後にコレクターズパスの特典がすべて失われます。",
  cancelSubYes: "はい、解約します",
  cancelSubNo: "プランを継続",
  subCurrentPeriod: "現在の期間",
  shippingTitle: "お届け先の追加・変更",
  shippingDesc: "配送先住所を管理できます。複数の住所を追加し、デフォルトを選択できます。",
  shippingEmpty: "登録済みの配送先住所がありません。",
  shippingAddNew: "新しい配送先住所を追加",
  shippingConfirmBtn: "確認",
  shippingDefaultLabel: "デフォルト",
  shippingSetDefault: "デフォルトに設定",
  shippingFormTitle: "配送先住所",
  shippingCountry: "国・地域",
  shippingJapan: "日本",
  shippingUSA: "アメリカ合衆国",
  shippingStreetNumber: "番地",
  shippingApartment: "建物名・部屋番号",
  shippingCityStreetNumber: "市区町村・番地",
  shippingState: "州",
  shippingZipCode: "郵便番号（ZIP）",
  shippingRegister: "登録",
  shippingConfirmTitle: "住所の確認",
  shippingConfirmQ: "この住所を登録しますか？",
  shippingRegisterBtn: "住所を登録",
  shippingCancel: "キャンセル",
  shippingDeleteTitle: "この配送先住所を削除しますか？",
  shippingDeleteBtn: "削除",
  toastShippingAdded: "配送先住所を追加しました",
  toastShippingEdited: "配送先住所を更新しました",
  toastShippingDeleted: "配送先住所を削除しました",
  mpAccountSection: "アカウント",
  mpEditAccount: "アカウント情報を変更",
  mpOtherSection: "その他",
  mpTerms: "利用規約",
  mpPrivacy: "プライバシーポリシー",
  mpLegal: "特定商取引法に基づく表記",

  rafTitle: "友達招待",
  rafHeroTitle: "紹介人数に応じてボーナス特典をロック解除！今すぐ友達を招待しよう！",
  rafHeroLead: "友達を紹介すると、",
  rafHeroCoins: "最大200,000コイン",
  rafHeroAnd: "＆",
  rafHeroPoints: "100無料ポイント",
  rafHeroTail: "がもらえます。",
  rafCopy: "コピー",
  rafCopied: "コピーしました",
  rafShare: "招待リンクをシェア",
  rafMilestones: "達成状況",
  rafUnlocked: "ミッション達成！",
  rafClaim: "受け取る",
  rafLevel: "紹介人数 レベル1",
  rafMyFriends: "友達一覧",
  rafInvited: "招待した人数",
  rafRewardsEarned: "獲得済みの報酬",
  rafQualified1: "シルバー達成者数",
  rafQualified2: "ゴールド達成者数",
  rafFriendBoosts: "友達を応援する",
  rafBoostDesc: "友達に通知を送って限定特典をプレゼントしましょう！紹介報酬のミッション達成にも近づきます。",
  rafSendAll: "全員に送る",
  rafFilter: "絞り込み",
  rafSendBoost: "応援を送る",
  rafSent: "送信済み",
  rafLockedBtn: "ロック中",
  rafFriendName: "オリパ太郎",
  rafFriendId: "ID : XXXXXX",
  rafTagFreeSpin: "無料スピン+10回",
  rafTagSpecial: "スペシャル応援",
  rafTagQuests: "限定クエスト",
  rafTagScSpin: "無料SCスピン+10回",
  rafHowItWorks: "紹介報酬の仕組み",
  rafStep1Title: "専用リンクをシェア",
  rafStep1Desc: "あなたの専用招待リンクを友達に送ります。",
  rafStepRewardLead: "最大 ",
  rafStepRewardCoins: "50,000 コイン",
  rafStepRewardMid: " + ",
  rafStepRewardPoints: "25 ポイント",
  rafStepRewardBang: "獲得！",
  rafStep2Desc: "招待された友達がアカウント認証を完了し、累計100ドル以上のコインを購入すると特典が付与されます。",
  rafStep3Desc: "さらに、友達が累計1,400ドル以上のコインを購入すると、追加のステップアップ特典が適用されます。",

  qHeroTitle: "特別報酬を解放しよう！",
  qHeroDesc: "クエストを攻略しよう！毎日のミッションを達成してクエスト報酬を獲得し、特別報酬を目指せ！",
  qUltimate: "特別報酬",
  qCoinsSuffix: "オリパコイン",
  qEndsIn: "終了まで",
  qMission: "ミッション",
  qMissionTitle: "スロットゲームで無料のSC 25を獲得する",
  qClaim: "受け取る",
  qGo: "挑戦する",
  qRewards: "報酬",
  qShowDetails: "詳細を表示",
  qDetailsBody: "対象のスロットゲームをプレイしてミッションを達成しましょう。目標を達成すると、報酬は自動的に付与されます。",
  qLocked: "アンロックするには前のクエストを完了してください",

  faqTitle: "よくある質問",

  profileTitle: "マイプロフィール",
  profileAccountId: "アカウントID",
  profileDisplayName: "表示名",
  profilePersonalInfo: "個人情報",
  profileRequired: "必要",
  profileSocialLinks: "SNS連携",
  profileAccountVerifications: "アカウント認証",
  profileIdVerification: "認証状況",
  profilePaymentMethod: "決済方法の確認",
  profilePaymentMethodField: "決済方法",
  profilePaymentBullets: ["カードの表面と裏面の両方をアップロードしてください。", "サイトで使用しているクレジットカード番号と一致している必要があります。", "書類を提出する際、カード番号が完全に見えるようにしてください。カード番号の一部を隠すと確認に失敗する場合があります。"],
  profileCardNumber: "カード番号",
  profileSelectCard: "カードを選択",
  profileSubmitProof: "決済方法の証明を提出",
  profilePendingVerification: "確認中",
  profileVerifiedCard: "確認済み",
  jumioStartTitle: "確認を開始",
  jumioStartDesc: "このプロセスはお客様の本人確認を行い、なりすまし被害から保護するためのものです。",
  jumioStartBullets: ["クレジットカードをアップロード", "有効な書類を使用してください", "書類の詳細が明確に読み取れることを確認してください。"],
  jumioNext: "次へ",
  jumioUploadCardTitle: "クレジットカードをアップロード",
  jumioUploadCardDesc: "書類全体のカラー画像をアップロードしてください。最大：2枚の画像または10MB。",
  jumioCaptureImage: "画像を撮影",
  jumioUploadFile: "ファイルをアップロード",
  jumioPageUploaded: "1ページアップロード済み",
  jumioProcessingTitle: "しばらくお待ちください",
  jumioFinishing: "完了中...",
  profileSubmit: "提出",
  profileKycNote: "グローバルKYC基準を満たすために、信頼できるパートナーを利用して確認を行います。",
  profileDocumentUpload: "書類アップロード",
  profileDocumentNote: "チームから依頼された書類をアップロードしてください。このセクションでは最大15件の書類をアップロードできます。",
  profileDocumentSelect: "書類を選択",
  profileDocumentSubmit: "提出",
  profileDocumentUploadBtn: "アップロード",
  profileDocumentTypes: ["銀行明細書", "税務申告書", "購入契約書", "資産売却証明", "給与明細", "公証ID", "その他"],
  profileDocumentHistory: "アップロード履歴",
  profileDocumentPending: "アップロード中...",
  profileDocumentPendingNote: "書類がアップロードされるまでお待ちください。",
  profileDocumentSuccess: "アップロード完了！",
  profileDocumentSuccessNote: "書類のアップロードが完了しました。",
  profileDocumentOkay: "確認",
  profileDocumentApproved: "承認済み",
  profileDocumentPendingStatus: "審査中",
  profileDocumentReview: "レビュー中",
  profileChangePassword: "パスワード変更",
  profileOldPassword: "現在のパスワード",
  profileNewPassword: "新しいパスワード",
  profileRepeatPassword: "新しいパスワード（確認）",
  profileChangePasswordBtn: "パスワードを変更",
  profileNotifications: "通知設定",
  profileEmailPref: "メール",
  profilePushPref: "プッシュ",
  profileSmsPref: "SMS",
  profileLastName: "姓",
  profileFirstName: "名",
  profileLastNameKana: "セイ（カタカナ）",
  profileFirstNameKana: "メイ（カタカナ）",
  profileEmail: "メールアドレス",
  profileDob: "生年月日",
  profilePhone: "電話番号",
  profilePostalCode: "郵便番号",
  profilePrefecture: "都道府県",
  profileCity: "市区町村・番地",
  profileBuilding: "建物名・部屋番号",
  profileSaveNote: "登録情報に変更がある場合は、カスタマーサポートまでご連絡ください。",
  profileSave: "保存",
  profileSaved: "保存しました！",
  profileStep1: "ステップ1：本人確認",
  profileStep2: "ステップ2：住所確認",
  profileIdCheckDone: "本人確認が完了しました。",
  profileAddressCheckDone: "住所確認が完了しました。",
  profileVerifNeeded: "未確認",
  profileVerifVerified: "確認済み",
  profileStep1Desc: "本人確認のため、国が発行した写真付きIDをアップロードし、自撮り写真を提出してください。",
  profileStep1Btn: "IDを提出",
  profileStep2Desc: "住所確認のため、公共料金の請求書、電話料金明細、銀行明細書またはクレジットカード明細書を提出してください。",
  profileStep2Bullets: ["鮮明なスキャンまたは写真であること", "氏名と住所が明確に記載されていること", "発行から90日以内のものであること"],
  profileStep2Pending: "住所証明書類を提出してください",
  profileStep2Btn: "住所証明書類を提出",
  veriffIdTitle: "本人確認",
  veriffIdDesc: "IDと自撮り写真をご提出いただきます。迅速・安全で、世界中の何百万人ものユーザーに信頼されています。",
  veriffAddrTitle: "住所確認",
  veriffAddrDesc: "住所証明書類をご提出いただきます。迅速・安全で、世界中の何百万人ものユーザーに信頼されています。",
  veriffLetsGo: "始める",
  veriffPrivacy: "セッションの音声・映像が記録される場合があります。詳細はVeriffのプライバシーポリシーをご確認ください。",
  veriffFullyVerified: "アカウントの確認が完了しました",
  veriffCongrats: "おめでとうございます、",
  veriffUnderstood: "了解しました",
  veriffProceed: "ロビーへ進む",
  profilePlaceholder: "Placeholder",
  purchaseHistoryTitle: "購入履歴",
  purchaseHistoryFilter: "フィルター",
  purchaseHistoryNote: "※過去3ヶ月の購入履歴を表示しています。それ以前の履歴はカスタマーサポートにお問い合わせください。",
  purchaseEmpty: "購入履歴がありません",
  winEmptyTitle: "まだ当選商品がありません",
  winEmptySub: "2等以上の商品を獲得した場合に表示されます",
  winEmptyCta: "オリパガチャへ",
  purchaseStatusCompleted: "完了",
  purchaseStatusCancelled: "キャンセル",
  purchaseFreePoints: (n: number) => `+ ${n.toLocaleString()} 無料ポイント`,
  purchasePaymentMethod: "支払い方法",
  purchasePaymentId: "支払いID",
  storeTitle: "コイン購入",
  storeSelectAmount: "チャージ金額を選択してください",
  storeLegalLink: "特定商取引法に基づく表記について(お支払い・ご提供・キャンセル等)はこちら",
  storeSpecialOffers: "スペシャルオファー",
  storeEduTitle: "オリパロットへようこそ！",
  storeEduSub: "初回限定オファーでガチャを始めよう — 新規プレイヤー限定90%OFF！",
  storeEduSkip: "あとで",
  storeEduPick: "おすすめ — ここから始めよう！",
  storeCoinPurchase: "コイン購入",
  storeFirstTimeOffer: "初回限定",
  storePopularOffer: "人気オファー",
  storeWelcomeOfferTagline: "初回購入限定 · 期間限定",
  storeWelcomeOfferTitle: "ウェルカムオファー",
  storeWelcomeOfferSub: "新規ユーザー限定 — 一度限りのオファー",
  storeWelcomeOfferBonus: "+50 ボーナス",
  loyaltyVipStatus: "VIPステータス",
  loyaltyNextTier: "次のランク",
  loyaltySilver: "シルバー",
  loyaltyGold: "ゴールド",
  loyaltyCoinsSpent: "コイン使用済み",
  loyaltyToNext: (n: number, tier: string) => `あと ${n.toLocaleString()} で${tier}`,
  loyaltyShowPerks: "特典・報酬を見る",
  loyaltyHidePerks: "閉じる",
  loyaltyYourPerks: "現在の特典",
  loyaltyUnlockNext: "次のアンロック",
  loyaltyPerk: "購入時コイン+10%ボーナス",
  loyaltyUnlock: "購入時コイン+15%ボーナス・優先アクセス",
  storeLimitedBundles: "限定バンドル",
  storeLimitedTag: "限定",
  storeEndsSoon: "終了間近",
  storeHot: "人気",
  storeRemaining: (n: number) => `残り ${n}`,
  storeRemainingOf: (n: number, t: number) => `残り ${n} / ${t}`,
  storeSoldPct: (n: number) => `${n}% 販売済み`,
  storeFree: "ボーナス",
  storeBuy: "購入",
  storeSpecialOffer: "スペシャルオファー",
  storeBundleNames: ["スターターパック", "パワーパック", "クジラパック", "エリートパック", "メガパック"] as string[],
  storeMegaBundles: "メガバンドル",
  storeMegaHighValue: "高価値",
  storeMegaBestFor: "ヘビースペンダー向け",
  storeMegaBadgePremium: "プレミアムパック",
  storeMegaBadgeBestValue: "最高コスパ",
  storeMegaBadgeMega: "メガバンドル",
  storeMegaGetCta: (jpy: number) => `メガバンドルを購入 — ¥${jpy.toLocaleString()}`,
  storeMegaBenefits: {
    drawTicket:     "ボーナスドローチケット",
    exclusivePack:  "限定パックアクセス",
    rateBoost:      "コイン還元率アップ",
    jackpotTicket:  "ジャックポットチケット",
    jackpotTicketX3:"ジャックポットチケット×3",
  } as Record<string, string>,
  storeCoins: (n) => `${n.toLocaleString()} コイン`,
  storeFreePoints: (n) => `フリーコイン ${n.toLocaleString()}`,
  storeOff: (n) => `${n}% OFF`,
  storeMemberRank: "会員ランク",
  storePointsLabel: "ポイント",
  storePaymentMethod: "お支払い方法",
  storeCreditCard: "クレジットカード",
  storePurchasePoints: "ポイント購入",
  storeBuyNow: "今すぐ購入",
  storeApprox: "約",
  storeBeginner: "ビギナー",
  storeRefreshAria: "残高を更新",
  checkoutChooseCurrency: "通貨を選択してください：",
  checkoutExRate: (rate) => `1 JPY = ${rate} INR`,
  checkoutFee: "（4%の換算手数料を含む）",
  checkoutOr: "または",
  checkoutEmailLabel: "メールアドレス",
  checkoutPaymentMethod: "支払い方法",
  checkoutCard: "カード",
  checkoutCardInfo: "カード情報",
  checkoutCardNumPh: "1234 1234 1234 1234",
  checkoutExpiryPh: "MM / YY",
  checkoutCvcPh: "CVC",
  checkoutCardNameLabel: "カード名義人",
  checkoutCardNamePh: "カードに記載の氏名",
  checkoutCountryLabel: "国または地域",
  checkoutBillingAddress: "請求先住所",
  checkoutBillingFirstNamePh: "名",
  checkoutBillingLastNamePh: "姓",
  checkoutBillingAddress1Ph: "住所*",
  checkoutBillingAddress2Ph: "住所（任意）",
  checkoutBillingPOBoxNote: "私書箱は入力しないでください。有効な住所を入力してください",
  checkoutBillingCityPh: "市区町村*",
  checkoutBillingStatePh: "都道府県を選択",
  checkoutBillingZipPh: "郵便番号*",
  checkoutApplePay: "Apple Pay",
  checkoutSaveInfo: "次回のために情報を保存する",
  checkoutSaveSub: (m) => `${m}およびLinkが使えるすべての場所で安全にお支払いいただけます。`,
  checkoutPayBtn: "支払う",
  checkoutPoweredBy: "Powered by",
  checkoutDisclosures: "商取引の開示",
  checkoutTerms: "利用規約",
  checkoutPrivacy: "プライバシーポリシー",
  auth3dsCancel: "キャンセル",
  auth3dsInstructions: "認証コードをご入力ください。",
  auth3dsRefCode: "リファレンスコード：",
  auth3dsInputPh: "認証コード",
  auth3dsSubmit: "認証する",
  auth3dsResend: "認証コードを再送",
  successTitle: "ご購入\nありがとうございます！",
  successSub: "ポイントがアカウントに追加されました",
  successOrderDetails: "注文内容",
  successPaymentMethod: "お支払い方法",
  successDone: "完了",
  successPurchaseDetails: "購入内容",
  successClose: "閉じる",
  successBillingNote: "銀行明細には「Oripalot」と表示されます。",
  storeSubscriptions: "サブスクリプション",
  storeCollectorsPass: "コレクターズパス",
  storeCollectorsPassTagline: "200コイン / 日",
  storeCollectorsPassPerks: ["200コイン / 日", "1回無料引き / 週", "新ドロップ先行アクセス", "限定ドロップ通知"] as string[],
  storeCollectorsPassPerkIcons: ["🟡", "🎴", "⚡", "🔔"] as string[],
  storeSubscribeCta: "¥980/月でサブスクライブ",
  storeSubscribeLegal: "いつでもキャンセル可・毎月自動更新",
  storeManageSubscription: "サブスクリプションを管理",
  storeSubscribedActive: "有効",
  storeSubscribedTitle: "ご利用中のサブスクリプション",
  storeSuccessSubscription: "コレクターズパス\n有効化完了！",
  authSignUp: "新規登録",
  authLogin: "ログイン",
  landingFeatured: "注目のオリパ",
  tagRankLimited: "ランク限定",
  tagSsrGuarantee: "SSR確定",
  authEmailLabel: "メールアドレス",
  authPasswordLabel: "パスワード（8文字以上の英数字）",
  authDobLabel: "生年月日",
  authInviteLabel: "招待コード（任意）",
  authAgreePrefix: "登録することで、",
  authTermsOfService: "利用規約",
  authAnd: "および",
  authPrivacyPolicy: "プライバシーポリシー",
  authAgreeEnd: "に同意します。",
  authSignUpFree: "無料で新規登録",
  authSignUpOther: "他の方法で登録",
  authSignUpApple: "Appleで登録",
  authSignUpGoogle: "Googleで登録",
  authSignUpLine: "LINEで登録",
  authHaveAccount: "すでにアカウントをお持ちですか？",
  authLogInLink: "ログイン",
  authVerifyTitle: "メール認証",
  authVerifyBody: (email: string) => `${email}にメールを送信しました。メール内のリンクをクリックして認証を完了してください。`,
  authOpenEmailApp: "メールアプリを開く",
  authVerifyNote: "メールが届かない場合：",
  authVerifyBullets: ["迷惑メールフォルダに振り分けられている可能性があります。", "入力したメールアドレスが正しいかご確認ください。"],
  authResendEmail: "メールが届きませんでしたか？再送する",
  authLoginTitle: "ログイン",
  authLoginSocial: "SNSでログイン",
  authLoginApple: "Appleでログイン",
  authLoginGoogle: "Googleでログイン",
  authLoginLine: "LINEでログイン",
  authAppleSheetTitle: "Appleでサインイン",
  authAppleSheetSignUp: "Apple IDでオリパロットのアカウントを作成します。",
  authAppleSheetLogin: "Apple IDでオリパロットにサインインします。",
  authAppleAccountName: "John Appleseed",
  authAppleAccountEmail: "john.apple@icloud.com",
  authAppleFaceIdHint: "画面をタップしてFace IDで認証",
  authAppleFaceIdScanning: "Face ID",
  authAppleSuccess: "サインイン完了",
  authAppleSuccessSubSignUp: "オリパロットへようこそ！",
  authAppleSuccessSubLogin: "おかえりなさい！",
  authNoAccount: "アカウントをお持ちでない方は？",
  authSignUpNow: "新規登録はこちら",
  authGooglePickerTitle: "アカウントを選択",
  authGooglePickerSubtitle: "オリパロットに続行",
  authGoogleAccount1Name: "山田 太郎",
  authGoogleAccount1Email: "taro.yamada@gmail.com",
  authGoogleAccount2Name: "山田 太郎（仕事）",
  authGoogleAccount2Email: "taro.work@gmail.com",
  authGooglePermissionsTitle: "オリパロットにサインイン",
  authGooglePermissionsBody: "オリパロットがGoogleアカウントへのアクセスを求めています",
  authGooglePermissionItem1: "基本的なプロフィール情報の閲覧（名前と生年月日）",
  authGooglePermissionItem2: "メールアドレスの閲覧",
  authGoogleContinue: "続行",
  authGoogleCancel: "キャンセル",
  authGoogleSuccess: "Googleでサインイン完了",
  authGoogleSuccessSubSignUp: "オリパロットへようこそ！",
  authGoogleSuccessSubLogin: "おかえりなさい！",
  authLineVerificationTitle: "確認",
  authLineCancel: "キャンセル",
  authLineAppName: "OripaLot",
  authLineProvider: "プロバイダー: OripaLot",
  authLineCertified: "認証済み",
  authLineDescription: "OripaLot — LINEでサインイン",
  authLineCountry: "国または地域：",
  authLineCountryValue: "日本",
  authLineGrantTitle: "このサービスへ次の権限を許可します。",
  authLinePermission1: "メインプロフィール情報（必須）",
  authLinePermission2: "内部識別子（必須）",
  authLinePermission3: "メールアドレス（必須）",
  authLineImportantTitle: "重要",
  authLineImportant1: "このアプリがOripaLotから正規にダウンロードされたものであることをご確認ください。非公式の配布元からのご利用による損害について、OripaLotは責任を負いかねます。",
  authLineImportant2: "このサービスに提供した個人情報の取り扱いについては、現在および将来にわたりOripaLotが責任を負います。詳細はサービスの利用規約およびプライバシーポリシーをご参照ください。",
  authLineAllow: "許可する",
  authLineSuccess: "LINEでサインイン完了",
  authLineSuccessSubSignUp: "オリパロットへようこそ！",
  authLineSuccessSubLogin: "おかえりなさい！",
  authEmailError: "有効なメールアドレスを入力してください。",
  authPasswordError: "パスワードは8文字以上で入力してください。",
  authDobPickerCancel: "キャンセル",
  authDobPickerDone: "完了",
  authDobPickerYear: "年",
  authDobPickerMonth: "月",
  authDobPickerDay: "日",
  authPhoneSection: "電話番号で登録",
  authEmailSection: "メールアドレスで登録",
  authPhoneLabel: "電話番号",
  authPhoneError: "電話番号は10桁で入力してください。",
  authOtpTitle: "認証コードを入力",
  authOtpBodyPre: "",
  authOtpBodyPost: "に送信された6桁の認証コードを入力してください",
  authOtpExpiry: "有効期限：",
  authOtpAuthenticate: "認証する",
  authOtpResend: "認証コードを再送する",
  authOtpChangePhone: "電話番号を変更する",
  authOtpToast: "認証コードを送信しました",
  authLoginPhoneSection: "電話番号でログイン",
  authLoginEmailSection: "メールアドレスでログイン",
  profileVerifyPhone: "電話番号を認証する",
  profilePhoneVerifySuccess: "認証が完了しました！",
};

const STR: Record<Lang, Dict> = { en: EN, ja: JA };

/* ── helpers ─────────────────────────────────────────────────────────── */
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtDateTime(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function expiresAt(wonAt: number) {
  return wonAt + SHIP_WINDOW_DAYS * DAY;
}
function hoursLeft(wonAt: number) {
  return Math.max(0, Math.round((expiresAt(wonAt) - NOW) / (60 * 60 * 1000)));
}
function expiryLabel(wonAt: number, t: Dict) {
  const h = hoursLeft(wonAt);
  if (h <= 0) return t.expired;
  if (h < 24) return t.hLeft(h);
  return t.dLeft(Math.floor(h / 24));
}
function locName(p: { name: string; nameJa: string }, lang: Lang) {
  return lang === "ja" ? p.nameJa : p.name;
}
function locDesc(p: { desc: string; descJa: string }, lang: Lang) {
  return lang === "ja" ? p.descJa : p.desc;
}
function locTitle(it: { title: string; titleJa?: string }, lang: Lang) {
  return lang === "ja" ? (it.titleJa ?? it.title) : it.title;
}

/* ── small UI atoms ──────────────────────────────────────────────────── */
function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/coin.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function GemIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/gem.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function CoinChip({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
      style={{
        background: strong ? "#FFF1CF" : "#FFF6E3",
        color: "#B5740A",
        fontSize: strong ? 14 : 12,
      }}
    >
      <CoinIcon size={strong ? 16 : 14} />
      {value.toLocaleString()}
    </span>
  );
}

const RARITY_IMG: Record<Rarity, string> = {
  UR: "/card-ur.png",
  SR: "/card-sr.png",
  N: "/card-n.png",
};

function PrizeArt({ rarity, size = 76 }: { rarity: Rarity; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={RARITY_IMG[rarity]}
      alt={`${rarity} prize card`}
      draggable={false}
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: Math.round(size * 1.4), boxShadow: "0 1px 3px rgba(0,0,0,0.18)", WebkitUserDrag: "none", userSelect: "none" } as React.CSSProperties}
    />
  );
}

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition"
      style={{
        borderColor: checked ? "#FF7A1A" : "#c9ced6",
        background: checked ? "#FF7A1A" : "#fff",
      }}
    >
      {checked && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function BrandLogo({ onClick }: { onClick?: () => void }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto shrink-0" />;
  if (onClick) {
    return (
      <button onClick={onClick} aria-label="Home" className="shrink-0">
        {img}
      </button>
    );
  }
  return img;
}

function BellIcon({ label }: { label: string }) {
  const openNotif = useContext(NotifNavContext);
  return (
    <button onClick={openNotif} aria-label={label} className="relative flex h-8 w-8 items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#B40206">
        <path d="M12 2a1.6 1.6 0 011.6 1.6v.7A6 6 0 0118 10c0 4 1.6 5.5 2.2 6.1a.8.8 0 01-.56 1.4H4.36a.8.8 0 01-.56-1.4C4.4 15.5 6 14 6 10a6 6 0 014.4-5.7v-.7A1.6 1.6 0 0112 2z" />
        <path d="M9.7 19.2a2.4 2.4 0 004.6 0z" />
      </svg>
      {NOTIF_UNREAD_TOTAL > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#ff2d2d] px-1 text-[9px] font-extrabold leading-none text-white ring-2 ring-white">{NOTIF_UNREAD_TOTAL}</span>
      )}
    </button>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {(["en", "ja"] as Lang[]).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {l === "en" ? "EN" : "日本語"}
          </button>
        );
      })}
    </div>
  );
}

function YesNoToggle({ value, setValue }: { value: boolean; setValue: (v: boolean) => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {([["Yes", true], ["No", false]] as [string, boolean][]).map(([label, v]) => {
        const active = value === v;
        return (
          <button
            key={label}
            onClick={() => setValue(v)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DrawVariantToggle({ value, setValue }: { value: "v1" | "v2"; setValue: (v: "v1" | "v2") => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {([["V1", "v1"], ["V2", "v2"]] as [string, "v1" | "v2"][]).map(([label, v]) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => setValue(v)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Lobby navigation experiment (mirrors public/lobby.html). "off" keeps the
// original POC feed untouched; v1/v2/v3 swap in the alternative navigation.
// Everything lobby-nav lives in its own block so it can be removed cleanly.
type LobbyNav = "off" | "v1" | "v2" | "v3";

function LobbyNavToggle({ value, setValue }: { value: LobbyNav; setValue: (v: LobbyNav) => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {([["Off", "off"], ["V1", "v1"], ["V2", "v2"], ["V3", "v3"]] as [string, LobbyNav][]).map(([label, v]) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => setValue(v)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

type BoostVariant = "super" | "mega" | "both";

function BoostVariantToggle({ value, setValue }: { value: BoostVariant; setValue: (v: BoostVariant) => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {([["Super", "super"], ["Mega", "mega"], ["Both", "both"]] as [string, BoostVariant][]).map(([label, v]) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => setValue(v)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function BalancePill({ coins, t, onOpenStore }: { coins: number; t: Dict; onOpenStore?: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative mr-2.5">
        <button
          type="button"
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="flex items-center gap-2 rounded-full border border-black/15 bg-white py-1 pl-3 pr-5 shadow-[0_1px_3px_rgba(0,0,0,0.10)] transition active:scale-[0.97]"
        >
          <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#1d2129]">
            <GemIcon size={18} /> 10,000
          </span>
          <span className="h-4 w-px bg-black/15" />
          <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#1d2129]">
            <CoinIcon size={18} /> {coins.toLocaleString()}
          </span>
        </button>
        <button
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="absolute right-0 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full"
          style={{ background: "#B40206", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
        </button>
      </div>
      <BellIcon label={t.notificationsAria} />
    </div>
  );
}

type OripaItem = { id: string; gem: boolean; free: boolean; remaining: number; total: number; endsIn: number; image?: string; title: string; titleJa?: string };
const RECOMMENDED_ORIPA: OripaItem[] = [
  { id: "r1", gem: true, free: false, remaining: 700, total: 1000, endsIn: 30, image: "/oripa-banner-1.png", title: "Pokémon 151 Special Oripa", titleJa: "ポケモン151スペシャルオリパ" },
  { id: "r2", gem: false, free: true, remaining: 320, total: 1000, endsIn: 12, image: "/oripa-banner-2.png", title: "One Piece Premium Oripa", titleJa: "ワンピース プレミアムオリパ" },
  { id: "r3", gem: false, free: true, remaining: 880, total: 1000, endsIn: 58, image: "/oripa-banner-3.png", title: "Weiss Schwarz Lucky Draw", titleJa: "ヴァイスシュヴァルツ ラッキードロー" },
];
const LIST_ORIPA: OripaItem[] = [
  { id: "l1", gem: true, free: false, remaining: 700, total: 1000, endsIn: 30, image: "/oripa-list-1.png", title: "Football Stars Oripa", titleJa: "サッカースター オリパ" },
  { id: "l2", gem: false, free: true, remaining: 150, total: 1000, endsIn: 8, image: "/oripa-list-2.png", title: "NBA Rookies Draw", titleJa: "NBAルーキー ドロー" },
  { id: "l3", gem: false, free: true, remaining: 540, total: 1000, endsIn: 44, image: "/oripa-list-3.png", title: "Soccer Premium Pack", titleJa: "サッカー プレミアムパック" },
];

type SectionIconKey = "star" | "new" | "popular" | "pokemon" | "limited" | "cards";
type HomeSection = { id: string; titleKey: string; icon: SectionIconKey; variant: "red" | "light"; cats: string[]; items: OripaItem[] };
// `cats: []` means the section only appears in the "All" feed.
const HOME_SECTIONS: HomeSection[] = [
  { id: "rec", titleKey: "secRecommended", icon: "star", variant: "red", cats: [], items: RECOMMENDED_ORIPA },

  // New
  { id: "new", titleKey: "secNew", icon: "new", variant: "light", cats: ["new"], items: [
    { id: "n1", gem: false, free: true, remaining: 940, total: 1000, endsIn: 71, image: "/oripa-banner-2.png", title: "Pokémon VSTAR New Arrival", titleJa: "ポケモン VSTAR 新着オリパ" },
    { id: "n2", gem: true, free: false, remaining: 610, total: 1000, endsIn: 33, image: "/oripa-list-3.png", title: "Yu-Gi-Oh! Fresh Pack", titleJa: "遊戯王 フレッシュパック" },
  ] },
  { id: "justadded", titleKey: "secJustAdded", icon: "new", variant: "light", cats: ["new"], items: [
    { id: "ja1", gem: false, free: true, remaining: 990, total: 1000, endsIn: 90, image: "/oripa-list-2.png", title: "Dragon Ball Just Added", titleJa: "ドラゴンボール 新登場オリパ" },
    { id: "ja2", gem: true, free: false, remaining: 870, total: 1000, endsIn: 55, image: "/oripa-banner-3.png", title: "Magic: The Gathering Newcomer", titleJa: "マジック・ザ・ギャザリング 新着" },
  ] },

  // Hot
  { id: "hot", titleKey: "secHot", icon: "popular", variant: "light", cats: ["popular"], items: [
    { id: "h1", gem: true, free: false, remaining: 210, total: 1000, endsIn: 9, image: "/oripa-banner-1.png", title: "Charizard ex Hot Draw", titleJa: "リザードンex ホットドロー" },
    { id: "h2", gem: false, free: true, remaining: 470, total: 1000, endsIn: 22, image: "/oripa-list-1.png", title: "Pikachu Illustrator Hot Pack", titleJa: "ピカチュウ イラストレーター ホットパック" },
  ] },
  { id: "trending", titleKey: "secTrending", icon: "popular", variant: "light", cats: ["popular"], items: [
    { id: "tr1", gem: true, free: false, remaining: 300, total: 1000, endsIn: 15, image: "/oripa-list-3.png", title: "Pokémon Trending Oripa", titleJa: "ポケモン トレンドオリパ" },
    { id: "tr2", gem: false, free: true, remaining: 660, total: 1000, endsIn: 40, image: "/oripa-banner-2.png", title: "One Piece Trending Draw", titleJa: "ワンピース トレンドドロー" },
  ] },

  // Pokémon
  { id: "pkm", titleKey: "secPokemon", icon: "pokemon", variant: "light", cats: ["pokemon"], items: [
    { id: "p1", gem: true, free: false, remaining: 540, total: 1000, endsIn: 44, image: "/oripa-banner-3.png", title: "Pokémon 151 Oripa", titleJa: "ポケモン151 オリパ" },
    { id: "p2", gem: false, free: true, remaining: 360, total: 1000, endsIn: 17, image: "/oripa-list-2.png", title: "Pokémon Scarlet & Violet Oripa", titleJa: "ポケモン スカーレット＆バイオレット オリパ" },
  ] },
  { id: "pkmclassic", titleKey: "secPokemonClassic", icon: "pokemon", variant: "light", cats: ["pokemon"], items: [
    { id: "pc1", gem: false, free: true, remaining: 720, total: 1000, endsIn: 48, image: "/oripa-list-1.png", title: "Pokémon Classic Base Set", titleJa: "ポケモン クラシック 基本セット" },
    { id: "pc2", gem: true, free: false, remaining: 410, total: 1000, endsIn: 20, image: "/oripa-banner-1.png", title: "Pokémon Neo Genesis Oripa", titleJa: "ポケモン ネオジェネシス オリパ" },
  ] },

  // Limited
  { id: "lim", titleKey: "secLimited", icon: "limited", variant: "light", cats: ["limited"], items: [
    { id: "li1", gem: true, free: false, remaining: 80, total: 1000, endsIn: 3, image: "/oripa-list-3.png", title: "Limited Charizard UR", titleJa: "限定 リザードンUR" },
    { id: "li2", gem: true, free: false, remaining: 130, total: 1000, endsIn: 6, image: "/oripa-banner-1.png", title: "Limited Umbreon VMAX", titleJa: "限定 ブラッキーVMAX" },
  ] },
  { id: "lastchance", titleKey: "secLastChance", icon: "limited", variant: "light", cats: ["limited"], items: [
    { id: "lc1", gem: true, free: false, remaining: 25, total: 1000, endsIn: 1, image: "/oripa-banner-2.png", title: "Last Chance Mewtwo", titleJa: "ラストチャンス ミュウツー" },
    { id: "lc2", gem: false, free: true, remaining: 55, total: 1000, endsIn: 2, image: "/oripa-list-2.png", title: "Last Chance Rayquaza", titleJa: "ラストチャンス レックウザ" },
  ] },

  // Other
  { id: "oth", titleKey: "secOther", icon: "cards", variant: "light", cats: ["other"], items: [
    { id: "o1", gem: false, free: true, remaining: 720, total: 1000, endsIn: 51, image: "/oripa-list-1.png", title: "Sports Cards Oripa", titleJa: "スポーツカード オリパ" },
    { id: "o2", gem: false, free: true, remaining: 905, total: 1000, endsIn: 62, image: "/oripa-banner-2.png", title: "Baseball Legends Draw", titleJa: "ベースボール レジェンド ドロー" },
  ] },
  { id: "list", titleKey: "secList", icon: "cards", variant: "light", cats: ["other"], items: LIST_ORIPA },
];
function sectionIcon(icon: SectionIconKey, red: boolean) {
  const c = red ? "#fff" : "#1d2129";
  if (icon === "star") return <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" /></svg>;
  if (icon === "cards") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"><rect x="4.5" y="5" width="9" height="13" rx="1.4" transform="rotate(-10 9 11.5)" /><rect x="10" y="5" width="9" height="13" rx="1.4" transform="rotate(8 14.5 11.5)" /></svg>;
  return catIcon(icon, c);
}

type RewardKey = "rwDaily" | "rwQuest" | "rwInvite" | "rwBox" | "rwFirst";
const REWARDS: { key: RewardKey; img: string }[] = [
  { key: "rwDaily", img: "/reward-1.png" },
  { key: "rwQuest", img: "/reward-2.png" },
  { key: "rwInvite", img: "/reward-3.png" },
  { key: "rwBox", img: "/reward-4.png" },
  { key: "rwFirst", img: "/reward-5.png" },
];
function TagPill({ children, variant }: { children: React.ReactNode; variant: "redOutline" | "redFill" | "darkOutline" }) {
  const cls =
    variant === "redFill"
      ? "bg-[#B40206] text-white border border-[#B40206]"
      : variant === "redOutline"
        ? "border border-[#B40206] text-[#B40206]"
        : "border border-black/35 text-[#1d2129]";
  return <span className={`whitespace-nowrap rounded-full px-2 py-[1px] text-[10px] font-bold ${cls}`}>{children}</span>;
}

function OripaCard({ item, t, lang, onView, onDraw }: { item: OripaItem; t: Dict; lang: Lang; onView?: () => void; onDraw?: (count: number, free?: boolean) => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  const price = (
    <span className="flex items-baseline">
      <span className="text-[15px] font-extrabold text-[#1d2129] underline decoration-[#B40206] decoration-2 underline-offset-2">1,000</span>
      <span className="text-[11px] font-bold text-[#8a9099]">{t.perDraw}</span>
    </span>
  );
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="1.8" strokeLinejoin="round" className="shrink-0"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
        <TagPill variant="redOutline">{t.tagPopular}</TagPill>
        <TagPill variant="redFill">{t.tagPokemon}</TagPill>
        <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
        <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
      </div>
      <h4 className="px-2.5 pt-1.5 text-[13.5px] font-extrabold leading-tight text-[#1d2129]">{locTitle(item, lang)}</h4>
      <div className="mx-2.5 mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#ededf0]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c2c6cc" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </div>
      <div className="mt-2.5 bg-[#1d1d1d] px-3 py-1 text-center text-[11px] font-bold text-white">{t.periodLabel("2026/01/01")}</div>
      <div className="flex items-stretch px-3 py-2.5">
        <div className="flex flex-col justify-center gap-1.5 border-r border-dashed border-black/20 pr-3">
          <span className="flex items-center gap-1.5"><CoinIcon size={20} />{price}</span>
          {item.gem && <span className="flex items-center gap-1.5"><GemIcon size={20} />{price}</span>}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 pl-3">
          <p className="flex items-baseline justify-center gap-0.5 leading-none">
            <span className="text-[13px] font-bold text-[#1d2129]">{t.remainingLabel}</span>
            <span className="text-[19px] font-extrabold text-[#1d2129]">{item.remaining}</span>
            <span className="text-[12px] font-bold text-[#8a9099]">/{item.total}</span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#B40206]" style={{ width: `${pct}%` }} /></div>
          <p className="flex items-baseline justify-center gap-0.5 leading-none text-[#B40206]">
            <span className="text-[13px] font-bold">{t.remainingTimeLabel}</span>
            <span className="text-[17px] font-extrabold">{t.minUnit(item.endsIn)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={onView} className="flex-1 rounded-lg py-2 text-[12px] font-bold text-white" style={{ background: "#B40206" }}>{t.btnDraw}</button>
        {item.free && <button onClick={() => onDraw?.(1, true)} className="flex-1 rounded-lg border border-[#B40206] py-2 text-[12px] font-bold text-[#B40206]">{t.btnFree}</button>}
        <button onClick={onView} className="flex-1 rounded-lg border border-black/40 py-2 text-[12px] font-bold text-[#1d2129]">{t.btnView}</button>
      </div>
    </div>
  );
}

function GiTierBanner({ label, from, to, count }: { label: string; from: string; to: string; count?: number }) {
  return (
    <div className="mx-auto my-4 flex w-[210px] items-center justify-center gap-2 rounded-md py-1.5 text-center text-[15px] font-extrabold text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)]" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span>{label}</span>
      {count != null && (
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[12px] font-extrabold tabular-nums">×{count}</span>
      )}
    </div>
  );
}

function GiCard({ rarity, onClick }: { rarity: Rarity; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block overflow-hidden rounded-lg shadow-[0_1px_5px_rgba(0,0,0,0.18)] transition active:scale-[0.97]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={RARITY_IMG[rarity]} alt="" className="block h-auto w-full" />
    </button>
  );
}

function CardZoomModal({ front, onClose }: { front: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/80 px-6" onClick={onClose}>
      <style>{`
        @keyframes czSpin { from { transform: rotateY(0deg) } to { transform: rotateY(360deg) } }
        @keyframes czIn { from { opacity:0; transform: scale(.6) } to { opacity:1; transform: scale(1) } }
      `}</style>
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div style={{ perspective: "1200px", animation: "czIn .25s ease both" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative" style={{ width: "min(64vw, 260px)", aspectRatio: "5 / 7", transformStyle: "preserve-3d", animation: "czSpin 3.4s linear infinite", filter: "drop-shadow(0 0 36px rgba(255,210,90,.6))" }}>
          {/* Front */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={front} alt="" className="absolute inset-0 h-full w-full rounded-xl object-cover" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }} />
          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(150deg,#2b1359,#6d1f7a,#1a0b33)", border: "3px solid rgba(255,210,120,.6)" }}>
            <div className="flex h-[42%] w-[42%] items-center justify-center rounded-full border-2 border-[#ffd479]/70" style={{ background: "rgba(255,255,255,.08)" }}>
              <span className="text-[40px] font-black italic text-[#ffd479]">O</span>
            </div>
            <span className="mt-3 text-[12px] font-extrabold tracking-[0.3em] text-[#ffd479]">ORIPA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const COIN_PER_DRAW = 1000;
// Mega Boost coin cost grows with the number of cards: 1→1000, 2→1200, 3→1400 …
function megaBoostCost(count: number) {
  return 1000 + (count - 1) * 200;
}

// Visual pack preview above the draw carousel.
// 1 draw -> a single pack. 10 / 100 draws -> a centred fan of 10 packs (front
// pack upright in the middle), with a "×10" multiplier badge for the 100-draw
// bundle (10 packs × 10). The front pack carries the Oripa brand sticker.
const MAX_PACKS = 10;
// Renders a fan of exactly `count` packs (1..10). All MAX_PACKS slots stay
// mounted so packs smoothly fan in / out as the count changes. An optional
// "×10" booster badge appears when the boost is applied.
function DrawPackStack({ count, boosted, badge }: { count: number; boosted?: boolean; badge?: string }) {
  const n = Math.max(1, Math.min(MAX_PACKS, count));
  const mid = (n - 1) / 2;
  const arr = Array.from({ length: MAX_PACKS });
  return (
    <div className="relative mx-auto mb-3 flex h-[150px] w-full items-end justify-center">
      {arr.map((_, i) => {
        const active = i < n;
        const off = i - mid;
        const tx = active && n > 1 ? off * 12 : 0;
        const ty = active && n > 1 ? -Math.abs(off) * 4 : 0;
        const rot = active && n > 1 ? off * 4 : 0;
        const z = Math.round(40 - Math.abs(off) * 2);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src="/pack.png"
            alt=""
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="absolute bottom-0 h-[140px] w-auto drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)]"
            style={{
              transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
              transformOrigin: "bottom center",
              zIndex: active ? z : 0,
              opacity: active ? 1 : 0,
              transition: "transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 280ms ease",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          />
        );
      })}

      <span className="absolute -bottom-1 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1d2129] px-3 py-0.5 text-[13px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-all duration-300">
        {badge ?? `×${boosted ? n * 10 : n}`}
      </span>
      <span
        className="absolute right-[16%] top-1 z-[60] rounded-full bg-[#B40206] px-2.5 py-0.5 text-[12px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] ring-2 ring-white transition-all duration-300"
        style={{ opacity: boosted ? 1 : 0, transform: boosted ? "scale(1)" : "scale(0.6)" }}
      >
        ×10
      </span>
    </div>
  );
}

function OripaGachaInfo({ lang, coins, item, onBack, onHome, onDraw, drawVariant = "v1", boostVariant = "both", firstDrawHint = false, onFirstDrawHintDone }: { lang: Lang; coins: number; item: OripaItem; onBack: () => void; onHome: () => void; onDraw?: (count: number, opts?: { superBoost?: boolean; megaBoost?: boolean }) => void; drawVariant?: "v1" | "v2"; boostVariant?: BoostVariant; firstDrawHint?: boolean; onFirstDrawHintDone?: () => void }) {
  const t = STR[lang];
  const [zoomCard, setZoomCard] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [boostOpen, setBoostOpen] = useState(false);
  // POC: boost ownership is controlled from the external "Boost variants" panel.
  const superAvailable = boostVariant !== "mega";
  const megaAvailable = boostVariant !== "super";
  // Selector variant is controlled from the external config panel:
  // "v1" = 1/10/100 CTAs, "v2" = +/- stepper (1..10).
  const variant = drawVariant;
  // Boosts are only offered in the +/- stepper variant (v2).
  const boostEnabled = variant === "v2";

  // Reset the count to a value valid in the active variant whenever it changes.
  useEffect(() => { setCount(1); }, [variant]);

  // Estimated haul per prize tier for the selected number of draws.
  const exp1 = Math.round(count * 0.03);
  const exp2 = Math.round(count * 0.22);
  const exp3 = Math.max(0, count - exp1 - exp2);

  // The pack fan maxes out at 10 packs; a 100-draw shows 10 packs with a ×10 badge.
  const packCount = variant === "v1" && count === 100 ? 10 : Math.min(count, MAX_PACKS);
  const packBoosted = variant === "v1" && count === 100;

  return (
    <div className="relative flex h-full flex-col bg-white">
      {/* White header */}
      <header className="shrink-0 border-b border-black/5 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <button onClick={onHome} aria-label="Home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto" />
          </button>
          <BalancePill coins={coins} t={t} />
        </div>
        <div className="flex items-center gap-2 px-3 pb-2">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="text-[16px] font-bold text-[#1d2129]">{t.giBack}</span>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-white pb-2">
        {/* Draw selector. v2 (stepper) pins the whole block; v1 lets the pack card
            scroll away and keeps only the ×1/×10/×100 CTAs + draw button sticky. */}
        {variant === "v2" ? (
          <div className="relative sticky top-0 z-20 border-b border-black/5 bg-white px-3 pb-3 pt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <DrawPackStack count={packCount} boosted={packBoosted} />

            <div className="px-1.5">
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  disabled={count <= 1}
                  aria-label={lang === "ja" ? "減らす" : "Decrease"}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 text-[24px] font-black leading-none transition active:scale-95 disabled:opacity-30"
                  style={{ borderColor: "#B40206", color: "#B40206", background: "#fff" }}
                >
                  −
                </button>
                <div className="min-w-[78px] text-center">
                  <div className="text-[30px] font-black leading-none text-[#1d2129]">{count}</div>
                  <div className="mt-1 text-[11px] font-bold text-[#8a9099]">{lang === "ja" ? "枚" : count === 1 ? "card" : "cards"}</div>
                </div>
                <button
                  onClick={() => setCount((c) => Math.min(MAX_PACKS, c + 1))}
                  disabled={count >= MAX_PACKS}
                  aria-label={lang === "ja" ? "増やす" : "Increase"}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[24px] font-black leading-none text-white shadow-[0_3px_10px_rgba(180,2,6,0.35)] transition active:scale-95 disabled:opacity-30"
                  style={{ background: "#B40206" }}
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-semibold text-[#8a9099]"><CoinIcon size={14} />{(count * COIN_PER_DRAW).toLocaleString()}</div>
            </div>

            <button onClick={() => { onFirstDrawHintDone?.(); return boostEnabled ? setBoostOpen(true) : onDraw?.(count); }} className="mt-2.5 w-full rounded-xl py-3 text-[14px] font-extrabold text-white shadow-[0_4px_14px_rgba(180,2,6,0.35)] active:scale-[0.99]" style={{ background: "#B40206" }}>{t.giDrawCta(count)}</button>
          </div>
        ) : (
          <>
            {/* Pack card — scrolls away (not sticky) */}
            <div className="bg-white px-3 pt-3">
              <DrawPackStack count={packCount} boosted={packBoosted} />
            </div>
            {/* Sticky bar — only the ×1/×10/×100 CTAs and draw button stay pinned */}
            <div className="relative sticky top-0 z-20 border-b border-black/5 bg-white px-3 pb-3 pt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              {firstDrawHint && <style>{`@keyframes fdHintRing{0%,100%{box-shadow:0 0 0 0 rgba(180,2,6,0)}50%{box-shadow:0 0 0 4px rgba(180,2,6,0.28)}}`}</style>}
              <div className="grid grid-cols-3 gap-2 rounded-xl px-0.5">
                {[1, 10, 100].map((c) => {
                  const active = count === c;
                  const focus = firstDrawHint && c === 1;   // first-draw: spotlight ×1 only
                  const dim = firstDrawHint && c !== 1;
                  return (
                    <button
                      key={c}
                      onClick={() => setCount(c)}
                      className="rounded-xl border-2 py-2 text-center transition active:scale-[0.98]"
                      style={{ borderColor: focus || active ? "#B40206" : "rgba(0,0,0,0.1)", background: focus || active ? "#fff5f5" : "#fff", boxShadow: focus || active ? "0 3px 10px rgba(180,2,6,0.18)" : "none", opacity: dim ? 0.5 : 1, animation: focus ? "fdHintRing 1.3s ease-in-out infinite" : undefined }}
                    >
                      <div className="text-[19px] font-black leading-none" style={{ color: focus || active ? "#B40206" : "#1d2129" }}>×{c}</div>
                      <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-[#8a9099]"><CoinIcon size={11} />{(c * COIN_PER_DRAW).toLocaleString()}</div>
                    </button>
                  );
                })}
              </div>

              <button onClick={() => { onFirstDrawHintDone?.(); return boostEnabled ? setBoostOpen(true) : onDraw?.(count); }} className="mt-2.5 w-full rounded-xl py-3 text-[14px] font-extrabold text-white shadow-[0_4px_14px_rgba(180,2,6,0.35)] active:scale-[0.99]" style={{ background: "#B40206" }}>{t.giDrawCta(count)}</button>
            </div>
          </>
        )}
        <div className="px-3 pt-3">
          {/* Estimated haul for the selected draw count */}
          <p className="mt-4 text-center text-[11px] font-semibold text-[#8a9099]">{t.giHaulNote(count)}</p>

          {/* 1st prize */}
          <GiTierBanner label={t.gi1st} from="#8fd3ff" to="#b9a3ff" count={exp1} />
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1].map((i) => (
              <button type="button" key={i} onClick={() => setZoomCard(item.image ?? RARITY_IMG.UR)} className="block overflow-hidden rounded-lg bg-white text-left shadow-[0_1px_5px_rgba(0,0,0,0.2)] transition active:scale-[0.98]">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="h-[150px] w-full object-cover" />
                  <span className="absolute -bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-[#2f6fed] text-[12px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]">{i + 1}</span>
                </div>
                <div className="flex items-center justify-between px-2 pb-2 pt-4">
                  <span className="truncate text-[10px] font-extrabold text-[#1d2129]">{t.giPrizeName}</span>
                  <span className="shrink-0 text-[9px] font-bold text-[#16a34a]">{t.giAvailable}</span>
                </div>
              </button>
            ))}
          </div>

          {/* 2nd prize */}
          <GiTierBanner label={t.gi2nd} from="#f6c945" to="#c98a18" count={exp2} />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <GiCard key={i} rarity="SR" onClick={() => setZoomCard(RARITY_IMG.SR)} />
            ))}
          </div>

          {/* 3rd prize */}
          <GiTierBanner label={t.gi3rd} from="#dfe3e8" to="#a9b0b8" count={exp3} />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <GiCard key={i} rarity="N" onClick={() => setZoomCard(RARITY_IMG.N)} />
            ))}
          </div>

          <p className="mt-5 whitespace-pre-line text-[9px] leading-relaxed text-[#9aa0a8]">{t.ftBlurb}</p>
        </div>
        <SiteFooter t={t} />
      </div>

      {boostOpen && (
        <BoosterModal
          lang={lang}
          count={count}
          superAvailable={superAvailable}
          megaAvailable={megaAvailable}
          onClose={() => setBoostOpen(false)}
          onConfirm={(finalCount, opts) => { setBoostOpen(false); onDraw?.(finalCount, opts); }}
        />
      )}

      {zoomCard && <CardZoomModal front={zoomCard} onClose={() => setZoomCard(null)} />}
    </div>
  );
}

// Percentage label that counts point-by-point when the value changes.
// When increasing it waits for the activation animation, counts up slowly,
// then gives the final number a gentle bounce.
function AnimatedPct({ value, className, style, delay = 0, stepMs = 60, pop = false }: { value: number; className?: string; style?: React.CSSProperties; delay?: number; stepMs?: number; pop?: boolean }) {
  const [disp, setDisp] = useState(value);
  const [bounce, setBounce] = useState(0);
  const dispRef = useRef(value);
  useEffect(() => {
    if (dispRef.current === value) return;
    const dir = value > dispRef.current ? 1 : -1;
    const wait = dir > 0 ? delay : 0;
    let intervalId = 0;
    const startId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        dispRef.current += dir;
        setDisp(dispRef.current);
        if (dispRef.current === value) {
          window.clearInterval(intervalId);
          if (pop) setBounce((b) => b + 1);
        }
      }, stepMs);
    }, wait);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
    };
  }, [value, delay, stepMs, pop]);
  return (
    <span key={bounce} className={className} style={{ ...style, ...(pop && bounce > 0 ? { animation: "bNumPop 1.7s cubic-bezier(.34,1.4,.64,1)", transformOrigin: "center right" } : {}) }}>
      {disp}%
    </span>
  );
}

function BoosterModal({ lang, count, superAvailable, megaAvailable = true, onClose, onConfirm }: { lang: Lang; count: number; superAvailable: boolean; megaAvailable?: boolean; onClose: () => void; onConfirm: (finalCount: number, opts: { superBoost: boolean; megaBoost: boolean }) => void }) {
  const ja = lang === "ja";
  const L = ja
    ? {
        title: "ドローをパワーアップ",
        chances: "当選確率",
        superName: "スーパーブースト",
        superDesc: "カード枚数をドロー数だけ倍増",
        megaName: "メガブースト",
        megaDesc: "上位カードの当選確率がアップ",
        free: "無料",
        owned: (n: number) => `${n}個所持`,
        none: "未所持",
        added: (c: number) => `+${c.toLocaleString()} コイン`,
        total: "合計",
        cards: "枚",
        draw: (n: number) => `${n}回引く`,
        activated: (name: string) => `${name} 発動！`,
      }
    : {
        title: "Power up your draw",
        chances: "Win chances",
        superName: "Super Boost",
        superDesc: "Multiplies cards by the number of draws",
        megaName: "Mega Boost",
        megaDesc: "Boosts your chance of top-tier cards",
        free: "FREE",
        owned: (n: number) => `${n} owned`,
        none: "Not owned",
        added: (c: number) => `+${c.toLocaleString()} coins`,
        total: "Total",
        cards: count === 1 ? "card" : "cards",
        draw: (n: number) => `Draw ×${n}`,
        activated: (name: string) => `${name} activated!`,
      };

  const [superOn, setSuperOn] = useState(false);
  const [megaOn, setMegaOn] = useState(false);
  const [activated, setActivated] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Trigger the shake imperatively (reflow trick) so the modal is NOT
  // remounted — that previously reset the animated win-chance counters.
  useEffect(() => {
    if (shakeKey === 0) return;
    const el = modalRef.current;
    if (!el) return;
    const glow = megaOn ? ", bMegaGlow 1.5s ease-in-out infinite" : "";
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "bShake .6s cubic-bezier(.36,.07,.19,.97)" + glow;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeKey]);

  const base = count * COIN_PER_DRAW;
  const megaFee = megaBoostCost(count);
  const finalCount = superOn ? count * count : count;
  const totalCoins = base + (megaOn ? megaFee : 0);

  // Win chances shift toward the 1st prize when Mega Boost is active.
  const chances = megaOn ? { p1: 14, p2: 34, p3: 52 } : { p1: 3, p2: 22, p3: 75 };
  const rows = [
    { img: RARITY_IMG.UR, pct: chances.p1, from: "#8fd3ff", to: "#b9a3ff" },
    { img: RARITY_IMG.SR, pct: chances.p2, from: "#f6c945", to: "#c98a18" },
    { img: RARITY_IMG.N, pct: chances.p3, from: "#dfe3e8", to: "#a9b0b8" },
  ];

  function celebrate(name: string) {
    setActivated(name);
    setShakeKey((k) => k + 1);
    window.setTimeout(() => setActivated((a) => (a === name ? null : a)), 1900);
  }
  function toggleSuper() {
    if (!superAvailable) return;
    setSuperOn((on) => { if (!on) celebrate(L.superName); return !on; });
  }
  function toggleMega() {
    setMegaOn((on) => { if (!on) celebrate(L.megaName); return !on; });
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
      <style>{`
        @keyframes bShake { 0%,100%{transform:translate(0,0) rotate(0)} 12%{transform:translate(-6px,2px) rotate(-1deg)} 26%{transform:translate(6px,-2px) rotate(1deg)} 40%{transform:translate(-5px,1px) rotate(-.8deg)} 56%{transform:translate(5px,-1px) rotate(.8deg)} 72%{transform:translate(-3px,1px) rotate(-.4deg)} 88%{transform:translate(2px,0) rotate(.2deg)} }
        @keyframes bBannerIn { 0%{opacity:0; transform:translateY(-10px) scale(.6)} 16%{opacity:1; transform:translateY(0) scale(1.12)} 30%{transform:translateY(0) scale(1)} 84%{opacity:1; transform:translateY(0)} 100%{opacity:0; transform:translateY(-8px)} }
        @keyframes bGlowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,176,46,.55)} 50%{box-shadow:0 0 0 8px rgba(255,176,46,0)} }
        @keyframes bMegaGlow { 0%,100%{box-shadow:0 18px 48px rgba(0,0,0,.5)} 50%{box-shadow:0 18px 48px rgba(0,0,0,.5)} }
        @keyframes bBurst { 0%{opacity:0; transform:scale(.25)} 14%{opacity:.95} 100%{opacity:0; transform:scale(2.7)} }
        @keyframes bSweep { 0%{opacity:0; transform:translateX(-130%) skewX(-14deg)} 28%{opacity:.85} 100%{opacity:0; transform:translateX(140%) skewX(-14deg)} }
        @keyframes bEmber { 0%{opacity:0; transform:translateY(8px) scale(.6)} 25%{opacity:.9} 100%{opacity:0; transform:translateY(-26px) scale(1)} }
        @keyframes bIconFloat { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-5px) rotate(2deg)} }
        @keyframes bPop { 0%{transform:scale(1)} 30%{transform:scale(1.14)} 60%{transform:scale(.97)} 100%{transform:scale(1)} }
        @keyframes bBounce2 { 0%{transform:translateY(0)} 18%{transform:translateY(-12px)} 36%{transform:translateY(0)} 54%{transform:translateY(-7px)} 72%{transform:translateY(0)} 100%{transform:translateY(0)} }
        @keyframes bNumPop { 0%{transform:scale(1)} 14%{transform:scale(1.75)} 32%{transform:scale(1.5)} 55%{transform:scale(1.62)} 78%{transform:scale(1.5)} 100%{transform:scale(1)} }
      `}</style>

      <div
        ref={modalRef}
        className="relative w-full max-w-[348px] overflow-visible rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition-[background] duration-500"
        style={{
          background: megaOn ? "linear-gradient(160deg,#2a0a0e,#160509)" : "linear-gradient(180deg,#fbf6ff,#ffffff)",
          animation: megaOn ? "bMegaGlow 1.5s ease-in-out infinite" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Activation banner — centred at the top */}
        {activated && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-[70] flex justify-center px-4">
            <div
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2 text-[14px] font-black uppercase tracking-wide text-white"
              style={{
                animation: "bBannerIn 1.9s ease-out both",
                ...(activated === L.megaName
                  ? { background: "linear-gradient(135deg,#ff3d00,#b40206)", boxShadow: "0 8px 24px rgba(180,2,6,.6), 0 0 0 2px rgba(255,200,80,.6)" }
                  : { background: "linear-gradient(135deg,#ffb02e,#ff7a00)", boxShadow: "0 8px 22px rgba(255,140,0,.5)" }),
              }}
            >
              {activated === L.megaName ? "⚡⚡" : "⚡"} {L.activated(activated)}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl">
          {/* Hero pack — transforms to a charged state when Mega Boost is on */}
          <div
            className="relative flex items-center justify-center overflow-hidden py-3 transition-[background] duration-500"
            style={{
              background: megaOn
                ? "radial-gradient(circle at 50% 38%, #4a0f14 0%, #200709 70%, #140406 100%)"
                : "transparent",
            }}
          >
            <DrawPackStack count={Math.min(finalCount, MAX_PACKS)} badge={`×${finalCount}`} />

            {/* Charged effects */}
            {megaOn && (
              <>
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 z-[55] w-1/2"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,220,120,.55), transparent)", animation: "bSweep 2.4s ease-in-out infinite" }}
                />
                {[18, 42, 64, 82].map((l, i) => (
                  <span
                    key={i}
                    className="pointer-events-none absolute bottom-2 z-[55] h-1.5 w-1.5 rounded-full"
                    style={{ left: `${l}%`, background: i % 2 ? "#ffd86b" : "#ff7a2e", boxShadow: "0 0 6px rgba(255,170,60,.9)", animation: `bEmber ${1.6 + i * 0.3}s ease-out ${i * 0.25}s infinite` }}
                  />
                ))}
              </>
            )}

            {/* One-shot energy burst on Mega activation */}
            {activated === L.megaName && (
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 z-[58] block h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,220,120,.95), rgba(255,90,20,.5) 42%, transparent 70%)", animation: "bBurst .85s ease-out forwards" }}
              />
            )}
          </div>

          <div className="px-4 pb-4 pt-3">
            <h3 className="text-center text-[18px] font-extrabold transition-colors duration-500" style={{ color: megaOn ? "#ffffff" : "#1d2129" }}>{L.title}</h3>

            {/* Super Boost */}
            {superAvailable && (
              <BoostToggleRow
                icon="/boost.png"
                title={L.superName}
                desc={L.superDesc}
                right={<span className="rounded-full bg-[#e9f9ef] px-2 py-0.5 text-[10px] font-extrabold text-[#1f9d3a]">{L.free}</span>}
                on={superOn}
                disabled={!superAvailable}
                onToggle={toggleSuper}
                accent="#f5a623"
                glow="#ffb02e"
              />
            )}

            {/* Mega Boost */}
            {megaAvailable && (
              <BoostToggleRow
                icon="/mega-boost.png"
                title={L.megaName}
                desc={L.megaDesc}
                right={<span className="flex items-center gap-1 rounded-full bg-[#fff3d6] px-2 py-0.5 text-[10px] font-extrabold text-[#b45309]"><CoinIcon size={11} />{L.added(megaFee)}</span>}
                on={megaOn}
                disabled={false}
                onToggle={toggleMega}
                accent="#ff3d00"
                glow="#ff5a3c"
              />
            )}

            {/* Win chances (per card design) */}
            <div className="mt-3 rounded-xl p-2.5" style={{ background: "#eef0f3" }}>
              <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wide" style={{ color: "#8a9099" }}>{L.chances}</div>
              <div className="space-y-1.5">
                {rows.map((r, i) => {
                  const first = i === 0;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5"
                      style={{ animation: first && megaOn ? "bPop .55s ease .5s both" : undefined }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.img} alt="" className="h-8 w-auto shrink-0 rounded-[3px] object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full" style={{ background: "#e1e4e8" }}>
                        <span className="block h-full rounded-full transition-[width] duration-[1100ms] ease-out" style={{ width: `${r.pct}%`, background: `linear-gradient(90deg, ${r.from}, ${r.to})`, transitionDelay: megaOn ? "500ms" : "0ms", boxShadow: first && megaOn ? "0 0 8px rgba(255,170,40,.7)" : undefined }} />
                      </div>
                      <AnimatedPct
                        value={r.pct}
                        delay={500}
                        stepMs={first ? 70 : 58}
                        pop={first}
                        className={`shrink-0 text-right font-black transition-all ${first ? (megaOn ? "w-12 text-[19px]" : "w-10 text-[14px]") : "w-9 text-[12px]"}`}
                        style={{ display: "inline-block", color: first && megaOn ? "#d4880a" : "#1d2129", textShadow: first && megaOn ? "0 1px 6px rgba(212,136,10,.4)" : undefined }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary (cleaner, not button-like) */}
            <div className="mt-3 flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ background: "#eef0f3" }}>
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#8a9099" }}>{L.total}</span>
              <span className="flex items-center gap-2">
                <span className="text-[15px] font-black" style={{ color: "#1d2129" }}>{finalCount} {L.cards}</span>
                <span style={{ color: "rgba(0,0,0,.25)" }}>·</span>
                <span className="flex items-center gap-1 text-[15px] font-black" style={{ color: "#1d2129" }}><CoinIcon size={15} />{totalCoins.toLocaleString()}</span>
              </span>
            </div>

            {/* Draw CTA */}
            <button
              onClick={() => onConfirm(finalCount, { superBoost: superOn, megaBoost: megaOn })}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[15px] font-extrabold text-white active:scale-[0.99]"
              style={{
                background: "#B40206",
                boxShadow: "0 4px 14px rgba(180,2,6,0.35)",
                animation: [
                  activated === L.megaName ? "bBounce2 .9s ease" : "",
                  superOn || megaOn ? "bGlowPulse 1.3s ease-out infinite" : "",
                ]
                  .filter(Boolean)
                  .join(", ") || undefined,
              }}
            >
              {L.draw(finalCount)} · <CoinIcon size={15} />{totalCoins.toLocaleString()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoostToggleRow({ icon, title, desc, right, on, disabled, onToggle, accent, glow }: { icon: string; title: string; desc: string; right: React.ReactNode; on: boolean; disabled: boolean; onToggle: () => void; accent: string; glow: string }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="mt-2.5 flex w-full items-center gap-2.5 rounded-2xl p-2 text-left transition disabled:opacity-50"
      style={{ background: on ? `linear-gradient(0deg, ${glow}3d, ${glow}3d), #ffffff` : "#eef0f3" }}
    >
      {/* Icon with a colored 3D glow */}
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${glow}88, transparent 66%)`, filter: "blur(3px)", opacity: on ? 1 : 0.5 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt=""
          className="relative h-[52px] w-[52px] object-contain"
          style={{ filter: `drop-shadow(0 5px 7px rgba(0,0,0,.4)) drop-shadow(0 0 9px ${glow}cc)`, animation: on ? "bIconFloat 2.4s ease-in-out infinite" : undefined }}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="inline-block text-[18px] font-black italic uppercase leading-none tracking-tight"
            style={{ paddingRight: ".18em", color: "#23272f", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.18))" }}
          >
            {title}
          </span>
          {right}
        </div>
        <p className="mt-1 text-[11.5px] font-medium leading-snug text-[#6b7178]">{desc}</p>
      </div>

      {/* Switch */}
      <span className="relative h-7 w-12 shrink-0 rounded-full transition" style={{ background: on ? accent : "#cdd1d6" }}>
        <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)] transition-all" style={{ left: on ? 26 : 4 }} />
      </span>
    </button>
  );
}

function GachaConfirmModal({ lang, count, image, onClose, onConfirm }: { lang: Lang; count: number; image?: string; onClose: () => void; onConfirm: () => void }) {
  const t = STR[lang];
  const price = count * 100;
  const drawLabel = count === 1 ? t.giDraw1 : count === 10 ? t.giDraw10 : t.giDraw100;
  const [tncOpen, setTncOpen] = useState(false);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
      <div className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.45)]" onClick={(e) => e.stopPropagation()}>
        <div className="h-[230px] w-full bg-[#ededf0]">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-5 pb-5 pt-4 text-center">
          <h3 className="text-[19px] font-extrabold text-[#1d2129]">{t.giModalTitle}</h3>
          <p className="mx-auto mt-1.5 max-w-[270px] text-[12px] leading-relaxed text-[#8a9099]">{t.giModalDesc}</p>
          <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-black/10 py-3">
            <span className="flex items-center gap-1.5 text-[17px] font-extrabold text-[#1d2129]"><CoinIcon size={22} />{price.toLocaleString()}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="2.4"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="flex items-center gap-1.5 text-[17px] font-extrabold text-[#B40206]"><CoinIcon size={22} />0</span>
          </div>
          <p className="mt-2 text-[12px] text-[#1d2129]"><button type="button" onClick={() => setTncOpen(true)} className="cursor-pointer font-semibold text-[#B40206] underline">{t.giTnc}</button></p>
          <button onClick={onConfirm} className="mt-3 w-full rounded-lg py-3 text-[15px] font-extrabold text-white active:scale-[0.99]" style={{ background: "#B40206" }}>{drawLabel}</button>
          <div className="my-3 border-t border-dashed border-black/25" />
          <button onClick={onClose} className="w-full rounded-lg border border-black/30 py-3 text-[15px] font-bold text-[#1d2129]">{t.giCancel}</button>
        </div>
      </div>

      {tncOpen && <TermsOverlay lang={lang} onClose={() => setTncOpen(false)} />}
    </div>
  );
}

function TermsOverlay({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[86%] w-full flex-col overflow-hidden rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3">
          <h3 className="text-[16px] font-extrabold text-[#1d2129]">{t.giTncTitle}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {(t.giTncBody as string[]).map((para, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-[#41464e]">{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function GachaAnimation({ count, free, superBoost, megaBoost, onReveal, onDone }: { count: number; rarities?: Rarity[]; free?: boolean; superBoost?: boolean; megaBoost?: boolean; onReveal?: () => void; onDone: () => void }) {
  // Dramatic flow: a tension-building charge, the pack cracking open in a few
  // discrete jolts, a light-flash burst, then a soft white veil that hands the
  // user smoothly into the prize results.
  const tier = count >= 100 ? 100 : count >= 10 ? 10 : 1;
  const STEPS = tier === 100 ? 6 : tier === 10 ? 5 : 4;
  const chargeMs = tier === 100 ? 1900 : tier === 10 ? 1600 : 1300;
  const stepMs = 520;
  const breakMs = STEPS * stepMs;
  const flashMs = 1000;
  const settleMs = 750;
  const totalMs = chargeMs + breakMs + flashMs + settleMs;

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"charge" | "breaking" | "flash" | "settle">("charge");

  // Keep the latest callbacks in refs so the timeline below can run exactly
  // once on mount — without this, calling onReveal() triggers a parent
  // re-render that hands us new callback identities and restarts the whole
  // animation (which made it play twice).
  const onRevealRef = useRef(onReveal);
  const onDoneRef = useRef(onDone);
  onRevealRef.current = onReveal;
  onDoneRef.current = onDone;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("breaking"), chargeMs));
    for (let i = 1; i <= STEPS; i++) timers.push(setTimeout(() => setStep(i), chargeMs + i * stepMs));
    timers.push(setTimeout(() => setPhase("flash"), chargeMs + breakMs));
    // Mount the results underneath while the white veil still covers the screen,
    // so unveiling reveals them with no hard cut.
    timers.push(setTimeout(() => { setPhase("settle"); onRevealRef.current?.(); }, chargeMs + breakMs + flashMs));
    timers.push(setTimeout(() => onDoneRef.current(), totalMs));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Top label: "FREE DRAW" or "×1 / ×10 / ×100".
  const drawLabel = free ? "FREE DRAW" : `×${count}`;

  const sparkles = Array.from({ length: 18 }).map((_, i) => {
    const ang = (i / 18) * Math.PI * 2;
    const r = 90 + (i % 4) * 30;
    return { dx: Math.round(Math.cos(ang) * r), dy: Math.round(Math.sin(ang) * r), d: (i % 6) * 0.12 };
  });
  // Energy motes that stream inward toward the pack during the charge phase.
  const converge = Array.from({ length: 16 }).map((_, i) => {
    const ang = (i / 16) * Math.PI * 2;
    const r = 150 + (i % 5) * 26;
    return { dx: Math.round(Math.cos(ang) * r), dy: Math.round(Math.sin(ang) * r), d: (i % 8) * 0.14 };
  });
  const petals = Array.from({ length: 14 }).map((_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 0.5, dur: 4 + (i % 5), size: 8 + (i % 4) * 4 }));

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden"
      style={{ opacity: phase === "settle" ? 0 : 1, transition: `opacity ${settleMs}ms ease` }}
    >
      <style>{`
        @keyframes gaSky { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes gaRays { to { transform: rotate(360deg); } }
        @keyframes gaRaysRev { to { transform: rotate(-360deg); } }
        @keyframes gaFocus { 0%{opacity:.15; transform:scale(1.4)} 50%{opacity:.5; transform:scale(1)} 100%{opacity:.15; transform:scale(1.4)} }
        @keyframes gaPulse { 0%,100% { transform: scale(.9); opacity:.7 } 50% { transform: scale(1.2); opacity:1 } }
        @keyframes gaChargeOrb { 0%{ transform:scale(0); opacity:0 } 60%{ transform:scale(1.05); opacity:1 } 80%{ transform:scale(.92) } 100%{ transform:scale(40); opacity:0 } }
        @keyframes gaSpin { from{ transform: rotateY(0) } to{ transform: rotateY(1800deg) } }
        @keyframes gaFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes gaRevealCard { 0%{ transform: translateY(40px) scale(.5) rotate(-12deg); opacity:0 } 55%{ opacity:1 } 100%{ transform: translateY(0) scale(1) rotate(0); opacity:1 } }
        @keyframes gaFanIn { 0%{ transform: translateY(60px) scale(.3); opacity:0 } 100%{ transform: translateY(0) scale(1); opacity:1 } }
        @keyframes gaFlash { 0%{ opacity:0 } 35%{ opacity:.98 } 100%{ opacity:0 } }
        @keyframes gaSpark { 0% { transform: translate(0,0) scale(0); opacity:0 } 25% { opacity:1 } 100% { transform: translate(var(--dx),var(--dy)) scale(1.1); opacity:0 } }
        @keyframes gaText { 0%{opacity:0; transform:translateY(14px) scale(.85)} 40%{opacity:1; transform:translateY(0) scale(1.06)} 60%{transform:scale(1)} 100%{opacity:1} }
        @keyframes gaLabelZoom { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.16) } }
        @keyframes gaPetal { 0%{ transform: translateY(-40px) rotate(0); opacity:0 } 12%{opacity:.9} 100%{ transform: translateY(760px) rotate(420deg); opacity:0 } }
        @keyframes gaStreak { 0%{ transform: translateX(-60%) skewX(-18deg); opacity:0 } 40%{opacity:.8} 100%{ transform: translateX(160%) skewX(-18deg); opacity:0 } }
        @keyframes gaHero { 0%{ opacity:0; transform: translate(-50%,-44%) scale(1.14) } 100%{ opacity:.92; transform: translate(-50%,-50%) scale(1) } }
        @keyframes gaHeroFloat { 0%,100%{ transform: translate(-50%,-50%) } 50%{ transform: translate(-50%,-53%) } }
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
        @keyframes gaHeroGlow { 0%,100%{ filter: drop-shadow(0 0 22px rgba(200,110,255,.55)) } 50%{ filter: drop-shadow(0 0 40px rgba(255,180,90,.85)) } }
        @keyframes gaCirclePulse { 0%,100%{ opacity:.45; transform: scale(.97) } 50%{ opacity:.85; transform: scale(1.03) } }
        @keyframes gaBgZoom { 0%{ transform: scale(1.04) } 50%{ transform: scale(1.14) } 100%{ transform: scale(1.04) } }
        @keyframes gaFadeIn { from{ opacity:0 } to{ opacity:1 } }
        @keyframes gaCrackBeam { 0%{ opacity:.2 } 50%{ opacity:1 } 100%{ opacity:.6 } }
        @keyframes gaSeamPulse { 0%,100%{ opacity:.85 } 50%{ opacity:1 } }
        @keyframes gaBoostIn { 0%{ opacity:0; transform: translateY(-22px) scale(.7) } 55%{ opacity:1; transform: translateY(0) scale(1.08) } 100%{ opacity:1; transform: translateY(0) scale(1) } }
      `}</style>

      {/* Animated anime sky */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(125deg,#3a0d6b,#7a1648,#c81d6b,#2a0b3f,#10081f)", backgroundSize: "400% 400%", animation: "gaSky 6s ease infinite" }} />
      {/* Manga focus lines */}
      <div className="absolute h-[150vh] w-[150vh]" style={{ animation: "gaRays 14s linear infinite", background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 2deg, rgba(255,255,255,0) 2deg 6deg)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, #000 60%)", maskImage: "radial-gradient(circle, transparent 18%, #000 60%)" }} />
      <div className="absolute h-[150vh] w-[150vh]" style={{ animation: "gaFocus 2.6s ease-in-out infinite", background: "repeating-conic-gradient(from 0deg, rgba(255,210,90,.16) 0deg 1deg, rgba(255,210,90,0) 1deg 7deg)", WebkitMaskImage: "radial-gradient(circle, transparent 22%, #000 64%)", maskImage: "radial-gradient(circle, transparent 22%, #000 64%)" }} />
      {/* Golden rays */}
      <div className="absolute h-[620px] w-[620px]" style={{ animation: "gaRaysRev 10s linear infinite", background: "conic-gradient(from 0deg, rgba(255,210,80,0) 0deg, rgba(255,210,80,.34) 10deg, rgba(255,210,80,0) 22deg, rgba(255,210,80,.34) 34deg, rgba(255,210,80,0) 46deg, rgba(255,210,80,.34) 58deg, rgba(255,210,80,0) 70deg)", borderRadius: "9999px", WebkitMaskImage: "radial-gradient(circle, #000 24%, transparent 70%)", maskImage: "radial-gradient(circle, #000 24%, transparent 70%)" }} />

      {/* Rotating arcane magic circles */}
      <svg className="pointer-events-none absolute h-[480px] w-[480px]" viewBox="0 0 200 200" style={{ animation: "gaRays 22s linear infinite, gaCirclePulse 3s ease-in-out infinite" }}>
        <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,228,150,.55)" strokeWidth="1.4" strokeDasharray="4 6" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,228,150,.3)" strokeWidth="0.8" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <line key={i} x1={100 + Math.cos(a) * 78} y1={100 + Math.sin(a) * 78} x2={100 + Math.cos(a) * 86} y2={100 + Math.sin(a) * 86} stroke="rgba(255,228,150,.5)" strokeWidth="1" />;
        })}
      </svg>
      <svg className="pointer-events-none absolute h-[330px] w-[330px]" viewBox="0 0 200 200" style={{ animation: "gaRaysRev 16s linear infinite", opacity: 0.6 }}>
        <polygon points="100,16 121,76 184,76 133,113 152,173 100,136 48,173 67,113 16,76 79,76" fill="none" stroke="rgba(255,228,150,.5)" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,228,150,.4)" strokeWidth="1" strokeDasharray="2 7" />
      </svg>

      {/* Rising bokeh orbs */}
      {Array.from({ length: 12 }).map((_, i) => {
        const left = (i * 53) % 100;
        const size = 6 + (i % 4) * 5;
        const delay = (i % 6) * 0.55;
        const dur = 3.4 + (i % 5) * 0.7;
        const hue = i % 3 === 0 ? "rgba(255,225,150,.9)" : i % 3 === 1 ? "rgba(255,150,200,.85)" : "rgba(160,200,255,.85)";
        return <span key={`b${i}`} className="absolute bottom-[-20px] rounded-full" style={{ left: `${left}%`, width: size, height: size, background: `radial-gradient(circle at 30% 30%, #fff, ${hue})`, animation: `gaBokeh ${dur}s ease-in ${delay}s infinite`, filter: "blur(0.3px) drop-shadow(0 0 6px rgba(255,235,170,.7))" }} />;
      })}

      {/* Falling petals */}
      {petals.map((p, i) => (
        <span key={`p${i}`} className="absolute top-0 rounded-full" style={{ left: `${p.left}%`, width: p.size, height: p.size, background: "radial-gradient(circle at 30% 30%, #ffd6ec, #ff77b6)", animation: `gaPetal ${p.dur}s linear ${p.delay}s infinite`, filter: "drop-shadow(0 0 4px rgba(255,150,200,.6))" }} />
      ))}
      {/* Speed streaks */}
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={`s${i}`} className="absolute h-[3px] w-1/2 rounded-full bg-white/70" style={{ top: `${18 + i * 20}%`, animation: `gaStreak ${1.1 + i * 0.2}s ease-in ${i * 0.25}s infinite` }} />
      ))}

      {/* Anime hero backdrop (full-bleed, slow Ken-Burns motion) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gacha-bg.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ animation: "gaFadeIn .6s ease both, gaBgZoom 12s ease-in-out infinite" }} />
      {/* Vignette so the pack stays readable over the busy artwork */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 30%, rgba(0,0,0,.35) 72%, rgba(0,0,0,.6) 100%)" }} />

      {/* Central glow */}
      <div className="absolute h-[300px] w-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,230,140,.55), rgba(255,150,40,0) 70%)", animation: "gaPulse 1.3s ease-in-out infinite" }} />

      {/* Active boost callout — big exciting text under the draw label */}
      {(superBoost || megaBoost) && phase !== "settle" && (
        <div className="absolute top-[158px] left-0 right-0 z-[65] flex flex-col items-center gap-1.5" style={{ animation: "gaBoostIn .7s cubic-bezier(.2,.8,.2,1) both" }}>
          {superBoost && (
            <span className="text-[27px] font-black italic uppercase leading-none tracking-wide text-[#ffd24a]" style={{ textShadow: "0 2px 10px rgba(255,140,20,.95), 0 0 24px rgba(255,160,40,.75)", animation: "gaLabelZoom 1.6s ease-in-out infinite" }}>Super Boost</span>
          )}
          {megaBoost && (
            <span className="text-[27px] font-black italic uppercase leading-none tracking-wide text-[#ff6168]" style={{ textShadow: "0 2px 10px rgba(200,6,26,.95), 0 0 24px rgba(255,60,60,.75)", animation: "gaLabelZoom 1.6s ease-in-out .2s infinite" }}>Mega Boost</span>
          )}
        </div>
      )}

      {/* Charge phase: the pack flies in while energy gathers around it */}
      {phase === "charge" && (
        <div className="relative flex items-center justify-center">
          {/* Pulsing aura */}
          <span className="pointer-events-none absolute h-[280px] w-[280px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,235,150,.6), rgba(255,150,40,0) 68%)", animation: "gaAura 1s ease-in-out infinite" }} />
          {/* Inbound energy motes */}
          {converge.map((c, i) => (
            <span key={i} className="absolute h-2 w-2 rounded-full bg-white" style={{ ["--dx" as string]: `${c.dx}px`, ["--dy" as string]: `${c.dy}px`, animation: `gaConverge ${0.9 + c.d}s ease-in ${c.d}s infinite`, boxShadow: "0 0 8px 2px rgba(255,235,160,.95)" }} />
          ))}
          <div className="relative" style={{ animation: "gaPackIn 700ms cubic-bezier(.2,.8,.2,1) both, gaChargeShake 240ms ease-in-out 760ms infinite", filter: "drop-shadow(0 0 40px rgba(255,210,120,.9))" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pack.png" alt="" className="h-[300px] w-auto" draggable={false} />
          </div>
        </div>
      )}

      {/* Breaking phase: a fracture spreads across the whole pack in every
          direction, light bleeding through the cracks, jolt by jolt */}
      {phase === "breaking" && (
        <div className="relative flex items-center justify-center" style={{ animation: "gaPackBob 1.3s ease-in-out infinite" }}>
          {/* Jolt wrapper re-mounts each step to retrigger the shake + spread */}
          {(() => {
            const prog = step / STEPS;
            const glow = 0.3 + prog * 0.7;
            return (
              <div key={step} className="relative" style={{ width: 212, height: 300, animation: "gaPackJolt 460ms cubic-bezier(.36,.07,.19,.97) both", filter: `drop-shadow(0 0 ${22 + step * 9}px rgba(255,205,110,.9))` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pack.png" alt="" className="absolute inset-0 m-auto h-[300px] w-auto" draggable={false} />

                {/* Light building up inside, leaking through the cracks */}
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ width: "150%", height: "120%", background: "radial-gradient(ellipse 40% 55% at 50% 48%, rgba(255,255,255,.9), rgba(255,230,140,.45) 48%, rgba(255,200,80,0) 74%)", opacity: glow * 0.85, mixBlendMode: "screen", animation: "gaCrackBeam 460ms ease-out both" }}
                />

                {/* Real crack art spreading from the centre outward. Revealed
                    vertically so it propagates up & down like a true fracture. */}
                <div
                  className="pointer-events-none absolute inset-0 m-auto"
                  style={{ width: 212, height: 300, clipPath: `inset(${(1 - prog) * 50}% 0% ${(1 - prog) * 50}% 0%)` }}
                >
                  {/* dark fissure edges */}
                  <div className="absolute inset-0" style={{ background: "#0a0014", transform: "scale(1.06)", filter: "blur(0.5px)", WebkitMaskImage: "url(/crack-mask.png)", maskImage: "url(/crack-mask.png)", WebkitMaskSize: "auto 100%", maskSize: "auto 100%", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }} />
                  {/* glowing light bursting through the crack */}
                  <div className="absolute inset-0" style={{ background: "#ffffff", opacity: glow, animation: "gaSeamPulse 600ms ease-in-out infinite", filter: "drop-shadow(0 0 6px rgba(255,235,160,1)) drop-shadow(0 0 16px rgba(255,200,90,.85))", WebkitMaskImage: "url(/crack-mask.png)", maskImage: "url(/crack-mask.png)", WebkitMaskSize: "auto 100%", maskSize: "auto 100%", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }} />
                </div>

                {/* Bright flash burst from the impact on each jolt */}
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,1), rgba(255,220,120,0) 70%)", animation: "gaCrackPop 460ms ease-out both" }} />
              </div>
            );
          })()}
        </div>
      )}

      {/* Flash phase: pack splits in two, big light flash, off to results */}
      {phase === "flash" && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: `gaBurstFlash ${flashMs}ms ease-out forwards` }} />
          {/* Expanding shockwave ring */}
          <span className="pointer-events-none absolute h-[260px] w-[260px] rounded-full" style={{ border: "6px solid rgba(255,235,160,.9)", animation: "gaShock 700ms ease-out forwards", boxShadow: "0 0 40px rgba(255,210,120,.8)" }} />
          {/* Two halves of the pack flying apart */}
          <div className="relative h-[300px]" style={{ width: 212 }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ clipPath: "inset(0 50% 0 0)", animation: "gaSplitL 700ms cubic-bezier(.4,0,.6,1) forwards" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pack.png" alt="" className="h-[300px] w-auto" draggable={false} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ clipPath: "inset(0 0 0 50%)", animation: "gaSplitR 700ms cubic-bezier(.4,0,.6,1) forwards" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pack.png" alt="" className="h-[300px] w-auto" draggable={false} />
            </div>
          </div>
          {sparkles.map((s, i) => (
            <span key={i} className="absolute h-2.5 w-2.5 rounded-full bg-white" style={{ ["--dx" as string]: `${s.dx}px`, ["--dy" as string]: `${s.dy}px`, animation: `gaSpark ${1.1 + s.d}s ease-out ${s.d}s`, boxShadow: "0 0 10px 3px rgba(255,235,160,.95)" }} />
          ))}
        </>
      )}

      {/* Settle phase: a white veil that fades out as the results emerge */}
      {phase === "settle" && <div className="pointer-events-none absolute inset-0 bg-white" />}

      {/* Top draw-count / free-draw label */}
      <div className="absolute top-[60px] left-0 right-0 flex flex-col items-center text-center" style={{ animation: "gaText .7s ease both" }}>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.42em] text-white/85">{free ? "Gacha" : "Draw"}</span>
        <span
          className="mt-1 inline-block whitespace-nowrap rounded-xl px-5 py-1.5 font-black italic leading-none tracking-[0.04em] text-white text-center"
          style={{ fontSize: free ? 30 : 34, background: "linear-gradient(135deg,#ff3b4e,#B40206)", border: "2px solid rgba(255,255,255,.85)", boxShadow: "0 4px 18px rgba(230,0,18,.6)", textShadow: "0 2px 8px rgba(120,0,10,.6)", animation: "gaLabelZoom 1.5s ease-in-out infinite" }}
        >
          {drawLabel}
        </span>
      </div>

      {/* Phase text */}
      <p className="absolute bottom-[80px] text-center text-[30px] font-black italic tracking-[0.14em] text-white" style={{ animation: "gaText .7s ease both", textShadow: "0 2px 16px rgba(255,180,60,.85)" }}>
        {phase === "charge" ? "CHARGING…" : phase === "breaking" ? "OPENING…" : phase === "flash" ? "OPEN!!" : ""}
      </p>
    </div>
  );
}

function GachaResult({ lang, coins, setCoins, prizes, shippingAddresses, onShippingAddressesChange, onBack, onHome }: { lang: Lang; coins: number; setCoins: Dispatch<SetStateAction<number>>; prizes: WonPrize[]; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [won, setWon] = useState<WonPrize[]>(prizes);
  const [exchangePile, setExchangePile] = useState<Set<string>>(new Set());
  const [shipPile, setShipPile] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("coinDesc");
  const [sortOpen, setSortOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [listShipOpen, setListShipOpen] = useState(false);
  // List-view tier filter (mirrors the swipe deck's chip row).
  const [listFilter, setListFilter] = useState<"all" | Rarity>("all");
  // Bumped to reset the swipe deck's tier-chip selection after an action.
  const [chipResetN, setChipResetN] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Auto-bulk prompt shown when the only prizes left are Silver (rarity "N").
  const [silverBulkOpen, setSilverBulkOpen] = useState(false);
  const [silverBulkDismissed, setSilverBulkDismissed] = useState(false);

  // Reset the list whenever a fresh draw arrives.
  // Note: listSelected is intentionally NOT cleared here. The SwipeDeck reports
  // the top-card (or tier) selection up via reportDeckSelection; clearing it in
  // this effect (which runs after the deck's effect) would wipe that default and
  // leave the CTAs inactive on a fresh draw.
  useEffect(() => { setWon(prizes); setExchangePile(new Set()); setShipPile(new Set()); setSilverBulkOpen(false); setSilverBulkDismissed(false); setListFilter("all"); }, [prizes]);

  function pushToast(text: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);
  }

  const sortedWon = useMemo(() => {
    const arr = [...won];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "coinDesc": return b.coinValue - a.coinValue;
        case "coinAsc": return a.coinValue - b.coinValue;
        case "wonNew": return b.wonAt - a.wonAt;
        case "wonOld": return a.wonAt - b.wonAt;
        case "expSoon": return expiresAt(a.wonAt) - expiresAt(b.wonAt);
      }
    });
    return arr;
  }, [won, sortKey]);

  const deckPrizes = sortedWon.filter((p) => !exchangePile.has(p.id) && !shipPile.has(p.id));
  // Swipe-page CTAs act on the UNION of swiped piles and chip/Select-all
  // selection (listSelected). Swiped cards leave the deck, and onSwipe removes
  // them from the selection, so the two sets never overlap. A selected card
  // commits to exchange or shipping depending on which CTA the user presses.
  const exchangePrizes = won.filter((p) => exchangePile.has(p.id) || listSelected.has(p.id));
  const shipPrizes = won.filter((p) => shipPile.has(p.id) || listSelected.has(p.id));
  const exchangeTotal = exchangePrizes.reduce((s, p) => s + p.coinValue, 0);
  const shipTotal = shipPrizes.reduce((s, p) => s + p.coinValue, 0);
  const canShip = shipTotal >= SHIP_MIN_COINS;
  const shipShortfall = Math.max(0, SHIP_MIN_COINS - shipTotal);

  function onSwipe(items: WonPrize[], dir: "left" | "right") {
    const ids = items.map((p) => p.id);
    if (dir === "right") setExchangePile((prev) => { const n = new Set(prev); ids.forEach((i) => n.add(i)); return n; });
    else setShipPile((prev) => { const n = new Set(prev); ids.forEach((i) => n.add(i)); return n; });
    // A swiped card commits its intent (exchange/ship), so drop it from the
    // intent-agnostic selection to avoid double-counting across both CTAs.
    setListSelected((prev) => { if (prev.size === 0) return prev; const n = new Set(prev); ids.forEach((i) => n.delete(i)); return n; });
  }
  function clearPiles() {
    setExchangePile(new Set());
    setShipPile(new Set());
  }

  function doConvert() {
    const ids = new Set<string>([...exchangePile, ...listSelected]);
    const n = ids.size;
    setCoins((c) => c + exchangeTotal);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setExchangePile(new Set());
    setListSelected(new Set());
    setChipResetN((k) => k + 1);
    setConvertOpen(false);
    pushToast(t.toastConverted(n, exchangeTotal));
  }

  function doShip() {
    const ids = new Set<string>([...shipPile, ...listSelected]);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setShipPile(new Set());
    setListSelected(new Set());
    setChipResetN((k) => k + 1);
    setShipOpen(false);
    pushToast(t.toastShipReq);
  }

  // --- List view (alternate to swiping): select cards, then exchange or ship ---
  const listSelectedPrizes = won.filter((p) => listSelected.has(p.id));
  const listTotal = listSelectedPrizes.reduce((s, p) => s + p.coinValue, 0);
  const listCanShip = listTotal >= SHIP_MIN_COINS;
  const listShortfall = Math.max(0, SHIP_MIN_COINS - listTotal);

  function listToggle(id: string) {
    setListSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  // Tier counts + filtered view backing the list-view chip row.
  const listCounts: Record<"all" | Rarity, number> = { all: sortedWon.length, UR: 0, SR: 0, N: 0 };
  sortedWon.forEach((p) => { listCounts[p.rarity] += 1; });
  const listFiltered = listFilter === "all" ? sortedWon : sortedWon.filter((p) => p.rarity === listFilter);
  const visibleAllSelected = listFiltered.length > 0 && listFiltered.every((p) => listSelected.has(p.id));
  // "Select all" toggles the currently-visible (filtered) cards: if all are
  // already selected it deselects them, otherwise it selects them — keeping any
  // selection that lives outside the current filter untouched.
  function listSelectAll() {
    setListSelected((prev) => {
      const n = new Set(prev);
      if (visibleAllSelected) listFiltered.forEach((p) => n.delete(p.id));
      else listFiltered.forEach((p) => n.add(p.id));
      return n;
    });
  }
  function listReset() { setListSelected(new Set()); }
  // Stable identity so SwipeDeck's selection-report effect fires only when its
  // own selection changes — not on every parent render. Without this, the deck
  // (mounted under the list-view overlay) cleared listSelected on every render,
  // so list-view taps never stuck and exchange had nothing selected to remove.
  const reportDeckSelection = useCallback((ids: string[]) => { setListSelected(new Set(ids)); }, []);
  function listExchange() {
    if (listSelected.size === 0) return;
    const ids = new Set(listSelected);
    const n = ids.size;
    setCoins((c) => c + listTotal);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setListSelected(new Set());
    setChipResetN((k) => k + 1);
    pushToast(t.toastConverted(n, listTotal));
  }
  function doListShip() {
    const ids = new Set(listSelected);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setListSelected(new Set());
    setChipResetN((k) => k + 1);
    setListShipOpen(false);
    pushToast(t.toastShipReq);
  }

  // Silver = lowest tier (rarity "N"). When the list view is open and every
  // remaining prize is Silver, auto-select them all and offer a one-tap bulk
  // exchange. Dismissing keeps the selection but stops the popup reappearing.
  const silverPrizes = won.filter((p) => p.rarity === "N");
  const silverTotal = silverPrizes.reduce((s, p) => s + p.coinValue, 0);
  // Show the bulk prompt whenever Silver cards are present and no Ultra card
  // remains (i.e. only Silver, or a Silver + Gold mix). Gold cards no longer
  // suppress it. Auto-selection still targets Silver only, so Gold stays kept.
  const hasUltraLeft = won.some((p) => p.rarity === "UR");
  const showSilverBulk = silverPrizes.length > 0 && !hasUltraLeft;

  useEffect(() => {
    if (viewAllOpen && showSilverBulk && !silverBulkDismissed) {
      setListSelected(new Set(won.filter((p) => p.rarity === "N").map((p) => p.id)));
      setSilverBulkOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAllOpen, showSilverBulk, silverBulkDismissed]);

  function silverBulkExchangeNow() {
    setSilverBulkOpen(false);
    setSilverBulkDismissed(true);
    listExchange();
  }
  function silverBulkClose() {
    setSilverBulkOpen(false);
    setSilverBulkDismissed(true);
  }
  // Unbundle: drop the auto-selection so the player can pick cards one by one
  // (deselecting a large bundle by hand would be a mess). Dismissed so it stays
  // unbundled; the SwipeDeck selKey is unchanged, so nothing re-selects.
  function silverBulkUnbundle() {
    setSilverBulkOpen(false);
    setSilverBulkDismissed(true);
    setListSelected(new Set());
  }

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.gachaResultTitle}</h2>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {won.length === 0 ? (
          <EmptyState icon="🎉" title={t.deckEmpty} subtitle={t.deckEmptySub} />
        ) : (
          <SwipeDeck deck={deckPrizes} onSwipe={onSwipe} t={t} lang={lang} selectionMode onSelectionChange={reportDeckSelection} resetSignal={chipResetN} />
        )}
      </div>

      {won.length > 0 && (
        <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-[#8a9099]">{t.deckSorted}</span>
            <button
              onClick={() => { clearPiles(); setListSelected(new Set()); setChipResetN((k) => k + 1); }}
              className="text-[#8a9099] underline"
            >
              {t.reset}
            </button>
          </div>
          {/* One unified bar: CTAs act on swiped piles + chip/Select-all selection. */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={shipPrizes.length === 0}
              onClick={() => {
                if (shipPrizes.length === 0) return;
                if (!canShip) { pushToast(t.toastShort(shipShortfall)); return; }
                setShipOpen(true);
              }}
              className="rounded-xl border-2 py-2 text-[12.5px] font-bold leading-tight transition disabled:opacity-40"
              style={{ borderColor: "#f5670a", color: "#f5670a", background: "#fff", opacity: shipPrizes.length === 0 || canShip ? 1 : 0.6 }}
            >
              ← {t.requestShipping} · {shipPrizes.length}
              <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{shipTotal.toLocaleString()} coins</span>
            </button>
            <button
              disabled={exchangePrizes.length === 0}
              onClick={() => { if (exchangePrizes.length === 0) return; setConvertOpen(true); }}
              className="rounded-xl py-2 text-[12.5px] font-bold leading-tight text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)" }}
            >
              {t.exchange} · {exchangePrizes.length} →
              <span className="mt-0.5 block text-[10px] font-semibold opacity-90">{exchangeTotal.toLocaleString()} coins</span>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10.5px] leading-tight text-[#8a9099]">
            {shipPrizes.length === 0 && exchangePrizes.length === 0 ? t.helperNone : canShip ? t.helperReady : t.helperShort(shipShortfall)}
          </p>
          <button onClick={() => setViewAllOpen(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-[#f6f7f9] py-2 text-[12.5px] font-bold text-[#41464e] active:scale-[0.99]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
            {t.viewAll} · {won.length}
          </button>
        </div>
      )}

      {sortOpen && (
        <BottomSheet title={t.sortTitle} onClose={() => setSortOpen(false)}>
          {SORT_KEYS.map((key) => (
            <button key={key} onClick={() => { setSortKey(key); setSortOpen(false); }} className="flex w-full items-center justify-between border-b border-black/5 py-3 text-left text-[14px]">
              <span className={sortKey === key ? "font-bold text-[#1d2129]" : "text-[#41464e]"}>{t.sortLabels[key]}</span>
              {sortKey === key && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          ))}
        </BottomSheet>
      )}

      {convertOpen && (
        <CenterModal onClose={() => setConvertOpen(false)}>
          <h3 className="text-center text-[16px] font-bold text-[#1d2129]">{t.convertTitle}</h3>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5c626b]">
            {t.convertQuestion(exchangePrizes.length, exchangeTotal)}
          </p>
          <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-semibold text-[#B40206]">
            {t.cantUndo}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setConvertOpen(false)} className="rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#5c626b]">{t.cancel}</button>
            <button onClick={doConvert} className="rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "linear-gradient(180deg,#ff2233,#B40206)" }}>{t.exchangeBtn}</button>
          </div>
        </CenterModal>
      )}

      {shipOpen && (
        <ShippingFlow
          prizes={shipPrizes}
          total={shipTotal}
          onClose={() => setShipOpen(false)}
          onConfirm={doShip}
          t={t}
          lang={lang}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
        />
      )}

      {/* Shipping flow for tier-chip selection on the swipe view (overlay closed). */}
      {listShipOpen && !viewAllOpen && (
        <ShippingFlow
          prizes={listSelectedPrizes}
          total={listTotal}
          onClose={() => setListShipOpen(false)}
          onConfirm={doListShip}
          t={t}
          lang={lang}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
        />
      )}

      {viewAllOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#f5f6f8]">
          <header className="shrink-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
              <BrandLogo onClick={onHome} />
              <BalancePill coins={coins} t={t} />
            </div>
            <div className="flex items-center gap-2 px-3 pb-3">
              <button onClick={() => setViewAllOpen(false)} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h2 className="text-[17px] font-extrabold text-[#1d2129]">{t.viewAll} · {won.length}</h2>
            </div>
          </header>

          {/* Tier filter chips (mirror the swipe deck's chip row) */}
          {won.length > 0 && (
            <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto border-b border-black/10 bg-white px-3 py-2">
              {([
                { key: "all", label: t.deckAll, n: listCounts.all },
                { key: "UR", label: t.prizeTier(1), n: listCounts.UR },
                { key: "SR", label: t.prizeTier(2), n: listCounts.SR },
                { key: "N", label: t.prizeTier(3), n: listCounts.N },
              ] as { key: "all" | Rarity; label: string; n: number }[])
                .filter((c) => c.key === "all" || c.n > 0)
                .map((c) => {
                  const on = listFilter === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => {
                        if (c.key === "all") {
                          // Already showing all with everything selected → deselect.
                          if (listFilter === "all" && visibleAllSelected) setListSelected(new Set());
                          else setListFilter("all");
                        } else {
                          setListFilter((f) => (f === c.key ? "all" : c.key));
                        }
                      }}
                      className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition"
                      style={{ background: on ? "#B40206" : "#fff", color: on ? "#fff" : "#5c626b", border: `1.5px solid ${on ? "#B40206" : "rgba(0,0,0,0.1)"}` }}
                    >
                      {c.label}<span className="ml-1 opacity-75">{c.n}</span>
                    </button>
                  );
                })}
              <button
                onClick={listSelectAll}
                className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition"
                style={{ background: visibleAllSelected ? "#1d2129" : "#fff", color: visibleAllSelected ? "#fff" : "#1d2129", border: "1.5px solid rgba(0,0,0,0.12)" }}
              >
                {t.selectAll}
              </button>
            </div>
          )}

          {/* Sort row */}
          <div className="flex shrink-0 items-center justify-end border-b border-black/10 bg-white px-4 py-2">
            <button onClick={() => setSortOpen(true)} className="flex items-center gap-1 text-[12px] font-semibold text-[#1d2129]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" /></svg>
              {t.sortLabels[sortKey]}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>

          {/* List */}
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {won.length === 0 ? (
              <EmptyState icon="🎉" title={t.deckEmpty} subtitle={t.deckEmptySub} />
            ) : (
              <div className="space-y-3">
                {listFiltered.map((p) => {
                  const isSel = listSelected.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => listToggle(p.id)}
                      className="flex gap-3 overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                      style={{ border: isSel ? "2px solid #f97316" : "2px solid transparent", cursor: "pointer" }}
                    >
                      <div className="shrink-0 p-2"><PrizeArt rarity={p.rarity} /></div>
                      <div className="flex min-w-0 flex-1 flex-col py-2.5 pr-3">
                        <div className="flex items-center gap-1">
                          {isSel ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#f97316]">
                              {t.itemsSelected}
                              <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#f97316" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8a9099]">
                              {t.itemsNotSelected}
                              <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="none" stroke="#8a9099" strokeWidth="1.5" /></svg>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[13.5px] font-extrabold leading-tight text-[#1d2129]">{locName(p, lang)}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#5c626b]">{locDesc(p, lang)}</p>
                        <div className="mt-1.5"><CoinChip value={p.coinValue} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {won.length > 0 && <div className="-mx-3 mt-3"><SiteFooter t={t} /></div>}
          </div>

          {/* Bottom bar — aligned with the swipe confirm bar */}
          {won.length > 0 && (
            <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-[#8a9099]">{t.deckSorted}</span>
                <div className="flex items-center gap-3">
                  <button onClick={listSelectAll} className="text-[#8a9099] underline">{t.itemsSelectAll}</button>
                  <button onClick={listReset} className="text-[#8a9099] underline">{t.itemsReset}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={listSelected.size === 0}
                  onClick={() => { if (listSelected.size === 0) return; if (!listCanShip) { pushToast(t.toastShort(listShortfall)); return; } setListShipOpen(true); }}
                  className="rounded-xl border-2 py-2 text-[12.5px] font-bold leading-tight transition disabled:opacity-40"
                  style={{ borderColor: "#f5670a", color: "#f5670a", background: "#fff", opacity: listSelected.size === 0 || listCanShip ? 1 : 0.6 }}
                >
                  ← {t.requestShipping} · {listSelected.size}
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{listTotal.toLocaleString()} coins</span>
                </button>
                <button
                  disabled={listSelected.size === 0}
                  onClick={listExchange}
                  className="rounded-xl py-2 text-[12.5px] font-bold leading-tight text-white transition disabled:opacity-40"
                  style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)" }}
                >
                  {t.exchange} · {listSelected.size} →
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-90">{listTotal.toLocaleString()} coins</span>
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10.5px] leading-tight text-[#8a9099]">
                {listSelected.size === 0 ? t.helperNone : listCanShip ? t.helperReady : t.helperShort(listShortfall)}
              </p>
            </div>
          )}

          {silverBulkOpen && (
            <CenterModal onClose={silverBulkClose}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(180deg,#e6e9ee,#c2c8d0)" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>
                </div>
                <h3 className="mt-3 text-[16px] font-extrabold text-[#1d2129]">{t.silverBulkTitle}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#5c626b]">{t.silverBulkBody(silverPrizes.length, silverTotal)}</p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={silverBulkExchangeNow}
                  className="rounded-xl py-2.5 text-[13px] font-bold text-white"
                  style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)" }}
                >
                  {t.silverBulkCta} · {silverTotal.toLocaleString()} →
                </button>
                <button onClick={silverBulkUnbundle} className="rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#5c626b]">{t.silverBulkPick}</button>
              </div>
            </CenterModal>
          )}

          {listShipOpen && (
            <ShippingFlow
              prizes={listSelectedPrizes}
              total={listTotal}
              onClose={() => setListShipOpen(false)}
              onConfirm={doListShip}
              t={t}
              lang={lang}
              shippingAddresses={shippingAddresses}
              onShippingAddressesChange={onShippingAddressesChange}
            />
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

const PROMO_IMAGES = ["/carousel-1.png", "/carousel-2.png", "/carousel-3.png"];

function PromoCarousel() {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);
  const n = PROMO_IMAGES.length;

  // Auto-advance to the right every 2s (idx walks into a cloned first slide
  // for a seamless wrap, then snaps back without animation).
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => i + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Re-enable the transition after a silent reset to the real first slide.
  useEffect(() => {
    if (!anim) {
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
      return () => cancelAnimationFrame(r);
    }
  }, [anim]);

  const activeDot = idx % n;
  const slides = [...PROMO_IMAGES, PROMO_IMAGES[0]];

  return (
    <div>
      <div className="aspect-[8/3] overflow-hidden rounded-2xl">
        <div
          className="flex h-full"
          style={{
            transform: `translateX(-${idx * 100}%)`,
            transition: anim ? "transform 850ms cubic-bezier(0.22,0.61,0.36,1)" : "none",
          }}
          onTransitionEnd={() => {
            if (idx === n) {
              setAnim(false);
              setIdx(0);
            }
          }}
        >
          {slides.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="h-full w-full shrink-0 object-cover" />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {PROMO_IMAGES.map((_, i) => {
          const on = i === activeDot;
          return (
            <button
              key={i}
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => {
                setAnim(true);
                setIdx(i);
              }}
              className="h-1.5 rounded-full transition-all"
              style={{ width: on ? 16 : 6, background: on ? "#B40206" : "#cfd3da" }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RewardBanner({ t, onSelect }: { t: Dict; onSelect?: (key: RewardKey) => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.12)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/reward-banner.png" alt={t.rewardHeadline} className="block w-full" />
      {/* Clickable hotspots over the bottom reward-icon row */}
      <div className="absolute inset-x-0 bottom-0 flex items-end px-[1%] pb-[1%]" style={{ height: "48%" }}>
        {REWARDS.map((r) => (
          <button key={r.key} onClick={() => onSelect?.(r.key)} aria-label={t[r.key]} className="h-full flex-1 rounded-full active:opacity-70" />
        ))}
      </div>
    </div>
  );
}

/* ── MB-style home hero ─────────────────────────────────────────────────
   Rank strip (Bronze → Silver XP) above a taller promo carousel with two
   floating icon columns, mirroring the MB reference layout:
   left = timed Daily Bonus; right = Daily Box (badge) / Quest / First bonus.
   Replaces the static reward-banner row (Invite stays in My Page/quests). */

/* Metallic tier medallion: bronze/silver coin with an embossed star and the
   tier name beneath. `next` marks the tier being progressed toward. */
function RankMedallion({ tone, label, next = false }: { tone: "bronze" | "silver"; label: string; next?: boolean }) {
  const grad = tone === "bronze"
    ? "linear-gradient(160deg,#f0b27a 0%,#cd7f32 48%,#7a4a1d 100%)"
    : "linear-gradient(160deg,#ffffff 0%,#c9ced6 48%,#8b94a3 100%)";
  return (
    <span className="flex shrink-0 flex-col items-center" style={{ opacity: next ? 0.92 : 1 }}>
      <span
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
        style={{ background: grad, border: "2px solid rgba(255,255,255,0.5)", boxShadow: "0 3px 8px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.35)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.1 6.1-.7z" fill="rgba(255,255,255,0.94)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
        </svg>
      </span>
      <span className="mt-[1px] text-[8px] font-extrabold uppercase tracking-wide text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{label}</span>
    </span>
  );
}

function RankStrip({ t, onOpen }: { t: Dict; onOpen?: () => void }) {
  // POC: fixed rank progress (5/10 pt from Bronze toward Silver).
  // The bar is deliberately static — no fill/sheen animation.
  const pts = 5, next = 10;
  const pct = (pts / next) * 100;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t.mpCurrentRank}: ${t.mpRankBronze} — ${t.heroPts(pts, next)} — ${t.loyaltyNextTier}: ${t.loyaltySilver}`}
      className="relative block h-[50px] w-full transition-transform active:scale-[0.99]"
    >
      {/* Gold-framed bar pill spanning between the medallion centres — its
          ends tuck underneath the medallions (bar starts/finishes within the
          icons, reference layout). */}
      <span
        className="absolute inset-x-[19px] top-[6px] block h-[26px] rounded-full p-[2px] shadow-[0_5px_14px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(180deg,#ffe08a,#c9a84c 55%,#7d5f1a)" }}
      >
        <span
          className="relative block h-full w-full overflow-hidden rounded-full bg-[#12070a]"
          style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.05)" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={next}
          aria-valuenow={pts}
        >
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(180deg,#5ff08a 0%,#2ecc71 45%,#128a43 100%)", boxShadow: "0 0 8px rgba(62,220,120,0.5)" }}>
            <span className="absolute inset-x-1 top-[2px] h-[5px] rounded-full bg-white/35" />
            {pct > 0 && pct < 100 && (
              <span className="absolute -right-[2px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[#eafff0]" style={{ boxShadow: "0 0 7px 2px rgba(150,255,190,0.8)" }} />
            )}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}>
            {t.heroPts(pts, next)}
          </span>
        </span>
      </span>
      {/* Medallions sit on top of the bar ends, larger than the bar */}
      <span className="absolute left-0 top-0"><RankMedallion tone="bronze" label={t.mpRankBronze} /></span>
      <span className="absolute right-0 top-0"><RankMedallion tone="silver" label={t.loyaltySilver} next /></span>
    </button>
  );
}

/* Chunky beveled "game UI" label: gold gradient fill clipped to the glyphs,
   dark outline + drop built from stacked drop-shadows (MB-style type). */
const HERO_LABEL_STYLE: React.CSSProperties = {
  backgroundImage: "linear-gradient(180deg,#fff7d1 0%,#ffd23f 42%,#f6a821 58%,#ffe98a 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter:
    "drop-shadow(0 1.2px 0 #3a1204) drop-shadow(0 -1px 0 #3a1204) drop-shadow(1px 0 0 #3a1204) drop-shadow(-1px 0 0 #3a1204) drop-shadow(0 2px 3px rgba(0,0,0,0.55))",
};

function HeroBadge({ img, label, badge, onClick }: { img: string; label: string; badge?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="relative flex w-[80px] flex-col items-center transition-transform active:scale-90">
      {/* Free-floating art IS the button (MB-style — no containing frame) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="h-[72px] w-[72px] object-contain drop-shadow-[0_7px_12px_rgba(0,0,0,0.5)]" />
      <span className="-mt-1 max-w-[80px] text-center text-[11.5px] font-black uppercase leading-[0.95] tracking-tight" style={HERO_LABEL_STYLE}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-0 z-10 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white/85 bg-gradient-to-b from-[#ff5a5f] to-[#B40206] px-1 text-[11px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]">{badge}</span>
      )}
    </button>
  );
}

function HomeHero({ t, onReward, onOpenStore, onChain, onRank, onDraw, showRank = true }: { t: Dict; onReward?: (key: RewardKey) => void; onOpenStore?: () => void; onChain?: () => void; onRank?: () => void; onDraw?: () => void; showRank?: boolean }) {
  // Daily-bonus claim-window countdown. Starts from a fixed value so SSR and
  // the first client render match, then ticks once mounted (POC only — not
  // wired to a real reset time).
  const [secsLeft, setSecsLeft] = useState(12 * 60 + 39);
  useEffect(() => {
    const id = setInterval(() => setSecsLeft((s) => (s > 0 ? s - 1 : 12 * 60 + 39)), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.15)]">
      {/* Hero banner image — placeholder for a client-supplied asset. Keeps the
          same 10/11 ratio + overlay UI; drop in a real image later. */}
      <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-black/10 bg-[linear-gradient(135deg,#eef0f3,#e2e5ea)]">
        <div className="flex flex-col items-center gap-2 text-[#a2a8b0]">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[12px] font-bold uppercase tracking-wide">Banner image</span>
        </div>
      </div>
      {/* Legibility gutters for the icon columns over any future artwork */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[88px] bg-gradient-to-r from-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[88px] bg-gradient-to-l from-black/10 to-transparent" />

      <div className="relative" style={{ aspectRatio: "10 / 11" }}>
        {/* Rank progress (Bronze → Silver), MB-style top strip.
            Hidden on the logged-out landing — an anonymous visitor has no rank. */}
        {showRank && (
          <div className="absolute left-1/2 top-2.5 z-10 w-[74%] -translate-x-1/2">
            <RankStrip t={t} onOpen={onRank} />
          </div>
        )}

        {/* Left column: timed Daily Bonus (mirrors MB's timed collectible) */}
        <div className="absolute left-2.5 z-10 flex flex-col items-center" style={{ top: showRank ? 78 : 14 }}>
          <HeroBadge img="/hero-ic-daily.png" label={t.rwDaily} onClick={() => onReward?.("rwDaily")} />
          {/* Daily streak (POC: day 2 of 4) — compact segmented track */}
          <span className="mt-1 flex h-[7px] w-[56px] gap-[2px] rounded-full border border-white/25 bg-black/55 p-[1.5px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-full flex-1 rounded-full" style={{ background: i < 2 ? "linear-gradient(180deg,#ffe08a,#f6a821)" : "rgba(255,255,255,0.18)" }} />
            ))}
          </span>
          <span className="mt-1 rounded-md border border-white/30 bg-gradient-to-b from-[#3ddc68] to-[#17a544] px-1.5 py-[1px] text-[10px] font-extrabold tabular-nums text-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{timer}</span>
          {onChain && (
            <span className="mt-2">
              <HeroBadge img="/hero-ic-chain.png" label={t.coBadge} onClick={onChain} />
            </span>
          )}
        </div>

        {/* Right column: Oripa Draw (the core product, top slot) / Quest /
            First bonus. The old Daily Box slot duplicated the left column's
            Daily entry, so it became the draw shortcut. */}
        <div className="absolute right-2.5 z-10 flex flex-col items-center gap-2" style={{ top: showRank ? 78 : 14 }}>
          <HeroBadge img="/hero-ic-draw.png" label={t.heroDraw} onClick={onDraw} />
          <HeroBadge img="/hero-ic-quest.png" label={t.rwQuest} onClick={() => onReward?.("rwQuest")} />
          <HeroBadge img="/hero-ic-offer.png" label={t.rwFirst} onClick={() => onOpenStore?.()} />
        </div>
      </div>
    </div>
  );
}

/* ── Matsuri Quest modal ─────────────────────────────────────────────────
   Like-for-like adaptation of the MB "Funfair Quest" layout to the Oripa
   brand: marquee title, ultimate-reward panel, matsuri awning (red/white),
   3 quest rows (task + step reward), store CTA, reset countdown.
   POC: quest data and countdown are static. */

function QuestLock() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="#f6b93b" stroke="#7d5f1a" strokeWidth="1.2" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" stroke="#f6b93b" strokeWidth="2.4" />
      <circle cx="12" cy="15" r="1.6" fill="#3a1204" />
      <path d="M12 15.8v2" stroke="#3a1204" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* Modal content choreography (entry only), dramatic cut: the night backdrop
   breathes in first (slow fade + Ken Burns settle), then sections reveal in
   DOM order on 150ms beats — the marquee DROPS from above with a heavy
   bounce, its title stamps on a beat later, quest rows tip up in 3D like
   dealt cards, and the CTA lands last with a big pop. Reduced-motion users
   get plain fades (no transforms). */
const QM_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.15, delayChildren: 0.55 } },
};
const QM_ITEM: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 26 } },
};
const QM_MARQUEE: Variants = {
  hidden: { opacity: 0, y: -56, scale: 0.72 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 13 } },
};
const QM_TITLE: Variants = {
  hidden: { opacity: 0, scale: 1.4 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const QM_ROW: Variants = {
  hidden: { opacity: 0, y: 46, rotateX: 24, transformPerspective: 600 },
  show: { opacity: 1, y: 0, rotateX: 0, transformPerspective: 600, transition: { type: "spring", stiffness: 240, damping: 24 } },
};
const QM_CTA: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 12 } },
};
const QM_FADE: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35 } },
};

/* Segmented game-UI progress bar: inset glass track with per-step ticks,
   gold→ember gradient fill with a moving sheen and a pulsing glow cap at the
   head. The fill animates in after the quest row lands (delay 1.5s). */
function QuestProgress({ value, max }: { value: number; max: number }) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="mt-1.5">
      <div className="relative h-[18px] overflow-hidden rounded-full border border-[#c9a84c]/70 bg-[#12070a]" style={{ boxShadow: "inset 0 2px 5px rgba(0,0,0,0.85), inset 0 -1px 0 rgba(255,255,255,0.06)" }}>
        {Array.from({ length: max - 1 }).map((_, i) => (
          <span key={i} className="absolute top-0 h-full w-px bg-white/12" style={{ left: `${((i + 1) / max) * 100}%` }} />
        ))}
        <motion.div
          className="relative h-full rounded-full"
          style={{ background: "linear-gradient(180deg,#ffd23f 0%,#f6a821 45%,#e04b2a 100%)", boxShadow: "0 0 10px rgba(255,180,60,0.55)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduceMotion ? { duration: 0 } : { delay: 1.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 rounded-full opacity-35" style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.85) 0 6px, transparent 6px 14px)", backgroundSize: "28px 100%", animation: reduceMotion ? undefined : "qpStripes 1.6s linear infinite" }} />
          <div className="absolute inset-x-1 top-[1.5px] h-[5px] rounded-full bg-white/35" />
          {pct > 0 && pct < 100 && (
            <span className="absolute -right-[3px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 rounded-full bg-[#fff6c9]" style={{ boxShadow: "0 0 8px 3px rgba(255,220,110,0.8)", animation: reduceMotion ? undefined : "qpPulse 1.4s ease-in-out infinite" }} />
          )}
        </motion.div>
        <span className="absolute inset-0 flex items-center justify-center text-[10.5px] font-black tracking-wide text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
          {value}/{max}
        </span>
      </div>
      <style>{`
        @keyframes qpStripes { from { background-position: 0 0; } to { background-position: 28px 0; } }
        @keyframes qpPulse { 0%,100% { transform: translateY(-50%) scale(1); opacity: 1; } 50% { transform: translateY(-50%) scale(1.35); opacity: 0.7; } }
      `}</style>
    </div>
  );
}

function QuestModal({ t, onClose, onGetCoins }: { t: Dict; onClose: () => void; onGetCoins?: () => void }) {
  // Fade-only choreography for users who prefer reduced motion.
  const reduceMotion = useReducedMotion();
  const itemV = reduceMotion ? QM_FADE : QM_ITEM;
  const marqueeV = reduceMotion ? QM_FADE : QM_MARQUEE;
  const titleV = reduceMotion ? QM_FADE : QM_TITLE;
  const rowV = reduceMotion ? QM_FADE : QM_ROW;
  const ctaV = reduceMotion ? QM_FADE : QM_CTA;
  // Reset countdown (POC): fixed start so SSR matches, ticks after mount.
  const [left, setLeft] = useState(3 * 3600 + 39 * 60 + 14);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 3 * 3600 + 39 * 60 + 14)), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(left / 3600)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  const goldFrame = "linear-gradient(180deg,#ffe08a,#c9a84c 55%,#7d5f1a)";

  return (
    <motion.div variants={QM_CONTAINER} initial="hidden" animate="show" className="no-scrollbar absolute inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "radial-gradient(140% 90% at 50% 0%, #4a0507 0%, #2a0304 45%, #180102 100%)" }}>
      {/* Matsuri night backdrop (XainFlow · Ninja): breathes in first — slow
          fade + Ken Burns settle — before the content cascade begins. The
          gradient behind remains as the loading fallback. */}
      <motion.img
        src="/quest-bg.png"
        alt=""
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Header: brand chip + close */}
      <motion.div variants={itemV} className="relative z-10 flex items-center justify-between px-3 pt-3">
        <span className="rounded-full bg-white px-2.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"><BrandLogo /></span>
        <button onClick={onClose} aria-label={t.cancel} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 active:scale-90">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </motion.div>

      {/* Marquee title: generated bulb signboard with an empty centre panel;
          the title itself stays CSS text so the EN/JA toggle keeps working. */}
      <motion.div variants={marqueeV} className="relative z-10 mx-auto mt-1 w-[60%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/quest-marquee.png" alt="" className="w-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]" />
        {/* Title stamps onto the sign one beat after it lands */}
        <motion.p variants={titleV} className="absolute inset-0 flex items-center justify-center px-7 text-center text-[15px] font-black italic tracking-wide" style={HERO_LABEL_STYLE}>{t.qmTitle}</motion.p>
      </motion.div>

      {/* Ultimate reward panel — gold asanoha lacquer texture behind the items */}
      <motion.div variants={itemV} className="relative z-10 mx-auto mt-2 w-[88%] rounded-2xl p-[2.5px]" style={{ background: goldFrame, boxShadow: "0 6px 18px rgba(0,0,0,0.45)" }}>
        <div className="relative overflow-hidden rounded-[14px] px-3 pb-2 pt-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/quest-panel.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          <div className="relative">
            <p className="text-center text-[12.5px] font-black italic tracking-wide text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{t.qmUltimate}</p>
            <div className="mt-1.5 flex items-end justify-around">
              <div className="flex flex-col items-center gap-0.5">
                <CoinIcon size={26} />
                <span className="text-[13px] font-black italic text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>10,000</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <GemIcon size={26} />
                <span className="text-[13px] font-black italic text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{t.mpFreePoint} 50</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <PrizeArt rarity="UR" size={32} />
                <span className="text-center text-[9.5px] font-black italic leading-tight text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{t.qmMaxPrize}<br />{t.qmUrCard}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Matsuri awning: generated red/white fabric canopy with gold rope trim */}
      <motion.div variants={itemV} className="relative z-10 mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/quest-awning.png" alt="" className="w-full drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)]" />
      </motion.div>

      {/* Quest board: 3 rows of task + step reward */}
      <div className="relative z-10 mt-2 flex flex-col gap-2 px-3">
        <motion.div variants={rowV} className="flex gap-2.5">
          <div className="flex flex-1 flex-col justify-center rounded-xl border-[1.5px] border-[#c9a84c]/70 bg-black/45 p-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero-ic-quest.png" alt="" className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]" />
              <p className="text-[12.5px] font-bold leading-snug text-white">{t.qmTask1}</p>
            </div>
            <QuestProgress value={1} max={3} />
          </div>
          <div className="flex w-[96px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-[#c9a84c]/70 bg-black/45 p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-ic-offer.png" alt="" className="h-10 w-10 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]" />
            <span className="text-center text-[11px] font-bold leading-tight text-white">{t.qmR1}</span>
          </div>
        </motion.div>

        <motion.div variants={rowV} className="flex gap-2.5">
          <div className="flex flex-1 items-center justify-center rounded-xl border-[1.5px] border-[#c9a84c]/50 bg-black/45 p-2" style={{ minHeight: 70 }}>
            <QuestLock />
          </div>
          <div className="flex w-[96px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-[#c9a84c]/70 bg-black/45 p-1.5">
            <CoinIcon size={26} />
            <span className="text-center text-[11px] font-bold leading-tight text-white">{t.qmR2}</span>
          </div>
        </motion.div>

        <motion.div variants={rowV} className="flex gap-2.5">
          <div className="flex flex-1 items-center justify-center rounded-xl border-[1.5px] border-[#c9a84c]/50 bg-black/45 p-2" style={{ minHeight: 70 }}>
            <QuestLock />
          </div>
          <div className="flex w-[96px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-[#c9a84c]/70 bg-black/45 p-1.5">
            <GemIcon size={26} />
            <span className="text-center text-[11px] font-bold leading-tight text-white">{t.qmR3}</span>
          </div>
        </motion.div>
      </div>

      {/* CTA + reset countdown */}
      <motion.button variants={ctaV} onClick={onGetCoins} className="relative z-10 mx-auto mt-2.5 w-[86%] rounded-2xl border-2 border-[#ffd76a] py-2.5 text-[16px] font-black text-white transition-transform active:scale-95" style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)", boxShadow: "0 6px 18px rgba(255,80,90,0.45)" }}>
        {t.qmGetCoins}
      </motion.button>
      <motion.div variants={itemV} className="relative z-10 mx-auto mb-2.5 mt-1.5 rounded-lg border border-[#c9a84c]/70 bg-black/60 px-3 py-0.5 text-[12.5px] font-extrabold tabular-nums text-white">
        {hh}:{mm}:{ss}
      </motion.div>
    </motion.div>
  );
}

/* ── Chain Offer modal ───────────────────────────────────────────────────
   Step-up re-deposit chain (LiveOps Loop 3): three escalating packs, each
   purchase unlocking the next with a bigger coin bonus. Purchase-linked
   promotion — coin bonuses only, no odds boosts (legal-gated feature).
   POC: prices are display-only; "buying" credits the coin balance. */
const CHAIN_STEPS = [
  { nameKey: "coStep1", coins: 1000, pts: 50, price: "¥1,000", bonus: "+5%" },
  { nameKey: "coStep2", coins: 3300, pts: 200, price: "¥3,000", bonus: "+10%" },
  { nameKey: "coStep3", coins: 12000, pts: 1000, price: "¥10,000", bonus: "+20%" },
] as const;

function ChainLink({ lit }: { lit: boolean }) {
  return (
    <svg width="16" height="26" viewBox="0 0 16 26" fill="none" aria-hidden style={{ filter: lit ? "drop-shadow(0 0 5px rgba(255,210,63,0.9))" : undefined }}>
      <rect x="4" y="1" width="8" height="12" rx="4" stroke={lit ? "#ffd23f" : "#8a6a1d"} strokeWidth="2.4" />
      <rect x="4" y="13" width="8" height="12" rx="4" stroke={lit ? "#f6b93b" : "#6b5316"} strokeWidth="2.4" />
    </svg>
  );
}

function ChainOfferModal({ t, step, onPurchase, onClose }: { t: Dict; step: number; onPurchase: (idx: number) => void; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const itemV = reduceMotion ? QM_FADE : QM_ITEM;
  const bannerV = reduceMotion ? QM_FADE : QM_MARQUEE;
  const titleV = reduceMotion ? QM_FADE : QM_TITLE;
  const rowV = reduceMotion ? QM_FADE : QM_ROW;
  const [toast, setToast] = useState("");
  // Offer window countdown (POC): fixed start so SSR matches, ticks on mount.
  const [left, setLeft] = useState(23 * 3600 + 59 * 60 + 59);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 23 * 3600 + 59 * 60 + 59)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);
  const hh = String(Math.floor(left / 3600)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  function buy(idx: number) {
    onPurchase(idx);
    setToast(t.coToast(CHAIN_STEPS[idx].coins));
  }

  return (
    <motion.div variants={QM_CONTAINER} initial="hidden" animate="show" className="no-scrollbar absolute inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "radial-gradient(140% 90% at 50% 0%, #4a0507 0%, #2a0304 45%, #180102 100%)" }}>
      {/* Shared matsuri night backdrop, same breathe-in as the quest modal */}
      <motion.img src="/quest-bg.png" alt="" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

      {/* Header: brand chip + close */}
      <motion.div variants={itemV} className="relative z-10 flex items-center justify-between px-3 pt-3">
        <span className="rounded-full bg-white px-2.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"><BrandLogo /></span>
        <button onClick={onClose} aria-label={t.cancel} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 active:scale-90">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </motion.div>

      {/* Banner: three chained chests (drops in like the marquee) */}
      <motion.div variants={bannerV} className="relative z-10 mx-auto mt-1 w-[86%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/chain-banner.png" alt="" className="w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]" />
      </motion.div>

      {/* Title + subtitle */}
      <motion.p variants={titleV} className="relative z-10 mt-1 text-center text-[24px] font-black italic tracking-wide" style={HERO_LABEL_STYLE}>{t.coTitle}</motion.p>
      <motion.p variants={itemV} className="relative z-10 mx-auto mt-1 w-[82%] text-center text-[12px] font-semibold leading-snug text-white/85">
        {step >= CHAIN_STEPS.length ? t.coAllDone : t.coSubtitle}
      </motion.p>

      {/* Step cards linked by chain */}
      <div className="relative z-10 mt-2 flex flex-col items-center px-3">
        {CHAIN_STEPS.map((s, i) => {
          const purchased = i < step;
          const active = i === step;
          const locked = i > step;
          return (
            <Fragment key={s.nameKey}>
              {i > 0 && <motion.div variants={itemV} className="-my-0.5"><ChainLink lit={i <= step} /></motion.div>}
              <motion.div
                variants={rowV}
                className="w-full rounded-2xl p-[2px]"
                style={{
                  background: active ? "linear-gradient(180deg,#ffe08a,#c9a84c 55%,#7d5f1a)" : purchased ? "linear-gradient(180deg,#3ddc68,#17a544)" : "rgba(201,168,76,0.35)",
                  boxShadow: active ? "0 0 18px rgba(255,210,63,0.35), 0 6px 16px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.4)",
                  opacity: locked ? 0.62 : 1,
                }}
              >
                <div className="flex items-center gap-2.5 rounded-[14px] bg-[#1b0203]/95 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-[#B40206] px-1.5 py-0.5 text-[9.5px] font-black tracking-wide text-white">{t.coStep(i + 1)}</span>
                      <span className="truncate text-[14px] font-extrabold text-white">{t[s.nameKey]}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[13px] font-bold text-white"><CoinIcon size={16} />{s.coins.toLocaleString()}</span>
                      <span className="flex items-center gap-1 text-[13px] font-bold text-white"><GemIcon size={16} />{s.pts.toLocaleString()}</span>
                    </div>
                    {locked && <p className="mt-1 text-[10px] font-semibold text-white/55">{t.coLocked}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "linear-gradient(180deg,#fff7d1,#ffd23f 60%,#f6a821)", color: "#3a1204" }}>{t.coBonus(s.bonus)}</span>
                    {purchased ? (
                      <span className="flex items-center gap-1 text-[12.5px] font-extrabold text-[#3ddc68]">
                        <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#17a544" /><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                        {t.coClaimed}
                      </span>
                    ) : active ? (
                      <button onClick={() => buy(i)} className="rounded-xl border border-[#ffd76a] px-3.5 py-1.5 text-[13px] font-black text-white transition-transform active:scale-95" style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)", boxShadow: "0 4px 12px rgba(255,80,90,0.4)" }}>
                        {t.coBuy} · {s.price}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[12px] font-bold text-white/55">
                        <span className="-my-1 scale-[0.6]"><QuestLock /></span>
                        {s.price}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </Fragment>
          );
        })}
      </div>

      {/* Offer window countdown */}
      <motion.div variants={itemV} className="relative z-10 mx-auto mb-4 mt-3 flex items-center gap-1.5 rounded-lg border border-[#c9a84c]/70 bg-black/60 px-3 py-1 text-[13px] font-extrabold tabular-nums text-white">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#ffd76a]">{t.coEndsIn}</span>
        {hh}:{mm}:{ss}
      </motion.div>

      {/* Purchase toast */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center">
          <span className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">{toast}</span>
        </div>
      )}
    </motion.div>
  );
}

function catIcon(key: string, color: string) {
  switch (key) {
    case "all":
      return <svg width="23" height="23" viewBox="0 0 24 24" fill={color}><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></svg>;
    case "new":
      return (
        <svg width="27" height="27" viewBox="0 0 24 24">
          <path d="M12 1.3l2.2 2.5 3.2-1.1.2 3.4 3.4 1-1.9 2.8 1.9 2.8-3.4 1-.2 3.4-3.2-1.1L12 22.7l-2.2-2.5-3.2 1.1-.2-3.4-3.4-1 1.9-2.8L3 11.3l3.4-1 .2-3.4 3.2 1.1z" fill="#B40206" />
          <rect x="11" y="6.6" width="2" height="6" rx="1" fill="#fff" />
          <circle cx="12" cy="15.2" r="1.15" fill="#fff" />
        </svg>
      );
    case "popular":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
    case "pokemon":
      return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" stroke={color} strokeWidth="1.8" /><path d="M3 12A9 9 0 0 1 21 12Z" fill={color} /><circle cx="12" cy="12" r="3.1" fill="#fff" stroke={color} strokeWidth="1.8" /><circle cx="12" cy="12" r="1.25" fill={color} /></svg>;
    case "limited":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.3 1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={color}><circle cx="5.5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18.5" cy="12" r="2" /></svg>;
  }
}

// Category-bar glyphs sourced from the supplied artwork (public/cat/*.png).
function catImg(key: string) {
  return (
    <span className="flex h-[24px] w-[38px] items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/cat/${key}.png`} alt="" className="max-h-[24px] max-w-[38px] object-contain" />
    </span>
  );
}

function CategoryBar({ t, active, onChange }: { t: Dict; active: string; onChange: (key: string) => void }) {
  const cats: { key: string; label: string }[] = [
    { key: "new", label: t.catNew },
    { key: "popular", label: t.catPopular },
    { key: "pokemon", label: t.catPokemon },
    { key: "limited", label: t.catLimited },
    { key: "other", label: t.catOther },
  ];
  const allOn = active === "all";
  return (
    <div className="sticky top-0 z-20 mt-3 border-b border-black/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="no-scrollbar flex items-stretch overflow-x-auto">
        {/* ALL — full-height D-tab pinned to the left edge, never scrolls away */}
        <button
          onClick={() => onChange("all")}
          aria-pressed={allOn}
          className="sticky left-0 z-10 flex shrink-0 items-stretch bg-white pr-2.5"
        >
          <span className="flex flex-col items-center justify-center gap-1 rounded-r-[28px] bg-[#141414] px-4 text-white shadow-[3px_0_12px_rgba(0,0,0,0.18)]">
            {catIcon("all", "#fff")}
            <span className="text-[11px] font-extrabold uppercase tracking-wide">{t.catAll}</span>
          </span>
        </button>

        {/* Scrollable categories */}
        {cats.map((c) => {
          const on = active === c.key;
          const color = on ? "#B40206" : "#1d2129";
          return (
            <button
              key={c.key}
              onClick={() => onChange(c.key)}
              className="relative flex shrink-0 flex-col items-center justify-center gap-1 px-3 py-2.5"
            >
              {catImg(c.key)}
              <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color }}>{c.label}</span>
              {on && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[#B40206]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SiteFooter({ t }: { t: Dict }) {
  const lang: Lang = t === STR.ja ? "ja" : "en";
  const [tnc, setTnc] = useState(false);
  const chip = (label: string) =>
    label === t.mpTerms ? (
      <button key={label} onClick={() => setTnc(true)} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90 underline decoration-white/40 active:bg-white/20">{label}</button>
    ) : (
      <span key={label} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90">{label}</span>
    );
  return (
    <footer className="bg-[#161616] px-4 py-6 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto" style={{ filter: "brightness(1.6)" }} />
      <p className="mt-2 text-[11px] text-white/55">{t.ftCopyright}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-white/55">{t.ftBlurb}</p>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftAbout}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{t.ftLinks.map(chip)}</div>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftCategories}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{t.ftCats.map(chip)}</div>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftFollow}</h4>
      <div className="mt-2 flex items-center gap-3">
        {["LINE", "X", "IG", "f"].map((s) => (
          <span key={s} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#161616]">{s}</span>
        ))}
      </div>

      <div className="my-5 h-px bg-white/15" />
      <p className="text-[11px] leading-relaxed text-white/70">{t.ftSupport}</p>
      <p className="mt-4 text-[10.5px] text-white/40">{t.ftCopyright}</p>
      {tnc && <TermsOverlay lang={lang} onClose={() => setTnc(false)} />}
    </footer>
  );
}

function AppHeader({ coins, t, onHome, onOpenStore }: { coins: number; t: Dict; onHome?: () => void; onOpenStore?: () => void }) {
  return (
    <header className="shrink-0 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <BrandLogo onClick={onHome} />
        <BalancePill coins={coins} t={t} onOpenStore={onOpenStore} />
      </div>
    </header>
  );
}

// Hide-on-scroll-down / reveal-on-scroll-up for the lobby search bar.
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop;
    const last = lastY.current;
    if (y > last && y > 48) setHidden(true);        // scrolling down, past the top
    else if (y < last - 4 || y <= 8) setHidden(false); // scrolling up / near top
    lastY.current = y;
  }
  return { hidden, onScroll };
}

// Search bar shown on the main lobby so users can find a draw without
// browsing categories.
function LobbySearchBar({ t, value, onChange }: { t: Dict; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.lobbySearchPlaceholder}
        className="w-full rounded-full border-[1.5px] border-black/10 bg-[#f4f5f7] py-2.5 pl-9 pr-9 text-[13px] font-semibold text-[#1d2129] outline-none focus:border-[#B40206] focus:bg-white"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5"
          aria-label={t.backAria}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}

function LobbySearchResults({ items, t, lang, onOpenInfo, onDrawConfirm }: { items: OripaItem[]; t: Dict; lang: Lang; onOpenInfo?: (item: OripaItem) => void; onDrawConfirm?: (item: OripaItem, count: number, free?: boolean) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-2 text-[34px]">🔍</div>
        <p className="text-[14px] font-semibold text-[#8a9099]">{t.lobbySearchEmpty}</p>
      </div>
    );
  }
  return (
    <section className="bg-[#eef0f3] px-3 pb-6 pt-4">
      <h3 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{t.lobbySearchResults} · {items.length}</h3>
      <div className="space-y-3">
        {items.map((it) => (
          <OripaCard key={it.id} item={it} t={t} lang={lang} onView={() => onOpenInfo?.(it)} onDraw={(c, free) => onDrawConfirm?.(it, c, free)} />
        ))}
      </div>
    </section>
  );
}

// Flat, de-duplicated list of every draw across the home feed (for search).
const ALL_ORIPA: OripaItem[] = (() => {
  const seen = new Set<string>();
  const out: OripaItem[] = [];
  for (const s of HOME_SECTIONS) for (const it of s.items) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
  return out;
})();

/* ══════════════════════════════════════════════════════════════════════════
   LOBBY NAVIGATION EXPERIMENT (mirrors public/lobby.html)
   Self-contained: rendered only when the "Lobby nav" toggle is v1/v2/v3.
   Remove this block + the toggle to fully revert to the original feed.
   ══════════════════════════════════════════════════════════════════════════ */
const LOBBY_NAV_STR = {
  en: {
    allResults: "All categories",
    items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
    seeAll: "See all",
    empty: "No packs match your search.",
    narrowDown: "Narrow down",
    sortDefault: "Recommended order",
    searchPlaceholder: "Search packs & cards",
    quickFilters: "Quick filters",
    clear: "Clear",
    apply: "Apply",
    sorts: [["rec", "Recommended order"], ["popular", "Most popular"], ["new", "Newest"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"]] as [string, string][],
    quickOpts: [["popular", "Most popular"], ["newarrivals", "New Arrivals"], ["fewleft", "Only a few left"], ["psa10", "PSA10 confirmed"], ["guarantee60", "High return"], ["pokemon", "Pokémon"], ["onepiece", "One Piece"], ["box", "BOX"]] as [string, string][],
    tags: [["all", "All"], ["newusers", "New Users"], ["limited", "Limited"], ["hot", "Hot"], ["psa10", "PSA10"], ["loginbonus", "Login Bonus"]] as [string, string][],
  },
  ja: {
    allResults: "すべてのカテゴリー",
    items: (n: number) => `${n}件`,
    seeAll: "すべて見る",
    empty: "一致するオリパがありません。",
    narrowDown: "絞り込み",
    sortDefault: "おすすめ順",
    searchPlaceholder: "オリパ・カードを検索",
    quickFilters: "クイックフィルター",
    clear: "クリア",
    apply: "適用",
    sorts: [["rec", "おすすめ順"], ["popular", "人気順"], ["new", "新着順"], ["priceAsc", "価格の安い順"], ["priceDesc", "価格の高い順"]] as [string, string][],
    quickOpts: [["popular", "人気"], ["newarrivals", "新着"], ["fewleft", "残りわずか"], ["psa10", "PSA10確定"], ["guarantee60", "高還元"], ["pokemon", "ポケモン"], ["onepiece", "ワンピース"], ["box", "BOX"]] as [string, string][],
    tags: [["all", "すべて"], ["newusers", "新規向け"], ["limited", "限定"], ["hot", "人気"], ["psa10", "PSA10"], ["loginbonus", "ログインボーナス"]] as [string, string][],
  },
};
const LOBBY_TAG_ACCENT: Record<string, { accent: string; dark?: boolean }> = {
  all: { accent: "#fbbf24", dark: true },
  newusers: { accent: "#ec4899" },
  limited: { accent: "#f5670a" },
  hot: { accent: "#ef4444" },
  psa10: { accent: "#2f6fed" },
  loginbonus: { accent: "#16a34a" },
};

function lobbyItemsForCat(cat: string): OripaItem[] {
  if (cat === "all") return ALL_ORIPA;
  const seen = new Set<string>();
  const out: OripaItem[] = [];
  for (const s of HOME_SECTIONS) if (s.cats.includes(cat)) for (const it of s.items) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
  return out;
}

// Compact card for carousels (V1) and grids (V1/V3). Banner image uses the
// same 4/3 ratio as the full card so artwork lines up across versions.
function LobbyMiniCard({ item, t, lang, fullWidth, onView }: { item: OripaItem; t: Dict; lang: Lang; fullWidth?: boolean; onView?: () => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  return (
    <button
      onClick={onView}
      className={`flex flex-col overflow-hidden rounded-xl bg-white text-left shadow-[0_2px_8px_rgba(0,0,0,0.1)] active:scale-[0.98] ${fullWidth ? "w-full" : "w-[152px] shrink-0"}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ededf0]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c2c6cc" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#B40206] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">{item.gem ? t.tagSsr : t.tagPopular}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h4 className="line-clamp-2 text-[12px] font-extrabold leading-tight text-[#1d2129]">{locTitle(item, lang)}</h4>
        <span className="mt-auto flex items-center gap-1">
          <CoinIcon size={15} />
          <span className="text-[13px] font-extrabold text-[#1d2129]">1,000</span>
          <span className="text-[10px] font-bold text-[#8a9099]">{t.perDraw}</span>
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#B40206]" style={{ width: `${pct}%` }} /></div>
        <span className="text-[10px] font-bold text-[#B40206]">{t.remainingTimeLabel} {t.minUnit(item.endsIn)}</span>
      </div>
    </button>
  );
}

function LobbyNavFeed({ version, t, lang, onOpenInfo, onDrawConfirm, filters, query, onOpenFilters }: { version: Exclude<LobbyNav, "off">; t: Dict; lang: Lang; onOpenInfo?: (item: OripaItem) => void; onDrawConfirm?: (item: OripaItem, count: number, free?: boolean) => void; filters: Record<string, boolean>; query: string; onOpenFilters: () => void }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  const [cat, setCat] = useState("all");       // V1/V2 category chip
  const [tab, setTab] = useState("pokemon");   // V3 franchise tab
  const [tag, setTag] = useState("all");       // V3 filter tag
  const [sortKey, setSortKey] = useState("rec");
  const [sortOpen, setSortOpen] = useState(false);
  const filterCount = Object.keys(filters).length;
  const qq = query.trim().toLowerCase();
  const searching = qq.length > 0;

  const catList: { key: string; label: string }[] = [
    { key: "all", label: t.catAll },
    { key: "new", label: t.catNew },
    { key: "popular", label: t.catPopular },
    { key: "pokemon", label: t.catPokemon },
    { key: "limited", label: t.catLimited },
    { key: "other", label: t.catOther },
  ];
  const tabList = catList.filter((c) => c.key !== "all");

  function applyQuery(list: OripaItem[]): OripaItem[] {
    return qq ? list.filter((it) => locTitle(it, lang).toLowerCase().includes(qq)) : list;
  }
  function transform(list: OripaItem[]): OripaItem[] {
    let arr = applyQuery(list.slice());
    if (filterCount) arr = arr.filter((_, i) => i % (filterCount + 1) !== 0);
    if (sortKey === "new") arr.reverse();
    else if (sortKey === "popular") arr.sort((a, b) => a.remaining - b.remaining);
    else if (sortKey === "priceAsc") arr.sort((a, b) => a.remaining - b.remaining);
    else if (sortKey === "priceDesc") arr.sort((a, b) => b.remaining - a.remaining);
    return arr;
  }

  const sortLabel = (L.sorts.find(([k]) => k === sortKey) || L.sorts[0])[1];

  const mini = (it: OripaItem, fw?: boolean) => (
    <LobbyMiniCard key={it.id} item={it} t={t} lang={lang} fullWidth={fw} onView={() => onOpenInfo?.(it)} />
  );
  const full = (it: OripaItem) => (
    <OripaCard key={it.id} item={it} t={t} lang={lang} onView={() => onOpenInfo?.(it)} onDraw={(c, free) => onDrawConfirm?.(it, c, free)} />
  );

  function chipCls(on: boolean) {
    return `relative shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-bold transition ${on ? "border-[#B40206] bg-[#B40206] text-white" : "border-black/10 bg-white text-[#5c626b]"}`;
  }

  const nav = version === "v3" ? (
    <>
      {/* Franchise tabs */}
      <div className="no-scrollbar relative flex gap-5 overflow-x-auto bg-white px-4 pt-3">
        {tabList.map((c) => {
          const on = tab === c.key;
          return (
            <button key={c.key} onClick={() => { setTab(c.key); setTag("all"); }} className={`relative shrink-0 whitespace-nowrap pb-2.5 text-[15px] font-bold ${on ? "text-[#1d2129]" : "text-[#8a9099]"}`}>
              {c.label}
              {on && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-t bg-[#fbbf24]" />}
            </button>
          );
        })}
      </div>
      {/* Filter tags */}
      <div className="no-scrollbar relative flex gap-2 overflow-x-auto border-y border-black/10 bg-white px-3.5 py-2.5">
        {L.tags.map(([key, label]) => {
          const on = tag === key;
          const ac = LOBBY_TAG_ACCENT[key];
          const sticky = key === "all";
          return (
            <button
              key={key}
              onClick={() => setTag(key)}
              className={`relative shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-4 py-1.5 text-[13px] font-extrabold transition ${sticky ? "sticky left-0 z-[3]" : ""}`}
              style={{
                background: on ? ac.accent : "#fff",
                color: on ? (ac.dark ? "#1d2129" : "#fff") : ac.accent,
                borderColor: ac.accent,
                boxShadow: sticky ? "0 0 0 8px #fff" : undefined,
                marginRight: sticky ? 10 : undefined,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </>
  ) : (
    <div className="no-scrollbar relative flex gap-2 overflow-x-auto border-b border-black/10 bg-white px-3.5 py-2.5">
      {catList.map((c) => {
        const on = cat === c.key;
        const sticky = c.key === "all";
        return (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`${chipCls(on)} ${sticky ? "sticky left-0 z-[3]" : ""}`}
            style={sticky ? { boxShadow: "0 0 0 8px #fff", marginRight: 10 } : undefined}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );

  // Body
  let body: React.ReactNode;
  if (searching) {
    // A search query overrides category/lane browsing with a flat grid.
    const items = transform(ALL_ORIPA);
    body = items.length === 0
      ? <div className="px-6 py-16 text-center text-[13px] font-semibold text-[#8a9099]">{L.empty}</div>
      : <div className="grid grid-cols-2 gap-3 px-3.5 py-3">{items.map((it) => mini(it, true))}</div>;
  } else if (version === "v3") {
    const base = lobbyItemsForCat(tab);
    const items = transform(tag === "all" ? base : base.slice(0, Math.max(2, Math.ceil(base.length / 2))));
    body = items.length === 0
      ? <div className="px-6 py-16 text-center text-[13px] font-semibold text-[#8a9099]">{L.empty}</div>
      : <div className="grid grid-cols-2 gap-3 px-3.5 py-3">{items.map((it) => mini(it, true))}</div>;
  } else if (cat === "all") {
    body = (
      <div>
        {HOME_SECTIONS.map((s) => {
          const title = (t as unknown as Record<string, string>)[s.titleKey];
          const seeAllCat = s.cats[0];
          return (
            <div key={s.id} className="border-t border-black/10 px-3.5 py-3.5 first:border-t-0">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#1d2129]">{sectionIcon(s.icon, false)}{title}</h3>
                {seeAllCat && <button onClick={() => setCat(seeAllCat)} className="text-[12px] font-bold text-[#B40206]">{L.seeAll} →</button>}
              </div>
              {version === "v1"
                ? <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">{s.items.map((it) => mini(it))}</div>
                : <div className="flex flex-col gap-3">{s.items.map(full)}</div>}
            </div>
          );
        })}
      </div>
    );
  } else {
    const items = transform(lobbyItemsForCat(cat));
    body = items.length === 0
      ? <div className="px-6 py-16 text-center text-[13px] font-semibold text-[#8a9099]">{L.empty}</div>
      : version === "v1"
        ? <div className="grid grid-cols-2 gap-3 px-3.5 py-3">{items.map((it) => mini(it, true))}</div>
        : <div className="flex flex-col gap-3 px-3.5 py-3">{items.map(full)}</div>;
  }

  return (
    <div className="bg-[#eef0f3]">
      {nav}

      {/* Toolbar — "Narrow down" (filters) on the left, sort on the right */}
      <div className="relative flex items-stretch border-b border-black/10 bg-white">
        <button onClick={() => { onOpenFilters(); setSortOpen(false); }} className="flex flex-1 items-center justify-center gap-2 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="7" cy="8" r="2" /><circle cx="16" cy="16" r="2" /><path d="M9 8h11M4 8h1M15 16h5M4 16h9" /></svg>
          {L.narrowDown}
          {filterCount > 0 && <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#B40206] px-1 text-[10px] font-extrabold leading-none text-white">{filterCount}</span>}
        </button>
        <span className="my-2 w-px bg-black/10" />
        <div className="relative flex-1">
          <button onClick={() => setSortOpen((o) => !o)} className="flex w-full items-center justify-center gap-1.5 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
            {sortLabel}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute right-2 top-[calc(100%-2px)] z-40 min-w-[210px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                {L.sorts.map(([key, label]) => (
                  <button key={key} onClick={() => { setSortKey(key); setSortOpen(false); }} className={`block w-full px-3.5 py-2.5 text-left text-[13px] ${key === sortKey ? "font-extrabold text-[#B40206]" : "text-[#41464e]"}`}>{label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {body}
    </div>
  );
}

// Competitor-style "Narrow down" bottom sheet: search on top, grouped quick
// filters below, Clear / Apply CTAs pinned to the bottom.
function LobbyFilterSheet({ lang, filters, query, onToggle, onQueryChange, onClear, onClose }: { lang: Lang; filters: Record<string, boolean>; query: string; onToggle: (k: string) => void; onQueryChange: (v: string) => void; onClear: () => void; onClose: () => void }) {
  const L = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose} style={{ animation: "storeEduBannerIn .25s ease both" }}>
      <div className="flex max-h-[90%] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()} style={{ animation: "lobbySheetUp .28s cubic-bezier(.2,.8,.2,1) both" }}>
        <style>{`@keyframes lobbySheetUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-center border-b border-black/5 px-4 py-3.5">
          <h3 className="text-[16px] font-extrabold text-[#1d2129]">{L.narrowDown}</h3>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] active:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {/* Search */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa0a8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="w-full rounded-xl bg-[#f4f5f7] py-3 pl-11 pr-3 text-[14px] font-semibold text-[#1d2129] outline-none placeholder:text-[#9aa0a8] focus:bg-white focus:ring-2 focus:ring-[#B40206]/30"
            />
          </div>

          {/* Quick filters — a few most popular selections */}
          <div className="mt-5">
            <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{L.quickFilters}</h4>
            <div className="flex flex-wrap gap-2.5">
              {L.quickOpts.map(([key, label]) => {
                const on = !!filters[key];
                return (
                  <button key={key} onClick={() => onToggle(key)} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "border-[#B40206] bg-[#B40206] text-white" : "border-black/15 bg-white text-[#5c626b] active:bg-black/[0.03]"}`}>{label}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="flex shrink-0 gap-3 border-t border-black/10 px-4 py-3">
          <button onClick={onClear} className="flex-1 rounded-xl bg-[#f2f3f5] py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{L.clear}</button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-[#B40206] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{L.apply}</button>
        </div>
      </div>
    </div>
  );
}

function OripaHome({ lang, coins, onHome, onReward, onOpenStore, onOpenInfo, onDrawConfirm, onCredit, onOpenRank, homeVariant = "v1", lobbyNav = "off" }: { lang: Lang; coins: number; onHome: () => void; onReward?: (key: RewardKey) => void; onOpenStore?: () => void; onOpenInfo?: (item: OripaItem) => void; onDrawConfirm?: (item: OripaItem, count: number, free?: boolean) => void; onCredit?: (n: number) => void; onOpenRank?: () => void; homeVariant?: "v1" | "v2"; lobbyNav?: LobbyNav }) {
  const t = STR[lang];
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_ORIPA.filter((it) => locTitle(it, lang).toLowerCase().includes(q)) : [];
  // Matsuri Quest modal (opened from the hero's Quest icon).
  const [questOpen, setQuestOpen] = useState(false);
  // Chain Offer modal + progress (POC: per-visit state, resets on navigation).
  const [chainOpen, setChainOpen] = useState(false);
  const [chainStep, setChainStep] = useState(0);
  // Lobby-nav filter bottom sheet (rendered at root so it pins to the phone).
  const [lobbyFilters, setLobbyFilters] = useState<Record<string, boolean>>({});
  const [lobbyFilterOpen, setLobbyFilterOpen] = useState(false);
  const [lobbyQuery, setLobbyQuery] = useState("");
  const toggleLobbyFilter = (k: string) => setLobbyFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearLobbyFilters = () => { setLobbyFilters({}); setLobbyQuery(""); };
  const sections = HOME_SECTIONS.filter((s) => cat === "all" || s.cats.includes(cat));
  const { hidden: searchHidden, onScroll } = useHideOnScrollDown();
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Lobby search — hides as the user scrolls down, reveals on scroll up.
          In the lobby-nav experiment search lives inside the "Narrow down" sheet. */}
      {lobbyNav === "off" && (
        <div className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${searchHidden && !q ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
          <div className="border-b border-black/5 px-3 pb-2.5 pt-1">
            <LobbySearchBar t={t} value={query} onChange={setQuery} />
          </div>
        </div>
      )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={onScroll}>
        {q ? (
          <>
            <LobbySearchResults items={searchResults} t={t} lang={lang} onOpenInfo={onOpenInfo} onDrawConfirm={onDrawConfirm} />
            <SiteFooter t={t} />
          </>
        ) : (
        <>
        {/* Homepage V2 (default): MB-style hero — layered key art, rank strip,
            floating quick-access icons. V1 restores the original top area
            (promo carousel + reward banner). Toggled from the desktop config
            panel. */}
        {homeVariant === "v2" ? (
          <div className="px-3 pt-3">
            <HomeHero t={t} onReward={(k) => (k === "rwQuest" ? setQuestOpen(true) : onReward?.(k))} onOpenStore={onOpenStore} onChain={() => setChainOpen(true)} onRank={onOpenRank} onDraw={() => onOpenInfo?.(RECOMMENDED_ORIPA[0])} />
          </div>
        ) : (
          <>
            <div className="px-3 pt-3">
              <PromoCarousel />
            </div>
            <div className="px-3 pt-3">
              <RewardBanner t={t} onSelect={onReward} />
            </div>
          </>
        )}

        {lobbyNav === "off" ? (
        <>
        {/* Category filter — sticky across the whole feed */}
        <CategoryBar t={t} active={cat} onChange={setCat} />

        {/* Curved divider below categories */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-divider.png" alt="" className="-mt-px -mb-px block w-full" />

        {/* Filtered sections */}
        {sections.map((s, i) => {
          const red = s.variant === "red";
          return (
            <Fragment key={s.id}>
              <section className={red ? "bg-[#B40206] px-3 pb-6 pt-4" : "bg-[#eef0f3] px-3 pb-5 pt-4"}>
                <h3 className={`mb-3 flex items-center gap-1.5 text-[15px] font-extrabold ${red ? "text-white" : "text-[#1d2129]"}`}>
                  {sectionIcon(s.icon, red)}
                  {(t as unknown as Record<string, string>)[s.titleKey]}
                </h3>
                <div className="space-y-3">
                  {s.items.map((it) => (
                    <OripaCard key={it.id} item={it} t={t} lang={lang} onView={() => onOpenInfo?.(it)} onDraw={(c, free) => onDrawConfirm?.(it, c, free)} />
                  ))}
                </div>
              </section>

              {red && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home-divider-bottom.png" alt="" className="-mt-px -mb-px block w-full" />
                </>
              )}

              {/* Promo banners interleaved after the first section in the full feed */}
              {cat === "all" && i === 0 && (
                <div className="space-y-3 bg-[#eef0f3] px-3 pb-2 pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/promo-1.png" alt="" className="w-full rounded-xl object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/promo-2.png" alt="" className="w-full rounded-xl object-cover" />
                </div>
              )}
            </Fragment>
          );
        })}
        </>
        ) : (
          <LobbyNavFeed version={lobbyNav} t={t} lang={lang} onOpenInfo={onOpenInfo} onDrawConfirm={onDrawConfirm} filters={lobbyFilters} query={lobbyQuery} onOpenFilters={() => setLobbyFilterOpen(true)} />
        )}

        <SiteFooter t={t} />
        </>
        )}
      </div>

      {questOpen && <QuestModal t={t} onClose={() => setQuestOpen(false)} onGetCoins={() => { setQuestOpen(false); onOpenStore?.(); }} />}
      {chainOpen && (
        <ChainOfferModal
          t={t}
          step={chainStep}
          onPurchase={(idx) => { setChainStep(idx + 1); onCredit?.(CHAIN_STEPS[idx].coins); }}
          onClose={() => setChainOpen(false)}
        />
      )}
      {lobbyNav !== "off" && lobbyFilterOpen && <LobbyFilterSheet lang={lang} filters={lobbyFilters} query={lobbyQuery} onToggle={toggleLobbyFilter} onQueryChange={setLobbyQuery} onClear={clearLobbyFilters} onClose={() => setLobbyFilterOpen(false)} />}
    </div>
  );
}

function ComingSoon({ lang, coins, title, onHome, onOpenStore }: { lang: Lang; coins: number; title: string; onHome: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-[16px] font-bold text-[#1d2129]">{title}</h2>
        <p className="text-[13px] text-[#8a9099]">{t.comingSoon}</p>
      </div>
    </div>
  );
}

function CrownEmblem({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" aria-hidden>
      <circle cx="50" cy="50" r="50" fill="#c8061a" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.5" />
      {/* wings */}
      <path d="M50 40c-9-7-20-9-29-6 4 6 12 11 22 12M50 40c9-7 20-9 29-6-4 6-12 11-22 12" fill="#fff" opacity="0.92" />
      {/* crown */}
      <path d="M38 30l4 6 8-9 8 9 4-6 1.5 9h-27z" fill="#fff" />
      {/* O */}
      <text x="50" y="72" textAnchor="middle" fontSize="40" fontWeight="900" fontStyle="italic" fill="#fff">O</text>
    </svg>
  );
}

function myMenuIcon(key: string) {
  const c = "#B40206";
  switch (key) {
    case "quest":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="4.4" /><circle cx="12" cy="12" r="1" fill={c} stroke="none" /></svg>;
    case "items":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round"><path d="M4 9h16v10H4z" /><path d="M4 9l2-4h12l2 4M12 5v14" /></svg>;
    case "history":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5L12 14.9 7.5 16.8l.9-5L4.8 8.3l5-.7z" /><path d="M9 19l-2 2M15 19l2 2" strokeLinecap="round" /></svg>;
    case "purchases":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round"><rect x="4" y="3" width="13" height="18" rx="2" /><path d="M7 8h7M7 12h7M7 16h4" strokeLinecap="round" /><circle cx="18" cy="17" r="4" fill="#fff" /><path d="M18 15v2l1.4 1" strokeLinecap="round" /></svg>;
    case "invite":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7"><circle cx="8.5" cy="9" r="3" /><path d="M3 19a5.5 5.5 0 0111 0" strokeLinecap="round" /><circle cx="17" cy="8" r="2.4" /><path d="M15 18a4 4 0 016-3.4" strokeLinecap="round" /></svg>;
    case "faq":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 015 .8c0 1.6-2.2 1.8-2.2 3.4M12 17.2h.01" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>;
    case "contact":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7"><path d="M5 5h14v10H8l-3 3z" strokeLinejoin="round" /><path d="M9 9h6M9 12h4" strokeLinecap="round" /></svg>;
    case "shippingAddress":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case "subscriptions":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2.5" /><path d="M6 10h4M6 13.5h8" /><path d="M16 3l2 3M8 3l-2 3" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={c}><path d="M5 18v-2a7 7 0 0114 0v2l1.5 2H3.5z" /><circle cx="12" cy="20.5" r="1.4" fill="#fff" /></svg>;
  }
}

function MyPage({ lang, coins, displayName, onOpenPrizeHistory, onOpenPurchaseHistory, onOpenProfile, onLogout, onOpenRefer, onOpenQuest, onOpenFaq, onOpenItems, onOpenNotices, onOpenShippingAddress, onHome, onOpenStore, scrollPos, subscriptionPurchased, onSubscriptionPurchased, onCancelSubscription, subscriptionStartDate, openSubscriptionsOnMount, onSubscriptionsPanelMounted }: { lang: Lang; coins: number; displayName: string; onOpenPrizeHistory: () => void; onOpenPurchaseHistory: () => void; onOpenProfile: () => void; onLogout: () => void; onOpenRefer: () => void; onOpenQuest: () => void; onOpenFaq: () => void; onOpenItems: () => void; onOpenNotices: () => void; onOpenShippingAddress: () => void; onHome: () => void; onOpenStore?: () => void; scrollPos?: React.MutableRefObject<number>; subscriptionPurchased?: boolean; onSubscriptionPurchased?: () => void; onCancelSubscription?: () => void; subscriptionStartDate?: Date | null; openSubscriptionsOnMount?: boolean; onSubscriptionsPanelMounted?: () => void }) {
  const t = STR[lang];
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && scrollPos) el.scrollTop = scrollPos.current;
  }, [scrollPos]);
  useEffect(() => {
    if (openSubscriptionsOnMount) {
      setSubPanel(true);
      onSubscriptionsPanelMounted?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSubscriptionsOnMount]);
  const menu: { key: string; label: string; onClick?: () => void }[] = [
    { key: "quest", label: t.mmQuest, onClick: onOpenQuest },
    { key: "items", label: t.mmItems, onClick: onOpenItems },
    { key: "history", label: t.mmPrizeHistory, onClick: onOpenPrizeHistory },
    { key: "purchases", label: t.mmPurchases, onClick: onOpenPurchaseHistory },
    { key: "shippingAddress", label: t.mmShippingAddress, onClick: onOpenShippingAddress },
    { key: "subscriptions", label: t.mmSubscriptions, onClick: () => setSubPanel(true) },
    { key: "invite", label: t.mmInvite, onClick: onOpenRefer },
    { key: "faq", label: t.mmFaq, onClick: onOpenFaq },
    { key: "contact", label: t.mmContact },
    { key: "notices", label: t.mmNotices, onClick: onOpenNotices },
  ];
  const [tnc, setTnc] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [subPanel, setSubPanel] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [subSelectedPkg, setSubSelectedPkg] = useState<PointPackage | null>(null);

  function handleSubComplete() {
    onSubscriptionPurchased?.();
    setSubSelectedPkg(null);
  }

  function formatSubDate(d: Date) {
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }

  const subStart = subscriptionStartDate ?? null;
  const subEnd = subStart ? (() => { const d = new Date(subStart); d.setMonth(d.getMonth() + 1); return d; })() : null;
  const linkRow = (label: string, onClick?: () => void) => (
    <button key={label} onClick={onClick} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">{label}</button>
  );
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />
      <div
        ref={scrollRef}
        onScroll={(e) => { if (scrollPos) scrollPos.current = e.currentTarget.scrollTop; }}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
      >
        <div className="px-3 py-4">
          {/* Profile card */}
          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <CrownEmblem size={86} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-extrabold text-[#1d2129]">{displayName.trim() || t.accountName}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#8a9099]">{t.mpId} : XXXXXX</p>
              <button onClick={onOpenProfile} className="mt-2 w-full rounded-lg border-2 border-[#B40206] py-1.5 text-[13px] font-bold text-[#B40206]">{t.mpEditProfile}</button>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="flex items-stretch">
              <div className="flex-1 pr-3">
                <p className="text-[13px] font-semibold text-[#5b616b]">{t.mpOripaCoin}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[22px] font-extrabold text-[#1d2129]">
                  <CoinIcon size={22} />{coins.toLocaleString()}
                  <button onClick={onOpenStore} className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B40206] text-[15px] leading-none text-white">+</button>
                </p>
              </div>
              <div className="w-px bg-black/10" />
              <div className="flex-1 pl-4">
                <p className="text-[13px] font-semibold text-[#5b616b]">{t.mpFreePoint}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[22px] font-extrabold text-[#1d2129]"><GemIcon size={22} />10,000</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[12.5px] font-bold text-[#B40206]">{t.mpCoinExpiry}</p>
            </div>
          </div>

          {/* Rank card */}
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#e7b98a] p-4" style={{ background: "linear-gradient(135deg,#fbe6cf,#f6d3ad)" }}>
            <span className="inline-block rounded-md bg-[#7a4a1e] px-2.5 py-1 text-[11px] font-bold text-white">{t.mpCurrentRank}</span>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#d79a5f,#a9692f)" }}>
                <CrownEmblem size={52} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[20px] font-extrabold text-[#4a3010]">{t.mpRankBronze}</p>
                <p className="text-[13px] font-semibold text-[#6b4a23]">{t.mpNextLevel} <span className="text-[15px] font-extrabold text-[#B40206]">1,000pt</span></p>
                <button onClick={() => setRanking(true)} className="mt-2 w-full rounded-lg bg-[#B40206] py-2 text-[13px] font-bold text-white active:scale-[0.99]">{t.mpRankPerks}</button>
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/60"><span className="block h-full rounded-full bg-[#e08a2e]" style={{ width: "75%" }} /></div>
            <p className="mt-1 text-right text-[12px] font-bold text-[#6b4a23]">3,000/4,000</p>
          </div>

          {/* My Menu grid */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpMyMenu}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {menu.map((m) => (
              <button key={m.key} onClick={m.onClick} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:bg-black/[0.02]">
                {myMenuIcon(m.key)}
                <span className="text-[13.5px] font-bold text-[#1d2129]">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Promo banners */}
          <div className="mt-4 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/promo-1.png" alt="" className="w-full rounded-xl object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/promo-2.png" alt="" className="w-full rounded-xl object-cover" />
          </div>

          {/* Account section */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpAccountSection}</h3>
          <div className="space-y-2">
            <button onClick={onOpenProfile} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">{t.mpEditAccount}</button>
            <button onClick={onLogout} className="w-full rounded-xl bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">{t.menuLogout}</button>
          </div>

          {/* Other section */}
          <h3 className="mb-2 mt-5 text-[15px] font-extrabold text-[#1d2129]">{t.mpOtherSection}</h3>
          <div className="space-y-2">
            {linkRow(t.mpTerms, () => setTnc(true))}
            {linkRow(t.mpPrivacy)}
            {linkRow(t.mpLegal)}
          </div>
        </div>

        <SiteFooter t={t} />
      </div>
      {tnc && <TermsOverlay lang={lang} onClose={() => setTnc(false)} />}
      {ranking && <RankingOverlay lang={lang} onClose={() => setRanking(false)} />}

      {/* Subscriptions panel */}
      {subPanel && (
        <div className="absolute inset-0 z-40 flex flex-col" style={{ background: "#eef0f3" }}>
          {/* Header */}
          <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10 flex items-center gap-2">
            <button onClick={() => setSubPanel(false)} className="flex h-7 w-7 items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <h1 className="text-[15px] font-bold text-[#1d2129]">{t.mmSubscriptions}</h1>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-5">
            {subscriptionPurchased && subStart && subEnd ? (
              /* Active subscription card */
              <div>
                <div className="overflow-hidden rounded-2xl border-2 border-[#92400e]" style={{ background: "linear-gradient(135deg,#78350f,#451a03)" }}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-1">
                    <div>
                      <p className="text-[17px] font-black text-white">{t.storeCollectorsPass}</p>
                      <p className="text-[11px] text-white/60">{t.storeCollectorsPassTagline}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-black text-white" style={{ background: "#16a34a" }}>{t.storeSubscribedActive}</span>
                  </div>
                  {/* Date range */}
                  <div className="mx-4 mt-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-white/45 mb-1">{t.subCurrentPeriod}</p>
                    <p className="text-[13px] font-bold text-white">{formatSubDate(subStart)} – {formatSubDate(subEnd)}</p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {t.storeCollectorsPassPerks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[16px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                        <span className="text-[13px] font-semibold text-white/85">{perk}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4 pt-1">
                    <button
                      onClick={() => setCancelConfirm(true)}
                      className="w-full rounded-2xl border border-white/25 py-3 text-[14px] font-bold text-white/70"
                    >
                      {t.cancelSubscription}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Subscribe card */
              <div className="overflow-hidden rounded-2xl border border-[#e7b98a]" style={{ background: "linear-gradient(135deg,#78350f,#451a03)" }}>
                <div className="flex items-start justify-between px-4 pt-4 pb-1">
                  <div>
                    <p className="text-[17px] font-black text-white">{t.storeCollectorsPass}</p>
                    <p className="text-[11px] text-white/60">{t.storeCollectorsPassTagline}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-black leading-none" style={{ color: "#f59e0b" }}>¥980</p>
                    <p className="text-[10px] text-white/60">/month</p>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {t.storeCollectorsPassPerks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-[16px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                      <span className="text-[13px] font-semibold text-white/85">{perk}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4 pt-1">
                  <button
                    onClick={() => setSubSelectedPkg({ id: "sub_collectors_pass", coins: 0, freePoints: 0, jpy: 980, inrApprox: 980 * 0.613, subscriptionName: "Collector's Pass" })}
                    className="w-full rounded-2xl py-3.5 text-[15px] font-black text-white"
                    style={{ background: "#92400e" }}
                  >
                    {t.storeSubscribeCta}
                  </button>
                  <p className="mt-2 text-center text-[10px] text-white/45">{t.storeSubscribeLegal}</p>
                </div>
              </div>
            )}
          </div>

          {/* Purchase flow overlay */}
          {subSelectedPkg && (
            <PurchaseFlow
              pkg={subSelectedPkg}
              lang={lang}
              onComplete={handleSubComplete}
              onClose={() => setSubSelectedPkg(null)}
            />
          )}

          {/* Cancel confirmation modal */}
          {cancelConfirm && (
            <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
              <div className="w-full rounded-t-3xl bg-white px-5 pb-8 pt-5">
                <div className="mb-1 h-1 w-10 rounded-full bg-black/15 mx-auto" />
                <h2 className="mt-4 text-center text-[18px] font-extrabold text-[#1d2129]">{t.cancelSubTitle}</h2>
                <p className="mt-2 text-center text-[13.5px] leading-relaxed text-[#5b616b]">{t.cancelSubBody}</p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => { onCancelSubscription?.(); setCancelConfirm(false); setSubPanel(false); }}
                    className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-white"
                    style={{ background: "#B40206" }}
                  >
                    {t.cancelSubYes}
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="w-full rounded-2xl border-2 border-[#e5e8ec] py-3.5 text-[15px] font-bold text-[#1d2129]"
                  >
                    {t.cancelSubNo}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const RANKING_ROWS: { name: string; pts: number }[] = [
  { name: "ハルカ", pts: 184200 },
  { name: "Kenji_R", pts: 162850 },
  { name: "さくら姫", pts: 151300 },
  { name: "DragonMax", pts: 128940 },
  { name: "ユウト", pts: 117600 },
  { name: "Mochi🍡", pts: 99820 },
  { name: "TENKA", pts: 88410 },
  { name: "あおい", pts: 76250 },
  { name: "Rei_07", pts: 64180 },
  { name: "ぴょん", pts: 52030 },
];

function RankingOverlay({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = STR[lang];
  const youRank = 1287;
  const youPts = 3000;
  const medalColors = ["#f5c842", "#c9ced6", "#d79a5f"];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[86%] w-full flex-col overflow-hidden rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3">
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1d2129]">{t.mpRankingTitle}</h3>
            <p className="text-[11.5px] font-semibold text-[#8a9099]">{t.mpRankingSubtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2">
            {RANKING_ROWS.map((r, i) => {
              const top = i < 3;
              return (
                <div key={r.name} className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-[#f7f8fa] px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold" style={top ? { background: medalColors[i], color: "#5b3b10" } : { background: "#e5e8ec", color: "#5c626b" }}>{i + 1}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#d79a5f,#a9692f)" }}><CrownEmblem size={26} /></span>
                  <p className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#1d2129]">{r.name}</p>
                  <p className="shrink-0 text-[13px] font-extrabold text-[#B40206]">{t.mpRankingPts(r.pts)}</p>
                </div>
              );
            })}
          </div>
        </div>
        {/* Your rank (sticky footer) */}
        <div className="shrink-0 border-t border-black/10 bg-white px-3 py-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,#fbe6cf,#f6d3ad)", border: "1px solid #e7b98a" }}>
            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#7a4a1e] px-1.5 text-[12px] font-extrabold text-white">{youRank}</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#d79a5f,#a9692f)" }}><CrownEmblem size={26} /></span>
            <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-[#4a3010]">{t.mpRankingYou}</p>
            <p className="shrink-0 text-[13px] font-extrabold text-[#B40206]">{t.mpRankingPts(youPts)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RafMedal({ tone = "silver", size = 30 }: { tone?: "silver" | "gold"; size?: number }) {
  const g = tone === "gold" ? ["#f5c64a", "#b9821f"] : ["#d7dade", "#9aa0a8"];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" aria-hidden>
      <path d="M14 6l-3 9h6l3-9z" fill={g[1]} />
      <path d="M26 6l3 9h-6l-3-9z" fill={g[1]} />
      <circle cx="20" cy="25" r="11" fill={g[0]} stroke={g[1]} strokeWidth="2" />
      <circle cx="20" cy="25" r="6.5" fill="none" stroke={g[1]} strokeWidth="1.6" />
      <text x="20" y="29.5" textAnchor="middle" fontSize="9" fontWeight="900" fontStyle="italic" fill={g[1]}>O</text>
    </svg>
  );
}

// A decorative QR placeholder (not a real scannable code) for the invite page.
function FakeQR({ size = 116 }: { size?: number }) {
  const N = 21;
  const grid = useMemo(() => {
    const g: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
    const drawFinder = (br: number, bc: number) => {
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          g[br + r][bc + c] = edge || center;
        }
    };
    const inFinder = (r: number, c: number) => {
      const box = (br: number, bc: number) => r >= br && r <= br + 6 && c >= bc && c <= bc + 6;
      return box(0, 0) || box(0, N - 7) || box(N - 7, 0);
    };
    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);
    let seed = 987654321;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (inFinder(r, c)) continue;
        if (rnd() > 0.52) g[r][c] = true;
      }
    return g;
  }, []);
  const cell = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: "block" }}>
      {grid.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111317" /> : null
        )
      )}
    </svg>
  );
}

function ReferFriend({ lang, coins, onBack, onHome }: { lang: Lang; coins: number; onBack: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const link = "www.oripalot.com/fd-id=12317...";
  const ja = lang === "ja";
  const shareApps: { name: string; bg: string; icon: React.ReactNode }[] = [
    {
      name: "WhatsApp",
      bg: "#25D366",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M19.1 17.2c-.3-.2-1.7-.8-1.9-.9-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.2.2 2.2 3.4 5.4 4.7.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" /><path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3zm0 16.4c-1.4 0-2.8-.4-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1112 19.4z" /></svg>
      ),
    },
    {
      name: "Instagram",
      bg: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="1.1" fill="#fff" stroke="none" /></svg>
      ),
    },
    {
      name: "Facebook",
      bg: "#1877F2",
      icon: <span className="text-[30px] font-black leading-none text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>f</span>,
    },
    {
      name: "X",
      bg: "#000000",
      icon: <span className="text-[24px] font-black leading-none text-white">𝕏</span>,
    },
    {
      name: ja ? "リンクをコピー" : "Copy link",
      bg: "#8a9099",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" /></svg>
      ),
    },
  ];

  type FriendStatus = "send" | "sent" | "locked";
  const friends: { id: number; img: string; tag: string | null; status: FriendStatus }[] = [
    { id: 1, img: "/friend-1.png", tag: t.rafTagFreeSpin, status: "send" },
    { id: 2, img: "/friend-2.png", tag: t.rafTagSpecial, status: "sent" },
    { id: 3, img: "/friend-3.png", tag: t.rafTagQuests, status: "send" },
    { id: 4, img: "/friend-4.png", tag: t.rafTagScSpin, status: "sent" },
    { id: 5, img: "/friend-5.png", tag: null, status: "locked" },
    { id: 6, img: "/friend-6.png", tag: null, status: "locked" },
  ];

  const tagClass = (tag: string) =>
    tag === t.rafTagFreeSpin
      ? "bg-[#f7ccd4] text-[#c8061a]"
      : tag === t.rafTagSpecial
        ? "bg-[#fbe2b4] text-[#8a5a12]"
        : "bg-[#fbedbf] text-[#7a611a]";

  const statSticker = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M8 13l4-7 1 4h3l-4 7-1-4z" />
    </svg>
  );

  return (
    <div className="relative flex h-full flex-col bg-[#f3f4f6]">
      <style>{`
        @keyframes rafFade { from { opacity:0; } to { opacity:1; } }
        @keyframes rafSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <AppHeader coins={coins} t={t} onHome={onHome} />

      {/* Title row */}
      <div className="flex items-center gap-2 bg-[#f3f4f6] px-3 py-2.5">
        <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.rafTitle}</h2>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-4 pt-1">
          {/* Hero */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/refer-mascot.png" alt="" className="h-[150px] w-auto shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-extrabold uppercase leading-snug text-[#1d2129]">{t.rafHeroTitle}</p>
              <p className="mt-2 text-[13px] leading-snug text-[#3a3f47]">
                {t.rafHeroLead}
                <b className="font-extrabold text-[#B40206]">{t.rafHeroCoins}</b>
                {t.rafHeroAnd}
                <b className="font-extrabold text-[#B40206]">{t.rafHeroPoints}</b>
                {t.rafHeroTail}
              </p>
            </div>
          </div>

          {/* Scan QR button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-[14px] font-extrabold text-[#1d2129] shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M21 21v-3M14 21h3" /></svg>
              {ja ? "QRコードをスキャン" : "Scan QR code"}
            </button>
          </div>

          {/* Link + copy */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-12 flex-1 items-center rounded-xl border border-black/15 bg-white px-3 text-[13px] text-[#9aa0a8]">{link}</div>
            <button
              onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}
              className="h-12 shrink-0 rounded-xl bg-[#B40206] px-6 text-[15px] font-extrabold text-white active:brightness-95"
            >
              {copied ? t.rafCopied : t.rafCopy}
            </button>
          </div>

          {/* Share */}
          <button onClick={() => setShareOpen(true)} className="mt-3 h-12 w-full rounded-xl bg-[#111317] text-[15px] font-extrabold text-white active:brightness-110">{t.rafShare}</button>

          {/* My Milestones */}
          <h3 className="mb-3 mt-6 text-[18px] font-extrabold text-[#1d2129]">{t.rafMilestones}</h3>
          <div className="relative pt-9">
            <div className="flex items-start">
              {([
                { type: "start", label: t.rafLevel },
                { type: "trophy", label: "+5" },
                { type: "circle", label: "+10" },
                { type: "circle", label: "+15" },
                { type: "circle", label: "+20" },
              ] as { type: "start" | "trophy" | "circle"; label: string }[]).map((n, i) => {
                const reached = 1;
                const leftRed = i <= reached;
                const rightRed = i + 1 <= reached;
                return (
                  <div key={i} className="relative flex flex-1 flex-col items-center">
                    {i > 0 && <span className={`absolute left-0 top-[24px] h-[6px] w-1/2 -translate-y-1/2 ${leftRed ? "bg-[#B40206]" : "bg-[#cdd0d5]"}`} />}
                    <span className={`absolute right-0 top-[24px] h-[6px] w-1/2 -translate-y-1/2 ${rightRed ? "bg-[#B40206]" : "bg-[#cdd0d5]"}`} />
                    <div className="relative flex h-12 items-center justify-center">
                      {n.type === "trophy" && (
                        <span className="absolute -top-9 left-1/2 -translate-x-1/2">
                          <span className="relative block">
                            <span className="block whitespace-nowrap rounded-lg bg-[#B40206] px-3 py-1.5 text-[12px] font-extrabold leading-none text-white">{t.rafUnlocked}</span>
                            <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-[#B40206]" />
                          </span>
                        </span>
                      )}
                      {n.type === "start" && <span className="relative z-10 h-3 w-3 rounded-full bg-[#B40206] ring-2 ring-white" />}
                      {n.type === "circle" && <span className="relative z-10 h-4 w-4 rounded-full border-[3px] border-[#cfd3d9] bg-white" />}
                      {n.type === "trophy" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/claim-step.png" alt="" className="relative z-10 w-11 object-contain" />
                      )}
                    </div>
                    {n.type === "start" ? (
                      <span className="mt-1.5 max-w-[64px] text-center text-[10px] font-semibold leading-tight text-[#6b7178]">{n.label}</span>
                    ) : (
                      <span className={`mt-1.5 text-[15px] font-extrabold ${n.type === "trophy" ? "text-[#1d2129]" : "text-[#b3b8bf]"}`}>{n.label}</span>
                    )}
                    {n.type === "trophy" && (
                      <button className="mt-1.5 rounded-md border-2 border-[#B40206] px-4 py-1 text-[12px] font-extrabold text-[#B40206]">{t.rafClaim}</button>
                    )}
                  </div>
                );
              })}
              {/* ellipsis */}
              <div className="relative flex w-7 flex-col items-center">
                <span className="absolute left-0 top-[24px] h-[6px] w-1/2 -translate-y-1/2 bg-[#cdd0d5]" />
                <div className="flex h-12 items-center text-[18px] font-extrabold leading-none text-[#c2c6cc]">···</div>
              </div>
            </div>
          </div>

          {/* My Friends stats */}
          <h3 className="mb-3 mt-6 text-[18px] font-extrabold text-[#1d2129]">{t.rafMyFriends}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <p className="text-[14px] font-extrabold text-[#B40206]">{t.rafInvited}</p>
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[16px] font-extrabold text-[#1d2129]">{statSticker}100</p>
            </div>
            <div className="rounded-2xl bg-white p-3.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <p className="text-[14px] font-extrabold text-[#B40206]">{t.rafRewardsEarned}</p>
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-[#1d2129]"><CoinIcon size={18} />200,000</p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-[#1d2129]"><GemIcon size={18} />500</p>
            </div>
            <div className="rounded-2xl bg-white p-3.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <p className="text-[14px] font-extrabold text-[#B40206]">{t.rafQualified1}</p>
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[16px] font-extrabold text-[#1d2129]"><RafMedal tone="silver" size={26} />70</p>
            </div>
            <div className="rounded-2xl bg-white p-3.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <p className="text-[14px] font-extrabold text-[#B40206]">{t.rafQualified2}</p>
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[16px] font-extrabold text-[#1d2129]"><RafMedal tone="gold" size={26} />20</p>
            </div>
          </div>

          {/* Friend Boosts */}
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-start gap-3">
              <span className="text-[30px] leading-none">🚀</span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-extrabold text-[#1d2129]">{t.rafFriendBoosts}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#3a3f47]">{t.rafBoostDesc}</p>
              </div>
              <button className="shrink-0 self-center rounded-lg border-2 border-[#B40206] px-3 py-2 text-[12.5px] font-extrabold text-[#B40206]">{t.rafSendAll}</button>
            </div>

            <button className="mt-3 flex w-full items-center justify-between rounded-xl border border-black/15 px-3.5 py-3 text-[14px] font-bold text-[#1d2129]">
              <span className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 3v4M16 3v4" strokeLinecap="round" /></svg>
                {t.rafFilter}
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a8" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            <div className="mt-1">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 border-t border-black/[0.07] py-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f1f2f4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.img} alt="" className="h-full w-full scale-110 object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-extrabold text-[#1d2129]">{t.rafFriendName}</p>
                    <p className="text-[11.5px] font-semibold text-[#9aa0a8]">{t.rafFriendId}</p>
                    {f.tag && <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tagClass(f.tag)}`}>{f.tag}</span>}
                  </div>
                  {f.status === "send" && (
                    <button className="shrink-0 self-center rounded-lg border-2 border-[#B40206] px-3.5 py-2 text-[12.5px] font-extrabold text-[#B40206]">{t.rafSendBoost}</button>
                  )}
                  {f.status === "sent" && (
                    <button disabled className="shrink-0 self-center rounded-lg bg-[#f0a0a8] px-5 py-2 text-[12.5px] font-extrabold text-[#5b1018]">{t.rafSent}</button>
                  )}
                  {f.status === "locked" && (
                    <button disabled className="shrink-0 self-center rounded-lg border border-black/15 px-3 py-2 text-[12px] font-bold text-[#b3b8bf]">{t.rafLockedBtn}</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <h3 className="mb-4 mt-7 text-[18px] font-extrabold text-[#1d2129]">{t.rafHowItWorks}</h3>
          <div className="space-y-0">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="2" strokeLinejoin="round"><path d="M9.5 13.5l5-5M8 11l-1.5 1.5a3.5 3.5 0 005 5L13 16M16 13l1.5-1.5a3.5 3.5 0 00-5-5L11 8" strokeLinecap="round" /></svg>
                <span className="my-1 w-[2px] flex-1 bg-[#B40206]" />
              </div>
              <div className="flex-1 pb-5">
                <p className="text-[17px] font-extrabold text-[#1d2129]">{t.rafStep1Title}</p>
                <p className="mt-1 text-[14px] leading-snug text-[#3a3f47]">{t.rafStep1Desc}</p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <RafMedal tone="silver" size={44} />
                <span className="my-1 w-[2px] flex-1 bg-[#B40206]" />
              </div>
              <div className="flex-1 pb-5">
                <p className="text-[17px] font-extrabold leading-snug text-[#1d2129]">
                  {t.rafStepRewardLead}<span className="text-[#B40206]">{t.rafStepRewardCoins}</span>{t.rafStepRewardMid}<span className="text-[#B40206]">{t.rafStepRewardPoints}</span>{t.rafStepRewardBang}
                </p>
                <p className="mt-1 text-[14px] leading-snug text-[#3a3f47]">{t.rafStep2Desc}</p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <RafMedal tone="gold" size={44} />
              </div>
              <div className="flex-1">
                <p className="text-[17px] font-extrabold leading-snug text-[#1d2129]">
                  {t.rafStepRewardLead}<span className="text-[#B40206]">{t.rafStepRewardCoins}</span>{t.rafStepRewardMid}<span className="text-[#B40206]">{t.rafStepRewardPoints}</span>{t.rafStepRewardBang}
                </p>
                <p className="mt-1 text-[14px] leading-snug text-[#3a3f47]">{t.rafStep3Desc}</p>
              </div>
            </div>
          </div>
        </div>

        <SiteFooter t={t} />
      </div>

      {/* QR code modal */}
      {qrOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-8" onClick={() => setQrOpen(false)}>
          <div className="absolute inset-0 bg-black/50" style={{ animation: "rafFade .2s ease both" }} />
          <div
            className="relative flex w-full max-w-[300px] flex-col items-center rounded-2xl bg-white px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            style={{ animation: "rafSheet .28s cubic-bezier(.22,1,.36,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setQrOpen(false)} aria-label={ja ? "閉じる" : "Close"} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/5 active:bg-black/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <FakeQR size={188} />
            <p className="mt-4 text-center text-[13px] font-semibold text-[#6b7280]">{ja ? "QRコードをスキャンして招待" : "Scan the QR code to invite"}</p>
          </div>
        </div>
      )}

      {/* Fake native share sheet */}
      {shareOpen && (
        <div className="absolute inset-0 z-50" onClick={() => setShareOpen(false)}>
          <div className="absolute inset-0 bg-black/40" style={{ animation: "rafFade .2s ease both" }} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-[#f2f2f7] pb-5 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.35)]"
            style={{ animation: "rafSheet .28s cubic-bezier(.22,1,.36,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-black/20" />
            <p className="px-4 pb-1 text-[13px] font-bold text-[#6b7280]">{ja ? "共有" : "Share via"}</p>
            <div className="no-scrollbar flex items-start gap-3.5 overflow-x-auto px-4 py-3">
              {shareApps.map((a) => (
                <button key={a.name} onClick={() => setShareOpen(false)} className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 active:scale-95">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.18)]" style={{ background: a.bg }}>{a.icon}</span>
                  <span className="text-center text-[10.5px] font-semibold leading-tight text-[#1d2129]">{a.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShareOpen(false)} className="mx-4 mt-2 h-12 w-[calc(100%-2rem)] rounded-xl bg-white text-[15px] font-bold text-[#007aff] shadow-[0_1px_3px_rgba(0,0,0,0.1)] active:bg-black/5">
              {ja ? "キャンセル" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestTarget({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="1.9" className="shrink-0" aria-hidden>
      <circle cx="11" cy="13" r="8" />
      <circle cx="11" cy="13" r="4.2" />
      <circle cx="11" cy="13" r="1" fill="#B40206" stroke="none" />
      <path d="M16 8l2.5-2.5M16 8l.3 2.4 2.4.3L21.2 8 19 7.8 18.8 5.6z" strokeLinejoin="round" />
    </svg>
  );
}

// ----- Beginner's Quest (starter onboarding quest) -----
type QuestReward = { kind: "coins" | "boost" | "draw"; label: { en: string; ja: string } };
type QuestTask = { id: string; label: { en: string; ja: string } };
type QuestStep = { id: string; title: { en: string; ja: string }; tasks: QuestTask[]; reward: QuestReward };

const STARTER_STEPS: QuestStep[] = [
  {
    id: "s1",
    title: { en: "Step 1 · Get started", ja: "ステップ1・スタート" },
    tasks: [{ id: "purchase", label: { en: "Make your first purchase", ja: "はじめての購入をする" } }],
    reward: { kind: "coins", label: { en: "1,000 free coins", ja: "無料コイン 1,000" } },
  },
  {
    id: "s2",
    title: { en: "Step 2 · Try your luck", ja: "ステップ2・運試し" },
    tasks: [
      { id: "draw", label: { en: "Make a draw", ja: "ガチャを引く" } },
      { id: "boost", label: { en: "Make a draw using the Extra Boost", ja: "ブースターを使ってガチャを引く" } },
    ],
    reward: { kind: "boost", label: { en: "Free Extra Boost", ja: "無料エクストラブースター" } },
  },
  {
    id: "s3",
    title: { en: "Step 3 · Cash in", ja: "ステップ3・交換" },
    tasks: [{ id: "exchange", label: { en: "Exchange cards worth 1,500 coins", ja: "1,500コイン分のカードを交換" } }],
    reward: { kind: "draw", label: { en: "Free card draw", ja: "無料ガチャ 1回" } },
  },
];

const QUEST_CONFETTI = Array.from({ length: 20 }).map((_, i) => {
  const ang = (i / 20) * Math.PI * 2 + (i % 3);
  const dist = 70 + (i % 5) * 22;
  const colors = ["#ffd24a", "#ef4444", "#36b54a", "#2f6fed", "#ff77b6", "#ff8a00"];
  return { cx: Math.round(Math.cos(ang) * dist), cy: Math.round(Math.sin(ang) * dist), rot: (i * 57) % 360, color: colors[i % colors.length], delay: (i % 6) * 0.03 };
});

function RewardIcon({ kind, size = 34 }: { kind: QuestReward["kind"]; size?: number }) {
  const src = kind === "coins" ? "/coin.png" : kind === "boost" ? "/boost.png" : "/card-ur.png";
  // The card art is portrait, so give it a touch more height
  const h = kind === "draw" ? Math.round(size * 1.32) : size;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      className={kind === "draw" ? "rounded-[5px] object-contain" : "object-contain"}
      style={{ width: size, height: h, filter: "drop-shadow(0 6px 9px rgba(0,0,0,.5)) drop-shadow(0 2px 3px rgba(0,0,0,.35))" }}
    />
  );
}

function FirstQuest({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const L = ja
    ? { title: "ビギナークエスト", sub: "3つのステップをクリアして豪華報酬をゲット！", overall: "クエスト全体の進捗", go: "やる", done: "完了", claim: "受け取る", claimed: "受取済み", reward: "報酬", grandTitle: "グランプリ", grandReward: "無料ガチャ 3回", grandLocked: "3ステップすべてクリアで解放", grandClaim: "グランプリを受け取る", grandDone: "おめでとう！受け取りました 🎉" }
    : { title: "Beginner's Quest", sub: "Clear all 3 steps to unlock a grand reward!", overall: "Overall quest progress", go: "Go", done: "Done", claim: "Claim", claimed: "Claimed", reward: "Reward", grandTitle: "Grand prize", grandReward: "3× Free card draws", grandLocked: "Clear all 3 steps to unlock", grandClaim: "Claim grand prize", grandDone: "Congrats! Grand prize claimed 🎉" };

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [grandClaimed, setGrandClaimed] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [render, setRender] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const totalItems = STARTER_STEPS.length + 1; // steps + grand prize card

  function toggleQuest() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (expanded) {
      // Play the staggered exit, then unmount once it finishes.
      setExpanded(false);
      closeTimer.current = setTimeout(() => setRender(false), 700);
    } else {
      setRender(true);
      requestAnimationFrame(() => setExpanded(true));
    }
  }

  const claimedCount = STARTER_STEPS.filter((s) => claimed[s.id]).length;
  const allClaimed = claimedCount === STARTER_STEPS.length;
  const overallPct = Math.round(
    (STARTER_STEPS.reduce((acc, s) => {
      const d = s.tasks.filter((tk) => done[s.id + ":" + tk.id]).length;
      return acc + (claimed[s.id] ? 1 : d / s.tasks.length);
    }, 0) /
      STARTER_STEPS.length) *
      100
  );

  function fireConfetti(id: string) {
    setCelebrate(id);
    setTimeout(() => setCelebrate((c) => (c === id ? null : c)), 1300);
  }

  function toggleTask(stepId: string, taskId: string) {
    const key = stepId + ":" + taskId;
    if (done[key]) return;
    setDone((d) => ({ ...d, [key]: true }));
  }

  function claimStep(step: QuestStep) {
    setClaimed((c) => ({ ...c, [step.id]: true }));
    fireConfetti(step.id);
  }

  return (
    <div className="px-4 pt-4">
      <style>{`
        @keyframes fqIn { from { opacity:0; transform: translateY(20px) scale(.97); } to { opacity:1; transform: none; } }
        @keyframes fqOut { from { opacity:1; transform: none; } to { opacity:0; transform: translateY(14px) scale(.96); } }
        @keyframes fqPop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes fqGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,205,70,.6); } 50% { box-shadow: 0 0 0 9px rgba(255,205,70,0); } }
        @keyframes fqConf { 0% { transform: translate(0,0) rotate(0deg); opacity:1; } 100% { transform: translate(var(--cx), var(--cy)) rotate(var(--cr)); opacity:0; } }
        @keyframes fqShine { 0% { background-position: -120% 0; } 100% { background-position: 220% 0; } }
        @keyframes fqStamp { 0% { transform: scale(2.2) rotate(-14deg); opacity:0; } 60% { opacity:1; } 100% { transform: scale(1) rotate(-8deg); opacity:1; } }
        @keyframes fqTwinkle { 0%,100% { opacity:.25; transform: scale(.7); } 50% { opacity:1; transform: scale(1.1); } }
        @keyframes fqFloat { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-5px) rotate(3deg); } }
        @keyframes fqBgDrift { 0% { transform: scale(1.08) translateX(0); } 100% { transform: scale(1.18) translateX(-3%); } }
      `}</style>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
        {/* Flashy header — toggles the quest open/closed */}
        <button
          type="button"
          onClick={toggleQuest}
          aria-expanded={expanded}
          className="relative w-full overflow-hidden px-4 pb-4 pt-4 text-left text-white transition active:scale-[0.99]"
          style={{ background: "linear-gradient(120deg,#c8061a 0%,#8a0f4a 52%,#3a1030 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(110deg,transparent 35%,rgba(255,255,255,.28) 50%,transparent 65%)", backgroundSize: "240% 100%", animation: "fqShine 3.2s ease-in-out infinite" }} />
          {[
            { l: "12%", t: "20%", d: "0s" }, { l: "62%", t: "14%", d: ".5s" }, { l: "84%", t: "55%", d: "1s" }, { l: "34%", t: "70%", d: "1.4s" },
          ].map((s, i) => (
            <span key={i} className="pointer-events-none absolute text-[12px]" style={{ left: s.l, top: s.t, animation: `fqTwinkle 2.2s ease-in-out ${s.d} infinite` }}>✨</span>
          ))}
          <div className="relative flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[20px] font-black leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">🚀 {L.title}</h3>
              <p className="mt-0.5 text-[12px] font-semibold text-white/80">{L.sub}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full px-3 py-1.5 text-[13px] font-black text-[#7a0f1a] shadow-[0_2px_8px_rgba(0,0,0,0.3)]" style={{ background: "linear-gradient(135deg,#ffe9a8,#ffc24a)" }}>{claimedCount}/{STARTER_STEPS.length}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>

          {/* Overall quest progress */}
          <div className="relative mt-3">
            <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold text-white/85">
              <span>{L.overall}</span>
              <span>{overallPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/25">
              <span className="block h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${overallPct}%`, background: "linear-gradient(90deg,#ffe9a8,#ffc24a)", boxShadow: "0 0 8px rgba(255,205,70,.6)" }} />
            </div>
          </div>
        </button>

        {render && (
        <div className="space-y-2.5 p-3">
          {STARTER_STEPS.map((step, idx) => {
            const total = step.tasks.length;
            const doneN = step.tasks.filter((tk) => done[step.id + ":" + tk.id]).length;
            const complete = doneN === total;
            const isClaimed = !!claimed[step.id];
            const rewardBg = step.reward.kind === "coins" ? "/reward-bg-coins.png" : step.reward.kind === "boost" ? "/reward-bg-boost.png" : "/reward-bg-draw.png";
            return (
              <div
                key={step.id}
                className="relative flex gap-2.5"
                style={{
                  animation: expanded
                    ? `fqIn .7s cubic-bezier(.22,1,.36,1) ${idx * 0.33}s both`
                    : `fqOut .35s ease ${(totalItems - 1 - idx) * 0.1}s both`,
                }}
              >
                {/* Connector rail — links the steps into one journey */}
                <div className="relative flex w-7 shrink-0 flex-col items-center pt-3">
                  <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]" style={{ background: isClaimed ? "linear-gradient(135deg,#36b54a,#1f9d3a)" : complete ? "linear-gradient(135deg,#ffb02e,#ff7a00)" : "linear-gradient(135deg,#ff5a5f,#c8061a)" }}>{isClaimed ? "✓" : idx + 1}</span>
                  {idx < STARTER_STEPS.length - 1 && (
                    <span className="absolute left-1/2 top-[40px] w-[3px] -translate-x-1/2 rounded-full" style={{ bottom: "-22px", background: isClaimed ? "linear-gradient(#36b54a,#9be0ab)" : "linear-gradient(#ffb02e,#ff5a5f)" }} />
                  )}
                </div>

                {/* Step card */}
                <div
                  className="relative flex-1 overflow-hidden rounded-2xl p-3"
                  style={{
                    background: isClaimed ? "linear-gradient(160deg,#eafaf0,#d3f3df)" : "linear-gradient(160deg,#ffffff,#fff4f4)",
                    border: isClaimed ? "2px solid #36b54a" : complete ? "2px solid #ffb02e" : "2px solid #ffd9d9",
                    boxShadow: complete && !isClaimed ? "0 0 18px rgba(255,176,46,.45)" : "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                {/* Step title */}
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[13px] font-extrabold text-[#1d2129]">{step.title[lang]}</span>
                </div>

                {/* Reward (compact) */}
                <div className="relative mt-2 h-[52px] overflow-hidden rounded-xl px-2.5 py-1.5" style={{ border: "1.5px solid #f3c563", boxShadow: "0 3px 10px rgba(243,160,40,.28)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rewardBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" style={{ animation: "fqBgDrift 12s ease-in-out infinite alternate" }} />
                  <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(0,0,0,.62) 0%,rgba(0,0,0,.34) 48%,rgba(0,0,0,.12) 100%)" }} />
                  <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(110deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%)", backgroundSize: "240% 100%", animation: "fqShine 2.6s ease-in-out infinite" }} />
                  <div className="relative flex h-full items-center gap-2.5">
                    <span className="relative flex h-[40px] w-[40px] shrink-0 items-center justify-center">
                      <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,.45) 0%, rgba(255,255,255,0) 62%)" }} />
                      <span className="relative" style={{ animation: "fqFloat 3s ease-in-out infinite" }}><RewardIcon kind={step.reward.kind} size={30} /></span>
                    </span>
                    <div className="min-w-0">
                      <div className="text-[8px] font-black uppercase tracking-[0.16em] text-[#ffe9a8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{L.reward}</div>
                      <div className="text-[13px] font-black leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">{step.reward.label[lang]}</div>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="mt-2 space-y-1">
                  {step.tasks.map((tk) => {
                    const tDone = !!done[step.id + ":" + tk.id];
                    return (
                      <div key={tk.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition" style={{ background: tDone ? "linear-gradient(135deg,#e9f9ef,#d7f3e1)" : "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: tDone ? "#36b54a" : "#e6e8ec", animation: tDone ? "fqPop .35s ease both" : "none" }}>
                          {tDone && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4"><path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        <span className="flex-1 text-[12px] font-semibold leading-snug" style={{ color: tDone ? "#9aa0a8" : "#374151", textDecoration: tDone ? "line-through" : "none" }}>{tk.label[lang]}</span>
                        {!tDone && (
                          <button onClick={() => toggleTask(step.id, tk.id)} className="h-6 shrink-0 rounded-md px-3.5 text-[11.5px] font-extrabold text-white active:scale-95" style={{ background: "linear-gradient(135deg,#ff5a5f,#c8061a)" }}>{L.go}</button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Claim button */}
                <button
                  onClick={() => complete && !isClaimed && claimStep(step)}
                  disabled={!complete || isClaimed}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-black text-white transition disabled:cursor-default"
                  style={{ background: isClaimed ? "#9aa0a8" : complete ? "linear-gradient(135deg,#36b54a,#1f9d3a)" : "#d3d6db", animation: complete && !isClaimed ? "fqGlow 1.3s ease-out infinite" : "none" }}
                >
                  {isClaimed ? "✓ " + L.claimed : L.claim}
                  {complete && !isClaimed && <RewardIcon kind={step.reward.kind} size={18} />}
                </button>

                {/* Step 3 point meter */}
                {step.id === "s3" && (() => {
                  const pts = complete ? 1500 : 0;
                  const pct = Math.round((pts / 1500) * 100);
                  return (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold">
                        <span className="text-[#8a6d1a]">{ja ? "交換ポイント" : "Exchange points"}</span>
                        <span className="text-[#1d2129]">{pts.toLocaleString()} / 1,500</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#eceef1]">
                        <span className="block h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#ffd24a,#ff8a00)" }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Confetti burst on claim */}
                {celebrate === step.id && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    {QUEST_CONFETTI.map((p, i) => (
                      <span key={i} className="absolute h-2 w-2 rounded-[2px]" style={{ background: p.color, ["--cx" as string]: `${p.cx}px`, ["--cy" as string]: `${p.cy}px`, ["--cr" as string]: `${p.rot}deg`, animation: `fqConf .9s ease-out ${p.delay}s forwards` }} />
                    ))}
                  </div>
                )}
                </div>
              </div>
            );
          })}

          {/* Grand prize — hero card */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 text-center"
            style={{
              animation: expanded
                ? `fqIn .7s cubic-bezier(.22,1,.36,1) ${STARTER_STEPS.length * 0.33}s both`
                : `fqOut .35s ease 0s both`,
              background: allClaimed ? "linear-gradient(160deg,#2a0f3a 0%,#5a0f2e 55%,#c8061a 100%)" : "linear-gradient(160deg,#23262b,#3a2030)",
              border: allClaimed ? "2px solid #ffd24a" : "2px dashed #555a63",
              boxShadow: allClaimed ? "0 0 26px rgba(255,176,46,.5)" : "0 4px 14px rgba(0,0,0,0.25)",
            }}
          >
            {/* rotating ray backdrop when unlocked */}
            {allClaimed && (
              <span className="pointer-events-none absolute left-1/2 top-[44%] -z-0 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 opacity-50" style={{ background: "conic-gradient(from 0deg, rgba(255,210,74,.0) 0deg, rgba(255,210,74,.5) 22deg, rgba(255,210,74,0) 44deg, rgba(255,210,74,.0) 90deg, rgba(255,210,74,.5) 112deg, rgba(255,210,74,0) 134deg, rgba(255,210,74,0) 180deg, rgba(255,210,74,.5) 202deg, rgba(255,210,74,0) 224deg, rgba(255,210,74,0) 270deg, rgba(255,210,74,.5) 292deg, rgba(255,210,74,0) 314deg)", animation: "gaSpin 9s linear infinite", borderRadius: "9999px" }} />
            )}
            {allClaimed ? (
              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffd24a]">🏆 {L.grandTitle}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pack.png" alt="" className="mx-auto mt-2 h-[120px] w-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]" style={{ animation: "fqFloat 3.2s ease-in-out infinite" }} />
                <p className="mt-2 text-[24px] font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{L.grandReward}</p>
                {grandClaimed ? (
                  <div className="mt-3 inline-block rounded-xl bg-[#36b54a] px-5 py-2.5 text-[14px] font-black text-white shadow-lg" style={{ animation: "fqStamp .5s ease both" }}>{L.grandDone}</div>
                ) : (
                  <button onClick={() => { setGrandClaimed(true); fireConfetti("grand"); }} className="relative mt-3 w-full overflow-hidden rounded-xl py-3 text-[15px] font-black text-[#5a0f1a]" style={{ background: "linear-gradient(135deg,#ffe9a8,#ffc24a)", animation: "fqGlow 1.3s ease-out infinite", boxShadow: "0 4px 14px rgba(255,176,46,.5)" }}>
                    <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(110deg,transparent 35%,rgba(255,255,255,.85) 50%,transparent 65%)", backgroundSize: "240% 100%", animation: "fqShine 2s ease-in-out infinite" }} />
                    <span className="relative">{L.grandClaim} 🎉</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="relative flex flex-col items-center gap-2 py-1">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#cdd1d6"><path d="M7 10V8a5 5 0 0110 0v2h1.2A1.8 1.8 0 0120 11.8v7.4A1.8 1.8 0 0118.2 21H5.8A1.8 1.8 0 014 19.2v-7.4A1.8 1.8 0 015.8 10H7zm2 0h6V8a3 3 0 00-6 0z" /></svg>
                </span>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffd24a]">🏆 {L.grandTitle}</p>
                <p className="text-[18px] font-black text-white">{L.grandReward}</p>
                <p className="text-[11.5px] font-semibold text-white/55">🔒 {L.grandLocked}</p>
              </div>
            )}
            {celebrate === "grand" && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                {QUEST_CONFETTI.map((p, i) => (
                  <span key={i} className="absolute h-2.5 w-2.5 rounded-[2px]" style={{ background: p.color, ["--cx" as string]: `${p.cx * 1.5}px`, ["--cy" as string]: `${p.cy * 1.5}px`, ["--cr" as string]: `${p.rot}deg`, animation: `fqConf 1.1s ease-out ${p.delay}s forwards` }} />
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function QuestScreen({ lang, coins, onClose }: { lang: Lang; coins: number; onClose: () => void }) {
  const t = STR[lang];
  const [open, setOpen] = useState<number | null>(3);

  type Mission = { n: number; pct: number; action: "claim" | "go" };
  const missions: Mission[] = [
    { n: 1, pct: 100, action: "claim" },
    { n: 2, pct: 50, action: "go" },
    { n: 3, pct: 80, action: "go" },
  ];

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ background: "linear-gradient(180deg,#8d0c10 0%,#b30910 38%,#c8061a 100%)" }}>
        {/* Hero */}
        <div className="relative px-4 pt-3">
          <button onClick={onClose} aria-label={t.backAria} className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] active:bg-black/5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="flex items-center gap-2 pt-9">
            <h2 className="flex-1 text-[28px] font-black uppercase leading-[1.02]" style={{ color: "#ffd24a", textShadow: "0 2px 0 #a8390a, 2px 0 0 #a8390a, 0 0 6px rgba(255,160,40,0.5)" }}>{t.qHeroTitle}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/refer-mascot.png" alt="" className="h-[132px] w-auto shrink-0 object-contain" />
          </div>
          <div className="-mt-3 mb-1 rounded-2xl bg-white px-4 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            <p className="text-[12px] font-semibold leading-snug text-[#3a3f47]">{t.qHeroDesc}</p>
          </div>
        </div>

        {/* Beginner's Quest (starter onboarding quest) */}
        <FirstQuest lang={lang} />

        {/* Ultimate reward card */}
        <div className="px-4 pt-3">
          <div className="relative rounded-2xl px-4 pb-4 pt-7 shadow-[0_4px_14px_rgba(0,0,0,0.25)]" style={{ background: "linear-gradient(160deg,#fff6dd,#ffe6ad)", border: "2px solid #f3c563" }}>
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#c8061a] px-5 py-1.5 text-[14px] font-extrabold text-white shadow" style={{ clipPath: "polygon(6px 0,calc(100% - 6px) 0,100% 50%,calc(100% - 6px) 100%,6px 100%,0 50%)" }}>{t.qUltimate}</span>
            <div className="flex items-center gap-3">
              <CoinIcon size={48} />
              <p className="text-[26px] font-black text-[#1d2129]">10,000<span className="ml-1 align-middle text-[13px] font-extrabold text-[#5b616b]">{t.qCoinsSuffix}</span></p>
            </div>
            <div className="relative mt-3 h-6 w-full overflow-hidden rounded-md bg-[#e7d29a]">
              <span className="block h-full rounded-md bg-[#c8061a]" style={{ width: "50%" }} />
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-white">50%</span>
            </div>
            <div className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#c8061a] py-1.5 text-[13px] font-extrabold text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t.qEndsIn} 03:08:32
            </div>
          </div>
        </div>

        {/* Missions */}
        <div className="space-y-3 px-4 py-4">
          {missions.map((m) => {
            const isOpen = open === m.n;
            return (
              <div key={m.n} className="rounded-2xl border-2 border-[#B40206] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                <div className="flex items-center gap-1.5">
                  <QuestTarget size={20} />
                  <span className="text-[14px] font-extrabold uppercase tracking-wide text-[#B40206]">{t.qMission} {m.n}</span>
                </div>
                <p className="mt-1.5 text-[15px] font-bold text-[#1d2129]">{t.qMissionTitle}</p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-[#e6e8ec]">
                    <span className="block h-full rounded-lg" style={{ width: `${m.pct}%`, background: m.pct >= 100 ? "#36b54a" : "#c8061a" }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-white">{m.pct}%</span>
                  </div>
                  {m.action === "claim" ? (
                    <button className="h-9 shrink-0 rounded-lg border-2 border-[#B40206] px-4 text-[13.5px] font-extrabold text-[#1d2129]">{t.qClaim}</button>
                  ) : (
                    <button className="h-9 w-[110px] shrink-0 rounded-lg bg-[#c8061a] text-[13.5px] font-extrabold text-white">{t.qGo}</button>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[14px] font-extrabold text-[#1d2129]">{t.qRewards}<GemIcon size={20} />100</span>
                  <button onClick={() => setOpen(isOpen ? null : m.n)} className="flex items-center gap-1 text-[13px] font-semibold text-[#3a3f47]">
                    {t.qShowDetails}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8061a" strokeWidth="2.2" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
                {isOpen && <p className="mt-2.5 border-t border-black/10 pt-2.5 text-[12.5px] leading-relaxed text-[#5b616b]">{t.qDetailsBody}</p>}
              </div>
            );
          })}

          {/* Locked */}
          {[0, 1].map((i) => (
            <div key={`lock${i}`} className="rounded-2xl bg-white/95 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
              <div className="flex flex-col items-center gap-2 pb-2">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#9aa0a8"><path d="M7 10V8a5 5 0 0110 0v2h1.2A1.8 1.8 0 0120 11.8v7.4A1.8 1.8 0 0118.2 21H5.8A1.8 1.8 0 014 19.2v-7.4A1.8 1.8 0 015.8 10H7zm2 0h6V8a3 3 0 00-6 0z" /></svg>
                <p className="text-[13.5px] font-semibold text-[#8a9099]">{t.qLocked}</p>
              </div>
              <div className="border-t border-black/10 pt-3">
                <span className="flex items-center gap-2 text-[14px] font-extrabold text-[#1d2129]">{t.qRewards}<GemIcon size={20} />100</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type FaqEntry = { q: { en: string; ja: string }; a: { en: string; ja: string } };
type FaqCategory = { key: string; label: { en: string; ja: string }; items: FaqEntry[] };

const FAQ_CATS: FaqCategory[] = [
  {
    key: "account",
    label: { en: "Member Registration & Account", ja: "会員登録・アカウント" },
    items: [
      {
        q: { en: "How do I register?", ja: "会員登録の方法を教えてください。" },
        a: {
          en: "Registering for OriPalot is simple and free — there are no membership or annual fees. Tap “Register” at the top right or on the top page, choose your sign-up method (email or social), enter your details, and verify your account from the confirmation email.",
          ja: "「オリパロット」への会員登録は、以下の手順で簡単に行っていただけます（入会金・年会費は一切かかりません）。画面右上、またはトップページにある「登録」ボタンをタップし、ご希望の登録方法を選択。必要事項を入力し、認証メールから登録を完了してください。",
        },
      },
      {
        q: { en: "I forgot my password. What should I do?", ja: "パスワードを忘れた場合はどうすればいいですか？" },
        a: {
          en: "On the login screen, tap “Forgot password”, enter your registered email address, and follow the reset link we send you.",
          ja: "ログイン画面で「パスワードをお忘れの方」をタップし、登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。",
        },
      },
    ],
  },
  {
    key: "coin",
    label: { en: "Coin Payment", ja: "コイン決済" },
    items: [
      {
        q: { en: "How do I purchase coins?", ja: "コインの購入方法を教えてください。" },
        a: {
          en: "Open the store, choose a coin pack, and complete payment with your preferred method. Coins are credited to your balance immediately after purchase.",
          ja: "ストアからコインパックを選び、ご希望の決済方法でお支払いください。購入後、コインはすぐに残高へ反映されます。",
        },
      },
      {
        q: { en: "Which payment methods are available?", ja: "利用できる支払い方法は何ですか？" },
        a: {
          en: "Major credit cards and common online payment methods are supported. Available options may vary by region.",
          ja: "主要なクレジットカードや一般的なオンライン決済に対応しています。ご利用いただける方法は地域により異なる場合があります。",
        },
      },
    ],
  },
  {
    key: "gacha",
    label: { en: "Using Oripa & Gacha", ja: "オリパ・ガチャの利用" },
    items: [
      {
        q: { en: "How do I draw an Oripa?", ja: "オリパの引き方を教えてください。" },
        a: {
          en: "Pick an Oripa, choose the number of draws, and tap “Draw”. Your results and prizes appear instantly and are saved to your prize history.",
          ja: "オリパを選び、引く回数を指定して「引く」をタップしてください。結果と景品はすぐに表示され、当選履歴に保存されます。",
        },
      },
      {
        q: { en: "What happens to the prizes I win?", ja: "獲得した景品はどうなりますか？" },
        a: {
          en: "Won prizes are stored in your prize history, where you can convert them to coins or request shipping.",
          ja: "当選した景品は当選履歴に保存され、コインへの交換または発送の申請ができます。",
        },
      },
    ],
  },
  {
    key: "shipping",
    label: { en: "Prize Shipping & Delivery", ja: "景品発送・お届け" },
    items: [
      {
        q: { en: "How do I request shipping?", ja: "景品の発送を申請するには？" },
        a: {
          en: "From your prize history, select the prizes you want shipped (minimum total of 1,500 coins) and enter your delivery address. Delivery is made within 14 business days of the request.",
          ja: "当選履歴から発送したい景品を選択し（合計1,500コイン以上）、お届け先住所を入力してください。発送はご申請から14営業日以内に行われます。",
        },
      },
      {
        q: { en: "What happens if I don’t request shipping in time?", ja: "期限内に発送申請しないとどうなりますか？" },
        a: {
          en: "Prizes that aren’t requested for shipping within 7 days are automatically converted into coins.",
          ja: "7日以内に発送申請がない景品は、自動的にコインへ交換されます。",
        },
      },
    ],
  },
  {
    key: "trouble",
    label: { en: "Troubleshooting & Others", ja: "トラブル・その他" },
    items: [
      {
        q: { en: "The app isn’t working properly. What should I do?", ja: "アプリが正しく動作しません。どうすればいいですか？" },
        a: {
          en: "Try reloading the page, updating to the latest version, and clearing your browser cache. If the issue persists, contact support from the Contact menu.",
          ja: "ページの再読み込み、最新版への更新、ブラウザのキャッシュ削除をお試しください。解決しない場合は「お問い合わせ」からご連絡ください。",
        },
      },
      {
        q: { en: "How do I contact support?", ja: "サポートへの問い合わせ方法は？" },
        a: {
          en: "Open “Contact” from My Account and send us your question. Our support team is available 24/7.",
          ja: "マイアカウントの「お問い合わせ」からご質問をお送りください。サポートは24時間対応しています。",
        },
      },
    ],
  },
];

function faqIcon(key: string, size = 26) {
  const c = "#B40206";
  switch (key) {
    case "account":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19a6.5 6.5 0 0113 0" strokeLinecap="round" /></svg>;
    case "coin":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round"><path d="M7 5l5 6 5-6M12 11v8M8 13h8M8 16.5h8" /></svg>;
    case "gacha":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><rect x="4" y="6" width="9" height="13" rx="1.6" transform="rotate(-10 8.5 12.5)" opacity="0.5" /><rect x="9" y="5" width="9" height="13" rx="1.6" transform="rotate(8 13.5 11.5)" /></svg>;
    case "shipping":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg>;
    default:
      return <svg width={size} height={size} viewBox="0 0 24 24" fill={c}><circle cx="12" cy="12" r="9.5" /><path d="M9.5 9.2a2.6 2.6 0 015 .8c0 1.6-2.2 1.8-2.2 3.4M12 17.2h.01" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" /></svg>;
  }
}

function FaqScreen({ lang, coins, onBack, onHome }: { lang: Lang; coins: number; onBack: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ "account-0": true });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggle = (id: string) => setOpenItems((s) => ({ ...s, [id]: !s[id] }));
  const jumpTo = (key: string) => {
    const el = sectionRefs.current[key];
    const cont = scrollRef.current;
    if (el && cont) cont.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
  };

  return (
    <div className="flex h-full flex-col bg-[#f3f4f6]">
      <AppHeader coins={coins} t={t} onHome={onHome} />

      <div className="flex items-center gap-2 bg-[#f3f4f6] px-3 py-2.5">
        <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.faqTitle}</h2>
      </div>

      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 pb-5 pt-1">
          {/* Category grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {FAQ_CATS.map((cat) => (
              <button key={cat.key} onClick={() => jumpTo(cat.key)} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:bg-black/[0.02]">
                <span className="shrink-0">{faqIcon(cat.key, 24)}</span>
                <span className="text-[13px] font-bold leading-tight text-[#1d2129]">{cat.label[lang]}</span>
              </button>
            ))}
          </div>

          {/* Sections */}
          {FAQ_CATS.map((cat) => (
            <div key={cat.key} ref={(el) => { sectionRefs.current[cat.key] = el; }} className="mt-6 scroll-mt-2">
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="shrink-0">{faqIcon(cat.key, 26)}</span>
                <h3 className="text-[17px] font-extrabold text-[#1d2129]">{cat.label[lang]}</h3>
              </div>
              <div className="space-y-2.5">
                {cat.items.map((it, i) => {
                  const id = `${cat.key}-${i}`;
                  const isOpen = !!openItems[id];
                  return (
                    <div key={id} className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
                      <button onClick={() => toggle(id)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
                        <span className="text-[14px] font-bold text-[#1d2129]">{it.q[lang]}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="2.4" className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      {isOpen && (
                        <div className="border-t border-black/[0.06] px-4 py-3.5">
                          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#3a3f47]">{it.a[lang]}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SiteFooter t={t} />
      </div>
    </div>
  );
}

type Screen = "landing" | "signup" | "login" | "oripa" | "items" | "quest" | "mypage" | "prizeHistory" | "refer" | "faq" | "store" | "purchaseHistory" | "profile" | "notifications" | "gachaInfo" | "gachaResult" | "shippingAddress";

type PurchaseRecord = { id: string; date: string; coins: number; freePoints: number; paymentMethod: string; paymentId: string; status: "Completed" | "Cancelled"; jpy: number };
const PURCHASE_HISTORY: PurchaseRecord[] = [
  { id: "ph1", date: "Feb 3, 2026, 22:14", coins: 20000, freePoints: 500, paymentMethod: "Mazooma *****5678", paymentId: "35812349", status: "Completed",  jpy: 52000 },
  { id: "ph2", date: "Feb 3, 2026, 22:14", coins: 20000, freePoints: 500, paymentMethod: "Mazooma *******5678", paymentId: "35812349", status: "Cancelled",  jpy: 52000 },
  { id: "ph3", date: "Feb 3, 2026, 22:14", coins: 20000, freePoints: 500, paymentMethod: "Mazooma *****5678", paymentId: "35812349", status: "Completed",  jpy: 52000 },
  { id: "ph4", date: "Feb 3, 2026, 22:14", coins: 20000, freePoints: 500, paymentMethod: "Mazooma *****5678", paymentId: "35812349", status: "Completed",  jpy: 52000 },
  { id: "ph5", date: "Feb 3, 2026, 22:14", coins: 20000, freePoints: 500, paymentMethod: "Mazooma *****5678", paymentId: "35812349", status: "Completed",  jpy: 52000 },
  { id: "ph6", date: "Feb 3, 2026, 22:14", coins: 20000, freePoints: 500, paymentMethod: "Mazooma *****5678", paymentId: "35812349", status: "Completed",  jpy: 52000 },
];

function navIcon(key: Screen, color: string) {
  switch (key) {
    case "oripa":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4.5" y="6" width="9" height="13" rx="1.6" transform="rotate(-10 9 12.5)" fill={color} opacity="0.45" />
          <rect x="10" y="5" width="9" height="13" rx="1.6" transform="rotate(8 14.5 11.5)" fill={color} />
        </svg>
      );
    case "items":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M3 7.5l9-4 9 4-9 4-9-4z" />
          <path d="M3 7.5v9l9 4 9-4v-9" />
          <path d="M12 11.5v9" />
        </svg>
      );
    case "prizeHistory":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
          <path d="M5.5 3v3.5H9" />
          <path d="M12 8v4.2l3 1.8" />
        </svg>
      );
    case "quest":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 19a6.5 6.5 0 0113 0" strokeLinecap="round" />
        </svg>
      );
  }
}

function BottomNav({ screen, setScreen, t }: { screen: Screen; setScreen: (s: Screen) => void; t: Dict }) {
  const items: { key: Screen; label: string }[] = [
    { key: "oripa", label: t.navOripa },
    { key: "prizeHistory", label: t.navPrizeHistory },
    { key: "quest", label: t.navQuest },
    { key: "mypage", label: t.navMyPage },
  ];
  return (
    <nav className="shrink-0 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((it) => {
          const active = screen === it.key || (it.key === "mypage" && (screen === "refer" || screen === "faq" || screen === "profile" || screen === "purchaseHistory" || screen === "shippingAddress")) || (it.key === "oripa" && (screen === "gachaInfo" || screen === "gachaResult"));
          const color = active ? "#B40206" : "#1d2129";
          return (
            <button key={it.key} onClick={() => setScreen(it.key)} className="flex flex-1 flex-col items-center gap-1 py-2">
              {navIcon(it.key, color)}
              <span className="text-[10px] font-bold" style={{ color }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Auth shared components ───────────────────────────────────────────── */
function AuthHeader({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  return (
    <header className="flex shrink-0 items-center justify-between bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.10)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oripa-logo-full.png" alt="オリパロット" className="h-8 w-auto shrink-0" />
      <div className="flex items-center gap-2">
        <button onClick={onSignUp} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#B40206" }}>{t.authSignUp}</button>
        <button onClick={onLogin} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#f59e0b" }}>{t.authLogin}</button>
      </div>
    </header>
  );
}

function AuthSocialButtons({ signUp, t, onApple, onGoogle, onLine }: { signUp: boolean; t: Dict; onApple?: () => void; onGoogle?: () => void; onLine?: () => void }) {
  const appleLabel = signUp ? t.authSignUpApple : t.authLoginApple;
  const googleLabel = signUp ? t.authSignUpGoogle : t.authLoginGoogle;
  const lineLabel = signUp ? t.authSignUpLine : t.authLoginLine;
  return (
    <div className="space-y-2.5">
      <button onClick={onLine} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#06C755" /><text x="20" y="28" textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">L</text></svg>
        {lineLabel}
      </button>
      <button onClick={onGoogle} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {googleLabel}
      </button>
      <button onClick={onApple} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d2129"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
        {appleLabel}
      </button>
    </div>
  );
}

type AppleAuthStep = "sheet" | "faceId" | "success";

function AppleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<AppleAuthStep>("sheet");

  useEffect(() => {
    if (step !== "faceId") return;
    const timer = setTimeout(() => setStep("success"), 1900);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  function startFaceId() {
    if (step !== "sheet") return;
    setStep("faceId");
  }

  const subtitle = signUp ? t.authAppleSheetSignUp : t.authAppleSheetLogin;
  const successSub = signUp ? t.authAppleSuccessSubSignUp : t.authAppleSuccessSubLogin;

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <style>{`
        @keyframes appleSheetSlideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes appleSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes appleSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes appleFaceIdFadeIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes appleScanLine { 0%{top:0%;opacity:0} 8%{opacity:1} 88%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes appleFacePulse { 0%,100%{opacity:0.5;transform:scale(0.97)} 50%{opacity:1;transform:scale(1)} }
        @keyframes appleCornerGlow { 0%,100%{stroke:#1d2129} 50%{stroke:#22c55e} }
      `}</style>

      {/* Backdrop — tapping triggers Face ID only on the "sheet" step */}
      <button
        type="button"
        aria-label={t.authAppleFaceIdHint as string}
        onClick={startFaceId}
        disabled={step !== "sheet"}
        className="min-h-0 flex-1 border-0 p-0 outline-none transition-colors duration-500"
        style={{ backgroundColor: step === "sheet" ? "rgba(0,0,0,0.52)" : "rgba(0,0,0,0.72)", cursor: step === "sheet" ? "pointer" : "default" }}
      >
        {step === "sheet" && (
          <span className="flex h-full items-end justify-center pb-10">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-sm">
              {t.authAppleFaceIdHint as string}
            </span>
          </span>
        )}
      </button>

      {/* Bottom sheet */}
      <div
        className="relative z-20 shrink-0 rounded-t-[24px] bg-[#f2f2f7] px-5 pb-10 pt-3 shadow-[0_-12px_48px_rgba(0,0,0,0.22)]"
        style={{ animation: "appleSheetSlideUp 0.38s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-black/15" />

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8">
            <div style={{ animation: "appleSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="36" fill="#22c55e" />
                <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3
              className="mt-5 text-center text-[20px] font-bold text-[#1d2129]"
              style={{ animation: "appleSuccessFade 0.4s ease-out 0.25s both" }}
            >
              {t.authAppleSuccess as string}
            </h3>
            <p
              className="mt-1.5 text-center text-[14px] text-[#5c626b]"
              style={{ animation: "appleSuccessFade 0.4s ease-out 0.4s both" }}
            >
              {successSub as string}
            </p>
          </div>
        )}

        {/* ── FACE ID SCANNING ── */}
        {step === "faceId" && (
          <div
            className="flex flex-col items-center py-8"
            style={{ animation: "appleFaceIdFadeIn 0.28s ease-out both" }}
          >
            {/* iOS-style Face ID frame */}
            <div className="relative" style={{ width: 110, height: 130 }}>
              {/* Corner brackets */}
              {[
                "top-0 left-0 border-l-[3px] border-t-[3px] rounded-tl-[8px]",
                "top-0 right-0 border-r-[3px] border-t-[3px] rounded-tr-[8px]",
                "bottom-0 left-0 border-l-[3px] border-b-[3px] rounded-bl-[8px]",
                "bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-[8px]",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-7 h-7 border-[#1d2129] ${cls}`}
                  style={{ animation: `appleCornerGlow 1.8s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}

              {/* Face silhouette */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "appleFacePulse 1.4s ease-in-out infinite" }}
              >
                <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
                  {/* Head */}
                  <path d="M32 6C19 6 11 14.5 11 25c0 7.5 4 14 10 17.5C13 46 8 54.5 8 65h48c0-10.5-5-19-13-22.5 6-3.5 10-10 10-17.5C53 14.5 45 6 32 6z"
                    stroke="#1d2129" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />
                  {/* Eyes */}
                  <circle cx="23" cy="24" r="2.8" fill="#1d2129" opacity="0.75" />
                  <circle cx="41" cy="24" r="2.8" fill="#1d2129" opacity="0.75" />
                  {/* Nose bridge */}
                  <path d="M32 28v5" stroke="#1d2129" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
                  {/* Smile */}
                  <path d="M23 38c2.5 3.5 15.5 3.5 18 0" stroke="#1d2129" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
                </svg>
              </div>

              {/* Green scan line */}
              <div
                className="pointer-events-none absolute left-3 right-3 h-[2.5px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #22c55e 30%, #4ade80 50%, #22c55e 70%, transparent 100%)",
                  animation: "appleScanLine 1.7s ease-in-out infinite",
                }}
              />
            </div>

            <p className="mt-6 text-[16px] font-semibold text-[#1d2129]">
              {t.authAppleFaceIdScanning as string}
            </p>
            <p className="mt-1 text-[12px] text-[#8a9099]">
              {lang === "ja" ? "スキャン中..." : "Scanning..."}
            </p>
          </div>
        )}

        {/* ── INITIAL SHEET ── */}
        {step === "sheet" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1d2129">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-[16px] font-bold text-[#1d2129]">{t.authAppleSheetTitle as string}</span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-[#5c626b]">{subtitle as string}</p>

            {/* Account row */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-3.5 px-4 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[17px] font-bold text-white shadow-md">
                  {(t.authAppleAccountName as string).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#1d2129]">{t.authAppleAccountName as string}</p>
                  <p className="truncate text-[12px] text-[#8a9099]">{t.authAppleAccountEmail as string}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9ced6" strokeWidth="2.2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Continue / Face ID button */}
            <button
              type="button"
              onClick={startFaceId}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1d2129] py-4 text-[15px] font-bold text-white active:scale-[0.98]"
              style={{ transition: "transform 0.1s" }}
            >
              {/* iOS Face ID icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="17" y="2" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="2" y="19.5" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="17" y="19.5" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <circle cx="9" cy="10.5" r="1.6" fill="white" />
                <circle cx="15" cy="10.5" r="1.6" fill="white" />
                <path d="M12 8.5V7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M9 15c1 1.8 5 1.8 6 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {t.authAppleFaceIdHint as string}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type GoogleAuthStep = "picker" | "permissions" | "processing" | "success";

const GOOGLE_LOGO = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function GoogleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<GoogleAuthStep>("picker");
  const [selectedAccount, setSelectedAccount] = useState<0 | 1 | null>(null);

  const accounts = [
    { name: t.authGoogleAccount1Name as string, email: t.authGoogleAccount1Email as string, initials: (t.authGoogleAccount1Name as string).charAt(0), color: "#4285F4" },
    { name: t.authGoogleAccount2Name as string, email: t.authGoogleAccount2Email as string, initials: (t.authGoogleAccount2Name as string).charAt(0), color: "#0f9d58" },
  ];

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("success"), 1600);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  const successSub = signUp ? t.authGoogleSuccessSubSignUp : t.authGoogleSuccessSubLogin;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ animation: "googleScreenSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }}>
      <style>{`
        @keyframes googleScreenSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes googleSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes googleSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes googleSpinnerRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div style={{ animation: "googleSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="36" fill="#22c55e" />
                <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3 className="mt-5 text-center text-[20px] font-bold text-[#1d2129]" style={{ animation: "googleSuccessFade 0.4s ease-out 0.25s both" }}>
              {t.authGoogleSuccess as string}
            </h3>
            <p className="mt-1.5 text-center text-[14px] text-[#5c626b]" style={{ animation: "googleSuccessFade 0.4s ease-out 0.4s both" }}>
              {successSub as string}
            </p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div style={{ animation: "googleSpinnerRotate 0.9s linear infinite", width: 52, height: 52 }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="22" stroke="#e5e8ec" strokeWidth="4" />
                <path d="M26 4a22 22 0 0 1 22 22" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-5 text-[15px] font-semibold text-[#1d2129]">
              {lang === "ja" ? "サインイン中..." : "Signing in…"}
            </p>
          </div>
        )}

        {/* ── PERMISSIONS ── */}
        {step === "permissions" && selectedAccount !== null && (
          <div className="flex flex-1 flex-col px-5 pt-12 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              {GOOGLE_LOGO}
              <span className="text-[18px] font-bold text-[#1d2129]">{t.authGooglePermissionsTitle as string}</span>
              <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]">✕</button>
            </div>

            {/* Selected account badge */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#e5e8ec] bg-[#f8f9fa] px-4 py-3 mb-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: accounts[selectedAccount].color }}>
                {accounts[selectedAccount].initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1d2129]">{accounts[selectedAccount].name}</p>
                <p className="truncate text-[12px] text-[#8a9099]">{accounts[selectedAccount].email}</p>
              </div>
            </div>

            {/* Permissions body */}
            <p className="text-[13px] text-[#5c626b] mb-5">{t.authGooglePermissionsBody as string}</p>

            <div className="space-y-3 mb-auto">
              {([t.authGooglePermissionItem1, t.authGooglePermissionItem2] as string[]).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f5e9]">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5l3 3 5-5" stroke="#0f9d58" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[14px] leading-snug text-[#1d2129]">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA row — pinned to bottom */}
            <div className="flex gap-3 pt-8">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-[#e5e8ec] py-3.5 text-[14px] font-bold text-[#1d2129]"
              >
                {t.authGoogleCancel as string}
              </button>
              <button
                onClick={() => setStep("processing")}
                className="flex-1 rounded-xl py-3.5 text-[14px] font-bold text-white"
                style={{ background: "#4285F4" }}
              >
                {t.authGoogleContinue as string}
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT PICKER ── */}
        {step === "picker" && (
          <div className="flex flex-1 flex-col px-5 pt-12 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {GOOGLE_LOGO}
                <span className="text-[18px] font-bold text-[#1d2129]">{t.authGooglePickerTitle as string}</span>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]">✕</button>
            </div>
            <p className="mb-6 text-[13px] text-[#5c626b]">{t.authGooglePickerSubtitle as string}</p>

            {/* Account list */}
            <div className="space-y-3">
              {accounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedAccount(idx as 0 | 1); setStep("permissions"); }}
                  className="flex w-full items-center gap-3.5 rounded-2xl border border-[#e5e8ec] bg-white px-4 py-3.5 text-left active:bg-[#f5f6f8]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white" style={{ background: acc.color }}>
                    {acc.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#1d2129]">{acc.name}</p>
                    <p className="truncate text-[12px] text-[#8a9099]">{acc.email}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9ced6" strokeWidth="2.2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

type LineAuthStep = "verify" | "processing" | "success";

function LineAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<LineAuthStep>("verify");

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("success"), 1400);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  const successSub = signUp ? t.authLineSuccessSubSignUp : t.authLineSuccessSubLogin;

  const LINE_GREEN = "#06C755";

  const ToggleOn = () => (
    <div className="relative shrink-0" style={{ width: 44, height: 26, opacity: 0.45 }}>
      <div className="absolute inset-0 rounded-full" style={{ background: LINE_GREEN }} />
      <div className="absolute top-[3px] right-[3px] h-5 w-5 rounded-full bg-white shadow-sm" />
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ animation: "lineScreenSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }}>
      <style>{`
        @keyframes lineScreenSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes lineSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes lineSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lineSpinner { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── SUCCESS ── */}
      {step === "success" && (
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <div style={{ animation: "lineSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="36" fill="#22c55e" />
              <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h3 className="mt-5 text-center text-[20px] font-bold text-[#1d2129]" style={{ animation: "lineSuccessFade 0.4s ease-out 0.25s both" }}>
            {t.authLineSuccess as string}
          </h3>
          <p className="mt-1.5 text-center text-[14px] text-[#5c626b]" style={{ animation: "lineSuccessFade 0.4s ease-out 0.4s both" }}>
            {successSub as string}
          </p>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {step === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <div style={{ animation: "lineSpinner 0.9s linear infinite", width: 52, height: 52 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="22" stroke="#e5e8ec" strokeWidth="4" />
              <path d="M26 4a22 22 0 0 1 22 22" stroke={LINE_GREEN} strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-5 text-[15px] font-semibold text-[#1d2129]">
            {lang === "ja" ? "サインイン中..." : "Signing in…"}
          </p>
        </div>
      )}

      {/* ── VERIFY SCREEN ── */}
      {step === "verify" && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e5e8ec]">
            <div className="w-16" />
            <span className="text-[17px] font-bold text-[#1d2129]">{t.authLineVerificationTitle as string}</span>
            <button onClick={onClose} className="w-16 text-right text-[15px] text-[#06C755] font-medium">
              {t.authLineCancel as string}
            </button>
          </div>

          <div className="flex flex-col items-center px-5 pt-7 pb-4">
            {/* App logo */}
            <div className="mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[#e5e8ec] overflow-hidden bg-white shadow-sm">
              <img src="/oripa-logo.png" alt="OripaLot" className="h-14 w-14 object-contain" />
            </div>

            {/* App name */}
            <h2 className="text-[18px] font-bold text-[#1d2129]">{t.authLineAppName as string}</h2>

            {/* Provider row */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[13px] text-[#5c626b]">{t.authLineProvider as string}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: LINE_GREEN }}>
                {t.authLineCertified as string}
              </span>
            </div>

            {/* Description */}
            <p className="mt-1.5 text-center text-[12px] text-[#8a9099]">{t.authLineDescription as string}</p>

            {/* Country */}
            <p className="mt-3 text-[13px] text-[#1d2129]">
              <span className="font-bold">{t.authLineCountry as string}</span>{" "}
              {t.authLineCountryValue as string}
            </p>
          </div>

          {/* Permissions section */}
          <div className="px-5 pb-4">
            <p className="mb-3 text-[13px] font-bold text-[#1d2129]">{t.authLineGrantTitle as string}</p>

            <div className="space-y-0 divide-y divide-[#f0f0f0]">
              {([t.authLinePermission1, t.authLinePermission2, t.authLinePermission3] as string[]).map((perm, i) => (
                <div key={i} className="flex items-center justify-between py-3.5">
                  <span className="text-[14px] text-[#1d2129] pr-4">{perm}</span>
                  <ToggleOn />
                </div>
              ))}
            </div>
          </div>

          {/* Important section */}
          <div className="mx-5 mb-5 rounded-2xl bg-[#f8f9fa] px-4 py-4">
            <p className="mb-2.5 text-[13px] font-bold text-[#1d2129]">{t.authLineImportantTitle as string}</p>
            <ol className="space-y-2.5 list-none pl-0">
              {([t.authLineImportant1, t.authLineImportant2] as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#5c626b]">
                  <span className="shrink-0 font-semibold text-[#1d2129]">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA buttons */}
          <div className="sticky bottom-0 bg-white px-5 pt-3 pb-8 space-y-2 border-t border-[#f0f0f0]">
            <button
              onClick={() => setStep("processing")}
              className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
              style={{ background: LINE_GREEN }}
            >
              {t.authLineAllow as string}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-[14px] font-semibold text-[#5c626b]"
            >
              {t.authLineCancel as string}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthField({ label, value, onChange, type = "text", icon, valid, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
  valid?: boolean; error?: string; onBlur?: () => void;
}) {
  const showTick = valid === true;
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {label}<span className="ml-0.5 text-[#B40206]">*</span>
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-[#8a9099]">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Placeholder"
          className={`w-full rounded-xl bg-white py-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none border ${error ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
          style={{ paddingLeft: icon ? "36px" : "14px", paddingRight: showTick ? "40px" : "14px" }}
        />
        {showTick && (
          <span className="absolute right-3">
            <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-[#B40206]">{error}</p>}
    </div>
  );
}

/* ── DobPickerModal ────────────────────────────────────────────────────── */
function DobPickerModal({ lang, onConfirm, onClose }: {
  lang: Lang; onConfirm: (isoDate: string) => void; onClose: () => void;
}) {
  const t = STR[lang];
  const YEARS_PER_PAGE = 12;
  const MAX_YEAR = 2010;
  const MIN_YEAR = 1931;

  const [step, setStep] = useState<"year" | "month" | "day">("year");
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [yearPageStart, setYearPageStart] = useState(1980);

  const MONTH_SHORT = lang === "ja"
    ? ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_FULL = lang === "ja"
    ? MONTH_SHORT
    : ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const displayText = () => {
    if (!selYear) return "";
    if (!selMonth) return String(selYear);
    if (!selDay) return lang === "ja" ? `${selYear}年${selMonth}月` : `${selYear}, ${MONTH_FULL[selMonth - 1]}`;
    return lang === "ja"
      ? `${selYear}年${selMonth}月${selDay}日`
      : `${MONTH_SHORT[selMonth - 1]} ${selDay}, ${selYear}`;
  };

  const daysInMonth = selYear && selMonth ? new Date(selYear, selMonth, 0).getDate() : 31;

  const headerLabel = step === "year"
    ? `${yearPageStart}–${Math.min(yearPageStart + YEARS_PER_PAGE - 1, MAX_YEAR)}`
    : step === "month"
    ? String(selYear)
    : `${MONTH_SHORT[(selMonth ?? 1) - 1]} ${selYear}`;

  const onBack = () => {
    if (step === "year") {
      setYearPageStart(p => Math.max(MIN_YEAR, p - YEARS_PER_PAGE));
    } else if (step === "month") {
      setStep("year");
      setSelMonth(null);
      setSelDay(null);
    } else {
      setStep("month");
      setSelDay(null);
    }
  };

  const onForward = () => {
    if (step === "year") {
      if (yearPageStart + YEARS_PER_PAGE <= MAX_YEAR) setYearPageStart(p => p + YEARS_PER_PAGE);
    } else if (step === "month" && selYear) {
      if (selYear < MAX_YEAR) { setSelYear(selYear + 1); setSelMonth(null); setSelDay(null); }
    } else if (step === "day" && selYear && selMonth) {
      const nextMonth = selMonth === 12 ? 1 : selMonth + 1;
      const nextYear = selMonth === 12 ? selYear + 1 : selYear;
      if (nextYear <= MAX_YEAR) { setSelMonth(nextMonth); setSelYear(nextYear); setSelDay(null); }
    }
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i)
    .filter(y => y <= MAX_YEAR);

  const navBtn = "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#f0f2f5] active:bg-[#e5e8ec]";
  const gridBtn = "rounded-xl py-2.5 text-[14px] font-medium transition-colors";
  const gridSel = "bg-[#1d2129] text-white";
  const gridDef = "text-[#1d2129] hover:bg-[#f0f2f5]";

  return (
    <div className="absolute inset-0 z-50 flex items-end"
         style={{ background: "rgba(0,0,0,0.45)" }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full rounded-t-2xl bg-white shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <button onClick={onClose} className="text-[14px] text-[#5c626b]">{t.authDobPickerCancel}</button>
          <span className="text-[15px] font-bold text-[#1d2129]">{t.authDobLabel}</span>
          <div className="w-14" />
        </div>

        <div className="px-4 pt-4 pb-5">
          {/* Progressive selection display */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[#e5e8ec] px-3 py-2.5">
            <span className={`text-[14px] ${displayText() ? "text-[#1d2129]" : "text-[#bbbec4]"}`}>
              {displayText() || (lang === "ja" ? "生年月日を選択" : "Select your date of birth")}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>

          {/* Calendar card */}
          <div className="rounded-xl border border-[#e5e8ec] overflow-hidden">
            {/* Navigation row */}
            <div className="flex items-center justify-between border-b border-[#f0f2f5] px-3 py-2.5">
              <button onClick={onBack} className={navBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-[15px] font-bold text-[#1d2129]">{headerLabel}</span>
              <button onClick={onForward} className={navBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Grid area */}
            <div className="px-3 py-3">
              {step === "year" && (
                <div className="grid grid-cols-3 gap-2">
                  {years.map(y => (
                    <button key={y}
                            onClick={() => { setSelYear(y); setSelMonth(null); setSelDay(null); setStep("month"); }}
                            className={`${gridBtn} ${selYear === y ? gridSel : gridDef}`}>
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {step === "month" && (
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_SHORT.map((m, i) => (
                    <button key={m}
                            onClick={() => { setSelMonth(i + 1); setSelDay(null); setStep("day"); }}
                            className={`${gridBtn} ${selMonth === i + 1 ? gridSel : gridDef}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {step === "day" && (
                <>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <button key={d}
                              onClick={() => setSelDay(d)}
                              className={`flex aspect-square items-center justify-center rounded-full text-[13px] font-medium transition-colors
                                ${selDay === d ? "bg-[#1d2129] text-white" : "text-[#1d2129] hover:bg-[#f0f2f5]"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  {selDay !== null && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => onConfirm(`${selYear}-${String(selMonth).padStart(2, "0")}-${String(selDay).padStart(2, "0")}`)}
                        className="rounded-xl bg-[#B40206] px-5 py-2 text-[14px] font-bold text-white">
                        {t.authDobPickerDone}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LandingPage ──────────────────────────────────────────────────────── */
function LandingPage({ lang, onSignUp, onLogin, onOpenInfo, onDrawConfirm, homeVariant = "v1", lobbyNav = "off" }: { lang: Lang; onSignUp: () => void; onLogin: () => void; onOpenInfo?: (item: OripaItem) => void; onDrawConfirm?: (item: OripaItem, count: number, free?: boolean) => void; homeVariant?: "v1" | "v2"; lobbyNav?: LobbyNav }) {
  const t = STR[lang];
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_ORIPA.filter((it) => locTitle(it, lang).toLowerCase().includes(q)) : [];
  const { hidden: searchHidden, onScroll } = useHideOnScrollDown();
  // Lobby-nav filter bottom sheet (rendered at root so it pins to the phone).
  const [lobbyFilters, setLobbyFilters] = useState<Record<string, boolean>>({});
  const [lobbyFilterOpen, setLobbyFilterOpen] = useState(false);
  const [lobbyQuery, setLobbyQuery] = useState("");
  const toggleLobbyFilter = (k: string) => setLobbyFilters((f) => { const n = { ...f }; if (n[k]) delete n[k]; else n[k] = true; return n; });
  const clearLobbyFilters = () => { setLobbyFilters({}); setLobbyQuery(""); };
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={onLogin} />
      {lobbyNav === "off" && (
        <div className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${searchHidden && !q ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
          <div className="border-b border-black/5 px-3 pb-2.5 pt-2.5">
            <LobbySearchBar t={t} value={query} onChange={setQuery} />
          </div>
        </div>
      )}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={onScroll}>
        {q ? (
          <>
            <LobbySearchResults items={searchResults} t={t} lang={lang} onOpenInfo={onOpenInfo} onDrawConfirm={onDrawConfirm} />
            <SiteFooter t={t} />
          </>
        ) : (
        <>
        {/* Homepage V2 (default): MB-style hero, logged-out variant — no rank
            strip (anonymous users have no rank); icons gate to Sign Up except
            the draw, which is browsable. V1 restores the original carousel. */}
        {homeVariant === "v2" ? (
          <div className="px-3 pt-3">
            <HomeHero t={t} showRank={false} onReward={() => onSignUp()} onOpenStore={onSignUp} onChain={onSignUp} onRank={onSignUp} onDraw={() => onOpenInfo?.(RECOMMENDED_ORIPA[0])} />
          </div>
        ) : (
          <div className="px-3 pt-3"><PromoCarousel /></div>
        )}
        {lobbyNav === "off" ? (
        <>
        <CategoryBar t={t} active={cat} onChange={setCat} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-divider.png" alt="" className="-mt-px -mb-px block w-full" />
        {HOME_SECTIONS.filter((s) => cat === "all" || s.cats.includes(cat)).map((s) => {
          const red = s.variant === "red";
          return (
            <Fragment key={s.id}>
              <section className={red ? "bg-[#B40206] px-3 pb-6 pt-4" : "bg-[#eef0f3] px-3 pb-5 pt-4"}>
                <h3 className={`mb-3 flex items-center gap-1.5 text-[15px] font-extrabold ${red ? "text-white" : "text-[#1d2129]"}`}>
                  {sectionIcon(s.icon, red)}
                  {(t as unknown as Record<string, string>)[s.titleKey]}
                </h3>
                <div className="space-y-3">
                  {s.items.map((it) => (
                    <OripaCard key={it.id} item={it} t={t} lang={lang} onView={() => onOpenInfo?.(it)} onDraw={(c, free) => onDrawConfirm?.(it, c, free)} />
                  ))}
                </div>
              </section>
              {red && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home-divider-bottom.png" alt="" className="-mt-px -mb-px block w-full" />
                </>
              )}
            </Fragment>
          );
        })}
        </>
        ) : (
          <LobbyNavFeed version={lobbyNav} t={t} lang={lang} onOpenInfo={onOpenInfo} onDrawConfirm={onDrawConfirm} filters={lobbyFilters} query={lobbyQuery} onOpenFilters={() => setLobbyFilterOpen(true)} />
        )}
        <SiteFooter t={t} />
        </>
        )}
      </div>
      {lobbyNav !== "off" && lobbyFilterOpen && <LobbyFilterSheet lang={lang} filters={lobbyFilters} query={lobbyQuery} onToggle={toggleLobbyFilter} onQueryChange={setLobbyQuery} onClear={clearLobbyFilters} onClose={() => setLobbyFilterOpen(false)} />}
    </div>
  );
}

/* ── PhoneOtpPage ──────────────────────────────────────────────────────── */
function PhoneOtpPage({ lang, phone, onBack, onSuccess }: {
  lang: Lang; phone: string; onBack: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const allFilled = digits.every(d => d.length === 1);
  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    setDigits(["", "", "", "", "", ""]);
    setTimer(30);
    inputRefs.current[0]?.focus();
    setToast(t.authOtpToast as string);
    setTimeout(() => setToast(""), 2500);
  }

  const mm = Math.floor(timer / 60).toString().padStart(2, "0");
  const ss = (timer % 60).toString().padStart(2, "0");

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pt-12 pb-6">
          <h2 className="text-center text-[22px] font-extrabold text-[#1d2129]">{t.authOtpTitle as string}</h2>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-[#5c626b]">
            {t.authOtpBodyPre as string}
            {(t.authOtpBodyPre as string) && <br />}
            <span className="font-semibold text-[#1d2129]">{phone}</span>
            {t.authOtpBodyPost as string}
          </p>

          <p className="mt-5 text-center text-[13px] font-semibold text-[#1d2129]">
            {t.authOtpExpiry as string} {mm}:{ss}
          </p>

          <div className="mt-4 flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-[#e5e8ec] bg-white text-center text-[20px] font-bold text-[#1d2129] outline-none focus:border-[#B40206]"
              />
            ))}
          </div>

          <button
            onClick={() => { if (allFilled) onSuccess(); }}
            disabled={!allFilled}
            className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#B40206", opacity: allFilled ? 1 : 0.45 }}
          >
            {t.authOtpAuthenticate as string}
          </button>

          <button
            onClick={handleResend}
            disabled={!canResend}
            className="mt-3 w-full rounded-xl border border-[#e5e8ec] bg-white py-3.5 text-[14px] font-semibold text-[#5c626b]"
            style={{ opacity: canResend ? 1 : 0.45 }}
          >
            {t.authOtpResend as string}
          </button>

          <button
            onClick={onBack}
            className="mt-3 w-full text-center text-[13px] font-bold text-[#B40206] underline"
          >
            {t.authOtpChangePhone as string}
          </button>
        </div>
      </div>

      {toast && (
        <div className="absolute inset-x-4 top-4 z-50 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── SignupPage ───────────────────────────────────────────────────────── */
function SignupPage({ lang, onLogin, onSuccess, initialEmailVerify = false, initialAppleAuth = false }: { lang: Lang; onLogin: () => void; onSuccess: () => void; initialEmailVerify?: boolean; initialAppleAuth?: boolean }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showAppleAuth, setShowAppleAuth] = useState(initialAppleAuth);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showLineAuth, setShowLineAuth] = useState(false);

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneDob, setPhoneDob] = useState("");
  const [phoneInvite, setPhoneInvite] = useState("");
  const [phoneAgreed, setPhoneAgreed] = useState(false);
  const [showPhoneDobPicker, setShowPhoneDobPicker] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailDob, setEmailDob] = useState("");
  const [emailInvite, setEmailInvite] = useState("");
  const [emailAgreed, setEmailAgreed] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showEmailDobPicker, setShowEmailDobPicker] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(initialEmailVerify);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";
  const canPhoneSubmit = phoneValid && phoneDob.length > 0 && phoneAgreed;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canEmailSubmit = emailValid && passwordValid && emailDob.length > 0 && emailAgreed;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";

  const formatDob = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (lang === "ja") return `${y}年${Number(m)}月${Number(d)}日`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  };

  const calIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
  const checkIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const renderDobButton = (dob: string, onOpen: () => void) => (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {t.authDobLabel}<span className="ml-0.5 text-[#B40206]">*</span>
      </label>
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full rounded-xl border border-[#e5e8ec] bg-white py-3 text-left text-[14px] outline-none"
        style={{ paddingLeft: "36px", paddingRight: dob ? "40px" : "14px" }}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">{calIcon}</span>
        <span className={dob ? "text-[#1d2129]" : "text-[#bbbec4]"}>{dob ? formatDob(dob) : "Placeholder"}</span>
        {dob && <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>}
      </button>
    </div>
  );

  const renderInviteField = (value: string, onChange: (v: string) => void) => (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">{t.authInviteLabel}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Placeholder"
        className="w-full rounded-xl border border-[#e5e8ec] bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
      />
    </div>
  );

  const renderTermsCheckbox = (checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-start gap-2.5">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div
          className="flex h-5 w-5 items-center justify-center rounded"
          style={{ background: checked ? "#B40206" : "white", border: checked ? "none" : "2px solid #d1d5db" }}
        >
          {checked && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        </div>
      </div>
      <span className="text-[12px] leading-relaxed text-[#5c626b]">
        {t.authAgreePrefix}
        <span className="text-[#B40206] underline">{t.authTermsOfService}</span>
        {t.authAnd}
        <span className="text-[#B40206] underline">{t.authPrivacyPolicy}</span>
        {t.authAgreeEnd}
      </span>
    </label>
  );

  if (view === "otp") {
    return <PhoneOtpPage lang={lang} phone={otpPhone} onBack={() => setView("form")} onSuccess={() => {
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-5 space-y-3">

          {/* ── Social sign-up methods ── */}
          <AuthSocialButtons signUp t={t} onApple={() => setShowAppleAuth(true)} onGoogle={() => setShowGoogleAuth(true)} onLine={() => { try { sessionStorage.setItem("authData", JSON.stringify({ lineId: "line_user" })); } catch {} onSuccess(); }} />

          {/* ── Email Section ── */}
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "email" ? null : "email")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authEmailSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "email" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "email" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <AuthField
                  label={t.authEmailLabel} value={email} onChange={setEmail} type="email"
                  valid={emailValid && email.length > 0}
                  error={emailTouched ? emailFieldError : ""}
                  onBlur={() => setEmailTouched(true)}
                />
                <AuthField
                  label={t.authPasswordLabel} value={password} onChange={setPassword} type="password"
                  valid={passwordValid && password.length > 0}
                  error={passwordTouched ? passwordError : ""}
                  onBlur={() => setPasswordTouched(true)}
                />
                {renderDobButton(emailDob, () => setShowEmailDobPicker(true))}
                {renderInviteField(emailInvite, setEmailInvite)}
                {renderTermsCheckbox(emailAgreed, setEmailAgreed)}

                <button
                  onClick={() => { if (canEmailSubmit) setShowEmailVerify(true); }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section — hidden, preserved for future re-enablement ── */}
          {false && (
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "phone" ? null : "phone")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authPhoneSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "phone" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "phone" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                {/* Country code + Phone number */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#B40206]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => { setCountryCode(e.target.value as "JP" | "US"); setPhone(""); setPhoneTouched(false); }}
                      className="rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[13px] text-[#1d2129] outline-none"
                    >
                      <option value="JP">🇯🇵 +81</option>
                      <option value="US">🇺🇸 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="Placeholder"
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#B40206]">{phoneError}</p>}
                </div>

                {renderDobButton(phoneDob, () => setShowPhoneDobPicker(true))}
                {renderInviteField(phoneInvite, setPhoneInvite)}
                {renderTermsCheckbox(phoneAgreed, setPhoneAgreed)}

                <button
                  onClick={() => { if (canPhoneSubmit) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!canPhoneSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canPhoneSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authHaveAccount}{" "}
            <button onClick={onLogin} className="font-bold text-[#B40206] underline">{t.authLogInLink}</button>
          </p>
        </div>
      </div>

      {/* Phone DOB picker — hidden along with the phone section */}
      {false && showPhoneDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowPhoneDobPicker(false)}
                        onConfirm={(iso) => { setPhoneDob(iso); setShowPhoneDobPicker(false); }} />
      )}

      {showEmailDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowEmailDobPicker(false)}
                        onConfirm={(iso) => { setEmailDob(iso); setShowEmailDobPicker(false); }} />
      )}

      {/* Email Verification Modal */}
      {showEmailVerify && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-xs rounded-2xl bg-white px-6 py-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#fde68a,#fbbf24)" }}>
                <svg width="56" height="56" viewBox="0 0 60 60">
                  <ellipse cx="30" cy="38" rx="18" ry="14" fill="#f97316" />
                  <circle cx="30" cy="26" r="14" fill="#fb923c" />
                  <polygon points="18,18 10,6 22,14" fill="#f97316" />
                  <polygon points="42,18 50,6 38,14" fill="#f97316" />
                  <circle cx="30" cy="26" r="9" fill="#fed7aa" />
                  <circle cx="25" cy="24" r="2.5" fill="#1d2129" />
                  <circle cx="35" cy="24" r="2.5" fill="#1d2129" />
                  <circle cx="26" cy="23" r="1" fill="white" />
                  <circle cx="36" cy="23" r="1" fill="white" />
                  <ellipse cx="30" cy="28" rx="3" ry="2" fill="#f87171" />
                  <path d="M26 32 Q30 35 34 32" stroke="#1d2129" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <rect x="16" y="36" width="28" height="20" rx="3" fill="white" stroke="#e5e8ec" strokeWidth="1.5" />
                  <path d="M16 39l14 10 14-10" stroke="#B40206" strokeWidth="1.5" fill="none" />
                  <circle cx="36" cy="34" r="5" fill="#B40206" />
                  <text x="36" y="38" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">♥</text>
                </svg>
              </div>
            </div>
            <h2 className="text-center text-[18px] font-extrabold text-[#1d2129]">{t.authVerifyTitle}</h2>
            <p className="mt-2 text-center text-[12px] leading-relaxed text-[#5c626b]">
              {t.authVerifyBody(email || "HELLO@EMAIL.COM")}
            </p>
            <button onClick={() => {
              try { sessionStorage.setItem("authData", JSON.stringify({ email, dob: emailDob })); } catch {}
              onSuccess();
            }} className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#B40206" }}>
              {t.authOpenEmailApp}
            </button>
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-semibold text-[#5c626b]">{t.authVerifyNote}</p>
              {(t.authVerifyBullets as string[]).map((b, i) => (
                <p key={i} className="flex items-start gap-1.5 text-[11px] text-[#5c626b]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5c626b]" />{b}
                </p>
              ))}
            </div>
            <button className="mt-4 w-full text-center text-[11px] font-bold tracking-wide text-[#5c626b] underline">
              {t.authResendEmail}
            </button>
          </div>
        </div>
      )}

      {showAppleAuth && (
        <AppleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowAppleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                appleId: t.authAppleAccountEmail,
                displayName: t.authAppleAccountName,
              }));
            } catch {}
            setShowAppleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: t.authGoogleAccount1Email,
                displayName: t.authGoogleAccount1Name,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showLineAuth && (
        <LineAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowLineAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                lineId: "line_user",
                displayName: "LINE User",
              }));
            } catch {}
            setShowLineAuth(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ── LoginPage ────────────────────────────────────────────────────────── */
function LoginPage({ lang, onSignUp, onSuccess, initialAppleAuth = false }: { lang: Lang; onSignUp: () => void; onSuccess: () => void; initialAppleAuth?: boolean }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showAppleAuth, setShowAppleAuth] = useState(initialAppleAuth);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showLineAuth, setShowLineAuth] = useState(false);

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canEmailSubmit = emailValid && passwordValid;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";

  const checkIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  if (view === "otp") {
    return <PhoneOtpPage lang={lang} phone={otpPhone} onBack={() => setView("form")} onSuccess={() => {
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={() => {}} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-5 space-y-3">

          {/* ── Social login ── (PROD: LINE logs in instantly for easy access) */}
          <AuthSocialButtons signUp={false} t={t} onApple={() => setShowAppleAuth(true)} onGoogle={() => setShowGoogleAuth(true)} onLine={() => { try { sessionStorage.setItem("authData", JSON.stringify({ lineId: "line_user" })); } catch {} onSuccess(); }} />

          {/* ── Email Section ── */}
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "email" ? null : "email")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authLoginEmailSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "email" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "email" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <AuthField
                  label={t.authEmailLabel} value={email} onChange={setEmail} type="email"
                  valid={emailValid && email.length > 0}
                  error={emailTouched ? emailFieldError : ""}
                  onBlur={() => setEmailTouched(true)}
                />
                <AuthField
                  label={t.authPasswordLabel} value={password} onChange={setPassword} type="password"
                  valid={passwordValid && password.length > 0}
                  error={passwordTouched ? passwordError : ""}
                  onBlur={() => setPasswordTouched(true)}
                />

                <button
                  onClick={() => { if (canEmailSubmit) { try { sessionStorage.setItem("authData", JSON.stringify({ email })); } catch {} onSuccess(); } }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section — hidden, preserved for future re-enablement ── */}
          {false && (
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "phone" ? null : "phone")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authLoginPhoneSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "phone" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "phone" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#B40206]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => { setCountryCode(e.target.value as "JP" | "US"); setPhone(""); setPhoneTouched(false); }}
                      className="rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[13px] text-[#1d2129] outline-none"
                    >
                      <option value="JP">🇯🇵 +81</option>
                      <option value="US">🇺🇸 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="Placeholder"
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#B40206]">{phoneError}</p>}
                </div>

                <button
                  onClick={() => { if (phoneValid) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!phoneValid}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: phoneValid ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authNoAccount}{" "}
            <button onClick={onSignUp} className="font-bold text-[#B40206] underline">{t.authSignUpNow}</button>
          </p>
        </div>
      </div>

      {showAppleAuth && (
        <AppleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowAppleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                appleId: t.authAppleAccountEmail,
                displayName: t.authAppleAccountName,
              }));
            } catch {}
            setShowAppleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: t.authGoogleAccount1Email,
                displayName: t.authGoogleAccount1Name,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showLineAuth && (
        <LineAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowLineAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                lineId: "line_user",
                displayName: "LINE User",
              }));
            } catch {}
            setShowLineAuth(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ── PhoneApp ─────────────────────────────────────────────────────────── */
type NotifItem = { id: string; at: string; atJa: string; title: string; titleJa: string; body: string; bodyJa: string; tracking?: string; unread?: boolean };

const NOTIF_YOU: NotifItem[] = [
  { id: "y1", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Your item has been shipped", titleJa: "商品を発送しました", body: "Your prize is on its way. Delivery takes up to 14 business days.", bodyJa: "景品を発送しました。お届けまで最大14営業日かかります。", tracking: "AA123456789JP", unread: true },
  { id: "y2", at: "Feb 02, 2026 18:40", atJa: "2026年2月02日 18:40", title: "Shipping request received", titleJa: "発送リクエストを受け付けました", body: "We have received your shipping request and are preparing your prize.", bodyJa: "発送リクエストを受け付けました。景品の準備を進めています。", unread: true },
  { id: "y3", at: "Jan 30, 2026 09:12", atJa: "2026年1月30日 09:12", title: "Prizes converted to coins", titleJa: "景品をコインに交換しました", body: "Your selected prizes were converted to Oripa Coins.", bodyJa: "選択した景品をオリパコインに交換しました。" },
  { id: "y4", at: "Jan 28, 2026 20:05", atJa: "2026年1月28日 20:05", title: "Prize won!", titleJa: "景品が当選しました！", body: "Congratulations! A new prize has been added to your Prize History.", bodyJa: "おめでとうございます！新しい景品が当選履歴に追加されました。" },
];

const NOTIF_NOTICE: NotifItem[] = [
  { id: "n1", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "About emergency maintenance", titleJa: "緊急メンテナンス実施について", body: "We will perform emergency maintenance on Mar 15, 11:00–13:30. As a token of thanks for your cooperation, we've granted 500 points. We sincerely apologize for any inconvenience and thank you for your continued support of Oripalot.", bodyJa: "3月15日 11:00〜13:30に緊急メンテナンスを実施いたします。ご協力のお礼として500ポイントを付与いたしました。ご不便をおかけし深くお詫び申し上げます。今後とも「オリパロット」をよろしくお願いいたします。", unread: true },
  { id: "n2", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Payment error / purchase issue", titleJa: "特定決済エラー・購入トラブルについて", body: "As an apology for the issue on Jun 3 where coin purchases were not credited correctly, we've granted 1,000 coins to all users. The issue has been resolved and the service is back to normal. We deeply apologize for the inconvenience.", bodyJa: "6月3日に発生した「コイン購入が正常に反映されない不具合」のお詫びとして、一律1,000コインを付与いたしました。現在は復旧し正常にご利用いただけます。多大なるご不便をおかけしましたことを深くお詫び申し上げます。", unread: true },
  { id: "n3", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Year-end & New Year support delays", titleJa: "年末年始のサポート遅延", body: "Please note our support hours during the year-end/New Year period (Dec 29, 2026 – Jan 4, 2027). We will still accept inquiries, but replies may take longer than usual. Thank you for your understanding.", bodyJa: "年末年始期間（2026年12月29日〜2027年1月4日）のサポート対応についてお知らせいたします。期間中もお問い合わせは受け付けておりますが、ご返信に通常よりお時間をいただく場合がございます。ご理解のほどよろしくお願いいたします。" },
];

// Total unread across both notification lists — powers the bell badge.
const NOTIF_UNREAD_TOTAL = [...NOTIF_YOU, ...NOTIF_NOTICE].filter((n) => n.unread).length;

function NotificationsScreen({ lang, coins, empty = false, only, onBack, onHome }: { lang: Lang; coins: number; empty?: boolean; only?: "you" | "notice"; onBack: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [tab, setTab] = useState<"you" | "notice">(only ?? "you");
  // Locally track which notifications have been opened (reset per visit).
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const isUnread = (it: NotifItem) => !empty && !!it.unread && !readIds.has(it.id);
  const markRead = (id: string) => setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const unreadCount = (l: NotifItem[]) => l.filter(isUnread).length;
  const youUnread = unreadCount(NOTIF_YOU);
  const noticeUnread = unreadCount(NOTIF_NOTICE);

  const list = tab === "you" ? NOTIF_YOU : NOTIF_NOTICE;
  const title = tab === "you" ? t.notifTabYou : t.notifTabNotice;
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>

        {/* Tabs (hidden in single-tab mode) — each carries an unread badge */}
        {!only && (
          <div className="flex border-b border-black/10 px-2">
            {([
              { key: "you", label: t.notifTabYou, count: youUnread },
              { key: "notice", label: t.notifTabNotice, count: noticeUnread },
            ] as { key: "you" | "notice"; label: string; count: number }[]).map((tb) => {
              const active = tab === tb.key;
              return (
                <button key={tb.key} onClick={() => setTab(tb.key)} className="relative flex-1 pb-2.5 pt-1">
                  <span className="flex items-center justify-center gap-1.5">
                    <span className={`text-[13px] font-bold ${active ? "text-[#B40206]" : "text-[#1d2129]"}`}>{tb.label}</span>
                    {tb.count > 0 && (
                      <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#B40206] px-1 text-[10px] font-extrabold leading-none text-white">{tb.count}</span>
                    )}
                  </span>
                  {active && <span className="absolute inset-x-5 -bottom-px h-[3px] rounded-full bg-[#B40206]" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-extrabold text-[#1d2129]">{title}</h2>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#eef0f3]">
        {empty || list.length === 0 ? (
          <p className="py-28 text-center text-[14px] text-[#9aa0a8]">{t.notifEmpty}</p>
        ) : (
          <div className="space-y-2.5 px-3 py-3">
            {list.map((it) => {
              const un = isUnread(it);
              return (
                <button
                  key={it.id}
                  onClick={() => un && markRead(it.id)}
                  className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${un ? "border-[#f1c4c4] bg-[#fff5f5]" : "border-black/10 bg-white"}`}
                >
                  {un && <span className="absolute inset-y-0 left-0 w-1 bg-[#B40206]" />}
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[#9aa0a8]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {lang === "ja" ? it.atJa : it.at}
                    {un && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-[#B40206] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />{t.notifNew}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-[14px] leading-snug ${un ? "font-extrabold text-[#1d2129]" : "font-semibold text-[#41464e]"}`}>{lang === "ja" ? it.titleJa : it.title}</p>
                  <p className={`mt-0.5 text-[12.5px] leading-relaxed ${un ? "text-[#6b7078]" : "text-[#8a9099]"}`}>{lang === "ja" ? it.bodyJa : it.body}</p>
                  {it.tracking && <p className="mt-0.5 text-[12.5px] text-[#8a9099]">{lang === "ja" ? "追跡番号：" : "Tracking number: "}{it.tracking}</p>}
                </button>
              );
            })}
          </div>
        )}
        <SiteFooter t={t} />
      </div>
    </div>
  );
}

function WelcomeOverlay({ t, lang, onClose, onGo }: { t: Dict; lang: Lang; onClose: () => void; onGo: () => void }) {
  useEffect(() => {
    // Japanese welcome voice via Web Speech API + a soft chime.
    let ac: AudioContext | null = null;
    const voiceTimer = setTimeout(() => {
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          const u = new SpeechSynthesisUtterance(t.welcomeVoice);
          u.lang = "ja-JP";
          // Gentle, friendly anime delivery — bright but not shrill.
          u.rate = 1.05;
          u.pitch = 1.45;
          u.volume = 0.7;
          const pick = () => {
            const voices = synth.getVoices().filter((x) => x.lang?.toLowerCase().startsWith("ja"));
            // Prefer a female Japanese voice when available.
            const fem = voices.find((x) => /female|kyoko|o-?ren|haruka|nanami|ami|sayaka|mizuki/i.test(x.name)) ?? voices[0];
            if (fem) u.voice = fem;
            synth.cancel();
            synth.speak(u);
          };
          if (synth.getVoices().length) pick();
          else synth.addEventListener("voiceschanged", pick, { once: true });
        }
      } catch { /* noop */ }
    }, 550);

    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
      const now = ac.currentTime;
      // Soft "magical girl" sparkle run — gentle ascending bells (pentatonic),
      // pure sine tones, lower peaks and quieter gains so it's pleasant not piercing.
      const master = ac.createGain();
      master.gain.value = 0.55; // overall softening
      master.connect(ac.destination);
      const notes = [587.33, 698.46, 880.0, 1046.5, 1318.5];
      notes.forEach((f, i) => {
        const o = ac!.createOscillator();
        const o2 = ac!.createOscillator();
        const g = ac!.createGain();
        const g2 = ac!.createGain();
        o.type = "sine";
        o2.type = "sine";
        o.frequency.value = f;
        o2.frequency.value = f * 2.0; // soft shimmer octave, quieter
        const start = now + i * 0.085;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.09, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
        g2.gain.setValueAtTime(0, start);
        g2.gain.linearRampToValueAtTime(0.03, start + 0.03);
        g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
        o.connect(g).connect(master);
        o2.connect(g2).connect(master);
        o.start(start); o2.start(start);
        o.stop(start + 0.6); o2.stop(start + 0.55);
      });
      // Gentle final twinkle "kira-n" — softer and lower than before.
      const tw = ac.createOscillator();
      const tg = ac.createGain();
      tw.type = "sine";
      const ts = now + notes.length * 0.085 + 0.05;
      tw.frequency.setValueAtTime(1760, ts);
      tw.frequency.exponentialRampToValueAtTime(2349, ts + 0.2);
      tg.gain.setValueAtTime(0, ts);
      tg.gain.linearRampToValueAtTime(0.07, ts + 0.04);
      tg.gain.exponentialRampToValueAtTime(0.0001, ts + 0.7);
      tw.connect(tg).connect(master);
      tw.start(ts); tw.stop(ts + 0.75);
    } catch { /* noop */ }

    return () => {
      clearTimeout(voiceTimer);
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
      try { ac?.close(); } catch { /* noop */ }
    };
  }, [t.welcomeVoice, onClose]);

  const confetti = Array.from({ length: 22 });
  return (
    <div
      className="absolute inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-8"
      style={{ background: "radial-gradient(circle at 50% 38%, rgba(255,120,130,0.55), rgba(20,10,14,0.82) 70%)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes wcMascot { 0% { opacity:0; transform: translateY(40px) scale(.6) } 55% { opacity:1; transform: translateY(-10px) scale(1.08) } 75% { transform: translateY(0) scale(.98) } 100% { transform: translateY(0) scale(1) } }
        @keyframes wcFloat { 0%,100% { transform: translateY(0) rotate(-1.5deg) } 50% { transform: translateY(-10px) rotate(1.5deg) } }
        @keyframes wcText { 0% { opacity:0; transform: translateY(14px) scale(.92) } 100% { opacity:1; transform:none } }
        @keyframes wcRing { 0% { opacity:.0; transform: scale(.4) } 30% { opacity:.6 } 100% { opacity:0; transform: scale(1.6) } }
        @keyframes wcConfetti { 0% { opacity:0; transform: translateY(-20px) rotate(0) } 12% { opacity:1 } 100% { opacity:0; transform: translateY(360px) rotate(540deg) } }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label={lang === "ja" ? "閉じる" : "Close"}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur active:bg-white/30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      {/* Confetti */}
      {confetti.map((_, i) => {
        const left = (i * 4.5 + (i % 3) * 6) % 100;
        const colors = ["#ffd24a", "#B40206", "#3aa0ff", "#34d399", "#ff7ab0", "#fff"];
        const c = colors[i % colors.length];
        const delay = (i % 7) * 0.12;
        const dur = 1.8 + (i % 5) * 0.35;
        return (
          <span
            key={i}
            className="pointer-events-none absolute top-[18%] h-2.5 w-2.5 rounded-[2px]"
            style={{ left: `${left}%`, background: c, animation: `wcConfetti ${dur}s ${delay}s ease-in both` }}
          />
        );
      })}

      {/* Glow rings behind mascot */}
      <div className="pointer-events-none absolute" style={{ top: "34%" }}>
        <span className="absolute -left-24 -top-24 h-48 w-48 rounded-full border-2 border-white/40" style={{ animation: "wcRing 1.8s .3s ease-out infinite" }} />
        <span className="absolute -left-24 -top-24 h-48 w-48 rounded-full border-2 border-[#ffd24a]/60" style={{ animation: "wcRing 1.8s .8s ease-out infinite" }} />
      </div>

      {/* Mascot */}
      <div style={{ animation: "wcMascot 1s cubic-bezier(.2,.9,.2,1.2) both" }}>
        <div style={{ animation: "wcFloat 3s ease-in-out 1s infinite" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/welcome-mascot.png" alt="" className="h-[200px] w-[200px] object-contain" style={{ filter: "drop-shadow(0 10px 26px rgba(0,0,0,.45))" }} />
        </div>
      </div>

      {/* Message */}
      <div className="mt-2 text-center" style={{ animation: "wcText .6s .5s ease both" }}>
        <h2 className="text-[26px] font-black text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,.5)" }}>{t.welcomeTitle}</h2>
        <p className="mt-1.5 text-[14px] font-semibold text-white/85">{t.welcomeSub}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onGo(); }}
        className="mt-7 flex items-center gap-2 rounded-full bg-white px-7 py-2.5 text-[15px] font-extrabold text-[#B40206] shadow-[0_4px_16px_rgba(0,0,0,0.35)] active:scale-[0.97]"
        style={{ animation: "wcText .6s .8s ease both" }}
      >
        <CoinIcon size={20} />
        {t.welcomeCta}
      </button>
    </div>
  );
}

/* ── DailyRewardOverlay ───────────────────────────────────────────────── */
type DailyReward = { coins?: number; gems?: number };
// Day 3 & 6 award Oripa points (Free Pt / gems); day 7 is the grand bonus.
const DAILY_REWARDS: DailyReward[] = [
  { coins: 300 },
  { coins: 500 },
  { gems: 50 },
  { coins: 800 },
  { coins: 1000 },
  { gems: 50 },
  { coins: 3000, gems: 50 },
];

function DailyRewardVisual({ r, big, t }: { r: DailyReward; big: boolean; t: Dict }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {r.coins != null && (
        <span className="flex flex-col items-center">
          <CoinIcon size={big ? 34 : 26} />
          <span className={`mt-0.5 font-extrabold text-[#1d2129] ${big ? "text-[16px]" : "text-[13px]"}`}>{r.coins.toLocaleString()}</span>
        </span>
      )}
      {r.gems != null && (
        <span className="flex flex-col items-center">
          <GemIcon size={big ? 30 : 24} />
          <span className={`mt-0.5 font-extrabold text-[#1d2129] ${big ? "text-[14px]" : "text-[12px]"}`}>{r.gems} <span className="text-[9.5px] text-[#5b616b]">{t.dailyFreePt}</span></span>
        </span>
      )}
    </div>
  );
}

function DailyRewardOverlay({ t, onClaim, onClose, onFirstDraw }: { t: Dict; lang: Lang; onClaim: (amount: number) => void; onClose: () => void; onFirstDraw: () => void }) {
  const reduce = useReducedMotion();
  const todayIndex = 0; // Day 1 is today & claimable; the rest are locked (POC).
  const [claimed, setClaimed] = useState(false);

  // Cosmetic countdown to the next daily reward.
  const [secs, setSecs] = useState(13148);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  const doClaim = () => {
    if (claimed) return;
    setClaimed(true);
    onClaim(DAILY_REWARDS[todayIndex].coins ?? 0);
    // Briefly show the claimed check, then head to the beginner's draw.
    setTimeout(() => onFirstDraw(), 650);
  };

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: 18, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 20 } },
  };

  const totalCoins = DAILY_REWARDS.reduce((s, r) => s + (r.coins ?? 0), 0);
  const totalGems = DAILY_REWARDS.reduce((s, r) => s + (r.gems ?? 0), 0);

  const tile = (i: number) => {
    const r = DAILY_REWARDS[i];
    const isToday = i === todayIndex;
    const isClaimed = i < todayIndex || (isToday && claimed);
    const isLocked = i > todayIndex;
    const big = i === 6;
    const tappable = isToday && !claimed;
    return (
      <motion.div
        key={i}
        variants={reduce ? undefined : item}
        onClick={tappable ? doClaim : undefined}
        role={tappable ? "button" : undefined}
        className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-3 ${big ? "col-span-3" : ""} ${tappable ? "cursor-pointer active:scale-[0.97]" : ""}`}
        style={{
          border: `2px solid ${isToday && !claimed ? "#B40206" : isClaimed ? "#36b54a" : "#f3c563"}`,
          background: isClaimed ? "#f0fdf4" : "linear-gradient(160deg,#fff6dd,#ffe6ad)",
          opacity: isLocked ? 0.62 : 1,
          boxShadow: isToday && !claimed ? "0 0 0 3px rgba(180,2,6,0.12)" : "none",
          animation: tappable ? "dailyTap 1.5s ease-in-out infinite" : undefined,
        }}
      >
        <span className={`text-[10.5px] font-extrabold uppercase tracking-wide ${isToday && !claimed ? "text-[#B40206]" : "text-[#a07b28]"}`}>
          {isToday ? t.dailyToday : t.dailyDay(i + 1)}
        </span>
        <div className="my-1"><DailyRewardVisual r={r} big={big} t={t} /></div>
        {tappable && (
          <span className="mt-0.5 rounded-full bg-[#B40206] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">{t.dailyTapClaim}</span>
        )}
        {isClaimed && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#36b54a] shadow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
            </span>
          </span>
        )}
        {isLocked && (
          <span className="absolute right-1.5 top-1.5 text-[#c9a24a]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 8H9V7a3 3 0 016 0z" /></svg>
          </span>
        )}
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0 z-[82] flex flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between px-3 py-3">
          <BrandLogo />
          <button onClick={onClose} aria-label={t.backAria} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 active:bg-black/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
        <h2 className="text-center text-[22px] font-black text-[#1d2129]">{t.dailyTitle}</h2>
        <p className="mt-1 text-center text-[13px] font-semibold text-[#8a9099]">{t.dailySub}</p>

        {/* Ultimate / total reward card — quest style */}
        <div className="relative mt-5 rounded-2xl px-4 pb-4 pt-7 shadow-[0_4px_14px_rgba(0,0,0,0.15)]" style={{ background: "linear-gradient(160deg,#fff6dd,#ffe6ad)", border: "2px solid #f3c563" }}>
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#c8061a] px-5 py-1.5 text-[13px] font-extrabold text-white shadow" style={{ clipPath: "polygon(6px 0,calc(100% - 6px) 0,100% 50%,calc(100% - 6px) 100%,6px 100%,0 50%)" }}>{t.dailyUltimate}</span>
          <div className="flex items-center justify-center gap-7">
            <span className="flex items-center gap-2"><CoinIcon size={36} /><span className="text-[20px] font-black text-[#1d2129]">{totalCoins.toLocaleString()}</span></span>
            <span className="flex items-center gap-2"><GemIcon size={30} /><span className="text-[18px] font-black text-[#1d2129]">{totalGems}<span className="ml-1 text-[11px] font-extrabold text-[#5b616b]">{t.dailyFreePt}</span></span></span>
          </div>
        </div>

        {/* 7-day grid — reveals day by day */}
        <motion.div
          className="mt-4 grid grid-cols-3 gap-2.5"
          variants={reduce ? undefined : container}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "show"}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => tile(i))}
        </motion.div>

        <style>{`@keyframes dailyTap{0%,100%{box-shadow:0 0 0 3px rgba(180,2,6,0.12)}50%{box-shadow:0 0 0 6px rgba(180,2,6,0.22)}}`}</style>

        <p className="mt-4 text-center text-[12.5px] font-bold text-[#8a9099]">{t.dailyTapHint}</p>

        {/* Countdown to next reward */}
        <div className="mx-auto mt-3 flex w-max items-center gap-1.5 rounded-md bg-[#1d1d1d] px-4 py-1.5 text-[13px] font-extrabold tabular-nums text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {hh}:{mm}:{ss}
        </div>
      </div>
    </div>
  );
}

/* ── FirstDrawCoach ───────────────────────────────────────────────────────
   Shown on the beginner's draw page after claiming daily rewards, nudging
   the new player to make their very first draw (offer-style coachmark). */
// Non-blocking first-draw nudge: keeps the same coach look but floats as a card
// near the bottom so the highlighted ×1/×10/×100 draw CTAs (sticky near the top)
// stay visible and tappable. The container is click-through (pointer-events-none)
// so only the card itself intercepts taps.
function FirstDrawCoach({ t, onClose }: { t: Dict; onClose: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[70] flex items-end justify-center px-5 pb-16">
      <style>{`@keyframes fdcPop{0%{opacity:0;transform:translateY(16px) scale(.92)}100%{opacity:1;transform:none}}@keyframes fdcBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <div className="pointer-events-auto relative flex w-full max-w-[290px] flex-col items-center rounded-3xl px-5 pb-4 pt-6 text-center" style={{ background: "rgba(8,6,18,0.92)", backdropFilter: "blur(2px)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", animation: "fdcPop .4s ease both" }}>
        <button onClick={onClose} aria-label="Close" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/welcome-mascot.png" alt="" className="h-16 w-16 object-contain" style={{ animation: "fdcBounce 1.6s ease-in-out infinite", filter: "drop-shadow(0 0 18px rgba(255,180,80,.65))" }} />
        <h2 className="mt-1 text-center text-[17px] font-black italic tracking-wide text-white" style={{ textShadow: "0 2px 12px rgba(255,120,60,.6)" }}>{t.firstDrawTitle}</h2>
        <p className="mt-1 max-w-[248px] text-center text-[12px] font-semibold leading-snug text-white/85">{t.firstDrawSub}</p>
        <button onClick={onClose} className="mt-3 text-[12px] font-semibold text-white/60 underline underline-offset-2 active:text-white">{t.firstDrawSkip}</button>
      </div>
    </div>
  );
}

function PhoneApp({ lang, noHistory, initialScreen, drawVariant = "v1", boostVariant = "both", homeVariant = "v1", lobbyNav = "off", initialModal, onScreenChange }: { lang: Lang; noHistory: boolean; initialScreen?: Screen; drawVariant?: "v1" | "v2"; setDrawVariant?: (v: "v1" | "v2") => void; boostVariant?: BoostVariant; homeVariant?: "v1" | "v2"; lobbyNav?: LobbyNav; initialModal?: string; onScreenChange?: (s: Screen) => void }) {
  const t = STR[lang];
  const [screen, setScreen] = useState<Screen>(initialScreen ?? "landing");
  const [prevScreen, setPrevScreen] = useState<Screen>("oripa");
  const [coins, setCoins] = useState(10000);
  const [infoItem, setInfoItem] = useState<OripaItem | null>(initialScreen === "gachaInfo" ? RECOMMENDED_ORIPA[0] : null);
  const [drawing, setDrawing] = useState(false);
  const [drawCount, setDrawCount] = useState(1);
  const [drawFree, setDrawFree] = useState(false);
  const [drawSuper, setDrawSuper] = useState(false);
  const [drawMega, setDrawMega] = useState(false);
  const [drawResults, setDrawResults] = useState<WonPrize[]>(initialScreen === "gachaResult" ? generateDraw(3) : []);
  useEffect(() => { onScreenChange?.(screen); }, [screen, onScreenChange]);
  const goHome = () => setScreen("oripa");
  const [storeOrigin, setStoreOrigin] = useState<Screen>("oripa");
  const openStore = () => { if (screen !== "store") setStoreOrigin(screen); setScreen("store"); };
  const openInfo = (it: OripaItem) => { setInfoItem(it); setPrevScreen((p) => (screen === "gachaInfo" ? p : screen)); setScreen("gachaInfo"); };
  const runDraw = (count: number, isFree = false, opts?: { superBoost?: boolean; megaBoost?: boolean }) => { setDrawCount(count); setDrawFree(isFree); setDrawSuper(!!opts?.superBoost); setDrawMega(!!opts?.megaBoost); setDrawResults(generateDraw(count)); setDrawing(true); };
  const [notifOnly, setNotifOnly] = useState<"you" | "notice" | undefined>(undefined);
  const openNotifications = () => { setNotifOnly(undefined); setPrevScreen((p) => (screen === "notifications" ? p : screen)); setScreen("notifications"); };
  const openNotices = () => { setNotifOnly("notice"); setPrevScreen((p) => (screen === "notifications" ? p : screen)); setScreen("notifications"); };
  const openRefer = () => { setPrevScreen((p) => (screen === "refer" ? p : screen)); setScreen("refer"); };
  const openItems = () => { setPrevScreen((p) => (screen === "items" ? p : screen)); setScreen("items"); };
  const openQuest = () => { setPrevScreen((p) => (screen === "quest" ? p : screen)); setScreen("quest"); };
  const myPageScroll = useRef(0);
  const navTo = (s: Screen) => { if (s === "items" || s === "quest" || s === "prizeHistory") setPrevScreen("oripa"); setScreen(s); };
  const [welcome, setWelcome] = useState(false);
  const [welcomeFlow, setWelcomeFlow] = useState(false);
  const [dailyReward, setDailyReward] = useState(false);
  const [firstDrawCoach, setFirstDrawCoach] = useState(false);
  const [firstDrawHint, setFirstDrawHint] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [subscriptionPurchased, setSubscriptionPurchased] = useState(false);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date | null>(null);
  const [openMyAccountSubs, setOpenMyAccountSubs] = useState(false);
  // PROD: skip the first-login welcome / daily-reward / first-draw flow.
  const enterHomeWelcome = () => { setScreen("oripa"); };
  const [displayName, setDisplayName] = useState("");
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddr[]>([]);
  const [confirmDraw, setConfirmDraw] = useState<{ item: OripaItem; count: number } | null>(null);
  const onLanding = screen === "landing" || screen === "signup" || screen === "login";
  const noNav = onLanding;
  const showNav = !noNav && !drawing;
  return (
    <NotifNavContext.Provider value={onLanding ? () => {} : openNotifications}>
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <div className="relative min-h-0 flex-1">
        {screen === "landing" && <LandingPage lang={lang} onSignUp={() => setScreen("signup")} onLogin={() => setScreen("login")} onOpenInfo={openInfo} onDrawConfirm={(item, count, free) => { setInfoItem(item); if (free) runDraw(1, true); else setConfirmDraw({ item, count }); }} homeVariant={homeVariant} lobbyNav={lobbyNav} />}
        {screen === "signup" && <SignupPage lang={lang} onLogin={() => setScreen("login")} onSuccess={enterHomeWelcome} initialEmailVerify={initialModal === "emailVerify"} initialAppleAuth={initialModal === "appleAuth"} />}
        {screen === "login" && <LoginPage lang={lang} onSignUp={() => setScreen("signup")} onSuccess={enterHomeWelcome} initialAppleAuth={initialModal === "appleAuth"} />}
        {screen === "oripa" && <OripaHome lang={lang} coins={coins} onHome={goHome} onReward={(key) => { if (key === "rwInvite") openRefer(); else openQuest(); }} onOpenStore={openStore} onOpenInfo={openInfo} onDrawConfirm={(item, count, free) => { setInfoItem(item); if (free) runDraw(1, true); else setConfirmDraw({ item, count }); }} onCredit={(n) => setCoins((c) => c + n)} onOpenRank={() => setScreen("mypage")} homeVariant={homeVariant} lobbyNav={lobbyNav} />}
        {screen === "items" && <ItemsPage lang={lang} coins={coins} setCoins={setCoins} shippingAddresses={shippingAddresses} onShippingAddressesChange={setShippingAddresses} onBack={() => setScreen(prevScreen)} onHome={goHome} onOpenStore={openStore} />}
        {screen === "quest" && <QuestScreen lang={lang} coins={coins} onClose={() => setScreen(prevScreen)} />}
        {screen === "mypage" && <MyPage lang={lang} coins={coins} displayName={displayName} onOpenPrizeHistory={() => setScreen("prizeHistory")} onOpenPurchaseHistory={() => setScreen("purchaseHistory")} onOpenProfile={() => setScreen("profile")} onLogout={() => setScreen("landing")} onOpenRefer={openRefer} onOpenQuest={openQuest} onOpenFaq={() => setScreen("faq")} onOpenItems={openItems} onOpenNotices={openNotices} onOpenShippingAddress={() => setScreen("shippingAddress")} onHome={goHome} onOpenStore={openStore} scrollPos={myPageScroll} subscriptionPurchased={subscriptionPurchased} onSubscriptionPurchased={() => { setSubscriptionPurchased(true); setSubscriptionStartDate(new Date()); }} onCancelSubscription={() => { setSubscriptionPurchased(false); setSubscriptionStartDate(null); }} subscriptionStartDate={subscriptionStartDate} openSubscriptionsOnMount={openMyAccountSubs} onSubscriptionsPanelMounted={() => setOpenMyAccountSubs(false)} />}
        {screen === "shippingAddress" && <ShippingAddressPage lang={lang} coins={coins} addresses={shippingAddresses} onAddressesChange={setShippingAddresses} onBack={() => setScreen("mypage")} onOpenStore={openStore} />}
        {screen === "profile" && <ProfilePage lang={lang} coins={coins} displayName={displayName} onDisplayNameChange={setDisplayName} onBack={() => setScreen("mypage")} onOpenStore={openStore} />}
        {screen === "prizeHistory" && <PrizeHistory lang={lang} coins={coins} setCoins={setCoins} shippingAddresses={shippingAddresses} onShippingAddressesChange={setShippingAddresses} onBack={() => setScreen("mypage")} onHome={goHome} empty={noHistory} onGoGacha={goHome} />}
        {screen === "refer" && <ReferFriend lang={lang} coins={coins} onBack={() => setScreen(prevScreen)} onHome={goHome} />}
        {screen === "faq" && <FaqScreen lang={lang} coins={coins} onBack={() => setScreen("mypage")} onHome={goHome} />}
        {screen === "store" && <StorePage lang={lang} coins={coins} setCoins={setCoins} educational={welcomeFlow} subscriptionPurchased={subscriptionPurchased} purchasedIds={purchasedIds} onSubscriptionPurchased={() => { setSubscriptionPurchased(true); setSubscriptionStartDate(new Date()); }} onManageSubscription={() => { setWelcomeFlow(false); setScreen(storeOrigin); setOpenMyAccountSubs(true); setScreen("mypage"); }} onBack={() => { setWelcomeFlow(false); setScreen(storeOrigin); }} onPaid={(pkgId) => { setPurchasedIds((prev) => [...prev, pkgId]); if (welcomeFlow) { setWelcomeFlow(false); openInfo(RECOMMENDED_ORIPA[0]); } }} onDrawItem={(item) => { setWelcomeFlow(false); openInfo(item); }} />}
        {screen === "purchaseHistory" && <PurchaseHistoryPage lang={lang} coins={coins} onBack={() => setScreen("mypage")} onOpenStore={openStore} empty={noHistory} />}
        {screen === "notifications" && <NotificationsScreen lang={lang} coins={coins} empty={noHistory} only={notifOnly} onBack={() => setScreen(prevScreen)} onHome={goHome} />}
        {screen === "gachaInfo" && infoItem && <OripaGachaInfo lang={lang} coins={coins} item={infoItem} onBack={() => setScreen(prevScreen)} onHome={goHome} onDraw={(c, opts) => runDraw(c, false, opts)} drawVariant={drawVariant} boostVariant={boostVariant} firstDrawHint={firstDrawHint} onFirstDrawHintDone={() => { setFirstDrawHint(false); setFirstDrawCoach(false); }} />}
        {screen === "gachaResult" && <GachaResult lang={lang} coins={coins} setCoins={setCoins} prizes={drawResults} shippingAddresses={shippingAddresses} onShippingAddressesChange={setShippingAddresses} onBack={() => setScreen("gachaInfo")} onHome={goHome} />}
        {drawing && <GachaAnimation count={drawCount} free={drawFree} superBoost={drawSuper} megaBoost={drawMega} onReveal={() => setScreen("gachaResult")} onDone={() => setDrawing(false)} />}
        {welcome && <WelcomeOverlay t={t} lang={lang} onClose={() => setWelcome(false)} onGo={() => { setWelcome(false); setDailyReward(true); }} />}
        {dailyReward && <DailyRewardOverlay t={t} lang={lang} onClaim={(amt) => setCoins((c) => c + amt)} onClose={() => setDailyReward(false)} onFirstDraw={() => { setDailyReward(false); openInfo(RECOMMENDED_ORIPA[0]); setFirstDrawCoach(true); setFirstDrawHint(true); }} />}
        {firstDrawCoach && screen === "gachaInfo" && <FirstDrawCoach t={t} onClose={() => { setFirstDrawCoach(false); setFirstDrawHint(false); }} />}
        {confirmDraw && <GachaConfirmModal lang={lang} count={confirmDraw.count} image={confirmDraw.item.image} onClose={() => setConfirmDraw(null)} onConfirm={() => { const c = confirmDraw.count; setConfirmDraw(null); runDraw(c); }} />}
      </div>
      {showNav && <BottomNav screen={screen} setScreen={navTo} t={t} />}
    </div>
    </NotifNavContext.Provider>
  );
}

/* ── main ────────────────────────────────────────────────────────────── */
type Tab = "won" | "waiting" | "shipped";
type Toast = { id: number; text: string };

function VersionBadge() {
  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[90] rounded-md bg-black/70 px-2.5 py-1 text-[12px] font-semibold tracking-wide text-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
    >
      {APP_VERSION}
    </div>
  );
}

// Polls /api/version; when the deployed build differs from the one currently
// loaded in the browser, shows a small refresh prompt above the version badge.
function UpdatePrompt() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (alive && data.version && data.version !== APP_VERSION) setNewVersion(data.version);
      } catch {
        /* offline / transient — ignore */
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!newVersion || dismissed === newVersion) return null;

  return (
    <div className="fixed bottom-12 right-3 z-[91] flex items-center gap-2 rounded-lg bg-[#1d2129] py-2 pl-3 pr-2 text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)]" style={{ animation: "storeEduBannerIn .25s ease both" }}>
      <span className="text-[12.5px] font-semibold">New version available <span className="font-extrabold text-[#ffd36b]">{newVersion}</span></span>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-[#B40206] px-2.5 py-1 text-[12px] font-extrabold text-white active:scale-[0.97]"
      >
        Refresh
      </button>
      <button
        onClick={() => setDismissed(newVersion)}
        aria-label="Dismiss"
        className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:text-white active:bg-white/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

const EMBED_SCREENS: Screen[] = ["landing", "signup", "login", "oripa", "items", "quest", "mypage", "prizeHistory", "refer", "faq", "store", "purchaseHistory", "profile", "notifications", "gachaInfo", "gachaResult", "shippingAddress"];

// Maps mind-map node aliases (incl. overlay-only states) to the closest
// addressable screen so the flow map can embed live screens.
const SCREEN_ALIASES: Record<string, Screen> = {
  verify: "signup",
  welcome: "oripa",
  home: "oripa",
  confirm: "gachaInfo",
  animation: "gachaInfo",
  result: "gachaResult",
  ranking: "mypage",
  account: "mypage",
  tncs: "mypage",
  itemsWon: "items",
  history: "prizeHistory",
};

function EmbeddedScreen() {
  const [params, setParams] = useState<{ lang: Lang; screen: Screen; modal?: string; home: "v1" | "v2" } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lang: Lang = sp.get("lang") === "ja" ? "ja" : "en";
    const raw = (sp.get("screen") || "landing").trim();
    const screen: Screen = EMBED_SCREENS.includes(raw as Screen)
      ? (raw as Screen)
      : SCREEN_ALIASES[raw] ?? "landing";
    const modal = (sp.get("modal") || "").trim() || undefined;
    // Homepage variant deep link (V1 default; &home=v2 opts into the hero).
    const home: "v1" | "v2" = sp.get("home") === "v2" ? "v2" : "v1";
    setParams({ lang, screen, modal, home });
  }, []);
  if (!params) return <div className="h-[100svh] w-full bg-[#eef0f3]" />;
  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-[#eef0f3]">
      <PhoneApp lang={params.lang} noHistory={false} initialScreen={params.screen} initialModal={params.modal} homeVariant={params.home} />
    </div>
  );
}

// Near-production shell: renders only the phone experience. Entry point is the
// logged-out lobby (V2); the internal POC config panel / flow-map are dropped.
export default function Page() {
  const [lang, setLang] = useState<Lang>("ja");
  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-[linear-gradient(180deg,#16171c_0%,#0f1014_100%)]">
      {/* Desktop: phone centred in a simple device frame */}
      <div className="relative hidden sm:block py-8">
        <div className="absolute right-full top-3 mr-4 w-max"><LangToggle lang={lang} setLang={setLang} /></div>
        <div className="rounded-[2.6rem] border border-white/12 bg-[#1b1c22] p-3 shadow-[0_35px_90px_rgba(0,0,0,0.55)]">
          <div className="rounded-[2.1rem] border border-white/8 bg-black p-2">
            <div className="mx-auto mb-2 h-6 w-28 rounded-full bg-white/10" />
            <div className="relative h-[812px] w-[390px] overflow-hidden rounded-[1.7rem] bg-[#eef0f3]">
              <PhoneApp lang={lang} noHistory={false} drawVariant="v1" boostVariant="both" homeVariant="v2" lobbyNav="off" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: full-bleed phone */}
      <div className="relative w-full max-w-[440px] flex-1 overflow-hidden bg-[#eef0f3] sm:hidden" style={{ height: "100svh" }}>
        <PhoneApp lang={lang} noHistory={false} drawVariant="v1" boostVariant="both" homeVariant="v2" lobbyNav="off" />
      </div>

      <UpdatePrompt />
      <VersionBadge />
    </main>
  );
}

function PrizeHistory({ lang, coins, setCoins, shippingAddresses, onShippingAddressesChange, onBack, onHome, empty = false, onGoGacha }: { lang: Lang; coins: number; setCoins: Dispatch<SetStateAction<number>>; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onHome: () => void; empty?: boolean; onGoGacha?: () => void }) {
  const t = STR[lang];

  const [tab, setTab] = useState<Tab>("won");
  const [won, setWon] = useState<WonPrize[]>(INITIAL_WON);
  const [waiting, setWaiting] = useState<WaitingPrize[]>(INITIAL_WAITING);
  const [shipped] = useState<ShippedPrize[]>(INITIAL_SHIPPED);

  const [sortKey, setSortKey] = useState<SortKey>("coinDesc");
  const [sortOpen, setSortOpen] = useState(false);

  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [listShipOpen, setListShipOpen] = useState(false);
  const [category, setCategory] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(text: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);
  }

  const sortedWon = useMemo(() => {
    const arr = [...won];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "coinDesc": return b.coinValue - a.coinValue;
        case "coinAsc": return a.coinValue - b.coinValue;
        case "wonNew": return b.wonAt - a.wonAt;
        case "wonOld": return a.wonAt - b.wonAt;
        case "expSoon": return expiresAt(a.wonAt) - expiresAt(b.wonAt);
      }
    });
    return arr;
  }, [won, sortKey]);

  // --- List view: select cards, then exchange or ship ---
  const listSelectedPrizes = won.filter((p) => listSelected.has(p.id));
  const listTotal = listSelectedPrizes.reduce((s, p) => s + p.coinValue, 0);
  const listCanShip = listTotal >= SHIP_MIN_COINS;
  const listShortfall = Math.max(0, SHIP_MIN_COINS - listTotal);

  function listToggle(id: string) {
    setListSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function listReset() { setListSelected(new Set()); }
  function listExchange() {
    if (listSelected.size === 0) return;
    const ids = new Set(listSelected);
    const n = ids.size;
    setCoins((c) => c + listTotal);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setListSelected(new Set());
    pushToast(t.toastConverted(n, listTotal));
  }
  function doListShip() {
    const ids = new Set(listSelected);
    const moving = won.filter((p) => ids.has(p.id));
    setWaiting((list) => [
      ...moving.map((p) => ({
        id: p.id,
        name: p.name,
        nameJa: p.nameJa,
        desc: p.desc,
        descJa: p.descJa,
        rarity: p.rarity,
        coinValue: p.coinValue,
        requestedAt: NOW,
      })),
      ...list,
    ]);
    setWon((list) => list.filter((p) => !ids.has(p.id)));
    setListSelected(new Set());
    setListShipOpen(false);
    pushToast(t.toastShipReq);
  }

  // The "Narrow down" sheet scopes the list (and tier selection): a franchise
  // category chip plus a free-text search matched against name/desc.
  const q = query.trim().toLowerCase();
  const matchesQuery = (p: WonPrize) => {
    if (!q) return true;
    const hay = `${locName(p, lang)} ${locDesc(p, lang)}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  };
  const inScope = (p: WonPrize) => (category === "all" || p.category === category) && matchesQuery(p);
  const catWon = won.filter(inScope);
  const displayedWon = sortedWon.filter(inScope);
  const filterActive = category !== "all" || q.length > 0;
  function clearFilters() { setCategory("all"); setQuery(""); setListSelected(new Set()); }

  // --- Tier chips (mirrors Draw Results): "All" selects everything, a tier chip
  // selects that rarity; tapping the active chip again deselects. Scoped to the
  // currently selected category. ---
  const tierIds = (key: "all" | Rarity) =>
    (key === "all" ? catWon : catWon.filter((p) => p.rarity === key)).map((p) => p.id);
  const isTierActive = (key: "all" | Rarity) => {
    const ids = tierIds(key);
    return ids.length > 0 && ids.length === listSelected.size && ids.every((id) => listSelected.has(id));
  };
  function selectTier(key: "all" | Rarity) {
    setListSelected(isTierActive(key) ? new Set() : new Set(tierIds(key)));
  }
  const tierChips: { key: "all" | Rarity; label: string }[] = [
    { key: "all", label: t.deckAll },
    { key: "UR", label: t.prizeTier(1) },
    { key: "SR", label: t.prizeTier(2) },
    { key: "N", label: t.prizeTier(3) },
  ];

  const counts = { won: won.length, waiting: waiting.length, shipped: shipped.length };

  if (empty) {
    return (
      <div className="flex h-full flex-col bg-[#eef0f3]">
        <header className="shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
            <BrandLogo onClick={onHome} />
            <BalancePill coins={coins} t={t} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.prizeHistory}</h2>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/refer-mascot.png" alt="" className="mb-5 h-44 w-44 object-contain" />
          <p className="text-center text-[14px] leading-relaxed text-[#9aa0a8]">{t.winEmptyTitle}</p>
          <p className="mt-1 max-w-[300px] text-center text-[14px] leading-relaxed text-[#9aa0a8]">{t.winEmptySub}</p>
          <button
            onClick={onGoGacha ?? onHome}
            className="mt-7 w-full rounded-xl bg-[#B40206] py-3.5 text-[15px] font-extrabold tracking-wide text-white shadow-[0_6px_18px_rgba(230,0,18,0.35)] active:scale-[0.99]"
          >
            {t.winEmptyCta}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      {/* Header — white, per Homepage-Mobile-Logged in 02 */}
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>

        {/* Page title row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-extrabold text-[#1d2129]">{t.prizeHistory}</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/10 px-2">
          {([
            { key: "won", label: t.tabWon },
            { key: "waiting", label: t.tabWaiting },
            { key: "shipped", label: t.tabShipped },
          ] as { key: Tab; label: string }[]).map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="relative flex-1 pb-2.5 pt-1 text-center"
              >
                <span className={`text-[12px] font-bold ${active ? "text-[#B40206]" : "text-[#8a9099]"}`}>
                  {tb.label}
                </span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-[#B40206] text-white" : "bg-black/[0.07] text-[#8a9099]"}`}
                >
                  {counts[tb.key]}
                </span>
                {active && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-[#B40206]" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* Body */}
      <div className="relative min-h-0 flex-1">
        {tab === "won" && (
          won.length === 0 ? (
            <EmptyState icon="🎁" title={t.wonEmptyTitle} subtitle={t.wonEmptySub} />
          ) : (
            <div className="flex h-full flex-col">
              {/* Toolbar — "Narrow down" (filters) on the left, sort on the right */}
              <div className="relative flex shrink-0 items-stretch border-b border-black/10 bg-white">
                <button onClick={() => setFilterOpen(true)} className="flex flex-1 items-center justify-center gap-2 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="7" cy="8" r="2" /><circle cx="16" cy="16" r="2" /><path d="M9 8h11M4 8h1M15 16h5M4 16h9" /></svg>
                  {LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"].narrowDown}
                  {filterActive && <span className="flex h-[8px] w-[8px] rounded-full bg-[#B40206]" />}
                </button>
                <span className="my-2 w-px bg-black/10" />
                <button onClick={() => setSortOpen(true)} className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[14px] font-extrabold text-[#1d2129] active:bg-black/[0.03]">
                  {t.sortLabels[sortKey]}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
                </button>
              </div>

              {/* List */}
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {displayedWon.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-2 text-[32px]">🔍</div>
                    <p className="text-[13px] font-semibold text-[#8a9099]">{t.searchNoResults}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {displayedWon.map((p) => {
                    const isSel = listSelected.has(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => listToggle(p.id)}
                        className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition"
                        style={{ border: isSel ? "2.5px solid #FF7A1A" : "1.5px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
                      >
                        <div className="shrink-0"><PrizeArt rarity={p.rarity} size={104} /></div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <span className="inline-flex items-center rounded-md px-2 py-[3px] text-[11px] font-extrabold leading-none text-white" style={{ background: "linear-gradient(180deg,#F6C64B,#E0951A)", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                              {t.prizeTier(rarityTier(p.rarity))}
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: isSel ? "#FF7A1A" : "#8a9099" }}>
                              {isSel ? t.itemsSelected : t.itemsNotSelected}
                              <svg width="15" height="15" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={isSel ? "#FF7A1A" : "#c9ced6"} /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                            </span>
                          </div>
                          <p className="mt-1.5 text-[14px] font-extrabold leading-tight text-[#1d2129]">{locName(p, lang)}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#8a9099]">{locDesc(p, lang)}</p>
                          <p className="mt-1 text-[11px] font-semibold text-[#8a9099]">{t.itemsExchangePeriod}{fmtDate(expiresAt(p.wonAt))}</p>
                          <div className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white pt-2 pb-2" style={{ marginTop: 8 }}>
                            <CoinIcon size={18} />
                            <span className="text-[16px] font-extrabold text-[#1d2129]">{p.coinValue.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="-mx-3 mt-3"><SiteFooter t={t} /></div>
              </div>
            </div>
          )
        )}
        {tab === "waiting" && <WaitingTab prizes={waiting} t={t} lang={lang} />}
        {tab === "shipped" && <ShippedTab prizes={shipped} onCopy={(c) => pushToast(t.toastCopied(c))} t={t} lang={lang} />}
      </div>

      {/* Selection confirm bar — Won tab only */}
      {tab === "won" && won.length > 0 && (
        <div className="shrink-0 border-t border-black/10 bg-white px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-[#8a9099]">{t.deckSorted}</span>
            <button onClick={listReset} className="text-[#8a9099] underline">{t.itemsReset}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={listSelected.size === 0}
              onClick={() => { if (listSelected.size === 0) return; if (!listCanShip) { pushToast(t.toastShort(listShortfall)); return; } setListShipOpen(true); }}
              className="rounded-xl border-2 py-2 text-[12.5px] font-bold leading-tight transition disabled:opacity-40"
              style={{ borderColor: "#f5670a", color: "#f5670a", background: "#fff", opacity: listSelected.size === 0 || listCanShip ? 1 : 0.6 }}
            >
              ← {t.requestShipping} · {listSelected.size}
              <span className="mt-0.5 block text-[10px] font-semibold opacity-80">{listTotal.toLocaleString()} coins</span>
            </button>
            <button
              disabled={listSelected.size === 0}
              onClick={listExchange}
              className="rounded-xl py-2 text-[12.5px] font-bold leading-tight text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(180deg,#ff5a5f,#c8061a)" }}
            >
              {t.exchange} · {listSelected.size} →
              <span className="mt-0.5 block text-[10px] font-semibold opacity-90">{listTotal.toLocaleString()} coins</span>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10.5px] leading-tight text-[#8a9099]">
            {listSelected.size === 0 ? t.helperNone : listCanShip ? t.helperReady : t.helperShort(listShortfall)}
          </p>
        </div>
      )}

      {listShipOpen && (
        <ShippingFlow
          prizes={listSelectedPrizes}
          total={listTotal}
          onClose={() => setListShipOpen(false)}
          onConfirm={doListShip}
          t={t}
          lang={lang}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
        />
      )}

      {/* Narrow-down filter sheet — search + quick category filters */}
      {filterOpen && (() => {
        const LF = LOBBY_NAV_STR[lang === "ja" ? "ja" : "en"];
        const cats: ("all" | Category)[] = ["all", ...CATEGORIES.filter((c) => won.some((p) => p.category === c))];
        return (
          <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setFilterOpen(false)} style={{ animation: "storeEduBannerIn .25s ease both" }}>
            <div className="flex max-h-[90%] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()} style={{ animation: "lobbySheetUp .28s cubic-bezier(.2,.8,.2,1) both" }}>
              <style>{`@keyframes lobbySheetUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
              <div className="relative flex shrink-0 items-center justify-center border-b border-black/5 px-4 py-3.5">
                <h3 className="text-[16px] font-extrabold text-[#1d2129]">{LF.narrowDown}</h3>
                <button onClick={() => setFilterOpen(false)} aria-label="Close" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] active:bg-black/5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa0a8]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setListSelected(new Set()); }}
                    placeholder={LF.searchPlaceholder}
                    className="w-full rounded-xl bg-[#f4f5f7] py-3 pl-11 pr-3 text-[14px] font-semibold text-[#1d2129] outline-none placeholder:text-[#9aa0a8] focus:bg-white focus:ring-2 focus:ring-[#B40206]/30"
                  />
                </div>
                <div className="mt-5">
                  <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{LF.quickFilters}</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {cats.map((c) => {
                      const on = category === c;
                      const n = c === "all" ? won.length : won.filter((p) => p.category === c).length;
                      const label = c === "all" ? t.deckCategoryAll : t.cardCategory(c);
                      return (
                        <button key={c} onClick={() => { setCategory(c); setListSelected(new Set()); }} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "border-[#B40206] bg-[#B40206] text-white" : "border-black/15 bg-white text-[#5c626b] active:bg-black/[0.03]"}`}>{label}<span className="ml-1 opacity-75">{n}</span></button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick-select cards by tier (moved in from the old chip row) */}
                <div className="mt-5 border-t border-black/5 pt-4">
                  <h4 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{lang === "ja" ? "レアリティで選択" : "Select by tier"}</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {tierChips.map((c) => {
                      const n = tierIds(c.key).length;
                      const on = isTierActive(c.key);
                      return (
                        <button key={c.key} onClick={() => selectTier(c.key)} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition" style={{ background: on ? "#B40206" : "#fff", color: on ? "#fff" : "#5c626b", borderColor: on ? "#B40206" : "rgba(0,0,0,0.15)" }}>
                          {c.label}<span className="ml-1 opacity-75">{n}</span>
                        </button>
                      );
                    })}
                    <button onClick={() => selectTier("all")} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition" style={{ background: isTierActive("all") ? "#1d2129" : "#fff", color: isTierActive("all") ? "#fff" : "#1d2129", borderColor: "rgba(0,0,0,0.15)" }}>
                      {t.selectAll}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-3 border-t border-black/10 px-4 py-3">
                <button onClick={clearFilters} className="flex-1 rounded-xl bg-[#f2f3f5] py-3 text-[15px] font-extrabold text-[#1d2129] active:scale-[0.99]">{LF.clear}</button>
                <button onClick={() => setFilterOpen(false)} className="flex-1 rounded-xl bg-[#B40206] py-3 text-[15px] font-extrabold text-white active:scale-[0.99]">{LF.apply}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sort sheet */}
      {sortOpen && (
        <BottomSheet title={t.sortTitle} onClose={() => setSortOpen(false)}>
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => { setSortKey(key); setSortOpen(false); }}
              className="flex w-full items-center justify-between border-b border-black/5 py-3 text-left text-[14px]"
            >
              <span className={sortKey === key ? "font-bold text-[#1d2129]" : "text-[#41464e]"}>{t.sortLabels[key]}</span>
              {sortKey === key && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          ))}
        </BottomSheet>
      )}

      {/* Toasts */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── tabs ────────────────────────────────────────────────────────────── */
function rarityTier(r: Rarity): number {
  return r === "UR" ? 1 : r === "SR" ? 2 : 3;
}

/* Large, centred prize card used inside the swipe deck. When `ghost` is set the
   card shows artwork only (text kept for layout but hidden) — used for the
   next card peeking behind the focused one, so there's no text bleed-through. */
function PrizeSwipeCard({ p, t, lang, bulkCount, ghost = false, art = 172 }: { p: WonPrize; t: Dict; lang: Lang; bulkCount?: number; ghost?: boolean; art?: number }) {
  const urgent = hoursLeft(p.wonAt) < 24;
  return (
    <div className="px-1">
      <div className="relative mx-auto flex justify-center">
        <div style={{ filter: "drop-shadow(0 14px 26px rgba(0,0,0,0.22))" }}>
          <PrizeArt rarity={p.rarity} size={art} />
        </div>
        {!ghost && (
          <span className="absolute -left-1 -top-1 rounded-md bg-[#B40206] px-2.5 py-1 text-[12px] font-extrabold leading-none text-white shadow">
            {t.prizeTier(rarityTier(p.rarity))}
          </span>
        )}
        {!ghost && bulkCount && bulkCount > 1 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-[#1d2129] px-3 py-1.5 text-[13px] font-extrabold leading-none text-white shadow">×{bulkCount}</span>
        )}
      </div>
      <div style={{ opacity: ghost ? 0 : 1 }}>
        <p className="mt-4 truncate text-center text-[17px] font-extrabold text-[#1d2129]">{locName(p, lang)}</p>
        <p className="truncate text-center text-[13px] text-[#6b7178]">{locDesc(p, lang)}</p>
        <div className="mt-3 flex justify-center">
          <CoinChip value={p.coinValue} strong />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[12px]" style={{ color: urgent ? "#B40206" : "#8a9099" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 9v4l2.5 2M9 3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          {t.shipBy(fmtDate(expiresAt(p.wonAt)), expiryLabel(p.wonAt, t))}
        </div>
      </div>
    </div>
  );
}

/* Tinder-style swipe deck: filter by prize tier, swipe left = exchange,
   swipe right = request shipping. "Select all" turns on bulk mode where a
   single swipe moves every card currently shown. */
function SwipeDeck({
  deck,
  onSwipe,
  toolbar,
  t,
  lang,
  showCategoryFilter = false,
  selectionMode = false,
  onSelectionChange,
  resetSignal,
}: {
  deck: WonPrize[];
  onSwipe: (items: WonPrize[], dir: "left" | "right") => void;
  toolbar?: React.ReactNode;
  t: Dict;
  lang: Lang;
  showCategoryFilter?: boolean;
  // selectionMode: the tier chips + "Select all" pick cards (instead of just
  // filtering), report the selection up, and drive the parent's CTAs.
  selectionMode?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  resetSignal?: number;
}) {
  const [category, setCategory] = useState<"all" | Category>("all");
  const [filter, setFilter] = useState<"all" | Rarity>("all");
  const [bulk, setBulk] = useState(false);
  const [drag, setDrag] = useState<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });
  const [leaving, setLeaving] = useState<null | "left" | "right" | "down">(null);
  // Cards the user chose to "skip for now" — pushed to the back of the deck.
  const [skipped, setSkipped] = useState<string[]>([]);
  // One-time swipe hint shown only on the very first card (until the user interacts).
  const [hint, setHint] = useState(true);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dxRef = useRef(0);
  const dyRef = useRef(0);

  // First narrow by category (Prize History only), then by prize tier.
  const base = showCategoryFilter && category !== "all" ? deck.filter((p) => p.category === category) : deck;
  const counts = { all: base.length, UR: 0, SR: 0, N: 0 };
  base.forEach((p) => { counts[p.rarity] += 1; });
  const filtered = filter === "all" ? base : base.filter((p) => p.rarity === filter);
  // Push skipped cards to the back (in the order they were skipped); keep the rest in place.
  const ordered = [...filtered].sort((a, b) => {
    const ra = skipped.indexOf(a.id);
    const rb = skipped.indexOf(b.id);
    if (ra === -1 && rb === -1) return 0;
    if (ra === -1) return -1;
    if (rb === -1) return 1;
    return ra - rb;
  });

  useEffect(() => {
    if (filtered.length === 0 && bulk) setBulk(false);
  }, [filtered.length, bulk]);

  const top = ordered[0];

  function fire(dir: "left" | "right" | "down") {
    if (!top || leaving) return;
    const items = bulk ? filtered.slice() : [top];
    const skipId = top.id;
    startX.current = null;
    startY.current = null;
    dxRef.current = 0;
    dyRef.current = 0;
    setLeaving(dir);
    setTimeout(() => {
      if (dir === "down") setSkipped((prev) => [...prev.filter((id) => id !== skipId), skipId]);
      else onSwipe(items, dir);
      setLeaving(null);
      setDrag({ dx: 0, dy: 0, active: false });
    }, 260);
  }

  function down(e: React.PointerEvent) {
    if (leaving || !top) return;
    if (hint) setHint(false);
    startX.current = e.clientX;
    startY.current = e.clientY;
    dxRef.current = 0;
    dyRef.current = 0;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    setDrag({ dx: 0, dy: 0, active: true });
  }
  function move(e: React.PointerEvent) {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    dxRef.current = dx;
    dyRef.current = dy;
    setDrag({ dx, dy, active: true });
  }
  function up() {
    if (startX.current == null) return;
    const dx = dxRef.current;
    const dy = dyRef.current;
    const T = 65;
    startX.current = null;
    startY.current = null;
    if (dy >= T && dy > Math.abs(dx)) fire("down");
    else if (dx <= -T) fire("left");
    else if (dx >= T) fire("right");
    else { dxRef.current = 0; dyRef.current = 0; setDrag({ dx: 0, dy: 0, active: false }); }
  }

  const dragging = drag.active && !leaving;
  const showHint = hint && leaving === null && !drag.active && top != null;

  // Prize History (showCategoryFilter) has more chrome above the deck (tabs +
  // category dropdown), so shrink the card + peek a touch to keep the whole
  // stack visible — Gacha Result stays at full size.
  const compact = showCategoryFilter;
  const artSize = compact ? 150 : 172;
  const peekStep = compact ? 15 : 20;
  const scaleStep = compact ? 0.045 : 0.05;

  const chips: { key: "all" | Rarity; label: string; n: number }[] = [
    { key: "all", label: t.deckAll, n: counts.all },
    { key: "UR", label: t.prizeTier(1), n: counts.UR },
    { key: "SR", label: t.prizeTier(2), n: counts.SR },
    { key: "N", label: t.prizeTier(3), n: counts.N },
  ];

  // In selection mode the chips/"Select all" pick cards: a tier chip selects
  // that tier, "Select all" (bulk) selects everything; the "All" tab = nothing
  // selected. We report the chosen ids up so the parent can drive its CTAs.
  // Default (no tier chip, no bulk): keep the top card under review selected so
  // the parent's Exchange/Shipping CTAs are active. The deck is sorted high→low,
  // so the top card is the highest tier present (Ultra, else Gold, else Silver).
  const selectionItems = selectionMode
    ? (bulk || filter !== "all" ? filtered : top ? [top] : [])
    : [];
  const selKey = selectionItems.map((p) => p.id).join(",");
  useEffect(() => {
    if (!selectionMode) return;
    onSelectionChange?.(selKey ? selKey.split(",") : []);
  }, [selKey, selectionMode, onSelectionChange]);
  useEffect(() => {
    if (resetSignal === undefined) return;
    setFilter("all");
    setBulk(false);
  }, [resetSignal]);

  return (
    <div className="flex h-full flex-col">
      {toolbar && <div className="px-3 pt-3">{toolbar}</div>}

      {/* Category dropdown — Prize History only */}
      {showCategoryFilter && (
        <div className="px-3 pt-2">
          <div className="relative">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as "all" | Category); setFilter("all"); setBulk(false); }}
              className="w-full appearance-none rounded-xl border-[1.5px] border-black/10 bg-white py-2 pl-3 pr-9 text-[13px] font-bold text-[#1d2129] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            >
              <option value="all">{t.deckCategoryAll} ({deck.length})</option>
              {CATEGORIES.map((c) => {
                const n = deck.filter((p) => p.category === c).length;
                return n > 0 ? <option key={c} value={c}>{t.cardCategory(c)} ({n})</option> : null;
              })}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8a9099]">▾</span>
          </div>
        </div>
      )}

      {/* Prize-tier filter + bulk toggle */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pb-1.5 pt-2.5">
        {chips.map((c) => {
          // In selection mode the "All" chip is a select-all toggle (driven by
          // bulk), so it only lights up when everything is actually selected —
          // and can be tapped again to deselect. Tier chips toggle their tier.
          const on = selectionMode
            ? c.key === "all" ? bulk : filter === c.key
            : filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => {
                if (selectionMode && c.key === "all") {
                  setBulk((b) => !b);
                  setFilter("all");
                } else {
                  setFilter((f) => (selectionMode && f === c.key ? "all" : c.key));
                  setBulk(false);
                }
              }}
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition"
              style={{ background: on ? "#B40206" : "#fff", color: on ? "#fff" : "#5c626b", border: `1.5px solid ${on ? "#B40206" : "rgba(0,0,0,0.1)"}` }}
            >
              {c.label}<span className="ml-1 opacity-75">{c.n}</span>
            </button>
          );
        })}
        <button
          onClick={() => { setBulk((b) => !b); if (selectionMode) setFilter("all"); }}
          disabled={filtered.length === 0}
          className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition disabled:opacity-40"
          style={{ background: bulk ? "#1d2129" : "#fff", color: bulk ? "#fff" : "#1d2129", border: "1.5px solid rgba(0,0,0,0.12)" }}
        >
          {t.selectAll}
        </button>
      </div>

      {/* Deck (extra top room so the peeking card behind isn't clipped) */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 pt-12 pb-3">
        {filtered.length === 0 ? (
          <EmptyState icon="🎉" title={t.deckEmpty} subtitle={t.deckEmptySub} />
        ) : (
          <>
            <style>{`
              @keyframes deckHintCard { 0%,100%{transform:translateX(0) translateY(0) rotate(0)} 14%{transform:translateX(-30px) rotate(-3.5deg)} 28%{transform:translateX(0) rotate(0)} 42%{transform:translateX(30px) rotate(3.5deg)} 56%{transform:translateX(0) rotate(0)} 70%{transform:translateY(34px)} 84%{transform:translateY(0)} }
              @keyframes deckHintLeft { 0%,100%{opacity:0} 14%{opacity:1} 28%{opacity:0} }
              @keyframes deckHintRight { 0%,36%{opacity:0} 42%{opacity:1} 56%,100%{opacity:0} }
              @keyframes deckHintDown { 0%,64%{opacity:0} 70%{opacity:1} 84%,100%{opacity:0} }
            `}</style>
            <div
              className="pointer-events-none absolute left-4 top-1/2 z-30 rounded-2xl border-[3px] px-3 py-1.5 text-[15px] font-extrabold"
              style={{ borderColor: "#f5670a", color: "#f5670a", transform: "translateY(-50%) rotate(-12deg)", opacity: dragging ? Math.max(0, Math.min(1, -drag.dx / 100)) : 0, animation: showHint ? "deckHintLeft 3s ease-in-out .5s 2 both" : undefined }}
            >
              {t.deckSwipeLeft}
            </div>
            <div
              className="pointer-events-none absolute right-4 top-1/2 z-30 rounded-2xl border-[3px] px-3 py-1.5 text-[15px] font-extrabold"
              style={{ borderColor: "#B40206", color: "#B40206", transform: "translateY(-50%) rotate(12deg)", opacity: dragging ? Math.max(0, Math.min(1, drag.dx / 100)) : 0, animation: showHint ? "deckHintRight 3s ease-in-out .5s 2 both" : undefined }}
            >
              {t.deckSwipeRight}
            </div>
            <div
              className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border-[3px] px-3 py-1.5 text-[15px] font-extrabold"
              style={{ borderColor: "#1d2129", color: "#1d2129", opacity: dragging && drag.dy > 0 && drag.dy > Math.abs(drag.dx) ? Math.max(0, Math.min(1, drag.dy / 100)) : 0, animation: showHint ? "deckHintDown 3s ease-in-out .5s 2 both" : undefined }}
            >
              {t.deckSwipeDown}
            </div>

            <div className="relative w-[90%] max-w-[345px]">
              {/* Up to 4 cards peeking behind (5 visible total). Each is smaller and
                  higher; when the top card leaves they each promote one slot closer. */}
              {ordered.slice(1, 5).map((card, idx) => {
                const slot = idx + 1;
                const vslot = leaving ? slot - 1 : slot; // promote one step as the top leaves
                const scale = vslot <= 0 ? 1 : 1 - vslot * scaleStep;
                const ty = vslot <= 0 ? 0 : -vslot * peekStep;
                return (
                  <div
                    key={"behind-" + card.id}
                    className="pointer-events-none absolute inset-0"
                    style={{
                      zIndex: 5 - slot,
                      transform: `translateY(${ty}px) scale(${scale})`,
                      transformOrigin: "center",
                      transition: "transform .3s cubic-bezier(.2,.8,.2,1)",
                    }}
                  >
                    <PrizeSwipeCard p={card} t={t} lang={lang} ghost art={artSize} />
                  </div>
                );
              })}

              {(() => {
                const p = top;
                const flying = leaving !== null;
                let transform: string;
                let transition: string;
                if (flying) {
                  if (leaving === "down") {
                    transform = "translateY(760px) scale(0.9)";
                  } else {
                    transform = `translateX(${leaving === "left" ? -640 : 640}px) rotate(${leaving === "left" ? -10 : 10}deg)`;
                  }
                  transition = "transform .26s ease-out, opacity .26s ease-out";
                } else if (drag.active) {
                  transform = `translateX(${drag.dx}px) translateY(${drag.dy}px) rotate(${drag.dx * 0.03}deg)`;
                  transition = "none";
                } else {
                  transform = "translateX(0) rotate(0deg)";
                  transition = "transform .26s cubic-bezier(.2,.8,.2,1)";
                }
                return (
                  <div
                    key={p.id}
                    onPointerDown={down}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    onDragStart={(e) => e.preventDefault()}
                    className="relative z-10 w-full select-none"
                    style={{ transform, transition, opacity: flying ? 0 : 1, touchAction: "none", cursor: "grab", willChange: "transform", animation: showHint ? "deckHintCard 3s ease-in-out .5s 2 both" : undefined }}
                  >
                    <PrizeSwipeCard p={p} t={t} lang={lang} bulkCount={bulk ? filtered.length : undefined} art={artSize} />
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* Swipe hint (the confirm bar below is the single action footer) */}
      {filtered.length > 0 && (
        <p className="px-4 pb-2 pt-1 text-center text-[11px] leading-tight text-[#8a9099]">
          {bulk ? t.deckBulkOn : t.deckHint}
        </p>
      )}
    </div>
  );
}

function WaitingTab({ prizes, t, lang }: { prizes: WaitingPrize[]; t: Dict; lang: Lang }) {
  if (prizes.length === 0) {
    return <EmptyState icon="📦" title={t.waitingEmptyTitle} subtitle={t.waitingEmptySub} />;
  }
  return (
    <div className="no-scrollbar h-full overflow-y-auto px-3 pb-4 pt-3">
      <div className="space-y-2.5">
        {prizes.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <PrizeArt rarity={p.rarity} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-[#1d2129]">{locName(p, lang)}</p>
              <p className="truncate text-[11px] text-[#8a9099]">{locDesc(p, lang)}</p>
              <p className="mt-1 text-[11px] text-[#8a9099]">{t.requested(fmtDate(p.requestedAt))}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10.5px] font-semibold text-[#C9701B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f5670a]" /> {t.preparing}
              </span>
              <div className="mt-1.5">
                <CoinChip value={p.coinValue} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 px-1 text-center text-[10.5px] text-[#a2a8b0]">{t.waitingFooter}</p>
      <div className="-mx-3 mt-4"><SiteFooter t={t} /></div>
    </div>
  );
}

function ShippedTab({ prizes, onCopy, t, lang }: { prizes: ShippedPrize[]; onCopy: (code: string) => void; t: Dict; lang: Lang }) {
  if (prizes.length === 0) {
    return <EmptyState icon="✅" title={t.shippedEmptyTitle} subtitle={t.shippedEmptySub} />;
  }
  return (
    <div className="no-scrollbar h-full overflow-y-auto px-3 pb-4 pt-3">
      <div className="space-y-2.5">
        {prizes.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <PrizeArt rarity={p.rarity} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-[#1d2129]">{locName(p, lang)}</p>
              <p className="truncate text-[11px] text-[#8a9099]">{locDesc(p, lang)}</p>
              <p className="mt-1 text-[11px] text-[#8a9099]">{t.requested(fmtDate(p.requestedAt))}</p>
              <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#f1f3f6] px-2 py-1">
                <span className="text-[10px] font-semibold text-[#8a9099]">{t.tracking}</span>
                <span className="font-mono text-[11px] font-bold text-[#1d2129]">{p.tracking}</span>
                <button onClick={() => onCopy(p.tracking)} className="ml-auto text-[#B40206]" aria-label={t.copyAria}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="mt-1.5">
                <CoinChip value={p.coinValue} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="-mx-3 mt-4"><SiteFooter t={t} /></div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="mt-3 text-[15px] font-bold text-[#41464e]">{title}</p>
      <p className="mt-1 text-[12.5px] text-[#8a9099]">{subtitle}</p>
    </div>
  );
}

/* ── overlays ────────────────────────────────────────────────────────── */
function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white px-4 pb-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#1d2129]">{title}</h3>
          <button onClick={onClose} className="text-[#8a9099]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CenterModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ShippingFlow({
  prizes,
  total,
  onClose,
  onConfirm,
  t,
  lang,
  shippingAddresses,
  onShippingAddressesChange,
}: {
  prizes: WonPrize[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  t: Dict;
  lang: Lang;
  shippingAddresses: ShippingAddr[];
  onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>;
}) {
  const [step, setStep] = useState<"address" | "confirm" | "addNew">(shippingAddresses.length === 0 ? "addNew" : "address");
  const [addrId, setAddrId] = useState<string>(() => {
    const def = shippingAddresses.find(a => a.isDefault);
    return def?.id ?? shippingAddresses[0]?.id ?? "";
  });

  // Add-new form state (mirrors ShippingAddressPage)
  const [newForm, setNewForm] = useState<Omit<ShippingAddr, "id" | "isDefault">>(EMPTY_SHIPPING_FORM);
  const [postalTouched, setPostalTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [zipTouched, setZipTouched] = useState(false);
  const [streetNumTouched, setStreetNumTouched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<{ prefecture: string; city: string; streetNumber: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postalValid = /^\d{3}-\d{4}$/.test(newForm.postalCode);
  const phoneValid = newForm.phone.replace(/\D/g, "").length >= 10;
  const zipValid = /^\d{5}$/.test(newForm.zipCode);
  const streetNumValid = /^\d+$/.test(newForm.streetNumber.trim()) && newForm.streetNumber.trim().length > 0;
  const postalError = postalTouched && newForm.postalCode.length > 0 && !postalValid ? "NNN-NNNN" : "";
  const phoneError = phoneTouched && newForm.phone.length > 0 && !phoneValid ? (lang === "ja" ? "電話番号は10桁以上で入力してください" : "Phone number must be at least 10 digits") : "";
  const zipError = zipTouched && newForm.zipCode.length > 0 && !zipValid ? "5 digits required" : "";
  const streetNumError = streetNumTouched && newForm.streetNumber.length > 0 && !streetNumValid ? (lang === "ja" ? "数字のみ" : "Numbers only") : "";
  const canAddNew = newForm.lastName.trim().length > 0 && newForm.firstName.trim().length > 0 && phoneValid &&
    (newForm.country === "japan"
      ? postalValid && !!newForm.prefecture && newForm.city.trim().length > 0 && streetNumValid
      : newForm.cityStreetNumber.trim().length > 0 && !!newForm.state && zipValid);

  const chosen = shippingAddresses.find(a => a.id === addrId);
  const phonePrefix = newForm.country === "japan" ? "🇯🇵 +81" : "🇺🇸 +1";

  // POC postcode lookup: seed a few plausible Japanese addresses from the typed postcode.
  function genShipCandidates(postal: string): { prefecture: string; city: string; streetNumber: string }[] {
    const digits = postal.replace(/\D/g, "");
    const seed = digits.length ? parseInt(digits.slice(0, 4), 10) || 0 : 0;
    const prefIdx = [12, 26, 13, 22, 39, 27]; // Tokyo, Osaka, Kanagawa, Aichi, Fukuoka, Hyogo
    const cityPool = lang === "ja"
      ? ["中央区銀座", "渋谷区道玄坂", "新宿区西新宿", "港区六本木", "北区梅田"]
      : ["Chuo-ku, Ginza", "Shibuya-ku, Dogenzaka", "Nishi-Shinjuku", "Minato-ku, Roppongi", "Kita-ku, Umeda"];
    return Array.from({ length: 4 }, (_, i) => ({
      prefecture: PREFECTURES_JA[prefIdx[(seed + i) % prefIdx.length]],
      city: cityPool[(seed + i) % cityPool.length],
      streetNumber: String(1000 + ((seed * 7 + i * 137) % 8999)),
    }));
  }
  function chooseShipCandidate(c: { prefecture: string; city: string; streetNumber: string }) {
    setNewForm(f => ({ ...f, prefecture: c.prefecture, city: c.city, streetNumber: c.streetNumber }));
    setStreetNumTouched(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setCandidates([]);
    setSearching(false);
  }

  function setPostalCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    setNewForm(f => ({ ...f, postalCode: formatted }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (digits.length >= 3) {
      setSearching(true);
      setCandidates([]);
      searchTimer.current = setTimeout(() => {
        setCandidates(genShipCandidates(formatted));
        setSearching(false);
      }, 900);
    } else {
      setSearching(false);
      setCandidates([]);
    }
  }

  function onCountryChange(country: ShippingCountry) {
    setNewForm(f => ({ ...f, country, postalCode: "", prefecture: "", city: "", streetNumber: "", cityStreetNumber: "", state: "", zipCode: "", phone: "" }));
    setPostalTouched(false); setZipTouched(false); setStreetNumTouched(false); setPhoneTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false); setCandidates([]);
  }

  function openAddNew() {
    setNewForm({ ...EMPTY_SHIPPING_FORM });
    setPostalTouched(false); setPhoneTouched(false); setZipTouched(false); setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false); setCandidates([]);
    setStep("addNew");
  }

  function handleSaveNewAddress() {
    const isFirst = shippingAddresses.length === 0;
    const newAddr: ShippingAddr = { id: Date.now().toString(36), isDefault: isFirst, ...newForm };
    onShippingAddressesChange(prev => [...prev, newAddr]);
    setAddrId(newAddr.id);
    setStep("address");
  }

  function addrDisplayLines(addr: ShippingAddr): string[] {
    return formatShippingAddr(addr, lang);
  }
  function addrName(addr: ShippingAddr) { return `${addr.lastName} ${addr.firstName}`; }
  function addrPhone(addr: ShippingAddr) { return `${addr.country === "japan" ? "+81" : "+1"} ${addr.phone}`; }
  function addrFlag(addr: ShippingAddr) { return addr.country === "japan" ? "🇯🇵" : "🇺🇸"; }

  const inputCls = "w-full rounded-xl border border-black/15 px-3 py-2.5 text-[13px] text-[#1d2129] outline-none focus:border-[#B40206]";
  const labelCls = "mb-1 mt-2 block text-[11px] font-semibold text-[#8a9099]";

  return (
    <div className="absolute inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="max-h-[88%] w-full overflow-y-auto rounded-t-2xl bg-white px-4 pb-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-black/15" />

        {/* ── Address list step ── */}
        {step === "address" && (
          <>
            <h3 className="mb-2 text-[15px] font-bold text-[#1d2129]">{t.chooseAddress}</h3>
            {shippingAddresses.length === 0 ? (
              <p className="mb-3 text-center text-[12.5px] text-[#8a9099]">{t.shippingEmpty}</p>
            ) : (
              <div className="space-y-2">
                {shippingAddresses.map((addr) => {
                  const sel = addr.id === addrId;
                  const lines = addrDisplayLines(addr);
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setAddrId(addr.id)}
                      className="flex w-full items-start gap-2.5 rounded-xl border-2 p-3 text-left"
                      style={{ borderColor: sel ? "#B40206" : "#e5e8ec", background: sel ? "#FFF4F4" : "#fff" }}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: sel ? "#B40206" : "#c9ced6" }}>
                        {sel && <span className="h-2 w-2 rounded-full bg-[#B40206]" />}
                      </span>
                      <span className="text-[12.5px] leading-relaxed">
                        <b className="text-[#1d2129]">{addrFlag(addr)} {addrName(addr)}</b>
                        {addr.isDefault && <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#22a34a" }}>{t.shippingDefaultLabel}</span>}
                        <br />{lines.map((l, i) => <span key={i} className="text-[#5c626b]">{l}<br /></span>)}
                        <span className="text-[#8a9099]">{addrPhone(addr)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={openAddNew} className="mt-2 w-full rounded-xl border border-dashed border-black/20 py-2.5 text-[13px] font-bold text-[#5c626b]">
              {t.addNewAddress}
            </button>
            <button
              disabled={!chosen}
              onClick={() => setStep("confirm")}
              className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}
            >
              {t.continueBtn}
            </button>
          </>
        )}

        {/* ── Add new address step ── */}
        {step === "addNew" && (
          <>
            <div className="mb-3 flex items-center gap-2">
              {shippingAddresses.length > 0 && (
                <button onClick={() => setStep("address")} className="flex h-7 w-7 shrink-0 items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              <h3 className="text-[15px] font-bold text-[#1d2129]">{t.shippingAddNew}</h3>
            </div>

            {/* Name */}
            <div className="mb-3 flex gap-2">
              <div className="flex-1 min-w-0">
                <label className={labelCls}>{t.profileLastName}<span className="ml-0.5 text-[#B40206]">*</span></label>
                <input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} placeholder={t.profilePlaceholder} className={inputCls} />
              </div>
              <div className="flex-1 min-w-0">
                <label className={labelCls}>{t.profileFirstName}<span className="ml-0.5 text-[#B40206]">*</span></label>
                <input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder={t.profilePlaceholder} className={inputCls} />
              </div>
            </div>

            {/* Country */}
            <div className="mb-3">
              <label className={labelCls}>{t.shippingCountry}<span className="ml-0.5 text-[#B40206]">*</span></label>
              <div className="relative">
                <select
                  value={newForm.country}
                  onChange={e => onCountryChange(e.target.value as ShippingCountry)}
                  className={inputCls + " appearance-none pr-8"}
                >
                  <option value="japan">{t.shippingJapan}</option>
                  <option value="usa">{t.shippingUSA}</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
            </div>

            {/* Japan fields */}
            {newForm.country === "japan" && (
              <>
                <div className="mb-3 flex gap-2">
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>{t.profilePostalCode}<span className="ml-0.5 text-[#B40206]">*</span></label>
                    <input value={newForm.postalCode} onChange={e => setPostalCode(e.target.value)} onBlur={() => setPostalTouched(true)} placeholder="NNN-NNNN" className={inputCls + (postalError ? " border-[#B40206]" : "")} />
                    {postalError && <p className="mt-0.5 text-[10px] text-[#B40206]">{postalError}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>{t.profilePrefecture}<span className="ml-0.5 text-[#B40206]">*</span></label>
                    <div className="relative">
                      <select value={newForm.prefecture} onChange={e => setNewForm(f => ({ ...f, prefecture: e.target.value }))} className={inputCls + " appearance-none pr-8"}>
                        <option value="">{lang === "ja" ? "都道府県" : "Prefecture"}</option>
                        {PREFECTURES_JA.map((ja, i) => <option key={ja} value={ja}>{lang === "ja" ? ja : PREFECTURES_EN[i]}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
                    </div>
                  </div>
                </div>
                {!searching && candidates.length === 0 && (
                  <p className="mb-3 -mt-1 text-[10.5px] text-[#a2a8b0]">{t.postcodeHint}</p>
                )}
                {searching && (
                  <div className="mb-3 -mt-1 flex items-center gap-2 text-[12px] font-semibold text-[#8a9099]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#B40206]" />
                    {t.searching}
                  </div>
                )}
                {!searching && candidates.length > 0 && (
                  <div className="mb-3 -mt-1">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.selectAddress}</p>
                    <div className="space-y-2">
                      {candidates.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => chooseShipCandidate(c)}
                          className="animate-fade-slide flex w-full items-center justify-between gap-2 rounded-xl border border-black/15 bg-white p-3 text-left"
                          style={{ animationDelay: `${Math.min(i, 4) * 80}ms` }}
                        >
                          <span className="text-[12.5px] leading-relaxed text-[#1d2129]">
                            〒{newForm.postalCode} {c.prefecture}
                            <br /><span className="text-[#8a9099]">{c.city} {c.streetNumber}</span>
                          </span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="#c9ced6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className={labelCls}>{t.profileCity}<span className="ml-0.5 text-[#B40206]">*</span></label>
                  <input value={newForm.city} onChange={e => setNewForm(f => ({ ...f, city: e.target.value }))} placeholder={lang === "ja" ? "市区町村・番地" : "City, Street"} className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingStreetNumber}<span className="ml-0.5 text-[#B40206]">*</span></label>
                  <input value={newForm.streetNumber} onChange={e => setNewForm(f => ({ ...f, streetNumber: e.target.value.replace(/\D/g, "") }))} onBlur={() => setStreetNumTouched(true)} placeholder={lang === "ja" ? "例: 1234" : "e.g. 1234"} className={inputCls + (streetNumError ? " border-[#B40206]" : "")} />
                  {streetNumError && <p className="mt-0.5 text-[10px] text-[#B40206]">{streetNumError}</p>}
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingApartment}</label>
                  <input value={newForm.apartment} onChange={e => setNewForm(f => ({ ...f, apartment: e.target.value }))} placeholder={lang === "ja" ? "例: 〇〇マンション 101号室（任意）" : "Apt, Room No. (optional)"} className={inputCls} />
                </div>
              </>
            )}

            {/* USA fields */}
            {newForm.country === "usa" && (
              <>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingApartment}</label>
                  <input value={newForm.apartment} onChange={e => setNewForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Apt, Suite, Room No. (optional)" className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingCityStreetNumber}<span className="ml-0.5 text-[#B40206]">*</span></label>
                  <input value={newForm.cityStreetNumber} onChange={e => setNewForm(f => ({ ...f, cityStreetNumber: e.target.value }))} placeholder="e.g. 123 Main St, Springfield" className={inputCls} />
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingState}<span className="ml-0.5 text-[#B40206]">*</span></label>
                  <div className="relative">
                    <select value={newForm.state} onChange={e => setNewForm(f => ({ ...f, state: e.target.value }))} className={inputCls + " appearance-none pr-8"}>
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className={labelCls}>{t.shippingZipCode}<span className="ml-0.5 text-[#B40206]">*</span></label>
                  <input value={newForm.zipCode} onChange={e => setNewForm(f => ({ ...f, zipCode: e.target.value.replace(/\D/g, "").slice(0, 5) }))} onBlur={() => setZipTouched(true)} placeholder="e.g. 90210" className={inputCls + (zipError ? " border-[#B40206]" : "")} />
                  {zipError && <p className="mt-0.5 text-[10px] text-[#B40206]">{zipError}</p>}
                </div>
              </>
            )}

            {/* Phone */}
            <div className="mb-4">
              <label className={labelCls}>{t.profilePhone}<span className="ml-0.5 text-[#B40206]">*</span></label>
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 items-center self-stretch rounded-xl border border-black/15 px-3 text-[13px] text-[#1d2129]">{phonePrefix}</div>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={newForm.phone}
                    onChange={e => setNewForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="0000000000"
                    className={inputCls + (phoneError ? " border-[#B40206]" : "")}
                  />
                  {phoneError && <p className="mt-0.5 text-[10px] text-[#B40206]">{phoneError}</p>}
                </div>
              </div>
            </div>

            <button
              disabled={!canAddNew}
              onClick={handleSaveNewAddress}
              className="mt-1 w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg,#ff2233,#B40206)" }}
            >
              {t.shippingRegister}
            </button>
          </>
        )}

        {/* ── Confirm shipping step ── */}
        {step === "confirm" && (
          <>
            <h3 className="mb-2 text-[15px] font-bold text-[#1d2129]">{t.confirmTitle}</h3>
            <div className="rounded-xl bg-[#f1f3f6] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.deliverTo}</p>
              {chosen && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#1d2129]">
                  <b>{addrFlag(chosen)} {addrName(chosen)}</b><br />
                  {addrDisplayLines(chosen).map((l, i) => <span key={i} className="text-[#5c626b]">{l}<br /></span>)}
                  <span className="text-[#8a9099]">{addrPhone(chosen)}</span>
                </p>
              )}
            </div>
            <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.prizesCount(prizes.length)}</p>
            <div className="space-y-1.5">
              {prizes.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <PrizeArt rarity={p.rarity} size={32} />
                  <span className="flex-1 truncate text-[12px] text-[#41464e]">{locName(p, lang)}</span>
                  <CoinChip value={p.coinValue} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FFF6E3] px-3 py-2">
              <span className="text-[12px] font-semibold text-[#B5740A]">{t.totalValue}</span>
              <CoinChip value={total} strong />
            </div>
            <p className="mt-2 text-center text-[11px] text-[#8a9099]">{t.freeShip}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setStep("address")} className="rounded-xl border border-black/15 py-2.5 text-[13px] font-bold text-[#5c626b]">{t.back}</button>
              <button onClick={onConfirm} className="rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "linear-gradient(180deg,#ff8a1f,#f5670a)" }}>{t.requestShippingBtn}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── CoinStack — decorative SVG coin illustrations ───────────────────── */
function CoinStack({ pts }: { pts: number }) {
  if (pts >= 20000) {
    return (
      <svg width="52" height="46" viewBox="0 0 52 46">
        <ellipse cx="12" cy="38" rx="10" ry="4" fill="#c8860a" />
        <rect x="2" y="26" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="12" cy="26" rx="10" ry="4" fill="#f5c842" />
        <ellipse cx="32" cy="34" rx="10" ry="4" fill="#c8860a" />
        <rect x="22" y="22" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="32" cy="22" rx="10" ry="4" fill="#f5c842" />
        <ellipse cx="22" cy="14" rx="10" ry="4" fill="#c8860a" />
        <rect x="12" y="2" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="22" cy="2" rx="10" ry="4" fill="#f5c842" />
      </svg>
    );
  }
  if (pts >= 10000) {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <ellipse cx="12" cy="36" rx="10" ry="4" fill="#c8860a" />
        <rect x="2" y="24" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="12" cy="24" rx="10" ry="4" fill="#f5c842" />
        <ellipse cx="28" cy="36" rx="10" ry="4" fill="#c8860a" />
        <rect x="18" y="24" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="28" cy="24" rx="10" ry="4" fill="#f5c842" />
        <ellipse cx="20" cy="12" rx="10" ry="4" fill="#c8860a" />
        <rect x="10" y="0" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="20" cy="0" rx="10" ry="4" fill="#f5c842" />
      </svg>
    );
  }
  if (pts >= 5000) {
    return (
      <svg width="42" height="38" viewBox="0 0 42 38">
        <ellipse cx="10" cy="30" rx="10" ry="4" fill="#c8860a" />
        <rect x="0" y="18" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="10" cy="18" rx="10" ry="4" fill="#f5c842" />
        <ellipse cx="28" cy="30" rx="10" ry="4" fill="#c8860a" />
        <rect x="18" y="18" width="20" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="28" cy="18" rx="10" ry="4" fill="#f5c842" />
        <ellipse cx="20" cy="10" rx="10" ry="4" fill="#c8860a" />
        <rect x="10" y="0" width="20" height="10" rx="2" fill="#f0a500" />
        <ellipse cx="20" cy="0" rx="10" ry="4" fill="#f5c842" />
      </svg>
    );
  }
  if (pts >= 1000) {
    return (
      <svg width="36" height="32" viewBox="0 0 36 32">
        <ellipse cx="18" cy="28" rx="12" ry="4.5" fill="#c8860a" />
        <rect x="6" y="16" width="24" height="12" rx="2" fill="#f0a500" />
        <ellipse cx="18" cy="16" rx="12" ry="4.5" fill="#f5c842" />
        <ellipse cx="18" cy="4.5" rx="12" ry="4.5" fill="#c8860a" />
        <rect x="6" y="0" width="24" height="5" rx="2" fill="#f0a500" />
        <ellipse cx="18" cy="0" rx="12" ry="4.5" fill="#f5c842" />
      </svg>
    );
  }
  return (
    <svg width="32" height="22" viewBox="0 0 32 22">
      <ellipse cx="16" cy="18" rx="14" ry="5" fill="#c8860a" />
      <rect x="2" y="6" width="28" height="12" rx="3" fill="#f0a500" />
      <ellipse cx="16" cy="6" rx="14" ry="5" fill="#f5c842" />
    </svg>
  );
}

function CardBrandIcon({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b === "visa") return <span className="inline-block min-w-[36px] text-center text-[13px] font-black italic" style={{ color: "#1a1f71" }}>VISA</span>;
  if (b === "mastercard") return (
    <div className="relative flex h-6 w-9 shrink-0 items-center">
      <div className="absolute left-0 h-6 w-6 rounded-full" style={{ background: "#eb001b" }} />
      <div className="absolute left-3 h-6 w-6 rounded-full opacity-80" style={{ background: "#f79e1b" }} />
    </div>
  );
  if (b === "amex") return <span className="inline-block rounded bg-[#006fcf] px-1.5 py-0.5 text-center text-[10px] font-black text-white">AMEX</span>;
  return <svg width="36" height="24" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#1d2129" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>;
}

/* ── PurchaseFlow ─────────────────────────────────────────────────────── */
type BillingAddress = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  country: string;
  city: string;
  state: string;
  zip: string;
};
type PurchaseStep = "checkout" | "auth3ds" | "success";

function PurchaseFlow({
  pkg,
  lang,
  onComplete,
  onClose,
  onDrawItem,
  savedCards,
  onSaveCard,
  onDeleteCard,
}: {
  pkg: PointPackage;
  lang: Lang;
  onComplete: (pts: number) => void;
  onClose: () => void;
  onDrawItem?: (item: OripaItem) => void;
  savedCards?: { last4: string; expiry: string; brand: string; name: string; billingAddress?: BillingAddress }[];
  onSaveCard?: (card: { last4: string; expiry: string; brand: string; name: string; billingAddress?: BillingAddress }) => void;
  onDeleteCard?: (idx: number) => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<PurchaseStep>("checkout");
  const [payMethod, setPayMethod] = useState<"card" | "applePay" | "googlePay" | "payPay" | "link">("card");
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | "new">((savedCards && savedCards.length > 0) ? 0 : "new");
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [country, setCountry] = useState("Japan");
  const [authCode, setAuthCode] = useState("");
  const [showMyCards, setShowMyCards] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingEditMode, setBillingEditMode] = useState(false);
  const [activeOripaIdx, setActiveOripaIdx] = useState(0);
  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(id);
  }, [toastMsg]);
  useEffect(() => {
    if (selectedCardIdx === "new") {
      // Pre-populate from the most recent saved card's billing address
      const lastAddr = savedCards?.find(c => c.billingAddress)?.billingAddress;
      if (lastAddr) {
        setBillingFirstName(lastAddr.firstName);
        setBillingLastName(lastAddr.lastName);
        setBillingAddress1(lastAddr.address1);
        setBillingAddress2(lastAddr.address2);
        setCountry(lastAddr.country);
        setBillingCity(lastAddr.city);
        setBillingState(lastAddr.state);
        setBillingZip(lastAddr.zip);
      } else {
        setBillingFirstName(""); setBillingLastName(""); setBillingAddress1("");
        setBillingAddress2(""); setBillingCity(""); setBillingState(""); setBillingZip("");
      }
      setBillingEditMode(false);
    }
  }, [selectedCardIdx]);

  const inputCls = "w-full rounded-lg border border-[#e2e5ea] bg-white px-3 py-2.5 text-[14px] text-[#1d2129] placeholder:text-[#b0b6bf] focus:outline-none focus:border-[#7b88ff]";
  const labelCls = "block mb-1 mt-3 text-[12px] font-medium text-[#5c626b]";

  const rawCardNum = cardNum.replace(/\s/g, "");
  const cardNumValid = rawCardNum.length >= 14 && rawCardNum.length <= 16;
  const expiryValid = (() => {
    const m = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const nowY = now.getFullYear() % 100;
    const nowM = now.getMonth() + 1;
    return yy > nowY || (yy === nowY && mm >= nowM);
  })();
  const isNewCard = payMethod === "card" && (!savedCards || savedCards.length === 0 || selectedCardIdx === "new");
  const billingFilled = billingFirstName.trim().length > 0 && billingLastName.trim().length > 0 && billingAddress1.trim().length > 0 && billingCity.trim().length > 0 && billingState.length > 0 && billingZip.trim().length > 0;
  const payDisabled = isNewCard && (!cardNumValid || !expiryValid || !billingFilled);

  const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
  const selectCls = "w-full appearance-none rounded-lg border border-[#e2e5ea] bg-white px-3 py-2.5 text-[14px] text-[#1d2129] focus:outline-none focus:border-[#7b88ff]";
  const chevronSvg = <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const renderBillingForm = () => (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={billingFirstName} onChange={(e) => setBillingFirstName(e.target.value)} placeholder={t.checkoutBillingFirstNamePh} className={inputCls} />
        <input value={billingLastName} onChange={(e) => setBillingLastName(e.target.value)} placeholder={t.checkoutBillingLastNamePh} className={inputCls} />
      </div>
      <input value={billingAddress1} onChange={(e) => setBillingAddress1(e.target.value)} placeholder={t.checkoutBillingAddress1Ph} className={inputCls} />
      <p className="flex items-start gap-1 text-[11px] text-[#5c626b]">
        {t.checkoutBillingPOBoxNote}
        <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8a9099" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"/></svg>
      </p>
      <input value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} placeholder={t.checkoutBillingAddress2Ph} className={inputCls} />
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectCls}>
            <option>India</option>
            <option>Japan</option>
            <option>United States</option>
            <option>United Kingdom</option>
            <option>Australia</option>
          </select>
          {chevronSvg}
        </div>
        <input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder={t.checkoutBillingCityPh} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <select value={billingState} onChange={(e) => setBillingState(e.target.value)} className={selectCls}>
            <option value="">{t.checkoutBillingStatePh}</option>
            {US_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
          {chevronSvg}
        </div>
        <input value={billingZip} onChange={(e) => setBillingZip(e.target.value)} placeholder={t.checkoutBillingZipPh} className={inputCls} />
      </div>
    </div>
  );

  if (step === "auth3ds") {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="relative mx-3 w-full max-w-sm overflow-hidden rounded-2xl bg-white">
          <button onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-bold text-[#5c626b] hover:bg-black/5">✕</button>
          <div className="border-b border-black/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-sm" style={{ background: "#1a5c3a" }} />
                <span className="text-[11px] font-bold text-[#333]">三井住友カード</span>
              </div>
              <span className="text-[22px] font-black italic" style={{ color: "#1a1f71" }}>VISA</span>
            </div>
          </div>
          <div className="px-5 pb-6 pt-4">
            <h3 className="text-[16px] font-bold text-[#1d2129]">認証コードをご入力ください</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#5c626b]">
              TRUSTHUB K.K.へ¥{pkg.jpy.toLocaleString()} JPYの決済を認証します。<br /><br />
              認証コードをa*****n@flatriver-inc.comへお送りしました。届いた認証コードをご入力いただき、「認証する」ボタンを押してください。<br />
              ※ドメイン指定受信を設定の場合は@payment.vpass.ne.jpからのメールを受信できるように設定をお願いします。
            </p>
            <div className="mt-4 text-center">
              <p className="text-[12px] text-[#5c626b]">{t.auth3dsRefCode}</p>
              <p className="text-[18px] font-black text-[#1d2129]">OTE</p>
            </div>
            <label className="mt-4 block text-[12px] font-medium text-[#5c626b]">認証コード</label>
            <input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder={t.auth3dsInputPh}
              className={`mt-1 ${inputCls}`}
            />
            <button
              onClick={() => setStep("success")}
              className="mt-4 w-full rounded-lg py-3 text-[15px] font-bold text-white"
              style={{ background: "#2355c5" }}
            >
              {t.auth3dsSubmit}
            </button>
            <button className="mt-3 block w-full text-center text-[13px] font-semibold text-[#2355c5] underline underline-offset-2">
              {t.auth3dsResend}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    const isSubscription = !!pkg.subscriptionName;
    const successHeading = isSubscription ? t.storeSuccessSubscription : t.successTitle;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
        <div className="relative w-full max-w-sm overflow-visible">
          {/* Floating treasure bag illustration */}
          <div className="relative z-10 flex justify-center" style={{ marginBottom: "-56px" }}>
            <img src="/coin-bag.png" alt="Coin bag" style={{ width: 140, height: 140, objectFit: "contain" }} />
          </div>
          {/* Card */}
          <div className="rounded-2xl bg-white px-5 pb-5 pt-16">
            <h2 className="text-center text-[20px] font-extrabold leading-snug text-[#1d2129]">
              {successHeading.split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
            </h2>
            <p className="mt-3 mb-3 text-center text-[13px] font-semibold text-[#5c626b]">{t.successPurchaseDetails}</p>
            {isSubscription ? (
              /* Subscription success detail */
              <div className="rounded-xl border border-black/10 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[18px]">🎴</span>
                  <span className="text-[15px] font-extrabold text-[#1d2129]">{pkg.subscriptionName}</span>
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#16a34a" }}>{t.storeSubscribedActive}</span>
                </div>
                {t.storeCollectorsPassPerks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1.5">
                    <span className="text-[13px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                    <span className="text-[12px] text-[#5c626b]">{perk}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Coins + gems row */
              <div className="flex items-center justify-center gap-6 rounded-xl border border-black/10 py-3">
                <div className="flex items-center gap-2">
                  <CoinIcon size={22} />
                  <span className="text-[18px] font-extrabold text-[#1d2129]">{pkg.coins.toLocaleString()}</span>
                </div>
                <div className="h-6 w-px bg-black/10" />
                <div className="flex items-center gap-2">
                  <GemIcon size={22} />
                  <span className="text-[18px] font-extrabold text-[#1d2129]">{pkg.freePoints.toLocaleString()}</span>
                </div>
              </div>
            )}
            {/* Oripa mini tiles carousel */}
            {!isSubscription && (() => {
              const oripaItems = [...RECOMMENDED_ORIPA, ...LIST_ORIPA];
              const current = oripaItems[activeOripaIdx];
              const total = oripaItems.length;
              return (
                <div className="mt-4">
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#8a9099]">Play Now</p>
                  <div className="flex items-center gap-2">
                    {/* Left arrow */}
                    <button
                      onClick={() => setActiveOripaIdx((i) => (i - 1 + total) % total)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white shadow-sm active:scale-90"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#1d2129" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    {/* Tile */}
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-black/[0.07] bg-[#f8f9fa] px-2.5 py-2">
                      {current.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={current.image} alt="" className="shrink-0 rounded-lg object-cover" style={{ width: 48, height: 48 }} />
                      ) : (
                        <div className="shrink-0 rounded-lg bg-[#e5e7eb]" style={{ width: 48, height: 48 }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-bold leading-tight text-[#1d2129]">{current.title}</p>
                        <p className="mt-0.5 text-[10px] text-[#8a9099]">{current.remaining.toLocaleString()}/{current.total.toLocaleString()} left · {current.endsIn}min</p>
                      </div>
                      <button
                        onClick={() => { onComplete(pkg.coins); onDrawItem?.(current); }}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-extrabold text-white"
                        style={{ background: "#B40206" }}
                      >
                        Draw
                      </button>
                    </div>
                    {/* Right arrow */}
                    <button
                      onClick={() => setActiveOripaIdx((i) => (i + 1) % total)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white shadow-sm active:scale-90"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="#1d2129" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                  {/* Dot indicators */}
                  <div className="mt-2 flex justify-center gap-1">
                    {oripaItems.map((_, i) => (
                      <button key={i} onClick={() => setActiveOripaIdx(i)} className="rounded-full transition-all" style={{ width: i === activeOripaIdx ? 16 : 6, height: 6, background: i === activeOripaIdx ? "#B40206" : "#d1d5db" }} />
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Close button */}
            <button
              onClick={() => { onComplete(pkg.coins); }}
              className="mt-3 w-full rounded-xl border border-black/20 py-3 text-[15px] font-bold text-[#1d2129]"
            >
              {t.successClose}
            </button>
            {/* Billing note */}
            <p className="mt-3 text-center text-[10px] leading-relaxed text-[#8a9099]">{t.successBillingNote}</p>
          </div>
        </div>
      </div>
    );
  }

  if (showMyCards) {
    return (
      <div className="absolute inset-0 z-50">
        {/* Scrollable cards list */}
        <div className="h-full overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex items-center border-b border-black/10 bg-white px-4 py-3">
            <button onClick={() => setShowMyCards(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b] hover:bg-black/5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#e60012" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold text-[#1d2129]">My Cards</span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-4 pb-32">
            {(savedCards ?? []).map((card, i) => (
              <div
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-xl border p-4"
                style={{ borderColor: selectedCardIdx === i ? "#1d2129" : "#e2e5ea", background: selectedCardIdx === i ? "#f8f9fa" : "white" }}
                onClick={() => setSelectedCardIdx(i)}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selectedCardIdx === i ? "#1d2129" : "#c9ced6" }}>
                  {selectedCardIdx === i && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
                </span>
                <CardBrandIcon brand={card.brand} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#1d2129]">{card.brand} •••• {card.last4}</p>
                  <p className="text-[12px] text-[#8a9099]">{card.expiry}</p>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmIdx(i); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#B40206" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 11v6M14 11v6" stroke="#B40206" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Sticky Pay button */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-black/10 bg-white px-4 py-4">
          <button
            onClick={() => { setShowMyCards(false); setStep("auth3ds"); }}
            className="w-full rounded-xl py-3.5 text-[16px] font-bold text-white"
            style={{ background: "#c0392b" }}
          >
            Pay Now ¥{pkg.jpy.toLocaleString()}
          </button>
        </div>
        {/* Delete confirmation modal */}
        {deleteConfirmIdx !== null && savedCards && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
              <button
                onClick={() => setDeleteConfirmIdx(null)}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#5c626b] hover:bg-black/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
              <div className="px-6 pb-6 pt-5">
                <h3 className="text-[18px] font-bold text-[#1d2129]">Delete Card?</h3>
                <div className="my-3 h-px bg-black/10" />
                <p className="text-[14px] leading-relaxed text-[#5c626b]">
                  Are you sure you want to remove {savedCards[deleteConfirmIdx]?.brand} •••• {savedCards[deleteConfirmIdx]?.last4}?
                </p>
                <button
                  onClick={() => {
                    const newLen = (savedCards?.length ?? 0) - 1;
                    onDeleteCard?.(deleteConfirmIdx);
                    setToastMsg("Card removed successfully");
                    setDeleteConfirmIdx(null);
                    if (selectedCardIdx === deleteConfirmIdx) {
                      setSelectedCardIdx(newLen > 0 ? 0 : "new");
                    } else if (typeof selectedCardIdx === "number" && selectedCardIdx > deleteConfirmIdx) {
                      setSelectedCardIdx(selectedCardIdx - 1);
                    }
                    if (newLen === 0) setShowMyCards(false);
                  }}
                  className="mt-5 w-full rounded-xl py-3 text-[15px] font-bold text-white"
                  style={{ background: "#c0392b" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirmIdx(null)}
                  className="mt-2.5 w-full rounded-xl border border-[#e2e5ea] py-3 text-[15px] font-semibold text-[#1d2129]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Toast */}
        {toastMsg && (
          <div className="pointer-events-none absolute bottom-24 left-4 right-4 flex justify-center">
            <div className="rounded-full bg-[#1d2129] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">
              {toastMsg}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center border-b border-black/10 bg-white px-4 py-3">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b] hover:bg-black/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#e60012" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto absolute left-1/2 -translate-x-1/2" />
        <div className="ml-auto h-8 w-8" />
      </div>

      <div className="px-4 pb-4 pt-4">
        {/* Package summary */}
        <div className="mb-4 overflow-hidden rounded-xl border bg-white" style={{ borderColor: (pkg.firstTimeOffer || pkg.popularOffer) ? "#B40206" : "#e5e8ec" }}>
          {(pkg.firstTimeOffer || pkg.popularOffer) && (
            <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-1" style={{ background: "rgba(230,0,18,0.07)" }}>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{pkg.popularOffer ? t.storePopularOffer : t.storeFirstTimeOffer}</span>
              {pkg.discount && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{t.storeOff(pkg.discount)}</span>}
            </div>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            {pkg.subscriptionName ? (
              <>
                <span className="text-[28px]">🎴</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-[#1d2129]">{pkg.subscriptionName}</p>
                  <p className="text-[11px] text-[#6b7280]">{t.storeCollectorsPassTagline}</p>
                </div>
              </>
            ) : (
              <>
                <StoreCoinIcon />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-[#1d2129]">{t.storeCoins(pkg.coins)}</p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "#fef3c7" }}>
                    <span className="text-[11px] font-semibold text-[#92400e]">+</span>
                    <GemIcon size={12} />
                    <span className="text-[11px] font-semibold text-[#92400e]">{t.storeFreePoints(pkg.freePoints)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {pkg.originalJpy && (
                <span className="text-[11px] text-[#8a9099] line-through">{pkg.originalJpy.toLocaleString()} JPY</span>
              )}
              <span className="text-[15px] font-extrabold text-[#1d2129]">{pkg.jpy.toLocaleString()} JPY</span>
            </div>
          </div>
        </div>

        {/* Express buttons — moved into Payment method section as radio options
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => setStep("success")} className="flex items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white" style={{ background: "#1d2129", height: 48 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
            {t.checkoutApplePay}
          </button>
          <button onClick={() => setStep("success")} className="flex items-center justify-center overflow-hidden rounded-xl bg-white border border-[#e2e5ea]" style={{ height: 48 }}>
            <img src="/g-pay.png" alt="Google Pay" className="h-9 w-auto" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => setStep("success")} className="flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#e2e5ea]" style={{ height: 48 }}>
            <svg width="64" height="22" viewBox="0 0 64 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="22" rx="4" fill="#FF0033" />
              <text x="7" y="15.5" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="white">PayPay</text>
            </svg>
          </button>
          <button onClick={() => setStep("success")} className="flex items-center justify-center gap-1.5 rounded-xl text-[15px] font-bold text-[#1d2129]" style={{ background: "#00d64f", height: 48 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1d2129" /><path d="M8 12l3 3 5-6" stroke="#00d64f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            link
          </button>
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-[12px] font-semibold text-[#8a9099]">{t.checkoutOr}</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>
        */}

        {/* Payment method */}
        <div className="mb-2 mt-5 flex items-center justify-between">
          <p className="text-[16px] font-bold text-[#1d2129]">{t.checkoutPaymentMethod}</p>
          {savedCards && savedCards.length > 0 && (
            <button
              onClick={() => setShowMyCards(true)}
              className="text-[13px] font-semibold underline underline-offset-2"
              style={{ color: "#2355c5" }}
            >
              My Cards
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-[#e2e5ea]">
          {/* Card option */}
          <label className="flex cursor-pointer flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: payMethod === "card" ? "#1d2129" : "#c9ced6" }}>
                {payMethod === "card" && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
              </span>
              <input type="radio" className="sr-only" checked={payMethod === "card"} onChange={() => setPayMethod("card")} />
              <svg width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#1d2129" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
              <span className="text-[15px] font-semibold text-[#1d2129]">{t.checkoutCard}</span>
            </div>

            {payMethod === "card" && savedCards && savedCards.length > 0 && (
              <div className="flex flex-col gap-2">
                {savedCards.map((card, i) => (
                  <label key={i} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3" style={{ borderColor: selectedCardIdx === i ? "#1d2129" : "#e2e5ea" }} onClick={() => setSelectedCardIdx(i)}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: selectedCardIdx === i ? "#1d2129" : "#c9ced6" }}>
                      {selectedCardIdx === i && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
                    </span>
                    <svg width="22" height="16" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="3" fill="#1d2129" /><rect x="2" y="8" width="32" height="4" fill="#8a9099" /><rect x="2" y="16" width="8" height="4" rx="1" fill="#8a9099" /></svg>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[#1d2129]">{card.brand} •••• {card.last4}</p>
                      <p className="text-[11px] text-[#8a9099]">Expires {card.expiry}</p>
                    </div>
                    {i === 0 && <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">Last Used</span>}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3" style={{ borderColor: selectedCardIdx === "new" ? "#1d2129" : "#e2e5ea" }} onClick={() => setSelectedCardIdx("new")}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: selectedCardIdx === "new" ? "#1d2129" : "#c9ced6" }}>
                    {selectedCardIdx === "new" && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
                  </span>
                  <span className="text-[13px] font-semibold text-[#1d2129]">Use a different card</span>
                </label>
              </div>
            )}

            {payMethod === "card" && (!savedCards || savedCards.length === 0 || selectedCardIdx === "new") && (
              <>
                <p className="text-[12px] font-medium text-[#5c626b]">{t.checkoutCardInfo}</p>
                <div className="overflow-hidden rounded-lg border border-[#e2e5ea]">
                  <div className="flex items-center justify-between border-b border-[#e2e5ea] px-3 py-2.5">
                    <input
                      value={cardNum}
                      onChange={(e) => setCardNum(e.target.value)}
                      placeholder={t.checkoutCardNumPh}
                      className={`flex-1 bg-transparent text-[13px] placeholder:text-[#b0b6bf] focus:outline-none ${cardNum && !cardNumValid ? "text-red-500" : "text-[#1d2129]"}`}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold italic" style={{ color: "#1a1f71" }}>VISA</span>
                      <div className="relative h-4 w-5"><div className="absolute left-0 h-4 w-4 rounded-full bg-[#eb001b] opacity-90" /><div className="absolute left-2 h-4 w-4 rounded-full bg-[#f79e1b] opacity-90" /></div>
                      <span className="text-[10px] font-black" style={{ color: "#006fcf" }}>AMEX</span>
                      <div className="flex h-4 w-5 items-center justify-center rounded bg-[#003087]"><span className="text-[8px] font-black text-white">JCB</span></div>
                    </div>
                  </div>
                  <div className="flex">
                    <input
                      value={expiry}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                        const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
                        setExpiry(formatted);
                      }}
                      placeholder={t.checkoutExpiryPh}
                      maxLength={5}
                      className={`flex-1 border-r border-[#e2e5ea] bg-transparent px-3 py-2.5 text-[13px] placeholder:text-[#b0b6bf] focus:outline-none ${expiry && !expiryValid ? "text-red-500" : "text-[#1d2129]"}`}
                    />
                    <div className="flex flex-1 items-center gap-1.5 px-3 py-2.5">
                      <input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder={t.checkoutCvcPh}
                        maxLength={4}
                        className="flex-1 bg-transparent text-[13px] text-[#1d2129] placeholder:text-[#b0b6bf] focus:outline-none"
                      />
                      <svg width="20" height="14" viewBox="0 0 32 22" fill="none"><rect width="32" height="22" rx="3" fill="#c9ced6" /><rect x="2" y="6" width="28" height="5" fill="#8a9099" /><rect x="20" y="14" width="8" height="4" rx="1" fill="#8a9099" /></svg>
                    </div>
                  </div>
                </div>
                {cardNum && !cardNumValid && (
                  <p className="mt-1 text-[11px] text-red-500">Card number must be 14–16 digits</p>
                )}
                {expiry && !expiryValid && (
                  <p className="mt-0.5 text-[11px] text-red-500">Enter a valid future date (MM/YY)</p>
                )}
                <div>
                  <p className={labelCls}>{t.checkoutCardNameLabel}</p>
                  <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder={t.checkoutCardNamePh} maxLength={30} className={inputCls} />
                </div>
                <div className="mt-1 rounded-xl border border-[#e2e5ea] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[14px] font-semibold text-[#1d2129]">{t.checkoutBillingAddress}</p>
                    {billingFilled && !billingEditMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBillingEditMode(true); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#5c626b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                  </div>
                  {billingFilled && !billingEditMode ? (
                    <div className="space-y-0.5">
                      <p className="text-[13px] text-[#1d2129]">{billingFirstName} {billingLastName}</p>
                      <p className="text-[13px] text-[#1d2129]">{billingAddress1}{billingAddress2 ? `, ${billingAddress2}` : ""}</p>
                      <p className="text-[13px] text-[#1d2129]">{billingCity}, {billingState} {billingZip}</p>
                      <p className="text-[13px] text-[#1d2129]">{country}</p>
                    </div>
                  ) : (
                    <>
                      {renderBillingForm()}
                      {billingFilled && (
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBillingEditMode(false); }}
                          className="mt-2 w-full rounded-lg border border-[#e2e5ea] py-2 text-[13px] font-semibold text-[#1d2129]"
                        >
                          Done
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </label>

          {/* Apple Pay option */}
          <label className="flex cursor-pointer items-center gap-3 border-t border-[#e2e5ea] p-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: payMethod === "applePay" ? "#1d2129" : "#c9ced6" }}>
              {payMethod === "applePay" && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
            </span>
            <input type="radio" className="sr-only" checked={payMethod === "applePay"} onChange={() => setPayMethod("applePay")} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1d2129"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
            <span className="text-[15px] font-semibold text-[#1d2129]">{t.checkoutApplePay}</span>
          </label>

          {/* Google Pay option */}
          <label className="flex cursor-pointer items-center gap-3 border-t border-[#e2e5ea] p-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: payMethod === "googlePay" ? "#1d2129" : "#c9ced6" }}>
              {payMethod === "googlePay" && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
            </span>
            <input type="radio" className="sr-only" checked={payMethod === "googlePay"} onChange={() => setPayMethod("googlePay")} />
            <img src="/g-pay.png" alt="Google Pay" className="h-5 w-auto" />
            <span className="text-[15px] font-semibold text-[#1d2129]">Google Pay</span>
          </label>

          {/* PayPay option */}
          <label className="flex cursor-pointer items-center gap-3 border-t border-[#e2e5ea] p-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: payMethod === "payPay" ? "#1d2129" : "#c9ced6" }}>
              {payMethod === "payPay" && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
            </span>
            <input type="radio" className="sr-only" checked={payMethod === "payPay"} onChange={() => setPayMethod("payPay")} />
            <svg width="56" height="20" viewBox="0 0 64 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="22" rx="4" fill="#FF0033" />
              <text x="7" y="15.5" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="white">PayPay</text>
            </svg>
          </label>

          {/* Link option */}
          <label className="flex cursor-pointer items-center gap-3 border-t border-[#e2e5ea] p-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: payMethod === "link" ? "#1d2129" : "#c9ced6" }}>
              {payMethod === "link" && <span className="h-2.5 w-2.5 rounded-full bg-[#1d2129]" />}
            </span>
            <input type="radio" className="sr-only" checked={payMethod === "link"} onChange={() => setPayMethod("link")} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1d2129" /><path d="M8 12l3 3 5-6" stroke="#00d64f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[15px] font-semibold text-[#1d2129]">link</span>
          </label>

        </div>

        {/* Pay button */}
        <button
          disabled={payDisabled}
          onClick={() => {
            if (payMethod === "card" && selectedCardIdx === "new" && cardNum && onSaveCard) {
              const last4 = cardNum.replace(/\s/g, "").slice(-4) || "0000";
              const brand = cardNum.startsWith("4") ? "Visa" : cardNum.startsWith("5") ? "Mastercard" : cardNum.startsWith("3") ? "Amex" : "Card";
              onSaveCard({ last4, expiry, brand, name: cardName, billingAddress: { firstName: billingFirstName, lastName: billingLastName, address1: billingAddress1, address2: billingAddress2, country, city: billingCity, state: billingState, zip: billingZip } });
            }
            setStep(payMethod === "card" ? "auth3ds" : "success");
          }}
          className="mt-4 w-full rounded-xl py-3.5 text-[16px] font-bold text-white disabled:cursor-not-allowed"
          style={{ background: payDisabled ? "#c9ced6" : "#c0392b" }}
        >
          {t.checkoutPayBtn} ¥{pkg.jpy.toLocaleString()}
        </button>

        <div className="mt-4 flex w-full items-center justify-center gap-x-4 text-center text-[11px] text-[#8a9099]">
          <button className="underline underline-offset-1">{t.checkoutTerms}</button>
          <button className="underline underline-offset-1">{t.checkoutPrivacy}</button>
        </div>
      </div>
    </div>
  );
}

/* ── StorePage ────────────────────────────────────────────────────────── */
function StoreCoinIcon({ size = 32 }: { size?: number }) {
  return <img src="/coin.png" alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

function CountdownTimer({ initialSeconds, className, style }: { initialSeconds: number; className?: string; style?: React.CSSProperties }) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <span className={className} style={style}>
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function StorePage({
  lang,
  coins,
  setCoins,
  onBack,
  onPaid,
  onDrawItem,
  educational = false,
  subscriptionPurchased = false,
  purchasedIds = [] as string[],
  onSubscriptionPurchased,
  onManageSubscription,
}: {
  lang: Lang;
  coins: number;
  setCoins: Dispatch<SetStateAction<number>>;
  onBack: () => void;
  onPaid?: (pkgId: string) => void;
  onDrawItem?: (item: OripaItem) => void;
  educational?: boolean;
  subscriptionPurchased?: boolean;
  purchasedIds?: string[];
  onSubscriptionPurchased?: () => void;
  onManageSubscription?: () => void;
}) {
  const t = STR[lang];
  const [selectedPkg, setSelectedPkg] = useState<PointPackage | null>(null);
  const [eduOpen, setEduOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"coins" | "deals">("coins");
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [savedCards, setSavedCards] = useState<{ last4: string; expiry: string; brand: string; name: string; billingAddress?: BillingAddress }[]>([]);

  function handleComplete(coinsEarned: number) {
    const pkgId = selectedPkg?.id ?? '';
    if (selectedPkg?.subscriptionName) {
      onSubscriptionPurchased?.();
    } else {
      setCoins((c) => c + coinsEarned);
    }
    setSelectedPkg(null);
    onPaid?.(pkgId);
  }

  function handleSubscriptionPurchase() {
    const pkg: PointPackage = { id: "sub_collectors_pass", coins: 0, freePoints: 0, jpy: 980, inrApprox: 980 * 0.613, subscriptionName: "Collector's Pass" };
    setSelectedPkg(pkg);
  }

  function handleBundlePurchase(bundle: LimitedBundle) {
    const pkg: PointPackage = { id: bundle.id, coins: bundle.coins, freePoints: bundle.freePoints, jpy: bundle.jpy, inrApprox: bundle.jpy * 0.613, originalJpy: bundle.originalJpy };
    setSelectedPkg(pkg);
  }

  function handleDealPurchase(deal: DealPackage) {
    const pkg: PointPackage = { id: deal.id, coins: deal.coins, freePoints: deal.freePoints, jpy: deal.jpy, inrApprox: deal.jpy * 0.613, originalJpy: deal.originalJpy };
    setSelectedPkg(pkg);
  }

  function handleMegaBundlePurchase(mb: MegaBundle) {
    const pkg: PointPackage = { id: mb.id, coins: mb.coins, freePoints: mb.freePoints, jpy: mb.jpy, inrApprox: mb.jpy * 0.613, originalJpy: mb.originalJpy };
    setSelectedPkg(pkg);
  }

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      {/* Standard app header */}
      <AppHeader coins={coins} t={t} onHome={onBack} />

      {/* Page title row */}
      <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center text-[#1d2129]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[15px] font-bold text-[#1d2129]">{t.storeTitle}</h1>
        </div>
      </div>

      {/* Coins / Deals tabs — hidden (Coins content still shown below)
      <div className="shrink-0 flex bg-white border-b border-black/10">
        <button
          onClick={() => setActiveTab("coins")}
          className="flex-1 py-3 text-[14px] font-bold transition-colors relative"
          style={{ color: activeTab === "coins" ? "#B40206" : "#6b7280" }}
        >
          Coins
          {activeTab === "coins" && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full" style={{ background: "#B40206" }} />}
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          className="flex-1 py-3 text-[14px] font-bold transition-colors relative flex items-center justify-center gap-1.5"
          style={{ color: activeTab === "deals" ? "#B40206" : "#6b7280" }}
        >
          Deals <span className="text-[16px]">🔥</span>
          {activeTab === "deals" && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full" style={{ background: "#B40206" }} />}
        </button>
      </div>
      */}

      <style>{`
        @keyframes storeEduPulse { 0%,100%{ box-shadow:0 0 0 0 rgba(230,0,18,.45), 0 2px 8px rgba(0,0,0,.1) } 50%{ box-shadow:0 0 0 7px rgba(230,0,18,0), 0 2px 8px rgba(0,0,0,.1) } }
        @keyframes storeEduPop { 0%{ opacity:0; transform:translateY(8px) scale(.9) } 100%{ opacity:1; transform:translateY(0) scale(1) } }
        @keyframes storeEduBounce { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(5px) } }
        @keyframes storeEduBannerIn { 0%{ opacity:0; transform:translateY(-10px) } 100%{ opacity:1; transform:translateY(0) } }
      `}</style>

      {/* ── COINS TAB ── */}
      {activeTab === "coins" && (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">

          {/* Loyalty / VIP Status bar */}
          <div className="mx-4 mt-4 overflow-hidden rounded-2xl">
            {/* Top — purple gradient, compact single row */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "linear-gradient(135deg,#2d1f5e,#3a2470)" }}>
              <div className="flex items-center gap-2">
                <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
                  <path d="M8 0h6l-1.2 5.5h-3.6L8 0z" fill="#a0aab4"/>
                  <path d="M8 0L5.5 5.5H9.2L10.4 0H8z" fill="#8a9299"/>
                  <path d="M14 0l2.5 5.5h-3.7L11.6 0H14z" fill="#8a9299"/>
                  <circle cx="11" cy="18" r="7.5" fill="#c8d0d8" stroke="#9aa4ae" strokeWidth="1.2"/>
                  <circle cx="11" cy="18" r="5.5" fill="#dde2e8"/>
                  <path d="M11 13.5l1.1 3.3h3.5l-2.8 2 1.1 3.3L11 20.4l-2.9 1.7 1.1-3.3-2.8-2h3.5z" fill="#9aa4ae"/>
                </svg>
                <div className="flex flex-col leading-none gap-0.5">
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.55)" }}>{t.loyaltyVipStatus}</span>
                  <span className="text-[15px] font-black text-white">{t.loyaltySilver}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end leading-none gap-0.5">
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.55)" }}>{t.loyaltyNextTier}</span>
                  <span className="text-[15px] font-black" style={{ color: "#f5c842" }}>{t.loyaltyGold}</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f5c842">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
            {/* Bottom — white, progress bar + toggle */}
            <div className="bg-white px-4 pt-2.5 pb-1">
              <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(0,0,0,0.1)" }}>
                <div className="h-full rounded-full" style={{ width: "57%", background: "#f5a623" }} />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-black/45">28,500 {t.loyaltyCoinsSpent}</span>
                <span className="text-[10px] font-semibold" style={{ color: "#f5a623" }}>{t.loyaltyToNext(21500, t.loyaltyGold)}</span>
              </div>
            </div>
            <div className="bg-white">
              <button
                onClick={() => setLoyaltyOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-1 pb-3 pt-1 text-[10px] font-semibold text-black/35"
              >
                <span>{loyaltyOpen ? t.loyaltyHidePerks : t.loyaltyShowPerks}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: loyaltyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {loyaltyOpen && (
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.05)" }}>
                    <p className="text-[8px] font-bold tracking-widest uppercase mb-1.5 text-black/40">{t.loyaltyYourPerks}</p>
                    <p className="text-[11px] font-bold text-black/80 leading-snug">{t.loyaltyPerk}</p>
                  </div>
                  <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.05)" }}>
                    <p className="text-[8px] font-bold tracking-widest uppercase mb-1.5 text-black/40">{t.loyaltyUnlockNext}</p>
                    <p className="text-[11px] font-bold leading-snug" style={{ color: "#f5a623" }}>{t.loyaltyUnlock}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* First Time / Welcome Offer — compact bar */}
          {purchasedIds.length === 0 && (
            <div className="mx-4 mt-3 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg,#c50008,#8b0000)" }}>
              <div className="flex items-center gap-3 px-3 py-1">
                <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-white/20 px-2.5 py-1.5 min-w-[44px]">
                  <span className="text-[15px] font-black leading-none text-white">90%</span>
                  <span className="text-[9px] font-bold text-white/80">OFF</span>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <span className="text-[13px] font-black text-white">{t.storeWelcomeOfferTitle}</span>
                  <p className="text-[9px] leading-none text-white/60 mt-0.5">· First purchase only</p>
                  <div className="flex items-center gap-1 mt-1 whitespace-nowrap">
                    <StoreCoinIcon size={13} />
                    <span className="text-[12px] font-black text-white">500</span>
                    <span className="text-[10px] text-white/50 line-through">¥1,000</span>
                    <GemIcon size={10} />
                    <span className="text-[10px] text-white/75">{t.storeWelcomeOfferBonus}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPkg(FIRST_TIME_OFFER)}
                  className="shrink-0 rounded-xl bg-white px-4 py-2 text-[15px] font-black"
                  style={{ color: "#B40206" }}
                >
                  ¥500
                </button>
              </div>
            </div>
          )}

          {/* Limited Bundles */}
          <div className="px-4 pt-4 pb-3">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-extrabold text-[#1d2129]">{t.storeLimitedBundles}</p>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#e60012" }}>{t.storeLimitedTag}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#6b7280]">
                <span>{t.storeEndsSoon}</span>
                <CountdownTimer initialSeconds={6407} className="font-bold tabular-nums text-[#e60012]" />
              </div>
            </div>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {LIMITED_BUNDLES.map((bundle, idx) => (
                <div
                  key={bundle.id}
                  onClick={() => handleBundlePurchase(bundle)}
                  role="button"
                  className="relative flex w-[150px] shrink-0 cursor-pointer flex-col rounded-xl border-2 border-[#e5e8ec] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.09)] active:scale-[0.98] overflow-hidden"
                >
                  {/* Image area with overlaid badges */}
                  <div className="relative h-[88px] w-full overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/carousel-${(idx % 3) + 1}.png`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-end justify-between p-1.5">
                      {bundle.hot && (
                        <span className="rounded px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: "#ff6b00" }}>{t.storeHot}</span>
                      )}
                      {!bundle.hot && <span />}
                      <span className="rounded px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: "#e60012" }}>{bundle.discount}% OFF</span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="flex flex-col px-2 py-2 gap-0.5">
                    <p className="text-[11px] font-bold text-[#1d2129]">{t.storeBundleNames[LIMITED_BUNDLES.indexOf(bundle)] ?? bundle.name}</p>
                    <div className="flex items-center gap-1">
                      <StoreCoinIcon size={13} />
                      <span className="text-[13px] font-extrabold text-[#1d2129]">{bundle.coins.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GemIcon size={11} />
                      <span className="text-[10px] font-semibold text-[#92400e]">+{bundle.freePoints.toLocaleString()}</span>
                    </div>
                    {/* Remaining progress */}
                    <div className="mt-1">
                      <div className="flex justify-between text-[9px] text-[#6b7280] mb-0.5">
                        <span>{t.storeRemaining(bundle.remaining)}</span>
                        <span>{bundle.total}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#e5e8ec] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${((bundle.total - bundle.remaining) / bundle.total) * 100}%`, background: "#e60012" }} />
                      </div>
                    </div>
                    {/* Prices */}
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[9px] text-[#8a9099] line-through">¥{bundle.originalJpy.toLocaleString()}</span>
                      <button
                        onClick={() => handleBundlePurchase(bundle)}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white"
                        style={{ background: "#e60012" }}
                      >
                        ¥{bundle.jpy.toLocaleString()}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buy Coins */}
          <div className="px-4 pb-4">
            <div className="mb-3">
              <p className="text-[14px] font-extrabold text-[#1d2129]">Buy Coins</p>
            </div>
            <div className="space-y-2.5">
              {POINT_PACKAGES.filter(p => !(p.firstTimeOffer || p.popularOffer) || !purchasedIds.includes(p.id)).map((pkg) => {
                const isBlue = !!pkg.firstTimeOffer;
                const isRed = !!pkg.popularOffer;
                const isColored = isBlue || isRed;
                const cardBg = isBlue ? "linear-gradient(135deg,#1d4ed8,#1e3a8a)" : isRed ? "linear-gradient(135deg,#c50008,#8b0000)" : undefined;
                const tagLabel = isBlue ? "MEGA BUNDLE" : isRed ? "BEST VALUE" : (pkg.popularOffer ? t.storePopularOffer : t.storeFirstTimeOffer);
                const tagBg = isBlue ? "rgba(255,255,255,0.25)" : "#B40206";
                const discountBg = isBlue ? "rgba(255,255,255,0.2)" : "#B40206";
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    role="button"
                    className="relative cursor-pointer rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.07)] active:scale-[0.99]"
                    style={{ borderColor: isColored ? "transparent" : (pkg.firstTimeOffer || pkg.popularOffer) ? "#B40206" : "#e5e8ec", background: cardBg ?? "#ffffff" }}
                  >
                    {(isColored || pkg.firstTimeOffer || pkg.popularOffer) && (
                      <div className="flex items-center gap-1.5 rounded-t-xl px-3 pt-1.5 pb-1" style={{ background: isColored ? "rgba(0,0,0,0.15)" : "rgba(230,0,18,0.07)" }}>
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: tagBg }}>{tagLabel}</span>
                        {pkg.discount && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: discountBg }}>{t.storeOff(pkg.discount)}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <StoreCoinIcon />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-extrabold" style={{ color: isColored ? "#ffffff" : "#1d2129" }}>{t.storeCoins(pkg.coins)}</p>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: isColored ? "rgba(255,255,255,0.2)" : "#fef3c7" }}>
                          <span className="text-[11px] font-semibold" style={{ color: isColored ? "#ffffff" : "#92400e" }}>+</span>
                          <GemIcon size={12} />
                          <span className="text-[11px] font-semibold" style={{ color: isColored ? "#ffffff" : "#92400e" }}>{t.storeFreePoints(pkg.freePoints)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        {pkg.originalJpy && (
                          <span className="text-[11px] line-through" style={{ color: isColored ? "rgba(255,255,255,0.55)" : "#8a9099" }}>¥{pkg.originalJpy.toLocaleString()}</span>
                        )}
                        <button
                          onClick={() => setSelectedPkg(pkg)}
                          className="rounded-lg px-4 py-2 text-[13px] font-bold text-white"
                          style={{ background: isBlue ? "rgba(255,255,255,0.25)" : isRed ? "#f97316" : "#B40206" }}
                        >
                          ¥{pkg.jpy.toLocaleString()}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subscriptions */}
          <div className="px-4 pb-6">
            <p className="mb-3 text-[14px] font-extrabold text-[#1d2129]">{t.storeSubscriptions}</p>
            {subscriptionPurchased ? (
              /* Active subscription card */
              <div className="overflow-hidden rounded-2xl border-2 border-[#92400e]" style={{ background: "linear-gradient(135deg,#78350f,#451a03)" }}>
                <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
                  <div>
                    <p className="text-[14px] font-black text-white">{t.storeCollectorsPass}</p>
                    <p className="text-[10px] text-white/60">{t.storeCollectorsPassTagline}</p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-black text-white" style={{ background: "#16a34a" }}>{t.storeSubscribedActive}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 py-1.5">
                  {t.storeCollectorsPassPerks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[11px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                      <span className="text-[10px] font-semibold leading-tight text-white/85">{perk}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-2 pt-0.5">
                  <button
                    onClick={onManageSubscription}
                    className="w-full rounded-xl border border-white/30 py-2 text-[12px] font-bold text-white"
                  >
                    {t.storeManageSubscription}
                  </button>
                </div>
              </div>
            ) : (
              /* Subscribe card */
              <div className="overflow-hidden rounded-2xl border border-[#e7b98a]" style={{ background: "linear-gradient(135deg,#78350f,#451a03)" }}>
                <div className="flex items-start justify-between px-3 pt-2 pb-0.5">
                  <div>
                    <p className="text-[14px] font-black text-white">{t.storeCollectorsPass}</p>
                    <p className="text-[10px] text-white/60">{t.storeCollectorsPassTagline}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-black leading-none" style={{ color: "#f59e0b" }}>¥980</p>
                    <p className="text-[9px] text-white/60">/month</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 py-1.5">
                  {t.storeCollectorsPassPerks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[11px]">{t.storeCollectorsPassPerkIcons[i]}</span>
                      <span className="text-[10px] font-semibold leading-tight text-white/85">{perk}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-2 pt-0.5">
                  <button
                    onClick={handleSubscriptionPurchase}
                    className="w-full rounded-xl py-2 text-[12px] font-black text-white"
                    style={{ background: "#92400e" }}
                  >
                    {t.storeSubscribeCta}
                  </button>
                  <p className="mt-1 text-center text-[9px] text-white/45">{t.storeSubscribeLegal}</p>
                </div>
              </div>
            )}
          </div>
          <div className="-mx-4 mt-3"><SiteFooter t={t} /></div>
        </div>
      )}

      {/* ── DEALS TAB (hidden — keep Coins only) ──
      {activeTab === "deals" && (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {DEAL_PACKAGES.map((deal) => {
            const soldPct = Math.round(((deal.total - deal.remaining) / deal.total) * 100);
            return (
              <div key={deal.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.09)] border border-[#e5e8ec]">
                <div className="flex items-center justify-between px-4 py-2" style={{ background: deal.color }}>
                  <span className="rounded px-2 py-0.5 text-[11px] font-black text-white bg-white/25">{deal.discount}% OFF</span>
                  <span className="text-[11px] font-bold text-white">{deal.label}</span>
                  <span className="rounded px-2 py-0.5 text-[9px] font-bold text-white bg-white/25">{t.storeLimitedTag}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-[72px] w-[72px] shrink-0 rounded-xl overflow-hidden bg-[#f3f4f6] flex items-center justify-center">
                    <StoreCoinIcon size={44} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StoreCoinIcon size={18} />
                      <span className="text-[18px] font-extrabold text-[#1d2129]">{deal.coins.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <GemIcon size={12} />
                      <span className="text-[12px] font-semibold" style={{ color: deal.color }}>+{deal.freePoints.toLocaleString()} {t.storeFree}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#8a9099] line-through">¥{deal.originalJpy.toLocaleString()}</span>
                      <span className="text-[14px] font-extrabold text-[#1d2129]">¥{deal.jpy.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDealPurchase(deal)}
                    className="shrink-0 rounded-xl px-5 py-2.5 text-[14px] font-black text-white"
                    style={{ background: deal.color }}
                  >
                    {t.storeBuy}
                  </button>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#6b7280]">{t.storeRemainingOf(deal.remaining, deal.total)}</span>
                    <div className="flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      <CountdownTimer initialSeconds={deal.timerSeconds} className="font-bold tabular-nums" style={{ color: deal.color } as React.CSSProperties} />
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#e5e8ec] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${soldPct}%`, background: deal.color }} />
                  </div>
                  <p className="mt-1 text-right text-[10px]" style={{ color: deal.color }}>{t.storeSoldPct(soldPct)}</p>
                </div>
              </div>
            );
          })}
          <div className="-mx-4 mt-3"><SiteFooter t={t} /></div>
        </div>
      )}
      */}

      {/* Educational spotlight coachmark (welcome flow) */}
      {educational && eduOpen && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center overflow-y-auto px-6 pb-8 pt-9" style={{ background: "rgba(8,6,18,0.82)", animation: "storeEduBannerIn .35s ease both" }}>
          <button onClick={() => setEduOpen(false)} aria-label="Close" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/welcome-mascot.png" alt="" className="h-24 w-24 object-contain" style={{ animation: "storeEduBounce 1.6s ease-in-out infinite", filter: "drop-shadow(0 0 18px rgba(255,180,80,.65))" }} />
          <h2 className="mt-2 text-center text-[22px] font-black italic tracking-wide text-white" style={{ animation: "storeEduPop .5s ease both", textShadow: "0 2px 12px rgba(255,120,60,.6)" }}>{t.storeEduTitle}</h2>
          <p className="mt-1.5 max-w-[280px] text-center text-[13px] font-semibold leading-relaxed text-white/85" style={{ animation: "storeEduPop .6s ease both" }}>{t.storeEduSub}</p>
          <div className="mt-6 flex flex-col items-center" style={{ animation: "storeEduBounce 1.6s ease-in-out infinite" }}>
            <span className="rounded-full bg-[#B40206] px-3 py-1 text-[11px] font-extrabold text-white shadow-[0_3px_10px_rgba(230,0,18,0.6)]">{t.storeEduPick}</span>
            <svg width="20" height="14" viewBox="0 0 20 14" className="mt-0.5"><path d="M10 13L1 3h18z" fill="#B40206" /></svg>
          </div>
          <button
            onClick={() => { setSelectedPkg(FIRST_TIME_OFFER); setEduOpen(false); }}
            className="relative mt-2 w-[230px] overflow-hidden rounded-2xl border-2 border-[#B40206] bg-white text-left"
            style={{ animation: "storeEduPulse 1.5s ease-in-out infinite" }}
          >
            <div className="flex items-center gap-1.5 px-3 pt-2" style={{ background: "rgba(230,0,18,0.07)" }}>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>{t.storeFirstTimeOffer}</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#B40206" }}>90% OFF</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-3">
              <StoreCoinIcon />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-extrabold leading-tight text-[#1d2129]">500 Coins</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "#fef3c7" }}>
                  <span className="text-[11px] font-semibold text-[#92400e]">+</span>
                  <GemIcon size={12} />
                  <span className="text-[11px] font-semibold text-[#92400e]">Free Points 50</span>
                </div>
              </div>
            </div>
            <div className="px-3 pb-3">
              <span className="block w-full rounded-lg py-2.5 text-center text-[14px] font-bold text-white" style={{ background: "#e60012" }}>¥500</span>
            </div>
          </button>
          <button onClick={() => setEduOpen(false)} className="mt-5 text-[13px] font-semibold text-white/70 underline underline-offset-2 active:text-white">{t.storeEduSkip}</button>
        </div>
      )}

      {/* Purchase flow overlay */}
      {selectedPkg && (
        <PurchaseFlow
          pkg={selectedPkg}
          lang={lang}
          onComplete={handleComplete}
          onClose={() => setSelectedPkg(null)}
          onDrawItem={onDrawItem}
          savedCards={savedCards}
          onSaveCard={(card) => setSavedCards(prev => [card, ...prev])}
          onDeleteCard={(idx) => setSavedCards(prev => prev.filter((_, i) => i !== idx))}
        />
      )}
    </div>
  );
}

/* ── Document Upload overlay components ─────────────────────────────── */
function DocUploadOverlay({ state, t, onOkay }: {
  state: "pending" | "success";
  t: { profileDocumentPending: string; profileDocumentPendingNote: string; profileDocumentSuccess: string; profileDocumentSuccessNote: string; profileDocumentOkay: string };
  onOkay: () => void;
}) {
  const isPending = state === "pending";
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="w-full max-w-xs rounded-2xl bg-white px-6 py-8 text-center shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: isPending ? "#fff8e7" : "#e8f9f4" }}>
          {isPending ? (
            /* Upload pending — cloud with arrow */
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
              <ellipse cx="23" cy="28" rx="14" ry="9" fill="#fde68a" />
              <path d="M11 27c0-5 3.5-9 8-10.5a10 10 0 0 1 19 3.5C40.5 20 43 22.5 43 26a6 6 0 0 1-6 6H11a6 6 0 0 1 0-5z" fill="#fbbf24" />
              <path d="M11 27c0-3.3 2.2-6.1 5.3-7.1A9 9 0 0 1 33.2 23C35 22.9 37 24.3 37 26.5A4.5 4.5 0 0 1 32.5 31H13.5A4.5 4.5 0 0 1 11 27z" fill="#f59e0b" />
              <path d="M23 36v-9m0 0l-3 3m3-3l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="34" cy="12" r="6" fill="#22c55e" />
              <path d="M31.5 12l2 2 3.5-3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            /* Upload success — cloud with checkmark */
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
              <ellipse cx="23" cy="28" rx="14" ry="9" fill="#bbf7d0" />
              <path d="M11 27c0-5 3.5-9 8-10.5a10 10 0 0 1 19 3.5C40.5 20 43 22.5 43 26a6 6 0 0 1-6 6H11a6 6 0 0 1 0-5z" fill="#4ade80" />
              <path d="M11 27c0-3.3 2.2-6.1 5.3-7.1A9 9 0 0 1 33.2 23C35 22.9 37 24.3 37 26.5A4.5 4.5 0 0 1 32.5 31H13.5A4.5 4.5 0 0 1 11 27z" fill="#22c55e" />
              <path d="M18 27l3.5 3.5L28 24" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="34" cy="12" r="6" fill="#22c55e" />
              <path d="M31.5 12l2 2 3.5-3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <h3 className="mb-2 text-[17px] font-extrabold" style={{ color: isPending ? "#f59e0b" : "#22c55e" }}>
          {isPending ? t.profileDocumentPending : t.profileDocumentSuccess}
        </h3>
        <p className="text-[12px] leading-relaxed text-[#5c626b]">
          {isPending ? t.profileDocumentPendingNote : t.profileDocumentSuccessNote}
        </p>
        {!isPending && (
          <button onClick={onOkay} className="mt-5 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#B40206" }}>
            {t.profileDocumentOkay}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Document Upload sub-page ────────────────────────────────────────── */
type DocHistoryEntry = { id: string; type: string; date: string; status: "Approved" | "Pending" | "Review" };

function DocumentUploadPage({ t, coins, onBack, onOpenStore, docHistory, onAddHistory }: {
  t: any; coins: number; onBack: () => void; onOpenStore?: () => void;
  docHistory: DocHistoryEntry[];
  onAddHistory: (entry: DocHistoryEntry) => void;
}) {
  const [docType, setDocType] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "pending" | "success">("idle");

  function handleSubmit() {
    setUploadState("pending");
    setTimeout(() => setUploadState("success"), 2000);
  }

  function handleOkay() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" }) +
      " @ " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const statuses: Array<"Approved" | "Pending" | "Review"> = ["Approved", "Pending", "Review"];
    onAddHistory({ id: String(Date.now()), type: docType, date: dateStr, status: statuses[docHistory.length % 3] });
    setDocType("");
    setDocFileName("");
    setUploadState("idle");
  }

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]" style={{ position: "relative" }}>
      {/* Pending / success overlay */}
      {uploadState !== "idle" && (
        <DocUploadOverlay state={uploadState} t={t} onOkay={handleOkay} />
      )}

      <AppHeader coins={coins} t={t} onOpenStore={onOpenStore} />

      {/* Page title */}
      <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center text-[#B40206]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[16px] font-bold text-[#1d2129]">{t.profileDocumentUpload}</h1>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Upload form card */}
        <div className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <p className="mb-4 text-[12px] leading-relaxed text-[#5c626b]">{t.profileDocumentNote}</p>

          {/* Select + Submit row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={docType}
                onChange={(e) => { setDocType(e.target.value); setDocFileName(""); }}
                className="w-full appearance-none rounded-xl border border-[#e5e8ec] bg-white py-2.5 pl-3 pr-8 text-[13px] text-[#1d2129] outline-none"
              >
                <option value="">{t.profileDocumentSelect}</option>
                {(t.profileDocumentTypes as string[]).map((dt: string) => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
            <button
              disabled={!docFileName}
              onClick={handleSubmit}
              className="shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white"
              style={{ background: docFileName ? "#B40206" : "#d1d5db", cursor: docFileName ? "pointer" : "not-allowed" }}
            >
              {t.profileDocumentSubmit}
            </button>
          </div>

          {/* File picker — shows after document type selected */}
          {docType && (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e5e8ec] py-5 text-[13px] font-semibold text-[#8a9099] hover:border-[#B40206] hover:text-[#B40206] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" /></svg>
              {docFileName
                ? <span className="text-[#1d2129] font-medium">{docFileName}</span>
                : <span>{t.profileDocumentUploadBtn}</span>
              }
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => { if (e.target.files?.[0]) setDocFileName(e.target.files[0].name); }} />
            </label>
          )}
        </div>

        {/* Upload History */}
        {docHistory.length > 0 && (
          <div className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileDocumentHistory}</p>
            <div className="space-y-2">
              {docHistory.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-[#e5e8ec] bg-white px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#f4f5f7" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" /><line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" /><line x1="8" y1="17" x2="12" y2="17" strokeLinecap="round" /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#1d2129]">{entry.type}</p>
                    <p className="text-[10px] text-[#8a9099]">{entry.date}</p>
                  </div>
                  {entry.status === "Approved" && (
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      <span className="text-[11px] font-semibold text-[#22c55e]">{t.profileDocumentApproved}</span>
                    </div>
                  )}
                  {entry.status === "Pending" && (
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#f59e0b" /><path d="M10 6v4l2.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span className="text-[11px] font-semibold text-[#f59e0b]">{t.profileDocumentPendingStatus}</span>
                    </div>
                  )}
                  {entry.status === "Review" && (
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#3b82f6" /><path d="M10 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" stroke="white" strokeWidth="1.5" fill="none" /><circle cx="10" cy="10" r="1" fill="white" /></svg>
                      <span className="text-[11px] font-semibold text-[#3b82f6]">{t.profileDocumentReview}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Veriff flow components ──────────────────────────────────────────── */
type VeriffStrings = {
  veriffIdTitle: string; veriffIdDesc: string; veriffAddrTitle: string; veriffAddrDesc: string;
  veriffLetsGo: string; veriffPrivacy: string; veriffFullyVerified: string; veriffCongrats: string;
  veriffUnderstood: string; veriffProceed: string; profileIdCheckDone: string; profileAddressCheckDone: string;
  profileStep2Pending: string; profileStep1: string; profileStep2: string;
};

function VeriffModalScreen({ type, t, onClose, onLetGo }: { type: "id" | "address"; t: VeriffStrings; onClose: () => void; onLetGo: () => void }) {
  const isId = type === "id";
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
        <svg width="72" height="22" viewBox="0 0 72 22">
          <text x="0" y="16" fontSize="15" fontWeight="800" fill="#00c4a7" fontFamily="system-ui,sans-serif">veriff</text>
          <circle cx="67" cy="11" r="8" fill="#00c4a7" />
          <path d="M63.5 11l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <div className="w-8" />
      </div>

      {/* Illustration */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6">
          {isId ? (
            <svg width="190" height="155" viewBox="0 0 190 155">
              <circle cx="95" cy="78" r="72" fill="#e4f8f4" />
              {/* Person head */}
              <circle cx="78" cy="52" r="17" fill="#f5c5a3" />
              {/* Person body */}
              <rect x="59" y="67" width="38" height="46" rx="8" fill="#4a90d9" />
              {/* Arm */}
              <rect x="91" y="63" width="11" height="32" rx="5" fill="#f5c5a3" />
              {/* Phone */}
              <rect x="99" y="54" width="26" height="44" rx="5" fill="#1d2129" />
              <rect x="102" y="58" width="20" height="33" rx="3" fill="#6ee7de" opacity="0.85" />
              {/* ID card on phone */}
              <rect x="104" y="64" width="16" height="10" rx="2" fill="white" opacity="0.9" />
              <circle cx="108" cy="69" r="3" fill="#d1d5db" />
              <line x1="113" y1="67" x2="119" y2="67" stroke="#d1d5db" strokeWidth="1" />
              <line x1="113" y1="70" x2="117" y2="70" stroke="#d1d5db" strokeWidth="1" />
              {/* Shield */}
              <path d="M144 28 L158 34 L158 51 Q158 61 144 66 Q130 61 130 51 L130 34 Z" fill="#00c4a7" />
              <path d="M138 49l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          ) : (
            <svg width="190" height="155" viewBox="0 0 190 155">
              <circle cx="95" cy="78" r="72" fill="#e4f8f4" />
              <circle cx="78" cy="52" r="17" fill="#f5c5a3" />
              <rect x="59" y="67" width="38" height="46" rx="8" fill="#5b8fd9" />
              <rect x="91" y="63" width="11" height="32" rx="5" fill="#f5c5a3" />
              {/* Document */}
              <rect x="100" y="50" width="32" height="42" rx="4" fill="white" stroke="#e5e8ec" strokeWidth="1.5" />
              <line x1="106" y1="60" x2="126" y2="60" stroke="#d1d5db" strokeWidth="1.5" />
              <line x1="106" y1="66" x2="126" y2="66" stroke="#d1d5db" strokeWidth="1.5" />
              <line x1="106" y1="72" x2="120" y2="72" stroke="#d1d5db" strokeWidth="1.5" />
              <line x1="106" y1="78" x2="124" y2="78" stroke="#d1d5db" strokeWidth="1.5" />
              {/* Shield */}
              <path d="M144 28 L158 34 L158 51 Q158 61 144 66 Q130 61 130 51 L130 34 Z" fill="#00c4a7" />
              <path d="M138 49l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </div>
        <h2 className="mb-2.5 text-[21px] font-bold text-[#1d2129] leading-snug">
          {isId ? t.veriffIdTitle : t.veriffAddrTitle}
        </h2>
        <p className="text-[13px] leading-relaxed text-[#5c626b]">
          {isId ? t.veriffIdDesc : t.veriffAddrDesc}
        </p>
      </div>

      {/* CTA */}
      <div className="shrink-0 px-5 pb-8 pt-4">
        <button onClick={onLetGo} className="w-full rounded-xl py-4 text-[15px] font-bold text-white" style={{ background: "#0d1b2a" }}>
          {t.veriffLetsGo}
        </button>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-[#8a9099]">
          {t.veriffPrivacy}
        </p>
      </div>
    </div>
  );
}

function VeriffSuccessOverlay({ type, idDone, addrDone, t, onDismiss }: {
  type: "id" | "address"; idDone: boolean; addrDone: boolean; t: VeriffStrings; onDismiss: () => void;
}) {
  const bothDone = idDone && addrDone;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-white">
        {/* Veriff logo bar */}
        <div className="flex justify-center pt-5 pb-2">
          <svg width="72" height="22" viewBox="0 0 72 22">
            <text x="0" y="16" fontSize="15" fontWeight="800" fill="#00c4a7" fontFamily="system-ui,sans-serif">veriff</text>
            <circle cx="67" cy="11" r="8" fill="#00c4a7" />
            <path d="M63.5 11l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="px-6 pb-6 text-center">
          {/* Checkmark */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#00c4a7" }}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M6 15l6 6 12-12" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p className="mb-1 text-[11px] text-[#8a9099]">{t.veriffFullyVerified}</p>
          <h2 className="text-[19px] font-extrabold text-[#1d2129] leading-tight">{t.veriffCongrats}</h2>
          <h2 className="mb-2 text-[19px] font-extrabold text-[#1d2129] leading-tight">Taro Yamada</h2>
          <p className="mb-4 text-[10px] text-[#8a9099]">Account ID: 839473754</p>

          {/* Step status */}
          <div className="rounded-xl px-4 py-3 text-left space-y-2 mb-5" style={{ background: "#f4f5f7" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileStep1}</p>
            <div className="flex items-start gap-2">
              <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#00c4a7" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              <p className="text-[12px] text-[#1d2129]">{t.profileIdCheckDone}</p>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a9099] pt-1">{t.profileStep2}</p>
            <div className="flex items-start gap-2">
              {addrDone ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#00c4a7" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  <p className="text-[12px] text-[#1d2129]">{t.profileAddressCheckDone}</p>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#f59e0b" /><path d="M10 6v4.5M10 13v.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  <p className="text-[12px] text-[#1d2129]">{t.profileStep2Pending}</p>
                </>
              )}
            </div>
          </div>

          <button onClick={onDismiss} className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white" style={{ background: "#B40206" }}>
            {bothDone ? t.veriffProceed : t.veriffUnderstood}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Jumio Payment Verification Modal ──────────────────────────────── */
type JumioStrings = {
  jumioStartTitle: string; jumioStartDesc: string; jumioStartBullets: string[];
  jumioNext: string; jumioUploadCardTitle: string; jumioUploadCardDesc: string;
  jumioCaptureImage: string; jumioUploadFile: string;
  jumioPageUploaded: string; jumioProcessingTitle: string; jumioFinishing: string;
};

type JumioStep = "start" | "upload" | "scan" | "processing";

function JumioLogo() {
  return (
    <svg width="72" height="22" viewBox="0 0 90 22">
      <text x="0" y="16" fontSize="14" fontWeight="800" fill="#1d2129" fontFamily="system-ui,sans-serif">jumio</text>
      <circle cx="82" cy="11" r="8" fill="#B40206" />
      <path d="M78.5 11l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function JumioPaymentModal({ t, onClose, onComplete }: {
  t: JumioStrings; onClose: () => void; onComplete: () => void;
}) {
  const [step, setStep] = useState<JumioStep>("start");
  const [frontUploaded, setFrontUploaded] = useState(false);

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => { onComplete(); }, 2200);
    return () => clearTimeout(timer);
  }, [step, onComplete]);

  if (step === "processing") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white">
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{ background: "#22c55e", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <h2 className="text-[18px] font-bold text-[#1d2129] mb-1">{t.jumioProcessingTitle}</h2>
        <p className="text-[13px] text-[#8a9099]">{t.jumioFinishing}</p>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
          <button onClick={() => setStep("upload")} className="flex h-8 w-8 items-center justify-center text-[#5c626b]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <JumioLogo />
          <div className="w-8" />
        </div>

        <div className="px-5 pt-2 pb-3 shrink-0 border-b border-[#e5e8ec]">
          <h2 className="text-[16px] font-bold text-[#1d2129]">{t.jumioUploadCardTitle}</h2>
          <p className="text-[11px] text-[#5c626b] mt-0.5 leading-relaxed">{t.jumioUploadCardDesc}</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 gap-4">
          {/* Front card slot */}
          <button
            onClick={() => setFrontUploaded(true)}
            className="w-full h-36 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-colors"
            style={{ borderColor: frontUploaded ? "#22c55e" : "#e5e8ec", background: frontUploaded ? "#f0fdf4" : "#f9fafb" }}
          >
            {frontUploaded ? (
              <>
                <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#22c55e" /><path d="M8 14l4 4 8-8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <span className="text-[12px] font-semibold text-[#22c55e]">Front uploaded</span>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                <span className="text-[12px] text-[#8a9099]">Front of card</span>
              </>
            )}
          </button>
          {/* Back card slot */}
          <div className="w-full h-36 rounded-xl border-2 border-dashed border-[#e5e8ec] bg-[#f9fafb] flex flex-col items-center justify-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="1.5"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
            <span className="text-[12px] text-[#8a9099]">Back of card</span>
          </div>

          {frontUploaded && (
            <p className="text-[12px] font-semibold text-[#22c55e]">{t.jumioPageUploaded}</p>
          )}
        </div>

        <div className="shrink-0 px-5 pb-8 pt-3">
          <button
            onClick={() => { if (frontUploaded) setStep("processing"); }}
            className="w-full rounded-xl py-4 text-[15px] font-bold text-white transition-opacity"
            style={{ background: "#22c55e", opacity: frontUploaded ? 1 : 0.45 }}
          >
            {t.jumioNext}
          </button>
          <p className="mt-2 text-center text-[10px] text-[#8a9099]">Powered by <span className="font-bold">Jumio</span></p>
        </div>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
          <button onClick={() => setStep("start")} className="flex h-8 w-8 items-center justify-center text-[#5c626b]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <JumioLogo />
          <div className="w-8" />
        </div>

        <div className="px-5 pt-2 pb-3 shrink-0 border-b border-[#e5e8ec]">
          <h2 className="text-[16px] font-bold text-[#1d2129]">{t.jumioUploadCardTitle}</h2>
          <p className="text-[11px] text-[#5c626b] mt-0.5 leading-relaxed">{t.jumioUploadCardDesc}</p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 gap-3">
          <button
            onClick={() => setStep("scan")}
            className="flex items-center gap-4 rounded-xl border border-[#e5e8ec] bg-white px-4 py-4 text-left shadow-sm active:bg-[#f9fafb]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f5f7]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="1.7"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </div>
            <span className="text-[14px] font-semibold text-[#1d2129]">{t.jumioCaptureImage}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" className="ml-auto"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button
            onClick={() => setStep("scan")}
            className="flex items-center gap-4 rounded-xl border border-[#e5e8ec] bg-white px-4 py-4 text-left shadow-sm active:bg-[#f9fafb]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f5f7]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d2129" strokeWidth="1.7"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
            </div>
            <span className="text-[14px] font-semibold text-[#1d2129]">{t.jumioUploadFile}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" className="ml-auto"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div className="shrink-0 px-5 pb-8 pt-3">
          <p className="text-center text-[10px] text-[#8a9099]">Powered by <span className="font-bold">Jumio</span></p>
        </div>
      </div>
    );
  }

  /* step === "start" */
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <div className="w-8" />
        <JumioLogo />
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c626b]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-3 overflow-y-auto">
        {/* Globe icon */}
        <div className="flex justify-center mb-5">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="#e8f4fd" stroke="#bee3f8" strokeWidth="1.5" />
            <ellipse cx="40" cy="40" rx="15" ry="36" fill="none" stroke="#90cdf4" strokeWidth="1.5" />
            <line x1="4" y1="40" x2="76" y2="40" stroke="#90cdf4" strokeWidth="1.5" />
            <path d="M9 24 Q40 32 71 24" fill="none" stroke="#90cdf4" strokeWidth="1.5" />
            <path d="M9 56 Q40 48 71 56" fill="none" stroke="#90cdf4" strokeWidth="1.5" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[#1d2129] mb-2">{t.jumioStartTitle}</h2>
        <p className="text-[13px] leading-relaxed text-[#5c626b] mb-5">{t.jumioStartDesc}</p>
        <ul className="space-y-3">
          {(t.jumioStartBullets as string[]).map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-[13px] text-[#1d2129]">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 px-5 pb-8 pt-4">
        <button
          onClick={() => setStep("upload")}
          className="w-full rounded-xl py-4 text-[15px] font-bold text-white"
          style={{ background: "#22c55e" }}
        >
          {t.jumioNext}
        </button>
        <p className="mt-2 text-center text-[10px] text-[#8a9099]">Powered by <span className="font-bold">Jumio</span></p>
      </div>
    </div>
  );
}

/* ── ProfilePage helpers (defined outside to prevent focus loss on re-render) ── */
type AccordionKey = "accountId" | "personalInfo" | "socialLinks" | "accountVerifications" | "idVerification" | "paymentMethod" | "documentUpload" | "changePassword" | "notifications";

function GreenCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative h-7 w-12 rounded-full transition-colors duration-200"
      style={{ background: on ? "#B40206" : "#d1d5db" }}
    >
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}

function Field({ label, value, onChange, onBlur, half = false, required = false, type = "text", placeholder, valid: validProp, error, onClear }: {
  label: string; value: string; onChange: (val: string) => void; onBlur?: () => void; half?: boolean; required?: boolean; type?: string; placeholder: string; valid?: boolean; error?: string; onClear?: () => void;
}) {
  const filled = validProp !== undefined ? validProp : value.trim().length > 0;
  const hasError = !!error;
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">
        {label}{required && <span className="ml-0.5 text-[#B40206]">*</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full rounded-lg border py-2.5 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none transition"
          style={{
            paddingLeft: "10px",
            paddingRight: filled || hasError ? "32px" : "10px",
            borderColor: hasError ? "#B40206" : filled ? "#d1d5db" : "#e5e8ec",
            background: hasError ? "rgba(230,0,18,0.04)" : "white",
          }}
        />
        {filled && !hasError && <span className="absolute right-2"><GreenCheck /></span>}
        {hasError && onClear && (
          <button onClick={onClear} className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#B40206" }}>
            <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
      {hasError && <p className="mt-1 text-[10px] text-[#B40206]">{error}</p>}
    </div>
  );
}

const PREFECTURES_JA = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
const PREFECTURES_EN = ["Hokkaido","Aomori","Iwate","Miyagi","Akita","Yamagata","Fukushima","Ibaraki","Tochigi","Gunma","Saitama","Chiba","Tokyo","Kanagawa","Niigata","Toyama","Ishikawa","Fukui","Yamanashi","Nagano","Gifu","Shizuoka","Aichi","Mie","Shiga","Kyoto","Osaka","Hyogo","Nara","Wakayama","Tottori","Shimane","Okayama","Hiroshima","Yamaguchi","Tokushima","Kagawa","Ehime","Kochi","Fukuoka","Saga","Nagasaki","Kumamoto","Oita","Miyazaki","Kagoshima","Okinawa"];

function PrefectureSelect({ value, onChange, label, lang }: { value: string; onChange: (val: string) => void; label: string; lang: Lang }) {
  const filled = value.trim().length > 0;
  const names = lang === "ja" ? PREFECTURES_JA : PREFECTURES_EN;
  const placeholder = lang === "ja" ? "都道府県" : "Prefecture";
  return (
    <div className="flex-1 min-w-0">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{label}<span className="ml-0.5 text-[#B40206]">*</span></label>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-2.5 pr-8 text-[13px] text-[#1d2129] outline-none"
        >
          <option value="">{placeholder}</option>
          {PREFECTURES_JA.map((ja, i) => <option key={ja} value={ja}>{names[i]}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 text-[#8a9099]">
          {filled ? <GreenCheck /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>}
        </span>
      </div>
    </div>
  );
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className="w-full">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••"
        className="w-full rounded-lg border border-[#e5e8ec] py-2.5 pl-3 text-[13px] text-[#1d2129] outline-none"
      />
    </div>
  );
}

/* ── PhoneVerifyModal ────────────────────────────────────────────────── */
function PhoneVerifyModal({ lang, phone, onClose, onVerified }: {
  lang: Lang; phone: string; onClose: () => void; onVerified: () => void;
}) {
  const t = STR[lang];
  const [view, setView] = useState<"otp" | "success">("otp");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const allFilled = digits.every(d => d.length === 1);
  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (view !== "success") return;
    const id = setTimeout(() => onVerified(), 3000);
    return () => clearTimeout(id);
  }, [view]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    setDigits(["", "", "", "", "", ""]);
    setTimer(30);
    inputRefs.current[0]?.focus();
    setToast(t.authOtpToast as string);
    setTimeout(() => setToast(""), 2500);
  }

  const mm = Math.floor(timer / 60).toString().padStart(2, "0");
  const ss = (timer % 60).toString().padStart(2, "0");

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full rounded-t-3xl bg-white shadow-2xl" style={{ maxHeight: "85vh", overflowY: "auto" }}>
        {/* Handle + close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-7" />
          <div className="h-1 w-10 rounded-full bg-[#e5e8ec]" />
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f6f8]">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1l-10 10" stroke="#8a9099" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        {view === "otp" ? (
          <div className="px-5 pb-8 pt-2">
            <h2 className="text-center text-[20px] font-extrabold text-[#1d2129]">{t.authOtpTitle as string}</h2>
            <p className="mt-2 text-center text-[13px] leading-relaxed text-[#5c626b]">
              {t.authOtpBodyPre as string}
              {(t.authOtpBodyPre as string) && <br />}
              <span className="font-semibold text-[#1d2129]">{phone}</span>
              {t.authOtpBodyPost as string}
            </p>
            <p className="mt-4 text-center text-[12px] font-semibold text-[#1d2129]">
              {t.authOtpExpiry as string} {mm}:{ss}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="h-12 w-10 rounded-xl border border-[#e5e8ec] bg-white text-center text-[20px] font-bold text-[#1d2129] outline-none focus:border-[#B40206]"
                />
              ))}
            </div>
            <button
              onClick={() => { if (allFilled) setView("success"); }}
              disabled={!allFilled}
              className="mt-5 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
              style={{ background: "#B40206", opacity: allFilled ? 1 : 0.45 }}
            >
              {t.authOtpAuthenticate as string}
            </button>
            <button
              onClick={handleResend}
              disabled={!canResend}
              className="mt-3 w-full rounded-xl border border-[#e5e8ec] bg-white py-3 text-[13px] font-semibold text-[#5c626b]"
              style={{ opacity: canResend ? 1 : 0.45 }}
            >
              {t.authOtpResend as string}
            </button>
            <button onClick={onClose} className="mt-3 w-full text-center text-[13px] font-bold text-[#B40206] underline">
              {t.authOtpChangePhone as string}
            </button>
          </div>
        ) : (
          /* Success view */
          <div className="flex flex-col items-center px-5 pb-10 pt-4">
            <style>{`
              @keyframes pvm-scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
              @keyframes pvm-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div className="relative mt-4">
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ animation: "pvm-scale-in 0.35s ease-out" }}>
                <rect x="22" y="6" width="56" height="88" rx="10" fill="#f0f4ff" stroke="#c7d2fe" strokeWidth="2" />
                <rect x="28" y="18" width="44" height="56" rx="4" fill="#dbeafe" />
                <rect x="40" y="10" width="20" height="4" rx="2" fill="#c7d2fe" />
                <circle cx="50" cy="94" r="3.5" fill="#c7d2fe" />
                <rect x="34" y="38" width="5" height="18" rx="2" fill="#3b82f6" opacity="0.5" />
                <rect x="43" y="31" width="5" height="25" rx="2" fill="#3b82f6" opacity="0.75" />
                <rect x="52" y="25" width="5" height="31" rx="2" fill="#3b82f6" />
                <rect x="61" y="34" width="5" height="22" rx="2" fill="#3b82f6" opacity="0.6" />
              </svg>
              <div className="absolute -bottom-2 -right-3" style={{ animation: "pvm-scale-in 0.4s ease-out 0.25s both" }}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="17" fill="#22c55e" />
                  <path d="M10 18l6 6 10-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>
            <h3 className="mt-7 text-center text-[22px] font-extrabold text-[#1d2129]" style={{ animation: "pvm-fade-up 0.4s ease-out 0.3s both" }}>
              {t.profilePhoneVerifySuccess as string}
            </h3>
          </div>
        )}

        {toast && (
          <div className="absolute inset-x-4 top-4 z-10 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ProfilePage ─────────────────────────────────────────────────────── */

function ProfilePage({ lang, coins, displayName, onDisplayNameChange, onBack, onOpenStore }: { lang: Lang; coins: number; displayName: string; onDisplayNameChange: (name: string) => void; onBack: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const [open, setOpen] = useState<AccordionKey | null>(null);
  const [accVerifOpen, setAccVerifOpen] = useState(false);

  // Form state
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  type ProfileForm = { lastName: string; firstName: string; lastNameKana: string; firstNameKana: string; email: string; dob: string; phone: string; postalCode: string; prefecture: string; city: string; building: string };
  const [form, setForm] = useState<ProfileForm>(() => {
    const empty = { lastName: "", firstName: "", lastNameKana: "", firstNameKana: "", email: "", dob: "", phone: "", postalCode: "", prefecture: "", city: "", building: "" };
    try {
      const saved = sessionStorage.getItem("profileForm");
      if (saved) return JSON.parse(saved) as ProfileForm;
      const authStr = sessionStorage.getItem("authData");
      if (authStr) {
        const auth = JSON.parse(authStr);
        return { ...empty, email: auth.email || "", dob: auth.dob || "", phone: auth.phone || "" };
      }
    } catch {}
    return empty;
  });
  const [infoSaved, setInfoSaved] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(() => {
    try {
      const authStr = sessionStorage.getItem("authData");
      if (authStr) { const auth = JSON.parse(authStr); return !!auth.phoneVerified; }
    } catch {}
    return false;
  });
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const phoneValid = form.phone.length === 10;
  const postalValid = /^\d{3}-\d{4}$/.test(form.postalCode);
  const emailError = emailTouched && form.email.length > 0 && !emailValid ? "Please enter a valid email address" : "";
  const phoneError = phoneTouched && form.phone.length > 0 && !phoneValid ? "Phone number must be 10 digits" : "";
  const canSave = !!(emailValid && form.dob && phoneValid);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState("");
  const [paymentCardNumber, setPaymentCardNumber] = useState("");
  const [showJumioModal, setShowJumioModal] = useState(false);
  const [verifiedCards, setVerifiedCards] = useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = useState({ old: "", newPw: "", repeat: "" });
  const [pwChanged, setPwChanged] = useState(false);
  const [prefs, setPrefs] = useState({ email: true, push: false, sms: false });
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [idDone, setIdDone] = useState(false);
  const [addrDone, setAddrDone] = useState(false);
  const [veriffModal, setVeriffModal] = useState<"none" | "id" | "address">("none");
  const [veriffSuccess, setVeriffSuccess] = useState<"none" | "id" | "address">("none");
  const [showDocUploadPage, setShowDocUploadPage] = useState(false);
  const [docHistory, setDocHistory] = useState<DocHistoryEntry[]>([]);

  function toggle(key: AccordionKey) {
    setOpen((prev) => (prev === key ? null : key));
  }

  function setField(field: keyof typeof form, val: string) {
    setForm((f) => {
      const updated = { ...f, [field]: val };
      try { sessionStorage.setItem("profileForm", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setInfoSaved(false);
  }

  const formatDob = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (lang === "ja") return `${y}年${Number(m)}月${Number(d)}日`;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  };

  function handleInfoSave() {
    if (!canSave) return;
    setInfoSaved(true);
  }

  const socialProviders = [
    { name: "LINE", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#06C755" /><text x="20" y="27" textAnchor="middle" fontSize="20" fill="white" fontWeight="bold">L</text></svg> },
    { name: "Google", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="white" stroke="#e5e8ec" strokeWidth="1.5" /><text x="20" y="27" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#4285F4">G</text></svg> },
    { name: "Facebook", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#1877F2" /><text x="20" y="28" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">f</text></svg> },
    { name: "Apple", icon: <svg width="22" height="22" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#1d2129" /><text x="20" y="27" textAnchor="middle" fontSize="18" fill="white"></text></svg> },
  ];

  type SectionDef = { key: AccordionKey; label: string; required?: boolean; badge?: { label: string; bg: string }; content: React.ReactNode };

  const sections: SectionDef[] = [
    {
      key: "accountId",
      label: t.profileAccountId,
      content: (
        <div className="px-4 pb-4">
          <p className="mb-3 text-[13px] font-semibold text-[#8a9099]">xxxxxx</p>
          <div className="flex justify-center mb-4">
            <CrownEmblem size={72} />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profileDisplayName}<span className="ml-0.5 text-[#B40206]">*</span></label>
            <div className="relative flex items-center">
              <input
                value={displayName}
                onChange={(e) => { onDisplayNameChange(e.target.value); setDisplayNameSaved(false); }}
                placeholder={t.profilePlaceholder}
                className="w-full rounded-lg border border-[#e5e8ec] py-2.5 pl-3 pr-9 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
              />
              {displayName.trim() && <span className="absolute right-2"><GreenCheck /></span>}
            </div>
          </div>
          <button
            onClick={() => setDisplayNameSaved(true)}
            className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white transition"
            style={{ background: displayNameSaved ? "#22c55e" : "#B40206" }}
          >
            {displayNameSaved ? t.profileSaved : t.profileSave}
          </button>
        </div>
      ),
    },
    {
      key: "personalInfo",
      label: t.profilePersonalInfo,
      content: (
        <div className="px-4 pb-4">
          <div>
            <Field label={t.profileEmail} value={form.email} onChange={(v) => setField("email", v)} onBlur={() => setEmailTouched(true)} required type="email" placeholder={t.profilePlaceholder} valid={form.email.length > 0 && emailValid} error={emailError} onClear={() => { setField("email", ""); setEmailTouched(false); }} />
          </div>
          <div className="mt-2">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profileDob}</label>
            <button
              type="button"
              onClick={() => setShowDobPicker(true)}
              className="relative w-full rounded-lg border py-2.5 text-left text-[13px] outline-none transition"
              style={{ paddingLeft: "36px", paddingRight: form.dob ? "32px" : "10px", borderColor: form.dob ? "#d1d5db" : "#e5e8ec", background: "white" }}
            >
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </span>
              <span className={form.dob ? "text-[#1d2129]" : "text-[#bbbec4]"}>{form.dob ? formatDob(form.dob) : t.profilePlaceholder}</span>
              {form.dob && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2"><GreenCheck /></span>
              )}
            </button>
          </div>
          <div className="mt-2">
            <Field label={t.profilePhone} value={form.phone} onChange={(v) => { setField("phone", v.replace(/\D/g, "").slice(0, 10)); }} onBlur={() => setPhoneTouched(true)} required type="tel" placeholder={t.profilePlaceholder} valid={phoneValid && phoneVerified} error={phoneError} />
            {!phoneVerified && (
              <div className="mt-1 flex justify-end">
                <button
                  onClick={() => { if (phoneValid) setShowPhoneVerifyModal(true); }}
                  disabled={!phoneValid}
                  className="text-[11px] font-bold underline"
                  style={{ color: phoneValid ? "#B40206" : "#bbbec4" }}
                >
                  {t.profileVerifyPhone as string}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleInfoSave}
            disabled={!canSave}
            className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white transition"
            style={{ background: infoSaved ? "#22c55e" : "#B40206", opacity: canSave || infoSaved ? 1 : 0.45 }}
          >
            {infoSaved ? t.profileSaved : t.profileSave}
          </button>
        </div>
      ),
    },
    {
      key: "socialLinks",
      label: t.profileSocialLinks,
      content: (
        <div className="px-4 pb-3 space-y-2">
          {socialProviders.map((p) => (
            <button key={p.name} className="flex w-full items-center gap-3 rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[14px] font-semibold text-[#1d2129] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {p.icon}
              {p.name}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "idVerification",
      label: t.profileIdVerification,
      badge: idDone && addrDone
        ? { label: t.profileVerifVerified, bg: "#22c55e" }
        : { label: t.profileVerifNeeded, bg: "#B40206" },
      content: (
        <div className="px-4 pb-4 space-y-3">
          {/* Step 1 */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileStep1}</p>
            {idDone ? (
              <div className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <p className="text-[13px] text-[#1d2129]">{t.profileIdCheckDone}</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-[12px] leading-relaxed text-[#5c626b]">{t.profileStep1Desc}</p>
                <button
                  onClick={() => setVeriffModal("id")}
                  className="w-full rounded-xl py-3 text-[14px] font-bold text-white"
                  style={{ background: "#B40206" }}
                >
                  {t.profileStep1Btn}
                </button>
              </>
            )}
          </div>

          <div className="border-t border-black/[0.06]" />

          {/* Step 2 */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a9099]">{t.profileStep2}</p>
            {addrDone ? (
              <div className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0 mt-0.5"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <p className="text-[13px] text-[#1d2129]">{t.profileAddressCheckDone}</p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[12px] leading-relaxed text-[#5c626b]">{t.profileStep2Desc}</p>
                <ul className="mb-3 space-y-1">
                  {(t.profileStep2Bullets as string[]).map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[12px] text-[#5c626b]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#5c626b]" />{b}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { if (idDone) setVeriffModal("address"); }}
                  className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity"
                  style={{ background: idDone ? "#B40206" : "#d1d5db", cursor: idDone ? "pointer" : "not-allowed" }}
                >
                  {t.profileStep2Btn}
                </button>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: t.profilePaymentMethod,
      content: (
        <div className="px-4 pb-4">
          {/* Payment method dropdown */}
          <div className="w-full">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profilePaymentMethodField}<span className="ml-0.5 text-[#B40206]">*</span></label>
            <div className="relative">
              <select
                value={paymentMethodType}
                onChange={(e) => { setPaymentMethodType(e.target.value); setPaymentCardNumber(""); }}
                className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-3 pr-10 text-[13px] text-[#1d2129] outline-none"
              >
                <option value="">{t.profilePlaceholder}</option>
                <option value="card">Card</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
          </div>
          {/* Card number dropdown — shown when card is selected */}
          {paymentMethodType === "card" && (
            <div className="mt-3 w-full">
              <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profileCardNumber}<span className="ml-0.5 text-[#B40206]">*</span></label>
              <div className="relative">
                <select
                  value={paymentCardNumber}
                  onChange={(e) => setPaymentCardNumber(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-3 pr-10 text-[13px] text-[#1d2129] outline-none"
                >
                  <option value="">{t.profileSelectCard}</option>
                  <option value="card1">**** **** **** 1111</option>
                  <option value="card2">**** **** **** 4242</option>
                  <option value="card3">**** **** **** 9876</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
              {paymentCardNumber && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#f4f5f7] px-3 py-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                  <span className="text-[12px] font-semibold text-[#1d2129]">
                    {paymentCardNumber === "card1" ? "****1111" : paymentCardNumber === "card2" ? "****4242" : "****9876"}
                  </span>
                  <span className="ml-auto">
                    <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  </span>
                </div>
              )}
            </div>
          )}
          <ul className="mt-3 space-y-1.5">
            {(t.profilePaymentBullets as string[]).map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-[#5c626b]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5c626b]" />
                {bullet}
              </li>
            ))}
          </ul>
          {paymentCardNumber && verifiedCards[paymentCardNumber] && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#22c55e]" />
              <span className="text-[12px] font-semibold text-[#22c55e]">{t.profileVerifiedCard}</span>
            </div>
          )}
          <button
            onClick={() => {
              const canSubmit = paymentMethodType && (paymentMethodType !== "card" || paymentCardNumber) && !verifiedCards[paymentCardNumber];
              if (canSubmit) setShowJumioModal(true);
            }}
            className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity"
            style={{ background: "#B40206", opacity: (paymentMethodType && (paymentMethodType !== "card" || paymentCardNumber) && !verifiedCards[paymentCardNumber]) ? 1 : 0.5, cursor: verifiedCards[paymentCardNumber] ? "not-allowed" : "pointer" }}
          >
            {t.profileSubmitProof}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8a9099]">{t.profileKycNote}</p>
        </div>
      ),
    },
    {
      key: "documentUpload",
      label: t.profileDocumentUpload,
      content: (
        <div className="px-4 pb-4">
          <p className="mb-3 text-[12px] leading-relaxed text-[#5c626b]">{t.profileDocumentNote}</p>
          <button
            onClick={() => setShowDocUploadPage(true)}
            className="w-full rounded-xl py-3 text-[14px] font-bold text-white"
            style={{ background: "#B40206" }}
          >
            {t.profileDocumentUploadBtn}
          </button>
        </div>
      ),
    },
    {
      key: "changePassword",
      label: t.profileChangePassword,
      content: (
        <div className="px-4 pb-4 space-y-3">
          <PwField label={t.profileOldPassword} value={passwords.old} onChange={(v) => { setPasswords((p) => ({ ...p, old: v })); setPwChanged(false); }} />
          <PwField label={t.profileNewPassword} value={passwords.newPw} onChange={(v) => { setPasswords((p) => ({ ...p, newPw: v })); setPwChanged(false); }} />
          <PwField label={t.profileRepeatPassword} value={passwords.repeat} onChange={(v) => { setPasswords((p) => ({ ...p, repeat: v })); setPwChanged(false); }} />
          <button
            onClick={() => { if (passwords.newPw && passwords.newPw === passwords.repeat) { setPwChanged(true); setPasswords({ old: "", newPw: "", repeat: "" }); } }}
            className="w-full rounded-xl py-3 text-[14px] font-bold text-white transition"
            style={{ background: pwChanged ? "#22c55e" : "#B40206" }}
          >
            {pwChanged ? t.profileSaved : t.profileChangePasswordBtn}
          </button>
        </div>
      ),
    },
    {
      key: "notifications",
      label: t.profileNotifications,
      content: (
        <div className="px-4 pb-4 space-y-3">
          {([["email", t.profileEmailPref], ["push", t.profilePushPref], ["sms", t.profileSmsPref]] as [keyof typeof prefs, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#1d2129]">{label}</span>
              <Toggle on={prefs[key]} onToggle={() => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setPrefsSaved(false); }} />
            </div>
          ))}
          <button
            onClick={() => setPrefsSaved(true)}
            className="mt-1 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-colors"
            style={{ background: prefsSaved ? "#22c55e" : "#B40206" }}
          >
            {prefsSaved ? t.profileSaved : t.profileSave}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col bg-[#eef0f3]" style={{ position: "relative" }}>
      {/* Veriff modal overlay */}
      {veriffModal !== "none" && (
        <VeriffModalScreen
          type={veriffModal}
          t={t}
          onClose={() => setVeriffModal("none")}
          onLetGo={() => {
            const type = veriffModal;
            setVeriffModal("none");
            if (type === "id") { setIdDone(true); setVeriffSuccess("id"); }
            else { setAddrDone(true); setVeriffSuccess("address"); }
          }}
        />
      )}
      {/* Phone verification modal */}
      {showPhoneVerifyModal && (
        <PhoneVerifyModal
          lang={lang}
          phone={form.phone}
          onClose={() => setShowPhoneVerifyModal(false)}
          onVerified={() => {
            setPhoneVerified(true);
            setShowPhoneVerifyModal(false);
            try {
              const authStr = sessionStorage.getItem("authData");
              const auth = authStr ? JSON.parse(authStr) : {};
              sessionStorage.setItem("authData", JSON.stringify({ ...auth, phone: form.phone, phoneVerified: true }));
            } catch {}
          }}
        />
      )}
      {/* Jumio payment verification modal */}
      {showJumioModal && (
        <div className="absolute inset-0 z-50">
          <JumioPaymentModal
            t={t}
            onClose={() => setShowJumioModal(false)}
            onComplete={() => { setShowJumioModal(false); setVerifiedCards((prev) => ({ ...prev, [paymentCardNumber]: true })); }}
          />
        </div>
      )}
      {/* Document upload sub-page */}
      {showDocUploadPage && (
        <div className="absolute inset-0 z-40">
          <DocumentUploadPage
            t={t}
            coins={coins}
            onBack={() => setShowDocUploadPage(false)}
            onOpenStore={onOpenStore}
            docHistory={docHistory}
            onAddHistory={(entry) => setDocHistory((h) => [entry, ...h])}
          />
        </div>
      )}
      {/* Veriff success overlay */}
      {veriffSuccess !== "none" && (
        <VeriffSuccessOverlay
          type={veriffSuccess}
          idDone={idDone}
          addrDone={addrDone}
          t={t}
          onDismiss={() => setVeriffSuccess("none")}
        />
      )}
      <AppHeader coins={coins} t={t} onOpenStore={onOpenStore} />

      {/* Page title row */}
      <div className="shrink-0 bg-white px-4 py-3 border-b border-black/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center text-[#B40206]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[16px] font-bold text-[#1d2129]">{t.profileTitle}</h1>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sections.filter((s) => !["idVerification", "paymentMethod", "documentUpload"].includes(s.key)).map((sec) => (
          <div key={sec.key} className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <button
              onClick={() => toggle(sec.key)}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
            >
              <span className="flex-1 text-[14px] font-semibold text-[#1d2129]">{sec.label}</span>
              {sec.badge && (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: sec.badge.bg }}>{sec.badge.label}</span>
              )}
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"
                className="shrink-0 transition-transform"
                style={{ transform: open === sec.key ? "rotate(180deg)" : "none" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open === sec.key && <div className="border-t border-black/[0.06] pt-3">{sec.content}</div>}
          </div>
        ))}
        {/* Account Verifications group */}
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <button
            onClick={() => setAccVerifOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
          >
            <span className="flex-1 text-[14px] font-semibold text-[#1d2129]">{t.profileAccountVerifications}</span>
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"
              className="shrink-0 transition-transform"
              style={{ transform: accVerifOpen ? "rotate(180deg)" : "none" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {accVerifOpen && (
            <div className="border-t border-black/[0.06] pt-2 pb-2 px-3 space-y-2">
              {sections.filter((s) => ["idVerification", "paymentMethod", "documentUpload"].includes(s.key)).map((sec) => (
                <div key={sec.key} className="overflow-hidden rounded-xl bg-[#f8f9fa] border border-[#e5e8ec]">
                  <button
                    onClick={() => toggle(sec.key)}
                    className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
                  >
                    <span className="flex-1 text-[13px] font-semibold text-[#1d2129]">{sec.label}</span>
                    {sec.badge && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: sec.badge.bg }}>{sec.badge.label}</span>
                    )}
                    <svg
                      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" strokeLinecap="round"
                      className="shrink-0 transition-transform"
                      style={{ transform: open === sec.key ? "rotate(180deg)" : "none" }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {open === sec.key && <div className="border-t border-black/[0.06] pt-3 bg-white">{sec.content}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowDobPicker(false)}
                        onConfirm={(iso) => { setField("dob", iso); setShowDobPicker(false); }} />
      )}
    </div>
  );
}

/* ── ItemsPage ───────────────────────────────────────────────────────── */
type ItemRarity = "UR" | "SR" | "N";
type ItemStatus = "notSelected" | "pending" | "shipped";

type WonItem = {
  id: string;
  rarity: ItemRarity;
  coins: number;
  name: string;
  desc: string;
  exchangeDate: string;
  status: ItemStatus;
};

const WON_ITEMS: WonItem[] = [
  { id: "wi1", rarity: "UR", coins: 50000, name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "notSelected" },
  { id: "wi2", rarity: "SR", coins: 5000,  name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "notSelected" },
  { id: "wi3", rarity: "N",  coins: 500,   name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "notSelected" },
  { id: "wi4", rarity: "UR", coins: 50000, name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "pending" },
  { id: "wi5", rarity: "SR", coins: 5000,  name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "pending" },
  { id: "wi6", rarity: "N",  coins: 500,   name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "pending" },
  { id: "wi7", rarity: "UR", coins: 50000, name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "shipped" },
  { id: "wi8", rarity: "SR", coins: 5000,  name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "shipped" },
  { id: "wi9", rarity: "N",  coins: 500,   name: "[1BOX] SHINY TREASURE", desc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.", exchangeDate: "2025/12/12", status: "shipped" },
];

function ItemCard({ item }: { item: WonItem }) {
  return (
    <div className="w-[104px] shrink-0 overflow-hidden rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={RARITY_IMG[item.rarity]} alt={`${item.rarity} card`} className="block h-auto w-full" />
    </div>
  );
}

type ItemsTab = "notSelected" | "pending" | "shipped";

function ItemsPage({ lang, coins, setCoins, shippingAddresses, onShippingAddressesChange, onBack, onHome, onOpenStore }: { lang: Lang; coins: number; setCoins?: Dispatch<SetStateAction<number>>; shippingAddresses: ShippingAddr[]; onShippingAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack?: () => void; onHome?: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const ITEMS_SHIP_MIN = 500;
  const [activeTab, setActiveTab] = useState<ItemsTab>("notSelected");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<WonItem[]>(WON_ITEMS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [shipOpen, setShipOpen] = useState(false);

  function pushToast(text: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);
  }

  const tabItems = items.filter((it) => it.status === activeTab);

  const totalSelected = tabItems
    .filter((it) => selected.has(it.id))
    .reduce((sum, it) => sum + it.coins, 0);
  const canShip = totalSelected >= ITEMS_SHIP_MIN;

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(tabItems.map((it) => it.id)));
  }

  function reset() {
    setSelected(new Set());
  }

  function doExchange() {
    if (selected.size === 0) return;
    const ids = new Set(selected);
    const n = ids.size;
    setCoins?.((c) => c + totalSelected);
    setItems((list) => list.filter((it) => !ids.has(it.id)));
    setSelected(new Set());
    pushToast(t.toastConverted(n, totalSelected));
  }

  function doShip() {
    if (selected.size === 0 || !canShip) return;
    const ids = new Set(selected);
    setItems((list) => list.map((it) => (ids.has(it.id) ? { ...it, status: "pending" } : it)));
    setSelected(new Set());
    setShipOpen(false);
    pushToast(t.toastShipReq);
  }

  const tabs: { key: ItemsTab; label: string }[] = [
    { key: "notSelected", label: t.itemsTabNotSelected },
    { key: "pending",     label: t.itemsTabPending },
    { key: "shipped",     label: t.itemsTabShipped },
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      <AppHeader coins={coins} t={t} onHome={onHome} onOpenStore={onOpenStore} />

      {/* Title row with back arrow */}
      <div className="shrink-0 flex items-center gap-2 border-b border-black/10 bg-white px-4 py-3">
        <button onClick={onBack ?? onHome} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-[#1d2129]">{t.mmItems}</h1>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-black/10 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
            className="flex flex-1 flex-col items-center pb-2.5 pt-3 text-[13px] font-semibold transition"
            style={{ color: activeTab === tab.key ? "#B40206" : "#8a9099" }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="mt-1.5 h-[2.5px] w-full rounded-full" style={{ background: "#B40206" }} />
            )}
          </button>
        ))}
      </div>

      {/* Sort row — only on Not Selected */}
      {activeTab === "notSelected" && (
        <div className="flex shrink-0 items-center justify-end border-b border-black/10 bg-white px-4 py-2">
          <button className="flex items-center gap-1 text-[12px] font-semibold text-[#1d2129]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" /></svg>
            {t.itemsSortLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
      )}

      {/* List */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] px-3 py-3">
        <div className="space-y-3">
          {tabItems.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => activeTab === "notSelected" && toggleItem(item.id)}
                className="flex gap-3 overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                style={{
                  border: isSelected ? "2px solid #f97316" : "2px solid transparent",
                  cursor: activeTab === "notSelected" ? "pointer" : "default",
                }}
              >
                {/* Card illustration */}
                <div className="shrink-0 p-2">
                  <ItemCard item={item} />
                </div>
                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col py-2.5 pr-3">
                  {/* Status badge */}
                  <div className="flex items-center gap-1">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#f97316]">
                        {t.itemsSelected}
                        <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#f97316" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8a9099]">
                        {t.itemsNotSelected}
                        <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="none" stroke="#8a9099" strokeWidth="1.5" /></svg>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] font-extrabold leading-tight text-[#1d2129]">{item.name}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#5c626b]">{item.desc}</p>
                  <p className="mt-1 text-[11px] text-[#8a9099]">{t.itemsExchangePeriod} {item.exchangeDate}</p>
                  {/* Coin value */}
                  <div className="mt-1.5 flex items-center gap-1">
                    <svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#f59e0b" /><text x="10" y="14" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">$</text></svg>
                    <span className="text-[15px] font-extrabold text-[#1d2129]">{item.coins.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="-mx-3 mt-3"><SiteFooter t={t} /></div>
      </div>

      {/* Bottom bar — only on Not Selected */}
      {activeTab === "notSelected" && (
        <div className="shrink-0 border-t border-black/10 bg-white px-4 pb-4 pt-3">
          {/* Total + Select All + Reset */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#f59e0b" /><text x="10" y="14" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">$</text></svg>
              <span className="text-[17px] font-extrabold text-[#1d2129]">{totalSelected.toLocaleString()}</span>
            </div>
            <div className="flex-1" />
            <button onClick={selectAll} className="text-[13px] font-semibold text-[#1d2129]">{t.itemsSelectAll}</button>
            <button onClick={reset} className="text-[13px] font-semibold text-[#1d2129]">{t.itemsReset}</button>
          </div>
          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={doExchange}
              disabled={selected.size === 0}
              className="flex-1 rounded-xl border border-black/20 py-3 text-[14px] font-bold text-[#1d2129] transition active:scale-[0.99] disabled:opacity-40"
            >
              {t.itemsExchangeForCoins}
            </button>
            <button
              onClick={() => canShip && setShipOpen(true)}
              disabled={!canShip}
              className="flex-1 rounded-xl py-3 text-[14px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
              style={{ background: "#f97316" }}
            >
              {t.itemsRequestDelivery}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#8a9099]">{t.itemsDeliveryNote}</p>
        </div>
      )}

      {/* Shipping flow */}
      {shipOpen && (
        <ShippingFlow
          prizes={[]}
          total={totalSelected}
          onClose={() => setShipOpen(false)}
          onConfirm={doShip}
          t={t}
          lang={lang}
          shippingAddresses={shippingAddresses}
          onShippingAddressesChange={onShippingAddressesChange}
        />
      )}

      {/* Toasts */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-full bg-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PurchaseHistoryPage ──────────────────────────────────────────────── */
function PurchaseHistoryPage({
  lang,
  coins,
  onBack,
  onOpenStore,
  empty = false,
}: {
  lang: Lang;
  coins: number;
  onBack: () => void;
  onOpenStore?: () => void;
  empty?: boolean;
}) {
  const t = STR[lang];
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onBack} onOpenStore={onOpenStore} />

      {/* Title row */}
      <div className="shrink-0 flex items-center justify-between border-b border-black/10 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label={t.backAria} className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[16px] font-bold text-[#1d2129]">{t.purchaseHistoryTitle}</h1>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1d2129] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          {t.purchaseHistoryFilter}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {/* Note */}
        <p className="px-4 py-2.5 text-[11.5px] text-[#8a9099]">{t.purchaseHistoryNote}</p>

        {empty && (
          <p className="px-4 py-20 text-center text-[14px] text-[#9aa0a8]">{t.purchaseEmpty}</p>
        )}

        {/* Purchase records */}
        {!empty && (
        <div className="space-y-2 px-3 pb-6">
          {PURCHASE_HISTORY.map((rec) => {
            const isCompleted = rec.status === "Completed";
            const statusLabel = isCompleted ? t.purchaseStatusCompleted : t.purchaseStatusCancelled;
            const statusColor = isCompleted ? "#16a34a" : "#B40206";
            return (
              <div key={rec.id} className="rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
                {/* Date + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#8a9099]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {rec.date}
                  </div>
                  <span className="shrink-0 text-[13px] font-bold" style={{ color: statusColor }}>{statusLabel}</span>
                </div>

                {/* Coins + price */}
                <div className="mt-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[18px] font-extrabold text-[#1d2129]">{rec.coins.toLocaleString()} COINS</p>
                    <p className="text-[12px] text-[#5c626b]">{t.purchaseFreePoints(rec.freePoints)}</p>
                  </div>
                  <p className="shrink-0 text-[16px] font-extrabold text-[#1d2129]">{rec.jpy.toLocaleString()} JPY</p>
                </div>

                {/* Payment details */}
                <div className="mt-2 space-y-0.5 border-t border-black/[0.06] pt-2">
                  <p className="text-[12px] text-[#8a9099]">{t.purchasePaymentMethod}: {rec.paymentMethod}</p>
                  <p className="text-[12px] text-[#8a9099]">{t.purchasePaymentId}: {rec.paymentId}</p>
                </div>
              </div>
            );
          })}
        </div>
        )}

        <SiteFooter t={t} />
      </div>
    </div>
  );
}

/* ── ShippingAddressPage ─────────────────────────────────────────────── */
type ShippingCountry = "japan" | "usa";

type ShippingAddr = {
  id: string;
  isDefault: boolean;
  country: ShippingCountry;
  lastName: string;
  firstName: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  streetNumber: string;
  apartment: string;
  cityStreetNumber: string;
  state: string;
  zipCode: string;
};

const EMPTY_SHIPPING_FORM: Omit<ShippingAddr, "id" | "isDefault"> = {
  country: "japan",
  lastName: "",
  firstName: "",
  phone: "",
  postalCode: "",
  prefecture: "",
  city: "",
  streetNumber: "",
  apartment: "",
  cityStreetNumber: "",
  state: "",
  zipCode: "",
};

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia"];

function USStateSelect({ value, onChange, label }: { value: string; onChange: (val: string) => void; label: string }) {
  const filled = value.trim().length > 0;
  return (
    <div className="w-full">
      <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{label}<span className="ml-0.5 text-[#B40206]">*</span></label>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-2.5 pr-8 text-[13px] text-[#1d2129] outline-none"
        >
          <option value="">Select State</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 text-[#8a9099]">
          {filled ? <GreenCheck /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>}
        </span>
      </div>
    </div>
  );
}

function formatShippingAddr(addr: ShippingAddr, lang: Lang): string[] {
  if (addr.country === "japan") {
    const lines: string[] = [`〒${addr.postalCode} ${addr.prefecture}${addr.city} ${addr.streetNumber}`];
    if (addr.apartment.trim()) lines.push(addr.apartment);
    return lines;
  } else {
    const lines: string[] = [addr.cityStreetNumber];
    if (addr.apartment.trim()) lines.push(addr.apartment);
    lines.push(`${addr.state} ${addr.zipCode}`);
    return lines;
  }
}

function ShippingAddressPage({ lang, coins, addresses, onAddressesChange, onBack, onOpenStore }: { lang: Lang; coins: number; addresses: ShippingAddr[]; onAddressesChange: Dispatch<SetStateAction<ShippingAddr[]>>; onBack: () => void; onOpenStore?: () => void }) {
  const t = STR[lang];
  const setAddresses = onAddressesChange;
  const [view, setView] = useState<"main" | "form">("main");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ShippingAddr, "id" | "isDefault">>(EMPTY_SHIPPING_FORM);
  const [postalTouched, setPostalTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [zipTouched, setZipTouched] = useState(false);
  const [streetNumTouched, setStreetNumTouched] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({ text: "", visible: false });
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<{ prefecture: string; city: string; streetNumber: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postalValid = /^\d{3}-\d{4}$/.test(form.postalCode);
  const phoneValid = form.phone.replace(/\D/g, "").length >= 10;
  const zipValid = /^\d{5}$/.test(form.zipCode);
  const streetNumValid = /^\d+$/.test(form.streetNumber.trim()) && form.streetNumber.trim().length > 0;

  const postalError = postalTouched && form.postalCode.length > 0 && !postalValid ? "NNN-NNNN" : "";
  const phoneError = phoneTouched && form.phone.length > 0 && !phoneValid ? (lang === "ja" ? "電話番号は10桁以上で入力してください" : "Phone number must be at least 10 digits") : "";
  const zipError = zipTouched && form.zipCode.length > 0 && !zipValid ? "5 digits required" : "";
  const streetNumError = streetNumTouched && form.streetNumber.length > 0 && !streetNumValid ? (lang === "ja" ? "数字のみ入力してください" : "Numbers only") : "";

  const canSubmit = form.lastName.trim().length > 0 && form.firstName.trim().length > 0 && phoneValid &&
    (form.country === "japan"
      ? postalValid && !!form.prefecture && form.city.trim().length > 0 && streetNumValid
      : form.cityStreetNumber.trim().length > 0 && !!form.state && zipValid);

  // POC postcode lookup: seed a few plausible Japanese addresses from the typed postcode.
  function genShipCandidates(postal: string): { prefecture: string; city: string; streetNumber: string }[] {
    const digits = postal.replace(/\D/g, "");
    const seed = digits.length ? parseInt(digits.slice(0, 4), 10) || 0 : 0;
    const prefIdx = [12, 26, 13, 22, 39, 27]; // Tokyo, Osaka, Kanagawa, Aichi, Fukuoka, Hyogo
    const cityPool = lang === "ja"
      ? ["中央区銀座", "渋谷区道玄坂", "新宿区西新宿", "港区六本木", "北区梅田"]
      : ["Chuo-ku, Ginza", "Shibuya-ku, Dogenzaka", "Nishi-Shinjuku", "Minato-ku, Roppongi", "Kita-ku, Umeda"];
    return Array.from({ length: 4 }, (_, i) => ({
      prefecture: PREFECTURES_JA[prefIdx[(seed + i) % prefIdx.length]],
      city: cityPool[(seed + i) % cityPool.length],
      streetNumber: String(1000 + ((seed * 7 + i * 137) % 8999)),
    }));
  }
  function chooseShipCandidate(c: { prefecture: string; city: string; streetNumber: string }) {
    setForm(f => ({ ...f, prefecture: c.prefecture, city: c.city, streetNumber: c.streetNumber }));
    setStreetNumTouched(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setCandidates([]);
    setSearching(false);
  }

  function pushToast(text: string) {
    setToast({ text, visible: true });
    setTimeout(() => setToast({ text: "", visible: false }), 4000);
  }

  function openAddForm() {
    setForm({ ...EMPTY_SHIPPING_FORM });
    setEditingId(null);
    setPostalTouched(false);
    setPhoneTouched(false);
    setZipTouched(false);
    setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
    setCandidates([]);
    setView("form");
  }

  function openEditForm(addr: ShippingAddr) {
    const { id, isDefault, ...rest } = addr;
    setForm({ ...rest });
    setEditingId(id);
    setPostalTouched(false);
    setPhoneTouched(false);
    setZipTouched(false);
    setStreetNumTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
    setCandidates([]);
    setView("form");
  }

  function handleRegister() {
    if (editingId) {
      setAddresses(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
    } else {
      const isFirst = addresses.length === 0;
      const newAddr: ShippingAddr = { id: Date.now().toString(36), isDefault: isFirst, ...form };
      setAddresses(prev => [...prev, newAddr]);
    }
    setView("main");
    pushToast(editingId ? t.toastShippingEdited : t.toastShippingAdded);
    setEditingId(null);
  }

  function handleSetDefault(id: string) {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  }

  function handleDelete(id: string) {
    setAddresses(prev => {
      const remaining = prev.filter(a => a.id !== id);
      const wasDefault = prev.find(a => a.id === id)?.isDefault;
      if (wasDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
    setShowDelete(null);
    pushToast(t.toastShippingDeleted);
  }

  function setPostalCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 7);
    const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    setForm(f => ({ ...f, postalCode: formatted }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (digits.length >= 3) {
      setSearching(true);
      setCandidates([]);
      searchTimer.current = setTimeout(() => {
        setCandidates(genShipCandidates(formatted));
        setSearching(false);
      }, 900);
    } else {
      setSearching(false);
      setCandidates([]);
    }
  }

  function onCountryChange(country: ShippingCountry) {
    setForm(f => ({ ...f, country, postalCode: "", prefecture: "", city: "", streetNumber: "", cityStreetNumber: "", state: "", zipCode: "", phone: "" }));
    setPostalTouched(false);
    setZipTouched(false);
    setStreetNumTouched(false);
    setPhoneTouched(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
    setCandidates([]);
  }

  const phonePrefix = form.country === "japan" ? "🇯🇵 +81" : "🇺🇸 +1";

  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onOpenStore={onOpenStore} />

      {/* Page title bar — toast overlays this */}
      <div className="relative shrink-0 border-b border-black/10 bg-white px-4 py-3">
        {toast.visible && (
          <div className="absolute inset-0 z-10 flex items-center gap-2.5 px-4 text-[13px] font-bold text-white" style={{ background: "#2d7a3a" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.25" /><path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="flex-1">{toast.text}</span>
            <button onClick={() => setToast({ text: "", visible: false })} className="ml-auto opacity-80">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={view === "form" ? () => setView("main") : onBack} aria-label={t.backAria} className="flex h-7 w-7 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 className="text-[15px] font-bold text-[#1d2129]">{view === "form" ? t.shippingFormTitle : t.shippingTitle}</h1>
        </div>
      </div>

      {/* ── FORM VIEW ── */}
      {view === "form" && (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-3 flex gap-2">
            <Field label={t.profileLastName} value={form.lastName} onChange={(v) => setForm(f => ({ ...f, lastName: v }))} half required placeholder={t.profilePlaceholder} />
            <Field label={t.profileFirstName} value={form.firstName} onChange={(v) => setForm(f => ({ ...f, firstName: v }))} half required placeholder={t.profilePlaceholder} />
          </div>

          {/* Country selector */}
          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.shippingCountry}<span className="ml-0.5 text-[#B40206]">*</span></label>
            <div className="relative flex items-center">
              <select
                value={form.country}
                onChange={(e) => onCountryChange(e.target.value as ShippingCountry)}
                className="w-full appearance-none rounded-lg border border-[#e5e8ec] bg-white py-2.5 pl-2.5 pr-8 text-[13px] text-[#1d2129] outline-none"
              >
                <option value="japan">{t.shippingJapan}</option>
                <option value="usa">{t.shippingUSA}</option>
              </select>
              <span className="pointer-events-none absolute right-2 text-[#8a9099]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
          </div>

          {/* Japan fields */}
          {form.country === "japan" && (
            <>
              <div className="mb-1 flex gap-2">
                <Field label={t.profilePostalCode} value={form.postalCode} onChange={setPostalCode} onBlur={() => setPostalTouched(true)} half required placeholder="NNN-NNNN" valid={postalValid && form.postalCode.length > 0} error={postalError} />
                <PrefectureSelect value={form.prefecture} onChange={(v) => setForm(f => ({ ...f, prefecture: v }))} label={t.profilePrefecture} lang={lang} />
              </div>
              {!searching && candidates.length === 0 && (
                <p className="mb-3 text-[10.5px] text-[#a2a8b0]">{t.postcodeHint}</p>
              )}
              {searching && (
                <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[#8a9099]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#B40206]" />
                  {t.searching}
                </div>
              )}
              {!searching && candidates.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a9099]">{t.selectAddress}</p>
                  <div className="space-y-2">
                    {candidates.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => chooseShipCandidate(c)}
                        className="animate-fade-slide flex w-full items-center justify-between gap-2 rounded-xl border border-black/15 bg-white p-3 text-left"
                        style={{ animationDelay: `${Math.min(i, 4) * 80}ms` }}
                      >
                        <span className="text-[12.5px] leading-relaxed text-[#1d2129]">
                          〒{form.postalCode} {c.prefecture}
                          <br /><span className="text-[#8a9099]">{c.city} {c.streetNumber}</span>
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="#c9ced6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-3">
                <Field label={t.profileCity} value={form.city} onChange={(v) => setForm(f => ({ ...f, city: v }))} required placeholder={lang === "ja" ? "市区町村・番地" : "City, Street"} />
              </div>
              <div className="mb-3">
                <Field label={t.shippingStreetNumber} value={form.streetNumber} onChange={(v) => setForm(f => ({ ...f, streetNumber: v.replace(/\D/g, "") }))} onBlur={() => setStreetNumTouched(true)} required type="text" placeholder={lang === "ja" ? "例: 1234" : "e.g. 1234"} valid={streetNumValid} error={streetNumError} />
              </div>
              <div className="mb-3">
                <Field label={t.shippingApartment} value={form.apartment} onChange={(v) => setForm(f => ({ ...f, apartment: v }))} placeholder={lang === "ja" ? "例: 〇〇マンション 101号室（任意）" : "e.g. Apt 101 (optional)"} />
              </div>
            </>
          )}

          {/* USA fields */}
          {form.country === "usa" && (
            <>
              <div className="mb-3">
                <Field label={t.shippingApartment} value={form.apartment} onChange={(v) => setForm(f => ({ ...f, apartment: v }))} placeholder="Apt, Suite, Room No. (optional)" />
              </div>
              <div className="mb-3">
                <Field label={t.shippingCityStreetNumber} value={form.cityStreetNumber} onChange={(v) => setForm(f => ({ ...f, cityStreetNumber: v }))} required placeholder="e.g. 123 Main St, Springfield" />
              </div>
              <div className="mb-3">
                <USStateSelect value={form.state} onChange={(v) => setForm(f => ({ ...f, state: v }))} label={t.shippingState} />
              </div>
              <div className="mb-3">
                <Field label={t.shippingZipCode} value={form.zipCode} onChange={(v) => setForm(f => ({ ...f, zipCode: v.replace(/\D/g, "").slice(0, 5) }))} onBlur={() => setZipTouched(true)} required placeholder="e.g. 90210" valid={zipValid && form.zipCode.length > 0} error={zipError} />
              </div>
            </>
          )}

          {/* Phone — always last before submit */}
          <div className="mb-6">
            <label className="mb-1 block text-[11px] font-semibold text-[#5c626b]">{t.profilePhone}<span className="ml-0.5 text-[#B40206]">*</span></label>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center self-stretch rounded-lg border border-[#e5e8ec] bg-[#f5f6f8] px-3 text-[13px] text-[#1d2129]">{phonePrefix}</div>
              <div className="flex-1">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="0000000000"
                  className="w-full rounded-lg border py-2.5 text-[13px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none transition"
                  style={{
                    paddingLeft: "10px",
                    paddingRight: phoneValid || (phoneTouched && phoneError) ? "32px" : "10px",
                    borderColor: phoneError ? "#B40206" : phoneValid ? "#d1d5db" : "#e5e8ec",
                    background: phoneError ? "rgba(230,0,18,0.04)" : "white",
                  }}
                />
                {phoneError && <p className="mt-1 text-[10px] text-[#B40206]">{phoneError}</p>}
              </div>
            </div>
          </div>

          <button disabled={!canSubmit} onClick={handleRegister} className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white" style={{ background: canSubmit ? "#B40206" : "#d1d5db", cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {t.shippingRegister}
          </button>
        </div>
      )}

      {/* ── MAIN VIEW ── */}
      {view === "main" && (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-4 text-[12.5px] leading-relaxed text-[#5c626b]">{t.shippingDesc}</p>

          {addresses.length === 0 && (
            <div className="mb-3 flex items-center justify-center rounded-xl border border-dashed border-[#c9ced6] bg-white px-4 py-5">
              <p className="text-center text-[12.5px] text-[#8a9099]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2" className="mr-1 inline-block align-middle"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>
                {t.shippingEmpty}
              </p>
            </div>
          )}

          {addresses.map((addr) => {
            const addrLines = formatShippingAddr(addr, lang);
            const nameLine = `${addr.lastName} ${addr.firstName}`;
            const countryFlag = addr.country === "japan" ? "🇯🇵" : "🇺🇸";
            const phoneDisplay = `${addr.country === "japan" ? "+81" : "+1"} ${addr.phone}`;
            return (
              <div key={addr.id} className="mb-3 overflow-hidden rounded-xl border-2 bg-white" style={{ borderColor: addr.isDefault ? "#22a34a" : "#e5e8ec" }}>
                <div className="flex items-center gap-2 border-b border-black/[0.07] px-3 py-2" style={{ background: addr.isDefault ? "rgba(34,163,74,0.06)" : "#f9fafb" }}>
                  <span className="text-[12px] font-bold text-[#1d2129]">{countryFlag} {t.shippingFormTitle}</span>
                  {addr.isDefault && (
                    <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: "#22a34a" }}>{t.shippingDefaultLabel}</span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)} className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: "#f0fdf4", color: "#22a34a", border: "1px solid #22a34a" }}>
                        {t.shippingSetDefault}
                      </button>
                    )}
                    <button onClick={() => openEditForm(addr)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#22a34a" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => setShowDelete(addr.id)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#B40206" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </button>
                  </div>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[13px] font-semibold text-[#1d2129]">{nameLine}</p>
                  <p className="mt-0.5 text-[12.5px] text-[#5c626b]">{phoneDisplay}</p>
                  {addrLines.map((line, i) => (
                    <p key={i} className="mt-0.5 text-[13px] text-[#1d2129]">{line}</p>
                  ))}
                </div>
              </div>
            );
          })}

          <button onClick={openAddForm} className="mt-1 w-full rounded-xl border-2 border-[#1d2129] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
            {t.shippingAddNew}
          </button>

          <div className="-mx-4 mt-4"><SiteFooter t={t} /></div>
        </div>
      )}


      {/* ── Delete Confirmation Modal ── */}
      {showDelete && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white px-5 py-5">
            <h2 className="text-center text-[15px] font-bold text-[#1d2129]">{t.shippingDeleteTitle}</h2>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowDelete(null)} className="flex-1 rounded-xl border border-[#e5e8ec] py-3 text-[14px] font-semibold text-[#5c626b]">
                {t.shippingCancel}
              </button>
              <button onClick={() => handleDelete(showDelete)} className="flex-1 rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#B40206" }}>
                {t.shippingDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
