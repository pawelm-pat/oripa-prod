import type { Screen } from "../lib/types";

// Per-screen product requirements, sliced from REQUIREMENTS.md so the in-app
// "Product requirements" panel can show exactly what is on the current screen.
// Content is organised into titled sections (groups) such as Header, Banner,
// Top navigation, Oripa Draws, Bottom navigation and Footer.
//
// - items      : what the section does / what the user can do. An item may be a
//                plain string, or an object with a `sub` list for finer detail
//                (e.g. what happens when a specific link is clicked).
// - validation : input rules / constraints enforced within the section.
// - tbc        : controls present but not wired, or behaviour still mocked.
export type ReqItem = string | { text: string; sub?: string[] };

export type ReqGroup = {
  title: string;
  items: ReqItem[];
  validation?: string[];
  tbc?: string[];
};

export type ScreenReq = {
  label: string;
  summary: string;
  groups: ReqGroup[];
};

// ── Shared sections ──────────────────────────────────────────────────────

// How every legal document opens (Terms, Privacy, SCTA, Anti-Social policy).
const LEGAL_OVERLAY_GROUP: ReqGroup = {
  title: "Legal overlay (how it behaves)",
  items: [
    "Opens as a bottom-sheet overlay above the current screen, over a dimmed backdrop.",
    "Header shows the document title on the left and an X (close) button on the top-right.",
    "The body scrolls vertically and shows a scroll indicator/slider on the right so the reader can see how far through the document they are.",
    "Section headings are styled; paragraphs keep their line breaks; all text renders in the selected language (EN/JA) using the app typeface.",
    "Closes by tapping the X button or by tapping the dimmed backdrop.",
  ],
};

// Full footer breakdown (used on the home screens).
const FOOTER_GROUP: ReqGroup = {
  title: "Footer",
  items: [
    "Sits at the bottom of the page; all footer text is white.",
    "Brand block: product logo, copyright line and a short company blurb.",
    { text: "About Oripalot", sub: ["Link — currently does nothing (TBC)."] },
    { text: "Customer support", sub: ["Link — currently does nothing (TBC)."] },
    { text: "T&Cs", sub: ["Opens the Terms of Use in the legal overlay (see 'Legal overlay')."] },
    { text: "Privacy policy", sub: ["Opens the Privacy Policy in the legal overlay."] },
    { text: "Legal notice (SCTA)", sub: ["Opens the Specified Commercial Transactions Act notation in the legal overlay."] },
    { text: "Basic Policy Against Anti-Social Forces", sub: ["Opens that policy in the legal overlay."] },
    {
      text: "Category chips: New, Hot, Pokemon, Limited, Others, All",
      sub: [
        "Same labels and behaviour as the lobby's category bar: tapping one opens that category's feed.",
        "Tapped from another screen, it returns to the lobby (the logged-out landing feed while signed out) with the category open.",
        "The feed scrolls so the category bar sits at the top — the home hero banner above it is not shown.",
        "Like the category bar, it also drops any active search or filters.",
      ],
    },
    { text: "Follow / social icons: LINE, X, Instagram, Facebook", sub: ["Display only — do nothing (TBC)."] },
    {
      text: "Support & payment info",
      sub: [
        "24/7 online support line.",
        "Japan payment-inquiry line shows the support phone number 050-1724-7952.",
        "Note advising users to use the phone number for their country of residence.",
      ],
    },
  ],
};

// Compact footer reference (used on non-home screens that also show the footer).
const FOOTER_REF_GROUP: ReqGroup = {
  title: "Footer",
  items: [
    "Same global footer as the Home screen — brand block, link groups, legal-document links (open the legal overlay), category chips, social icons and support/payment info (support phone 050-1724-7952). See the Home screen for the full item-by-item breakdown.",
  ],
};

// Logged-in header, shared by most authenticated screens.
const APP_HEADER_GROUP: ReqGroup = {
  title: "Header",
  items: [
    { text: "Product logo", sub: ["Navigates to the lobby (home)."] },
    { text: "Currency pill (Points + Coins)", sub: ["Shows balances; tapping it opens Coin History."] },
    { text: "Add (+) button", sub: ["Opens the Store."] },
    { text: "Notifications bell", sub: ["Opens Notifications; the badge counts unread items and drops as they are read or swiped away, disappearing at zero. Counts above 99 show as '99+', on the bell and on the tab badges."] },
  ],
  tbc: [
    "Points value is a fixed placeholder (10,000); live Points balance is pending.",
  ],
};

// Search + quick-filter + sort behaviour shared by the logged-out and
// logged-in home feeds (the "Narrow down" bottom sheet + sort dropdown).
const NARROW_DOWN_ITEMS: ReqItem[] = [
  {
    text: "Narrow down (filter) — opens a bottom sheet from the toolbar",
    sub: [
      "Search field at the top: placeholder 'Search packs & cards' (オリパ・カードを検索).",
      "Quick-filter chips (multi-select toggles): Most popular, New Arrivals, Only a few left, PSA10 confirmed, High return, Pokémon, One Piece, BOX.",
      "Clear resets every quick filter and the search text; Apply just closes the sheet (search + filters already apply live in the feed behind it).",
      "The 'Narrow down' button shows a red count badge equal to the number of active quick filters.",
      "Sheet closes on Apply, the X button, or tapping the dimmed backdrop.",
    ],
  },
  {
    text: "Search behaviour",
    sub: [
      "Typing filters the feed live (no submit / search button needed) by matching the pack title, case-insensitively, in the current language.",
      "While a search is active the results are drawn from the whole catalogue (all categories, ignoring the selected category) and shown as a 2-column grid of compact cards.",
      "When nothing matches, 'No packs match your search.' (一致するオリパがありません。) is shown.",
    ],
  },
  {
    text: "Sort (dropdown on the right of the toolbar)",
    sub: [
      "Options: Recommended order, Most popular, Newest, Price: Low to High, Price: High to Low.",
      "The active option is highlighted in red; selecting one closes the dropdown and reorders the feed.",
    ],
  },
];

const NARROW_DOWN_TBC = [
  "The price range filters on each pack's real draw price; the quick-filter chips and sort options are still POC placeholders that thin/reorder the sample list rather than applying real pack attributes (rarity, category, stock). Wire those to real data.",
];

// The "Recommended" / themed-lane behaviour of the home feed.
const RECOMMENDED_ITEM: ReqItem = {
  text: "Recommended & themed sections",
  sub: [
    "In the 'All' view the feed is split into themed lanes: Recommended, New Arrivals, Just Added, Hot, Trending, Pokémon, Limited, Last Chance, Others, Oripa List.",
    "The Recommended lane is emphasised with a red background framed by curved top and bottom dividers.",
    "When a single category is selected, its top 2 packs are promoted into a red 'Recommended' block (same curved dividers) and the remaining packs list below it.",
    "Each themed lane shows a 'See all' link that switches the feed to that lane's category.",
  ],
};

// ── Screens ───────────────────────────────────────────────────────────────

export const SCREEN_REQUIREMENTS: Record<Screen, ScreenReq> = {
  landing: {
    label: "Home (logged out)",
    summary: "Public landing page: browse the oripa catalogue before creating an account.",
    groups: [
      {
        title: "Header",
        items: [
          { text: "Product logo", sub: ["Not clickable (TBC)."] },
          { text: "SIGN UP (新規登録)", sub: ["Opens the Sign Up screen."] },
          { text: "LOGIN (ログイン)", sub: ["Opens the Log In screen."] },
        ],
      },
      {
        title: "Banner",
        items: [
          "Promotional banner carousel with 7 slides showing a 'PROMO BANNER' placeholder.",
          "Auto-rotates every 5 seconds.",
          { text: "Dot indicators", sub: ["Tapping a dot jumps to that slide."] },
        ],
        tbc: ["No swipe gesture (auto-rotate + dots only).", "Slides are placeholders and are not linked anywhere."],
      },
      {
        title: "Top navigation",
        items: [
          "Category chips: All, New (新着), Hot (人気), Pokémon (ポケモン), Limited (限定), Others (その他); the active chip shows a red label + underline. The 'All' chip is a fixed black tab pinned to the left edge.",
          ...NARROW_DOWN_ITEMS,
        ],
        tbc: [...NARROW_DOWN_TBC],
      },
      {
        title: "Oripa Draws",
        items: [
          RECOMMENDED_ITEM,
          "Oripa cards show tags, artwork, price per draw, remaining stock and remaining time. Each pack carries its own price (300–5,000 coins), which is what the pack page and every draw charge.",
          { text: "Draw / Free draw / View", sub: ["All route the visitor to the Sign Up screen (an account is required)."] },
        ],
        tbc: ["Card artwork uses a shared placeholder image; card tags are static placeholders."],
      },
      { title: "Bottom navigation", items: ["Hidden on this screen."] },
      FOOTER_GROUP,
      LEGAL_OVERLAY_GROUP,
    ],
  },

  signup: {
    label: "Sign up",
    summary: "Create an account with LINE, Google, or email — including verification, SEON step-up, and exit confirmation.",
    groups: [
      {
        title: "Header",
        items: [
          { text: "SIGN UP", sub: ["Inert on this screen (already here)."] },
          { text: "LOGIN", sub: ["Opens the Log In screen."] },
        ],
      },
      {
        title: "Social sign-up",
        items: [
          { text: "LINE (Preferred) / Google method tiles", sub: [
            "LINE opens the LINE permissions sheet (official-account friend toggle + grant permissions) → processing → Complete signup (email, DOB, country, invite, consent) → email verification.",
            "Google opens account picker → permissions → processing → Complete signup (country, invite, consent).",
          ] },
        ],
        tbc: ["Real OAuth is mocked with hardcoded accounts.", "Apple sheet exists in older code but is not on the primary CTA row."],
      },
      {
        title: "Email sign-up form",
        items: [
          "Fields: Email, Password (show/hide), Date of Birth (inline year/month/day), Country (JP/US), Invitation Code (optional), Terms/Privacy consent.",
          { text: "Get Started", sub: [
            "If email is existing.user@gmail.com → Existing Account modal (login / reset password / use different email).",
            "Otherwise → Email Verification modal.",
          ] },
          { text: "Close (×)", sub: ["Opens Registration Exit modal (continue / quit to landing / login)."] },
        ],
        validation: [
          "Email: required; standard email format. Invalid on blur → email error string.",
          "Password: required; minimum 8 characters.",
          "Date of Birth: required; must be at least 18 (years selectable 1931–2010).",
          "Country: required (JP/US).",
          "Invitation Code: optional.",
          "Consent: required; Get Started disabled until email, password, age, and consent are valid.",
        ],
        tbc: [
          "'Terms of Service' / 'Privacy Policy' links inside the checkbox are display-only.",
          "Real account creation and email delivery are mocked.",
          "Phone-number signup page exists in auth.tsx but is not mounted by PhoneApp.",
        ],
      },
      {
        title: "Email verification page",
        items: [
          "Full-page screen (not a modal) with logo header, verify mascot, expiry countdown (60s), and resend wait (10s after resend).",
          { text: "Open Email App", sub: [
            "Simulates checking (900ms) then completes signup — unless email is seon.stepup@gmail.com, which opens SEON phone step-up.",
            "Expired state offers resend.",
          ] },
        ],
        tbc: ["No real email is sent."],
      },
      {
        title: "SEON phone step-up (demo email seon.stepup@gmail.com)",
        items: [
          "Phone capture with dial country, then 6-digit OTP (must be 123456; 30s expiry; max 5 attempts).",
          "Success saves auth with seonStepUp + phoneVerified and lands in the lobby.",
        ],
        validation: [
          "Phone: exactly 10 digits; demo number 9012345678 is rejected as already used.",
          "OTP: only 123456 accepted.",
        ],
      },
      { title: "Footer", items: [{ text: "Log In link", sub: ["'Already have an account? Log In' opens the Log In screen."] }] },
    ],
  },

  login: {
    label: "Log in",
    summary: "Sign in with LINE, Google, or email — including social-linked and password-setup demo paths.",
    groups: [
      {
        title: "Header",
        items: [
          { text: "SIGN UP", sub: ["Opens the Sign Up screen."] },
          { text: "LOGIN", sub: ["Inert on this screen (already here)."] },
        ],
      },
      {
        title: "Social login",
        items: [
          { text: "LINE", sub: ["Connecting → Returning redirect flow (~1.7s), then lobby + 'Login successful!' toast (10s)."] },
          { text: "Google", sub: ["Account picker (incl. john.inr@gmail.com) → permissions → processing → lobby."] },
        ],
        tbc: ["Real OAuth is mocked."],
      },
      {
        title: "Email login form",
        items: [
          "Accordion section with Email and Password.",
          { text: "Login", sub: [
            "john.doe@gmail.com / other DEMO_GOOGLE emails (incl. john.inr@gmail.com) → Social Linked Account modal (use Google or set password).",
            "line.user@gmail.com → Password Setup email modal → Change Password → Password Updated.",
            "Otherwise → lobby.",
          ] },
          { text: "Forgot Password", sub: ["Opens reset modal then Change Password (8–20 chars, digit, upper, lower, confirm match)."] },
        ],
        validation: [
          "Email: required; standard email format.",
          "Password: required; minimum 8 characters.",
          "'Login' enabled when email and password are valid.",
          "Change password: 8–20 characters, ≥1 digit, ≥1 uppercase, ≥1 lowercase, confirmation must match.",
        ],
        tbc: ["Credentials are not verified against real accounts.", "Phone-number login accordion exists in markup but is hidden (className hidden)."],
      },
      { title: "Footer", items: [{ text: "Sign up link", sub: ["'Don't have an account? Sign up now' opens the Sign Up screen."] }] },
    ],
  },

  oripa: {
    label: "Lobby / Home",
    summary: "Logged-in home feed of oripa draws, grouped into themed sections.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Error pages (demo control)",
        items: [
          "The 'Errors' control in the harness arms one of two error pages; the options are exclusive, and 'Off' restores normal navigation.",
          "While one is armed, the next navigation anywhere in the app — bottom nav, footer links, cards, in-page links — lands on that page instead of the screen asked for. Both pages keep the app header and the bottom navigation, and sit above the site footer; tapping a tab from an error page re-points it at that tab.",
          { text: "Page not found", sub: ["Mascot with a question mark, 'The page you are looking for might have been moved, deleted, or doesn't exist.' and a 'Back to Home' CTA that opens the lobby."] },
          { text: "Under maintenance", sub: ["Mascot in a hard hat, the scheduled-maintenance notice and apology, and a 'Refresh Page' CTA that continues to the page the user was originally opening."] },
        ],
        tbc: ["Demo only — nothing in the app raises these pages on its own."],
      },
      {
        title: "Banner",
        items: [
          "Promotional banner carousel (7 slides, auto-rotates every 5 seconds).",
          { text: "Dot indicators", sub: ["Tapping a dot jumps to that slide."] },
        ],
        tbc: ["No swipe gesture; slides are placeholders."],
      },
      {
        title: "Top navigation",
        items: [
          "Sticky category bar (stays pinned under the header while the feed scrolls): All, New, Hot, Pokémon, Limited, Others; the active chip shows a red label + underline; the 'All' chip is a fixed black tab pinned to the left edge.",
          ...NARROW_DOWN_ITEMS,
          { text: "Category switch scroll behaviour", sub: ["When switching category, the feed scrolls so the category bar returns to the top only if the promo banner has already scrolled out of view; if the banner is still visible the scroll position is left untouched."] },
        ],
        tbc: [...NARROW_DOWN_TBC],
      },
      {
        title: "Oripa Draws",
        items: [
          RECOMMENDED_ITEM,
          "Cards show tags, artwork, price per draw, remaining stock and remaining time. Prices vary per pack (300–5,000 coins).",
          { text: "Draw / Free draw / View", sub: ["Open the Draw screen (pack detail) for the tapped pack."] },
        ],
        tbc: [
          "Card artwork uses a shared placeholder; tags are static placeholders.",
        ],
      },
      {
        title: "Bottom navigation",
        items: [
          { text: "Oripa", sub: ["Opens the lobby (home)."] },
          { text: "My Loot", sub: ["Opens the My Loot screen."] },
          { text: "Quests", sub: ["Does nothing (TBC) — no Quests screen exists."] },
          { text: "Store", sub: ["Opens the Store."] },
          { text: "My Page", sub: ["Opens the My Account hub."] },
        ],
      },
      FOOTER_GROUP,
      LEGAL_OVERLAY_GROUP,
    ],
  },

  drawDetail: {
    label: "Draw (pack detail)",
    summary: "Gacha pack detail opened from the lobby: banner, remaining/period, prize line-up by tier, sticky draw CTA, and Quick Purchase when the wallet is short.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Title row",
        items: [
          "Back arrow returns to the lobby.",
          "Shows the selected pack's title.",
        ],
      },
      {
        title: "Pack banner",
        items: [
          "Branded banner with 'New members only' and 'Advantage guaranteed' badges, the pack title, the 'Start Dash Pack' subtitle, and the price per draw (coins).",
        ],
        tbc: ["Banner artwork/badges are placeholders until final creative is signed off."],
      },
      {
        title: "Remaining & period",
        items: [
          "Remaining/total stock with a progress bar and the remaining time.",
        ],
      },
      {
        title: "Caution note",
        items: ["Yellow note prompting the user to review terms and prize details before drawing."],
      },
      {
        title: "Prize line-up",
        items: [
          "1st Prize (1等): two top-tier (holo) cards with name, coin value and 'Exchangeable for coins'.",
          "2nd Prize (2等): grid of gold-tier cards with coin values.",
          "3rd Prize (3等): grid of silver-tier cards with coin values.",
        ],
        tbc: ["Card artwork and coin values use shared sample data; real line-up/odds are TBC."],
      },
      {
        title: "Draw CTA (sticky)",
        items: [
          { text: "Draw ×1 / Draw ×10 / Custom", sub: ["Opens a confirmation sheet; confirming debits coins and shows results."] },
          { text: "Custom draw quantity", sub: ["Opens on 5 draws; +5 Draws / +10 Draws step it up and MAX (100 Draws) fills in 100 when the balance covers them, otherwise the largest affordable count. The stepper caps at 100 and the balance row updates with every change."] },
          { text: "Leaving the draw results", sub: ["Draw again and Back to info page both rewind this page to the top before it reappears behind them."] },
          "When stock is 0 the CTA shows a 'Sold out' state.",
          { text: "Sold Out (demo control)", sub: ["With the Sold Out draw scenario armed, confirming any draw charges nothing and shows the 'Sold Out!' popup ('This pack has completely sold out due to popular demand! No coins were deducted.'). Closing it drops the pack to 0 remaining, marks it Sold Out and removes its draw CTAs."] },
          { text: "Retired packs stay retired", sub: ["A pack closed out by the Sold Out or Draw expired popup keeps that state for the session: its lobby card greys out with a Sold Out / Expired label and no CTAs, and its page reopens the same way. Switching the scenario back to Happy path restocks them."] },
          { text: "Insufficient coins", sub: ["Opens Quick Purchase (offers → pay → 3DS → success → Draw) instead of navigating to Store."] },
        ],
        validation: [
          "Draw cost = count × the pack's price (300–5,000 coins, shown on the card and pack page); coins are debited on confirm when the balance covers it.",
          "If cost > balance, Quick Purchase opens with neededCoins = cost − balance.",
        ],
      },
      {
        title: "Quick Purchase",
        items: [
          "Featured covering packs (up to 2) via specials/heroes then plain packs; cheapest covering first.",
          { text: "View More Packages", sub: ["Expands to the full store catalog."] },
          "Pay: saved cards (max 3, index 0 = LAST USED), add new card + JP/US billing, Apple Pay / Google Pay (skip 3DS).",
          "john.inr@gmail.com: must pick INR vs JPY before paying.",
          "Card: mock 3DS; any auth code with ≥4 digits succeeds (no decline path here).",
          "Success Draw: closes sheet, debits pending draw cost, runs the pending draw.",
          "KYC gate on pay; after purchase KYC, resume the sheet in place (do not bounce to Store).",
        ],
      },
      FOOTER_GROUP,
      LEGAL_OVERLAY_GROUP,
    ],
  },

  guestDraw: {
    label: "Draw (pack detail, signed out)",
    summary: "The same pack detail page, opened by a signed-out visitor from a landing card or promo banner: everything is browsable, but drawing needs an account.",
    groups: [
      {
        title: "Header",
        items: ["Landing page's Sign up / Login header instead of the balance pill (a visitor has no wallet).", "Both buttons open their auth screen and come back to this pack once authenticated.", "The logo returns to the logged-out lobby, as it does everywhere else."],
      },
      {
        title: "Page content",
        items: ["Identical to the logged-in pack page: banner, remaining/period, caution note, prize line-up by tier and footer.", "Back arrow returns to the logged-out lobby."],
      },
      {
        title: "Draw CTA (sticky)",
        items: [
          { text: "Any draw CTA (×1 / ×10 / Custom / free draw)", sub: ["Opens Login instead of a draw confirmation; no draw flow, wallet or results exist for a visitor."] },
          "After a successful login or sign-up the visitor lands back on this pack page, signed in and able to draw.",
        ],
      },
      FOOTER_GROUP,
      LEGAL_OVERLAY_GROUP,
    ],
  },

  notifications: {
    label: "Notifications",
    summary: "Personal notifications and service announcements.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Tabs",
        items: [
          "'Notifications for You' (あなたへの通知) and 'Announcements' (お知らせ), each with an unread count badge.",
          "When opened from My Account → Announcements, only the Announcements list is shown (tabs hidden).",
        ],
      },
      {
        title: "Notification items",
        items: [
          "Each item shows a date, title and body; shipping items also show a tracking number line.",
          "Unread items are highlighted with a red accent and a 'New' (新着) badge.",
          { text: "Tapping an unread item", sub: ["Marks it read (styling updates) and takes it off the tab badge and the header bell count; there is no further navigation."] },
          {
            text: "Swiping an item to the left",
            sub: [
              "Uncovers a red Delete (削除) bin on the right; tapping it removes the notification from the list, the tab badge and the header bell count.",
              "Only one item is open at a time; tapping the item again, or swiping it back, closes the bin without deleting.",
              "Reads and deletions persist while navigating the app and are restored on reload (sample data).",
            ],
          },
          "Empty state shows the mascot with 'No notifications' (通知がありません), or 'No announcements' (お知らせがありません) on the Announcements tab, matching the card screens — including once every item in the tab has been deleted.",
          { text: "Demo control: 'Send a notification'", sub: ["Each flip to Yes delivers one fresh unread item, alternating between the two tabs, so an emptied notification centre can be filled back up. The item unfolds into the list and the toggle re-arms itself for the next send."] },
        ],
        tbc: ["Items do not deep-link anywhere.", "Content is sample data."],
      },
    ],
  },

  prizeHistory: {
    label: "Winning history",
    summary: "Won prizes grouped by status, with filtering, exchange-to-coins and shipping requests.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Tabs",
        items: [
          "Prizes Won (獲得景品), Waiting to Ship (発送待ち), Shipped (発送済み), each with a count badge.",
          "Header + tab bar stay pinned while the list scrolls; switching tabs scrolls the list to the top.",
        ],
      },
      {
        title: "Toolbar (Won tab)",
        items: [
          { text: "Narrow down", sub: ["Opens a sheet: search, 'Select by tier' chips (All/Ultra/Gold/Silver + counts + Select all), and 'Quick filters' by category; Clear / Apply."] },
          { text: "Sort", sub: ["Coin value high→low, low→high, won newest, won oldest, expiry soonest."] },
        ],
        validation: ["Changing category or search clears the current selection."],
      },
      {
        title: "Prize cards & selection (Won tab)",
        items: [
          "Won cards show artwork, a rarity tag (Ultra / Gold / Silver), a selection toggle, title, description, an exchange-period date and a coin value.",
          { text: "Delivery status", sub: ["Winning history cards add a 'Status:' line under the won date — Not selected / Pending delivery / Shipped / Delivery Completed / Exchanged for coins — styled like the date (10px regular, #0F0F0F)."] },
          { text: "Tapping a card", sub: ["Toggles selection (selected cards show an orange border)."] },
          { text: "Sticky action bar (appears only when ≥1 prize selected)", sub: ["Reset clears the selection.", "Exchange to Coins converts the selected prizes to coins, removes them from Won and shows a toast.", "Request Shipping first calls requestKyc('prizeHistory'); if verification is incomplete the KYC overlay opens, otherwise the shipping flow (choose/add address → confirm) runs and prizes move to Waiting to Ship.", "On the confirm step the footnote (free-quota line + 'Delivery within 14 business days.') sits under the Back / request buttons in both variants. Once the free quota is spent the total gains a '+ Shipping Fee: ¥500' line and the CTA reads 'Pay & Request'."] },
        ],
        validation: [
          "Shipping requires a minimum selected coin value. INCONSISTENCY: the hint says 'items totaling 500 coins or more' but the enforced minimum is currently 1,500 — to be confirmed and aligned.",
          "Below the threshold, Request Shipping is de-emphasised and a toast prompts the user to add more coin value.",
        ],
      },
      {
        title: "Waiting to Ship / Shipped tabs",
        items: [
          "Waiting cards show 'Preparing shipment' + request date, with a 14 business-day delivery note.",
          { text: "Shipped cards", sub: ["Show a tracking number with a copy action that confirms via a toast."] },
        ],
      },
      FOOTER_REF_GROUP,
    ],
  },

  myLoot: {
    label: "My Loot",
    summary: "Same layout as Winning history, filtered to only the most valuable (top-tier) prizes.",
    groups: [
      {
        title: "Overview",
        items: [
          "Shows only top-tier (UR) prizes.",
          "Reachable from the bottom-nav 'My Loot' item and from My Account → My Loot; back returns to where it was opened from.",
        ],
        tbc: ["Open question: whether the Won/Waiting/Shipped tabs should be shown or hidden in My Loot."],
      },
      {
        title: "Tabs & actions",
        items: [
          "Won / Waiting to Ship / Shipped tabs, each filtered to top-tier items.",
          "All Won-tab features (narrow down, sort, selection, exchange, shipping) behave as in Winning history.",
        ],
        validation: ["Same shipping threshold rules as Winning history."],
      },
      FOOTER_REF_GROUP,
    ],
  },

  purchaseHistory: {
    label: "Purchase history",
    summary: "Past coin purchases with date-range filtering and lazy loading.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Top navigation",
        items: [
          "Back arrow returns to My Account; page title 'Purchase History' (購入履歴).",
          "Note that history for the past 3 months is available; older history requires contacting support.",
        ],
      },
      {
        title: "Date-range filter",
        items: [
          "Presets: All time, Last 7 days, Last 30 days, Last 90 days, Custom range.",
          { text: "Custom range", sub: ["From and To date pickers with an Apply action."] },
          { text: "Reset", sub: ["Returns to All time; shown whenever a non-default range is active."] },
          "The filter button highlights when an active filter is applied and shows the active range.",
          "Applying a filter shows a brief skeleton loading state before results appear.",
        ],
        validation: ["When no records match the selected period, 'No purchases in the selected period.' is shown."],
      },
      {
        title: "Records & load more",
        items: [
          "Each record shows date/time, status (Completed = green, Cancelled = red), coins, bonus points, JPY amount, masked payment method and payment ID.",
          { text: "Load more", sub: ["Reveals 6 more records at a time with a staggered one-by-one animation; hides when all records are shown."] },
        ],
        tbc: ["Records are sample data and are not updated by in-app purchases.", "Records are not tappable."],
      },
      FOOTER_REF_GROUP,
    ],
  },

  coinHistory: {
    label: "Coin History",
    summary: "Coin and point transaction history with balance summary and lazy loading.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Balance summary",
        items: [
          "Shows the live Coins balance, a Points value and a coin-expiry message (e.g. '50 Coins will expire on 11/12 at 18:51!').",
          { text: "Add (+) on the summary", sub: ["Opens the Store."] },
          "Note that history for the past 3 months is available; older history requires contacting support.",
        ],
        tbc: ["Points value is a fixed placeholder (10,000)."],
      },
      {
        title: "Transactions & load more",
        items: [
          "Types: Super Oripa Gacha, Oripa Gacha, Once-a-Day Gacha, Purchased Coins, Points Granted/Refunded, Points Expired.",
          "Each row shows date/time, a +/- amount with a colour-coded currency icon, and optional payment ID / expiry lines.",
          { text: "Load more", sub: ["Reveals 6 more transactions at a time with a staggered reveal; hides when all are shown."] },
        ],
        tbc: ["Transaction data is sample data and is not updated by purchases/draws."],
      },
      FOOTER_REF_GROUP,
    ],
  },

  store: {
    label: "Store",
    summary: "Purchase Coins catalog + Cashier V1 mock checkout (express wallets, card, 3DS, success, demo declines on •••• 9999 / •••• 8888).",
    groups: [
      {
        title: "Header & top navigation",
        items: [
          "Title 'Purchase Coins' (コイン購入); reachable from the header +, bottom-nav Store and Coin History +.",
          "Back arrow returns to the opener; the header logo returns to the lobby.",
        ],
      },
      {
        title: "Store sections",
        items: [
          { text: "Buy Coins", sub: ["10 packs (1,000–1,000,000 coins, 1:1 JPY). Each shows coins and JPY price."] },
        ],
        tbc: ["Loyalty, limited bundles, and subscriptions are not in this build."],
      },
      {
        title: "Cashier V1 — checkout & payment",
        items: [
          "Selecting a package opens Cashier V1 with a package summary (coins, price; offer tags / strikethrough when present).",
          { text: "Currency selector (john.inr@gmail.com only)", sub: [
            "INR / JPY toggle above payment methods; INR selected by default.",
            "INR: package + pay amounts use the package exchange rate (1 JPY = 0.6103 INR); show rate + bank-fee warning; wallets limited to Apple Pay + Google Pay (+ cards).",
            "JPY: show exchange-rate + bank-fee warning; full wallet grid (Google Pay, Apple Pay, PayPay, Rakuten Pay, MelPay, FamiPay) + cards.",
            "Player can pay in either currency.",
          ] },
          { text: "Express wallets (2×3)", sub: ["Google Pay and Apple Pay as black CTAs; PayPay, Rakuten Pay, MelPay, FamiPay as white bordered buttons. All skip 3DS and go straight to success (after KYC check). INR currency mode hides the four JP wallets."] },
          { text: "Pay with Card", sub: ["No cards: Add new card row with accepted-brand badges → dedicated Add Card Details page. With cards: up to 3 saved cards (+ selected beyond top 3), Last Used badge on newest, Manage Cards, Add new card."] },
          { text: "Add Card Details", sub: ["Card number, expiry, CVC, cardholder name + billing address (JP/US). Billing collapses to a summary once filled; pencil re-opens edit. Sticky Add Card and Pay."] },
          { text: "My Cards", sub: ["List with select + delete confirm + toast; sticky Pay Now."] },
          { text: "3-D Secure", sub: ["Mock SMBC Visa modal; auth code must be ≥ 4 digits; resend is non-functional."] },
          { text: "Demo decline card •••• 9999", sub: [
            "Pre-seeded Visa (and any newly added card ending in 9999) declines after 3DS with insufficient funds.",
            "Failure modal: 'Transaction Failed' + insufficient-funds copy.",
            "Suggests up to 2 plain coin packs priced just below the failed package (omit section if none; show 1 if only one).",
            "Tapping a suggested pack re-opens Cashier checkout for that pack.",
          ] },
          { text: "Demo decline card •••• 8888", sub: [
            "Pre-seeded Mastercard (and any newly added card ending in 8888) declines after 3DS with bank decline.",
            "Failure modal: 'Transaction Failed' + bank-decline copy.",
            "Suggests 2 alternate methods: card→Apple/Google Pay; Apple Pay→card/Google Pay; Google Pay→card/Apple Pay; other→card/Apple Pay.",
            "Tapping Apple/Google Pay completes the usual express success flow; tapping Card returns to checkout.",
          ] },
          { text: "Success", sub: ["Purchase breakdown + payment method; Play Now carousel can open a draw; Close credits coins and returns to Store."] },
          { text: "KYC gate", sub: ["On pay (wallet / card / add-card / My Cards Pay Now), matching the POC. If incomplete (and scenario ≠ none), KYC opens and payment is blocked. Return from purchase KYC lands back on Store — unless Quick Purchase is pending, in which case the sheet resumes in place."] },
        ],
        validation: [
          "Card number: 14–16 digits (spaces allowed while typing).",
          "Expiry: valid future MM/YY (month 1–12).",
          "CVC and cardholder name are collected but not required to enable Pay.",
          "Billing required: first name, last name, address line 1, city, state/prefecture, ZIP (Japan NNN-NNNN with hyphen; US 5 digits).",
          "Add Card and Pay disabled until card number, expiry, and billing are valid.",
          "Main Pay Now disabled until a saved card is selected.",
          "3DS Authenticate disabled until auth code has ≥ 4 digits.",
        ],
        tbc: [
          "Payment is mocked; no real payment provider.",
          "3-D Secure code is not validated against a real OTP.",
          "Apple Pay / Google Pay / PayPay / Rakuten Pay / MelPay / FamiPay are simulated.",
          "Only Coins (not Points) are credited on success; Purchase History and Coin History are not updated.",
          "Saved cards are session-only.",
          "INR exchange rate is a fixed demo rate (0.6103), not a live FX feed.",
        ],
      },
      FOOTER_REF_GROUP,
    ],
  },

  shippingAddress: {
    label: "Address",
    summary: "Manage shipping addresses used for prize delivery.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Top navigation",
        items: [
          "Title 'Add or Change Shipping Address' (お届け先の追加・変更).",
          "Back from the list returns to My Account; back from the form returns to the list.",
        ],
      },
      {
        title: "Address list",
        items: [
          "Lists saved addresses; empty state 'There are no registered delivery addresses.'",
          { text: "Per address", sub: ["Edit, delete (with confirmation), and set-as-default; the default shows a 'Default' (デフォルト) badge."] },
        ],
      },
      {
        title: "Add / edit form",
        items: [
          "Supports Japan and USA field sets, with a postcode lookup and a Register action.",
          "Add / update / delete each show a confirmation toast.",
        ],
        validation: [
          "Required address fields must be completed before Register.",
          "Delete asks 'Do you want to delete this delivery address?' before removing.",
        ],
        tbc: ["Postcode lookup is mocked.", "Addresses do not persist beyond the session."],
      },
    ],
  },

  mypage: {
    label: "My Account",
    summary: "Account hub: profile, balances, rank, menu, account actions and legal links.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Profile card",
        items: [
          "Avatar, display name and ID.",
          { text: "Edit profile", sub: ["Opens My Profile (same screen as Account Settings)."] },
        ],
      },
      {
        title: "Balance card",
        items: ["Coins (live) and Points, plus a coin-expiry warning ('Coins expire in 3 days!')."],
        tbc: ["View Details and the decorative Coins + do nothing.", "Points value is a placeholder."],
      },
      {
        title: "Rank card",
        items: ["Current rank, amount to next level, a progress bar and current/target points."],
        tbc: ["View Rank Benefits does nothing."],
      },
      {
        title: "My Menu",
        items: [
          { text: "My Loot", sub: ["Opens My Loot."] },
          { text: "Winning history", sub: ["Opens Winning history."] },
          { text: "Purchase history", sub: ["Opens Purchase history."] },
          { text: "Announcements", sub: ["Opens the announcements-only notifications view."] },
          { text: "Address", sub: ["Opens Address management."] },
          { text: "Invite Friends", sub: ["Opens Refer a friend."] },
          { text: "Quests, FAQ, Support Inquiry, Subscriptions", sub: ["Do nothing (TBC)."] },
        ],
      },
      {
        title: "Account section",
        items: [
          { text: "Account Settings", sub: ["Opens My Profile (same screen as Edit profile)."] },
          { text: "Log out", sub: ["Returns to the logged-out landing page."] },
        ],
      },
      {
        title: "Other / legal",
        items: ["T&Cs, Privacy policy, Legal notice (SCTA), Basic Policy Against Anti-Social Forces open the legal overlay."],
      },
      LEGAL_OVERLAY_GROUP,
      {
        title: "Behaviour",
        items: ["Scroll position is preserved when returning from a sub-screen."],
        tbc: ["The two promo banners are not clickable."],
      },
      FOOTER_REF_GROUP,
    ],
  },

  quest: {
    label: "Quests",
    summary: "Quests / missions area.",
    groups: [
      {
        title: "Status",
        items: [],
        tbc: ["Not built — the bottom-nav 'Quests' label and the My Account 'Quests' item do nothing; no Quests screen exists."],
      },
    ],
  },

  profile: {
    label: "My Profile",
    summary: "Account settings hub opened from Edit profile or Account Settings. Accordion sections for identity, personal info, social links, verifications, password and communication preferences.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Account ID",
        items: ["Static account ID, emblem, editable display name with Save."],
      },
      {
        title: "Personal Information",
        items: [
          "Email and country are read-only (no country dropdown).",
          "Date of birth (picker), optional phone with Verify OTP.",
          "Japan: postal code lookup (mocked), prefecture, Address, optional Address line 2.",
          "USA: Address, optional Address line 2, state, 5-digit zip.",
        ],
        validation: [
          "Email must match a basic email pattern (not editable).",
          "Phone is optional; when entered must be exactly 10 digits (digits only).",
          "Japan postal code must be NNN-NNNN.",
          "USA zip must be exactly 5 digits.",
          "Save requires valid email, DOB and a complete address for the selected country (phone not required).",
        ],
      },
      {
        title: "Social Connect",
        items: ["LINE, Google, Facebook, Apple rows; connected state from session auth (LINE/Google)."],
        tbc: ["Connect / disconnect actions are display-only."],
      },
      {
        title: "Account Verifications",
        items: [
          { text: "Verification Status", sub: [
            "ID then proof-of-address CTAs launch the KYC overlay based on current status (required → details → before start → Veriff ID capture/selfie → identity result → PoA → complete).",
            "Scenarios (desktop control / ?scenario=): happy, identityReview, identityAttention, poaReview, poaAttention, none (skip gating).",
            "PoA step CTA only when identity is approved; attention screens support retry (ID) or locked resubmit (PoA).",
          ] },
          { text: "Payment Method Verification", sub: ["Select Card + card number, then Jumio-style upload flow; marks the card verified."] },
          { text: "Document Upload", sub: ["Full-page upload with type select, file pick, pending/success overlays and history."] },
        ],
      },
      {
        title: "Change Password",
        items: ["Old / new / repeat fields."],
        validation: ["Succeeds when new password is non-empty and matches the repeat field (old password is not checked)."],
      },
      {
        title: "Communication Preferences",
        items: ["Email / Push / SMS toggles with Save."],
      },
      {
        title: "Behaviour",
        items: [
          "Back returns to My Account.",
          "Personal form persists in sessionStorage (profileForm); phone verified flag in authData.",
          "KYC state persists in sessionStorage.",
        ],
      },
    ],
  },

  refer: {
    label: "Refer a friend",
    summary: "Invite screen opened from the My Account 'Invite Friends' tile: the member's promo code and invite link with their share routes, the referral tallies, what each milestone pays out and the latest activity on the link.",
    groups: [
      APP_HEADER_GROUP,
      {
        title: "Header",
        items: ["Back returns to My Account."],
      },
      {
        title: "Hero banner",
        items: ["Referral banner: the 一緒に楽しもう！ ribbon over the 友達紹介 headline, its two-line strapline and the mascot."],
        tbc: ["Drawn in the page rather than placed as the artwork export."],
      },
      {
        title: "Promo code and referral link",
        items: [
          { text: "Your Promo Code", sub: ["Read-only code with a Copy CTA that writes it to the clipboard and confirms with a 'Code copied' toast."] },
          { text: "Your Referral Link", sub: ["Read-only link with a Copy CTA that writes the full link to the clipboard and confirms with a 'Link copied' toast."] },
          { text: "Share via", sub: ["X (Twitter) and LINE each report which app would open.", "QR code opens the shareable invite card: 友達紹介 banner, the QR beside the member's referral code, the three reasons to share and a Save QR Code button that downloads the code. It closes on the X above its top-right corner or on a tap outside it."] },
        ],
        tbc: ["The code and link are fixed placeholders and no share destination actually hands them over."],
      },
      {
        title: "My Stats",
        items: [
          "Invited friends, friends with a deposit pending and the Bronze qualifier count.",
          "Qualified For Silver reads 'Coming soon' on a dimmed card — the milestone is not live yet.",
          "Total Rewards Earned spans the row below.",
        ],
        tbc: ["All five tallies are static."],
      },
      {
        title: "How it Works",
        items: ["Three numbered steps threaded by a dotted rule: share the link, the friend registers for a welcome bonus, then the first deposit pays both sides."],
      },
      {
        title: "Reward Breakdown",
        items: [
          "Table of what the introducer and their friend each receive: sign-up (friend only, tagged 'Welcome bonus'), first deposit and the Bronze rank-up, 100 coins apiece.",
          "The Silver rank-up row is dimmed and reads 'Coming soon' on both sides.",
        ],
      },
      {
        title: "Recent Activity",
        items: [
          "Four rows of who registered or completed a first deposit, how long ago, and the +500 coins a deposit paid.",
          { text: "View More Activity", sub: ["Reveals the rest of the list and then drops away."] },
        ],
        tbc: ["The activity list is static sample data."],
      },
      {
        title: "Notes & Terms of use",
        items: ["Collapsed to its first note; the header row opens the full list."],
      },
      FOOTER_REF_GROUP,
    ],
  },
};
