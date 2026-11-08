import { computed, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageLayout } from '../useMessageLayout';

describe('useMessageLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('restores persisted dimensions and expands for pending images', async () => {
    localStorage.setItem('coolapk_messages_sidebar_width', '368');
    localStorage.setItem('coolapk_messages_input_height', '180');
    const pendingImages = computed(() => 1);
    const focusEditor = vi.fn();
    const layout = useMessageLayout({ pendingImageCount: pendingImages, focusEditor });

    expect(layout.sidebarWidth.value).toBe(368);
    expect(layout.inputAreaHeight.value).toBe(180);
    expect(layout.visibleInputHeight.value).toBe(240);

    await layout.toggleInputFullscreen();
    expect(layout.isInputFullscreen.value).toBe(true);
    expect(focusEditor).toHaveBeenCalledOnce();
    layout.dispose();
  });

  it('resets dimensions to their defaults and persists them', () => {
    const layout = useMessageLayout({ pendingImageCount: computed(() => 0) });

    layout.sidebarWidth.value = 450;
    layout.inputAreaHeight.value = 300;
    layout.resetSidebarWidth();
    layout.resetInputHeight();
    void nextTick();

    expect(layout.sidebarWidth.value).toBe(320);
    expect(layout.inputAreaHeight.value).toBe(160);
    expect(localStorage.getItem('coolapk_messages_sidebar_width')).toBe('320');
    expect(localStorage.getItem('coolapk_messages_input_height')).toBe('160');
    layout.dispose();
  });
});
