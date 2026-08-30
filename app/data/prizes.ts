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
// Free-shipping allowance remaining this month (used by the My Loot ship bar).
export const FREE_SHIP_QUOTA = 3;

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
  // Guarantee at least one sub-threshold (< 1,500 coins) card in multi-draws
  // so the "shipping not possible" flow can be tested from the results screen.
  if (count > 1 && !out.some((c) => c.coinValue < SHIP_MIN_COINS)) {
    const n = RARITY_META.N;
    out[out.length - 1] = {
      ...out[out.length - 1],
      rarity: "N", name: n.name, nameJa: n.nameJa, desc: n.desc, descJa: n.descJa, coinValue: n.coin,
    };
  }
  return out;
}

export const INITIAL_WON: WonPrize[] = [
  // Pokémon
  { id: "w1", name: "Pokémon — Charizard UR", nameJa: "ポケモン — リザードン UR", desc: "Holographic 1st edition", descJa: "ホログラフィック 初版", rarity: "UR", coinValue: 50000, wonAt: NOW - 1 * DAY - 3 * 60 * 60 * 1000, category: "pokemon", status: "delivered" },
  { id: "w2", name: "Pokémon — Pikachu SR", nameJa: "ポケモン — ピカチュウ SR", desc: "Foil promo card", descJa: "フォイルプロモ", rarity: "SR", coinValue: 5000, wonAt: NOW - 2 * DAY, category: "pokemon", status: "exchanged" },
  { id: "w3", name: "Pokémon — Eevee", nameJa: "ポケモン — イーブイ", desc: "Standard pull", descJa: "通常排出", rarity: "N", coinValue: 500, wonAt: NOW - 6 * DAY - 4 * 60 * 60 * 1000, category: "pokemon", status: "notSelected" },
  // One Piece
  { id: "w4", name: "One Piece — Luffy Gear 5 UR", nameJa: "ワンピース — ルフィ ギア5 UR", desc: "Special parallel", descJa: "スペシャルパラレル", rarity: "UR", coinValue: 50000, wonAt: NOW - 2 * DAY - 5 * 60 * 60 * 1000, category: "onepiece", status: "shipped" },
  { id: "w5", name: "One Piece — Zoro SR", nameJa: "ワンピース — ゾロ SR", desc: "Foil edition", descJa: "フォイル版", rarity: "SR", coinValue: 5000, wonAt: NOW - 5 * DAY, category: "onepiece", status: "pending" },
  { id: "w6", name: "One Piece — Chopper", nameJa: "ワンピース — チョッパー", desc: "Standard card", descJa: "通常カード", rarity: "N", coinValue: 500, wonAt: NOW - 3 * DAY, category: "onepiece", status: "delivered" },
  // Baseball
  { id: "w7", name: "Baseball — Ohtani Signature SR", nameJa: "野球 — 大谷 サイン SR", desc: "Autograph relic", descJa: "直筆サイン", rarity: "SR", coinValue: 5000, wonAt: NOW - 4 * DAY, category: "baseball", status: "notSelected" },
  { id: "w8", name: "Baseball — Rookie Card", nameJa: "野球 — ルーキーカード", desc: "Standard rookie", descJa: "通常ルーキー", rarity: "N", coinValue: 500, wonAt: NOW - 7 * DAY, category: "baseball", status: "exchanged" },
  // Football
  { id: "w9", name: "Football — Messi Icon UR", nameJa: "サッカー — メッシ アイコン UR", desc: "Limited gold", descJa: "限定ゴールド", rarity: "UR", coinValue: 50000, wonAt: NOW - 3 * DAY - 2 * 60 * 60 * 1000, category: "football", status: "shipped" },
  { id: "w10", name: "Football — Team Sticker", nameJa: "サッカー — チームステッカー", desc: "Collectible sticker", descJa: "コレクタブルステッカー", rarity: "N", coinValue: 300, wonAt: NOW - 3 * DAY, category: "football", status: "notSelected" },
  // Additional top-tier (UR) pulls across franchises — surfaced in My Loot.
  { id: "w11", name: "Pokémon — Mewtwo UR", nameJa: "ポケモン — ミュウツー UR", desc: "Legendary holographic", descJa: "伝説のホログラフィック", rarity: "UR", coinValue: 60000, wonAt: NOW - 8 * DAY, category: "pokemon", status: "delivered" },
  { id: "w12", name: "One Piece — Shanks UR", nameJa: "ワンピース — シャンクス UR", desc: "Red-Hair parallel", descJa: "赤髪パラレル", rarity: "UR", coinValue: 55000, wonAt: NOW - 9 * DAY, category: "onepiece", status: "exchanged" },
  { id: "w13", name: "Baseball — Ohtani MVP UR", nameJa: "野球 — 大谷 MVP UR", desc: "MVP gold relic", descJa: "MVPゴールドレリック", rarity: "UR", coinValue: 70000, wonAt: NOW - 10 * DAY, category: "baseball", status: "notSelected" },
  { id: "w14", name: "Football — Ronaldo Icon UR", nameJa: "サッカー — ロナウド アイコン UR", desc: "Icon edition parallel", descJa: "アイコン版パラレル", rarity: "UR", coinValue: 65000, wonAt: NOW - 11 * DAY, category: "football", status: "shipped" },
  // Deeper history so both lists lazily load in batches as the user scrolls.
  { id: "w15", name: "Pokémon — Rayquaza UR", nameJa: "ポケモン — レックウザ UR", desc: "Sky-high holo", descJa: "スカイホログラフィック", rarity: "UR", coinValue: 62000, wonAt: NOW - 12 * DAY, category: "pokemon", status: "pending" },
  { id: "w16", name: "One Piece — Law UR", nameJa: "ワンピース — ロー UR", desc: "Surgeon parallel", descJa: "サージョンパラレル", rarity: "UR", coinValue: 52000, wonAt: NOW - 13 * DAY, category: "onepiece", status: "delivered" },
  { id: "w17", name: "Baseball — Trout Auto UR", nameJa: "野球 — トラウト直筆 UR", desc: "Autograph gold", descJa: "直筆ゴールド", rarity: "UR", coinValue: 58000, wonAt: NOW - 14 * DAY, category: "baseball", status: "notSelected" },
  { id: "w18", name: "Football — Mbappé UR", nameJa: "サッカー — ムバッペ UR", desc: "Future icon", descJa: "フューチャーアイコン", rarity: "UR", coinValue: 54000, wonAt: NOW - 15 * DAY, category: "football", status: "exchanged" },
  { id: "w19", name: "Pokémon — Lugia UR", nameJa: "ポケモン — ルギア UR", desc: "Guardian holo", descJa: "ガーディアンホログラフィック", rarity: "UR", coinValue: 60000, wonAt: NOW - 16 * DAY, category: "pokemon", status: "shipped" },
  { id: "w20", name: "One Piece — Ace UR", nameJa: "ワンピース — エース UR", desc: "Flame-Fist parallel", descJa: "火拳パラレル", rarity: "UR", coinValue: 56000, wonAt: NOW - 17 * DAY, category: "onepiece", status: "notSelected" },
  { id: "w21", name: "Baseball — Yamamoto UR", nameJa: "野球 — 山本 UR", desc: "Ace gold relic", descJa: "エースゴールドレリック", rarity: "UR", coinValue: 53000, wonAt: NOW - 18 * DAY, category: "baseball", status: "delivered" },
  { id: "w22", name: "Football — Neymar UR", nameJa: "サッカー — ネイマール UR", desc: "Samba icon", descJa: "サンバアイコン", rarity: "UR", coinValue: 51000, wonAt: NOW - 19 * DAY, category: "football", status: "exchanged" },
  { id: "w23", name: "Pokémon — Gengar UR", nameJa: "ポケモン — ゲンガー UR", desc: "Shadow holo", descJa: "シャドウホログラフィック", rarity: "UR", coinValue: 57000, wonAt: NOW - 20 * DAY, category: "pokemon", status: "notSelected" },
  { id: "w24", name: "Football — Club Badge", nameJa: "サッカー — クラブバッジ", desc: "Collectible badge", descJa: "コレクタブルバッジ", rarity: "N", coinValue: 300, wonAt: NOW - 21 * DAY, category: "football", status: "shipped" },
  // Low-value UR pulls (< 1,500 coins) so the "shipping not possible" flow
  // (selection under the free-shipping threshold) can be tested in My Loot.
  { id: "w25", name: "Pokémon — Pikachu Mini UR", nameJa: "ポケモン — ピカチュウ ミニ UR", desc: "Petit holo pull", descJa: "プチホログラフィック", rarity: "UR", coinValue: 800, wonAt: NOW - 22 * DAY, category: "pokemon", status: "pending" },
  { id: "w26", name: "One Piece — Nami Chibi UR", nameJa: "ワンピース — ナミ ちび UR", desc: "Chibi parallel", descJa: "ちびパラレル", rarity: "UR", coinValue: 1200, wonAt: NOW - 23 * DAY, category: "onepiece", status: "delivered" },
  { id: "w27", name: "Baseball — Mini Relic UR", nameJa: "野球 — ミニレリック UR", desc: "Mini relic card", descJa: "ミニレリックカード", rarity: "UR", coinValue: 500, wonAt: NOW - 24 * DAY, category: "baseball", status: "notSelected" },
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

// Demo default delivery address so the shipping flow opens on the
// "Choose shipping address" step (rather than forcing "Add address" first).
export const DEFAULT_SHIPPING_ADDRESSES: ShippingAddr[] = [
  {
    id: "addr-default",
    isDefault: true,
    country: "japan",
    lastName: "Tester",
    firstName: "Yamada",
    phone: "0000000000",
    postalCode: "150-8512",
    prefecture: "Tokyo",
    city: "Test Shijuku city",
    streetNumber: "123",
    apartment: "",
    cityStreetNumber: "",
    state: "",
    zipCode: "",
  },
];

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
