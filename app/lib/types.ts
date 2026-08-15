// Shared domain types used across the Oripa PROD skeleton.

export type Lang = "en" | "ja";

export type Category = "pokemon" | "onepiece" | "baseball" | "football";

// ── Prize History domain ─────────────────────────────────────────────────
export type Rarity = "UR" | "SR" | "N";

// Sort options for the "Prizes won" list.
export type SortKey = "coinDesc" | "coinAsc" | "wonNew" | "wonOld" | "expSoon";

// Prize History tabs.
export type PrizeTab = "won" | "waiting" | "shipped";

export type WonPrize = {
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

export type WaitingPrize = {
  id: string;
  name: string;
  nameJa: string;
  desc: string;
  descJa: string;
  rarity: Rarity;
  coinValue: number;
  requestedAt: number;
};

export type ShippedPrize = {
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

// ── Shipping address ─────────────────────────────────────────────────────
export type ShippingCountry = "japan" | "usa";

export type ShippingAddr = {
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

// A lobby card (an "oripa" pack). `image` is optional so cards fall back to a
// placeholder until real art is supplied.
export type OripaItem = {
  id: string;
  gem: boolean;
  free: boolean;
  remaining: number;
  total: number;
  endsIn: number;
  image?: string;
  title: string;
  titleJa?: string;
  // Permanently sold-out / expired pack: the draw screen opens greyed out with
  // no draw CTAs (used for a demo example that doesn't need the harness toggle).
  expired?: boolean;
};

// Draw-screen demo scenario (dev harness): normal, permanently sold out,
// simulated connection error, or insufficient remaining stock.
export type DrawScenario = "off" | "expired" | "connError" | "stock";

// How the draw screen was opened from the lobby card. This decides which CTA
// variants are on offer: a paid entry can show the multi-draw row, a single
// "1 Draw", the free trial pair, or the LINE prompt; a free entry can show
// "Free draw" or the LINE prompt.
export type DrawEntry = "paid" | "free";

// Which CTA row the draw screen renders (dev harness demo control).
//   all         -> paid: Draw ×1 / Draw ×10 / Custom draw
//   one         -> paid: single full-width "1 Draw"
//   trial       -> paid: "Free 10 draws" (with Free Trial badge) + "1 Draw"
//   free        -> free: single outlined "Free draw"
//   freePending -> either: green "LINE account link required" prompt
export type DrawCta = "all" | "one" | "free" | "freePending" | "trial";

export type SectionIconKey = "new" | "popular" | "pokemon" | "limited" | "other";

export type HomeSection = {
  id: string;
  titleKey: string;
  icon?: SectionIconKey;
  variant: "red" | "light";
  cats: string[];
  items: OripaItem[];
};

// Quick-access reward icons rendered on the logged-in hero.
export type RewardKey = "rwDaily" | "rwQuest" | "rwInvite" | "rwBox" | "rwFirst";

// Notification list item (You / Notice tabs).
export type NotifItem = {
  id: string;
  at: string;
  atJa: string;
  title: string;
  titleJa: string;
  body: string;
  bodyJa: string;
  tracking?: string;
  unread?: boolean;
};

// Screens reachable in the skeleton. `mypage` (My Account), `prizeHistory`
// (Prize History) and `shippingAddress` are navigable; `quest` / `store`
// remain display-only bottom-nav labels that are not yet wired.
export type Screen =
  | "landing"
  | "signup"
  | "login"
  | "oripa"
  | "drawDetail"
  | "notifications"
  | "prizeHistory"
  | "myLoot"
  | "purchaseHistory"
  | "shippingAddress"
  | "quest"
  | "store"
  | "coinHistory"
  | "mypage"
  | "profile";
