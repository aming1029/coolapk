<template>
  <div v-pull-refresh="{ refresh: refreshMobilePage, disabled: mobileChatActive || isNotLoggedIn || loadingSessions || loadingMoreSessions }"
    class="messages-page"
    :class="{
      'is-mobile-chat-active': mobileChatActive,
      'is-mobile-login-state': isNotLoggedIn,
    }"
  >
    <MessageSessionList
      :sessions="sessions"
      :current-session="currentSession"
      :loading="loadingSessions"
      :loading-more="loadingMoreSessions"
      :has-more="hasMoreSessions"
      :more-error="sessionsMoreError"
      :is-not-logged-in="isNotLoggedIn"
      :display-error="displaySessionsError"
      :sidebar-width="sidebarWidth"
      :is-same-session="isSameSession"
      :is-session-unread="isSessionUnread"
      :get-partner-avatar="getSessionPartnerAvatar"
      :get-username="getUsername"
      :format-time="(session) => formatTime(getDateline(session))"
      :render-last-message="renderSessionLastMessage"
      :get-unread-count="getSessionUnreadCount"
      :get-unread-label="getSessionUnreadLabel"
      @select="selectSession"
      @scroll="handleSessionScroll"
      @load-more="loadMoreSessions"
      @retry="loadSessions"
      @resize-start="startResizeSidebar"
      @reset-width="resetSidebarWidth"
    />

    <!-- 右侧聊天区域 -->
    <div class="messages-main" v-if="currentSession">
      <div class="main-header">
        <button
          type="button"
          class="mobile-session-back"
          aria-label="返回会话列表"
          @click="showMobileSessionList"
        >
          <i class="fas fa-arrow-left"></i>
        </button>
        <div 
          class="header-partner-info clickable-header" 
          @click="navigateToUser(getSessionPartnerUid(currentSession))"
          title="点击查看个人主页"
        >
          <AppAvatar :src="getSessionPartnerAvatar(currentSession)" size="sm" class="header-avatar" />
          <h3 class="header-username">{{ getUsername(currentSession) }}</h3>
          <i class="fas fa-chevron-right header-link-icon"></i>
        </div>
      </div>
      
      <MessageThread
        ref="messageThreadRef"
        :current-session="currentSession"
        :current-user-uid="currentUserUid"
        :current-user-avatar="authStore.user?.userAvatar"
        :messages="renderableChatHistory"
        :follow-tip="followTipEntity"
        :follow-notice-text="followTipEntity ? getSystemNoticeText(followTipEntity) : ''"
        :loading="loadingHistory"
        :error="historyError"
        :loading-more="loadingMoreHistory"
        :load-more-error="historyLoadMoreError"
        :following="followingPartner"
        :confirming-follow="confirmingFollow"
        :ready="isChatPositionReady"
        :get-entity-type="getEntityType"
        :is-warning-notice="isWarningNotice"
        :get-system-notice-text="getSystemNoticeText"
        :is-self="isSelf"
        :get-partner-avatar="getSessionPartnerAvatar"
        :get-partner-uid="getSessionPartnerUid"
        :get-pic-url="getPicUrl"
        :get-message-text="getMessageText"
        :render-message-content="renderMessageContent"
        :format-time="formatMessageTime"
        :get-dateline="getDateline"
        :get-diagnostic-link="getDiagnosticLink"
        @scroll="handleChatScroll"
        @retry="retryCurrentSession"
        @follow="handleFollowPartner"
        @retry-load-more="retryLoadMoreHistory"
        @open-user="navigateToUser"
        @open-image="openMessageImage"
        @open-diagnostic="(link) => router.push({ path: '/settings/diagnostics', query: { report: link } })"
      />
      
      <MessageComposer
        ref="composerRef"
        v-model="inputText"
        :pending-images="pendingImages"
        :sending="sending"
        :sending-image="sendingImage"
        :draft-saved="draftSaved"
        :input-height="visibleInputHeight"
        :is-fullscreen="isInputFullscreen"
        :show-shortcut-hints="showShortcutHints"
        :session-key="String(currentSession?.ukey || currentSession?.id || '')"
        @add-files="appendPendingImages"
        @send-file="sendImageFile"
        @remove-image="removePendingImage"
        @favorite-picture="selectFavoritePicture"
        @send="sendMessage"
        @resize-start="startResizeInput"
        @reset-height="resetInputHeight"
        @toggle-fullscreen="toggleInputFullscreen"
        @keydown="handleKeydown"
      />
    </div>
    
    <!-- 空状态占位 -->
    <div class="messages-main empty-main" v-else>
      <div v-if="isNotLoggedIn" class="not-login-main-card">
        <div class="not-login-main-icon">
          <i class="fas fa-comments"></i>
        </div>
        <h3 class="not-login-main-title">登录开启私信畅聊</h3>
        <p class="not-login-main-desc">与酷友畅谈数码科技，分享精彩生活动态</p>
        <AppButton variant="primary" size="md" @click="authStore.openLoginModal()">
          <i class="fas fa-sign-in-alt"></i> 立即登录酷安账号
        </AppButton>
      </div>
      <EmptyState v-else title="选择一个会话开始聊天" icon="far fa-comments" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { vPullRefresh } from '../directives/pullRefresh';
import { ref, onMounted, onUnmounted, onActivated, onDeactivated, nextTick, computed, watch } from 'vue';

defineOptions({
  name: 'MessagesPage'
});
import { CoolapkTauriAPI } from '../api/coolapk';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { useNotificationStore } from '../stores/notifications';
import { useSettingsStore } from '../stores/settings';
import { useShortcutHints } from '../composables/useShortcutHints';
import { useMessageLayout } from '../features/messages/useMessageLayout';
import AppAvatar from '../components/common/AppAvatar.vue';
import EmptyState from '../components/common/EmptyState.vue';
import AppButton from '../components/common/AppButton.vue';
import MessageComposer from '../components/messages/MessageComposer.vue';
import MessageSessionList from '../components/messages/MessageSessionList.vue';
import MessageThread from '../components/messages/MessageThread.vue';
import type { EmojiPicture } from '../utils/emojiPanel';
import { clearMessageDraft, loadMessageDraft, saveMessageDraft } from '../utils/messageDrafts';
import { isTouchMobilePlatform } from '../utils/platform';
import { requestConfirmation } from '../utils/confirm';
import { showToast } from '../utils/toast';
import { getSelfMessageUnreadCount } from '../utils/messageUnread';
import {
  clearSessionUnreadState,
  createChatHistoryPagination as createChatHistoryPaginationState,
  formatMessageTime,
  formatTime,
  getChatHistoryItemId,
  getChatHistoryItemKey,
  getDateline,
  getEntityTemplate,
  getEntityType,
  getMessageText,
  getNewestChatHistoryCursor as getNewestChatHistoryCursorFor,
  getOldestChatHistoryCursor as getOldestChatHistoryCursorFor,
  getPicUrl,
  getSessionKey as getSessionKeyFor,
  getSessionPartnerAvatar,
  getSessionPartnerUid as getSessionPartnerUidFor,
  getSessionUnreadCount as getSessionUnreadCountFor,
  getSessionUnreadLabel as getSessionUnreadLabelFor,
  getSystemNoticeText,
  getUsername,
  isFollowTipEntity,
  isSameSession as isSameSessionFor,
  isSelf as isSelfFor,
  isSessionUnread as isSessionUnreadFor,
  isWarningNotice,
  mergeChatHistory,
  normalizeSessionUnreadState as normalizeSessionUnreadStateFor,
  renderMessageContent,
  renderSessionLastMessage,
  sortChatHistory,
  type ChatHistoryPaginationState,
  type MessageLike,
} from '../features/messages/messageModel';
import {
  appendPendingImageFiles,
  clearPendingImageUrls,
  createRemotePendingImage,
  removePendingImageAt,
  type PendingImageItem,
} from '../features/messages/messageEditor';

import { getDiagnosticLink } from '../utils/feedbackDiagnostics';

import { useRoute, useRouter } from 'vue-router';
import { useAndroidBackButton } from '../utils/androidBackButton';

// --- 状态管理 ---
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const settingsStore = useSettingsStore();
const showShortcutHints = useShortcutHints();
const currentUserUid = computed(() => String(authStore.user?.uid || ''));
const getSessionPartnerUid = (session: MessageLike | null | undefined) => getSessionPartnerUidFor(session, currentUserUid.value);
const getSessionKey = (session: MessageLike | null | undefined) => getSessionKeyFor(session);
const getSessionUnreadCount = (session: MessageLike) => getSessionUnreadCountFor(session, currentUserUid.value);
const getSessionUnreadLabel = (session: MessageLike) => getSessionUnreadLabelFor(session, currentUserUid.value);
const isSessionUnread = (session: MessageLike) => isSessionUnreadFor(session, currentUserUid.value);
const normalizeSessionUnreadState = (session: MessageLike | null | undefined) => normalizeSessionUnreadStateFor(session, currentUserUid.value);
const isSameSession = (left: MessageLike | null | undefined, right: MessageLike | null | undefined) => isSameSessionFor(left, right, currentUserUid.value);
const isSelf = (msg: MessageLike | null | undefined) => isSelfFor(msg, currentUserUid.value);
const getOldestChatHistoryCursor = (items: MessageLike[]) => getOldestChatHistoryCursorFor(items);
const getNewestChatHistoryCursor = (items: MessageLike[]) => getNewestChatHistoryCursorFor(items);

const navigateToUser = (uid?: string | number) => {
  if (uid === undefined || uid === null || uid === '') return;
  router.push(`/user/${uid}`);
};

const sessions = ref<any[]>([]);
const loadingSessions = ref(false);
const loadingMoreSessions = ref(false);
const hasMoreSessions = ref(true);
const sessionsMoreError = ref('');
let sessionsNextPage = 2;
const sessionsError = ref('');
const currentSession = ref<any>(null);
const mobileChatActive = ref(false);

const isNotLoggedIn = computed(() => {
  if (!authStore.isLoggedIn) return true;
  const err = sessionsError.value.toLowerCase();
  return err.includes('login') || err.includes('登录') || err.includes('forwardurl') || err.includes('未登录');
});

const displaySessionsError = computed(() => {
  if (!sessionsError.value || isNotLoggedIn.value) return '';
  const err = sessionsError.value;
  if (err.includes('timeout') || err.includes('超时')) return '网络连接超时，请检查网络后重试';
  if (err.startsWith('{') && err.endsWith('}')) {
    try {
      const parsed = JSON.parse(err);
      return parsed.message || parsed.error || '会话列表加载失败';
    } catch {}
  }
  return err;
});

const chatHistory = ref<any[]>([]);
const loadingHistory = ref(false);
const historyError = ref('');
const loadingMoreHistory = ref(false);
const historyLoadMoreError = ref('');
const hasMoreHistory = ref(true);
const isChatPositionReady = ref(false);
const chatHistoryCache = new Map<string, any[]>();
const followTipEntity = computed(() => chatHistory.value.find(isFollowTipEntity) || null);
const renderableChatHistory = computed(() => chatHistory.value.filter((item) => !isFollowTipEntity(item)));
const chatHistoryPagination = new Map<string, ChatHistoryPaginationState>();
let historyRequestSequence = 0;
const refreshingHistoryRequests = new Set<number>();
const MESSAGE_POLL_INTERVAL_MS = 10_000;
let messagePollTimer: number | null = null;
let messagePollingActive = false;

const inputText = ref('');
const draftSaved = ref(false);
const sending = ref(false);
const sendingImage = ref(false);
const followingPartner = ref(false);
const confirmingFollow = ref(false);

const composerRef = ref<InstanceType<typeof MessageComposer> | null>(null);
const messageThreadRef = ref<InstanceType<typeof MessageThread> | null>(null);
const chatAreaRef = computed(() => messageThreadRef.value?.getChatArea() ?? null);

const pendingImages = ref<PendingImageItem[]>([]);

function appendPendingImages(files: File[]) {
  pendingImages.value = appendPendingImageFiles(pendingImages.value, files);
}

function removePendingImage(index: number, force = false) {
  if (!force && (sending.value || sendingImage.value)) return;
  pendingImages.value = removePendingImageAt(pendingImages.value, index);
}

function clearPendingImages() {
  clearPendingImageUrls(pendingImages.value);
  pendingImages.value = [];
}

const {
  sidebarWidth,
  inputAreaHeight,
  visibleInputHeight,
  isInputFullscreen,
  startResizeSidebar,
  resetSidebarWidth,
  startResizeInput,
  resetInputHeight,
  toggleInputFullscreen,
} = useMessageLayout({
  pendingImageCount: computed(() => pendingImages.value.length),
  focusEditor: () => composerRef.value?.focus(),
});

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (composerRef.value?.dismissEmojiPicker()) return;
  if (isInputFullscreen.value) isInputFullscreen.value = false;
}

function getConversationKey(session: any = currentSession.value): string {
  return String(session?.ukey || session?.id || getSessionPartnerUid(session) || '');
}

async function saveCurrentDraft() {
  const key = getConversationKey();
  if (!key) return;
  await saveMessageDraft(currentUserUid.value, key, inputText.value);
  draftSaved.value = Boolean(inputText.value.trim());
}

async function restoreDraft(session: any) {
  const key = getConversationKey(session);
  const savedDraft = key ? await loadMessageDraft(currentUserUid.value, key) : '';
  
  // 检查是否从外部（如一键反馈）带入一次性预填内容
  const routeTargetUid = getRouteTargetUid();
  const sessionPartnerUid = String(getSessionPartnerUid(session) || '');
  const initialText = String(route.query.initialText || route.query.text || '').trim();

  if (initialText && routeTargetUid && sessionPartnerUid === routeTargetUid && !savedDraft) {
    // 仅在当前会话是路由目标会话且没有历史草稿时，填入预设模版
    inputText.value = initialText;
    // 消费后立即清理 URL query 中的 initialText，防止切换会话或清空后反复注入
    const cleanQuery = { ...route.query };
    delete cleanQuery.initialText;
    delete cleanQuery.text;
    delete cleanQuery.open;
    void router.replace({ path: '/messages', query: cleanQuery });
  } else {
    // 读取当前会话专属草稿，没有则为空
    inputText.value = savedDraft || '';
  }

  draftSaved.value = Boolean(inputText.value.trim());

  // 手机恢复草稿或分享链接时不抢焦点，避免 WebView 为显示光标上移整个页面并挤掉顶部安全区。
  if (inputText.value && !isTouchMobilePlatform()) {
    void nextTick(() => composerRef.value?.focusEnd());
  }
}

watch(inputText, () => {
  draftSaved.value = Boolean(inputText.value.trim());
  void saveCurrentDraft();
});

function sessionsCacheKey() {
  return `coolapk_message_sessions_${currentUserUid.value || 'guest'}`;
}

function sessionsPaginationCacheKey() {
  return `coolapk_message_sessions_pagination_${currentUserUid.value || 'guest'}`;
}

function restoreSessionsCache() {
  try {
    const cached = sessionStorage.getItem(sessionsCacheKey());
    if (!cached) return;
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed)) {
      sessions.value = mergeSessionsByKey(parsed.map(normalizeSessionUnreadState), []);
      const pagination = JSON.parse(sessionStorage.getItem(sessionsPaginationCacheKey()) || 'null');
      sessionsNextPage = Number.isInteger(pagination?.nextPage) && pagination.nextPage >= 2 ? pagination.nextPage : 2;
      hasMoreSessions.value = typeof pagination?.hasMore === 'boolean' ? pagination.hasMore : parsed.length > 0;
    }
  } catch {
    sessionStorage.removeItem(sessionsCacheKey());
    sessionStorage.removeItem(sessionsPaginationCacheKey());
  }
}

function persistSessionsCache() {
  try {
    sessionStorage.setItem(sessionsCacheKey(), JSON.stringify(sessions.value));
    sessionStorage.setItem(sessionsPaginationCacheKey(), JSON.stringify({ nextPage: sessionsNextPage, hasMore: hasMoreSessions.value }));
  } catch {
    // 会话缓存写入失败时继续使用内存数据，不影响私信功能。
  }
}

/** 同时清理接口对象、当前会话和列表中的同一会话，避免轮询替换对象后角标残留。 */
const markSessionRead = (session: any) => {
  if (!session) return false;
  const relatedSessions = new Set<any>([session]);
  if (isSameSession(session, currentSession.value)) relatedSessions.add(currentSession.value);
  for (const item of sessions.value) {
    if (isSameSession(session, item)) relatedSessions.add(item);
  }
  const wasUnread = Array.from(relatedSessions).some((item) => isSessionUnread(item));
  relatedSessions.forEach(clearSessionUnreadState);
  return wasUnread;
};

const getRouteTargetUid = () => String(route.query.uid || route.query.targetUid || '').trim();

const chatScrollMap = new Map<string, { top: number; atBottom: boolean }>();
let messagePageActive = true;

function getChatHistoryPagination(sessionKey: string): ChatHistoryPaginationState {
  const cached = chatHistoryPagination.get(sessionKey);
  if (cached) return cached;
  const created = createChatHistoryPaginationState(chatHistoryCache.get(sessionKey) || []);
  chatHistoryPagination.set(sessionKey, created);
  return created;
}

const handleChatScroll = () => {
  if (!messagePageActive || !isChatPositionReady.value || !currentSession.value || !chatAreaRef.value?.isConnected) return;
  const ukey = currentSession.value.ukey || currentSession.value.id;
  if (ukey) {
    const area = chatAreaRef.value;
    chatScrollMap.set(String(ukey), { top: area.scrollTop, atBottom: area.scrollHeight - area.clientHeight - area.scrollTop <= 32 });
  }
  if (chatAreaRef.value.scrollTop <= 72) void loadMoreHistory();
};

const scrollToBottom = async () => {
  await nextTick();
  if (!messagePageActive) return;
  const sessionKey = getSessionKey(currentSession.value);
  if (sessionKey) chatScrollMap.set(sessionKey, { top: 0, atBottom: true });
  if (chatAreaRef.value) {
    chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight;
    requestAnimationFrame(() => {
      if (messagePageActive && getSessionKey(currentSession.value) === sessionKey && chatAreaRef.value?.isConnected) {
        chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight;
        isChatPositionReady.value = true;
      }
    });
  } else {
    isChatPositionReady.value = true;
  }
};

const restoreScrollPositionOrBottom = async (ukey?: string) => {
  const saved = ukey ? chatScrollMap.get(ukey) : undefined;
  if (!saved || saved.atBottom) return scrollToBottom();
  await nextTick();
  const restore = () => {
    if (!messagePageActive || getSessionKey(currentSession.value) !== ukey || !chatAreaRef.value?.isConnected) return;
    chatAreaRef.value.scrollTop = saved.top;
    isChatPositionReady.value = true;
  };
  restore();
  requestAnimationFrame(restore);
};

async function loadMoreHistory() {
  const session = currentSession.value;
  const chatArea = chatAreaRef.value;
  if (!session || session.isNewConversation || !chatArea || loadingHistory.value || loadingMoreHistory.value || !hasMoreHistory.value || !chatHistory.value.length) return;

  const sessionKey = String(session.ukey || session.id || '').trim();
  if (!sessionKey) return;
  const pagination = getChatHistoryPagination(sessionKey);
  if (!pagination.hasMore || !pagination.firstItem) {
    pagination.hasMore = false;
    hasMoreHistory.value = false;
    return;
  }

  const requestSequence = historyRequestSequence;
  const previousScrollTop = chatArea.scrollTop;
  const previousScrollHeight = chatArea.scrollHeight;
  loadingMoreHistory.value = true;
  historyLoadMoreError.value = '';

  try {
    const res = await withTimeout(
      CoolapkTauriAPI.listChatHistory(sessionKey, pagination.nextPage, pagination.firstItem, pagination.lastItem),
      15_000,
      '更早聊天记录请求超时，请重试',
    );
    if (requestSequence !== historyRequestSequence || currentSession.value !== session) return;
    if (!res?.data || !Array.isArray(res.data)) throw new Error('聊天记录返回格式不正确');

    const incoming = sortChatHistory(res.data);
    const existingKeys = new Set(chatHistory.value.map(getChatHistoryItemKey).filter(Boolean));
    const olderMessages = incoming.filter((item) => {
      const key = getChatHistoryItemKey(item);
      return !key || !existingKeys.has(key);
    });
    if (!olderMessages.length) {
      pagination.hasMore = false;
      hasMoreHistory.value = false;
    } else {
      chatHistory.value = mergeChatHistory(chatHistory.value, olderMessages, true);
      pagination.nextPage += 1;
      pagination.firstItem = getOldestChatHistoryCursor(chatHistory.value);
      pagination.hasMore = true;
      hasMoreHistory.value = true;
      chatHistoryCache.set(sessionKey, [...chatHistory.value]);
    }

    await nextTick();
    if (requestSequence === historyRequestSequence && currentSession.value === session && chatAreaRef.value) {
      chatAreaRef.value.scrollTop = previousScrollTop + (chatAreaRef.value.scrollHeight - previousScrollHeight);
    }
  } catch (err) {
    if (requestSequence !== historyRequestSequence || currentSession.value !== session) return;
    console.error('加载更早聊天记录失败', err);
    historyLoadMoreError.value = err instanceof Error ? err.message : String(err);
  } finally {
    if (requestSequence === historyRequestSequence && currentSession.value === session) loadingMoreHistory.value = false;
  }
}

function retryLoadMoreHistory() {
  historyLoadMoreError.value = '';
  void loadMoreHistory();
}

// --- 数据加载 ---
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

const loadSessions = async () => {
  if (!authStore.isLoggedIn) {
    loadingSessions.value = false;
    sessions.value = [];
    hasMoreSessions.value = false;
    sessionsNextPage = 2;
    currentSession.value = null;
    mobileChatActive.value = false;
    return;
  }
  if (loadingSessions.value) return;
  if (!sessions.value.length) {
    loadingSessions.value = true;
  }
  sessionsError.value = '';
  try {
    const res = await withTimeout(
      CoolapkTauriAPI.listMessages(1),
      15_000,
      '会话列表请求超时，请检查网络后重试'
    );
    if (res?.data && Array.isArray(res.data)) {
      const rawServerSessions: any[] = res.data;
      // 只抵消列表中明确标记为自己发送的未读数量，不影响未识别发送者的真实未读。
      notificationStore.suppressMessageCount(
        getSelfMessageUnreadCount(rawServerSessions, currentUserUid.value),
      );
      const serverSessions: any[] = rawServerSessions.map(normalizeSessionUnreadState);
      const hadSessions = sessions.value.length > 0;
      if (!hadSessions) hasMoreSessions.value = serverSessions.length > 0;
      const mergedSessions = mergeSessionsByKey(serverSessions, sessions.value);

      // 检查当前是否有正在活跃打开的临时未建联会话（例如一键反馈）
      const isCurrentTemp = Boolean(currentSession.value?.isNewConversation);
      const targetQueryUid = getRouteTargetUid();

      if (isCurrentTemp || targetQueryUid) {
        const activeTemp = isCurrentTemp ? currentSession.value : sessions.value.find((s) => s?.isNewConversation);
        if (activeTemp) {
          const partnerUid = String(getSessionPartnerUid(activeTemp) || '');
          const serverMatch = serverSessions.find((s) => String(getSessionPartnerUid(s)) === partnerUid);
          if (serverMatch) {
            if (isCurrentTemp) currentSession.value = serverMatch;
            sessions.value = mergedSessions;
          } else {
            sessions.value = [activeTemp, ...mergedSessions.filter((s) => !isSameSession(s, activeTemp))];
          }
        } else {
          sessions.value = mergedSessions;
        }
      } else {
        // 轮询只刷新第一页；已加载的旧会话继续保留在其后。
        sessions.value = mergedSessions;
      }

      persistSessionsCache();

      const queryUid = getRouteTargetUid();
      if (queryUid && String(getSessionPartnerUid(currentSession.value)) !== queryUid) {
        await openTargetConversation(queryUid);
      }
      // 通知和定时轮询都要同步当前聊天，不能只更新左侧摘要。
      void refreshCurrentChatHistory();
    } else {
      throw new Error('会话列表返回格式不正确');
    }
  } catch (err) {
    console.error('加载会话列表失败', err);
    sessionsError.value = err instanceof Error ? err.message : String(err);
  } finally {
    loadingSessions.value = false;
  }
};

function mergeSessionsByKey(newer: any[], older: any[]): any[] {
  const seenKeys = new Set<string>();
  const seenPartners = new Set<string>();
  return [...newer, ...older].filter((session) => {
    // 同一聊天对象的临时会话、缓存和接口记录可能使用不同标识，必须同时按对方 UID 去重。
    const key = getSessionKey(session);
    const partnerUid = String(getSessionPartnerUid(session) || '').trim();
    if (!key && !partnerUid) return false;
    const duplicate = Boolean((key && seenKeys.has(key)) || (partnerUid && seenPartners.has(partnerUid)));
    if (key) seenKeys.add(key);
    if (partnerUid) seenPartners.add(partnerUid);
    return !duplicate;
  });
}

async function loadMoreSessions() {
  if (!authStore.isLoggedIn || loadingSessions.value || loadingMoreSessions.value || !hasMoreSessions.value) return;
  const lastItem = String([...sessions.value].reverse().find((session) => !session.isNewConversation)?.ukey || '');
  if (!lastItem) {
    hasMoreSessions.value = false;
    return;
  }
  loadingMoreSessions.value = true;
  sessionsMoreError.value = '';
  try {
    const res = await withTimeout(
      CoolapkTauriAPI.listMessages(sessionsNextPage, '', lastItem),
      15_000,
      '更多会话请求超时，请重试',
    );
    if (!Array.isArray(res?.data)) throw new Error('会话列表返回格式不正确');
    const incoming = res.data.map(normalizeSessionUnreadState);
    const previousCount = sessions.value.length;
    const merged = mergeSessionsByKey(sessions.value, incoming);
    const nextLastItem = String([...merged].reverse().find((session) => !session.isNewConversation)?.ukey || '');
    sessions.value = merged;
    if (!incoming.length || merged.length === previousCount || nextLastItem === lastItem) {
      hasMoreSessions.value = false;
    } else {
      sessionsNextPage += 1;
    }
    persistSessionsCache();
  } catch (error) {
    sessionsMoreError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loadingMoreSessions.value = false;
  }
}

function handleSessionScroll(event: Event) {
  const list = event.target as HTMLElement;
  if (list.scrollTop + list.clientHeight >= list.scrollHeight - 100) void loadMoreSessions();
}

function stopMessagePolling() {
  messagePollingActive = false;
  if (messagePollTimer !== null) {
    window.clearTimeout(messagePollTimer);
    messagePollTimer = null;
  }
}

function scheduleMessagePolling() {
  if (!messagePollingActive || messagePollTimer !== null) return;
  messagePollTimer = window.setTimeout(async () => {
    messagePollTimer = null;
    if (messagePollingActive && !document.hidden && authStore.isLoggedIn) {
      await loadSessions();
    }
    scheduleMessagePolling();
  }, MESSAGE_POLL_INTERVAL_MS);
}

function startMessagePolling() {
  if (messagePollingActive) return;
  messagePollingActive = true;
  scheduleMessagePolling();
}

/** 静默合并新消息，保留历史分页、输入草稿和用户正在阅读的位置。 */
async function refreshCurrentChatHistory() {
  const session = currentSession.value;
  const sessionKey = getSessionKey(session);
  const requestSequence = historyRequestSequence;
  if (!messagePageActive || !authStore.isLoggedIn || !sessionKey || session.isNewConversation || loadingHistory.value || refreshingHistoryRequests.has(requestSequence)) return;
  const isCurrentRequest = () => messagePageActive && authStore.isLoggedIn && requestSequence === historyRequestSequence && getSessionKey(currentSession.value) === sessionKey;
  refreshingHistoryRequests.add(requestSequence);
  try {
    const res = await withTimeout(CoolapkTauriAPI.listChatHistory(sessionKey, 1, '', getNewestChatHistoryCursor(chatHistory.value)), 15_000, '同步聊天记录超时');
    if (!isCurrentRequest()) return;
    if (!Array.isArray(res?.data)) throw new Error('聊天记录返回格式不正确');
    const area = chatAreaRef.value;
    const atBottom = !area || area.scrollHeight - area.clientHeight - area.scrollTop <= 32;
    const previousTop = area?.scrollTop || 0;
    // 基于响应到达时的记录合并，避免覆盖同步期间发出的消息或加载的历史。
    const list = sortChatHistory(mergeChatHistory(chatHistory.value, res.data));
    chatHistory.value = list;
    chatHistoryCache.set(sessionKey, list);
    historyError.value = '';
    const pagination = getChatHistoryPagination(sessionKey);
    if (!pagination.firstItem && list.length) {
      pagination.firstItem = getOldestChatHistoryCursor(list);
      pagination.hasMore = true;
      hasMoreHistory.value = true;
    }
    await nextTick();
    if (!isCurrentRequest()) return;
    if (atBottom) await scrollToBottom();
    else if (chatAreaRef.value) chatAreaRef.value.scrollTop = previousTop;

    // 收到并展示记录后再清理新角标；同步失败时保留未读提示。
    const hasUnread = isSessionUnread(session) || sessions.value.some((item) => isSameSession(item, session) && isSessionUnread(item));
    if (hasUnread) {
      const readResult = await withTimeout(CoolapkTauriAPI.readMessage(sessionKey), 10_000, '标记已读请求超时');
      if (!isCurrentRequest()) return;
      if (markSessionRead(session)) notificationStore.markViewed('message');
      if (readResult?.data && typeof readResult.data === 'object') notificationStore.applyServerResponse(readResult);
      persistSessionsCache();
    }
  } catch (err) {
    // 后台同步失败不遮挡已有聊天记录，下一轮通知或轮询会继续尝试。
    console.error('同步当前聊天记录失败', err);
  } finally {
    refreshingHistoryRequests.delete(requestSequence);
  }
}

async function openTargetConversation(uid: string) {
  const targetUid = String(uid || '').trim();
  if (!targetUid) return;

  const found = sessions.value.find((session) => String(getSessionPartnerUid(session)) === targetUid);
  if (found) {
    await selectSession(found);
    return;
  }

  // 优先使用路由传入的昵称，避免新会话名称先显示为默认占位符。
  const queryUsername = (route.query.username as string) || '';
  const queryAvatar = (route.query.avatar as string) || '';
  const defaultUsername = queryUsername || `酷友_${targetUid.slice(-4)}`;

  const tempSession = {
    id: `new-${targetUid}`,
    messageUid: targetUid,
    messageUsername: defaultUsername,
    messageUserAvatar: queryAvatar,
    lastMessage: '开始对话...',
    dateline: Math.floor(Date.now() / 1000),
    isNewConversation: true,
  };
  sessions.value = [tempSession, ...sessions.value.filter((session) => session.id !== tempSession.id)];
  await selectSession(tempSession);

  // 后台补充用户资料（如真实头像与最新昵称），平滑更新
  try {
    const userProf = await withTimeout(
      CoolapkTauriAPI.getPublicUserProfile(targetUid),
      15_000,
      '用户资料请求超时',
    );
    const userData = userProf?.data || {};
    if (userData.username) tempSession.messageUsername = userData.username;
    if (userData.userAvatar) tempSession.messageUserAvatar = userData.userAvatar;
  } catch {
    // 资料接口失败不影响打开空白会话，仍然可以直接发送私信。
  }
}

function showMobileSessionList() {
  mobileChatActive.value = false;
}

useAndroidBackButton(
  () => route.path === '/messages'
    && mobileChatActive.value
    && typeof window !== 'undefined'
    && window.matchMedia?.('(max-width: 720px)').matches !== false,
  showMobileSessionList,
);

const selectSession = async (session: any) => {
  await saveCurrentDraft();
  clearPendingImages();
  const requestSequence = ++historyRequestSequence;
  currentSession.value = session;
  mobileChatActive.value = true;
  isChatPositionReady.value = false;
  loadingMoreHistory.value = false;
  historyLoadMoreError.value = '';
  hasMoreHistory.value = false;
  // 进入会话即先清理本地角标，不等待聊天记录和下一轮轮询返回。
  if (markSessionRead(session)) notificationStore.markViewed('message');
  await restoreDraft(session);
  historyError.value = '';
  const partnerUid = getSessionPartnerUid(session);
  if (partnerUid && getRouteTargetUid() !== String(partnerUid)) {
    router.replace({ path: '/messages', query: { uid: String(partnerUid) } });
  }

  if (session.isNewConversation) {
    loadingHistory.value = false;
    chatHistory.value = [];
    historyError.value = '';
    chatHistoryPagination.delete(String(session.ukey || session.id || ''));
    isChatPositionReady.value = true;
    return;
  }

  const ukey = session.ukey || session.id;
  if (!ukey) {
    loadingHistory.value = false;
    chatHistory.value = [];
    historyError.value = '该会话缺少聊天标识，请刷新会话列表后重试';
    hasMoreHistory.value = false;
    isChatPositionReady.value = true;
    return;
  }
  const sessionKey = String(ukey);

  // APK 在打开具体会话后调用 message/read；请求与聊天记录加载并行，避免已读状态延迟到下一次轮询。
  void withTimeout(CoolapkTauriAPI.readMessage(sessionKey), 10_000, '标记已读请求超时')
    .then((readResult: any) => {
      markSessionRead(session);
      if (readResult?.data && typeof readResult.data === 'object') {
        notificationStore.applyServerResponse(readResult);
      }
    })
    .catch((err) => {
      console.error('标记会话已读失败', err);
    });

  // 1. 如果缓存中已存在历史记录，直接使用，实现 0 延迟秒切无转圈
  const cachedHistory = chatHistoryCache.get(sessionKey) || [];
  const hasCachedHistory = cachedHistory.length > 0;
  if (chatHistoryCache.has(sessionKey)) {
    chatHistory.value = cachedHistory;
    const cachedPagination = getChatHistoryPagination(sessionKey);
    hasMoreHistory.value = cachedPagination.hasMore;
    loadingHistory.value = false;
    await scrollToBottom();
  } else {
    chatHistoryPagination.set(sessionKey, createChatHistoryPaginationState());
    hasMoreHistory.value = true;
    loadingHistory.value = true;
    chatHistory.value = [];
  }

  // 2. 静默发送 API 请求抓取最新记录并同步更新缓存
  try {
    const refreshLastItem = hasCachedHistory ? getNewestChatHistoryCursor(cachedHistory) : '';
    const res = await withTimeout(
      CoolapkTauriAPI.listChatHistory(sessionKey, 1, '', refreshLastItem),
      15_000,
      '聊天记录请求超时，请重试'
    );
    if (requestSequence !== historyRequestSequence) return;
    if (res?.data && Array.isArray(res.data)) {
      const incoming = sortChatHistory(res.data);
      const existingHistory = hasCachedHistory ? chatHistory.value : [];
      const list = hasCachedHistory ? sortChatHistory(mergeChatHistory(existingHistory, incoming)) : incoming;
      chatHistory.value = list;
      chatHistoryCache.set(sessionKey, list);
      const cachedPagination = hasCachedHistory ? chatHistoryPagination.get(sessionKey) : null;
      const pagination = cachedPagination
        ? { ...cachedPagination, firstItem: getOldestChatHistoryCursor(list), lastItem: '' }
        : createChatHistoryPaginationState(list);
      chatHistoryPagination.set(sessionKey, pagination);
      hasMoreHistory.value = pagination.hasMore;
      historyLoadMoreError.value = '';
    } else {
      throw new Error('聊天记录返回格式不正确');
    }
  } catch (err) {
    if (requestSequence !== historyRequestSequence) return;
    console.error('加载聊天记录失败', err);
    historyError.value = err instanceof Error ? err.message : String(err);
  } finally {
    if (requestSequence === historyRequestSequence) {
      loadingHistory.value = false;
      await scrollToBottom();
    }
  }
};

const retryCurrentSession = () => {
  if (currentSession.value) void selectSession(currentSession.value);
};

async function deleteSession(detail: { ukey?: string; id?: string; isNew?: boolean }) {
  const session = sessions.value.find((item) => (
    (detail.ukey && String(item.ukey || item.id) === String(detail.ukey))
    || (detail.id && String(item.id) === String(detail.id))
  ));
  if (!session) return;

  const username = getUsername(session);
  const confirmed = await requestConfirmation({
    title: '删除聊天',
    message: `确定删除与“${username}”的聊天吗？删除后将从私信列表移除。`,
    confirmText: '删除',
    danger: true,
  });
  if (!confirmed) return;

  const sessionKey = String(session.ukey || session.id || detail.ukey || '').trim();
  try {
    if (!session.isNewConversation && !detail.isNew) {
      if (!sessionKey) throw new Error('该会话缺少删除标识');
      await CoolapkTauriAPI.deleteMessageChat(sessionKey);
    }

    const index = sessions.value.indexOf(session);
    if (index >= 0) sessions.value.splice(index, 1);
    if (sessionKey) {
      chatHistoryCache.delete(sessionKey);
      chatHistoryPagination.delete(sessionKey);
      chatScrollMap.delete(sessionKey);
    }
    if (currentSession.value === session) {
      currentSession.value = null;
      mobileChatActive.value = false;
      chatHistory.value = [];
      historyError.value = '';
      await router.replace({ path: '/messages' });
    }
    persistSessionsCache();
    showToast('聊天已删除', 'success');
  } catch (err: any) {
    showToast(err?.message || '删除聊天失败，请稍后重试', 'error');
  }
}

function handleDeleteMessageContext(event: Event) {
  const detail = (event as CustomEvent<{ ukey?: string; id?: string; isNew?: boolean }>).detail;
  if (detail) void deleteSession(detail);
}

function handleMessageCountIncrease() {
  if (authStore.isLoggedIn) void loadSessions();
}

watch(
  () => `${getRouteTargetUid()}|${String(route.query.open || '')}`,
  (value, previousValue) => {
    if (!value || value === previousValue) return;
    const [uid, openToken] = value.split('|');
    if (!uid || (!openToken && String(getSessionPartnerUid(currentSession.value)) === uid)) return;
    void openTargetConversation(uid);
  },
);

onActivated(() => {
  messagePageActive = true;
  bindGlobalListeners();
  if (currentSession.value) void restoreScrollPositionOrBottom(getSessionKey(currentSession.value));
  void loadSessions();
  startMessagePolling();
});

onDeactivated(() => {
  messagePageActive = false;
  clearPendingImages();
  unbindGlobalListeners();
  stopMessagePolling();
});

// --- 交互事件 ---
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Backspace' && !inputText.value && pendingImages.value.length > 0) {
    removePendingImage(pendingImages.value.length - 1);
    return;
  }

  if (e.key !== 'Enter') return;
  // 根据设置决定 Enter 是发送还是换行；换行模式使用 Ctrl/Command+Enter 发送。
  const shouldSend = settingsStore.settings.messageEnterBehavior === 'send'
    ? !e.shiftKey
    : e.ctrlKey || e.metaKey;
  if (shouldSend) {
    e.preventDefault();
    if ((inputText.value.trim() || pendingImages.value.length > 0) && !sending.value && !sendingImage.value) {
      sendMessage();
    }
  }
};

function removeFollowTipFromSession(sessionKey: string) {
  if (!sessionKey) return;
  const cachedHistory = chatHistoryCache.get(sessionKey);
  if (cachedHistory) chatHistoryCache.set(sessionKey, cachedHistory.filter((item) => !isFollowTipEntity(item)));
  if (getSessionKey(currentSession.value) === sessionKey) {
    chatHistory.value = chatHistory.value.filter((item) => !isFollowTipEntity(item));
    chatHistoryCache.set(sessionKey, [...chatHistory.value]);
  }
}

const handleFollowPartner = async () => {
  if (!currentSession.value || followingPartner.value || confirmingFollow.value || !followTipEntity.value) return;
  // 私信接口返回的 messageUid 可能是数字，Tauri 关注命令统一接收字符串 UID。
  const partnerUid = String(getSessionPartnerUid(currentSession.value) || '').trim();
  if (!partnerUid) return;
  const session = currentSession.value;
  const sessionKey = getSessionKey(session);

  confirmingFollow.value = true;
  let confirmed = false;
  try {
    confirmed = await requestConfirmation({
      title: '关注用户',
      message: `是否关注用户『${getUsername(session)}』？关注对方即可让TA与你无限制聊天`,
      confirmText: '确认关注',
    });
  } finally {
    confirmingFollow.value = false;
  }
  if (!confirmed || currentSession.value !== session || !followTipEntity.value) return;

  followingPartner.value = true;
  try {
    await CoolapkTauriAPI.followUser(partnerUid);
    // APK 关注成功后只移除当前会话的顶部提示，不改写历史消息，也不查询用户资料。
    removeFollowTipFromSession(sessionKey);
    showToast('关注成功', 'success');
  } catch (err: any) {
    showToast(err?.message || '关注操作失败，请稍后重试', 'error');
  } finally {
    followingPartner.value = false;
  }
};

const selectFavoritePicture = (picture: EmojiPicture) => {
  if (sending.value || sendingImage.value) return;
  if (pendingImages.value.some(image => image.url === picture.url)) { showToast('已经添加了', 'info'); return; }
  pendingImages.value.push(createRemotePendingImage(picture.url, `favorite_${picture.id}`));
};

const sendImageFile = async (file?: File, existingUrl?: string): Promise<boolean> => {
  if (!currentSession.value) {
    alert('请先选择一个会话再发送图片');
    return false;
  }
  const targetUid = getSessionPartnerUid(currentSession.value);
  if (!targetUid) {
    alert('未识别到对方的合法酷安账号 UID');
    return false;
  }

  sendingImage.value = true;
  try {
    let picPath = existingUrl || '';
    if (!picPath) {
      if (!file) throw new Error('图片尚未准备好');
      // 本地图片才上传，收藏表情直接使用已有 URL。
      const bytes = new Uint8Array(await file.arrayBuffer());
      const contentType = file.type || 'image/jpeg';
      const ext = contentType.split('/')[1] || 'jpg';
      const fileName = file.name || `image_${Date.now()}.${ext}`;
      const res = await CoolapkTauriAPI.uploadImage(bytes, fileName, contentType, 'message', String(targetUid));
      const uploaded: any = res?.data || res;
      picPath = typeof uploaded === 'string' ? uploaded : (uploaded?.url || uploaded?.data || uploaded?.pic || '');

      // 新上传的私信图片使用 /message/ 相对路径，收藏 URL 保持原样。
      if (picPath && !picPath.startsWith('/')) {
        const idx = String(picPath).indexOf('/message/');
        picPath = idx >= 0 ? String(picPath).slice(idx) : String(picPath);
      }
    }
    if (!picPath) {
      throw new Error('图片上传成功但未获取到图片地址');
    }

    // 发送图片私信（返回的真实消息带服务端 id，图片显示依赖真实 id）
    const sendRes = await CoolapkTauriAPI.sendPrivateImage(String(targetUid), picPath);
    const realMsg = sendRes?.data && Array.isArray(sendRes.data) ? sendRes.data[0] : null;

    const nowTimestamp = Math.floor(Date.now() / 1000);
    if (realMsg && getChatHistoryItemId(realMsg)) {
      chatHistory.value = mergeChatHistory(chatHistory.value, [{ ...realMsg, fromuid: currentUserUid.value, uid: targetUid }]);
    } else {
      // 乐观更新 UI（与酷安 API 字段一致：uid=接收者，fromuid=发送者）
      chatHistory.value.push({
        id: Date.now(),
        __localPending: true,
        uid: targetUid,
        fromuid: currentUserUid.value,
        message_pic: picPath,
        dateline: nowTimestamp
      });
    }

    // 同步写入缓存
    const ukey = currentSession.value.ukey || currentSession.value.id;
    if (ukey) {
      chatHistoryCache.set(ukey, [...chatHistory.value]);
    }

    // 更新左侧列表摘要与时间
    const sess = currentSession.value;
    if (markSessionRead(sess)) notificationStore.markViewed('message');
    sess.message = '[图片]';
    sess.lastMessage = '[图片]';
    sess.summary = '[图片]';
    sess.last_message = '[图片]';
    sess.dateline = nowTimestamp;
    sess.lastupdate = nowTimestamp;

    // 将当前会话置顶
    const idx = sessions.value.findIndex(s => (s.ukey && s.ukey === currentSession.value.ukey) || s.id === currentSession.value.id);
    if (idx > 0) {
      const [s] = sessions.value.splice(idx, 1);
      sessions.value.unshift(s);
    }

    if (ukey) {
      chatScrollMap.delete(String(ukey));
    }
    scrollToBottom();
    return true;
  } catch (err: any) {
    console.error('发送图片失败', err);
    const errMsg = typeof err === 'string'
      ? err
      : (err?.message || JSON.stringify(err) || '图片发送失败，请确认网络与账号权限状态');
    showToast(errMsg, 'error');
    return false;
  } finally {
    sendingImage.value = false;
  }
};

const appStore = useAppStore();

const openMessageImage = (msg: any) => {
  const url = getPicUrl(msg);
  if (!url) return;
  appStore.openImageViewer([url], 0);
};

const sendTextMessage = async (text: string): Promise<boolean> => {
  if (!currentSession.value) return false;
  const targetUid = getSessionPartnerUid(currentSession.value);
  if (!targetUid) {
    throw new Error('未识别到对方的合法酷安账号 UID');
  }

  // 调用后台原生 API 发送
  const sendRes = await CoolapkTauriAPI.sendPrivateMessage(String(targetUid), text);
  const realMsg = Array.isArray(sendRes?.data) ? sendRes.data[0] : null;

  // 乐观更新 UI（与酷安 API 字段一致：uid=接收者，fromuid=发送者）
  const nowTimestamp = Math.floor(Date.now() / 1000);
  const newMsg = {
    ...(realMsg && getChatHistoryItemId(realMsg) ? realMsg : { id: Date.now(), __localPending: true }),
    uid: targetUid,
    fromuid: currentUserUid.value,
    message: text,
    dateline: realMsg?.dateline || nowTimestamp
  };

  chatHistory.value = mergeChatHistory(chatHistory.value, [newMsg]);

  // 同步写入缓存
  const ukey = currentSession.value.ukey || currentSession.value.id;
  if (ukey) {
    chatHistoryCache.set(ukey, [...chatHistory.value]);
  }

  // 更新左侧列表的摘要和时间（列表渲染优先读 message 字段）
  const sess = currentSession.value;
  if (markSessionRead(sess)) notificationStore.markViewed('message');
  sess.message = text;
  sess.lastMessage = text;
  sess.summary = text;
  sess.last_message = text;
  sess.dateline = nowTimestamp;
  sess.lastupdate = nowTimestamp;

  // 将当前会话置顶
  const idx = sessions.value.findIndex(s => (s.ukey && s.ukey === currentSession.value.ukey) || s.id === currentSession.value.id);
  if (idx > 0) {
    const [s] = sessions.value.splice(idx, 1);
    sessions.value.unshift(s);
  }

  if (ukey) {
    chatScrollMap.delete(String(ukey));
  }
  inputText.value = '';
  await clearMessageDraft(currentUserUid.value, getConversationKey(currentSession.value));
  draftSaved.value = false;
  scrollToBottom();
  return true;
};

const sendMessage = async () => {
  if (sending.value || sendingImage.value) return;
  const text = inputText.value.trim();
  if (!text && pendingImages.value.length === 0) return;
  if (!currentSession.value) return;

  sending.value = true;
  try {
    const owner = `${currentUserUid.value}:${getConversationKey()}`;
    // 1. 发送待发送列表中的所有图片
    while (pendingImages.value.length > 0) {
      const item = pendingImages.value[0];
      const success = await sendImageFile(item.file, item.url);
      if (success) {
        removePendingImage(0, true);
      } else {
        return;
      }
    }

    // 2. 发送文本消息
    if (text) {
      if (`${currentUserUid.value}:${getConversationKey()}` !== owner) throw new Error('会话或账号已切换，请在目标会话重试');
      await sendTextMessage(text);
    } else {
      inputText.value = '';
    }
  } catch (err: any) {
    console.error('发送消息失败', err);
    const errMsg = typeof err === 'string'
      ? err
      : (err?.message || JSON.stringify(err) || '消息发送失败，请确认网络与账号权限状态');
    showToast(errMsg, 'error');
  } finally {
    sending.value = false;
  }
};

// --- 生命周期 ---
function bindGlobalListeners() {
  window.addEventListener('coolapk-context-delete-message', handleDeleteMessageContext);
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('coolapk-message-count-increased', handleMessageCountIncrease);
}

function unbindGlobalListeners() {
  window.removeEventListener('coolapk-context-delete-message', handleDeleteMessageContext);
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('coolapk-message-count-increased', handleMessageCountIncrease);
}

onMounted(() => {
  restoreSessionsCache();
});

onUnmounted(() => {
  messagePageActive = false;
  clearPendingImages();
  unbindGlobalListeners();
  stopMessagePolling();
  saveCurrentDraft();
});

// 下拉仅刷新当前栏目，不切换筛选、路由或页面实例。
async function refreshMobilePage() { await loadSessions(); }
</script>

<style scoped>
.messages-page {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--surface);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.header-partner-info {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: all var(--duration-fast);
}

.header-partner-info:hover {
  background: var(--surface-hover);
}

.header-avatar {
  flex-shrink: 0;
}

.header-link-icon {
  font-size: 11px;
  color: var(--text-tertiary);
  opacity: 0.6;
  transition: transform var(--duration-fast);
}

.header-partner-info:hover .header-link-icon {
  opacity: 1;
  transform: translateX(2px);
  color: var(--brand-primary);
}

.header-partner-info.clickable-header {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: all var(--duration-fast);
}

.header-partner-info.clickable-header:hover {
  background: var(--surface-hover);
}

.header-partner-info.clickable-header:hover .header-username {
  color: var(--brand-primary);
}

.header-partner-info.clickable-header:hover .header-link-icon {
  opacity: 1;
  transform: translateX(3px);
  color: var(--brand-primary);
}

.not-login-main-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 24px;
  gap: 12px;
  animation: notLoginPop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.not-login-main-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-pill);
  background: var(--brand-soft, rgba(16, 185, 129, 0.12));
  color: var(--brand-primary, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.2);
  margin-bottom: 6px;
}

.not-login-main-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.not-login-main-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

@keyframes notLoginPop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.messages-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--background);
  min-width: 0;
  position: relative;
}

.messages-main.empty-main {
  justify-content: center;
  align-items: center;
  background: var(--surface);
}

.main-header {
  padding: var(--space-4);
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  z-index: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.main-header h3 {
  font-size: var(--font-size-title-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.mobile-session-back {
  display: none;
}

@media (max-width: 720px) {
  .messages-sidebar {
    width: 100% !important;
    min-width: 0;
    max-width: none;
    border-right: 0;
  }

  .sidebar-resizer {
    display: none;
  }

  .messages-main {
    display: none;
  }

  .messages-page.is-mobile-chat-active .messages-sidebar,
  .messages-page.is-mobile-login-state .messages-sidebar {
    display: none;
  }

  .messages-page.is-mobile-chat-active .messages-main:not(.empty-main),
  .messages-page.is-mobile-login-state .messages-main.empty-main {
    display: flex;
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
  }

  .messages-page.is-mobile-chat-active .main-header {
    gap: 8px;
    padding: 10px 12px;
  }

  .messages-page.is-mobile-chat-active .mobile-session-back {
    display: inline-flex;
    flex: 0 0 36px;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    font-size: 16px;
  }

  .messages-page.is-mobile-chat-active .header-partner-info {
    min-width: 0;
    flex: 1;
  }
}
</style>
