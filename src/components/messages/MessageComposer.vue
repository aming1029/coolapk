<template>
  <div
    :class="['input-area', { 'is-fullscreen': isFullscreen, 'has-pending-images': pendingImages.length > 0 }]"
    :style="isFullscreen ? {} : { height: `${inputHeight}px` }"
  >
    <div
      v-if="!isFullscreen"
      class="input-resizer"
      title="上下拖拽调整输入框高度，双击恢复默认"
      @pointerdown="$emit('resize-start', $event)"
      @dblclick="$emit('reset-height')"
    >
      <div class="resizer-handle-bar"></div>
    </div>

    <div class="input-toolbar">
      <div class="toolbar-left">
        <div ref="emojiContainerRef" class="emoji-picker-container">
          <button
            :class="['toolbar-btn', { 'is-active': showEmojiPicker }]"
            title="表情"
            @click.stop="showEmojiPicker = !showEmojiPicker"
          >
            <i class="far fa-face-smile"></i>
          </button>
          <div v-if="showEmojiPicker" class="emoji-picker-popover custom-scrollbar" @click.stop>
            <EmojiPanel
              :key="sessionKey"
              :disabled="sending || sendingImage"
              :selected-urls="pendingImages.flatMap((image) => image.url ? [image.url] : [])"
              @select="insertEmoji"
              @picture="$emit('favorite-picture', $event)"
            />
          </div>
        </div>

        <button class="toolbar-btn" title="发图" :disabled="sendingImage" @click="triggerImageSelect">
          <i class="far fa-image"></i>
        </button>
        <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleImageSelected" />
      </div>

      <div class="toolbar-right">
        <button
          class="toolbar-btn fullscreen-btn"
          :class="{ 'is-active': isFullscreen }"
          :title="isFullscreen
            ? (showShortcutHints ? '退出全屏编辑 (Esc)' : '退出全屏编辑')
            : '全屏展开编辑'"
          @click="$emit('toggle-fullscreen')"
        >
          <i :class="isFullscreen ? 'fas fa-compress-alt' : 'fas fa-expand-alt'"></i>
          <span class="fullscreen-tip-text">{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
        </button>
      </div>
    </div>

    <div v-if="pendingImages.length > 0" class="pending-images-bar">
      <div v-for="(image, index) in pendingImages" :key="image.id" class="pending-image-card">
        <AppImage v-if="image.url" :src="image.previewUrl" class="pending-image-thumb" alt="待发送图片" fit="cover" />
        <img v-else :src="image.previewUrl" class="pending-image-thumb" alt="待发送图片" />
        <button
          type="button"
          class="pending-image-remove-btn"
          title="移除图片"
          :disabled="sending || sendingImage"
          @click.stop="$emit('remove-image', index)"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <div
      ref="editorRef"
      class="message-rich-editor"
      contenteditable="true"
      :data-placeholder="placeholder"
      @input="handleEditorInput"
      @keydown="$emit('keydown', $event)"
      @paste="handlePaste"
      @drop="handleDrop"
      @dragover.prevent
    ></div>

    <div class="input-bottom-bar">
      <div v-if="draftSaved" class="draft-status"><i class="far fa-save"></i> 草稿已自动保存</div>
      <div v-else class="draft-status-placeholder"></div>
      <div class="input-actions">
        <AppButton
          variant="primary"
          size="sm"
          :disabled="(!modelValue.trim() && pendingImages.length === 0) || sending || sendingImage"
          :loading="sending || sendingImage"
          @click="$emit('send')"
        >发送</AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import AppButton from '../common/AppButton.vue';
import AppImage from '../common/AppImage.vue';
import EmojiPanel from '../common/EmojiPanel.vue';
import { EMOJI_MAP } from '../../utils/coolapkEmoji';
import { isSystemEmoji, type EmojiPicture } from '../../utils/emojiPanel';
import { useRecentEmojis } from '../../utils/recentEmojis';
import {
  createEmojiImage,
  extractStrayImagesFromEditor,
  getEditorText,
  parseTextToEditorNodes,
  syncEditorText,
  type PendingImageItem,
} from '../../features/messages/messageEditor';

const props = defineProps<{
  modelValue: string;
  pendingImages: PendingImageItem[];
  sending: boolean;
  sendingImage: boolean;
  draftSaved: boolean;
  inputHeight: number;
  isFullscreen: boolean;
  showShortcutHints: boolean;
  sessionKey: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'add-files': [files: File[]];
  'send-file': [file: File];
  'remove-image': [index: number];
  'favorite-picture': [picture: EmojiPicture];
  send: [];
  'resize-start': [event: PointerEvent];
  'reset-height': [];
  'toggle-fullscreen': [];
  keydown: [event: KeyboardEvent];
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const emojiContainerRef = ref<HTMLElement | null>(null);
const showEmojiPicker = ref(false);
const { addRecent } = useRecentEmojis();

const placeholder = computed(() => {
  if (!props.isFullscreen) return '发消息... (支持直接粘贴图片)';
  return props.showShortcutHints
    ? '在此全屏编辑消息内容，支持快捷粘贴或输入长篇文本（按 Esc 退出全屏）...'
    : '在此全屏编辑消息内容...';
});

function emitEditorValue() {
  emit('update:modelValue', getEditorText(editorRef.value));
}

async function handleEditorInput() {
  const files = await extractStrayImagesFromEditor(editorRef.value);
  if (files.length > 0) emit('add-files', files);
  emitEditorValue();
}

function handlePaste(event: ClipboardEvent) {
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  const files: File[] = [];
  for (const item of Array.from(clipboard.items || [])) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  for (const file of Array.from(clipboard.files || [])) {
    if (file.type.startsWith('image/') && !files.includes(file)) files.push(file);
  }
  if (files.length > 0) {
    event.preventDefault();
    emit('add-files', files);
    return;
  }

  const text = clipboard.getData('text/plain');
  const editor = editorRef.value;
  if (!text || !editor) return;
  event.preventDefault();
  const nodes = parseTextToEditorNodes(text);
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    let lastNode: Node | null = null;
    for (const node of nodes) {
      lastNode = node;
      fragment.appendChild(node);
    }
    range.insertNode(fragment);
    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.setEndAfter(lastNode);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
  } else {
    nodes.forEach((node) => editor.appendChild(node));
  }
  emitEditorValue();
}

function handleDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith('image/'));
  if (files.length === 0) return;
  event.preventDefault();
  emit('add-files', files);
}

function insertEmoji(name: string) {
  addRecent(name);
  const editor = editorRef.value;
  if (!editor) return;
  const filename = EMOJI_MAP[name];
  const node = isSystemEmoji(name) ? document.createTextNode(name) : createEmojiImage(name, filename);
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    editor.appendChild(node);
  }
  editor.focus();
  emitEditorValue();
  showEmojiPicker.value = false;
}

function triggerImageSelect() {
  showEmojiPicker.value = false;
  fileInputRef.value?.click();
}

function handleImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('send-file', file);
  input.value = '';
}

function handleDocumentClick(event: MouseEvent) {
  if (showEmojiPicker.value && emojiContainerRef.value && !emojiContainerRef.value.contains(event.target as Node)) {
    showEmojiPicker.value = false;
  }
}

watch(() => props.modelValue, async (value) => {
  const editor = editorRef.value;
  if (!editor || getEditorText(editor) === value) return;
  syncEditorText(editor, value);
  await nextTick();
});

onMounted(() => {
  window.addEventListener('click', handleDocumentClick);
  syncEditorText(editorRef.value, props.modelValue);
});

onUnmounted(() => {
  window.removeEventListener('click', handleDocumentClick);
});

defineExpose({
  focus: () => editorRef.value?.focus(),
  focusEnd: () => {
    const editor = editorRef.value;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  },
  clear: () => syncEditorText(editorRef.value, ''),
  dismissEmojiPicker: () => {
    if (!showEmojiPicker.value) return false;
    showEmojiPicker.value = false;
    return true;
  },
});
</script>

<style scoped>
.input-area {
  background: var(--surface);
  border-top: 1px solid var(--border-light);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
  min-height: 160px;
  transition: height 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, padding 0.25s ease;
}

.input-area.has-pending-images { min-height: 240px; }

.input-area.is-fullscreen {
  position: absolute;
  inset: 0;
  height: 100% !important;
  z-index: 100;
  padding: var(--space-4);
  border-top: none;
  background: var(--surface);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.12);
  animation: fullscreenExpand 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fullscreenExpand {
  from { opacity: 0.92; transform: scaleY(0.97); transform-origin: bottom; }
  to { opacity: 1; transform: scaleY(1); }
}

.input-resizer {
  touch-action: none;
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: row-resize;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
}

.input-resizer .resizer-handle-bar {
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  opacity: 0.6;
  transition: all var(--duration-fast);
}

.input-resizer:hover .resizer-handle-bar,
.input-resizer:active .resizer-handle-bar {
  background: var(--brand-primary);
  width: 52px;
  opacity: 1;
}

.input-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toolbar-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  transition: all var(--duration-fast);
}

.toolbar-btn:hover,
.toolbar-btn.is-active {
  color: var(--brand-primary);
  background: var(--surface-hover);
}

.toolbar-btn:active { transform: scale(0.92); }

.fullscreen-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  transition: all 0.2s ease;
}

.fullscreen-btn.is-active {
  color: var(--brand-primary);
  background: var(--brand-soft);
  font-weight: var(--font-weight-medium);
}

.fullscreen-btn:active { transform: scale(0.94); }
.fullscreen-tip-text { font-size: 12px; }

.emoji-picker-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.emoji-picker-popover {
  position: absolute;
  bottom: 36px;
  left: 0;
  width: min(360px, calc(100vw - 32px));
  background: var(--surface);
  border: 1px solid var(--border-light);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  border-radius: var(--radius-card);
  z-index: 100;
  display: block;
  overflow: hidden;
  padding: 0;
  animation: emojiSpringPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: bottom left;
}

@keyframes emojiSpringPop {
  0% { opacity: 0; transform: scale(0.9) translateY(8px); }
  70% { opacity: 1; transform: scale(1.02) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.pending-images-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  overflow-x: auto;
  flex-shrink: 0;
}

.pending-image-card {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm, 8px);
  overflow: hidden;
  border: 1px solid var(--border-light);
  background: var(--surface-hover);
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.pending-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pending-image-remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.15s ease;
  padding: 0;
}

.pending-image-remove-btn:hover {
  background: rgba(239, 68, 68, 0.9);
  transform: scale(1.1);
}

.message-rich-editor {
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--font-size-body);
  color: var(--text-primary);
  outline: none;
  line-height: 1.6;
  padding: 0;
  box-sizing: border-box;
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
  user-select: text;
}

.message-rich-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--text-tertiary);
  pointer-events: none;
}

.input-area.is-fullscreen .message-rich-editor {
  font-size: 14.5px;
  line-height: 1.7;
}

.message-rich-editor :deep(.coolapk-emoji),
.message-rich-editor img.coolapk-emoji {
  width: 22px;
  height: 22px;
  vertical-align: -4px;
  display: inline-block;
  margin: 0 1px;
}

.input-bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  flex-shrink: 0;
}

.draft-status-placeholder { flex: 1; }

.draft-status {
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  animation: draftFade 0.2s ease;
}

.draft-status i { margin-right: 5px; color: var(--brand-primary); }

@keyframes draftFade {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: translateX(0); }
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
