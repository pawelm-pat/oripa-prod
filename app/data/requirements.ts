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
    { text: "Category chips: Latest, Trending, Pokémon TCG, Limited, Other, All", sub: ["Display only — do nothing (TBC)."] },
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
    { text: "Notifications bell", sub: ["Opens Notifications; shows an unread badge when there are unread items."] },
  ],
  tbc: [
    "Points value is a fixed placeholder (10,000); live Points balance is pending.",
    "The bell unread badge does not clear when items are read.",
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
          "Category chips: All, New (新着), Hot (人気), Pokémon (ポケモン), Limited (限定), Others (その他); the active chip shows a red label and underline.",
          "Sort control: Recommended, Most popular, Newest, Price low→high, Price high→low.",
          { text: "Narrow down filter", sub: ["Opens a sheet with a search field and quick-filter chips.", "Clear resets filters + search; Apply closes the sheet."] },
        ],
        validation: ["Search filters the feed live; when nothing matches, 'No packs match your search.' is shown."],
      },
      {
        title: "Oripa Draws",
        items: [
          "Oripa cards show tags, artwork, price, remaining stock and remaining time.",
          { text: "Draw / Free draw / View", sub: ["All route the visitor to the Sign Up screen (an account is required)."] },
        ],
        tbc: ["Card artwork uses a shared placeholder image; card price/tags are static placeholders."],
      },
      { title: "Bottom navigation", items: ["Hidden on this screen."] },
      FOOTER_GROUP,
      LEGAL_OVERLAY_GROUP,
    ],
  },

  signup: {
    label: "Sign up",
    summary: "Create an account with email or a social provider.",
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
          { text: "LINE / Google / Apple (order LINE → Google → Apple)", sub: ["Google/Apple open a simulated provider flow; LINE completes immediately. All land the user in the lobby."] },
        ],
        tbc: ["Real OAuth is mocked with hardcoded accounts."],
      },
      {
        title: "Email sign-up form",
        items: [
          "Fields: Email Address, Password, Date of Birth, Invitation Code (optional) and a Terms agreement checkbox.",
          { text: "Date of Birth", sub: ["Chosen via a year → month → day picker (selectable years 1931–2010)."] },
          { text: "Sign Up for Free", sub: ["On valid submit, shows the Email Verification modal."] },
        ],
        validation: [
          "Email: required; must match a standard email format. Invalid on blur → 'Please enter a valid email address.' (JA: 有効なメールアドレスを入力してください。)",
          "Password: required; minimum 8 characters. Too short on blur → 'Password must be at least 8 characters.' (JA: パスワードは8文字以上で入力してください。)",
          "Date of Birth: required (a date must be selected).",
          "Invitation Code: optional; no validation.",
          "Terms checkbox: required (must be checked).",
          "'Sign Up for Free' is disabled until email valid AND password valid AND date of birth set AND terms checked.",
        ],
        tbc: [
          "Password alphanumeric rule is only length-checked (label mentions alphanumeric).",
          "Minimum age (e.g. 18+) is not enforced.",
          "'Terms of Service' / 'Privacy Policy' links inside the checkbox are not clickable.",
          "Real account creation and email delivery are mocked.",
          "Phone-number sign-up + OTP exists in code but is hidden.",
        ],
      },
      {
        title: "Email verification modal",
        items: [
          "States a verification email was sent to the entered address.",
          { text: "Open Email App", sub: ["Completes registration and lands the user in the lobby."] },
        ],
        tbc: ["'Resend email' does nothing.", "No real email is sent; the modal completes signup directly."],
      },
      { title: "Footer", items: [{ text: "Log In link", sub: ["'Already have an account? Log In' opens the Log In screen."] }] },
    ],
  },

  login: {
    label: "Log in",
    summary: "Sign in with email or a social provider.",
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
        items: [{ text: "LINE / Google / Apple", sub: ["Simulated provider flow; all land the user in the lobby."] }],
        tbc: ["Real OAuth is mocked."],
      },
      {
        title: "Email login form",
        items: [
          "Fields: Email Address and Password.",
          { text: "Login", sub: ["Signs in and lands the user in the lobby (no email verification)."] },
        ],
        validation: [
          "Email: required; must match a standard email format.",
          "Password: required; minimum 8 characters.",
          "'Login' is enabled when email and password are valid.",
        ],
        tbc: ["Credentials are not verified against real accounts.", "Phone-number login + OTP exists in code but is hidden."],
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
          "Sticky category bar: All, New, Hot, Pokémon, Limited, Others; the active chip shows a red label + underline.",
          "Sort control and a Narrow down sheet (search + quick filters, Clear/Apply).",
          { text: "Themed section 'See all'", sub: ["Switches the feed to that section's category."] },
          { text: "Category switch scroll behaviour", sub: ["Scrolls the feed so the category bar returns to the top only if the promo banner has scrolled out of view."] },
        ],
        validation: ["Search filters the feed live; empty search shows 'No packs match your search.'"],
      },
      {
        title: "Oripa Draws",
        items: [
          "Themed sections (Recommended, New Arrivals, Just Added, Hot, Trending, Pokémon, Limited, Last Chance, Others, Oripa List).",
          "Recommended section (and the top 2 items in any single category) are emphasised with a red background and dividers.",
          "Cards show tags, artwork, price, remaining stock and remaining time.",
        ],
        tbc: [
          "Draw / Free draw / View do nothing when logged in (gacha flow not built).",
          "Card artwork uses a shared placeholder; price/tags are static placeholders.",
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
          { text: "Tapping an unread item", sub: ["Marks it read (styling updates); there is no further navigation."] },
          "Empty state shows 'No notifications' (通知がありません).",
        ],
        tbc: ["Items do not deep-link anywhere.", "Reading items does not clear the header bell badge.", "Content is sample data."],
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
          { text: "Tapping a card", sub: ["Toggles selection (selected cards show an orange border)."] },
          { text: "Sticky action bar (appears only when ≥1 prize selected)", sub: ["Reset clears the selection.", "Exchange to Coins converts the selected prizes to coins, removes them from Won and shows a toast.", "Request Shipping opens the shipping flow (choose/add address → confirm); on confirm the prizes move to Waiting to Ship."] },
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
    summary: "Buy coin packages / bundles / subscription and complete a (mocked) checkout.",
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
          { text: "Loyalty / VIP bar", sub: ["Expand/collapse perks (display only)."] },
          "First-time welcome offer.",
          { text: "Limited Bundles", sub: ["Horizontal scroll; each shows coins, bonus points, price, original price, remaining/total inventory and (some) a HOT badge + countdown."] },
          { text: "Buy Coins packages", sub: ["Each shows coins, bonus points, JPY price and (where applicable) a strikethrough original price and discount/emphasis badges."] },
          { text: "Collector's Pass subscription", sub: ["Subscribe opens the mock checkout; after subscribing it shows an 'Active' state."] },
        ],
        tbc: ["Loyalty perks, bundle inventory and countdown are static.", "Subscription state does not persist across visits."],
      },
      {
        title: "Checkout & payment",
        items: [
          "Selecting a package/bundle opens the checkout with a package summary.",
          { text: "Payment methods", sub: ["Card, Apple Pay, Google Pay, PayPay, link."] },
          { text: "Card path", sub: ["Card + billing form; goes through a 3-D Secure style step; other methods proceed directly to success."] },
          "Saved cards can be reused; a card manager allows viewing/deleting saved cards.",
          { text: "Success screen", sub: ["Shows a purchase breakdown; Close adds the purchased coins to the balance."] },
        ],
        validation: [
          "Card number: must be 14–16 digits, else 'Card number must be 14–16 digits'.",
          "Expiry: must be a valid future MM/YY, else 'Enter a valid future date (MM/YY)'.",
          "Required billing fields: first name, last name, address line 1, city, state (where applicable), ZIP.",
          "'Pay' is disabled until the card and required billing fields are valid.",
        ],
        tbc: [
          "Payment is mocked; no real payment provider.",
          "3-D Secure code is not validated; CVC and cardholder name are not validated.",
          "Apple Pay / Google Pay / PayPay / link are simulated.",
          "Only Coins (not Points) are credited on success; Purchase History and Coin History are not updated.",
          "Checkout Terms/Privacy links and 3-D Secure 'resend code' do nothing.",
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
        items: ["Avatar, display name and ID."],
        tbc: ["Edit profile does nothing.", "Profile name/ID are placeholders."],
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
          { text: "Quests, Invite Friends, FAQ, Support Inquiry, Subscriptions", sub: ["Do nothing (TBC)."] },
        ],
      },
      {
        title: "Account section",
        items: [{ text: "Log out", sub: ["Returns to the logged-out landing page."] }],
        tbc: ["Account Settings does nothing."],
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
};
