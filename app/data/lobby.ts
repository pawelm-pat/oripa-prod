// Lobby content: categories, oripa packs, home sections and the flat search
// index. Card art paths can be swapped for client-supplied assets later.

import type { Category, HomeSection, OripaItem } from "../lib/types";

export const CATEGORIES: Category[] = ["pokemon", "onepiece", "baseball", "football"];

export const RECOMMENDED_ORIPA: OripaItem[] = [
  { id: "r1", gem: true, free: false, remaining: 700, total: 1000, endsIn: 30, image: "/oripa-banner-1.png", title: "Pokémon 151 Special Oripa", titleJa: "ポケモン151スペシャルオリパ" },
  { id: "r2", gem: false, free: true, remaining: 320, total: 1000, endsIn: 12, image: "/oripa-banner-2.png", title: "One Piece Premium Oripa", titleJa: "ワンピース プレミアムオリパ" },
  { id: "r3", gem: false, free: true, remaining: 880, total: 1000, endsIn: 58, image: "/oripa-banner-3.png", title: "Weiss Schwarz Lucky Draw", titleJa: "ヴァイスシュヴァルツ ラッキードロー" },
];

export const LIST_ORIPA: OripaItem[] = [
  { id: "l1", gem: true, free: false, remaining: 700, total: 1000, endsIn: 30, image: "/oripa-list-1.png", title: "Football Stars Oripa", titleJa: "サッカースター オリパ" },
  { id: "l2", gem: false, free: true, remaining: 150, total: 1000, endsIn: 8, image: "/oripa-list-2.png", title: "NBA Rookies Draw", titleJa: "NBAルーキー ドロー" },
  { id: "l3", gem: false, free: true, remaining: 540, total: 1000, endsIn: 44, image: "/oripa-list-3.png", title: "Soccer Premium Pack", titleJa: "サッカー プレミアムパック" },
];

// `cats: []` means the section only appears in the "All" feed.

export const HOME_SECTIONS: HomeSection[] = [
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

export const ALL_ORIPA: OripaItem[] = (() => {
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
