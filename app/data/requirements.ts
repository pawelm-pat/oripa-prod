import type { Screen } from "../lib/types";

// Per-screen product requirements, sliced from REQUIREMENTS.md so the in-app
// "Product requirements" panel can show exactly what is on the current screen.
// - functionality: what the screen does / what the user can do (built behaviour)
// - validation: input rules and constraints enforced on the screen
// - tbc: controls/behaviours that are present but not wired, or still mocked
export type ScreenReq = {
  label: string;
  summary: string;
  functionality: string[];
  validation?: string[];
  tbc?: string[];
};

export const SCREEN_REQUIREMENTS: Record<Screen, ScreenReq> = {
  landing: {
    label: "Home (logged out)",
    summary: "Public landing page: browse the oripa catalogue before creating an account.",
    functionality: [
      "Header shows the product logo, a SIGN UP (新規登録) button and a LOGIN (ログイン) button.",
      "Promotional banner carousel auto-rotates every 5 seconds; tapping a dot jumps to that slide (7 slides).",
      "Full oripa lobby feed: category chips, sort control, Narrow down filter and oripa cards.",
      "Any card tap, Draw, Free draw or View routes the visitor to the Sign Up screen.",
      "Footer legal links (T&Cs, Privacy policy, SCTA, Anti-Social Forces policy) open the legal overlay.",
      "Bottom navigation bar is hidden on this screen.",
    ],
    validation: [
      "All draw/view interactions require an account, so they redirect to Sign Up.",
    ],
    tbc: [
      "Header logo is not clickable.",
      "Carousel has no swipe gesture (auto-rotate + dots only).",
      "Footer non-legal links (About, Customer support, category chips, social icons) do nothing.",
    ],
  },

  signup: {
    label: "Sign up",
    summary: "Create an account with email or a social provider.",
    functionality: [
      "Social sign-up buttons: LINE, Google, Apple (order LINE → Google → Apple).",
      "Email section (expanded by default): Email Address, Password, Date of Birth, Invitation Code (optional), Terms agreement checkbox.",
      "Date of Birth uses a year → month → day picker (selectable years 1931–2010).",
      "On valid submit, an Email Verification modal is shown; 'Open Email App' completes registration and lands the user in the lobby.",
      "Google/Apple open a simulated provider flow; LINE completes immediately (all land in the lobby).",
    ],
    validation: [
      "Email: required; must match a standard email format. On blur, invalid shows 'Please enter a valid email address.' (JA: 有効なメールアドレスを入力してください。)",
      "Password: required; minimum 8 characters. On blur, too short shows 'Password must be at least 8 characters.' (JA: パスワードは8文字以上で入力してください。)",
      "Date of Birth: required (a date must be selected).",
      "Invitation Code: optional; no validation.",
      "Terms agreement checkbox: required (must be checked).",
      "'Sign Up for Free' is disabled until email valid AND password valid AND date of birth set AND terms checked.",
    ],
    tbc: [
      "Password alphanumeric rule is only length-checked (label mentions alphanumeric).",
      "Minimum age (e.g. 18+) is not enforced.",
      "'Terms of Service' / 'Privacy Policy' links inside the checkbox are not clickable.",
      "'Resend email' in the verification modal does nothing.",
      "Real account creation, email delivery and link verification are mocked.",
      "Phone-number sign-up + OTP exists in code but is hidden.",
    ],
  },

  login: {
    label: "Log in",
    summary: "Sign in with email or a social provider.",
    functionality: [
      "Social login buttons: LINE, Google, Apple (simulated).",
      "Email section (expanded): Email Address and Password.",
      "'Login' signs in and lands the user in the lobby (no email verification step).",
    ],
    validation: [
      "Email: required; must match a standard email format (same rule as sign-up).",
      "Password: required; minimum 8 characters (same rule as sign-up).",
      "'Login' is enabled when email and password are valid.",
    ],
    tbc: [
      "Credentials are not verified against real accounts (any valid-format values succeed).",
      "Phone-number login + OTP exists in code but is hidden.",
    ],
  },

  oripa: {
    label: "Lobby / Home",
    summary: "Logged-in home feed of oripa draws, grouped into themed sections.",
    functionality: [
      "Header: logo → home, currency pill → Coin History, + → Store, bell → Notifications.",
      "Promotional banner carousel (auto-rotate + dots).",
      "Sticky category bar: All, New (新着), Hot (人気), Pokémon (ポケモン), Limited (限定), Others (その他); active chip shows a red label + underline.",
      "Themed sections (Recommended, New Arrivals, Just Added, Hot, Trending, Pokémon, Limited, Last Chance, Others, Oripa List); each non-Recommended section has a 'See all' that switches category.",
      "Recommended section (and the top 2 items in any single category) are emphasised with a red background and dividers.",
      "Sort control (Recommended, Most popular, Newest, Price low→high, Price high→low) and a Narrow down sheet (search + quick filters).",
      "Switching category scrolls the feed so the category bar returns to the top only if the promo banner has scrolled out of view.",
    ],
    validation: [
      "Search filters the feed live; when nothing matches, 'No packs match your search.' is shown.",
    ],
    tbc: [
      "Oripa card Draw / Free draw / View do nothing when logged in (gacha flow not built).",
      "Card artwork uses a shared placeholder image (real per-oripa art pending).",
      "Card price/tags are static placeholders.",
      "Header Points value is a fixed placeholder (10,000).",
    ],
  },

  notifications: {
    label: "Notifications",
    summary: "Personal notifications and service announcements.",
    functionality: [
      "Two tabs: 'Notifications for You' (あなたへの通知) and 'Announcements' (お知らせ), each with an unread count badge.",
      "Each item shows a date, title and body; shipping items also show a tracking number line.",
      "Unread items are highlighted with a red accent and a 'New' (新着) badge.",
      "Tapping an unread item marks it read (styling updates).",
      "Empty state shows 'No notifications' (通知がありません).",
      "Opened from My Account → Announcements, only the Announcements list is shown (tabs hidden).",
    ],
    tbc: [
      "Items do not deep-link anywhere when tapped.",
      "Marking items read does not clear the header bell badge.",
      "Notification content is sample data.",
    ],
  },

  prizeHistory: {
    label: "Winning history",
    summary: "Won prizes grouped by status, with filtering, exchange-to-coins and shipping requests.",
    functionality: [
      "Three tabs: Prizes Won (獲得景品), Waiting to Ship (発送待ち), Shipped (発送済み), each with a count badge.",
      "Header + tab bar stay pinned while the list scrolls; switching tabs scrolls the list to the top.",
      "Won cards show artwork, a rarity tag (Ultra / Gold / Silver), a selection toggle, title, description, exchange-period date and coin value.",
      "Narrow down sheet: search, 'Select by tier' chips (All/Ultra/Gold/Silver + counts + Select all), 'Quick filters' by category; Clear / Apply.",
      "Sort sheet: coin value high→low, low→high, won newest, won oldest, expiry soonest.",
      "Tapping a card toggles selection; a sticky action bar appears only when ≥1 prize is selected (Reset, Exchange to Coins, Request Shipping + coin subtotal).",
      "Exchange to Coins converts the selected prizes to coins, removes them from Won and shows a toast.",
      "Request Shipping opens the shipping flow; on confirm, prizes move to Waiting to Ship (delivery within 14 business days).",
      "Waiting cards show 'Preparing shipment' + request date; Shipped cards show a tracking number with a copy action.",
    ],
    validation: [
      "Shipping requires a minimum selected coin value. NOTE/INCONSISTENCY: on-screen hint says 'items totaling 500 coins or more' but the enforced minimum is currently 1,500 — to be confirmed and aligned.",
      "Below the threshold, Request Shipping is de-emphasised and a toast prompts the user to add more coin value.",
      "Changing category or search clears the current selection.",
    ],
    tbc: [
      "Prize data is sample data.",
    ],
  },

  myLoot: {
    label: "My Loot",
    summary: "Same layout as Winning history, filtered to only the most valuable (top-tier) prizes.",
    functionality: [
      "Shows only top-tier (UR) prizes across the Won / Waiting to Ship / Shipped tabs.",
      "Reachable from the bottom navigation 'My Loot' item and from My Account → My Loot.",
      "Back returns to the screen it was opened from.",
      "All Won-tab features (narrow down, sort, selection, exchange, shipping) behave as in Winning history.",
    ],
    validation: [
      "Same shipping threshold rules as Winning history.",
    ],
    tbc: [
      "Open question: whether the Won/Waiting/Shipped tabs should be shown or hidden in My Loot.",
    ],
  },

  purchaseHistory: {
    label: "Purchase history",
    summary: "Past coin purchases with date-range filtering and lazy loading.",
    functionality: [
      "Note that history for the past 3 months is available; older history requires contacting support.",
      "Each record shows date/time, status (Completed = green, Cancelled = red), coins, bonus points, JPY amount, masked payment method and payment ID.",
      "Date-range filter: All time, Last 7 days, Last 30 days, Last 90 days, Custom range; the filter button highlights when an active filter is applied and shows the active range.",
      "Applying a filter shows a brief skeleton loading state before results appear.",
      "'Load more' reveals 6 more records at a time with a staggered one-by-one animation; it hides when all records are shown.",
    ],
    validation: [
      "Custom range uses From and To date pickers with an Apply action; Reset returns to All time.",
      "When no records match the selected period, 'No purchases in the selected period.' is shown.",
    ],
    tbc: [
      "Records are sample data and are not updated by in-app purchases.",
      "Records are not tappable (no detail view).",
    ],
  },

  coinHistory: {
    label: "Coin History",
    summary: "Coin and point transaction history with balance summary and lazy loading.",
    functionality: [
      "Opens from the header currency pill; the summary card's + opens the Store.",
      "Summary card: live Coins balance, a Points value, and a coin-expiry message (e.g. '50 Coins will expire on 11/12 at 18:51!').",
      "Note that history for the past 3 months is available; older history requires contacting support.",
      "Transaction list types: Super Oripa Gacha, Oripa Gacha, Once-a-Day Gacha, Purchased Coins, Points Granted/Refunded, Points Expired.",
      "Each row shows date/time, a +/- amount with a colour-coded currency icon, and optional payment ID / expiry lines.",
      "'Load more' reveals 6 more transactions at a time with a staggered reveal; it hides when all are shown.",
    ],
    tbc: [
      "Transaction data is sample data and is not updated by purchases/draws.",
      "Points value in the summary is a fixed placeholder (10,000).",
    ],
  },

  store: {
    label: "Store",
    summary: "Buy coin packages / bundles / subscription and complete a (mocked) checkout.",
    functionality: [
      "Title 'Purchase Coins' (コイン購入); reachable from the header +, bottom-nav Store and Coin History +; back returns to the opener; the header logo returns to the lobby.",
      "Sections: loyalty/VIP bar (expand/collapse perks), first-time welcome offer, Limited Bundles (horizontal scroll), Buy Coins packages, Collector's Pass subscription.",
      "Package cards show coins, bonus points, JPY price, and (where applicable) a strikethrough original price and discount/emphasis badges.",
      "Selecting a package/bundle opens the checkout: package summary, payment method (Card, Apple Pay, Google Pay, PayPay, link), card + billing form, saved cards + card manager.",
      "Card payments go through a 3-D Secure style step; other methods proceed directly to a success screen.",
      "Success screen shows a purchase breakdown; Close adds the purchased coins to the balance.",
    ],
    validation: [
      "Card number: must be 14–16 digits, else 'Card number must be 14–16 digits'.",
      "Expiry: must be a valid future MM/YY, else 'Enter a valid future date (MM/YY)'.",
      "Required billing fields: first name, last name, address line 1, city, state (where applicable), ZIP.",
      "'Pay' is disabled until the card and required billing fields are valid.",
    ],
    tbc: [
      "Payment is mocked; no real payment provider is integrated.",
      "3-D Secure code is not validated; CVC and cardholder name are not validated.",
      "Apple Pay / Google Pay / PayPay / link are simulated.",
      "Only Coins (not Points) are credited on success; Purchase History and Coin History are not updated.",
      "Subscription state does not persist; loyalty perks, bundle inventory and countdown are static.",
      "Checkout Terms/Privacy links and 3-D Secure 'resend code' do nothing.",
    ],
  },

  shippingAddress: {
    label: "Address",
    summary: "Manage shipping addresses used for prize delivery.",
    functionality: [
      "Title 'Add or Change Shipping Address' (お届け先の追加・変更); lists saved addresses; empty state 'There are no registered delivery addresses.'",
      "Add a new address via a form supporting Japan and USA field sets, with a postcode lookup and a Register action.",
      "Each address supports edit, delete (with a confirmation) and set-as-default; the default shows a 'Default' (デフォルト) badge.",
      "Add / update / delete each show a confirmation toast.",
      "Back from the list returns to My Account; back from the form returns to the list.",
    ],
    validation: [
      "Required address fields must be completed before Register.",
      "Delete asks 'Do you want to delete this delivery address?' before removing.",
    ],
    tbc: [
      "Postcode lookup is mocked.",
      "Addresses do not persist beyond the session.",
    ],
  },

  mypage: {
    label: "My Account",
    summary: "Account hub: profile, balances, rank, menu, account actions and legal links.",
    functionality: [
      "Profile card: avatar, display name and ID.",
      "Balance card: Coins (live) and Points, plus a coin-expiry warning ('Coins expire in 3 days!').",
      "Rank card: current rank, amount to next level, progress bar and current/target points.",
      "My Menu: Quests, My Loot, Winning history, Purchase history, Invite Friends, FAQ, Support Inquiry, Announcements, Address, Subscriptions.",
      "Working menu items: My Loot, Winning history, Purchase history, Announcements, Address.",
      "Account section: Account Settings and Log out; Log out returns to the logged-out landing page.",
      "Other section: T&Cs, Privacy policy, Legal notice (SCTA), Basic Policy Against Anti-Social Forces open the legal overlay.",
      "Scroll position is preserved when returning from a sub-screen.",
    ],
    tbc: [
      "Edit profile, View Details (coin expiry), View Rank Benefits, Account Settings do nothing.",
      "Menu items Quests, Invite Friends, FAQ, Support Inquiry, Subscriptions do nothing.",
      "The two promo banners are not clickable.",
      "Profile name/ID and the Points value are placeholders.",
    ],
  },

  quest: {
    label: "Quests",
    summary: "Quests / missions area.",
    functionality: [],
    tbc: [
      "Not built — the bottom-nav 'Quests' label and the My Account 'Quests' item do nothing; no Quests screen exists.",
    ],
  },
};
