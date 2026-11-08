<template>
  <aside class="messages-sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="sidebar-header">
      <h2>私信</h2>
    </div>

    <div v-if="sessions.length" class="session-list" @scroll="$emit('scroll', $event)">
      <div
        v-for="session in sessions"
        :key="session.ukey || session.id"
        class="session-item"
        data-context-kind="message"
        :data-context-message-ukey="String(session.ukey || (session.isNewConversation ? '' : session.id) || '')"
        :data-context-message-id="String(session.id || '')"
        :data-context-message-new="session.isNewConversation ? 'true' : 'false'"
        :class="{ active: isSameSession(currentSession, session), unread: isSessionUnread(session) }"
        @click="$emit('select', session)"
      >
        <AppAvatar :src="getPartnerAvatar(session)" size="md" />
        <div class="session-info">
          <div class="session-header">
            <span class="username">{{ getUsername(session) }}</span>
            <span class="time">{{ formatTime(session) }}</span>
          </div>
          <div class="last-message" v-html="renderLastMessage(session)"></div>
        </div>
        <span
          v-if="getUnreadCount(session) > 0"
          class="session-unread-badge"
          aria-label="未读消息数"
        >{{ getUnreadLabel(session) }}</span>
      </div>

      <div v-if="loadingMore" class="session-pagination-status">加载更多会话...</div>
      <button v-else-if="moreError" class="session-pagination-action" type="button" @click="$emit('load-more')">
        加载失败，点击重试
      </button>
      <button v-else-if="hasMore" class="session-pagination-action" type="button" @click="$emit('load-more')">
        加载更多会话
      </button>
    </div>

    <div v-else-if="isNotLoggedIn" class="session-list-status">
      <EmptyState title="暂无会话" description="登录后同步私信列表" icon="far fa-user" />
    </div>
    <div v-else-if="loading" class="session-list-status">
      <LoadingState text="加载中..." />
    </div>
    <div v-else-if="displayError" class="session-list-status">
      <ErrorState title="私信加载失败" :message="displayError" @retry="$emit('retry')" />
    </div>
    <div v-else class="session-list-status">
      <EmptyState title="暂无私信" description="去寻找有趣的酷友聊聊吧" />
    </div>
  </aside>

  <div
    class="sidebar-resizer"
    title="左右拖拽调整会话列表宽度，双击恢复默认"
    @mousedown="$emit('resize-start', $event)"
    @dblclick="$emit('reset-width')"
  ></div>
</template>

<script setup lang="ts">
import AppAvatar from '../common/AppAvatar.vue';
import EmptyState from '../common/EmptyState.vue';
import ErrorState from '../common/ErrorState.vue';
import LoadingState from '../common/LoadingState.vue';
import type { MessageLike } from '../../features/messages/messageModel';

defineProps<{
  sessions: MessageLike[];
  currentSession: MessageLike | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  moreError: string;
  isNotLoggedIn: boolean;
  displayError: string;
  sidebarWidth: number;
  isSameSession: (left: MessageLike | null, right: MessageLike | null) => boolean;
  isSessionUnread: (session: MessageLike) => boolean;
  getPartnerAvatar: (session: MessageLike) => string;
  getUsername: (session: MessageLike) => string;
  formatTime: (session: MessageLike) => string;
  renderLastMessage: (session: MessageLike) => string;
  getUnreadCount: (session: MessageLike) => number;
  getUnreadLabel: (session: MessageLike) => string;
}>();

defineEmits<{
  select: [session: MessageLike];
  scroll: [event: Event];
  'load-more': [];
  retry: [];
  'resize-start': [event: MouseEvent];
  'reset-width': [];
}>();
</script>

<style scoped>
.messages-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-light);
  background: var(--surface);
  flex-shrink: 0;
  min-width: 220px;
  max-width: 500px;
}

.sidebar-resizer {
  width: 6px;
  margin-left: -3px;
  margin-right: -3px;
  cursor: col-resize;
  z-index: 10;
  transition: background-color var(--duration-fast);
  background: transparent;
  flex-shrink: 0;
}

.sidebar-resizer:hover,
.sidebar-resizer:active {
  background-color: var(--brand-primary);
  opacity: 0.6;
}

.sidebar-header {
  padding: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
  background: var(--surface);
  z-index: 1;
}

.sidebar-header h2 {
  font-size: var(--font-size-title-md);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}

.session-list {
  flex: 1;
  overflow-y: auto;
}

.session-pagination-status,
.session-pagination-action {
  display: block;
  width: 100%;
  padding: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.session-pagination-action {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.session-list-status {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-4);
}

.session-item {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  gap: var(--space-3);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
  border-bottom: 1px solid transparent;
  position: relative;
}

.session-item:hover {
  background: var(--surface-hover);
}

.session-item:hover :deep(.app-avatar) {
  transform: scale(1.05);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.session-item.active {
  background: var(--brand-soft);
  border-left: 3px solid var(--brand-primary);
  animation: activeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes activeSlideIn {
  from { border-left-width: 0; opacity: 0.8; }
  to { border-left-width: 3px; opacity: 1; }
}

.session-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-1);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.session-header .username {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-header .time {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  flex-shrink: 0;
  white-space: nowrap;
}

.session-unread-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #ef4444;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  line-height: 18px;
  box-sizing: border-box;
  flex-shrink: 0;
  margin-left: 2px;
  animation: badgePopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes badgePopIn {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.session-item.unread .session-header .username {
  font-weight: var(--font-weight-bold);
}

.last-message {
  font-size: var(--font-size-sub);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 2px;
}

.last-message :deep(.coolapk-emoji),
.last-message :deep(img.coolapk-emoji) {
  width: 15px !important;
  height: 15px !important;
  min-width: 15px !important;
  min-height: 15px !important;
  max-width: 15px !important;
  max-height: 15px !important;
  vertical-align: middle !important;
  display: inline-block !important;
  margin: 0 1px !important;
}
</style>
