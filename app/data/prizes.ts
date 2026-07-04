// Prize History sample data, rarity metadata and shipping-form constants.
// Pure data / helpers only — no React. Consumed by the Prize History and
// Shipping Address screens in `app/components/oripa.tsx`.

import type {
  Category,
  Rarity,
  ShippingAddr,
  ShippedPrize,
  SortKey,
  WaitingPrize,
  WonPrize,
} from "../lib/types";

// Fixed reference "now" so SSR and client render identically.
export const NOW = Date.UTC(2025, 11, 12, 9, 30); // 2025-12-12 09:30 UTC
export const DAY = 24 * 60 * 60 * 1000;
export const SHIP_WINDOW_DAYS = 7;
export const SHIP_MIN_COINS = 1500;

export const CATEGORIES: Category[] = ["pokemon", "onepiece", "baseball", "football"];

export const SORT_KEYS: SortKey[] = ["coinDesc", "coinAsc", "wonNew", "wonOld", "expSoon"];

export const RARITY_META: Record<Rarity, { coin: number; name: string; nameJa: string; desc: string; descJa: string }> = {
  UR: { coin: 50000, name: "[1BOX] Shiny Treasure", nameJa: "【1BOX】シャイニートレジャー", desc: "Holographic UR card", descJa: "ホログラフィック URカード" },
  SR: { coin: 5000, name: "[1BOX] Shiny Treasure", nameJa: "【1BOX】シャイニートレジャー", desc: "Special gold edition", descJa: "スペシャルゴールド版" },
  N: { coin: 500, name: "[1BOX] Shiny Treasure", nameJa: "【1BOX】シャイニートレジャー", desc: "Standard pull", descJa: "通常排出" },
};

export const RARITY_IMG: Record<Rarity, string> = {
  UR: "/card-ur.png",
  SR: "/card-sr.png",
  N: "/card-n.png",
};

// Weighted rarity roll — UR (1st prize) has the lowest chance, N (3rd) the highest.
export function rollRarity(): Rarity {
  const r = Math.random();
  if (r < 0.03) return "UR";
  if (r < 0.25) return "SR";
  return "N";
}

export function generateDraw(count: number): WonPrize[] {
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

export const INITIAL_WON: WonPrize[] = [
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

export const INITIAL_WAITING: WaitingPrize[] = [
  { id: "p1", name: "Premium Figure — Deluxe", nameJa: "プレミアムフィギュア デラックス", desc: "1/7 scale figure", descJa: "1/7スケールフィギュア", rarity: "UR", coinValue: 18000, requestedAt: NOW - 2 * DAY },
  { id: "p2", name: "Signed Poster Set", nameJa: "サイン入りポスターセット", desc: "Numbered edition", descJa: "ナンバリング版", rarity: "SR", coinValue: 3000, requestedAt: NOW - 4 * DAY },
];

export const INITIAL_SHIPPED: ShippedPrize[] = [
  { id: "s1", name: "Collector Card Case", nameJa: "コレクターカードケース", desc: "Hard shell case", descJa: "ハードシェルケース", rarity: "SR", coinValue: 2500, requestedAt: NOW - 20 * DAY, tracking: "JP1234567890" },
  { id: "s2", name: "Anniversary Tote Bag", nameJa: "記念トートバッグ", desc: "Canvas, limited run", descJa: "キャンバス地・限定生産", rarity: "N", coinValue: 1500, requestedAt: NOW - 26 * DAY, tracking: "JP9876543210" },
];

// ── Shipping form constants ──────────────────────────────────────────────
export const EMPTY_SHIPPING_FORM: Omit<ShippingAddr, "id" | "isDefault"> = {
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

export const PREFECTURES_JA = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
export const PREFECTURES_EN = ["Hokkaido","Aomori","Iwate","Miyagi","Akita","Yamagata","Fukushima","Ibaraki","Tochigi","Gunma","Saitama","Chiba","Tokyo","Kanagawa","Niigata","Toyama","Ishikawa","Fukui","Yamanashi","Nagano","Gifu","Shizuoka","Aichi","Mie","Shiga","Kyoto","Osaka","Hyogo","Nara","Wakayama","Tottori","Shimane","Okayama","Hiroshima","Yamaguchi","Tokushima","Kagawa","Ehime","Kochi","Fukuoka","Saga","Nagasaki","Kumamoto","Oita","Miyazaki","Kagoshima","Okinawa"];
export const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia"];

export function formatShippingAddr(addr: ShippingAddr): string[] {
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
