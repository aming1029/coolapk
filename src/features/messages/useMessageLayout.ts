import { computed, nextTick, onUnmounted, ref, type Ref } from 'vue';

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_INPUT_HEIGHT = 160;
const MIN_INPUT_HEIGHT = 160;
const MAX_INPUT_HEIGHT = 600;

interface MessageLayoutOptions {
  pendingImageCount: Ref<number>;
  focusEditor?: () => void;
}

function getStoredNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const value = Number.parseInt(saved, 10);
      if (!Number.isNaN(value) && value >= min && value <= max) return value;
    }
  } catch {}
  return fallback;
}

export function useMessageLayout(options: MessageLayoutOptions) {
  const sidebarWidth = ref(getStoredNumber(
    'coolapk_messages_sidebar_width',
    DEFAULT_SIDEBAR_WIDTH,
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
  ));
  const inputAreaHeight = ref(getStoredNumber(
    'coolapk_messages_input_height',
    DEFAULT_INPUT_HEIGHT,
    MIN_INPUT_HEIGHT,
    MAX_INPUT_HEIGHT,
  ));
  const visibleInputHeight = computed(() => Math.max(
    options.pendingImageCount.value > 0 ? 240 : MIN_INPUT_HEIGHT,
    inputAreaHeight.value,
  ));
  const isInputFullscreen = ref(false);

  let draggingSidebar = false;
  let sidebarStartX = 0;
  let sidebarStartWidth = DEFAULT_SIDEBAR_WIDTH;
  let draggingInput = false;
  let inputStartY = 0;
  let inputStartHeight = DEFAULT_INPUT_HEIGHT;

  function startResizeSidebar(event: MouseEvent) {
    event.preventDefault();
    draggingSidebar = true;
    sidebarStartX = event.clientX;
    sidebarStartWidth = sidebarWidth.value;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMoveSidebar);
    window.addEventListener('mouseup', stopResizeSidebar);
  }

  function onMouseMoveSidebar(event: MouseEvent) {
    if (!draggingSidebar) return;
    const delta = event.clientX - sidebarStartX;
    sidebarWidth.value = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, sidebarStartWidth + delta));
  }

  function stopResizeSidebar() {
    if (!draggingSidebar) return;
    draggingSidebar = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMoveSidebar);
    window.removeEventListener('mouseup', stopResizeSidebar);
    try {
      localStorage.setItem('coolapk_messages_sidebar_width', String(sidebarWidth.value));
    } catch {}
  }

  function resetSidebarWidth() {
    sidebarWidth.value = DEFAULT_SIDEBAR_WIDTH;
    try {
      localStorage.setItem('coolapk_messages_sidebar_width', String(DEFAULT_SIDEBAR_WIDTH));
    } catch {}
  }

  function startResizeInput(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingInput = true;
    inputStartY = event.clientY;
    inputStartHeight = visibleInputHeight.value;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMouseMoveInput);
    window.addEventListener('pointerup', stopResizeInput);
    window.addEventListener('pointercancel', stopResizeInput);
  }

  function onMouseMoveInput(event: PointerEvent) {
    if (!draggingInput) return;
    const delta = inputStartY - event.clientY;
    const maxAllowed = typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.8) : MAX_INPUT_HEIGHT;
    const minAllowed = options.pendingImageCount.value > 0 ? 240 : MIN_INPUT_HEIGHT;
    inputAreaHeight.value = Math.max(minAllowed, Math.min(maxAllowed, inputStartHeight + delta));
  }

  function stopResizeInput() {
    if (!draggingInput) return;
    draggingInput = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onMouseMoveInput);
    window.removeEventListener('pointerup', stopResizeInput);
    window.removeEventListener('pointercancel', stopResizeInput);
    try {
      localStorage.setItem('coolapk_messages_input_height', String(inputAreaHeight.value));
    } catch {}
  }

  function resetInputHeight() {
    inputAreaHeight.value = DEFAULT_INPUT_HEIGHT;
    try {
      localStorage.setItem('coolapk_messages_input_height', String(DEFAULT_INPUT_HEIGHT));
    } catch {}
  }

  async function toggleInputFullscreen() {
    isInputFullscreen.value = !isInputFullscreen.value;
    await nextTick();
    options.focusEditor?.();
  }

  function dispose() {
    window.removeEventListener('mousemove', onMouseMoveSidebar);
    window.removeEventListener('mouseup', stopResizeSidebar);
    window.removeEventListener('pointermove', onMouseMoveInput);
    window.removeEventListener('pointerup', stopResizeInput);
    window.removeEventListener('pointercancel', stopResizeInput);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  onUnmounted(dispose);

  return {
    sidebarWidth,
    inputAreaHeight,
    visibleInputHeight,
    isInputFullscreen,
    startResizeSidebar,
    resetSidebarWidth,
    startResizeInput,
    resetInputHeight,
    toggleInputFullscreen,
    dispose,
  };
}
