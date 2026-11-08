import { coolapkHtmlToPlainText } from '../../utils/sanitizeHtml';
import { renderCoolapkRichText } from '../../utils/richText';
import {
  getMessageSenderUid,
  getMessageUnreadCount,
  isMessageSentByCurrentUser,
} from '../../utils/messageUnread';

export type MessageLike = Record<string, any>;

export interface ChatHistoryPaginationState {
  nextPage: number;
  firstItem: string;
  lastItem: string;
  hasMore: boolean;
}

export function getEntityType(item: MessageLike): string {
  return String(item?.entityType ?? item?.entity_type ?? '').trim();
}

export function getEntityTemplate(item: MessageLike): string {
  return String(item?.entityTemplate ?? item?.entity_template ?? '').trim();
}

export function isFollowTipEntity(item: MessageLike): boolean {
  return getEntityType(item) === 'messageExtra' && getEntityTemplate(item) === 'float';
}

export function getSessionPartnerUid(session: MessageLike | null | undefined, currentUid: string): string {
  if (!session) return '';
  if (session.messageUid) return String(session.messageUid);

  const senderUid = getMessageSenderUid(session);
  const recipientUid = String(session.uid ?? session.toUid ?? session.to_uid ?? '').trim();
  const myUid = String(currentUid || '').trim();
  if (myUid && senderUid === myUid && recipientUid) return recipientUid;
  if (myUid && recipientUid === myUid && senderUid) return senderUid;
  return String(session.fromuid || session.uid || '');
}

export function getSessionKey(session: MessageLike | null | undefined): string {
  return String(session?.ukey || session?.id || '').trim();
}

export function getSessionUnreadCount(session: MessageLike, currentUid: string): number {
  return getMessageUnreadCount(session, currentUid);
}

export function getSessionUnreadLabel(session: MessageLike, currentUid: string): string {
  const unreadCount = getSessionUnreadCount(session, currentUid);
  return unreadCount > 99 ? '99+' : String(unreadCount);
}

export function isSessionUnread(session: MessageLike, currentUid: string): boolean {
  return getSessionUnreadCount(session, currentUid) > 0;
}

export function clearSessionUnreadState(session: MessageLike | null | undefined): void {
  if (!session) return;
  session.isnew = 0;
  session.isNew = false;
  session.unreadNum = 0;
  session.unread_num = 0;
  session.unread_count = 0;
  session.unreadCount = 0;
}

export function normalizeSessionUnreadState(session: MessageLike | null | undefined, currentUid: string): MessageLike | null | undefined {
  if (!session || !isMessageSentByCurrentUser(session, currentUid)) return session;
  const normalized = { ...session };
  clearSessionUnreadState(normalized);
  return normalized;
}

export function isSameSession(left: MessageLike | null | undefined, right: MessageLike | null | undefined, currentUid: string): boolean {
  if (!left || !right) return false;
  const leftKey = getSessionKey(left);
  const rightKey = getSessionKey(right);
  if (leftKey && rightKey && leftKey === rightKey) return true;
  const leftUid = getSessionPartnerUid(left, currentUid);
  const rightUid = getSessionPartnerUid(right, currentUid);
  return Boolean(leftUid && rightUid && leftUid === rightUid);
}

export function getUsername(session: MessageLike | null | undefined): string {
  if (!session) return '未知酷友';
  return session.messageUsername || session.fromusername || session.username || '未知酷友';
}

export function getSessionPartnerAvatar(session: MessageLike | null | undefined): string {
  if (!session) return '';
  return session.messageUserAvatar || session.fromUserAvatar
    || session.messageUserInfo?.userAvatar || '';
}

export function getLastMessage(item: MessageLike): string {
  return coolapkHtmlToPlainText(item.message || item.lastMessage || item.summary || item.last_message || '');
}

export function getMessageText(item: MessageLike): string {
  return item.message || item.text || item.content || '';
}

export function getDateline(item: MessageLike): number | string {
  return item.dateline || item.lastupdate || item.time || item.created_at || 0;
}

export function getPicUrl(msg: MessageLike | null | undefined): string {
  if (!msg) return '';
  const pic = msg.message_pic || msg.pic || msg.image;
  if (!pic) return '';
  if (msg.message_pic && msg.id) {
    return `https://api.coolapk.com/v6/message/showImage?id=${msg.id}&type=n`;
  }
  return String(pic).startsWith('/') ? `https://image.coolapk.com${pic}` : pic;
}

export function renderMessageContent(msg: MessageLike | null | undefined): string {
  if (!msg) return '';
  const text = getMessageText(msg);
  return text ? renderCoolapkRichText(text) : '';
}

export function renderSessionLastMessage(session: MessageLike): string {
  const text = getLastMessage(session);
  return text ? renderCoolapkRichText(text) : '';
}

export function getSystemNoticeText(msg: MessageLike | null | undefined): string {
  if (!msg) return '';
  return msg.title || msg.message || msg.text || '';
}

export function isWarningNotice(msg: MessageLike): boolean {
  const text = getSystemNoticeText(msg);
  return ['交易', '防骗', '损失', '现金', '陌生人'].some((keyword) => text.includes(keyword));
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : String(num);
}

function toDate(time: number | string): Date {
  return new Date(typeof time === 'number' && time < 10000000000 ? time * 1000 : time);
}

export function formatSessionTime(time: number | string, now = new Date()): string {
  if (!time) return '';
  const date = toDate(time);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const isToday = year === now.getFullYear() && date.getMonth() === now.getMonth() && day === now.getDate();
  if (isToday) return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday = year === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && day === yesterday.getDate();
  if (isYesterday) return '昨天';
  if (year === now.getFullYear()) return `${padZero(month)}-${padZero(day)}`;
  return `${year}-${padZero(month)}-${padZero(day)}`;
}

export function formatMessageTime(time: number | string, now = new Date()): string {
  if (!time) return '';
  const date = toDate(time);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const timeStr = `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
  const isToday = year === now.getFullYear() && date.getMonth() === now.getMonth() && day === now.getDate();
  if (isToday) return timeStr;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday = year === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && day === yesterday.getDate();
  if (isYesterday) return `昨天 ${timeStr}`;
  if (year === now.getFullYear()) return `${padZero(month)}-${padZero(day)} ${timeStr}`;
  return `${year}-${padZero(month)}-${padZero(day)} ${timeStr}`;
}

export const formatTime = formatSessionTime;

export function isSelf(msg: MessageLike | null | undefined, currentUid: string): boolean {
  if (!msg?.fromuid) return false;
  return String(msg.fromuid) === String(currentUid || '');
}

export function getChatHistoryItemId(item: MessageLike): string {
  return String(item?.entityId ?? item?.entity_id ?? item?.id ?? '').trim();
}

export function getChatHistoryItemKey(item: MessageLike): string {
  const itemId = getChatHistoryItemId(item);
  if (itemId) return itemId;
  const dateline = String(item?.dateline ?? '');
  const sender = String(item?.fromuid ?? item?.fromUid ?? item?.uid ?? '');
  const message = String(item?.message ?? item?.messageText ?? '');
  const picture = String(item?.message_pic ?? item?.messagePic ?? '');
  return dateline || sender || message || picture ? `fallback:${dateline}:${sender}:${message}:${picture}` : '';
}

export function sortChatHistory(items: MessageLike[]): MessageLike[] {
  return [...items].sort((a, b) => Number(getDateline(a) || 0) - Number(getDateline(b) || 0));
}

export function mergeChatHistory(existing: MessageLike[], incoming: MessageLike[], prepend = false): MessageLike[] {
  const unmatchedIncoming = [...incoming];
  const existingIds = new Set(existing.filter((item) => !item.__localPending).map(getChatHistoryItemId).filter(Boolean));
  const reconciledExisting = existing.filter((item) => {
    if (!item.__localPending) return true;
    const matchIndex = unmatchedIncoming.findIndex((serverItem) =>
      getChatHistoryItemId(serverItem)
      && !existingIds.has(getChatHistoryItemId(serverItem))
      && String(serverItem.fromuid ?? serverItem.fromUid ?? '') === String(item.fromuid ?? '')
      && String(getMessageText(serverItem)) === String(getMessageText(item))
      && String(serverItem.message_pic ?? serverItem.messagePic ?? '') === String(item.message_pic ?? '')
      && Math.abs(Number(getDateline(serverItem)) - Number(getDateline(item))) <= 60,
    );
    if (matchIndex < 0) return true;
    unmatchedIncoming.splice(matchIndex, 1);
    return false;
  });
  const result = prepend ? [...incoming, ...reconciledExisting] : [...reconciledExisting, ...incoming];
  const seen = new Set<string>();
  return result.filter((item) => {
    const key = getChatHistoryItemKey(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getOldestChatHistoryCursor(items: MessageLike[]): string {
  for (const item of items) {
    if (item.__localPending || (getEntityType(item) === 'messageExtra' && getEntityTemplate(item) !== 'time')) continue;
    const itemId = getChatHistoryItemId(item);
    if (itemId) return itemId;
  }
  return '';
}

export function getNewestChatHistoryCursor(items: MessageLike[]): string {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.__localPending || (getEntityType(item) === 'messageExtra' && getEntityTemplate(item) !== 'time')) continue;
    const itemId = getChatHistoryItemId(item);
    if (itemId) return itemId;
  }
  return '';
}

export function createChatHistoryPagination(items: MessageLike[] = [], nextPage = 2): ChatHistoryPaginationState {
  return { nextPage, firstItem: getOldestChatHistoryCursor(items), lastItem: '', hasMore: items.length > 0 };
}

