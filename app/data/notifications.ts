// Notification feed data (You / Notice tabs).

import type { NotifItem } from "../lib/types";

export const NOTIF_YOU: NotifItem[] = [
  { id: "y1", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Your item has been shipped", titleJa: "商品を発送しました", body: "Your prize is on its way. Delivery takes up to 14 business days.", bodyJa: "景品を発送しました。お届けまで最大14営業日かかります。", tracking: "AA123456789JP", unread: true },
  { id: "y2", at: "Feb 02, 2026 18:40", atJa: "2026年2月02日 18:40", title: "Shipping request received", titleJa: "発送リクエストを受け付けました", body: "We have received your shipping request and are preparing your prize.", bodyJa: "発送リクエストを受け付けました。景品の準備を進めています。", unread: true },
  { id: "y3", at: "Jan 30, 2026 09:12", atJa: "2026年1月30日 09:12", title: "Prizes converted to coins", titleJa: "景品をコインに交換しました", body: "Your selected prizes were converted to Coins.", bodyJa: "選択した景品をコインに交換しました。" },
  { id: "y4", at: "Jan 28, 2026 20:05", atJa: "2026年1月28日 20:05", title: "Prize won!", titleJa: "景品が当選しました！", body: "Congratulations! A new prize has been added to your Prize History.", bodyJa: "おめでとうございます！新しい景品が当選履歴に追加されました。" },
];

export const NOTIF_NOTICE: NotifItem[] = [
  { id: "n1", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "About emergency maintenance", titleJa: "緊急メンテナンス実施について", body: "We will perform emergency maintenance on Mar 15, 11:00–13:30. As a token of thanks for your cooperation, we've granted 500 points. We sincerely apologize for any inconvenience and thank you for your continued support of Oripalot.", bodyJa: "3月15日 11:00〜13:30に緊急メンテナンスを実施いたします。ご協力のお礼として500ポイントを付与いたしました。ご不便をおかけし深くお詫び申し上げます。今後とも「オリパロット」をよろしくお願いいたします。", unread: true },
  { id: "n2", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Payment error / purchase issue", titleJa: "特定決済エラー・購入トラブルについて", body: "As an apology for the issue on Jun 3 where coin purchases were not credited correctly, we've granted 1,000 coins to all users. The issue has been resolved and the service is back to normal. We deeply apologize for the inconvenience.", bodyJa: "6月3日に発生した「コイン購入が正常に反映されない不具合」のお詫びとして、一律1,000コインを付与いたしました。現在は復旧し正常にご利用いただけます。多大なるご不便をおかけしましたことを深くお詫び申し上げます。", unread: true },
  { id: "n3", at: "Feb 03, 2026 22:14", atJa: "2026年2月03日 22:14", title: "Year-end & New Year support delays", titleJa: "年末年始のサポート遅延", body: "Please note our support hours during the year-end/New Year period (Dec 29, 2026 – Jan 4, 2027). We will still accept inquiries, but replies may take longer than usual. Thank you for your understanding.", bodyJa: "年末年始期間（2026年12月29日〜2027年1月4日）のサポート対応についてお知らせいたします。期間中もお問い合わせは受け付けておりますが、ご返信に通常よりお時間をいただく場合がございます。ご理解のほどよろしくお願いいたします。" },
];

// Total unread across both notification lists — powers the bell badge.

export const NOTIF_UNREAD_TOTAL = [...NOTIF_YOU, ...NOTIF_NOTICE].filter((n) => n.unread).length;

/* ── Demo delivery (dev harness) ──────────────────────────────────────────
   The "Send new notifications" toggle drops fresh unread items into either
   tab, so the empty state can be filled back up after everything is swiped
   away. Nothing here is part of the product feed. */

type NotifTemplate = Omit<NotifItem, "id" | "at" | "atJa" | "unread">;

const YOU_TEMPLATES: NotifTemplate[] = [
  { title: "Prize won!", titleJa: "景品が当選しました！", body: "Congratulations! A new prize has been added to your Prize History.", bodyJa: "おめでとうございます！新しい景品が当選履歴に追加されました。" },
  { title: "Coins credited", titleJa: "コインを付与しました", body: "1,000 Coins have been added to your balance. They are ready to use on any oripa.", bodyJa: "1,000コインを残高に追加しました。オリパでご利用いただけます。" },
  { title: "Your item has been shipped", titleJa: "商品を発送しました", body: "Your prize is on its way. Delivery takes up to 14 business days.", bodyJa: "景品を発送しました。お届けまで最大14営業日かかります。", tracking: "AA987654321JP" },
  { title: "Quest complete", titleJa: "クエストを達成しました", body: "You finished today's quest and unlocked its coin reward.", bodyJa: "本日のクエストを達成し、コイン報酬を獲得しました。" },
  { title: "Free points expiring soon", titleJa: "フリーポイントの有効期限が近づいています", body: "Some of your free points expire in 3 days. Use them on any oripa before they go.", bodyJa: "一部のフリーポイントは3日後に失効します。お早めにご利用ください。" },
  { title: "Rank upgraded", titleJa: "ランクがアップしました", body: "You reached Silver rank. Enjoy your new loyalty benefits.", bodyJa: "シルバーランクに到達しました。新しい特典をお楽しみください。" },
];

const NOTICE_TEMPLATES: NotifTemplate[] = [
  { title: "New oripa released", titleJa: "新しいオリパが登場しました", body: "A new limited pack is now live in the lobby. Stock is capped, so draw early.", bodyJa: "新しい限定パックがロビーに登場しました。数量限定のためお早めにどうぞ。" },
  { title: "Scheduled maintenance", titleJa: "メンテナンス実施のお知らせ", body: "We will perform scheduled maintenance tonight from 02:00 to 04:00. Draws will be unavailable during this window.", bodyJa: "本日2:00〜4:00に定期メンテナンスを実施いたします。時間中はガチャをご利用いただけません。" },
  { title: "Weekend coin campaign", titleJa: "週末コインキャンペーン", body: "Buy coins this weekend and receive a bonus on every package.", bodyJa: "今週末のコイン購入で、すべてのパッケージにボーナスを進呈します。" },
  { title: "App update available", titleJa: "アプリのアップデートのお知らせ", body: "A new version is available with faster draws and a refreshed My Loot.", bodyJa: "ガチャの高速化とマイルートの刷新を含む新バージョンを公開しました。" },
  { title: "Support hours changed", titleJa: "サポート受付時間の変更", body: "Our support desk now answers inquiries from 10:00 to 19:00 on weekdays.", bodyJa: "サポート窓口の受付時間を平日10:00〜19:00に変更いたしました。" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

// A fresh unread notification for the given tab, stamped with the current time.
export function randomNotif(kind: "you" | "notice", seq: number): NotifItem {
  const pool = kind === "you" ? YOU_TEMPLATES : NOTICE_TEMPLATES;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  const d = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    ...tpl,
    id: `gen-${kind}-${seq}`,
    at: `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${time}`,
    atJa: `${d.getFullYear()}年${d.getMonth() + 1}月${pad(d.getDate())}日 ${time}`,
    unread: true,
  };
}
