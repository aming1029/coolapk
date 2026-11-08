<template>
  <div ref="chatAreaRef" class="chat-area" :class="{ 'is-ready': ready }" @scroll="$emit('scroll', $event)">
    <div v-if="loading" class="chat-status">
      <LoadingState text="加载聊天记录..." />
    </div>
    <div v-else-if="error && !messages.length && !followTip" class="chat-status">
      <ErrorState title="聊天记录加载失败" :message="error" @retry="$emit('retry')" />
    </div>
    <template v-else>
      <div v-if="followTip" class="system-notice-item message-follow-tip-item">
        <div class="system-notice-badge">
          <span>{{ followNoticeText }}</span>
          <button
            class="follow-action-btn"
            type="button"
            :disabled="following || confirmingFollow"
            @click="$emit('follow')"
          >
            <i class="fas fa-user-plus"></i>
            {{ following ? '关注中...' : (confirmingFollow ? '确认中...' : '关注对方') }}
          </button>
        </div>
      </div>

      <div v-if="loadingMore" class="chat-pagination-status">加载更早消息...</div>
      <button v-else-if="loadMoreError" class="chat-pagination-error" type="button" @click="$emit('retry-load-more')">
        {{ loadMoreError }}，点击重试
      </button>

      <template v-for="(message, index) in messages" :key="message.id || message.dateline || index">
        <div v-if="getEntityType(message) === 'messageExtra'" class="system-notice-item">
          <div :class="['system-notice-badge', { 'is-warning': isWarningNotice(message) }]">
            <i v-if="isWarningNotice(message)" class="fas fa-shield-halved warning-icon"></i>
            <span>{{ getSystemNoticeText(message) }}</span>
          </div>
        </div>

        <div v-else class="message-item" :class="{ 'is-self': isSelf(message) }">
          <AppAvatar
            v-if="!isSelf(message)"
            :src="getPartnerAvatar(currentSession)"
            size="sm"
            class="msg-avatar clickable-avatar"
            title="查看个人主页"
            @click="$emit('open-user', getPartnerUid(currentSession))"
          />
          <div class="message-content">
            <div v-if="getPicUrl(message) && !getMessageText(message)" class="msg-pic-only-card" @click.stop="$emit('open-image', message)">
              <AppImage :src="getPicUrl(message)" fit="contain" image-class="msg-pure-img" />
            </div>
            <div
              v-else
              class="bubble-wrapper"
              data-context-kind="chat-message"
              :data-context-message-text="getMessageText(message)"
              :data-context-message-id="String(message.id || '')"
            >
              <div class="bubble">
                <div v-if="getPicUrl(message)" class="msg-pic-container" @click.stop="$emit('open-image', message)">
                  <AppImage :src="getPicUrl(message)" fit="contain" image-class="msg-img" />
                </div>
                <div
                  v-if="getMessageText(message)"
                  class="msg-text"
                  v-html="renderMessageContent(message)"
                  @click="handleAnchorClick"
                ></div>
              </div>
            </div>
            <div class="msg-time">{{ formatTime(getDateline(message)) }}</div>
            <button
              v-if="getDiagnosticLink(getMessageText(message))"
              type="button"
              class="diagnostic-report-action"
              @click="$emit('open-diagnostic', getDiagnosticLink(getMessageText(message)))"
            >
              <i class="fas fa-file-lines"></i> 查看诊断日志
            </button>
          </div>
          <AppAvatar
            v-if="isSelf(message)"
            :src="currentUserAvatar"
            size="sm"
            class="msg-avatar clickable-avatar"
            title="查看个人主页"
            @click="$emit('open-user', currentUserUid)"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppAvatar from '../common/AppAvatar.vue';
import AppImage from '../common/AppImage.vue';
import ErrorState from '../common/ErrorState.vue';
import LoadingState from '../common/LoadingState.vue';
import type { MessageLike } from '../../features/messages/messageModel';
import { handleAnchorClick } from '../../utils/anchorClick';

defineProps<{
  currentSession: MessageLike | null;
  currentUserUid: string;
  currentUserAvatar?: string;
  messages: MessageLike[];
  followTip: MessageLike | null;
  followNoticeText: string;
  loading: boolean;
  error: string;
  loadingMore: boolean;
  loadMoreError: string;
  following: boolean;
  confirmingFollow: boolean;
  ready: boolean;
  getEntityType: (item: MessageLike) => string;
  isWarningNotice: (item: MessageLike) => boolean;
  getSystemNoticeText: (item: MessageLike) => string;
  isSelf: (item: MessageLike) => boolean;
  getPartnerAvatar: (session: MessageLike | null) => string;
  getPartnerUid: (session: MessageLike | null) => string;
  getPicUrl: (item: MessageLike) => string;
  getMessageText: (item: MessageLike) => string;
  renderMessageContent: (item: MessageLike) => string;
  formatTime: (value: number | string) => string;
  getDateline: (item: MessageLike) => number | string;
  getDiagnosticLink: (text: string) => string;
}>();

defineEmits<{
  scroll: [event: Event];
  retry: [];
  follow: [];
  'retry-load-more': [];
  'open-user': [uid: string | number];
  'open-image': [message: MessageLike];
  'open-diagnostic': [link: string];
}>();

const chatAreaRef = ref<HTMLElement | null>(null);

defineExpose({
  getChatArea: () => chatAreaRef.value,
});
</script>

<style scoped>
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  position: relative;
  opacity: 0;
  transition: opacity 0.12s ease-out;
}

.chat-area.is-ready {
  opacity: 1;
}

.chat-status {
  display: flex;
  justify-content: center;
  padding: var(--space-4);
}

.chat-pagination-status,
.chat-pagination-error {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  padding: 4px 12px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-hover);
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chat-pagination-error {
  cursor: pointer;
  color: var(--brand-primary);
}

.system-notice-item {
  display: flex;
  justify-content: center;
  margin: var(--space-2) 0;
  width: 100%;
}

.system-notice-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--background-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  max-width: 85%;
  transition: all 0.2s ease;
}

.system-notice-badge.is-warning {
  background: rgba(234, 179, 8, 0.12);
  color: #b45309;
  border: 1px solid rgba(234, 179, 8, 0.25);
}

.system-notice-badge .warning-icon {
  color: #d97706;
  font-size: 13px;
  flex-shrink: 0;
}

.follow-action-btn {
  margin-left: var(--space-2);
  background: var(--brand-primary);
  color: #ffffff;
  border: none;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.follow-action-btn:hover {
  opacity: 0.92;
  transform: scale(1.02);
}

.follow-action-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.follow-action-btn:disabled:hover {
  transform: none;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  max-width: 75%;
  animation: msgBubblePopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes msgBubblePopIn {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-item.is-self {
  align-self: flex-end;
  justify-content: flex-end;
}

.msg-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.msg-avatar.clickable-avatar {
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.msg-avatar.clickable-avatar:hover {
  transform: scale(1.08);
}

.message-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: var(--space-1);
}

.message-item.is-self .message-content {
  align-items: flex-end;
}

.bubble-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.bubble {
  position: relative;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--font-size-body);
  line-height: 1.5;
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: inline-block;
  transition: box-shadow 0.2s ease;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.bubble:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.msg-text {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.bubble :deep(*) {
  max-width: 100%;
  user-select: text;
  -webkit-user-select: text;
}

.message-item:not(.is-self) .bubble {
  border-top-left-radius: 2px;
}

.message-item:not(.is-self) .bubble::before {
  content: '';
  position: absolute;
  top: 10px;
  left: -6px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 7px solid var(--surface);
}

.message-item.is-self .bubble {
  background: var(--brand-primary);
  color: #ffffff;
  border-top-right-radius: 2px;
}

.message-item.is-self .bubble::before {
  content: '';
  position: absolute;
  top: 10px;
  right: -6px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid var(--brand-primary);
}

.bubble :deep(a) {
  color: var(--brand-primary);
  text-decoration: underline;
  word-break: break-all;
  cursor: pointer;
}

.message-item.is-self .bubble :deep(a) {
  color: #ffffff !important;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
}

.bubble :deep(.coolapk-emoji) {
  width: 22px;
  height: 22px;
  vertical-align: -5px;
  display: inline-block;
  margin: 0 1px;
  user-select: none;
  -webkit-user-select: none;
}

.msg-pic-only-card {
  max-width: min(320px, 100%);
  box-sizing: border-box;
  max-height: 480px;
  border-radius: var(--radius-card, 10px);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border-light);
  background: transparent;
  display: inline-block;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.msg-pic-only-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.msg-pic-only-card :deep(.msg-pure-img) {
  min-width: 0;
  max-width: 100%;
  max-height: 480px;
  width: auto;
  height: auto;
  display: flex;
  background: transparent;
}

.msg-pic-only-card :deep(.msg-pure-img img) {
  min-width: 0;
  max-width: 100%;
  max-height: 480px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-card, 10px);
  display: block;
}

.bubble :deep(.msg-pic-container) {
  max-width: min(320px, 100%);
  max-height: 380px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--space-1);
  background: transparent;
}

.bubble :deep(.msg-img) {
  min-width: 0;
  max-width: 100%;
  max-height: 380px;
  width: auto;
  height: auto;
  background: transparent;
  display: flex;
}

.bubble :deep(.msg-img img) {
  min-width: 0;
  max-width: 100%;
  max-height: 380px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-sm);
  display: block;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.bubble :deep(.msg-img img:hover) {
  transform: scale(1.03);
}

.msg-time {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.diagnostic-report-action {
  margin-top: 6px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text-primary);
  cursor: pointer;
}
</style>
