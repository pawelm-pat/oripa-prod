// Shared domain types used across the Oripa PROD skeleton.

export type Lang = "en" | "ja";

export type Category = "pokemon" | "onepiece" | "baseball" | "football";

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
};

export type SectionIconKey = "star" | "new" | "popular" | "pokemon" | "limited" | "cards";

export type HomeSection = {
  id: string;
  titleKey: string;
  icon: SectionIconKey;
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

// Screens reachable in the skeleton, plus the display-only bottom-nav labels
// (prizeHistory / quest / store / mypage) that are not yet navigable.
export type Screen =
  | "landing"
  | "signup"
  | "login"
  | "oripa"
  | "notifications"
  | "prizeHistory"
  | "quest"
  | "store"
  | "mypage";
