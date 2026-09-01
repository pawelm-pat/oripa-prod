// FAQ & Support content. Five categories, each with a handful of questions;
// the page renders the categories as jump chips and every question as an
// accordion row. Japanese is the source locale, English is a working
// translation, same convention as legal.ts.

import type { Lang } from "../lib/types";

export type FaqCategoryKey = "account" | "payment" | "gacha" | "shipping" | "other";

export type FaqEntry = { q: string; a: string[] };
export type FaqCategory = { key: FaqCategoryKey; title: string; entries: FaqEntry[] };

const EN: FaqCategory[] = [
  {
    key: "account",
    title: "Member Registration & Account",
    entries: [
      {
        q: "How do I create an account?",
        a: [
          "Tap Sign Up and register with your email address, or continue with LINE, Google or X. Registration is free and takes about a minute.",
          "When you register by email we send you a 6-digit verification code. Enter it on the next screen to activate the account.",
        ],
      },
      {
        q: "The verification email never arrived.",
        a: [
          "Check your junk and promotions folders first, then make sure your carrier allows mail from @oripalot.com. Mobile carriers block unknown domains by default.",
          "You can resend the code from the verification screen. If it still does not arrive, send us the address you registered with from the inquiry form below.",
        ],
      },
      {
        q: "Can I change my display name or email later?",
        a: ["Yes. Open My Page, tap Edit Profile and update your display name, email address or phone number. The change applies immediately."],
      },
      {
        q: "How do I close my account?",
        a: ["Send a closure request from the inquiry form. Any remaining coins, free points and prizes that have not been shipped are forfeited when the account is closed."],
      },
    ],
  },
  {
    key: "payment",
    title: "Coin Payment",
    entries: [
      {
        q: "Which payment methods can I use?",
        a: ["Credit and debit cards (Visa, Mastercard, JCB, AMEX) are available today. Convenience store payment and bank transfer are being added."],
      },
      {
        q: "I paid but my coins have not arrived.",
        a: [
          "Coins are usually credited within a few minutes. Open My Page and check Purchase history — a completed purchase is listed there with its payment ID.",
          "If the purchase is listed as completed but the balance is unchanged, send us that payment ID from the inquiry form and we will credit it manually.",
        ],
      },
      {
        q: "What is the difference between coins and free points?",
        a: [
          "Coins are the currency you buy in the store. Free points are granted by campaigns, referrals and prize exchanges.",
          "Both can be used to draw oripa. Free points cannot be refunded or transferred, and they are always spent before purchased coins.",
        ],
      },
      {
        q: "Do coins expire?",
        a: ["Coins expire 180 days after your most recent purchase. Any purchase resets the expiry for your whole balance."],
      },
      {
        q: "Can I get a refund?",
        a: ["Coins that have already been used to draw cannot be refunded. For unused coins, contact us from the inquiry form within 14 days of the purchase."],
      },
    ],
  },
  {
    key: "gacha",
    title: "Using Oripa & Gacha",
    entries: [
      {
        q: "How does a draw work?",
        a: [
          "Open a pack, choose how many draws you want (1, 5, 10 or a custom amount) and confirm. The cost is deducted from your balance and the results are revealed straight away.",
          "Everything you pull is stored in My Loot, where you can request shipping or exchange it for coins.",
        ],
      },
      {
        q: "What does the remaining counter mean?",
        a: ["It shows how many cards are left in that pack. When it reaches zero the pack is sold out and can no longer be drawn."],
      },
      {
        q: "Why does it say I reached the daily limit?",
        a: ["Some packs cap how many times one account can draw them per day. The counter resets at 00:00 JST, and other packs stay available in the meantime."],
      },
      {
        q: "The draw failed with a connection error.",
        a: ["No coins are deducted when a draw fails. Check your balance, and if it does not match, send us the time of the draw from the inquiry form."],
      },
    ],
  },
  {
    key: "shipping",
    title: "Prize Shipping & Delivery",
    entries: [
      {
        q: "How do I request shipping for a prize?",
        a: ["Open My Loot, select the cards you want on the Not selected tab and tap Request shipping. Pick a saved address or add a new one, then confirm."],
      },
      {
        q: "How long does delivery take?",
        a: ["Prizes are dispatched within 14 business days of the shipping request. Once the parcel leaves our warehouse the tracking number appears on the Shipped tab."],
      },
      {
        q: "How much does shipping cost?",
        a: ["The first shipment each month is free. After that a ¥500 shipping fee is charged at checkout, so it is worth grouping several cards into one request."],
      },
      {
        q: "Can I exchange a prize for coins instead?",
        a: ["Yes. Every card shows its coin value and the exchange period on the card in My Loot. Once the exchange period ends the card can only be shipped."],
      },
      {
        q: "Can I change the delivery address after requesting shipping?",
        a: ["Contact us from the inquiry form as soon as possible. We can only change the address while the parcel is still being prepared."],
      },
    ],
  },
  {
    key: "other",
    title: "Troubleshooting & Others",
    entries: [
      {
        q: "A page will not load or shows an error.",
        a: ["Reload the page, then try again with the latest version of your browser. If the problem continues, send us a screenshot from the inquiry form."],
      },
      {
        q: "I forgot my password.",
        a: ["Tap Forgot password on the log-in screen and follow the reset link we email you. The link is valid for 30 minutes."],
      },
      {
        q: "I think someone else used my account.",
        a: ["Change your password immediately and contact us from the inquiry form. We can suspend the account while we investigate."],
      },
      {
        q: "When will I get a reply to my inquiry?",
        a: ["Support replies within two business days. Our desk is open on weekdays from 10:00 to 18:00 JST, excluding public holidays."],
      },
    ],
  },
];

const JA: FaqCategory[] = [
  {
    key: "account",
    title: "会員登録・アカウント",
    entries: [
      {
        q: "アカウントはどうやって作成しますか？",
        a: [
          "「新規登録」からメールアドレスで登録するか、LINE・Google・Xでそのまま続行できます。登録は無料で、1分ほどで完了します。",
          "メールで登録した場合は6桁の認証コードをお送りします。次の画面で入力するとアカウントが有効になります。",
        ],
      },
      {
        q: "認証メールが届きません。",
        a: [
          "まず迷惑メールフォルダをご確認のうえ、@oripalot.com からのメールを受信できる設定になっているかご確認ください。携帯キャリアでは初期設定でブロックされる場合があります。",
          "認証画面からコードを再送できます。それでも届かない場合は、登録したメールアドレスを添えてお問い合わせフォームからご連絡ください。",
        ],
      },
      {
        q: "ニックネームやメールアドレスは後から変更できますか？",
        a: ["変更できます。マイページの「プロフィール編集」から、ニックネーム・メールアドレス・電話番号を更新してください。変更はすぐに反映されます。"],
      },
      {
        q: "退会したいときはどうすればよいですか？",
        a: ["お問い合わせフォームから退会をお申し付けください。退会時点で残っているコイン・フリーポイント・未発送の景品は失効します。"],
      },
    ],
  },
  {
    key: "payment",
    title: "コイン・お支払い",
    entries: [
      {
        q: "利用できる支払い方法を教えてください。",
        a: ["現在はクレジットカード・デビットカード（Visa／Mastercard／JCB／AMEX）がご利用いただけます。コンビニ決済と銀行振込は準備中です。"],
      },
      {
        q: "支払いは完了したのにコインが反映されません。",
        a: [
          "コインは通常数分以内に反映されます。マイページの「購入履歴」に、決済IDとともに完了した購入が表示されているかご確認ください。",
          "購入が完了と表示されているのに残高が変わらない場合は、その決済IDをお問い合わせフォームからお知らせください。手動で付与いたします。",
        ],
      },
      {
        q: "コインとフリーポイントの違いは何ですか？",
        a: [
          "コインはストアで購入する通貨です。フリーポイントはキャンペーン・友達紹介・景品交換で付与されます。",
          "どちらもオリパの抽選に使えます。フリーポイントは返金・譲渡ができず、購入コインより先に消費されます。",
        ],
      },
      {
        q: "コインに有効期限はありますか？",
        a: ["最後に購入した日から180日で失効します。新たに購入すると、残高全体の有効期限が延長されます。"],
      },
      {
        q: "返金はできますか？",
        a: ["抽選に使用済みのコインは返金できません。未使用分については、購入から14日以内にお問い合わせフォームよりご連絡ください。"],
      },
    ],
  },
  {
    key: "gacha",
    title: "オリパ・ガチャの利用",
    entries: [
      {
        q: "抽選の流れを教えてください。",
        a: [
          "パックを開き、引く回数（1回・5回・10回・カスタム）を選んで確定します。残高から代金が引かれ、結果はその場で表示されます。",
          "獲得したカードはすべて「マイルート」に保管され、発送依頼またはコイン交換ができます。",
        ],
      },
      {
        q: "「残り」の数字は何を表していますか？",
        a: ["そのパックに残っているカードの枚数です。0になるとパックは完売となり、それ以降は引けません。"],
      },
      {
        q: "「1日の上限に達しました」と表示されます。",
        a: ["一部のパックは1アカウントあたりの1日の抽選回数に上限があります。上限は日本時間0時にリセットされ、その間も他のパックはご利用いただけます。"],
      },
      {
        q: "通信エラーで抽選が失敗しました。",
        a: ["抽選が失敗した場合、コインは差し引かれません。残高をご確認のうえ、相違がある場合は抽選した時刻をお問い合わせフォームからお知らせください。"],
      },
    ],
  },
  {
    key: "shipping",
    title: "景品の発送・配送",
    entries: [
      {
        q: "景品の発送はどう依頼しますか？",
        a: ["マイルートを開き、「未選択」タブで発送したいカードを選んで「発送を依頼する」をタップします。登録済みの住所を選ぶか、新しい住所を追加して確定してください。"],
      },
      {
        q: "配送までどのくらいかかりますか？",
        a: ["発送依頼から14営業日以内に発送します。倉庫を出荷した時点で、追跡番号が「発送済み」タブに表示されます。"],
      },
      {
        q: "送料はいくらですか？",
        a: ["毎月1回目の発送は無料です。2回目以降はお会計時に送料500円がかかりますので、複数枚をまとめて依頼するのがおすすめです。"],
      },
      {
        q: "景品をコインに交換できますか？",
        a: ["交換できます。マイルートの各カードに交換コイン数と交換期間が表示されます。交換期間が終了したカードは発送のみとなります。"],
      },
      {
        q: "発送依頼後に住所を変更できますか？",
        a: ["できるだけ早くお問い合わせフォームからご連絡ください。梱包前であれば住所を変更できます。"],
      },
    ],
  },
  {
    key: "other",
    title: "トラブル・その他",
    entries: [
      {
        q: "ページが表示されない・エラーが出ます。",
        a: ["まずページを再読み込みし、最新版のブラウザでお試しください。改善しない場合は、スクリーンショットを添えてお問い合わせフォームからご連絡ください。"],
      },
      {
        q: "パスワードを忘れました。",
        a: ["ログイン画面の「パスワードをお忘れですか？」から、メールでお送りする再設定リンクをご利用ください。リンクの有効期限は30分です。"],
      },
      {
        q: "第三者にアカウントを利用された可能性があります。",
        a: ["ただちにパスワードを変更し、お問い合わせフォームからご連絡ください。調査の間、アカウントを一時停止することができます。"],
      },
      {
        q: "問い合わせの返信はいつ届きますか？",
        a: ["2営業日以内にご返信します。受付は平日10:00〜18:00（日本時間、祝日を除く）です。"],
      },
    ],
  },
];

export const FAQ: Record<Lang, FaqCategory[]> = { en: EN, ja: JA };
