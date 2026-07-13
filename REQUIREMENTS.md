# Oripalot — Product Requirements (Current Build)

**Product:** Oripalot (Oripa gacha web app)
**Environment documented:** PROD prototype — https://oripa-prod-one.vercel.app/
**Document purpose:** Describe, as user stories with acceptance criteria and test scenarios, every capability that is currently built and functional, so the team can create development tickets. Capabilities that are visible but non-functional (buttons/links with no action) are marked **TBC/TBA** and collected in the register in §18.

---

## How to read this document

- Each **User Story** is intended to map to one development ticket (~2 dev-days or less; larger ones note where they should be split).
- **Acceptance criteria** describe observable behavior (pass/fail).
- **Test scenarios** use Given / When / Then.
- **[TBC/TBA]** = the control exists in the UI but performs no action today, OR the behavior is currently mocked and the real rule/integration is still to be defined. These are listed but not fully specified.
- **[POC-MOCK]** = the behavior works in the prototype but is driven by hardcoded/sample data and must be connected to real data/services for production.
- All user-facing screens are bilingual: **English (EN)** and **Japanese (JA)**. Every story implicitly requires both locales unless noted.
- Currency terms: **Coins** (JA: コイン) = paid/primary currency; **Points** (JA: ポイント (P)) = secondary/bonus currency.

---

## Feature map (Epics)

| # | Epic | Status summary |
|---|------|----------------|
| A | Authentication & Onboarding | Sign-up/login flows built (mock auth) |
| B | Global App Shell (header, nav, language, transitions) | Built |
| C | Lobby / Home Feed & Discovery | Built (browse only) |
| D | Oripa Draw / Gacha | **TBC/TBA** (not built) |
| E | Notifications & Announcements | Built (mock data) |
| F | My Account Hub | Built (partial menu wiring) |
| G | Winning History & Shipping Requests | Built |
| H | My Loot | Built |
| I | Purchase History | Built |
| J | Coin History | Built |
| K | Store & Purchase Flow | Built (mock payment) |
| L | Shipping Address Management | Built |
| M | Legal Documents | Built |
| N | Footer | Built (legal links only) |

---

# Epic A — Authentication & Onboarding

> Current build note: authentication is **[POC-MOCK]** — no real accounts are created and social providers are simulated. Stories below describe the built UI behavior; server-side account creation, credential verification, and OAuth are **[TBA]**.

## Story A1: View the logged-out landing page

**User story:** As a visitor, I want to see the landing page with the product's oripa catalogue so that I can explore before creating an account.

**Acceptance criteria**
1. The landing page shows a header with the product logo, a **SIGN UP** (JA: 新規登録) button, and a **LOGIN** (JA: ログイン) button.
2. The page shows a promotional banner carousel and the full oripa lobby feed (categories, sort, oripa cards).
3. The bottom navigation bar is hidden on the landing page.
4. Any card tap, **Draw**, **Free draw**, or **View** action on the landing page routes the visitor to the Sign Up screen.
5. Footer legal links (T&Cs, Privacy policy, Legal notice (SCTA), Basic Policy Against Anti-Social Forces) open the corresponding legal document overlay.
6. The landing header logo is **[TBC/TBA]** (not clickable).

**Test scenarios**

Scenario 1: Visitor lands logged out
- Given a visitor opens the app for the first time
- When the landing page loads
- Then the visitor sees SIGN UP and LOGIN in the header, a banner carousel, and the oripa feed, with no bottom navigation

Scenario 2: Visitor attempts to draw before registering
- Given a visitor is on the landing page
- When the visitor taps **Draw** on any oripa card
- Then the visitor is taken to the Sign Up screen

## Story A2: Sign up with email

**User story:** As a new user, I want to register with my email so that I can create an account.

**Acceptance criteria**
1. The Sign Up screen shows an "Sign up with Email" (JA: メールアドレスで登録) section, expanded by default.
2. Fields: Email Address (required), Password (required), Date of Birth (required), Invitation Code (optional), and a Terms agreement checkbox (required).
3. Email must match a standard email format; on blur, an invalid email shows: EN "Please enter a valid email address." / JA "有効なメールアドレスを入力してください。"
4. Password must be at least 8 characters; on blur, a short password shows: EN "Password must be at least 8 characters." / JA "パスワードは8文字以上で入力してください。"
5. Date of Birth is selected via a year → month → day picker (selectable year range 1931–2010); once set, a confirmation tick is shown.
6. The **Sign Up for Free** (JA: 無料で新規登録) button is disabled until email is valid, password is valid, a date of birth is selected, and the terms checkbox is checked.
7. On valid submission the user sees an Email Verification modal stating a verification email was sent to the entered address, with an **Open Email App** (JA: メールアプリを開く) action that completes registration and lands the user in the logged-in lobby.
8. Password complexity beyond length (e.g., alphanumeric enforcement) is **[TBA]** — the label mentions alphanumeric but only length is enforced today.
9. Minimum-age enforcement (e.g., 18+) is **[TBA]** — not enforced today.
10. The "Terms of Service" / "Privacy Policy" text links inside the agreement checkbox are **[TBC/TBA]** (not clickable).
11. The "DIDN'T RECEIVE THE EMAIL? RESEND EMAIL" action in the verification modal is **[TBC/TBA]**.
12. Real email delivery and link-based verification are **[TBA]** (currently the modal completes signup without a real email).

**Test scenarios**

Scenario 1: Successful email sign-up
- Given the user has entered a valid email, an 8+ character password, selected a date of birth, and checked the terms box
- When the user taps **Sign Up for Free** and then **Open Email App**
- Then the user is taken to the logged-in lobby

Scenario 2: Submit blocked by validation
- Given the user has left the terms checkbox unchecked
- When the user views the **Sign Up for Free** button
- Then the button is disabled and submission is not possible

Scenario 3: Invalid email format
- Given the user typed "notanemail" in the email field
- When the field loses focus
- Then the user sees "Please enter a valid email address." and the submit button remains disabled

## Story A3: Sign up / log in with a social provider

**User story:** As a new or returning user, I want to authenticate with LINE, Google, or Apple so that I can access the app quickly.

**Acceptance criteria**
1. Sign Up and Login screens show social buttons in order: LINE, Google, Apple, with locale-appropriate labels (e.g., EN "Sign up with LINE" / JA "LINEで登録"; login variant "Login with LINE" / "LINEでログイン").
2. Selecting Google opens an account-chooser and permission simulation; selecting Apple opens a sign-in sheet with a Face ID simulation; both end in a success state and land the user in the logged-in lobby.
3. Selecting LINE completes authentication and lands the user in the logged-in lobby.
4. Real OAuth/OIDC integration with LINE, Google, and Apple is **[TBA]** — providers are simulated with hardcoded accounts today.

**Test scenarios**

Scenario 1: Google sign-in simulation
- Given the user is on the Sign Up screen
- When the user taps "Sign up with Google", picks an account, and confirms permissions
- Then the user sees a success state and is taken to the logged-in lobby

Scenario 2: Apple sign-in simulation
- Given the user is on the Login screen
- When the user taps "Login with Apple" and completes the Face ID prompt
- Then the user sees "Signed in successfully" and is taken to the logged-in lobby

## Story A4: Log in with email

**User story:** As a returning user, I want to log in with my email and password so that I can access my account.

**Acceptance criteria**
1. The Login screen shows a "Login with Email" (JA: メールアドレスでログイン) section, expanded by default.
2. Email and password use the same format/length validation as sign-up.
3. The **Login** (JA: ログイン) button is enabled when email and password are valid and, on success, lands the user in the logged-in lobby (no email verification step).
4. Credential verification against real accounts is **[TBA]** (any valid-format credentials succeed today).

**Test scenarios**

Scenario 1: Successful email login
- Given the user entered a valid-format email and an 8+ character password
- When the user taps **Login**
- Then the user is taken to the logged-in lobby

## Story A5: Phone number sign-up / login with OTP — [TBC/TBA]

**User story:** As a user, I want to register/log in with my phone number and a one-time code.

**Status:** The UI for phone entry (country code + 10-digit number), a 6-digit OTP screen with a 30-second expiry countdown, resend, and "change number" exists in the codebase but is **hidden/disabled** in the current build. OTP validation, code delivery, and expiry enforcement are **[TBA]**. Not to be ticketed for build until product confirms scope.

## Story A6: Switch interface language

**User story:** As a user, I want to switch between English and Japanese so that I can use the app in my preferred language.

**Acceptance criteria**
1. A language toggle (EN / 日本語) is available and switches all user-facing copy between English and Japanese.
2. The selected language applies across all screens.
3. Note: today the toggle renders outside the phone frame (desktop preview). In-app placement of the language switch is **[TBC]**.

**Test scenarios**

Scenario 1: Toggle to Japanese
- Given the app is displayed in English
- When the user selects 日本語
- Then all labels, buttons, and content switch to Japanese

---

# Epic B — Global App Shell

## Story B1: Use the persistent app header (logged in)

**User story:** As a logged-in user, I want a header with my balances and quick access to key areas so that I can navigate from anywhere.

**Acceptance criteria**
1. The header shows the product logo, a combined currency pill (Points and Coins), an add (+) button, and a notifications bell.
2. Tapping the logo navigates to the lobby (home).
3. Tapping the currency pill opens Coin History.
4. Tapping the **+** button opens the Store.
5. Tapping the bell opens Notifications.
6. The Coins value reflects the user's live coin balance; the Points value is currently a fixed placeholder (`10,000`) and live Points balance is **[POC-MOCK]/[TBA]**.
7. The bell shows an unread badge when there are unread notifications. Today the badge count is static and does not clear when items are read — clearing the header badge on read is **[TBA]**.

**Test scenarios**

Scenario 1: Open Coin History from header
- Given a logged-in user on any main screen
- When the user taps the currency pill
- Then Coin History opens

Scenario 2: Return home via logo
- Given a logged-in user on the Store screen
- When the user taps the header logo
- Then the lobby (home) screen is shown

## Story B2: Navigate via the bottom navigation bar

**User story:** As a logged-in user, I want a bottom navigation bar so that I can move between the main areas of the app.

**Acceptance criteria**
1. The bottom nav shows five items in order: **Oripa** (home), **My Loot**, **Quests**, **Store**, **My Page**.
2. **Oripa** opens the lobby; **My Loot** opens the My Loot screen; **Store** opens the Store; **My Page** opens the account hub.
3. The active item is highlighted in brand red; while on Winning History, Purchase History, or Address, the **My Page** item stays highlighted.
4. The bottom nav is hidden on landing, sign-up, and login screens.
5. **Quests** is **[TBC/TBA]** — the item is shown but performs no action (no Quests screen exists).

**Test scenarios**

Scenario 1: Switch to Store
- Given a logged-in user on the lobby
- When the user taps **Store** in the bottom nav
- Then the Store screen opens and the Store item is highlighted

Scenario 2: Quests is inert
- Given a logged-in user
- When the user taps **Quests**
- Then nothing happens (no navigation) — [TBC/TBA]

## Story B3: Smooth screen transitions

**User story:** As a user, I want screen changes to animate smoothly so that navigation feels polished.

**Acceptance criteria**
1. When the content area changes between screens, the content below the header animates in (fade/slide) while the header itself does not animate.
2. Transitions are subtle and do not block interaction.

**Test scenarios**

Scenario 1: Content-only transition
- Given a user navigates from the lobby to My Page
- When the new screen loads
- Then the content below the header animates in while the header remains static

---

# Epic C — Lobby / Home Feed & Discovery

## Story C1: Browse the oripa lobby feed

**User story:** As a user, I want to browse oripa draws grouped into themed sections so that I can find packs I'm interested in.

**Acceptance criteria**
1. The lobby shows a promotional banner carousel above a sticky category bar, followed by themed sections (e.g., Recommended Oripa, New Arrivals, Just Added, Hot Right Now, Trending Now, Pokémon Featured, Pokémon Classics, Limited Time, Last Chance, Other Picks, Oripa List).
2. The "Recommended Oripa" section (and the top two items within any single category) are visually emphasized with a red background and decorative dividers.
3. Each themed section (except Recommended) has a **See all** (JA: すべて見る) action that switches the category filter to the matching category.
4. The category bar is sticky and remains visible while the feed scrolls.
5. Oripa banner artwork currently uses a shared placeholder image; rendering real per-oripa artwork is **[POC-MOCK]/[TBA]**.

**Test scenarios**

Scenario 1: See all for a section
- Given a user viewing the lobby "All" view
- When the user taps **See all** on "New Arrivals"
- Then the feed switches to the New category

## Story C2: Filter the feed by category

**User story:** As a user, I want to filter oripa by category so that I can narrow the feed.

**Acceptance criteria**
1. Category chips are shown: All, New (JA 新着), Hot/Popular (人気), Pokémon (ポケモン), Limited (限定), Others (その他).
2. Selecting a category filters the feed to that category; the active chip shows a red label and red underline.
3. When switching categories, if the promo banner has scrolled out of view, the feed scrolls so the sticky category bar returns to the top; if the banner is still visible, scroll position is left unchanged.

**Test scenarios**

Scenario 1: Filter to Pokémon
- Given a user on the lobby
- When the user taps the Pokémon category chip
- Then only Pokémon sections/items are shown and the chip is highlighted

Scenario 2: Scroll behavior on category change
- Given the user has scrolled past the promo banner
- When the user selects a different category
- Then the feed scrolls up so the category bar sits at the top

## Story C3: Search and narrow-down filter

**User story:** As a user, I want to search and apply quick filters so that I can find specific packs or cards.

**Acceptance criteria**
1. A **Narrow down** (JA: 絞り込み) control opens a filter sheet containing a search field and quick-filter chips (e.g., Most popular, New Arrivals, Only a few left, PSA10 confirmed, High return, Pokémon, One Piece, BOX).
2. Typing in search filters the feed live; matching results appear as a two-column grid; when nothing matches, the user sees EN "No packs match your search." / JA "一致するオリパがありません。"
3. **Clear** (JA: クリア) resets filters and the query; **Apply** (JA: 適用) closes the sheet.

**Test scenarios**

Scenario 1: Search with no matches
- Given the filter sheet is open
- When the user types a query that matches no packs
- Then the empty message is shown

Scenario 2: Clear filters
- Given the user has applied a quick filter
- When the user taps **Clear**
- Then filters and search reset to the default feed

## Story C4: Sort the feed

**User story:** As a user, I want to sort oripa so that I can order them by relevance, popularity, recency, or price.

**Acceptance criteria**
1. A sort control offers: Recommended order, Most popular, Newest, Price: Low→High, Price: High→Low (locale-appropriate labels).
2. Selecting an option reorders the feed accordingly.

**Test scenarios**

Scenario 1: Sort by price ascending
- Given the user on the lobby
- When the user selects "Price: Low→High"
- Then the feed reorders from lowest to highest price

---

# Epic D — Oripa Draw / Gacha — [TBC/TBA]

**Status:** The core gacha draw experience is **not built** in the current PROD app.
- Oripa cards show **Draw**, **Free draw**, and **View** buttons. For logged-out visitors these route to Sign Up; for logged-in users these buttons are **[TBC/TBA]** (no action).
- There is no oripa detail screen, no single/10-pull selection, no draw animation, and no draw-result screen.
- Card pricing and tags are currently static placeholders.

**Requires product definition and tickets for:** oripa detail view, pull options (×1 / ×10), cost/currency deduction rules, odds/rarity display, draw execution, result reveal, and how won items enter Winning History. Not specified here pending product input.

---

# Epic E — Notifications & Announcements

## Story E1: View personal notifications and announcements

**User story:** As a logged-in user, I want to view notifications and announcements so that I stay informed about my activity and service updates.

**Acceptance criteria**
1. Opening notifications from the header bell shows two tabs: "Notifications for You" (JA: あなたへの通知) and "Announcements" (JA: お知らせ).
2. Each item shows a date, a title, and a body; shipping-related items may show a tracking number line.
3. Unread items are visually distinguished (highlighted background, red accent) and show a "New" (JA: 新着) badge; each tab shows an unread count badge.
4. Tapping an unread item marks it as read (styling updates); there is no further navigation from an item.
5. Empty state shows EN "No notifications" / JA "通知がありません".
6. Notification content is currently sample data; connection to real user/service events is **[POC-MOCK]/[TBA]**.
7. Marking items read does not currently update the header bell badge — see Story B1 (**[TBA]**).

**Test scenarios**

Scenario 1: Read an unread notification
- Given the user opens Notifications with unread items
- When the user taps an unread item
- Then the item is marked read and its highlight/badge is removed

Scenario 2: Empty announcements
- Given there are no announcements
- When the user opens the Announcements tab
- Then "No notifications" is shown

## Story E2: View announcements-only from My Account

**User story:** As a user, I want an announcements-only view from My Account so that I can read service announcements directly.

**Acceptance criteria**
1. My Account → **Announcements** opens the notifications screen filtered to Announcements only, with the tab switcher hidden and the title "Announcements" (JA: お知らせ).
2. The back action returns to My Page.

**Test scenarios**

Scenario 1: Open announcements from My Account
- Given a user on My Page
- When the user taps **Announcements**
- Then the announcements-only list is shown with no tab switcher, and back returns to My Page

---

# Epic F — My Account Hub

## Story F1: View the My Account hub

**User story:** As a logged-in user, I want an account hub so that I can see my profile, balances, rank, and access account features.

**Acceptance criteria**
1. My Page shows: a profile card (avatar, display name, ID), a balance card (Coins and Points with a coin-expiry warning), a rank card, a "My Menu" grid, an Account section, and legal links.
2. The balance card shows the coin-expiry message "Coins expire in 3 days!" (JA: コインの有効期限はあと3日です！).
3. The rank card shows the current rank (e.g., Bronze), the amount to the next level, a progress bar, and the current/target points.
4. Profile name defaults to a placeholder (EN "Taro Yamada" / JA 山田 太郎) and ID shows "ID : XXXXXX" — real profile data binding is **[POC-MOCK]/[TBA]**.
5. Points value on the balance card is a fixed placeholder (`10,000`) — live Points is **[TBA]**.
6. The following controls are **[TBC/TBA]**: Edit profile, the decorative Coins **+** on the balance card, **View Details** (coin expiry), **View Rank Benefits**, **Account Settings**, and the two promo banners.

**Test scenarios**

Scenario 1: View account hub
- Given a logged-in user
- When the user opens My Page
- Then the profile, balance (with expiry warning), rank, menu, account, and legal sections are shown

## Story F2: Navigate My Menu items

**User story:** As a user, I want a menu of account features so that I can reach my loot, history, address, and announcements.

**Acceptance criteria**
1. My Menu shows items in order: Quests, My Loot, Winning history, Purchase history, Invite Friends, FAQ, Support Inquiry, Announcements, Address, Subscriptions.
2. Functional items: **My Loot** → My Loot screen; **Winning history** → Winning History; **Purchase history** → Purchase History; **Announcements** → announcements-only view; **Address** → Address management.
3. **[TBC/TBA]** items: Quests, Invite Friends, FAQ, Support Inquiry, Subscriptions.

**Test scenarios**

Scenario 1: Open Purchase History
- Given a user on My Page
- When the user taps **Purchase history**
- Then the Purchase History screen opens

Scenario 2: Inert menu item
- Given a user on My Page
- When the user taps **FAQ**
- Then nothing happens — [TBC/TBA]

## Story F3: Preserve My Page scroll position

**User story:** As a user, I want My Page to keep my scroll position when I return from a sub-screen so that I don't lose my place.

**Acceptance criteria**
1. When the user scrolls My Page, opens a sub-screen, and returns via back, My Page restores the previous scroll position (does not jump to top).

**Test scenarios**

Scenario 1: Return keeps position
- Given the user scrolled down My Page and opened Purchase History
- When the user taps back
- Then My Page is shown at the same scroll position as before

## Story F4: Log out

**User story:** As a user, I want to log out so that I can return to the logged-out state.

**Acceptance criteria**
1. The Account section shows a **Log out** (JA: ログアウト) action.
2. Tapping it returns the user to the logged-out landing page.
3. Full session/credential teardown is **[TBA]** (today it only returns to the landing screen).

**Test scenarios**

Scenario 1: Log out
- Given a logged-in user on My Page
- When the user taps **Log out**
- Then the logged-out landing page is shown

---

# Epic G — Winning History & Shipping Requests

## Story G1: View won prizes across statuses

**User story:** As a user, I want to view my won prizes grouped by status so that I can track and manage them.

**Acceptance criteria**
1. Winning History (title EN "Prize History" / JA 景品履歴) shows three tabs: Prizes Won (JA 獲得景品), Waiting to Ship (JA 発送待ち), Shipped (JA 発送済み), each with a count badge.
2. The header and tab bar stay pinned while the list scrolls; switching tabs scrolls the list to the top.
3. Won cards show: prize artwork, a rarity tag (Tier 1 Ultra / Tier 2 Gold / Tier 3 Silver), a selection state indicator, title, description, an exchange-period date, and a coin value.
4. Waiting cards show a "Preparing shipment" (JA 発送準備中) status and a request date, with a footer note that delivery is within 14 business days of the request date.
5. Shipped cards show a tracking number with a copy action that confirms via a toast.
6. Empty states are shown per tab (e.g., "Nothing waiting to ship" / 発送待ちの景品はありません).
7. Prize data is currently sample data — **[POC-MOCK]/[TBA]**.

**Test scenarios**

Scenario 1: Switch to Shipped and copy tracking
- Given the user has shipped prizes
- When the user opens the Shipped tab and taps copy on a tracking number
- Then the tracking number is copied and a confirmation toast is shown

Scenario 2: Tab switch scrolls to top
- Given the user scrolled down the Prizes Won list
- When the user switches to Waiting to Ship
- Then the list is shown from the top

## Story G2: Filter and sort won prizes

**User story:** As a user, I want to narrow down and sort my won prizes so that I can quickly find specific items.

**Acceptance criteria**
1. A **Narrow down** sheet provides: a search field, "Select by tier" chips (All, Ultra, Gold, Silver, with counts, plus "Select all"), and "Quick filters" for categories present in the data (e.g., All categories, Pokémon, One Piece, Baseball, Football).
2. Selecting a tier toggles selection of items of that tier within the current category scope; changing category or search clears the current selection.
3. **Clear** resets category, search, and selection; **Apply** closes the sheet.
4. A sort control offers: coin value high→low, coin value low→high, won newest, won oldest, expiry soonest.
5. The Narrow down control shows an indicator dot when a non-default category or search is active.

**Test scenarios**

Scenario 1: Filter by tier
- Given the Narrow down sheet is open
- When the user selects the "Gold" tier chip
- Then Gold-tier items in the current category become selected

Scenario 2: Sort by expiry
- Given the user has won prizes
- When the user selects "expiry soonest"
- Then prizes are ordered by soonest exchange expiry first

## Story G3: Select prizes and exchange to coins

**User story:** As a user, I want to select won prizes and exchange them for coins so that I can convert prizes I don't want to ship.

**Acceptance criteria**
1. On the Prizes Won tab, tapping a card toggles its selection (selected cards show an orange border and "Selected" state).
2. A sticky action bar appears only when at least one prize is selected, showing the selected count and coin subtotal, a **Reset** action, an **Exchange to Coins** action, and a **Request Shipping** action.
3. **Exchange to Coins** converts the selected prizes to coins, removes them from the Won list, and confirms via a toast.
4. **Reset** clears the current selection.

**Test scenarios**

Scenario 1: Exchange selected prizes
- Given the user has selected two won prizes
- When the user taps **Exchange to Coins**
- Then the two prizes are removed from Won and a confirmation toast is shown

Scenario 2: Action bar visibility
- Given no prizes are selected
- When the user views the Prizes Won tab
- Then the sticky action bar is not shown

## Story G4: Request shipping for selected prizes

**User story:** As a user, I want to request shipping for selected prizes so that they are delivered to my address.

**Acceptance criteria**
1. **Request Shipping** is available from the selection action bar and opens a shipping flow: choose an address (or add a new one) → confirm.
2. On confirmation, the selected prizes move from Won to Waiting to Ship and the user sees a confirmation toast referencing delivery within 14 business days.
3. A minimum-coin-value threshold applies to shipping requests. **[OPEN QUESTION / INCONSISTENCY]:** the on-screen hint states "you must select items totaling 500 coins or more" (JA: 合計500コイン以上), but the current enforced minimum is 1,500 coins. The correct threshold must be confirmed and the copy and enforcement aligned.
4. When the selection is below the threshold, the Request Shipping action is visually de-emphasized and tapping it shows a toast prompting the user to add more coin value.

**Test scenarios**

Scenario 1: Request shipping above threshold
- Given the user has selected prizes above the shipping threshold and has a saved address
- When the user taps **Request Shipping** and confirms the address
- Then the prizes move to Waiting to Ship and a confirmation toast is shown

Scenario 2: Below threshold
- Given the user's selection is below the shipping threshold
- When the user taps **Request Shipping**
- Then a toast prompts the user to add more coin value and the request does not proceed

---

# Epic H — My Loot

## Story H1: View top-tier loot

**User story:** As a user, I want a "My Loot" view of my most valuable prizes so that I can quickly see my best items.

**Acceptance criteria**
1. My Loot (title EN "My Loot" / JA 獲得商品) reuses the Winning History layout but shows only top-tier (UR) prizes.
2. My Loot shows the same Won / Waiting to Ship / Shipped tabs, each filtered to top-tier items.
3. My Loot is reachable from the bottom navigation **My Loot** item and from My Menu → **My Loot**.
4. Back from My Loot returns to the screen it was opened from.
5. **[NOTE / OPEN QUESTION]:** an earlier requirement was to hide the tabs in My Loot; the current build shows the tabs (later requirement was to show Won/Waiting/Shipped). Confirm the intended behavior.

**Test scenarios**

Scenario 1: Only top-tier prizes appear
- Given the user has prizes of mixed rarities
- When the user opens My Loot
- Then only top-tier (UR) prizes are listed

Scenario 2: Open from bottom nav
- Given a logged-in user
- When the user taps **My Loot** in the bottom nav
- Then the My Loot screen opens

---

# Epic I — Purchase History

## Story I1: View purchase history

**User story:** As a user, I want to view my past coin purchases so that I can review my transactions.

**Acceptance criteria**
1. Purchase History (title EN "Purchase History" / JA 購入履歴) shows a note that history for the past 3 months is available and older history requires contacting support.
2. Each record shows: date/time, status (Completed in green / Cancelled in red), coins purchased, bonus points, JPY amount, payment method (masked), and payment ID.
3. Records are not tappable (no detail view).
4. Purchase records are currently sample data and are not updated by in-app purchases — **[POC-MOCK]/[TBA]**.

**Test scenarios**

Scenario 1: View records
- Given the user opens Purchase History
- Then each record shows date, status, coins, points, JPY, payment method, and payment ID

## Story I2: Filter purchase history by date range

**User story:** As a user, I want to filter my purchase history by date so that I can find purchases in a specific period.

**Acceptance criteria**
1. A filter control offers presets: All time, Last 7 days, Last 30 days, Last 90 days, and Custom range.
2. Custom range provides From and To date pickers and an **Apply** action; a **Reset** action returns to All time and is shown whenever a non-default range is active.
3. The filter button visually indicates when an active (non-default) filter is applied and shows the active range label.
4. Applying any filter shows a brief loading state (skeleton placeholders) before the filtered results appear, so filtering feels responsive.
5. When no records match the selected period, the user sees EN "No purchases in the selected period." / JA 選択した期間の購入履歴はありません。
6. Selecting a filter resets pagination (see Story I3).

**Test scenarios**

Scenario 1: Apply Last 7 days
- Given the user is on Purchase History
- When the user selects "Last 7 days"
- Then a brief loading state is shown and only purchases within the last 7 days are listed

Scenario 2: Custom range with no matches
- Given the user opens the Custom range and selects a period with no purchases
- When the user taps **Apply**
- Then the empty-period message is shown

## Story I3: Load more purchase records (lazy loading)

**User story:** As a user, I want to load more records on demand so that the list stays fast and I only load what I need.

**Acceptance criteria**
1. The list initially shows 6 records; a **Load more** (JA: もっと見る) button loads the next 6 with a brief loading indicator.
2. Newly loaded records animate in one-by-one (staggered reveal).
3. When all records are loaded, the **Load more** button is hidden.
4. Load more operates on the currently filtered result set.

**Test scenarios**

Scenario 1: Load more reveals next page
- Given Purchase History shows the first 6 records and more exist
- When the user taps **Load more**
- Then the next 6 records animate in one-by-one

Scenario 2: Button hides when exhausted
- Given all records are displayed
- When the user views the end of the list
- Then no **Load more** button is shown

---

# Epic J — Coin History

## Story J1: View coin and point transaction history

**User story:** As a user, I want to see my coin and point transactions so that I can understand my balance changes.

**Acceptance criteria**
1. Coin History (title EN "Coin History" / JA コイン履歴) opens from the header currency pill and from the Coin History **+** (which opens the Store).
2. A summary card shows the live Coins balance (with an add **+** that opens the Store), a Points value, and a coin-expiry message (e.g., "50 Coins will expire on 11/12 at 18:51!").
3. A note states that history for the past 3 months is available and older history requires contacting support.
4. Each transaction shows: date/time, a type label (Super Oripa Gacha, Oripa Gacha, Once-a-Day Gacha, Purchased Coins, Points Granted/Refunded, Points Expired), an optional sub-label, an amount with +/- sign and currency icon (color-coded), and optional payment ID / expiry lines.
5. Transaction data is currently sample data and is not updated by in-app purchases/draws — **[POC-MOCK]/[TBA]**.
6. Points value on the summary is a placeholder (`10,000`) — live Points is **[TBA]**.

**Test scenarios**

Scenario 1: Open from header
- Given a logged-in user
- When the user taps the header currency pill
- Then Coin History opens showing the summary card and transaction list

## Story J2: Load more transactions (lazy loading)

**User story:** As a user, I want to load more transactions on demand so that the list stays fast.

**Acceptance criteria**
1. The list initially shows 6 transactions; a **Load more** button loads the next 6 with a staggered one-by-one reveal.
2. When all transactions are loaded, the **Load more** button is hidden.

**Test scenarios**

Scenario 1: Load more transactions
- Given Coin History shows the first 6 transactions and more exist
- When the user taps **Load more**
- Then the next 6 transactions animate in and the button eventually disappears when exhausted

---

# Epic K — Store & Purchase Flow

> Current build note: the checkout is a **[POC-MOCK]** — no real payment provider is integrated. On success, only the local Coins balance is increased; Points, Purchase History, and Coin History are not updated. Real payment processing, receipts, and balance/history write-back are **[TBA]**.

## Story K1: Browse the Store

**User story:** As a user, I want to browse coin packages so that I can choose how many coins to buy.

**Acceptance criteria**
1. The Store (title EN "Purchase Coins" / JA コイン購入) is reachable from the header **+**, the bottom nav **Store**, and the Coin History **+**; a back arrow returns to the opener.
2. The Store shows: a loyalty/VIP bar (with an expand/collapse "Show perks & rewards"), a first-time welcome offer bar, a horizontally-scrolling "Limited Bundles" section, a "Buy Coins" package list, and a Collector's Pass subscription section.
3. Each coin package shows coins, bonus points, price in JPY, and (where applicable) a strikethrough original price and a discount badge; promo packages show emphasis badges (e.g., MEGA BUNDLE, BEST VALUE).
4. Limited Bundles show name, coins, bonus points, price, original price, remaining/total inventory, and (for some) a HOT badge and a countdown.
5. The loyalty bar perks, the limited-bundle countdown, and inventory numbers are static/mock and do not change — **[POC-MOCK]/[TBA]**.
6. The header logo on the Store navigates to the lobby.

**Test scenarios**

Scenario 1: Open Store and view packages
- Given a logged-in user
- When the user taps the header **+**
- Then the Store opens showing bundles, coin packages, and the subscription section

## Story K2: Complete a coin purchase (checkout)

**User story:** As a user, I want to buy a coin package so that my coin balance increases.

**Acceptance criteria**
1. Tapping a package/bundle price or the welcome-offer CTA opens a checkout overlay with a summary of the selected package (coins, points, JPY).
2. Payment method options are shown: Card, Apple Pay, Google Pay, PayPay, link.
3. For **Card**, the user can enter card number, expiry, CVC, cardholder name, and a billing address; card number must be 14–16 digits (else "Card number must be 14–16 digits") and expiry must be a valid future MM/YY (else "Enter a valid future date (MM/YY)").
4. Required billing fields: first name, last name, address line 1, city, state (where applicable), ZIP; the **Pay** button is disabled until card and required billing fields are valid.
5. Saved cards (added within a session) can be reused, and a card manager allows viewing/deleting saved cards.
6. For Card payments the user is taken through a 3-D Secure style authentication step; for Apple Pay/Google Pay/PayPay/link the flow proceeds directly to success.
7. On success, the user sees a "Thank you for your purchase!" screen with a purchase breakdown and a **Close** action; closing adds the purchased coins to the balance.
8. **[POC-MOCK]/[TBA]:** payment is not really processed; 3-D Secure code is not validated; CVC and cardholder name are not validated; Apple/Google/PayPay/link are simulated; only Coins (not Points) are credited; Purchase History and Coin History are not updated; the checkout Terms/Privacy links and the 3-D Secure "resend code" are inert.

**Test scenarios**

Scenario 1: Card purchase (mock)
- Given the user selected a coin package and entered a valid card and billing address
- When the user taps **Pay** and completes the authentication step
- Then the success screen is shown and, on Close, the coin balance increases by the package amount

Scenario 2: Pay disabled on invalid card
- Given the user entered a 10-digit card number
- When the user views the **Pay** button
- Then it is disabled and an error indicates the card number must be 14–16 digits

Scenario 3: Alternative payment method (mock)
- Given the user selects Apple Pay
- When the user proceeds
- Then the flow goes directly to the success screen (no card entry)

## Story K3: Subscribe to Collector's Pass — [POC-MOCK]

**User story:** As a user, I want to subscribe to the Collector's Pass so that I receive recurring perks.

**Acceptance criteria**
1. The subscription card shows the price (¥980/month) and its perks, with a **Subscribe** action that opens the mock checkout.
2. After subscribing within a session, the card shows an "Active" state and a **Manage Subscription** action.
3. **[TBA]:** subscription persistence, real recurring billing, and a management screen — Manage Subscription currently only closes the Store, and the active state resets when leaving the Store.

**Test scenarios**

Scenario 1: Subscribe (mock)
- Given the user is on the Store
- When the user taps **Subscribe** and completes the mock checkout
- Then the subscription shows "Active" for the remainder of the session

---

# Epic L — Shipping Address Management

## Story L1: Manage shipping addresses

**User story:** As a user, I want to add, edit, delete, and set a default shipping address so that my prizes are delivered correctly.

**Acceptance criteria**
1. The Address screen (title EN "Add or Change Shipping Address" / JA お届け先の追加・変更) lists saved addresses; when none exist, it shows "There are no registered delivery addresses."
2. The user can add a new address via a form supporting Japan and USA field sets, with validation and a postcode lookup (mock), and a **Register** action.
3. Each saved address supports edit, delete (with a confirmation "Do you want to delete this delivery address?"), and set-as-default; the default address shows a "Default" (JA デフォルト) badge.
4. Add/update/delete each show a confirmation toast.
5. Back from the list returns to My Page; back from the form returns to the list.
6. Postcode lookup and address persistence beyond the session are **[POC-MOCK]/[TBA]**.

**Test scenarios**

Scenario 1: Add a new address
- Given the user is on the Address screen
- When the user taps "Add a new delivery address", fills required fields, and taps **Register**
- Then the address is saved, shown in the list, and a confirmation toast appears

Scenario 2: Delete an address
- Given the user has a saved address
- When the user taps delete and confirms
- Then the address is removed and a confirmation toast appears

---

# Epic M — Legal Documents

## Story M1: Read legal documents

**User story:** As a user, I want to read the legal documents so that I understand the terms and policies.

**Acceptance criteria**
1. Four documents are available: Terms of Use, Privacy Policy, Specified Commercial Transactions Act Notation (SCTA), and Basic Policy Against Anti-Social Forces.
2. Each opens in a bottom-sheet overlay over the current screen, with the document title, scrollable content (with a visible scroll indicator), and a close (X) action; tapping the dimmed backdrop also closes it.
3. Documents are reachable from My Account (Other section) and from the footer.
4. All legal content renders in the selected language and uses the app's standard typeface, including Japanese text.

**Test scenarios**

Scenario 1: Open Terms from My Account
- Given a user on My Page
- When the user taps **T&Cs**
- Then the Terms of Use overlay opens with scrollable content and a scroll indicator

Scenario 2: Close overlay
- Given a legal overlay is open
- When the user taps the backdrop or the close (X)
- Then the overlay closes and the underlying screen is shown

---

# Epic N — Footer

## Story N1: Global site footer

**User story:** As a user, I want a footer with company info and legal links so that I can access policies and support details.

**Acceptance criteria**
1. The footer appears at the bottom of scrollable screens and shows the product logo, copyright, a company blurb, link groups, follow/social icons, and support/payment information.
2. The footer's legal links open the corresponding overlays: T&Cs, Privacy policy, Legal notice (SCTA), Basic Policy Against Anti-Social Forces.
3. The Japan payment-inquiry line shows the support phone number **050-1724-7952** (both EN and JA).
4. All footer text renders in pure white and uses the app's standard typeface.
5. **[TBC/TBA]:** the non-legal footer links (About Oripalot, Customer support, category chips) and the social icons are display-only (no action). "Campaign terms" and "Responsible play" have been removed.

**Test scenarios**

Scenario 1: Footer legal link opens overlay
- Given a user viewing a screen with the footer
- When the user taps **Privacy policy** in the footer
- Then the Privacy Policy overlay opens

Scenario 2: Inert footer link
- Given a user viewing the footer
- When the user taps "About Oripalot"
- Then nothing happens — [TBC/TBA]

---

# §18. TBC/TBA Register (non-functional or mocked controls)

These controls are present in the UI but currently perform no action, or are simulated and require real integration/definition before production.

### Inert controls (no action today)
| Area | Control |
|------|---------|
| Landing header | Logo (not clickable) |
| Sign Up | "Terms of Service" / "Privacy Policy" text links inside terms checkbox; "Resend email" in verification modal |
| Bottom nav | **Quests** |
| Header (notifications sub-header) | **+** add button (no Store handler in that context) |
| My Page profile | Edit profile |
| My Page balance card | Decorative Coins **+**; **View Details** (does not open Coin History) |
| My Page rank card | **View Rank Benefits** |
| My Page menu | Quests, Invite Friends, FAQ, Support Inquiry, Subscriptions |
| My Page account | Account Settings |
| My Page | Promo Banner 1 & 2 |
| Lobby (logged-in) oripa cards | **Draw**, **Free draw**, **View** |
| Footer (all screens) | About Oripalot, Customer support, category chips, social icons, support phone (styled, not links) |
| Store | Loyalty perks (display only); educational welcome overlay (not shown by default) |
| Checkout | Terms of Service / Privacy Policy links; 3-D Secure "resend code" |

### Mocked behaviors (work in prototype, need real integration/rules) — [POC-MOCK]/[TBA]
| Area | Behavior needing production definition |
|------|----------------------------------------|
| Auth | Real account creation, email delivery + link verification, credential verification, OAuth (LINE/Google/Apple), phone OTP (validation, delivery, expiry) |
| Auth rules | Password alphanumeric rule; minimum age (18+) enforcement |
| Header/My Page | Live Points balance (currently fixed at 10,000); bell badge clearing on read |
| Profile | Real display name / user ID binding |
| Notifications | Real user/service events feeding notifications & announcements |
| Prizes | Real won-prize data; exchange-to-coins and shipping-request persistence |
| Shipping threshold | **Confirm correct minimum** — copy says 500 coins, enforcement is 1,500 (align copy + rule) |
| My Loot | Confirm whether tabs are shown or hidden |
| Purchase/Coin History | Real transaction data; write-back after purchases/draws |
| Store checkout | Real payment processing, 3-D Secure, CVC/cardholder validation, Apple/Google Pay/PayPay/link, receipts |
| Store balances | Credit Points (not just Coins); update Purchase & Coin History after purchase |
| Subscription | Persistence, recurring billing, management screen |
| Address | Postcode lookup; persistence beyond session |
| Oripa artwork | Real per-oripa banner images (placeholders used today) |

### Not built (whole feature) — [TBC/TBA]
- **Oripa Draw / Gacha** (Epic D): oripa detail, ×1/×10 pulls, cost/odds, draw execution, result reveal, feeding Winning History.
- **Quests** screen.
- **Invite Friends / Refer-a-Friend** screen (copy exists, screen not mounted).
- **FAQ** screen.
- **Support Inquiry** screen.
- **Subscriptions management** screen (from My Account).
- **Post-auth onboarding** (welcome modal, daily rewards, first-draw prompt, identity/address KYC) — copy exists, not wired.

---

# §19. Open questions to resolve before development

1. **Shipping minimum threshold:** Is the minimum 500 coins (as the copy states) or 1,500 coins (as enforced)? Align copy and rule.
2. **My Loot tabs:** Show Won/Waiting/Shipped tabs, or hide them? (Requirements have flipped.)
3. **Points currency:** Should Points be a live balance across header, My Page, and Coin History? What credits/debits Points?
4. **Draw/Gacha scope:** Full behavioral definition needed for Epic D.
5. **In-app language switch placement:** Where should the EN/JA toggle live inside the phone UI?
6. **Notification behavior:** Should tapping a notification deep-link anywhere (e.g., a shipped item to its tracking)? Should the header bell badge clear on read?
7. **Purchase write-back:** After a purchase, which of Coins, Points, Purchase History, and Coin History should update?
