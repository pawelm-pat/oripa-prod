"use client";

import { Fragment, createContext, useContext, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "./version";

const NotifNavContext = createContext<() => void>(() => {});

/* ════════════════════════════════════════════════════════════════════
   ORIPA — PROD skeleton (v1.0)
   Trimmed near-production preview. Only these surfaces are live:
     • Logged-out lobby (V1 homepage)   • Login / Sign-up bridge
     • Logged-in lobby (V2 format)      • Notifications
   Everything else is intentionally removed and re-introduced per sign-off.
   Bilingual EN / 日本語 toggle in the header.
═══════════════════════════════════════════════════════════════════════ */

// Minimum prize-coin total to request shipping (referenced by copy strings).
const SHIP_MIN_COINS = 1500;

type Lang = "en" | "ja";

type Category = "pokemon" | "onepiece" | "baseball" | "football";
const CATEGORIES: Category[] = ["pokemon", "onepiece", "baseball", "football"];

type SortKey = "coinDesc" | "coinAsc" | "wonNew" | "wonOld" | "expSoon";

const EN = {
  langLabel: "EN",
  prizeHistory: "Prize History",
  tabWon: "Prizes Won",
  tabWaiting: "Waiting to Ship",
  tabShipped: "Shipped",
  simulateExpiry: "Simulate expiry",
  wonAt: (d: string) => `Won ${d}`,
  shipBy: (d: string, e: string) => `Ship by ${d} · ${e}`,
  expired: "Expired",
  hLeft: (h: number) => `${h}h left`,
  dLeft: (d: number) => `${d}d left`,
  wonFooter: "Prizes not requested for shipping within 7 days are automatically converted to Oripa Coins.",
  wonEmptyTitle: "No prizes to action",
  wonEmptySub: "Prizes you win will appear here.",
  selected: "Selected",
  selOff: "Unselected",
  deckAll: "All",
  deckSwipeLeft: "Ship",
  deckSwipeRight: "Exchange",
  deckSwipeDown: "Skip for now",
  deckHint: "Swipe ← ship · → exchange · ↓ skip for now",
  deckBulkOn: "Bulk mode: one swipe moves every card shown",
  deckSorted: "Sorted prizes",
  deckEmpty: "All sorted!",
  deckEmptySub: "No prizes left in this view.",
  prizeTier: (n: number) => (["", "Ultra", "Gold", "Silver"][n] ?? `No.${n} prize`),
  deckCategoryAll: "All categories",
  cardCategory: (c: Category) => ({ pokemon: "Pokémon", onepiece: "One Piece", baseball: "Baseball", football: "Football" }[c]),
  searchOption: "Search…",
  searchPlaceholder: "Type to filter cards…",
  searchNoResults: "No cards match your search.",
  lobbySearchPlaceholder: "Search draws & cards…",
  lobbySearchResults: "Search results",
  lobbySearchEmpty: "No draws match your search.",
  selectAll: "Select all",
  reset: "Reset",
  viewAll: "List view",
  viewAllTitle: (n: number) => `All cards · ${n}`,
  exchange: "Exchange to Coins",
  requestShipping: "Request Shipping",
  helperNone: "Select prizes to exchange or request shipping.",
  helperReady: "Shipping is free · delivery within 14 business days.",
  helperShort: (n: number) => `Select ${n.toLocaleString()} more coins of prizes to request shipping (min ${SHIP_MIN_COINS.toLocaleString()}).`,
  toastSelectFirst: "Select one or more prizes first",
  toastShort: (n: number) => `Select ${n.toLocaleString()} more coins of prizes to request shipping (min ${SHIP_MIN_COINS.toLocaleString()})`,
  sortTitle: "Sort prizes",
  sortLabels: {
    coinDesc: "Coin value: high → low",
    coinAsc: "Coin value: low → high",
    wonNew: "Win date: newest first",
    wonOld: "Win date: oldest first",
    expSoon: "Expiration: soonest first",
  } as Record<SortKey, string>,
  convertTitle: "Exchange to Oripa Coins",
  convertQuestion: (n: number, c: number) => `Exchange ${n} prize${n > 1 ? "s" : ""} for ${c.toLocaleString()} coins?`,
  cantUndo: "This can't be undone.",
  cancel: "Cancel",
  exchangeBtn: "Exchange",
  silverBulkTitle: "Silver cards bundled",
  silverBulkBody: (n: number, c: number) => `We selected all ${n} Silver card${n > 1 ? "s" : ""} for you — exchange them together for ${c.toLocaleString()} coins.`,
  silverBulkCta: "Exchange for coins",
  silverBulkPick: "Choose individually",
  toastConverted: (n: number, c: number) => `${n} prize${n > 1 ? "s" : ""} exchanged for ${c.toLocaleString()} coins`,
  chooseAddress: "Choose shipping address",
  addNewAddress: "+ Add new address",
  continueBtn: "Continue",
  addNewTitle: "Add new address",
  country: "Country",
  postcode: "Postcode",
  postcodeHint: "Start typing your postcode to see suggestions",
  searching: "Searching addresses…",
  enterManually: "Enter address manually",
  selectAddress: "Select your address",
  phName: "Full name",
  phLine: "Street address",
  phCity: "City / postal code",
  phPhone: "Phone number",
  back: "Back",
  saveAddress: "Save address",
  confirmTitle: "Confirm shipping request",
  deliverTo: "Deliver to",
  prizesCount: (n: number) => `${n} prize${n > 1 ? "s" : ""}`,
  totalValue: "Total value",
  freeShip: "Free shipping · delivery within 14 business days.",
  requestShippingBtn: "Request Shipping",
  toastShipReq: "Shipping requested · delivery within 14 business days",
  requested: (d: string) => `Requested ${d}`,
  preparing: "Preparing shipment",
  waitingFooter: "Delivery within 14 business days from the request date.",
  waitingEmptyTitle: "Nothing waiting to ship",
  waitingEmptySub: "Prizes you request for shipping appear here.",
  tracking: "Tracking",
  copyAria: "Copy tracking code",
  toastCopied: (code: string) => `Tracking ${code} copied`,
  shippedEmptyTitle: "No shipped prizes yet",
  shippedEmptySub: "Delivered prizes are kept here for your records.",
  toastNoExpired: "No prizes past their 7-day window",
  toastAutoConverted: (n: number, total: number) => `${n} expired prize${n > 1 ? "s" : ""} auto-converted (+${total.toLocaleString()})`,
  backAria: "Back",
  notificationsAria: "Notifications",
  addCoinsAria: "Add coins",
  menuAria: "Open menu",
  menuTitle: "Menu",
  menuHome: "Home",
  navOripa: "Oripa",
  navItems: "Items won",
  navPrizeHistory: "Prize history",
  navQuest: "Quests",
  navStore: "Store",
  navMyPage: "My Account",
  comingSoon: "Coming soon",
  welcomeTitle: "Welcome to Oripa!",
  welcomeSub: "Claim your free coins now",
  welcomeCta: "Claim",
  welcomeVoice: "オリパへようこそ！",
  dailyTitle: "Daily Rewards",
  dailySub: "Log in every day to claim free coins!",
  dailyDay: (n: number) => `Day ${n}`,
  dailyToday: "Today",
  dailyClaim: (n: number) => `Claim ${n.toLocaleString()} coins`,
  dailyClaimShort: "Claim",
  dailyClaimed: "Claimed",
  dailyLocked: "Locked",
  dailyClaimedToast: (n: number) => `+${n.toLocaleString()} coins claimed!`,
  dailyComeBack: "Come back tomorrow for more!",
  dailyDone: "Done",
  dailyUltimate: "7-Day Login Bonus",
  dailyFreePt: "Free Pt",
  dailyTapClaim: "Tap to claim",
  dailyTapHint: "Tap Day 1 to claim your free coins",
  firstDrawTitle: "Time for your first draw!",
  firstDrawSub: "Your free coins are ready — pick the number of cards to draw and reveal your first prize!",
  firstDrawCta: "Draw now",
  firstDrawSkip: "Maybe later",
  firstDrawSelect: "Now select your draw",
  itemsTabNotSelected: "Not selected",
  itemsTabPending: "Pending",
  itemsTabShipped: "Shipped",
  itemsSortLabel: "Sort by highest coin value",
  itemsNotSelected: "Not selected",
  itemsSelected: "Selected",
  itemsExchangePeriod: "Exchange period:",
  itemsSelectAll: "Select All",
  itemsReset: "Reset",
  itemsExchangeForCoins: "Exchange for coins",
  itemsRequestDelivery: "Request Delivery",
  itemsDeliveryNote: "To request shipping, you must select items totaling 500 coins or more.",
  itemsName: "[1BOX] SHINY TREASURE",
  itemsDesc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.",
  accountName: "Taro Yamada",
  accountTier: "Member",
  menuAddresses: "Shipping addresses",
  menuPayment: "Payment methods",
  menuSettings: "Settings",
  menuLogout: "Log out",
  notifBar: "Notice: your points are expiring soon!",
  notifTabYou: "Notifications for You",
  notifTabNotice: "Announcements",
  notifEmpty: "No notifications",
  notifNew: "New",
  promoBanner: "PROMO BANNER",
  rewardHeadline: "Unlock special rewards!",
  rwDaily: "Daily",
  rwQuest: "Quest",
  rwInvite: "Invite",
  rwBox: "Daily Box",
  rwFirst: "First bonus",
  heroPts: (a: number, b: number) => `${a}/${b} pt`,
  heroDraw: "Oripa Draw",
  qmTitle: "MATSURI QUEST",
  qmUltimate: "ULTIMATE REWARD",
  qmMaxPrize: "MAX PRIZE",
  qmUrCard: "UR CARD",
  qmTask1: "Play 3 Pokémon draws",
  qmR1: "1 Free Draw",
  qmR2: "500 Coins",
  qmR3: "50 Free Pt",
  qmGetCoins: "Get Coins",
  coBadge: "Chain Offer",
  coTitle: "CHAIN OFFER",
  coSubtitle: "Each purchase unlocks the next step — bigger bonus every time.",
  coStep: (n: number) => `STEP ${n}`,
  coStep1: "Starter Reload",
  coStep2: "Value Pack",
  coStep3: "Mega Bundle",
  coBonus: (p: string) => `${p} BONUS`,
  coBuy: "Buy",
  coLocked: "Complete the previous step to unlock",
  coClaimed: "Purchased",
  coAllDone: "All steps claimed — enjoy!",
  coToast: (n: number) => `${n.toLocaleString()} coins added`,
  coEndsIn: "Ends in",
  catAll: "All",
  catNew: "New",
  catPopular: "Hot",
  catPokemon: "Pokemon",
  catLimited: "Limited",
  catOther: "Others",
  secRecommended: "Recommended Oripa",
  secList: "Oripa List",
  secNew: "New Arrivals",
  secJustAdded: "Just Added",
  secHot: "Hot Right Now",
  secTrending: "Trending Now",
  secPokemon: "Pokémon Featured",
  secPokemonClassic: "Pokémon Classics",
  secLimited: "Limited Time",
  secLastChance: "Last Chance",
  secOther: "Other Picks",
  tagPopular: "Popular",
  tagPokemon: "Pokémon",
  tagLv5: "LV5 only",
  tagSsr: "SSR guaranteed",
  periodLabel: (d: string) => `Open until ${d} (info area)`,
  perDraw: "/draw",
  endsIn: (m: number) => `Ends in ${m} min`,
  remainingLabel: "Remaining",
  remainingTimeLabel: "Remaining time",
  minUnit: (m: number) => `${m}min`,
  btn1Draw: "Draw ×1",
  btnDraw: "Draw",
  btnFree: "Free draw",
  btnView: "View",
  promo1: "PROMO BANNER 1 (e.g. LINE campaign / beginner guide)",
  promo2: "PROMO BANNER 2 (e.g. LINE campaign / beginner guide)",
  ftAbout: "About Oripalot",
  ftCategories: "Oripa Categories",
  ftFollow: "Follow us",
  ftCopyright: "© 2026 oripalot.com All rights reserved.",
  ftBlurb: "Oripalot (oripalot.com) lets you enjoy our social games for free anytime. Purchases are not required. Void where prohibited by law. T&Cs apply.",
  ftLinks: ["About Oripalot", "Customer support", "T&Cs", "Campaign terms", "Responsible play", "Privacy policy"],
  ftCats: ["Latest", "Trending", "Pokémon TCG", "Limited", "Other", "All"],
  ftSupport: "24/7 online support: Contact us",
  homeBannerTitle: "10,000 bonus coins",
  homeBannerSub: "First purchase campaign",
  homeFeatured: "Featured Oripa",
  draw1: "Draw ×1",
  draw10: "Draw ×10",
  remaining: (n: number) => `${n} left`,
  soldOut: "Sold out",
  homeFooter: "© Oripa Lot — demo",
  giBack: "Top",
  giPeriod: "Recruitment period: 2026/01/01 (limited time left)",
  giCardsLeft: (n: number) => `${n} cards until the prize`,
  giNotice: "Notes & usage guide",
  giNoticeBody: "Once a prize is drawn it cannot be drawn again. Prizes of 2nd place or higher are added to your Prize History.",
  gi1st: "1st Prize",
  gi2nd: "2nd Prize",
  gi3rd: "3rd Prize",
  giContents: "Prize line-up",
  giDrawn: "Drawn",
  giAvailable: "Available",
  giItem: "Item",
  giPrizeName: "Charizard ex",
  giDraw1: "Draw ×1",
  giDraw10: "Draw ×10",
  giDraw100: "Draw ×100",
  giDrawsLabel: "draws",
  giDrawCta: (n: number) => `Draw ×${n}`,
  giHaulNote: (n: number) => `Estimated prizes for ×${n} draws`,
  giBoostTitle: "Apply ×10 booster?",
  giBoostDesc: (n: number) => `Multiply your ${n} ${n === 1 ? "draw" : "draws"} by 10 — get ${n * 10} cards instead of ${n}!`,
  giBoostApply: (fee: number) => `Apply ×10 booster (+${fee.toLocaleString()})`,
  giBoostSkip: (n: number) => `No thanks, draw ×${n}`,
  giBoostBadge: "BEST VALUE",
  giBoostFeeNote: (fee: number) => `Only +${fee.toLocaleString()} coins for 10× the cards`,
  giModalTitle: "Gacha title",
  giModalDesc: "Gacha details! Gacha details! Gacha details! Gacha details! Gacha details! Gacha details!",
  giTnc: "T&Cs",
  giTncLink: "Here",
  giCancel: "Cancel",
  giTncTitle: "Terms & Conditions",
  giTncBody: [
    "1. Eligibility — You must hold a valid account and have sufficient Oripa Coins to participate in a draw. Coins are deducted at the moment the draw is confirmed.",
    "2. Draws are final — Once a draw is confirmed, the spent coins are non-refundable and the result cannot be cancelled, exchanged, or reversed.",
    "3. Prizes — Each prize is awarded as displayed. Prizes of 2nd place or higher are added to your Prize History and may be exchanged for coins or requested for shipping.",
    "4. Expiry — Prizes that are not requested for shipping within 7 days are automatically converted into Oripa Coins at their listed value.",
    "5. Shipping — Shipping requests require a minimum total of 1,500 coins of selected prizes. Delivery is made within 14 business days of a valid request.",
    "6. Odds — Rarity is determined randomly. Higher-tier prizes (1st prize) have a lower probability of being drawn.",
    "7. Fair use — Any fraudulent activity, abuse, or exploitation of bugs may result in suspension of your account and forfeiture of prizes.",
    "8. Changes — These terms may be updated at any time. Continued use of the service constitutes acceptance of the latest terms.",
  ],
  gachaResultTitle: "Gacha result",
  mpEditProfile: "Edit profile",
  mpId: "ID",
  mpOripaCoin: "Oripa Coin",
  mpFreePoint: "Free Point",
  mpCoinExpiry: "Your coins expire in 3 days!",
  mpViewDetails: "View details",
  mpCurrentRank: "Current rank",
  mpRankBronze: "Bronze",
  mpNextLevel: "to next level",
  mpRankPerks: "View ranking",
  mpRankingTitle: "Ranking",
  mpRankingSubtitle: "This month's top players",
  mpRankingYou: "You",
  mpRankingPts: (n: number) => `${n.toLocaleString()} pt`,
  mpMyMenu: "My Menu",
  mmQuest: "Quest",
  mmItems: "Items won",
  mmPrizeHistory: "Prize history",
  mmPurchases: "Purchase history",
  mmInvite: "Refer a Friend",
  mmFaq: "FAQ",
  mmContact: "Contact",
  mmNotices: "Notices",
  mmShippingAddress: "Shipping Address",
  mmSubscriptions: "Subscriptions",
  cancelSubscription: "Cancel Subscription",
  cancelSubTitle: "Cancel subscription?",
  cancelSubBody: "You'll lose all Collector's Pass perks at the end of your current period.",
  cancelSubYes: "Yes, cancel",
  cancelSubNo: "Keep plan",
  subCurrentPeriod: "Current period",
  shippingTitle: "Add or Change Shipping Address",
  shippingDesc: "Manage your delivery addresses below. You can add multiple addresses and choose a default.",
  shippingEmpty: "There are no registered delivery addresses.",
  shippingAddNew: "Add a new delivery address",
  shippingConfirmBtn: "Confirm",
  shippingDefaultLabel: "Default",
  shippingSetDefault: "Set as Default",
  shippingFormTitle: "Shipping Address",
  shippingCountry: "Country or Region",
  shippingJapan: "Japan",
  shippingUSA: "United States of America",
  shippingStreetNumber: "Street Number",
  shippingApartment: "Apartment, Room Number",
  shippingCityStreetNumber: "City, Street, Street Number",
  shippingState: "State",
  shippingZipCode: "Zip Code",
  shippingRegister: "Register",
  shippingConfirmTitle: "Address Confirmation",
  shippingConfirmQ: "Would you like to register this address?",
  shippingRegisterBtn: "Register Address",
  shippingCancel: "Cancel",
  shippingDeleteTitle: "Do you want to delete this delivery address?",
  shippingDeleteBtn: "Delete",
  toastShippingAdded: "Added a Shipping Address",
  toastShippingEdited: "Updated Shipping Address",
  toastShippingDeleted: "Deleted Shipping Address",
  mpAccountSection: "Account",
  mpEditAccount: "Account Settings",
  mpOtherSection: "Other",
  mpTerms: "T&Cs",
  mpPrivacy: "Privacy policy",
  mpLegal: "Legal notice (SCTA)",

  rafTitle: "Refer a friend",
  rafHeroTitle: "Earn extra rewards when you unlock milestones! Invite friends now!",
  rafHeroLead: "Get up to ",
  rafHeroCoins: "200,000 gold coins",
  rafHeroAnd: " and ",
  rafHeroPoints: "100 free sweepstakes",
  rafHeroTail: " coins when you refer friends.",
  rafCopy: "Copy",
  rafCopied: "Copied",
  rafShare: "Share Link",
  rafMilestones: "My Milestones",
  rafUnlocked: "Achievement unlocked!",
  rafClaim: "Claim",
  rafLevel: "Level 1",
  rafMyFriends: "My Friends",
  rafInvited: "Invited Friends",
  rafRewardsEarned: "Rewards Earned",
  rafQualified1: "Qualified For level 1",
  rafQualified2: "Qualified For level 2",
  rafFriendBoosts: "Friend Boosts",
  rafBoostDesc: "Remind a friend, unlock perks for them and progress toward your next reward",
  rafSendAll: "Send to All",
  rafFilter: "Filter",
  rafSendBoost: "Send Boost",
  rafSent: "Sent",
  rafLockedBtn: "Not available yet",
  rafFriendName: "Oripa Taro",
  rafFriendId: "ID : XXXXXX",
  rafTagFreeSpin: "+10 FREE SPIN",
  rafTagSpecial: "SPECIAL BOOST",
  rafTagQuests: "QUESTLINES",
  rafTagScSpin: "+10 FREE SC SPINS",
  rafHowItWorks: "How it works",
  rafStep1Title: "Share Your Exclusive Link",
  rafStep1Desc: "Send your exclusive invitation link to your friends.",
  rafStepRewardLead: "Get up to ",
  rafStepRewardCoins: "50,000 Coins",
  rafStepRewardMid: " + ",
  rafStepRewardPoints: "25 Points",
  rafStepRewardBang: "!",
  rafStep2Desc: "Rewards will be granted when the invited friend completes account verification and purchases a cumulative total of $100 or more in coins.",
  rafStep3Desc: "Furthermore, if the friend makes additional purchases reaching a cumulative total of $1,400 or more in coins, additional step-up rewards will be applied.",

  qHeroTitle: "Unlock Special Rewards!",
  qHeroDesc: "Take on the quests! Clear daily missions to earn quest rewards and aim for the ultimate reward!",
  qUltimate: "Ultimate Reward",
  qCoinsSuffix: "COINS",
  qEndsIn: "ENDS IN",
  qMission: "MISSION",
  qMissionTitle: "Win FREE SC 25 on slot games",
  qClaim: "Claim Reward",
  qGo: "Go",
  qRewards: "Rewards",
  qShowDetails: "Show Details",
  qDetailsBody: "Complete this mission by playing eligible slot games. Rewards are credited automatically once the target is reached.",
  qLocked: "Complete previous quests to unlock",

  faqTitle: "FAQ",

  profileTitle: "My Profile",
  profileAccountId: "Account ID",
  profileDisplayName: "Display Name",
  profilePersonalInfo: "Personal Information",
  profileRequired: "Required",
  profileSocialLinks: "Social Connect",
  profileAccountVerifications: "Account Verifications",
  profileIdVerification: "Verification Status",
  profilePaymentMethod: "Payment Method Verification",
  profilePaymentMethodField: "Payment Method",
  profilePaymentBullets: ["Both Front and Back of card must be uploaded.", "Must correspond with credit card number used on site.", "Please ensure that your card number is fully visible when submitting your document. Do not hide or mask any part of the card number, as this may result in verification failure."],
  profileCardNumber: "Card number",
  profileSelectCard: "Select card",
  profileSubmitProof: "Submit Proof of Payment Method",
  profilePendingVerification: "Pending verification",
  profileVerifiedCard: "Verified",
  jumioStartTitle: "Start verification",
  jumioStartDesc: "This process is designed to verify your identity and protect you from identity theft.",
  jumioStartBullets: ["Upload credit card", "Use a valid document", "Ensure that all the details on your document are clear and readable."],
  jumioNext: "Next",
  jumioUploadCardTitle: "Upload credit card",
  jumioUploadCardDesc: "Upload a color image of the whole document. Max. size: 2 images or 10 MB.",
  jumioCaptureImage: "Capture image",
  jumioUploadFile: "Upload file",
  jumioPageUploaded: "1 page uploaded",
  jumioProcessingTitle: "This will take a moment",
  jumioFinishing: "Finishing up...",
  profileSubmit: "Submit",
  profileKycNote: "We use our trusted partner for verification to meet with global KYC standards.",
  profileDocumentUpload: "Document Upload",
  profileDocumentNote: "Please upload the documents requested by our team. You can upload maximum of 15 documents under this section.",
  profileDocumentSelect: "Select Document",
  profileDocumentSubmit: "Submit",
  profileDocumentUploadBtn: "Upload",
  profileDocumentTypes: ["Bank Statement", "Tax Return", "Purchase Agreement", "Sale of an Asset", "Payslips", "Notarized ID", "Others"],
  profileDocumentHistory: "Upload History",
  profileDocumentPending: "UPLOAD PENDING...",
  profileDocumentPendingNote: "Wait until your document will be uploaded.",
  profileDocumentSuccess: "UPLOAD SUCCESSFUL!",
  profileDocumentSuccessNote: "You have successfully uploaded the document.",
  profileDocumentOkay: "Okay",
  profileDocumentApproved: "Approved",
  profileDocumentPendingStatus: "Pending",
  profileDocumentReview: "Review",
  profileChangePassword: "Change Password",
  profileOldPassword: "Old Password",
  profileNewPassword: "New Password",
  profileRepeatPassword: "Repeat New Password",
  profileChangePasswordBtn: "Change Password",
  profileNotifications: "Communication Preferences",
  profileEmailPref: "Email",
  profilePushPref: "Push",
  profileSmsPref: "SMS",
  profileLastName: "Last Name",
  profileFirstName: "First Name",
  profileLastNameKana: "Last Name (Kana)",
  profileFirstNameKana: "First Name (Kana)",
  profileEmail: "Email address",
  profileDob: "Date of Birth",
  profilePhone: "Phone Number",
  profilePostalCode: "Postal Code",
  profilePrefecture: "Prefecture",
  profileCity: "City, Street",
  profileBuilding: "Street Number / Apartment",
  profileSaveNote: "If your personal information changes, please contact Customer Support.",
  profileSave: "Save",
  profileSaved: "Saved!",
  profileStep1: "STEP ONE: ID VERIFICATION",
  profileStep2: "STEP TWO: PROOF OF ADDRESS",
  profileIdCheckDone: "You have successfully verified your ID.",
  profileAddressCheckDone: "You have successfully verified your address.",
  profileVerifNeeded: "Needed",
  profileVerifVerified: "Verified",
  profileStep1Desc: "In order to verify your identity, you need to upload a government-issued photo ID, such as a State or National ID, Passport or Driving Licence. You will also be required to take a selfie.",
  profileStep1Btn: "Submit ID",
  profileStep2Desc: "To verify your address, you must submit a utility bill, phone bill, bank statement or credit card statement. The document you submit must:",
  profileStep2Bullets: ["Be a high-quality scan or photograph", "Clearly show your name and address", "Be less than 90 days old"],
  profileStep2Pending: "Please submit document for proof of address",
  profileStep2Btn: "Submit proof of address",
  veriffIdTitle: "Confirm your identity",
  veriffIdDesc: "We'll ask for your ID and a selfie. It's quick and secure, and trusted by millions of users worldwide.",
  veriffAddrTitle: "Let's get your address confirmed",
  veriffAddrDesc: "We'll ask for proof of your address. It's quick and secure, and trusted by millions of users worldwide.",
  veriffLetsGo: "Let's go!",
  veriffPrivacy: "Your session audio and video may be recorded. Read more from Veriff's Privacy Notice.",
  veriffFullyVerified: "Your account is now fully verified",
  veriffCongrats: "CONGRATULATIONS,",
  veriffUnderstood: "Understood",
  veriffProceed: "Proceed to Lobby",
  profilePlaceholder: "Placeholder",
  purchaseHistoryTitle: "Purchase History",
  purchaseHistoryFilter: "Filter",
  purchaseHistoryNote: "*History from the past 3 months can be viewed. For older history, please contact customer support.",
  purchaseEmpty: "No purchase history",
  winEmptyTitle: "No prizes have been won yet.",
  winEmptySub: "This message will be displayed if you have won a prize of 2nd place or higher.",
  winEmptyCta: "GO TO ORIPA GACHA",
  purchaseStatusCompleted: "Completed",
  purchaseStatusCancelled: "Cancelled",
  purchaseFreePoints: (n: number) => `+ ${n.toLocaleString()} Free Points`,
  purchasePaymentMethod: "Payment Method",
  purchasePaymentId: "Payment ID",
  storeTitle: "Purchase Coins",
  storeSelectAmount: "Please select a top-up amount",
  storeLegalLink: "Click here for notation based on the Specified Commercial Transactions Act (Payment, Delivery, Cancellation, etc.)",
  storeSpecialOffers: "Special Offers",
  storeEduTitle: "Welcome to Oripalot!",
  storeEduSub: "Grab your first-time offer to start drawing — 90% OFF, just for new players!",
  storeEduSkip: "Maybe later",
  storeEduPick: "Recommended — start here!",
  storeCoinPurchase: "Coin Purchase",
  storeFirstTimeOffer: "FIRST-TIME OFFER",
  storePopularOffer: "POPULAR OFFER",
  storeWelcomeOfferTagline: "FIRST PURCHASE ONLY · LIMITED TIME",
  storeWelcomeOfferTitle: "Welcome Offer",
  storeWelcomeOfferSub: "New users only — one time offer",
  storeWelcomeOfferBonus: "+50 free bonus",
  loyaltyVipStatus: "VIP STATUS",
  loyaltyNextTier: "Next tier",
  loyaltySilver: "Silver",
  loyaltyGold: "Gold",
  loyaltyCoinsSpent: "coins spent",
  loyaltyToNext: (n: number, tier: string) => `${n.toLocaleString()} to ${tier}`,
  loyaltyShowPerks: "Show perks & rewards",
  loyaltyHidePerks: "Hide",
  loyaltyYourPerks: "YOUR PERKS",
  loyaltyUnlockNext: "UNLOCK NEXT",
  loyaltyPerk: "+10% coin bonus on purchase",
  loyaltyUnlock: "+15% coin bonus on purchase · Priority access",
  storeLimitedBundles: "Limited Bundles",
  storeLimitedTag: "LIMITED",
  storeEndsSoon: "Ends soon",
  storeHot: "HOT",
  storeRemaining: (n: number) => `Remaining ${n}`,
  storeRemainingOf: (n: number, t: number) => `Remaining ${n} / ${t}`,
  storeSoldPct: (n: number) => `${n}% sold`,
  storeFree: "free",
  storeBuy: "Buy",
  storeSpecialOffer: "Special Offer",
  storeBundleNames: ["Starter Pack", "Power Pack", "Whale Pack", "Elite Pack", "Mega Pack"] as string[],
  storeMegaBundles: "Mega Bundles",
  storeMegaHighValue: "HIGH VALUE",
  storeMegaBestFor: "Best for high spenders",
  storeMegaBadgePremium: "PREMIUM PACK",
  storeMegaBadgeBestValue: "BEST VALUE",
  storeMegaBadgeMega: "MEGA BUNDLE",
  storeMegaGetCta: (jpy: number) => `Get Mega Bundle — ¥${jpy.toLocaleString()}`,
  storeMegaBenefits: {
    drawTicket:     "Bonus draw ticket",
    exclusivePack:  "Exclusive pack access",
    rateBoost:      "Coin return rate up",
    jackpotTicket:  "Jackpot ticket",
    jackpotTicketX3:"Jackpot ticket ×3",
  } as Record<string, string>,
  storeCoins: (n: number) => `${n.toLocaleString()} Coins`,
  storeFreePoints: (n: number) => `Free Points ${n.toLocaleString()}`,
  storeOff: (n: number) => `${n}% OFF`,
  storeMemberRank: "Membership Rank",
  storePointsLabel: "Points",
  storePaymentMethod: "Payment Method",
  storeCreditCard: "Credit Card",
  storePurchasePoints: "Purchase Points",
  storeBuyNow: "Buy Now",
  storeApprox: "approx.",
  storeBeginner: "Beginner",
  storeRefreshAria: "Refresh balance",
  checkoutChooseCurrency: "Choose a currency:",
  checkoutExRate: (rate: string) => `1 JPY = ${rate} INR`,
  checkoutFee: "(includes 4% conversion fee)",
  checkoutOr: "OR",
  checkoutEmailLabel: "Email",
  checkoutPaymentMethod: "Payment method",
  checkoutCard: "Card",
  checkoutCardInfo: "Card information",
  checkoutCardNumPh: "1234 1234 1234 1234",
  checkoutExpiryPh: "MM / YY",
  checkoutCvcPh: "CVC",
  checkoutCardNameLabel: "Cardholder name",
  checkoutCardNamePh: "Full name on card",
  checkoutCountryLabel: "Country or region",
  checkoutBillingAddress: "Billing Address",
  checkoutBillingFirstNamePh: "First name",
  checkoutBillingLastNamePh: "Last name",
  checkoutBillingAddress1Ph: "Address*",
  checkoutBillingAddress2Ph: "Address (Optional)",
  checkoutBillingPOBoxNote: "Please do not enter a PO box address. Use a valid address",
  checkoutBillingCityPh: "City*",
  checkoutBillingStatePh: "Select state",
  checkoutBillingZipPh: "ZIP*",
  checkoutApplePay: "Apple Pay",
  checkoutSaveInfo: "Save my information for faster checkout",
  checkoutSaveSub: (m: string) => `Pay securely at ${m} and everywhere Link is accepted.`,
  checkoutPayBtn: "Pay",
  checkoutPoweredBy: "Powered by",
  checkoutDisclosures: "Commerce disclosures",
  checkoutTerms: "Terms of Service",
  checkoutPrivacy: "Privacy Policy",
  auth3dsCancel: "CANCEL",
  auth3dsInstructions: "Enter the authentication code sent to your email to authorise this payment.",
  auth3dsRefCode: "Reference Code:",
  auth3dsInputPh: "Auth code",
  auth3dsSubmit: "Authenticate",
  auth3dsResend: "Resend authentication code",
  successTitle: "Thank you for\nyour purchase!",
  successSub: "Your points have been added to your account",
  successOrderDetails: "ORDER DETAILS",
  successPaymentMethod: "PAYMENT METHOD",
  successDone: "Done",
  successPurchaseDetails: "Purchase Details",
  successClose: "Close",
  successBillingNote: "YOUR BILLING STATEMENT (BANK STATEMENT) WILL DISPLAY AS \"Oripalot\".",
  storeSubscriptions: "Subscriptions",
  storeCollectorsPass: "Collector's Pass",
  storeCollectorsPassTagline: "200 coins / day",
  storeCollectorsPassPerks: ["200 coins / day", "1 free pull / week", "Early access to new drops", "Exclusive drop alerts"] as string[],
  storeCollectorsPassPerkIcons: ["🟡", "🎴", "⚡", "🔔"] as string[],
  storeSubscribeCta: "Subscribe ¥980/mo",
  storeSubscribeLegal: "Cancel anytime · auto-renews monthly",
  storeManageSubscription: "Manage Subscription",
  storeSubscribedActive: "Active",
  storeSubscribedTitle: "Your active subscription",
  storeSuccessSubscription: "Collector's Pass\nActivated!",
  authSignUp: "SIGN UP",
  authLogin: "LOGIN",
  landingFeatured: "FEATURED ORIPA",
  tagRankLimited: "RANK LIMITED",
  tagSsrGuarantee: "SSR GUARANTEE",
  authEmailLabel: "Email Address",
  authPasswordLabel: "Password (At least 8 alphanumeric characters)",
  authDobLabel: "Date of Birth",
  authInviteLabel: "Invitation Code (Optional)",
  authAgreePrefix: "By registering, you agree to the ",
  authTermsOfService: "Terms of Service",
  authAnd: " and ",
  authPrivacyPolicy: "Privacy Policy",
  authAgreeEnd: ".",
  authSignUpFree: "Sign Up for Free",
  authSignUpOther: "Sign up with other methods",
  authSignUpApple: "Sign up with Apple",
  authSignUpGoogle: "Sign up with Google",
  authSignUpLine: "Sign up with LINE",
  authHaveAccount: "Already have an account?",
  authLogInLink: "Log In",
  authVerifyTitle: "Email Verification",
  authVerifyBody: (email: string) => `We have sent an email to ${email}. Please click the link within the email to complete the verification.`,
  authOpenEmailApp: "Open Email App",
  authVerifyNote: "If you didn't receive the email:",
  authVerifyBullets: ["It might have been filtered into your spam folder.", "Please double-check if the entered email address is correct."],
  authResendEmail: "DIDN'T RECEIVE THE EMAIL? RESEND EMAIL",
  authLoginTitle: "Login",
  authLoginSocial: "Login with Social",
  authLoginApple: "Login with Apple",
  authLoginGoogle: "Login with Google",
  authLoginLine: "Login with LINE",
  authAppleSheetTitle: "Sign in with Apple",
  authAppleSheetSignUp: "Create your Oripalot account using your Apple ID.",
  authAppleSheetLogin: "Sign in to Oripalot using your Apple ID.",
  authAppleAccountName: "John Appleseed",
  authAppleAccountEmail: "john.apple@icloud.com",
  authAppleFaceIdHint: "Tap anywhere to verify with Face ID",
  authAppleFaceIdScanning: "Face ID",
  authAppleSuccess: "Signed in successfully",
  authAppleSuccessSubSignUp: "Welcome to Oripalot!",
  authAppleSuccessSubLogin: "Welcome back!",
  authNoAccount: "Don't have an account?",
  authSignUpNow: "Sign up now",
  authGooglePickerTitle: "Choose an account",
  authGooglePickerSubtitle: "to continue to Oripalot",
  authGoogleAccount1Name: "John Doe",
  authGoogleAccount1Email: "john.doe@gmail.com",
  authGoogleAccount2Name: "John Work",
  authGoogleAccount2Email: "john.work@gmail.com",
  authGooglePermissionsTitle: "Sign in to Oripalot",
  authGooglePermissionsBody: "Oripalot wants to access your Google Account",
  authGooglePermissionItem1: "View your basic profile info (Name and Date of birth)",
  authGooglePermissionItem2: "View your email address",
  authGoogleContinue: "Continue",
  authGoogleCancel: "Cancel",
  authGoogleSuccess: "Signed in with Google",
  authGoogleSuccessSubSignUp: "Welcome to Oripalot!",
  authGoogleSuccessSubLogin: "Welcome back!",
  authLineVerificationTitle: "Verification",
  authLineCancel: "Cancel",
  authLineAppName: "OripaLot",
  authLineProvider: "Provider: OripaLot",
  authLineCertified: "Certified",
  authLineDescription: "OripaLot — Sign in with LINE",
  authLineCountry: "Country or region:",
  authLineCountryValue: "Japan",
  authLineGrantTitle: "Grant the following permissions to this service.",
  authLinePermission1: "Main profile info (Required)",
  authLinePermission2: "Your internal identifier (Required)",
  authLinePermission3: "Email address (Required)",
  authLineImportantTitle: "Important",
  authLineImportant1: "Make sure that you downloaded this app from OripaLot. OripaLot's provider is not liable for any damages caused by using unofficial sources of distribution.",
  authLineImportant2: "The handling of any personal information provided to this service, now and in the future, is the responsibility of OripaLot. Please refer to the service's Terms and Conditions of Use and Privacy Policy for more information.",
  authLineAllow: "Allow",
  authLineSuccess: "Signed in with LINE",
  authLineSuccessSubSignUp: "Welcome to Oripalot!",
  authLineSuccessSubLogin: "Welcome back!",
  authEmailError: "Please enter a valid email address.",
  authPasswordError: "Password must be at least 8 characters.",
  authDobPickerCancel: "Cancel",
  authDobPickerDone: "Done",
  authDobPickerYear: "YEAR",
  authDobPickerMonth: "MONTH",
  authDobPickerDay: "DAY",
  authPhoneSection: "Sign up with Phone Number",
  authEmailSection: "Sign up with Email",
  authPhoneLabel: "Phone Number",
  authPhoneError: "Phone number must be 10 digits.",
  authOtpTitle: "Enter Authentication Code",
  authOtpBodyPre: "Enter the 6-digit verification code sent to",
  authOtpBodyPost: "",
  authOtpExpiry: "Expiration:",
  authOtpAuthenticate: "Authenticate",
  authOtpResend: "Resend Verification Code",
  authOtpChangePhone: "Change Phone number",
  authOtpToast: "Verification code sent successfully",
  authLoginPhoneSection: "Login with Phone Number",
  authLoginEmailSection: "Login with Email",
  profileVerifyPhone: "Verify Phone Number",
  profilePhoneVerifySuccess: "Verification Successful!",
};

type Dict = typeof EN;

const JA: Dict = {
  langLabel: "日本語",
  prizeHistory: "景品履歴",
  tabWon: "獲得景品",
  tabWaiting: "発送待ち",
  tabShipped: "発送済み",
  simulateExpiry: "期限切れを再現",
  wonAt: (d) => `獲得 ${d}`,
  shipBy: (d, e) => `発送期限 ${d} · ${e}`,
  expired: "期限切れ",
  hLeft: (h) => `残り${h}時間`,
  dLeft: (d) => `残り${d}日`,
  wonFooter: "7日以内に発送依頼がない景品は、自動的にオリパコインに交換されます。",
  wonEmptyTitle: "対象の景品はありません",
  wonEmptySub: "獲得した景品はここに表示されます。",
  selected: "選択中",
  selOff: "未選択",
  deckAll: "すべて",
  deckSwipeLeft: "発送",
  deckSwipeRight: "交換",
  deckSwipeDown: "スキップ",
  deckHint: "← 発送依頼 · → 交換 · ↓ 後でスキップ",
  deckBulkOn: "一括モード：1回のスワイプで表示中のすべてを移動",
  deckSorted: "仕分けした景品",
  deckEmpty: "すべて仕分け完了！",
  deckEmptySub: "この表示に景品は残っていません。",
  prizeTier: (n) => (["", "ウルトラ", "ゴールド", "シルバー"][n] ?? `${n}等`),
  deckCategoryAll: "すべてのカテゴリ",
  cardCategory: (c) => ({ pokemon: "ポケモン", onepiece: "ワンピース", baseball: "野球", football: "サッカー" }[c]),
  searchOption: "検索…",
  searchPlaceholder: "カードを絞り込む…",
  searchNoResults: "検索に一致するカードがありません。",
  lobbySearchPlaceholder: "オリパ・カードを検索…",
  lobbySearchResults: "検索結果",
  lobbySearchEmpty: "検索に一致するオリパがありません。",
  selectAll: "すべて選択",
  reset: "リセット",
  viewAll: "リスト表示",
  viewAllTitle: (n) => `すべてのカード · ${n}`,
  exchange: "コインに交換",
  requestShipping: "発送依頼",
  helperNone: "交換または発送する景品を選択してください。",
  helperReady: "送料無料 · 14営業日以内にお届け。",
  helperShort: (n) => `発送依頼にはあと${n.toLocaleString()}コイン分の景品の選択が必要です（最低${SHIP_MIN_COINS.toLocaleString()}）。`,
  toastSelectFirst: "景品を1つ以上選択してください",
  toastShort: (n) => `発送依頼にはあと${n.toLocaleString()}コイン分の景品の選択が必要です（最低${SHIP_MIN_COINS.toLocaleString()}）`,
  sortTitle: "並び替え",
  sortLabels: {
    coinDesc: "コインが高い順",
    coinAsc: "コインが低い順",
    wonNew: "獲得日が新しい順",
    wonOld: "獲得日が古い順",
    expSoon: "期限が近い順",
  },
  convertTitle: "オリパコインに交換",
  convertQuestion: (n, c) => `${n}個の景品を ${c.toLocaleString()} コインに交換しますか？`,
  cantUndo: "この操作は取り消せません。",
  cancel: "キャンセル",
  exchangeBtn: "交換する",
  silverBulkTitle: "シルバーカードをまとめました",
  silverBulkBody: (n, c) => `${n}枚のシルバーカードをすべて選択しました。まとめて ${c.toLocaleString()} コインに交換できます。`,
  silverBulkCta: "コインに交換",
  silverBulkPick: "1枚ずつ選ぶ",
  toastConverted: (n, c) => `${n}個の景品を ${c.toLocaleString()} コインに交換しました`,
  chooseAddress: "お届け先を選択",
  addNewAddress: "＋ 新しい住所を追加",
  continueBtn: "次へ",
  addNewTitle: "新しい住所を追加",
  country: "国",
  postcode: "郵便番号",
  postcodeHint: "郵便番号を入力すると候補が表示されます",
  searching: "住所を検索中…",
  enterManually: "住所を手入力する",
  selectAddress: "住所を選択してください",
  phName: "氏名",
  phLine: "住所",
  phCity: "市区町村 / 郵便番号",
  phPhone: "電話番号",
  back: "戻る",
  saveAddress: "住所を保存",
  confirmTitle: "発送依頼の確認",
  deliverTo: "お届け先",
  prizesCount: (n) => `${n}個の景品`,
  totalValue: "合計価値",
  freeShip: "送料無料 · 14営業日以内にお届け。",
  requestShippingBtn: "発送を依頼",
  toastShipReq: "発送を依頼しました · 14営業日以内にお届け",
  requested: (d) => `依頼日 ${d}`,
  preparing: "発送準備中",
  waitingFooter: "依頼日から14営業日以内にお届けします。",
  waitingEmptyTitle: "発送待ちの景品はありません",
  waitingEmptySub: "発送依頼した景品はここに表示されます。",
  tracking: "追跡番号",
  copyAria: "追跡番号をコピー",
  toastCopied: (code) => `追跡番号 ${code} をコピーしました`,
  shippedEmptyTitle: "発送済みの景品はありません",
  shippedEmptySub: "お届け済みの景品は記録としてここに保存されます。",
  toastNoExpired: "7日間の期限を過ぎた景品はありません",
  toastAutoConverted: (n, total) => `期限切れの景品${n}個を自動交換しました（+${total.toLocaleString()}）`,
  backAria: "戻る",
  notificationsAria: "お知らせ",
  addCoinsAria: "コインを追加",
  menuAria: "メニューを開く",
  menuTitle: "メニュー",
  menuHome: "ホーム",
  navOripa: "オリパ",
  navItems: "獲得商品",
  navPrizeHistory: "プライズ履歴",
  navQuest: "クエスト",
  navStore: "ストア",
  navMyPage: "マイページ",
  comingSoon: "準備中",
  welcomeTitle: "オリパへようこそ！",
  welcomeSub: "無料コインを今すぐ受け取ろう",
  welcomeCta: "受け取る",
  welcomeVoice: "オリパへようこそ！",
  dailyTitle: "デイリーボーナス",
  dailySub: "毎日ログインして無料コインをゲット！",
  dailyDay: (n) => `${n}日目`,
  dailyToday: "今日",
  dailyClaim: (n) => `${n.toLocaleString()}コインを受け取る`,
  dailyClaimShort: "受け取る",
  dailyClaimed: "受取済",
  dailyLocked: "ロック中",
  dailyClaimedToast: (n) => `+${n.toLocaleString()}コインを獲得！`,
  dailyComeBack: "また明日受け取ってね！",
  dailyDone: "とじる",
  dailyUltimate: "7日間ログインボーナス",
  dailyFreePt: "フリーPt",
  dailyTapClaim: "タップで受取",
  dailyTapHint: "DAY 1 をタップして無料コインを受け取ろう",
  firstDrawTitle: "初めてのドローをしよう！",
  firstDrawSub: "無料コインをゲット！引く枚数を選んで、初めてのオリパを引いてみよう！",
  firstDrawCta: "引いてみる",
  firstDrawSkip: "あとで",
  firstDrawSelect: "引く枚数を選んでね",
  itemsTabNotSelected: "未選択",
  itemsTabPending: "配送待ち",
  itemsTabShipped: "発送済み",
  itemsSortLabel: "コイン価値が高い順",
  itemsNotSelected: "未選択",
  itemsSelected: "選択中",
  itemsExchangePeriod: "交換期限：",
  itemsSelectAll: "全選択",
  itemsReset: "リセット",
  itemsExchangeForCoins: "コインに交換",
  itemsRequestDelivery: "配送申請",
  itemsDeliveryNote: "配送申請には500コイン以上の商品を選択してください。",
  itemsName: "[1BOX] SHINY TREASURE",
  itemsDesc: "Lorem ipsum is simply dummy text of the printing and typesetting industry.",
  accountName: "山田 太郎",
  accountTier: "会員",
  menuAddresses: "お届け先住所",
  menuPayment: "お支払い方法",
  menuSettings: "設定",
  menuLogout: "ログアウト",
  notifBar: "通知メッセージ、ポイントの有効期限が迫っています！",
  notifTabYou: "あなたへの通知",
  notifTabNotice: "お知らせ",
  notifEmpty: "通知がありません",
  notifNew: "新着",
  promoBanner: "PROMO BANNER",
  rewardHeadline: "特別報酬を解放しよう！",
  rwDaily: "デイリー",
  rwQuest: "クエスト",
  rwInvite: "友達招待",
  rwBox: "デイリーBOX",
  rwFirst: "初回限定特典",
  heroPts: (a, b) => `${a}/${b} pt`,
  heroDraw: "オリパを引く",
  qmTitle: "祭りクエスト",
  qmUltimate: "アルティメット報酬",
  qmMaxPrize: "最大賞品",
  qmUrCard: "URカード",
  qmTask1: "ポケモンオリパを3回引く",
  qmR1: "無料ドロー ×1",
  qmR2: "コイン 500",
  qmR3: "フリーPt 50",
  qmGetCoins: "コインを購入",
  coBadge: "連続オファー",
  coTitle: "連続オファー",
  coSubtitle: "購入するたびに次のステップが解放。ボーナスもアップ！",
  coStep: (n) => `ステップ ${n}`,
  coStep1: "スターターリロード",
  coStep2: "バリューパック",
  coStep3: "メガバンドル",
  coBonus: (p) => `${p} ボーナス`,
  coBuy: "購入する",
  coLocked: "前のステップを完了すると解放されます",
  coClaimed: "購入済み",
  coAllDone: "全ステップ受取済み！",
  coToast: (n) => `${n.toLocaleString()} コインを獲得しました`,
  coEndsIn: "終了まで",
  catAll: "すべて",
  catNew: "新着",
  catPopular: "人気",
  catPokemon: "ポケモン",
  catLimited: "限定",
  catOther: "その他",
  secRecommended: "おすすめオリパ",
  secList: "オリパ一覧",
  secNew: "新着オリパ",
  secJustAdded: "入荷したばかり",
  secHot: "人気急上昇",
  secTrending: "急上昇ランキング",
  secPokemon: "ポケモン特集",
  secPokemonClassic: "ポケモン定番",
  secLimited: "期間限定",
  secLastChance: "ラストチャンス",
  secOther: "その他のおすすめ",
  tagPopular: "人気",
  tagPokemon: "ポケモン",
  tagLv5: "LV5限定",
  tagSsr: "SSR確定",
  periodLabel: (d) => `開催期間：${d} まで (重要情報エリア)`,
  perDraw: "/1回",
  endsIn: (m) => `終了まであと${m}分`,
  remainingLabel: "残り",
  remainingTimeLabel: "残り時間",
  minUnit: (m) => `${m}分`,
  btn1Draw: "1回ガチャ",
  btnDraw: "ガチャを引く",
  btnFree: "無料ガチャ",
  btnView: "内容を見る",
  promo1: "PROMO BANNER 1（例：LINEキャンペーン / 初心者ガイド）",
  promo2: "PROMO BANNER 2（例：LINEキャンペーン / 初心者ガイド）",
  ftAbout: "オリパロットについて",
  ftCategories: "オリパカテゴリー",
  ftFollow: "SNSをフォロー",
  ftCopyright: "© 2026 oripalot.com All rights reserved.",
  ftBlurb: "オリパロット（oripalot.com）では、当社のソーシャルゲームをいつでも無料でお楽しみいただけます。購入は必須ではありません。法律で禁止されている地域では無効となります。利用規約が適用されます。",
  ftLinks: ["オリパロットについて", "カスタマーサポート", "利用規約", "キャンペーン規約", "健全なプレイへの取り組み", "プライバシーポリシー"],
  ftCats: ["最新オリパ", "人気急上昇", "ポケカ", "限定", "その他", "すべて"],
  ftSupport: "24時間年中無休オンラインサポート: お問い合わせ",
  homeBannerTitle: "ボーナスコイン10,000",
  homeBannerSub: "初回購入キャンペーン",
  homeFeatured: "注目のオリパ",
  draw1: "1回引く",
  draw10: "10回引く",
  remaining: (n) => `残り${n}`,
  soldOut: "完売",
  homeFooter: "© オリパロット — デモ",
  giBack: "トップ",
  giPeriod: "募集期間：2026/01/01 まで（残り期限あり）",
  giCardsLeft: (n: number) => `カードまで残り${n}枚`,
  giNotice: "注意事項・ご利用ガイド",
  giNoticeBody: "一度排出された商品は再度排出されません。2等以上の商品は当選履歴に追加されます。",
  gi1st: "1等",
  gi2nd: "2等",
  gi3rd: "3等",
  giContents: "商品ラインナップ",
  giDrawn: "排出済み",
  giAvailable: "排出可能",
  giItem: "アイテム",
  giPrizeName: "リザードンex",
  giDraw1: "1回ガチャ",
  giDraw10: "10回ガチャ",
  giDraw100: "100回ガチャ",
  giDrawsLabel: "回",
  giDrawCta: (n) => `${n}回引く`,
  giHaulNote: (n) => `×${n}回の予想内訳`,
  giBoostTitle: "×10ブースターを適用しますか？",
  giBoostDesc: (n) => `${n}回を10倍に — ${n}枚ではなく${n * 10}枚ゲット！`,
  giBoostApply: (fee) => `×10ブースター適用 (+${fee.toLocaleString()})`,
  giBoostSkip: (n) => `そのまま${n}回引く`,
  giBoostBadge: "最高にお得",
  giBoostFeeNote: (fee) => `たった+${fee.toLocaleString()}コインでカード10倍`,
  giModalTitle: "ガチャタイトル",
  giModalDesc: "ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！ガチャの詳細説明！",
  giTnc: "T&Cs",
  giTncLink: "Here",
  giCancel: "キャンセル",
  giTncTitle: "利用規約",
  giTncBody: [
    "1. 参加条件 — ガチャに参加するには有効なアカウントと十分なオリパコインが必要です。コインはガチャ確定時に消費されます。",
    "2. 確定後の取消不可 — ガチャを確定すると、消費したコインは返金されず、結果のキャンセル・交換・取り消しはできません。",
    "3. 景品 — 各景品は表示どおりに付与されます。2等以上の景品は当選履歴に追加され、コインへの交換または発送依頼が可能です。",
    "4. 有効期限 — 7日以内に発送依頼がない景品は、表示価値に基づき自動的にオリパコインへ交換されます。",
    "5. 発送 — 発送依頼には選択した景品の合計が1,500コイン以上である必要があります。発送は有効なご依頼から14営業日以内に行われます。",
    "6. 排出確率 — レアリティはランダムに決定されます。上位景品（1等）ほど排出確率は低くなります。",
    "7. 不正利用 — 不正行為・濫用・不具合の悪用が確認された場合、アカウント停止および景品の没収となることがあります。",
    "8. 規約の変更 — 本規約は予告なく変更される場合があります。サービスの継続利用をもって最新の規約に同意したものとみなされます。",
  ],
  gachaResultTitle: "ガチャ結果",
  mpEditProfile: "プロフィール編集",
  mpId: "ID",
  mpOripaCoin: "オリパコイン",
  mpFreePoint: "フリーポイント",
  mpCoinExpiry: "コインの有効期限はあと3日です！",
  mpViewDetails: "詳細を確認",
  mpCurrentRank: "現在ランク",
  mpRankBronze: "ブロンズ",
  mpNextLevel: "次のレベルまで",
  mpRankPerks: "ランキングを見る",
  mpRankingTitle: "ランキング",
  mpRankingSubtitle: "今月のトップランカー",
  mpRankingYou: "あなた",
  mpRankingPts: (n: number) => `${n.toLocaleString()} pt`,
  mpMyMenu: "マイメニュー",
  mmQuest: "クエスト",
  mmItems: "獲得商品",
  mmPrizeHistory: "当選履歴",
  mmPurchases: "購入履歴",
  mmInvite: "友達紹介",
  mmFaq: "よくある質問",
  mmContact: "お問い合わせ",
  mmNotices: "お知らせ",
  mmShippingAddress: "配送先住所",
  mmSubscriptions: "サブスクリプション",
  cancelSubscription: "解約する",
  cancelSubTitle: "解約しますか？",
  cancelSubBody: "現在の期間終了後にコレクターズパスの特典がすべて失われます。",
  cancelSubYes: "はい、解約します",
  cancelSubNo: "プランを継続",
  subCurrentPeriod: "現在の期間",
  shippingTitle: "お届け先の追加・変更",
  shippingDesc: "配送先住所を管理できます。複数の住所を追加し、デフォルトを選択できます。",
  shippingEmpty: "登録済みの配送先住所がありません。",
  shippingAddNew: "新しい配送先住所を追加",
  shippingConfirmBtn: "確認",
  shippingDefaultLabel: "デフォルト",
  shippingSetDefault: "デフォルトに設定",
  shippingFormTitle: "配送先住所",
  shippingCountry: "国・地域",
  shippingJapan: "日本",
  shippingUSA: "アメリカ合衆国",
  shippingStreetNumber: "番地",
  shippingApartment: "建物名・部屋番号",
  shippingCityStreetNumber: "市区町村・番地",
  shippingState: "州",
  shippingZipCode: "郵便番号（ZIP）",
  shippingRegister: "登録",
  shippingConfirmTitle: "住所の確認",
  shippingConfirmQ: "この住所を登録しますか？",
  shippingRegisterBtn: "住所を登録",
  shippingCancel: "キャンセル",
  shippingDeleteTitle: "この配送先住所を削除しますか？",
  shippingDeleteBtn: "削除",
  toastShippingAdded: "配送先住所を追加しました",
  toastShippingEdited: "配送先住所を更新しました",
  toastShippingDeleted: "配送先住所を削除しました",
  mpAccountSection: "アカウント",
  mpEditAccount: "アカウント情報を変更",
  mpOtherSection: "その他",
  mpTerms: "利用規約",
  mpPrivacy: "プライバシーポリシー",
  mpLegal: "特定商取引法に基づく表記",

  rafTitle: "友達招待",
  rafHeroTitle: "紹介人数に応じてボーナス特典をロック解除！今すぐ友達を招待しよう！",
  rafHeroLead: "友達を紹介すると、",
  rafHeroCoins: "最大200,000コイン",
  rafHeroAnd: "＆",
  rafHeroPoints: "100無料ポイント",
  rafHeroTail: "がもらえます。",
  rafCopy: "コピー",
  rafCopied: "コピーしました",
  rafShare: "招待リンクをシェア",
  rafMilestones: "達成状況",
  rafUnlocked: "ミッション達成！",
  rafClaim: "受け取る",
  rafLevel: "紹介人数 レベル1",
  rafMyFriends: "友達一覧",
  rafInvited: "招待した人数",
  rafRewardsEarned: "獲得済みの報酬",
  rafQualified1: "シルバー達成者数",
  rafQualified2: "ゴールド達成者数",
  rafFriendBoosts: "友達を応援する",
  rafBoostDesc: "友達に通知を送って限定特典をプレゼントしましょう！紹介報酬のミッション達成にも近づきます。",
  rafSendAll: "全員に送る",
  rafFilter: "絞り込み",
  rafSendBoost: "応援を送る",
  rafSent: "送信済み",
  rafLockedBtn: "ロック中",
  rafFriendName: "オリパ太郎",
  rafFriendId: "ID : XXXXXX",
  rafTagFreeSpin: "無料スピン+10回",
  rafTagSpecial: "スペシャル応援",
  rafTagQuests: "限定クエスト",
  rafTagScSpin: "無料SCスピン+10回",
  rafHowItWorks: "紹介報酬の仕組み",
  rafStep1Title: "専用リンクをシェア",
  rafStep1Desc: "あなたの専用招待リンクを友達に送ります。",
  rafStepRewardLead: "最大 ",
  rafStepRewardCoins: "50,000 コイン",
  rafStepRewardMid: " + ",
  rafStepRewardPoints: "25 ポイント",
  rafStepRewardBang: "獲得！",
  rafStep2Desc: "招待された友達がアカウント認証を完了し、累計100ドル以上のコインを購入すると特典が付与されます。",
  rafStep3Desc: "さらに、友達が累計1,400ドル以上のコインを購入すると、追加のステップアップ特典が適用されます。",

  qHeroTitle: "特別報酬を解放しよう！",
  qHeroDesc: "クエストを攻略しよう！毎日のミッションを達成してクエスト報酬を獲得し、特別報酬を目指せ！",
  qUltimate: "特別報酬",
  qCoinsSuffix: "オリパコイン",
  qEndsIn: "終了まで",
  qMission: "ミッション",
  qMissionTitle: "スロットゲームで無料のSC 25を獲得する",
  qClaim: "受け取る",
  qGo: "挑戦する",
  qRewards: "報酬",
  qShowDetails: "詳細を表示",
  qDetailsBody: "対象のスロットゲームをプレイしてミッションを達成しましょう。目標を達成すると、報酬は自動的に付与されます。",
  qLocked: "アンロックするには前のクエストを完了してください",

  faqTitle: "よくある質問",

  profileTitle: "マイプロフィール",
  profileAccountId: "アカウントID",
  profileDisplayName: "表示名",
  profilePersonalInfo: "個人情報",
  profileRequired: "必要",
  profileSocialLinks: "SNS連携",
  profileAccountVerifications: "アカウント認証",
  profileIdVerification: "認証状況",
  profilePaymentMethod: "決済方法の確認",
  profilePaymentMethodField: "決済方法",
  profilePaymentBullets: ["カードの表面と裏面の両方をアップロードしてください。", "サイトで使用しているクレジットカード番号と一致している必要があります。", "書類を提出する際、カード番号が完全に見えるようにしてください。カード番号の一部を隠すと確認に失敗する場合があります。"],
  profileCardNumber: "カード番号",
  profileSelectCard: "カードを選択",
  profileSubmitProof: "決済方法の証明を提出",
  profilePendingVerification: "確認中",
  profileVerifiedCard: "確認済み",
  jumioStartTitle: "確認を開始",
  jumioStartDesc: "このプロセスはお客様の本人確認を行い、なりすまし被害から保護するためのものです。",
  jumioStartBullets: ["クレジットカードをアップロード", "有効な書類を使用してください", "書類の詳細が明確に読み取れることを確認してください。"],
  jumioNext: "次へ",
  jumioUploadCardTitle: "クレジットカードをアップロード",
  jumioUploadCardDesc: "書類全体のカラー画像をアップロードしてください。最大：2枚の画像または10MB。",
  jumioCaptureImage: "画像を撮影",
  jumioUploadFile: "ファイルをアップロード",
  jumioPageUploaded: "1ページアップロード済み",
  jumioProcessingTitle: "しばらくお待ちください",
  jumioFinishing: "完了中...",
  profileSubmit: "提出",
  profileKycNote: "グローバルKYC基準を満たすために、信頼できるパートナーを利用して確認を行います。",
  profileDocumentUpload: "書類アップロード",
  profileDocumentNote: "チームから依頼された書類をアップロードしてください。このセクションでは最大15件の書類をアップロードできます。",
  profileDocumentSelect: "書類を選択",
  profileDocumentSubmit: "提出",
  profileDocumentUploadBtn: "アップロード",
  profileDocumentTypes: ["銀行明細書", "税務申告書", "購入契約書", "資産売却証明", "給与明細", "公証ID", "その他"],
  profileDocumentHistory: "アップロード履歴",
  profileDocumentPending: "アップロード中...",
  profileDocumentPendingNote: "書類がアップロードされるまでお待ちください。",
  profileDocumentSuccess: "アップロード完了！",
  profileDocumentSuccessNote: "書類のアップロードが完了しました。",
  profileDocumentOkay: "確認",
  profileDocumentApproved: "承認済み",
  profileDocumentPendingStatus: "審査中",
  profileDocumentReview: "レビュー中",
  profileChangePassword: "パスワード変更",
  profileOldPassword: "現在のパスワード",
  profileNewPassword: "新しいパスワード",
  profileRepeatPassword: "新しいパスワード（確認）",
  profileChangePasswordBtn: "パスワードを変更",
  profileNotifications: "通知設定",
  profileEmailPref: "メール",
  profilePushPref: "プッシュ",
  profileSmsPref: "SMS",
  profileLastName: "姓",
  profileFirstName: "名",
  profileLastNameKana: "セイ（カタカナ）",
  profileFirstNameKana: "メイ（カタカナ）",
  profileEmail: "メールアドレス",
  profileDob: "生年月日",
  profilePhone: "電話番号",
  profilePostalCode: "郵便番号",
  profilePrefecture: "都道府県",
  profileCity: "市区町村・番地",
  profileBuilding: "建物名・部屋番号",
  profileSaveNote: "登録情報に変更がある場合は、カスタマーサポートまでご連絡ください。",
  profileSave: "保存",
  profileSaved: "保存しました！",
  profileStep1: "ステップ1：本人確認",
  profileStep2: "ステップ2：住所確認",
  profileIdCheckDone: "本人確認が完了しました。",
  profileAddressCheckDone: "住所確認が完了しました。",
  profileVerifNeeded: "未確認",
  profileVerifVerified: "確認済み",
  profileStep1Desc: "本人確認のため、国が発行した写真付きIDをアップロードし、自撮り写真を提出してください。",
  profileStep1Btn: "IDを提出",
  profileStep2Desc: "住所確認のため、公共料金の請求書、電話料金明細、銀行明細書またはクレジットカード明細書を提出してください。",
  profileStep2Bullets: ["鮮明なスキャンまたは写真であること", "氏名と住所が明確に記載されていること", "発行から90日以内のものであること"],
  profileStep2Pending: "住所証明書類を提出してください",
  profileStep2Btn: "住所証明書類を提出",
  veriffIdTitle: "本人確認",
  veriffIdDesc: "IDと自撮り写真をご提出いただきます。迅速・安全で、世界中の何百万人ものユーザーに信頼されています。",
  veriffAddrTitle: "住所確認",
  veriffAddrDesc: "住所証明書類をご提出いただきます。迅速・安全で、世界中の何百万人ものユーザーに信頼されています。",
  veriffLetsGo: "始める",
  veriffPrivacy: "セッションの音声・映像が記録される場合があります。詳細はVeriffのプライバシーポリシーをご確認ください。",
  veriffFullyVerified: "アカウントの確認が完了しました",
  veriffCongrats: "おめでとうございます、",
  veriffUnderstood: "了解しました",
  veriffProceed: "ロビーへ進む",
  profilePlaceholder: "Placeholder",
  purchaseHistoryTitle: "購入履歴",
  purchaseHistoryFilter: "フィルター",
  purchaseHistoryNote: "※過去3ヶ月の購入履歴を表示しています。それ以前の履歴はカスタマーサポートにお問い合わせください。",
  purchaseEmpty: "購入履歴がありません",
  winEmptyTitle: "まだ当選商品がありません",
  winEmptySub: "2等以上の商品を獲得した場合に表示されます",
  winEmptyCta: "オリパガチャへ",
  purchaseStatusCompleted: "完了",
  purchaseStatusCancelled: "キャンセル",
  purchaseFreePoints: (n: number) => `+ ${n.toLocaleString()} 無料ポイント`,
  purchasePaymentMethod: "支払い方法",
  purchasePaymentId: "支払いID",
  storeTitle: "コイン購入",
  storeSelectAmount: "チャージ金額を選択してください",
  storeLegalLink: "特定商取引法に基づく表記について(お支払い・ご提供・キャンセル等)はこちら",
  storeSpecialOffers: "スペシャルオファー",
  storeEduTitle: "オリパロットへようこそ！",
  storeEduSub: "初回限定オファーでガチャを始めよう — 新規プレイヤー限定90%OFF！",
  storeEduSkip: "あとで",
  storeEduPick: "おすすめ — ここから始めよう！",
  storeCoinPurchase: "コイン購入",
  storeFirstTimeOffer: "初回限定",
  storePopularOffer: "人気オファー",
  storeWelcomeOfferTagline: "初回購入限定 · 期間限定",
  storeWelcomeOfferTitle: "ウェルカムオファー",
  storeWelcomeOfferSub: "新規ユーザー限定 — 一度限りのオファー",
  storeWelcomeOfferBonus: "+50 ボーナス",
  loyaltyVipStatus: "VIPステータス",
  loyaltyNextTier: "次のランク",
  loyaltySilver: "シルバー",
  loyaltyGold: "ゴールド",
  loyaltyCoinsSpent: "コイン使用済み",
  loyaltyToNext: (n: number, tier: string) => `あと ${n.toLocaleString()} で${tier}`,
  loyaltyShowPerks: "特典・報酬を見る",
  loyaltyHidePerks: "閉じる",
  loyaltyYourPerks: "現在の特典",
  loyaltyUnlockNext: "次のアンロック",
  loyaltyPerk: "購入時コイン+10%ボーナス",
  loyaltyUnlock: "購入時コイン+15%ボーナス・優先アクセス",
  storeLimitedBundles: "限定バンドル",
  storeLimitedTag: "限定",
  storeEndsSoon: "終了間近",
  storeHot: "人気",
  storeRemaining: (n: number) => `残り ${n}`,
  storeRemainingOf: (n: number, t: number) => `残り ${n} / ${t}`,
  storeSoldPct: (n: number) => `${n}% 販売済み`,
  storeFree: "ボーナス",
  storeBuy: "購入",
  storeSpecialOffer: "スペシャルオファー",
  storeBundleNames: ["スターターパック", "パワーパック", "クジラパック", "エリートパック", "メガパック"] as string[],
  storeMegaBundles: "メガバンドル",
  storeMegaHighValue: "高価値",
  storeMegaBestFor: "ヘビースペンダー向け",
  storeMegaBadgePremium: "プレミアムパック",
  storeMegaBadgeBestValue: "最高コスパ",
  storeMegaBadgeMega: "メガバンドル",
  storeMegaGetCta: (jpy: number) => `メガバンドルを購入 — ¥${jpy.toLocaleString()}`,
  storeMegaBenefits: {
    drawTicket:     "ボーナスドローチケット",
    exclusivePack:  "限定パックアクセス",
    rateBoost:      "コイン還元率アップ",
    jackpotTicket:  "ジャックポットチケット",
    jackpotTicketX3:"ジャックポットチケット×3",
  } as Record<string, string>,
  storeCoins: (n) => `${n.toLocaleString()} コイン`,
  storeFreePoints: (n) => `フリーコイン ${n.toLocaleString()}`,
  storeOff: (n) => `${n}% OFF`,
  storeMemberRank: "会員ランク",
  storePointsLabel: "ポイント",
  storePaymentMethod: "お支払い方法",
  storeCreditCard: "クレジットカード",
  storePurchasePoints: "ポイント購入",
  storeBuyNow: "今すぐ購入",
  storeApprox: "約",
  storeBeginner: "ビギナー",
  storeRefreshAria: "残高を更新",
  checkoutChooseCurrency: "通貨を選択してください：",
  checkoutExRate: (rate) => `1 JPY = ${rate} INR`,
  checkoutFee: "（4%の換算手数料を含む）",
  checkoutOr: "または",
  checkoutEmailLabel: "メールアドレス",
  checkoutPaymentMethod: "支払い方法",
  checkoutCard: "カード",
  checkoutCardInfo: "カード情報",
  checkoutCardNumPh: "1234 1234 1234 1234",
  checkoutExpiryPh: "MM / YY",
  checkoutCvcPh: "CVC",
  checkoutCardNameLabel: "カード名義人",
  checkoutCardNamePh: "カードに記載の氏名",
  checkoutCountryLabel: "国または地域",
  checkoutBillingAddress: "請求先住所",
  checkoutBillingFirstNamePh: "名",
  checkoutBillingLastNamePh: "姓",
  checkoutBillingAddress1Ph: "住所*",
  checkoutBillingAddress2Ph: "住所（任意）",
  checkoutBillingPOBoxNote: "私書箱は入力しないでください。有効な住所を入力してください",
  checkoutBillingCityPh: "市区町村*",
  checkoutBillingStatePh: "都道府県を選択",
  checkoutBillingZipPh: "郵便番号*",
  checkoutApplePay: "Apple Pay",
  checkoutSaveInfo: "次回のために情報を保存する",
  checkoutSaveSub: (m) => `${m}およびLinkが使えるすべての場所で安全にお支払いいただけます。`,
  checkoutPayBtn: "支払う",
  checkoutPoweredBy: "Powered by",
  checkoutDisclosures: "商取引の開示",
  checkoutTerms: "利用規約",
  checkoutPrivacy: "プライバシーポリシー",
  auth3dsCancel: "キャンセル",
  auth3dsInstructions: "認証コードをご入力ください。",
  auth3dsRefCode: "リファレンスコード：",
  auth3dsInputPh: "認証コード",
  auth3dsSubmit: "認証する",
  auth3dsResend: "認証コードを再送",
  successTitle: "ご購入\nありがとうございます！",
  successSub: "ポイントがアカウントに追加されました",
  successOrderDetails: "注文内容",
  successPaymentMethod: "お支払い方法",
  successDone: "完了",
  successPurchaseDetails: "購入内容",
  successClose: "閉じる",
  successBillingNote: "銀行明細には「Oripalot」と表示されます。",
  storeSubscriptions: "サブスクリプション",
  storeCollectorsPass: "コレクターズパス",
  storeCollectorsPassTagline: "200コイン / 日",
  storeCollectorsPassPerks: ["200コイン / 日", "1回無料引き / 週", "新ドロップ先行アクセス", "限定ドロップ通知"] as string[],
  storeCollectorsPassPerkIcons: ["🟡", "🎴", "⚡", "🔔"] as string[],
  storeSubscribeCta: "¥980/月でサブスクライブ",
  storeSubscribeLegal: "いつでもキャンセル可・毎月自動更新",
  storeManageSubscription: "サブスクリプションを管理",
  storeSubscribedActive: "有効",
  storeSubscribedTitle: "ご利用中のサブスクリプション",
  storeSuccessSubscription: "コレクターズパス\n有効化完了！",
  authSignUp: "新規登録",
  authLogin: "ログイン",
  landingFeatured: "注目のオリパ",
  tagRankLimited: "ランク限定",
  tagSsrGuarantee: "SSR確定",
  authEmailLabel: "メールアドレス",
  authPasswordLabel: "パスワード（8文字以上の英数字）",
  authDobLabel: "生年月日",
  authInviteLabel: "招待コード（任意）",
  authAgreePrefix: "登録することで、",
  authTermsOfService: "利用規約",
  authAnd: "および",
  authPrivacyPolicy: "プライバシーポリシー",
  authAgreeEnd: "に同意します。",
  authSignUpFree: "無料で新規登録",
  authSignUpOther: "他の方法で登録",
  authSignUpApple: "Appleで登録",
  authSignUpGoogle: "Googleで登録",
  authSignUpLine: "LINEで登録",
  authHaveAccount: "すでにアカウントをお持ちですか？",
  authLogInLink: "ログイン",
  authVerifyTitle: "メール認証",
  authVerifyBody: (email: string) => `${email}にメールを送信しました。メール内のリンクをクリックして認証を完了してください。`,
  authOpenEmailApp: "メールアプリを開く",
  authVerifyNote: "メールが届かない場合：",
  authVerifyBullets: ["迷惑メールフォルダに振り分けられている可能性があります。", "入力したメールアドレスが正しいかご確認ください。"],
  authResendEmail: "メールが届きませんでしたか？再送する",
  authLoginTitle: "ログイン",
  authLoginSocial: "SNSでログイン",
  authLoginApple: "Appleでログイン",
  authLoginGoogle: "Googleでログイン",
  authLoginLine: "LINEでログイン",
  authAppleSheetTitle: "Appleでサインイン",
  authAppleSheetSignUp: "Apple IDでオリパロットのアカウントを作成します。",
  authAppleSheetLogin: "Apple IDでオリパロットにサインインします。",
  authAppleAccountName: "John Appleseed",
  authAppleAccountEmail: "john.apple@icloud.com",
  authAppleFaceIdHint: "画面をタップしてFace IDで認証",
  authAppleFaceIdScanning: "Face ID",
  authAppleSuccess: "サインイン完了",
  authAppleSuccessSubSignUp: "オリパロットへようこそ！",
  authAppleSuccessSubLogin: "おかえりなさい！",
  authNoAccount: "アカウントをお持ちでない方は？",
  authSignUpNow: "新規登録はこちら",
  authGooglePickerTitle: "アカウントを選択",
  authGooglePickerSubtitle: "オリパロットに続行",
  authGoogleAccount1Name: "山田 太郎",
  authGoogleAccount1Email: "taro.yamada@gmail.com",
  authGoogleAccount2Name: "山田 太郎（仕事）",
  authGoogleAccount2Email: "taro.work@gmail.com",
  authGooglePermissionsTitle: "オリパロットにサインイン",
  authGooglePermissionsBody: "オリパロットがGoogleアカウントへのアクセスを求めています",
  authGooglePermissionItem1: "基本的なプロフィール情報の閲覧（名前と生年月日）",
  authGooglePermissionItem2: "メールアドレスの閲覧",
  authGoogleContinue: "続行",
  authGoogleCancel: "キャンセル",
  authGoogleSuccess: "Googleでサインイン完了",
  authGoogleSuccessSubSignUp: "オリパロットへようこそ！",
  authGoogleSuccessSubLogin: "おかえりなさい！",
  authLineVerificationTitle: "確認",
  authLineCancel: "キャンセル",
  authLineAppName: "OripaLot",
  authLineProvider: "プロバイダー: OripaLot",
  authLineCertified: "認証済み",
  authLineDescription: "OripaLot — LINEでサインイン",
  authLineCountry: "国または地域：",
  authLineCountryValue: "日本",
  authLineGrantTitle: "このサービスへ次の権限を許可します。",
  authLinePermission1: "メインプロフィール情報（必須）",
  authLinePermission2: "内部識別子（必須）",
  authLinePermission3: "メールアドレス（必須）",
  authLineImportantTitle: "重要",
  authLineImportant1: "このアプリがOripaLotから正規にダウンロードされたものであることをご確認ください。非公式の配布元からのご利用による損害について、OripaLotは責任を負いかねます。",
  authLineImportant2: "このサービスに提供した個人情報の取り扱いについては、現在および将来にわたりOripaLotが責任を負います。詳細はサービスの利用規約およびプライバシーポリシーをご参照ください。",
  authLineAllow: "許可する",
  authLineSuccess: "LINEでサインイン完了",
  authLineSuccessSubSignUp: "オリパロットへようこそ！",
  authLineSuccessSubLogin: "おかえりなさい！",
  authEmailError: "有効なメールアドレスを入力してください。",
  authPasswordError: "パスワードは8文字以上で入力してください。",
  authDobPickerCancel: "キャンセル",
  authDobPickerDone: "完了",
  authDobPickerYear: "年",
  authDobPickerMonth: "月",
  authDobPickerDay: "日",
  authPhoneSection: "電話番号で登録",
  authEmailSection: "メールアドレスで登録",
  authPhoneLabel: "電話番号",
  authPhoneError: "電話番号は10桁で入力してください。",
  authOtpTitle: "認証コードを入力",
  authOtpBodyPre: "",
  authOtpBodyPost: "に送信された6桁の認証コードを入力してください",
  authOtpExpiry: "有効期限：",
  authOtpAuthenticate: "認証する",
  authOtpResend: "認証コードを再送する",
  authOtpChangePhone: "電話番号を変更する",
  authOtpToast: "認証コードを送信しました",
  authLoginPhoneSection: "電話番号でログイン",
  authLoginEmailSection: "メールアドレスでログイン",
  profileVerifyPhone: "電話番号を認証する",
  profilePhoneVerifySuccess: "認証が完了しました！",
};

const STR: Record<Lang, Dict> = { en: EN, ja: JA };

/* ── helpers ─────────────────────────────────────────────────────────── */
function locTitle(it: { title: string; titleJa?: string }, lang: Lang) {
  return lang === "ja" ? (it.titleJa ?? it.title) : it.title;
}

/* ── small UI atoms ──────────────────────────────────────────────────── */
function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/coin.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function GemIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/gem.png" alt="" aria-hidden className="shrink-0 inline-block object-contain" style={{ width: size, height: "auto" }} />
  );
}

function BrandLogo({ onClick }: { onClick?: () => void }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto shrink-0" />;
  if (onClick) {
    return (
      <button onClick={onClick} aria-label="Home" className="shrink-0">
        {img}
      </button>
    );
  }
  return img;
}

function BellIcon({ label }: { label: string }) {
  const openNotif = useContext(NotifNavContext);
  return (
    <button onClick={openNotif} aria-label={label} className="relative flex h-8 w-8 items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#B40206">
        <path d="M12 2a1.6 1.6 0 011.6 1.6v.7A6 6 0 0118 10c0 4 1.6 5.5 2.2 6.1a.8.8 0 01-.56 1.4H4.36a.8.8 0 01-.56-1.4C4.4 15.5 6 14 6 10a6 6 0 014.4-5.7v-.7A1.6 1.6 0 0112 2z" />
        <path d="M9.7 19.2a2.4 2.4 0 004.6 0z" />
      </svg>
      {NOTIF_UNREAD_TOTAL > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#ff2d2d] px-1 text-[9px] font-extrabold leading-none text-white ring-2 ring-white">{NOTIF_UNREAD_TOTAL}</span>
      )}
    </button>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center rounded-full border border-black/15 bg-white p-0.5">
      {(["en", "ja"] as Lang[]).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition"
            style={{ background: active ? "#B40206" : "transparent", color: active ? "#fff" : "#8a9099" }}
          >
            {l === "en" ? "EN" : "日本語"}
          </button>
        );
      })}
    </div>
  );
}

function BalancePill({ coins, t, onOpenStore }: { coins: number; t: Dict; onOpenStore?: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative mr-2.5">
        <button
          type="button"
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="flex items-center gap-2 rounded-full border border-black/15 bg-white py-1 pl-3 pr-5 shadow-[0_1px_3px_rgba(0,0,0,0.10)] transition active:scale-[0.97]"
        >
          <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#1d2129]">
            <GemIcon size={18} /> 10,000
          </span>
          <span className="h-4 w-px bg-black/15" />
          <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#1d2129]">
            <CoinIcon size={18} /> {coins.toLocaleString()}
          </span>
        </button>
        <button
          onClick={onOpenStore}
          aria-label={t.addCoinsAria}
          className="absolute right-0 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full"
          style={{ background: "#B40206", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
        </button>
      </div>
      <BellIcon label={t.notificationsAria} />
    </div>
  );
}

type OripaItem = { id: string; gem: boolean; free: boolean; remaining: number; total: number; endsIn: number; image?: string; title: string; titleJa?: string };
const RECOMMENDED_ORIPA: OripaItem[] = [
  { id: "r1", gem: true, free: false, remaining: 700, total: 1000, endsIn: 30, image: "/oripa-banner-1.png", title: "Pokémon 151 Special Oripa", titleJa: "ポケモン151スペシャルオリパ" },
  { id: "r2", gem: false, free: true, remaining: 320, total: 1000, endsIn: 12, image: "/oripa-banner-2.png", title: "One Piece Premium Oripa", titleJa: "ワンピース プレミアムオリパ" },
  { id: "r3", gem: false, free: true, remaining: 880, total: 1000, endsIn: 58, image: "/oripa-banner-3.png", title: "Weiss Schwarz Lucky Draw", titleJa: "ヴァイスシュヴァルツ ラッキードロー" },
];
const LIST_ORIPA: OripaItem[] = [
  { id: "l1", gem: true, free: false, remaining: 700, total: 1000, endsIn: 30, image: "/oripa-list-1.png", title: "Football Stars Oripa", titleJa: "サッカースター オリパ" },
  { id: "l2", gem: false, free: true, remaining: 150, total: 1000, endsIn: 8, image: "/oripa-list-2.png", title: "NBA Rookies Draw", titleJa: "NBAルーキー ドロー" },
  { id: "l3", gem: false, free: true, remaining: 540, total: 1000, endsIn: 44, image: "/oripa-list-3.png", title: "Soccer Premium Pack", titleJa: "サッカー プレミアムパック" },
];

type SectionIconKey = "star" | "new" | "popular" | "pokemon" | "limited" | "cards";
type HomeSection = { id: string; titleKey: string; icon: SectionIconKey; variant: "red" | "light"; cats: string[]; items: OripaItem[] };
// `cats: []` means the section only appears in the "All" feed.
const HOME_SECTIONS: HomeSection[] = [
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
function sectionIcon(icon: SectionIconKey, red: boolean) {
  const c = red ? "#fff" : "#1d2129";
  if (icon === "star") return <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" /></svg>;
  if (icon === "cards") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"><rect x="4.5" y="5" width="9" height="13" rx="1.4" transform="rotate(-10 9 11.5)" /><rect x="10" y="5" width="9" height="13" rx="1.4" transform="rotate(8 14.5 11.5)" /></svg>;
  return catIcon(icon, c);
}

type RewardKey = "rwDaily" | "rwQuest" | "rwInvite" | "rwBox" | "rwFirst";
function TagPill({ children, variant }: { children: React.ReactNode; variant: "redOutline" | "redFill" | "darkOutline" }) {
  const cls =
    variant === "redFill"
      ? "bg-[#B40206] text-white border border-[#B40206]"
      : variant === "redOutline"
        ? "border border-[#B40206] text-[#B40206]"
        : "border border-black/35 text-[#1d2129]";
  return <span className={`whitespace-nowrap rounded-full px-2 py-[1px] text-[10px] font-bold ${cls}`}>{children}</span>;
}

function OripaCard({ item, t, lang, onView, onDraw }: { item: OripaItem; t: Dict; lang: Lang; onView?: () => void; onDraw?: (count: number, free?: boolean) => void }) {
  const pct = Math.round((item.remaining / item.total) * 100);
  const price = (
    <span className="flex items-baseline">
      <span className="text-[15px] font-extrabold text-[#1d2129] underline decoration-[#B40206] decoration-2 underline-offset-2">1,000</span>
      <span className="text-[11px] font-bold text-[#8a9099]">{t.perDraw}</span>
    </span>
  );
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B40206" strokeWidth="1.8" strokeLinejoin="round" className="shrink-0"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
        <TagPill variant="redOutline">{t.tagPopular}</TagPill>
        <TagPill variant="redFill">{t.tagPokemon}</TagPill>
        <TagPill variant="darkOutline">{t.tagLv5}</TagPill>
        <TagPill variant="darkOutline">{t.tagSsr}</TagPill>
      </div>
      <h4 className="px-2.5 pt-1.5 text-[13.5px] font-extrabold leading-tight text-[#1d2129]">{locTitle(item, lang)}</h4>
      <div className="mx-2.5 mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#ededf0]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c2c6cc" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </div>
      <div className="mt-2.5 bg-[#1d1d1d] px-3 py-1 text-center text-[11px] font-bold text-white">{t.periodLabel("2026/01/01")}</div>
      <div className="flex items-stretch px-3 py-2.5">
        <div className="flex flex-col justify-center gap-1.5 border-r border-dashed border-black/20 pr-3">
          <span className="flex items-center gap-1.5"><CoinIcon size={20} />{price}</span>
          {item.gem && <span className="flex items-center gap-1.5"><GemIcon size={20} />{price}</span>}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 pl-3">
          <p className="flex items-baseline justify-center gap-0.5 leading-none">
            <span className="text-[13px] font-bold text-[#1d2129]">{t.remainingLabel}</span>
            <span className="text-[19px] font-extrabold text-[#1d2129]">{item.remaining}</span>
            <span className="text-[12px] font-bold text-[#8a9099]">/{item.total}</span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.08]"><span className="block h-full rounded-full bg-[#B40206]" style={{ width: `${pct}%` }} /></div>
          <p className="flex items-baseline justify-center gap-0.5 leading-none text-[#B40206]">
            <span className="text-[13px] font-bold">{t.remainingTimeLabel}</span>
            <span className="text-[17px] font-extrabold">{t.minUnit(item.endsIn)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={onView} className="flex-1 rounded-lg py-2 text-[12px] font-bold text-white" style={{ background: "#B40206" }}>{t.btnDraw}</button>
        {item.free && <button onClick={() => onDraw?.(1, true)} className="flex-1 rounded-lg border border-[#B40206] py-2 text-[12px] font-bold text-[#B40206]">{t.btnFree}</button>}
        <button onClick={onView} className="flex-1 rounded-lg border border-black/40 py-2 text-[12px] font-bold text-[#1d2129]">{t.btnView}</button>
      </div>
    </div>
  );
}

function PromoCarousel() {
  return (
    <div className="flex aspect-[8/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-[linear-gradient(135deg,#eef0f3,#e2e5ea)]">
      <div className="flex flex-col items-center gap-1.5 text-[#a2a8b0]">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-[11px] font-bold uppercase tracking-wide">Banner image</span>
      </div>
    </div>
  );
}

function RankMedallion({ tone, label, next = false }: { tone: "bronze" | "silver"; label: string; next?: boolean }) {
  const grad = tone === "bronze"
    ? "linear-gradient(160deg,#f0b27a 0%,#cd7f32 48%,#7a4a1d 100%)"
    : "linear-gradient(160deg,#ffffff 0%,#c9ced6 48%,#8b94a3 100%)";
  return (
    <span className="flex shrink-0 flex-col items-center" style={{ opacity: next ? 0.92 : 1 }}>
      <span
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
        style={{ background: grad, border: "2px solid rgba(255,255,255,0.5)", boxShadow: "0 3px 8px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.35)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.1 6.1-.7z" fill="rgba(255,255,255,0.94)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
        </svg>
      </span>
      <span className="mt-[1px] text-[8px] font-extrabold uppercase tracking-wide text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{label}</span>
    </span>
  );
}

function RankStrip({ t, onOpen }: { t: Dict; onOpen?: () => void }) {
  // POC: fixed rank progress (5/10 pt from Bronze toward Silver).
  // The bar is deliberately static — no fill/sheen animation.
  const pts = 5, next = 10;
  const pct = (pts / next) * 100;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t.mpCurrentRank}: ${t.mpRankBronze} — ${t.heroPts(pts, next)} — ${t.loyaltyNextTier}: ${t.loyaltySilver}`}
      className="relative block h-[50px] w-full transition-transform active:scale-[0.99]"
    >
      {/* Gold-framed bar pill spanning between the medallion centres — its
          ends tuck underneath the medallions (bar starts/finishes within the
          icons, reference layout). */}
      <span
        className="absolute inset-x-[19px] top-[6px] block h-[26px] rounded-full p-[2px] shadow-[0_5px_14px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(180deg,#ffe08a,#c9a84c 55%,#7d5f1a)" }}
      >
        <span
          className="relative block h-full w-full overflow-hidden rounded-full bg-[#12070a]"
          style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.05)" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={next}
          aria-valuenow={pts}
        >
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(180deg,#5ff08a 0%,#2ecc71 45%,#128a43 100%)", boxShadow: "0 0 8px rgba(62,220,120,0.5)" }}>
            <span className="absolute inset-x-1 top-[2px] h-[5px] rounded-full bg-white/35" />
            {pct > 0 && pct < 100 && (
              <span className="absolute -right-[2px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[#eafff0]" style={{ boxShadow: "0 0 7px 2px rgba(150,255,190,0.8)" }} />
            )}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}>
            {t.heroPts(pts, next)}
          </span>
        </span>
      </span>
      {/* Medallions sit on top of the bar ends, larger than the bar */}
      <span className="absolute left-0 top-0"><RankMedallion tone="bronze" label={t.mpRankBronze} /></span>
      <span className="absolute right-0 top-0"><RankMedallion tone="silver" label={t.loyaltySilver} next /></span>
    </button>
  );
}

/* Chunky beveled "game UI" label: gold gradient fill clipped to the glyphs,
   dark outline + drop built from stacked drop-shadows (MB-style type). */
const HERO_LABEL_STYLE: React.CSSProperties = {
  backgroundImage: "linear-gradient(180deg,#fff7d1 0%,#ffd23f 42%,#f6a821 58%,#ffe98a 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter:
    "drop-shadow(0 1.2px 0 #3a1204) drop-shadow(0 -1px 0 #3a1204) drop-shadow(1px 0 0 #3a1204) drop-shadow(-1px 0 0 #3a1204) drop-shadow(0 2px 3px rgba(0,0,0,0.55))",
};

function HeroBadge({ img, label, badge, onClick }: { img: string; label: string; badge?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="relative flex w-[80px] flex-col items-center transition-transform active:scale-90">
      {/* Free-floating art IS the button (MB-style — no containing frame) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="h-[72px] w-[72px] object-contain drop-shadow-[0_7px_12px_rgba(0,0,0,0.5)]" />
      <span className="-mt-1 max-w-[80px] text-center text-[11.5px] font-black uppercase leading-[0.95] tracking-tight" style={HERO_LABEL_STYLE}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-0 z-10 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white/85 bg-gradient-to-b from-[#ff5a5f] to-[#B40206] px-1 text-[11px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]">{badge}</span>
      )}
    </button>
  );
}

function HomeHero({ t, onReward, onOpenStore, onChain, onRank, onDraw, showRank = true }: { t: Dict; onReward?: (key: RewardKey) => void; onOpenStore?: () => void; onChain?: () => void; onRank?: () => void; onDraw?: () => void; showRank?: boolean }) {
  // Daily-bonus claim-window countdown. Starts from a fixed value so SSR and
  // the first client render match, then ticks once mounted (POC only — not
  // wired to a real reset time).
  const [secsLeft, setSecsLeft] = useState(12 * 60 + 39);
  useEffect(() => {
    const id = setInterval(() => setSecsLeft((s) => (s > 0 ? s - 1 : 12 * 60 + 39)), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.15)]">
      {/* Hero banner image — placeholder for a client-supplied asset. Keeps the
          same 10/11 ratio + overlay UI; drop in a real image later. */}
      <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-black/10 bg-[linear-gradient(135deg,#eef0f3,#e2e5ea)]">
        <div className="flex flex-col items-center gap-2 text-[#a2a8b0]">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[12px] font-bold uppercase tracking-wide">Banner image</span>
        </div>
      </div>
      {/* Legibility gutters for the icon columns over any future artwork */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[88px] bg-gradient-to-r from-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[88px] bg-gradient-to-l from-black/10 to-transparent" />

      <div className="relative" style={{ aspectRatio: "10 / 11" }}>
        {/* Rank progress (Bronze → Silver), MB-style top strip.
            Hidden on the logged-out landing — an anonymous visitor has no rank. */}
        {showRank && (
          <div className="absolute left-1/2 top-2.5 z-10 w-[74%] -translate-x-1/2">
            <RankStrip t={t} onOpen={onRank} />
          </div>
        )}

        {/* Left column: timed Daily Bonus (mirrors MB's timed collectible) */}
        <div className="absolute left-2.5 z-10 flex flex-col items-center" style={{ top: showRank ? 78 : 14 }}>
          <HeroBadge img="/hero-ic-daily.png" label={t.rwDaily} onClick={() => onReward?.("rwDaily")} />
          {/* Daily streak (POC: day 2 of 4) — compact segmented track */}
          <span className="mt-1 flex h-[7px] w-[56px] gap-[2px] rounded-full border border-white/25 bg-black/55 p-[1.5px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-full flex-1 rounded-full" style={{ background: i < 2 ? "linear-gradient(180deg,#ffe08a,#f6a821)" : "rgba(255,255,255,0.18)" }} />
            ))}
          </span>
          <span className="mt-1 rounded-md border border-white/30 bg-gradient-to-b from-[#3ddc68] to-[#17a544] px-1.5 py-[1px] text-[10px] font-extrabold tabular-nums text-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{timer}</span>
          {onChain && (
            <span className="mt-2">
              <HeroBadge img="/hero-ic-chain.png" label={t.coBadge} onClick={onChain} />
            </span>
          )}
        </div>

        {/* Right column: Oripa Draw (the core product, top slot) / Quest /
            First bonus. The old Daily Box slot duplicated the left column's
            Daily entry, so it became the draw shortcut. */}
        <div className="absolute right-2.5 z-10 flex flex-col items-center gap-2" style={{ top: showRank ? 78 : 14 }}>
          <HeroBadge img="/hero-ic-draw.png" label={t.heroDraw} onClick={onDraw} />
          <HeroBadge img="/hero-ic-quest.png" label={t.rwQuest} onClick={() => onReward?.("rwQuest")} />
          <HeroBadge img="/hero-ic-offer.png" label={t.rwFirst} onClick={() => onOpenStore?.()} />
        </div>
      </div>
    </div>
  );
}

/* ── Matsuri Quest modal ─────────────────────────────────────────────────
   Like-for-like adaptation of the MB "Funfair Quest" layout to the Oripa
   brand: marquee title, ultimate-reward panel, matsuri awning (red/white),
   3 quest rows (task + step reward), store CTA, reset countdown.
   POC: quest data and countdown are static. */

function catIcon(key: string, color: string) {
  switch (key) {
    case "all":
      return <svg width="23" height="23" viewBox="0 0 24 24" fill={color}><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></svg>;
    case "new":
      return (
        <svg width="27" height="27" viewBox="0 0 24 24">
          <path d="M12 1.3l2.2 2.5 3.2-1.1.2 3.4 3.4 1-1.9 2.8 1.9 2.8-3.4 1-.2 3.4-3.2-1.1L12 22.7l-2.2-2.5-3.2 1.1-.2-3.4-3.4-1 1.9-2.8L3 11.3l3.4-1 .2-3.4 3.2 1.1z" fill="#B40206" />
          <rect x="11" y="6.6" width="2" height="6" rx="1" fill="#fff" />
          <circle cx="12" cy="15.2" r="1.15" fill="#fff" />
        </svg>
      );
    case "popular":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
    case "pokemon":
      return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" stroke={color} strokeWidth="1.8" /><path d="M3 12A9 9 0 0 1 21 12Z" fill={color} /><circle cx="12" cy="12" r="3.1" fill="#fff" stroke={color} strokeWidth="1.8" /><circle cx="12" cy="12" r="1.25" fill={color} /></svg>;
    case "limited":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.3 1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return <svg width="26" height="26" viewBox="0 0 24 24" fill={color}><circle cx="5.5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18.5" cy="12" r="2" /></svg>;
  }
}

// Category-bar glyphs sourced from the supplied artwork (public/cat/*.png).
function catImg(key: string) {
  return (
    <span className="flex h-[24px] w-[38px] items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/cat/${key}.png`} alt="" className="max-h-[24px] max-w-[38px] object-contain" />
    </span>
  );
}

function CategoryBar({ t, active, onChange }: { t: Dict; active: string; onChange: (key: string) => void }) {
  const cats: { key: string; label: string }[] = [
    { key: "new", label: t.catNew },
    { key: "popular", label: t.catPopular },
    { key: "pokemon", label: t.catPokemon },
    { key: "limited", label: t.catLimited },
    { key: "other", label: t.catOther },
  ];
  const allOn = active === "all";
  return (
    <div className="sticky top-0 z-20 mt-3 border-b border-black/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="no-scrollbar flex items-stretch overflow-x-auto">
        {/* ALL — full-height D-tab pinned to the left edge, never scrolls away */}
        <button
          onClick={() => onChange("all")}
          aria-pressed={allOn}
          className="sticky left-0 z-10 flex shrink-0 items-stretch bg-white pr-2.5"
        >
          <span className="flex flex-col items-center justify-center gap-1 rounded-r-[28px] bg-[#141414] px-4 text-white shadow-[3px_0_12px_rgba(0,0,0,0.18)]">
            {catIcon("all", "#fff")}
            <span className="text-[11px] font-extrabold uppercase tracking-wide">{t.catAll}</span>
          </span>
        </button>

        {/* Scrollable categories */}
        {cats.map((c) => {
          const on = active === c.key;
          const color = on ? "#B40206" : "#1d2129";
          return (
            <button
              key={c.key}
              onClick={() => onChange(c.key)}
              className="relative flex shrink-0 flex-col items-center justify-center gap-1 px-3 py-2.5"
            >
              {catImg(c.key)}
              <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color }}>{c.label}</span>
              {on && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[#B40206]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Terms & Conditions modal, opened from the footer link.
function TermsOverlay({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = STR[lang];
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[86%] w-full flex-col overflow-hidden rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3">
          <h3 className="text-[16px] font-extrabold text-[#1d2129]">{t.giTncTitle}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d2129] hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {(t.giTncBody as string[]).map((para, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-[#41464e]">{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteFooter({ t }: { t: Dict }) {
  const lang: Lang = t === STR.ja ? "ja" : "en";
  const [tnc, setTnc] = useState(false);
  const chip = (label: string) =>
    label === t.mpTerms ? (
      <button key={label} onClick={() => setTnc(true)} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90 underline decoration-white/40 active:bg-white/20">{label}</button>
    ) : (
      <span key={label} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90">{label}</span>
    );
  return (
    <footer className="bg-[#161616] px-4 py-6 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oripa-logo.png" alt="オリパロット" className="h-7 w-auto" style={{ filter: "brightness(1.6)" }} />
      <p className="mt-2 text-[11px] text-white/55">{t.ftCopyright}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-white/55">{t.ftBlurb}</p>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftAbout}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{t.ftLinks.map(chip)}</div>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftCategories}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{t.ftCats.map(chip)}</div>

      <h4 className="mt-5 text-[13px] font-bold">{t.ftFollow}</h4>
      <div className="mt-2 flex items-center gap-3">
        {["LINE", "X", "IG", "f"].map((s) => (
          <span key={s} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#161616]">{s}</span>
        ))}
      </div>

      <div className="my-5 h-px bg-white/15" />
      <p className="text-[11px] leading-relaxed text-white/70">{t.ftSupport}</p>
      <p className="mt-4 text-[10.5px] text-white/40">{t.ftCopyright}</p>
      {tnc && <TermsOverlay lang={lang} onClose={() => setTnc(false)} />}
    </footer>
  );
}

function AppHeader({ coins, t, onHome, onOpenStore }: { coins: number; t: Dict; onHome?: () => void; onOpenStore?: () => void }) {
  return (
    <header className="shrink-0 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <BrandLogo onClick={onHome} />
        <BalancePill coins={coins} t={t} onOpenStore={onOpenStore} />
      </div>
    </header>
  );
}

// Hide-on-scroll-down / reveal-on-scroll-up for the lobby search bar.
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop;
    const last = lastY.current;
    if (y > last && y > 48) setHidden(true);        // scrolling down, past the top
    else if (y < last - 4 || y <= 8) setHidden(false); // scrolling up / near top
    lastY.current = y;
  }
  return { hidden, onScroll };
}

// Search bar shown on the main lobby so users can find a draw without
// browsing categories.
function LobbySearchBar({ t, value, onChange }: { t: Dict; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.lobbySearchPlaceholder}
        className="w-full rounded-full border-[1.5px] border-black/10 bg-[#f4f5f7] py-2.5 pl-9 pr-9 text-[13px] font-semibold text-[#1d2129] outline-none focus:border-[#B40206] focus:bg-white"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8a9099] hover:bg-black/5"
          aria-label={t.backAria}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}

function LobbySearchResults({ items, t, lang, onOpenInfo, onDrawConfirm }: { items: OripaItem[]; t: Dict; lang: Lang; onOpenInfo?: (item: OripaItem) => void; onDrawConfirm?: (item: OripaItem, count: number, free?: boolean) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-2 text-[34px]">🔍</div>
        <p className="text-[14px] font-semibold text-[#8a9099]">{t.lobbySearchEmpty}</p>
      </div>
    );
  }
  return (
    <section className="bg-[#eef0f3] px-3 pb-6 pt-4">
      <h3 className="mb-3 text-[15px] font-extrabold text-[#1d2129]">{t.lobbySearchResults} · {items.length}</h3>
      <div className="space-y-3">
        {items.map((it) => (
          <OripaCard key={it.id} item={it} t={t} lang={lang} onView={() => onOpenInfo?.(it)} onDraw={(c, free) => onDrawConfirm?.(it, c, free)} />
        ))}
      </div>
    </section>
  );
}

// Flat, de-duplicated list of every draw across the home feed (for search).
const ALL_ORIPA: OripaItem[] = (() => {
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
function OripaHome({ lang, coins, onHome }: { lang: Lang; coins: number; onHome: () => void }) {
  const t = STR[lang];
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_ORIPA.filter((it) => locTitle(it, lang).toLowerCase().includes(q)) : [];
  const sections = HOME_SECTIONS.filter((s) => cat === "all" || s.cats.includes(cat));
  const { hidden: searchHidden, onScroll } = useHideOnScrollDown();
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AppHeader coins={coins} t={t} onHome={onHome} />

      {/* Lobby search — hides as the user scrolls down, reveals on scroll up. */}
      <div className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${searchHidden && !q ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
        <div className="border-b border-black/5 px-3 pb-2.5 pt-1">
          <LobbySearchBar t={t} value={query} onChange={setQuery} />
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={onScroll}>
        {q ? (
          <>
            <LobbySearchResults items={searchResults} t={t} lang={lang} />
            <SiteFooter t={t} />
          </>
        ) : (
        <>
        <div className="px-3 pt-3">
          <HomeHero t={t} />
        </div>

        {/* Category filter — sticky across the whole feed */}
        <CategoryBar t={t} active={cat} onChange={setCat} />

        {/* Curved divider below categories */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-divider.png" alt="" className="-mt-px -mb-px block w-full" />

        {sections.map((s) => {
          const red = s.variant === "red";
          return (
            <Fragment key={s.id}>
              <section className={red ? "bg-[#B40206] px-3 pb-6 pt-4" : "bg-[#eef0f3] px-3 pb-5 pt-4"}>
                <h3 className={`mb-3 flex items-center gap-1.5 text-[15px] font-extrabold ${red ? "text-white" : "text-[#1d2129]"}`}>
                  {sectionIcon(s.icon, red)}
                  {(t as unknown as Record<string, string>)[s.titleKey]}
                </h3>
                <div className="space-y-3">
                  {s.items.map((it) => (
                    <OripaCard key={it.id} item={it} t={t} lang={lang} />
                  ))}
                </div>
              </section>

              {red && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home-divider-bottom.png" alt="" className="-mt-px -mb-px block w-full" />
                </>
              )}
            </Fragment>
          );
        })}

        <SiteFooter t={t} />
        </>
        )}
      </div>
    </div>
  );
}

type Screen = "landing" | "signup" | "login" | "oripa" | "items" | "quest" | "mypage" | "prizeHistory" | "refer" | "faq" | "store" | "purchaseHistory" | "profile" | "notifications" | "gachaInfo" | "gachaResult" | "shippingAddress";

function navIcon(key: Screen, color: string) {
  switch (key) {
    case "oripa":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4.5" y="6" width="9" height="13" rx="1.6" transform="rotate(-10 9 12.5)" fill={color} opacity="0.45" />
          <rect x="10" y="5" width="9" height="13" rx="1.6" transform="rotate(8 14.5 11.5)" fill={color} />
        </svg>
      );
    case "items":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M3 7.5l9-4 9 4-9 4-9-4z" />
          <path d="M3 7.5v9l9 4 9-4v-9" />
          <path d="M12 11.5v9" />
        </svg>
      );
    case "prizeHistory":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
          <path d="M5.5 3v3.5H9" />
          <path d="M12 8v4.2l3 1.8" />
        </svg>
      );
    case "quest":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "store":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 4h16l-1 4H5L4 4z" />
          <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
          <path d="M9.5 20v-5.5h5V20" />
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 19a6.5 6.5 0 0113 0" strokeLinecap="round" />
        </svg>
      );
  }
}

// PROD: the bottom nav is display-only for now. The lobby (Oripa) is the only
// live destination; the other tabs (incl. the new Store placeholder) are shown
// but do not navigate until each screen is signed off and re-introduced.
function BottomNav({ screen, t }: { screen: Screen; t: Dict }) {
  const items: { key: Screen; label: string }[] = [
    { key: "oripa", label: t.navOripa },
    { key: "prizeHistory", label: t.navPrizeHistory },
    { key: "quest", label: t.navQuest },
    { key: "store", label: t.navStore },
    { key: "mypage", label: t.navMyPage },
  ];
  return (
    <nav className="shrink-0 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((it) => {
          const active = screen === it.key;
          const color = active ? "#B40206" : "#1d2129";
          return (
            <div key={it.key} className="flex flex-1 flex-col items-center gap-1 py-2">
              {navIcon(it.key, color)}
              <span className="text-[10px] font-bold" style={{ color }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Auth shared components ───────────────────────────────────────────── */
function AuthHeader({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  return (
    <header className="flex shrink-0 items-center justify-between bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.10)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oripa-logo-full.png" alt="オリパロット" className="h-8 w-auto shrink-0" />
      <div className="flex items-center gap-2">
        <button onClick={onSignUp} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#B40206" }}>{t.authSignUp}</button>
        <button onClick={onLogin} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "#f59e0b" }}>{t.authLogin}</button>
      </div>
    </header>
  );
}

function AuthSocialButtons({ signUp, t, onApple, onGoogle, onLine }: { signUp: boolean; t: Dict; onApple?: () => void; onGoogle?: () => void; onLine?: () => void }) {
  const appleLabel = signUp ? t.authSignUpApple : t.authLoginApple;
  const googleLabel = signUp ? t.authSignUpGoogle : t.authLoginGoogle;
  const lineLabel = signUp ? t.authSignUpLine : t.authLoginLine;
  return (
    <div className="space-y-2.5">
      <button onClick={onLine} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#06C755" /><text x="20" y="28" textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">L</text></svg>
        {lineLabel}
      </button>
      <button onClick={onGoogle} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {googleLabel}
      </button>
      <button onClick={onApple} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e5e8ec] bg-white py-3 text-[14px] font-bold text-[#1d2129]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d2129"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
        {appleLabel}
      </button>
    </div>
  );
}

type AppleAuthStep = "sheet" | "faceId" | "success";

function AppleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<AppleAuthStep>("sheet");

  useEffect(() => {
    if (step !== "faceId") return;
    const timer = setTimeout(() => setStep("success"), 1900);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  function startFaceId() {
    if (step !== "sheet") return;
    setStep("faceId");
  }

  const subtitle = signUp ? t.authAppleSheetSignUp : t.authAppleSheetLogin;
  const successSub = signUp ? t.authAppleSuccessSubSignUp : t.authAppleSuccessSubLogin;

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <style>{`
        @keyframes appleSheetSlideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes appleSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes appleSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes appleFaceIdFadeIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes appleScanLine { 0%{top:0%;opacity:0} 8%{opacity:1} 88%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes appleFacePulse { 0%,100%{opacity:0.5;transform:scale(0.97)} 50%{opacity:1;transform:scale(1)} }
        @keyframes appleCornerGlow { 0%,100%{stroke:#1d2129} 50%{stroke:#22c55e} }
      `}</style>

      {/* Backdrop — tapping triggers Face ID only on the "sheet" step */}
      <button
        type="button"
        aria-label={t.authAppleFaceIdHint as string}
        onClick={startFaceId}
        disabled={step !== "sheet"}
        className="min-h-0 flex-1 border-0 p-0 outline-none transition-colors duration-500"
        style={{ backgroundColor: step === "sheet" ? "rgba(0,0,0,0.52)" : "rgba(0,0,0,0.72)", cursor: step === "sheet" ? "pointer" : "default" }}
      >
        {step === "sheet" && (
          <span className="flex h-full items-end justify-center pb-10">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-sm">
              {t.authAppleFaceIdHint as string}
            </span>
          </span>
        )}
      </button>

      {/* Bottom sheet */}
      <div
        className="relative z-20 shrink-0 rounded-t-[24px] bg-[#f2f2f7] px-5 pb-10 pt-3 shadow-[0_-12px_48px_rgba(0,0,0,0.22)]"
        style={{ animation: "appleSheetSlideUp 0.38s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-black/15" />

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8">
            <div style={{ animation: "appleSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="36" fill="#22c55e" />
                <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3
              className="mt-5 text-center text-[20px] font-bold text-[#1d2129]"
              style={{ animation: "appleSuccessFade 0.4s ease-out 0.25s both" }}
            >
              {t.authAppleSuccess as string}
            </h3>
            <p
              className="mt-1.5 text-center text-[14px] text-[#5c626b]"
              style={{ animation: "appleSuccessFade 0.4s ease-out 0.4s both" }}
            >
              {successSub as string}
            </p>
          </div>
        )}

        {/* ── FACE ID SCANNING ── */}
        {step === "faceId" && (
          <div
            className="flex flex-col items-center py-8"
            style={{ animation: "appleFaceIdFadeIn 0.28s ease-out both" }}
          >
            {/* iOS-style Face ID frame */}
            <div className="relative" style={{ width: 110, height: 130 }}>
              {/* Corner brackets */}
              {[
                "top-0 left-0 border-l-[3px] border-t-[3px] rounded-tl-[8px]",
                "top-0 right-0 border-r-[3px] border-t-[3px] rounded-tr-[8px]",
                "bottom-0 left-0 border-l-[3px] border-b-[3px] rounded-bl-[8px]",
                "bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-[8px]",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-7 h-7 border-[#1d2129] ${cls}`}
                  style={{ animation: `appleCornerGlow 1.8s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}

              {/* Face silhouette */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "appleFacePulse 1.4s ease-in-out infinite" }}
              >
                <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
                  {/* Head */}
                  <path d="M32 6C19 6 11 14.5 11 25c0 7.5 4 14 10 17.5C13 46 8 54.5 8 65h48c0-10.5-5-19-13-22.5 6-3.5 10-10 10-17.5C53 14.5 45 6 32 6z"
                    stroke="#1d2129" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />
                  {/* Eyes */}
                  <circle cx="23" cy="24" r="2.8" fill="#1d2129" opacity="0.75" />
                  <circle cx="41" cy="24" r="2.8" fill="#1d2129" opacity="0.75" />
                  {/* Nose bridge */}
                  <path d="M32 28v5" stroke="#1d2129" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
                  {/* Smile */}
                  <path d="M23 38c2.5 3.5 15.5 3.5 18 0" stroke="#1d2129" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
                </svg>
              </div>

              {/* Green scan line */}
              <div
                className="pointer-events-none absolute left-3 right-3 h-[2.5px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #22c55e 30%, #4ade80 50%, #22c55e 70%, transparent 100%)",
                  animation: "appleScanLine 1.7s ease-in-out infinite",
                }}
              />
            </div>

            <p className="mt-6 text-[16px] font-semibold text-[#1d2129]">
              {t.authAppleFaceIdScanning as string}
            </p>
            <p className="mt-1 text-[12px] text-[#8a9099]">
              {lang === "ja" ? "スキャン中..." : "Scanning..."}
            </p>
          </div>
        )}

        {/* ── INITIAL SHEET ── */}
        {step === "sheet" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1d2129">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-[16px] font-bold text-[#1d2129]">{t.authAppleSheetTitle as string}</span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-[#5c626b]">{subtitle as string}</p>

            {/* Account row */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-3.5 px-4 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[17px] font-bold text-white shadow-md">
                  {(t.authAppleAccountName as string).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#1d2129]">{t.authAppleAccountName as string}</p>
                  <p className="truncate text-[12px] text-[#8a9099]">{t.authAppleAccountEmail as string}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9ced6" strokeWidth="2.2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Continue / Face ID button */}
            <button
              type="button"
              onClick={startFaceId}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1d2129] py-4 text-[15px] font-bold text-white active:scale-[0.98]"
              style={{ transition: "transform 0.1s" }}
            >
              {/* iOS Face ID icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="17" y="2" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="2" y="19.5" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <rect x="17" y="19.5" width="5" height="2.5" rx="1.25" fill="white" opacity="0.8" />
                <circle cx="9" cy="10.5" r="1.6" fill="white" />
                <circle cx="15" cy="10.5" r="1.6" fill="white" />
                <path d="M12 8.5V7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M9 15c1 1.8 5 1.8 6 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {t.authAppleFaceIdHint as string}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type GoogleAuthStep = "picker" | "permissions" | "processing" | "success";

const GOOGLE_LOGO = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function GoogleAuthSheet({ lang, signUp, onClose, onSuccess }: {
  lang: Lang; signUp: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [step, setStep] = useState<GoogleAuthStep>("picker");
  const [selectedAccount, setSelectedAccount] = useState<0 | 1 | null>(null);

  const accounts = [
    { name: t.authGoogleAccount1Name as string, email: t.authGoogleAccount1Email as string, initials: (t.authGoogleAccount1Name as string).charAt(0), color: "#4285F4" },
    { name: t.authGoogleAccount2Name as string, email: t.authGoogleAccount2Email as string, initials: (t.authGoogleAccount2Name as string).charAt(0), color: "#0f9d58" },
  ];

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("success"), 1600);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1500);
    return () => clearTimeout(timer);
  }, [step, onSuccess]);

  const successSub = signUp ? t.authGoogleSuccessSubSignUp : t.authGoogleSuccessSubLogin;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white" style={{ animation: "googleScreenSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both" }}>
      <style>{`
        @keyframes googleScreenSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes googleSuccessPop { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.15)} 80%{transform:scale(0.96)} 100%{transform:scale(1);opacity:1} }
        @keyframes googleSuccessFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes googleSpinnerRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div style={{ animation: "googleSuccessPop 0.55s cubic-bezier(.2,.9,.2,1.1) both" }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="36" fill="#22c55e" />
                <path d="M24 38l10 10 18-18" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3 className="mt-5 text-center text-[20px] font-bold text-[#1d2129]" style={{ animation: "googleSuccessFade 0.4s ease-out 0.25s both" }}>
              {t.authGoogleSuccess as string}
            </h3>
            <p className="mt-1.5 text-center text-[14px] text-[#5c626b]" style={{ animation: "googleSuccessFade 0.4s ease-out 0.4s both" }}>
              {successSub as string}
            </p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div style={{ animation: "googleSpinnerRotate 0.9s linear infinite", width: 52, height: 52 }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="22" stroke="#e5e8ec" strokeWidth="4" />
                <path d="M26 4a22 22 0 0 1 22 22" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-5 text-[15px] font-semibold text-[#1d2129]">
              {lang === "ja" ? "サインイン中..." : "Signing in…"}
            </p>
          </div>
        )}

        {/* ── PERMISSIONS ── */}
        {step === "permissions" && selectedAccount !== null && (
          <div className="flex flex-1 flex-col px-5 pt-12 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              {GOOGLE_LOGO}
              <span className="text-[18px] font-bold text-[#1d2129]">{t.authGooglePermissionsTitle as string}</span>
              <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]">✕</button>
            </div>

            {/* Selected account badge */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#e5e8ec] bg-[#f8f9fa] px-4 py-3 mb-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: accounts[selectedAccount].color }}>
                {accounts[selectedAccount].initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1d2129]">{accounts[selectedAccount].name}</p>
                <p className="truncate text-[12px] text-[#8a9099]">{accounts[selectedAccount].email}</p>
              </div>
            </div>

            {/* Permissions body */}
            <p className="text-[13px] text-[#5c626b] mb-5">{t.authGooglePermissionsBody as string}</p>

            <div className="space-y-3 mb-auto">
              {([t.authGooglePermissionItem1, t.authGooglePermissionItem2] as string[]).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f5e9]">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5l3 3 5-5" stroke="#0f9d58" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[14px] leading-snug text-[#1d2129]">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA row — pinned to bottom */}
            <div className="flex gap-3 pt-8">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-[#e5e8ec] py-3.5 text-[14px] font-bold text-[#1d2129]"
              >
                {t.authGoogleCancel as string}
              </button>
              <button
                onClick={() => setStep("processing")}
                className="flex-1 rounded-xl py-3.5 text-[14px] font-bold text-white"
                style={{ background: "#4285F4" }}
              >
                {t.authGoogleContinue as string}
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT PICKER ── */}
        {step === "picker" && (
          <div className="flex flex-1 flex-col px-5 pt-12 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {GOOGLE_LOGO}
                <span className="text-[18px] font-bold text-[#1d2129]">{t.authGooglePickerTitle as string}</span>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[18px] text-[#8a9099]">✕</button>
            </div>
            <p className="mb-6 text-[13px] text-[#5c626b]">{t.authGooglePickerSubtitle as string}</p>

            {/* Account list */}
            <div className="space-y-3">
              {accounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedAccount(idx as 0 | 1); setStep("permissions"); }}
                  className="flex w-full items-center gap-3.5 rounded-2xl border border-[#e5e8ec] bg-white px-4 py-3.5 text-left active:bg-[#f5f6f8]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white" style={{ background: acc.color }}>
                    {acc.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#1d2129]">{acc.name}</p>
                    <p className="truncate text-[12px] text-[#8a9099]">{acc.email}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9ced6" strokeWidth="2.2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function AuthField({ label, value, onChange, type = "text", icon, valid, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
  valid?: boolean; error?: string; onBlur?: () => void;
}) {
  const showTick = valid === true;
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {label}<span className="ml-0.5 text-[#B40206]">*</span>
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-[#8a9099]">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Placeholder"
          className={`w-full rounded-xl bg-white py-3 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none border ${error ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
          style={{ paddingLeft: icon ? "36px" : "14px", paddingRight: showTick ? "40px" : "14px" }}
        />
        {showTick && (
          <span className="absolute right-3">
            <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-[#B40206]">{error}</p>}
    </div>
  );
}

/* ── DobPickerModal ────────────────────────────────────────────────────── */
function DobPickerModal({ lang, onConfirm, onClose }: {
  lang: Lang; onConfirm: (isoDate: string) => void; onClose: () => void;
}) {
  const t = STR[lang];
  const YEARS_PER_PAGE = 12;
  const MAX_YEAR = 2010;
  const MIN_YEAR = 1931;

  const [step, setStep] = useState<"year" | "month" | "day">("year");
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [yearPageStart, setYearPageStart] = useState(1980);

  const MONTH_SHORT = lang === "ja"
    ? ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH_FULL = lang === "ja"
    ? MONTH_SHORT
    : ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const displayText = () => {
    if (!selYear) return "";
    if (!selMonth) return String(selYear);
    if (!selDay) return lang === "ja" ? `${selYear}年${selMonth}月` : `${selYear}, ${MONTH_FULL[selMonth - 1]}`;
    return lang === "ja"
      ? `${selYear}年${selMonth}月${selDay}日`
      : `${MONTH_SHORT[selMonth - 1]} ${selDay}, ${selYear}`;
  };

  const daysInMonth = selYear && selMonth ? new Date(selYear, selMonth, 0).getDate() : 31;

  const headerLabel = step === "year"
    ? `${yearPageStart}–${Math.min(yearPageStart + YEARS_PER_PAGE - 1, MAX_YEAR)}`
    : step === "month"
    ? String(selYear)
    : `${MONTH_SHORT[(selMonth ?? 1) - 1]} ${selYear}`;

  const onBack = () => {
    if (step === "year") {
      setYearPageStart(p => Math.max(MIN_YEAR, p - YEARS_PER_PAGE));
    } else if (step === "month") {
      setStep("year");
      setSelMonth(null);
      setSelDay(null);
    } else {
      setStep("month");
      setSelDay(null);
    }
  };

  const onForward = () => {
    if (step === "year") {
      if (yearPageStart + YEARS_PER_PAGE <= MAX_YEAR) setYearPageStart(p => p + YEARS_PER_PAGE);
    } else if (step === "month" && selYear) {
      if (selYear < MAX_YEAR) { setSelYear(selYear + 1); setSelMonth(null); setSelDay(null); }
    } else if (step === "day" && selYear && selMonth) {
      const nextMonth = selMonth === 12 ? 1 : selMonth + 1;
      const nextYear = selMonth === 12 ? selYear + 1 : selYear;
      if (nextYear <= MAX_YEAR) { setSelMonth(nextMonth); setSelYear(nextYear); setSelDay(null); }
    }
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i)
    .filter(y => y <= MAX_YEAR);

  const navBtn = "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#f0f2f5] active:bg-[#e5e8ec]";
  const gridBtn = "rounded-xl py-2.5 text-[14px] font-medium transition-colors";
  const gridSel = "bg-[#1d2129] text-white";
  const gridDef = "text-[#1d2129] hover:bg-[#f0f2f5]";

  return (
    <div className="absolute inset-0 z-50 flex items-end"
         style={{ background: "rgba(0,0,0,0.45)" }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full rounded-t-2xl bg-white shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <button onClick={onClose} className="text-[14px] text-[#5c626b]">{t.authDobPickerCancel}</button>
          <span className="text-[15px] font-bold text-[#1d2129]">{t.authDobLabel}</span>
          <div className="w-14" />
        </div>

        <div className="px-4 pt-4 pb-5">
          {/* Progressive selection display */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[#e5e8ec] px-3 py-2.5">
            <span className={`text-[14px] ${displayText() ? "text-[#1d2129]" : "text-[#bbbec4]"}`}>
              {displayText() || (lang === "ja" ? "生年月日を選択" : "Select your date of birth")}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9099" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>

          {/* Calendar card */}
          <div className="rounded-xl border border-[#e5e8ec] overflow-hidden">
            {/* Navigation row */}
            <div className="flex items-center justify-between border-b border-[#f0f2f5] px-3 py-2.5">
              <button onClick={onBack} className={navBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-[15px] font-bold text-[#1d2129]">{headerLabel}</span>
              <button onClick={onForward} className={navBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c626b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Grid area */}
            <div className="px-3 py-3">
              {step === "year" && (
                <div className="grid grid-cols-3 gap-2">
                  {years.map(y => (
                    <button key={y}
                            onClick={() => { setSelYear(y); setSelMonth(null); setSelDay(null); setStep("month"); }}
                            className={`${gridBtn} ${selYear === y ? gridSel : gridDef}`}>
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {step === "month" && (
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_SHORT.map((m, i) => (
                    <button key={m}
                            onClick={() => { setSelMonth(i + 1); setSelDay(null); setStep("day"); }}
                            className={`${gridBtn} ${selMonth === i + 1 ? gridSel : gridDef}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {step === "day" && (
                <>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <button key={d}
                              onClick={() => setSelDay(d)}
                              className={`flex aspect-square items-center justify-center rounded-full text-[13px] font-medium transition-colors
                                ${selDay === d ? "bg-[#1d2129] text-white" : "text-[#1d2129] hover:bg-[#f0f2f5]"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  {selDay !== null && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => onConfirm(`${selYear}-${String(selMonth).padStart(2, "0")}-${String(selDay).padStart(2, "0")}`)}
                        className="rounded-xl bg-[#B40206] px-5 py-2 text-[14px] font-bold text-white">
                        {t.authDobPickerDone}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LandingPage ──────────────────────────────────────────────────────── */
// Logged-out lobby (V1 homepage): auth header + search + banner placeholder +
// category-filtered card sections. Card taps prompt sign-up.
function LandingPage({ lang, onSignUp, onLogin }: { lang: Lang; onSignUp: () => void; onLogin: () => void }) {
  const t = STR[lang];
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_ORIPA.filter((it) => locTitle(it, lang).toLowerCase().includes(q)) : [];
  const { hidden: searchHidden, onScroll } = useHideOnScrollDown();
  return (
    <div className="relative flex h-full flex-col bg-[#eef0f3]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={onLogin} />
      <div className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${searchHidden && !q ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
        <div className="border-b border-black/5 px-3 pb-2.5 pt-2.5">
          <LobbySearchBar t={t} value={query} onChange={setQuery} />
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={onScroll}>
        {q ? (
          <>
            <LobbySearchResults items={searchResults} t={t} lang={lang} />
            <SiteFooter t={t} />
          </>
        ) : (
        <>
        <div className="px-3 pt-3"><PromoCarousel /></div>
        <CategoryBar t={t} active={cat} onChange={setCat} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-divider.png" alt="" className="-mt-px -mb-px block w-full" />
        {HOME_SECTIONS.filter((s) => cat === "all" || s.cats.includes(cat)).map((s) => {
          const red = s.variant === "red";
          return (
            <Fragment key={s.id}>
              <section className={red ? "bg-[#B40206] px-3 pb-6 pt-4" : "bg-[#eef0f3] px-3 pb-5 pt-4"}>
                <h3 className={`mb-3 flex items-center gap-1.5 text-[15px] font-extrabold ${red ? "text-white" : "text-[#1d2129]"}`}>
                  {sectionIcon(s.icon, red)}
                  {(t as unknown as Record<string, string>)[s.titleKey]}
                </h3>
                <div className="space-y-3">
                  {s.items.map((it) => (
                    <OripaCard key={it.id} item={it} t={t} lang={lang} onView={onSignUp} onDraw={onSignUp} />
                  ))}
                </div>
              </section>
              {red && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home-divider-bottom.png" alt="" className="-mt-px -mb-px block w-full" />
                </>
              )}
            </Fragment>
          );
        })}
        <SiteFooter t={t} />
        </>
        )}
      </div>
    </div>
  );
}

/* ── PhoneOtpPage ──────────────────────────────────────────────────────── */
function PhoneOtpPage({ lang, phone, onBack, onSuccess }: {
  lang: Lang; phone: string; onBack: () => void; onSuccess: () => void;
}) {
  const t = STR[lang];
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const allFilled = digits.every(d => d.length === 1);
  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    setDigits(["", "", "", "", "", ""]);
    setTimer(30);
    inputRefs.current[0]?.focus();
    setToast(t.authOtpToast as string);
    setTimeout(() => setToast(""), 2500);
  }

  const mm = Math.floor(timer / 60).toString().padStart(2, "0");
  const ss = (timer % 60).toString().padStart(2, "0");

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pt-12 pb-6">
          <h2 className="text-center text-[22px] font-extrabold text-[#1d2129]">{t.authOtpTitle as string}</h2>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-[#5c626b]">
            {t.authOtpBodyPre as string}
            {(t.authOtpBodyPre as string) && <br />}
            <span className="font-semibold text-[#1d2129]">{phone}</span>
            {t.authOtpBodyPost as string}
          </p>

          <p className="mt-5 text-center text-[13px] font-semibold text-[#1d2129]">
            {t.authOtpExpiry as string} {mm}:{ss}
          </p>

          <div className="mt-4 flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-[#e5e8ec] bg-white text-center text-[20px] font-bold text-[#1d2129] outline-none focus:border-[#B40206]"
              />
            ))}
          </div>

          <button
            onClick={() => { if (allFilled) onSuccess(); }}
            disabled={!allFilled}
            className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: "#B40206", opacity: allFilled ? 1 : 0.45 }}
          >
            {t.authOtpAuthenticate as string}
          </button>

          <button
            onClick={handleResend}
            disabled={!canResend}
            className="mt-3 w-full rounded-xl border border-[#e5e8ec] bg-white py-3.5 text-[14px] font-semibold text-[#5c626b]"
            style={{ opacity: canResend ? 1 : 0.45 }}
          >
            {t.authOtpResend as string}
          </button>

          <button
            onClick={onBack}
            className="mt-3 w-full text-center text-[13px] font-bold text-[#B40206] underline"
          >
            {t.authOtpChangePhone as string}
          </button>
        </div>
      </div>

      {toast && (
        <div className="absolute inset-x-4 top-4 z-50 rounded-xl bg-[#1d2129] px-4 py-3 text-center text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── SignupPage ───────────────────────────────────────────────────────── */
function SignupPage({ lang, onLogin, onSuccess, initialEmailVerify = false, initialAppleAuth = false }: { lang: Lang; onLogin: () => void; onSuccess: () => void; initialEmailVerify?: boolean; initialAppleAuth?: boolean }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showAppleAuth, setShowAppleAuth] = useState(initialAppleAuth);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneDob, setPhoneDob] = useState("");
  const [phoneInvite, setPhoneInvite] = useState("");
  const [phoneAgreed, setPhoneAgreed] = useState(false);
  const [showPhoneDobPicker, setShowPhoneDobPicker] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailDob, setEmailDob] = useState("");
  const [emailInvite, setEmailInvite] = useState("");
  const [emailAgreed, setEmailAgreed] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showEmailDobPicker, setShowEmailDobPicker] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(initialEmailVerify);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";
  const canPhoneSubmit = phoneValid && phoneDob.length > 0 && phoneAgreed;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canEmailSubmit = emailValid && passwordValid && emailDob.length > 0 && emailAgreed;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";

  const formatDob = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (lang === "ja") return `${y}年${Number(m)}月${Number(d)}日`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  };

  const calIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
  const checkIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const renderDobButton = (dob: string, onOpen: () => void) => (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
        {t.authDobLabel}<span className="ml-0.5 text-[#B40206]">*</span>
      </label>
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full rounded-xl border border-[#e5e8ec] bg-white py-3 text-left text-[14px] outline-none"
        style={{ paddingLeft: "36px", paddingRight: dob ? "40px" : "14px" }}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9099]">{calIcon}</span>
        <span className={dob ? "text-[#1d2129]" : "text-[#bbbec4]"}>{dob ? formatDob(dob) : "Placeholder"}</span>
        {dob && <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>}
      </button>
    </div>
  );

  const renderInviteField = (value: string, onChange: (v: string) => void) => (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">{t.authInviteLabel}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Placeholder"
        className="w-full rounded-xl border border-[#e5e8ec] bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none"
      />
    </div>
  );

  const renderTermsCheckbox = (checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-start gap-2.5">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div
          className="flex h-5 w-5 items-center justify-center rounded"
          style={{ background: checked ? "#B40206" : "white", border: checked ? "none" : "2px solid #d1d5db" }}
        >
          {checked && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
        </div>
      </div>
      <span className="text-[12px] leading-relaxed text-[#5c626b]">
        {t.authAgreePrefix}
        <span className="text-[#B40206] underline">{t.authTermsOfService}</span>
        {t.authAnd}
        <span className="text-[#B40206] underline">{t.authPrivacyPolicy}</span>
        {t.authAgreeEnd}
      </span>
    </label>
  );

  if (view === "otp") {
    return <PhoneOtpPage lang={lang} phone={otpPhone} onBack={() => setView("form")} onSuccess={() => {
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={() => {}} onLogin={onLogin} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-5 space-y-3">

          {/* ── Social sign-up methods ── */}
          <AuthSocialButtons signUp t={t} onApple={() => setShowAppleAuth(true)} onGoogle={() => setShowGoogleAuth(true)} onLine={() => { try { sessionStorage.setItem("authData", JSON.stringify({ lineId: "line_user" })); } catch {} onSuccess(); }} />

          {/* ── Email Section ── */}
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "email" ? null : "email")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authEmailSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "email" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "email" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <AuthField
                  label={t.authEmailLabel} value={email} onChange={setEmail} type="email"
                  valid={emailValid && email.length > 0}
                  error={emailTouched ? emailFieldError : ""}
                  onBlur={() => setEmailTouched(true)}
                />
                <AuthField
                  label={t.authPasswordLabel} value={password} onChange={setPassword} type="password"
                  valid={passwordValid && password.length > 0}
                  error={passwordTouched ? passwordError : ""}
                  onBlur={() => setPasswordTouched(true)}
                />
                {renderDobButton(emailDob, () => setShowEmailDobPicker(true))}
                {renderInviteField(emailInvite, setEmailInvite)}
                {renderTermsCheckbox(emailAgreed, setEmailAgreed)}

                <button
                  onClick={() => { if (canEmailSubmit) setShowEmailVerify(true); }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section — hidden, preserved for future re-enablement ── */}
          {false && (
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "phone" ? null : "phone")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authPhoneSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "phone" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "phone" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                {/* Country code + Phone number */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#B40206]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => { setCountryCode(e.target.value as "JP" | "US"); setPhone(""); setPhoneTouched(false); }}
                      className="rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[13px] text-[#1d2129] outline-none"
                    >
                      <option value="JP">🇯🇵 +81</option>
                      <option value="US">🇺🇸 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="Placeholder"
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#B40206]">{phoneError}</p>}
                </div>

                {renderDobButton(phoneDob, () => setShowPhoneDobPicker(true))}
                {renderInviteField(phoneInvite, setPhoneInvite)}
                {renderTermsCheckbox(phoneAgreed, setPhoneAgreed)}

                <button
                  onClick={() => { if (canPhoneSubmit) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!canPhoneSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canPhoneSubmit ? 1 : 0.45 }}
                >
                  {t.authSignUpFree}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authHaveAccount}{" "}
            <button onClick={onLogin} className="font-bold text-[#B40206] underline">{t.authLogInLink}</button>
          </p>
        </div>
      </div>

      {/* Phone DOB picker — hidden along with the phone section */}
      {false && showPhoneDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowPhoneDobPicker(false)}
                        onConfirm={(iso) => { setPhoneDob(iso); setShowPhoneDobPicker(false); }} />
      )}

      {showEmailDobPicker && (
        <DobPickerModal lang={lang} onClose={() => setShowEmailDobPicker(false)}
                        onConfirm={(iso) => { setEmailDob(iso); setShowEmailDobPicker(false); }} />
      )}

      {/* Email Verification Modal */}
      {showEmailVerify && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-xs rounded-2xl bg-white px-6 py-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#fde68a,#fbbf24)" }}>
                <svg width="56" height="56" viewBox="0 0 60 60">
                  <ellipse cx="30" cy="38" rx="18" ry="14" fill="#f97316" />
                  <circle cx="30" cy="26" r="14" fill="#fb923c" />
                  <polygon points="18,18 10,6 22,14" fill="#f97316" />
                  <polygon points="42,18 50,6 38,14" fill="#f97316" />
                  <circle cx="30" cy="26" r="9" fill="#fed7aa" />
                  <circle cx="25" cy="24" r="2.5" fill="#1d2129" />
                  <circle cx="35" cy="24" r="2.5" fill="#1d2129" />
                  <circle cx="26" cy="23" r="1" fill="white" />
                  <circle cx="36" cy="23" r="1" fill="white" />
                  <ellipse cx="30" cy="28" rx="3" ry="2" fill="#f87171" />
                  <path d="M26 32 Q30 35 34 32" stroke="#1d2129" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <rect x="16" y="36" width="28" height="20" rx="3" fill="white" stroke="#e5e8ec" strokeWidth="1.5" />
                  <path d="M16 39l14 10 14-10" stroke="#B40206" strokeWidth="1.5" fill="none" />
                  <circle cx="36" cy="34" r="5" fill="#B40206" />
                  <text x="36" y="38" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">♥</text>
                </svg>
              </div>
            </div>
            <h2 className="text-center text-[18px] font-extrabold text-[#1d2129]">{t.authVerifyTitle}</h2>
            <p className="mt-2 text-center text-[12px] leading-relaxed text-[#5c626b]">
              {t.authVerifyBody(email || "HELLO@EMAIL.COM")}
            </p>
            <button onClick={() => {
              try { sessionStorage.setItem("authData", JSON.stringify({ email, dob: emailDob })); } catch {}
              onSuccess();
            }} className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#B40206" }}>
              {t.authOpenEmailApp}
            </button>
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-semibold text-[#5c626b]">{t.authVerifyNote}</p>
              {(t.authVerifyBullets as string[]).map((b, i) => (
                <p key={i} className="flex items-start gap-1.5 text-[11px] text-[#5c626b]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5c626b]" />{b}
                </p>
              ))}
            </div>
            <button className="mt-4 w-full text-center text-[11px] font-bold tracking-wide text-[#5c626b] underline">
              {t.authResendEmail}
            </button>
          </div>
        </div>
      )}

      {showAppleAuth && (
        <AppleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowAppleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                appleId: t.authAppleAccountEmail,
                displayName: t.authAppleAccountName,
              }));
            } catch {}
            setShowAppleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: t.authGoogleAccount1Email,
                displayName: t.authGoogleAccount1Name,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ── LoginPage ────────────────────────────────────────────────────────── */
function LoginPage({ lang, onSignUp, onSuccess, initialAppleAuth = false }: { lang: Lang; onSignUp: () => void; onSuccess: () => void; initialAppleAuth?: boolean }) {
  const t = STR[lang];

  const [view, setView] = useState<"form" | "otp">("form");
  const [otpPhone, setOtpPhone] = useState("");
  const [activeSection, setActiveSection] = useState<"phone" | "email" | null>("email");
  const [showAppleAuth, setShowAppleAuth] = useState(initialAppleAuth);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  // Phone section state
  const [countryCode, setCountryCode] = useState<"JP" | "US">("JP");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Email section state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const phonePrefix = countryCode === "JP" ? "🇯🇵 +81" : "🇺🇸 +1";
  const phoneValid = phone.length === 10;
  const phoneError = phoneTouched && phone.length > 0 && !phoneValid ? t.authPhoneError as string : "";

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canEmailSubmit = emailValid && passwordValid;
  const emailFieldError = email.length > 0 && !emailValid ? t.authEmailError : "";
  const passwordError = password.length > 0 && !passwordValid ? t.authPasswordError : "";

  const checkIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  if (view === "otp") {
    return <PhoneOtpPage lang={lang} phone={otpPhone} onBack={() => setView("form")} onSuccess={() => {
      try { sessionStorage.setItem("authData", JSON.stringify({ phone, phoneVerified: true })); } catch {}
      onSuccess();
    }} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f6f8]">
      <AuthHeader lang={lang} onSignUp={onSignUp} onLogin={() => {}} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="h-[120px] w-full" style={{ background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 20px 20px" }} />

        <div className="px-4 py-5 space-y-3">

          {/* ── Social login ── (PROD: LINE logs in instantly for easy access) */}
          <AuthSocialButtons signUp={false} t={t} onApple={() => setShowAppleAuth(true)} onGoogle={() => setShowGoogleAuth(true)} onLine={() => { try { sessionStorage.setItem("authData", JSON.stringify({ lineId: "line_user" })); } catch {} onSuccess(); }} />

          {/* ── Email Section ── */}
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "email" ? null : "email")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authLoginEmailSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "email" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "email" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <AuthField
                  label={t.authEmailLabel} value={email} onChange={setEmail} type="email"
                  valid={emailValid && email.length > 0}
                  error={emailTouched ? emailFieldError : ""}
                  onBlur={() => setEmailTouched(true)}
                />
                <AuthField
                  label={t.authPasswordLabel} value={password} onChange={setPassword} type="password"
                  valid={passwordValid && password.length > 0}
                  error={passwordTouched ? passwordError : ""}
                  onBlur={() => setPasswordTouched(true)}
                />

                <button
                  onClick={() => { if (canEmailSubmit) { try { sessionStorage.setItem("authData", JSON.stringify({ email })); } catch {} onSuccess(); } }}
                  disabled={!canEmailSubmit}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: canEmailSubmit ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>

          {/* ── Phone Number Section — hidden, preserved for future re-enablement ── */}
          {false && (
          <div className="overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white">
            <button
              onClick={() => setActiveSection(prev => prev === "phone" ? null : "phone")}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-bold text-[#1d2129]">{t.authLoginPhoneSection as string}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                   className={`transition-transform duration-200 ${activeSection === "phone" ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {activeSection === "phone" && (
              <div className="border-t border-[#e5e8ec] px-4 pt-4 pb-4 space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#1d2129]">
                    {t.authPhoneLabel as string}<span className="ml-0.5 text-[#B40206]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => { setCountryCode(e.target.value as "JP" | "US"); setPhone(""); setPhoneTouched(false); }}
                      className="rounded-xl border border-[#e5e8ec] bg-white px-3 py-3 text-[13px] text-[#1d2129] outline-none"
                    >
                      <option value="JP">🇯🇵 +81</option>
                      <option value="US">🇺🇸 +1</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="Placeholder"
                        className={`w-full rounded-xl border bg-white py-3 pl-3.5 text-[14px] text-[#1d2129] placeholder:text-[#bbbec4] outline-none ${phoneError ? "border-[#B40206]" : "border-[#e5e8ec]"}`}
                        style={{ paddingRight: phoneValid && phone.length > 0 ? "40px" : "14px" }}
                      />
                      {phoneValid && phone.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">{checkIcon}</span>
                      )}
                    </div>
                  </div>
                  {phoneError && <p className="mt-1 text-[11px] text-[#B40206]">{phoneError}</p>}
                </div>

                <button
                  onClick={() => { if (phoneValid) { setOtpPhone(`${phonePrefix} ${phone}`); setView("otp"); } }}
                  disabled={!phoneValid}
                  className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white"
                  style={{ background: "#B40206", opacity: phoneValid ? 1 : 0.45 }}
                >
                  {t.authLoginTitle}
                </button>
              </div>
            )}
          </div>
          )}

          <p className="text-center text-[13px] text-[#5c626b]">
            {t.authNoAccount}{" "}
            <button onClick={onSignUp} className="font-bold text-[#B40206] underline">{t.authSignUpNow}</button>
          </p>
        </div>
      </div>

      {showAppleAuth && (
        <AppleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowAppleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                appleId: t.authAppleAccountEmail,
                displayName: t.authAppleAccountName,
              }));
            } catch {}
            setShowAppleAuth(false);
            onSuccess();
          }}
        />
      )}

      {showGoogleAuth && (
        <GoogleAuthSheet
          lang={lang}
          signUp={false}
          onClose={() => setShowGoogleAuth(false)}
          onSuccess={() => {
            try {
              sessionStorage.setItem("authData", JSON.stringify({
                googleId: t.authGoogleAccount1Email,
                displayName: t.authGoogleAccount1Name,
              }));
            } catch {}
            setShowGoogleAuth(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ── PhoneApp ─────────────────────────────────────────────────────────── */
type NotifItem = { id: string; at: string; atJa: string; title: string; titleJa: string; body: string; bodyJa: string; tracking?: string; unread?: boolean };

const NOTIF_YOU: NotifItem[] = [
  { id: "y1", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Your item has been shipped", titleJa: "商品を発送しました", body: "Your prize is on its way. Delivery takes up to 14 business days.", bodyJa: "景品を発送しました。お届けまで最大14営業日かかります。", tracking: "AA123456789JP", unread: true },
  { id: "y2", at: "Feb 02, 2026 18:40", atJa: "2026年2月02日 18:40", title: "Shipping request received", titleJa: "発送リクエストを受け付けました", body: "We have received your shipping request and are preparing your prize.", bodyJa: "発送リクエストを受け付けました。景品の準備を進めています。", unread: true },
  { id: "y3", at: "Jan 30, 2026 09:12", atJa: "2026年1月30日 09:12", title: "Prizes converted to coins", titleJa: "景品をコインに交換しました", body: "Your selected prizes were converted to Oripa Coins.", bodyJa: "選択した景品をオリパコインに交換しました。" },
  { id: "y4", at: "Jan 28, 2026 20:05", atJa: "2026年1月28日 20:05", title: "Prize won!", titleJa: "景品が当選しました！", body: "Congratulations! A new prize has been added to your Prize History.", bodyJa: "おめでとうございます！新しい景品が当選履歴に追加されました。" },
];

const NOTIF_NOTICE: NotifItem[] = [
  { id: "n1", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "About emergency maintenance", titleJa: "緊急メンテナンス実施について", body: "We will perform emergency maintenance on Mar 15, 11:00–13:30. As a token of thanks for your cooperation, we've granted 500 points. We sincerely apologize for any inconvenience and thank you for your continued support of Oripalot.", bodyJa: "3月15日 11:00〜13:30に緊急メンテナンスを実施いたします。ご協力のお礼として500ポイントを付与いたしました。ご不便をおかけし深くお詫び申し上げます。今後とも「オリパロット」をよろしくお願いいたします。", unread: true },
  { id: "n2", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Payment error / purchase issue", titleJa: "特定決済エラー・購入トラブルについて", body: "As an apology for the issue on Jun 3 where coin purchases were not credited correctly, we've granted 1,000 coins to all users. The issue has been resolved and the service is back to normal. We deeply apologize for the inconvenience.", bodyJa: "6月3日に発生した「コイン購入が正常に反映されない不具合」のお詫びとして、一律1,000コインを付与いたしました。現在は復旧し正常にご利用いただけます。多大なるご不便をおかけしましたことを深くお詫び申し上げます。", unread: true },
  { id: "n3", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Year-end & New Year support delays", titleJa: "年末年始のサポート遅延", body: "Please note our support hours during the year-end/New Year period (Dec 29, 2026 – Jan 4, 2027). We will still accept inquiries, but replies may take longer than usual. Thank you for your understanding.", bodyJa: "年末年始期間（2026年12月29日〜2027年1月4日）のサポート対応についてお知らせいたします。期間中もお問い合わせは受け付けておりますが、ご返信に通常よりお時間をいただく場合がございます。ご理解のほどよろしくお願いいたします。" },
];

// Total unread across both notification lists — powers the bell badge.
const NOTIF_UNREAD_TOTAL = [...NOTIF_YOU, ...NOTIF_NOTICE].filter((n) => n.unread).length;

function NotificationsScreen({ lang, coins, empty = false, only, onBack, onHome }: { lang: Lang; coins: number; empty?: boolean; only?: "you" | "notice"; onBack: () => void; onHome: () => void }) {
  const t = STR[lang];
  const [tab, setTab] = useState<"you" | "notice">(only ?? "you");
  // Locally track which notifications have been opened (reset per visit).
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const isUnread = (it: NotifItem) => !empty && !!it.unread && !readIds.has(it.id);
  const markRead = (id: string) => setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const unreadCount = (l: NotifItem[]) => l.filter(isUnread).length;
  const youUnread = unreadCount(NOTIF_YOU);
  const noticeUnread = unreadCount(NOTIF_NOTICE);

  const list = tab === "you" ? NOTIF_YOU : NOTIF_NOTICE;
  const title = tab === "you" ? t.notifTabYou : t.notifTabNotice;
  return (
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <header className="shrink-0 bg-white">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <BrandLogo onClick={onHome} />
          <BalancePill coins={coins} t={t} />
        </div>

        {/* Tabs (hidden in single-tab mode) — each carries an unread badge */}
        {!only && (
          <div className="flex border-b border-black/10 px-2">
            {([
              { key: "you", label: t.notifTabYou, count: youUnread },
              { key: "notice", label: t.notifTabNotice, count: noticeUnread },
            ] as { key: "you" | "notice"; label: string; count: number }[]).map((tb) => {
              const active = tab === tb.key;
              return (
                <button key={tb.key} onClick={() => setTab(tb.key)} className="relative flex-1 pb-2.5 pt-1">
                  <span className="flex items-center justify-center gap-1.5">
                    <span className={`text-[13px] font-bold ${active ? "text-[#B40206]" : "text-[#1d2129]"}`}>{tb.label}</span>
                    {tb.count > 0 && (
                      <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#B40206] px-1 text-[10px] font-extrabold leading-none text-white">{tb.count}</span>
                    )}
                  </span>
                  {active && <span className="absolute inset-x-5 -bottom-px h-[3px] rounded-full bg-[#B40206]" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="flex h-7 w-7 items-center justify-center" aria-label={t.backAria}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#B40206" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-[20px] font-extrabold text-[#1d2129]">{title}</h2>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#eef0f3]">
        {empty || list.length === 0 ? (
          <p className="py-28 text-center text-[14px] text-[#9aa0a8]">{t.notifEmpty}</p>
        ) : (
          <div className="space-y-2.5 px-3 py-3">
            {list.map((it) => {
              const un = isUnread(it);
              return (
                <button
                  key={it.id}
                  onClick={() => un && markRead(it.id)}
                  className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${un ? "border-[#f1c4c4] bg-[#fff5f5]" : "border-black/10 bg-white"}`}
                >
                  {un && <span className="absolute inset-y-0 left-0 w-1 bg-[#B40206]" />}
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[#9aa0a8]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {lang === "ja" ? it.atJa : it.at}
                    {un && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-[#B40206] px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-wide text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />{t.notifNew}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-[14px] leading-snug ${un ? "font-extrabold text-[#1d2129]" : "font-semibold text-[#41464e]"}`}>{lang === "ja" ? it.titleJa : it.title}</p>
                  <p className={`mt-0.5 text-[12.5px] leading-relaxed ${un ? "text-[#6b7078]" : "text-[#8a9099]"}`}>{lang === "ja" ? it.bodyJa : it.body}</p>
                  {it.tracking && <p className="mt-0.5 text-[12.5px] text-[#8a9099]">{lang === "ja" ? "追跡番号：" : "Tracking number: "}{it.tracking}</p>}
                </button>
              );
            })}
          </div>
        )}
        <SiteFooter t={t} />
      </div>
    </div>
  );
}

function PhoneApp({ lang, noHistory }: { lang: Lang; noHistory: boolean }) {
  const t = STR[lang];
  const [screen, setScreen] = useState<Screen>("landing");
  const [prevScreen, setPrevScreen] = useState<Screen>("oripa");
  const [coins] = useState(10000);
  const [notifOnly, setNotifOnly] = useState<"you" | "notice" | undefined>(undefined);
  const goHome = () => setScreen("oripa");
  // PROD: login/sign-up land straight on the lobby (no onboarding flow).
  const enterHome = () => setScreen("oripa");
  const openNotifications = () => { setNotifOnly(undefined); setPrevScreen((p) => (screen === "notifications" ? p : screen)); setScreen("notifications"); };
  const onLanding = screen === "landing" || screen === "signup" || screen === "login";
  const showNav = !onLanding;
  return (
    <NotifNavContext.Provider value={onLanding ? () => {} : openNotifications}>
    <div className="flex h-full flex-col bg-[#eef0f3]">
      <div className="relative min-h-0 flex-1">
        {/* Logged-out lobby — V1 homepage layout */}
        {screen === "landing" && <LandingPage lang={lang} onSignUp={() => setScreen("signup")} onLogin={() => setScreen("login")} />}
        {screen === "signup" && <SignupPage lang={lang} onLogin={() => setScreen("login")} onSuccess={enterHome} />}
        {screen === "login" && <LoginPage lang={lang} onSignUp={() => setScreen("signup")} onSuccess={enterHome} />}
        {/* Logged-in lobby — V2 format */}
        {screen === "oripa" && <OripaHome lang={lang} coins={coins} onHome={goHome} />}
        {screen === "notifications" && <NotificationsScreen lang={lang} coins={coins} empty={noHistory} only={notifOnly} onBack={() => setScreen(prevScreen)} onHome={goHome} />}
      </div>
      {showNav && <BottomNav screen={screen} t={t} />}
    </div>
    </NotifNavContext.Provider>
  );
}

/* ── main ────────────────────────────────────────────────────────────── */
type Tab = "won" | "waiting" | "shipped";
type Toast = { id: number; text: string };

function VersionBadge() {
  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[90] rounded-md bg-black/70 px-2.5 py-1 text-[12px] font-semibold tracking-wide text-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
    >
      {APP_VERSION}
    </div>
  );
}

// Polls /api/version; when the deployed build differs from the one currently
// loaded in the browser, shows a small refresh prompt above the version badge.
function UpdatePrompt() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (alive && data.version && data.version !== APP_VERSION) setNewVersion(data.version);
      } catch {
        /* offline / transient — ignore */
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!newVersion || dismissed === newVersion) return null;

  return (
    <div className="fixed bottom-12 right-3 z-[91] flex items-center gap-2 rounded-lg bg-[#1d2129] py-2 pl-3 pr-2 text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)]" style={{ animation: "storeEduBannerIn .25s ease both" }}>
      <span className="text-[12.5px] font-semibold">New version available <span className="font-extrabold text-[#ffd36b]">{newVersion}</span></span>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-[#B40206] px-2.5 py-1 text-[12px] font-extrabold text-white active:scale-[0.97]"
      >
        Refresh
      </button>
      <button
        onClick={() => setDismissed(newVersion)}
        aria-label="Dismiss"
        className="flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:text-white active:bg-white/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

// Near-production shell: renders only the phone experience. Entry point is the
// logged-out lobby (V1); the internal POC config panel / flow-map are dropped.
export default function Page() {
  const [lang, setLang] = useState<Lang>("ja");
  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-[linear-gradient(180deg,#16171c_0%,#0f1014_100%)]">
      {/* Desktop: phone centred in a simple device frame */}
      <div className="relative hidden sm:block py-8">
        <div className="absolute right-full top-3 mr-4 w-max"><LangToggle lang={lang} setLang={setLang} /></div>
        <div className="rounded-[2.6rem] border border-white/12 bg-[#1b1c22] p-3 shadow-[0_35px_90px_rgba(0,0,0,0.55)]">
          <div className="rounded-[2.1rem] border border-white/8 bg-black p-2">
            <div className="mx-auto mb-2 h-6 w-28 rounded-full bg-white/10" />
            <div className="relative h-[812px] w-[390px] overflow-hidden rounded-[1.7rem] bg-[#eef0f3]">
              <PhoneApp lang={lang} noHistory={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: full-bleed phone */}
      <div className="relative w-full max-w-[440px] flex-1 overflow-hidden bg-[#eef0f3] sm:hidden" style={{ height: "100svh" }}>
        <PhoneApp lang={lang} noHistory={false} />
      </div>

      <UpdatePrompt />
      <VersionBadge />
    </main>
  );
}
