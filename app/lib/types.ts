// Shared domain types used across the Oripa PROD skeleton.

export type Lang = "en" | "ja";

export type Category = "pokemon" | "onepiece" | "baseball" | "football";

// ── Prize History domain ─────────────────────────────────────────────────
export type Rarity = "UR" | "SR" | "N";

// Sort options for the "Prizes won" list.
export type SortKey = "coinDesc" | "coinAsc" | "wonNew" | "wonOld" | "expSoon";

// Prize History tabs.
export type PrizeTab = "won" | "waiting" | "shipped";

// Delivery state of a won prize, surfaced in the Winning History audit view.
// Cards with no status yet (fresh draws) read as "notSelected".
export type PrizeStatus = "notSelected" | "pending" | "shipped" | "delivered" | "exchanged";

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
  status?: PrizeStatus;
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
  // Sold-out pack: same greyed, no-CTA treatment as `expired`, but the card
  // surfaces the "完売しました / Sold Out" label instead of "期限切れ / Expired".
  soldOut?: boolean;
  // Coins (and points) a single draw costs. Defaults to 1,000 when omitted;
  // set per pack so the feed isn't priced at a flat rate.
  price?: number;
  // Which draw CTAs this pack offers, on the lobby card and on its draw screen.
  // Defaults to the full row (Draw ×1 / Draw ×10 / Custom draw).
  cta?: DrawCta;
};

// Draw-screen demo scenario (dev harness): normal, permanently sold out,
// simulated connection error, or insufficient remaining stock.
export type DrawScenario = "off" | "expired" | "soldOut" | "connError" | "stock";

// Error-page demo scenario (dev harness): while one is armed, the next
// navigation lands on that error page instead of the screen asked for.
export type ErrorScenario = "off" | "notFound" | "maintenance";

// Which CTA row a pack offers, both on its lobby card and on its draw screen.
//   all         -> paid: Draw ×1 / Draw ×10 / Custom draw
//   one         -> paid: single full-width "1 Draw"
//   trial       -> paid: "Free 10 draws" (with Free Trial badge) + "1 Draw"
//   free        -> free: single outlined "Free draw"
//   freePending -> either: green "LINE account link required" prompt
export type DrawCta = "all" | "one" | "free" | "freePending" | "trial";

// What a tapped CTA asks the draw flow to open: a fixed-count confirmation
// (free when the CTA was a free draw), the custom-quantity popup, or the LINE
// account-link prompt. The token lets the flow react to repeat taps.
export type DrawRequest = {
  kind: "count" | "custom" | "line";
  count?: number;
  free?: boolean;
  token: number;
};

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
  // Same pack page shown to a signed-out visitor: it browses, but every draw
  // CTA asks for a login first.
  | "guestDraw"
  | "notifications"
  | "prizeHistory"
  | "myLoot"
  | "purchaseHistory"
  | "shippingAddress"
  | "quest"
  | "store"
  | "coinHistory"
  | "mypage"
  | "profile"
  // Invite friends: the referral link, its share routes and the reward tiers.
  | "refer"
  // FAQ & Support: the answer library plus the inquiry form modal.
  | "faq";
