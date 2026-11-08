import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useJellyPill } from '../useJellyPill';

type Api = ReturnType<typeof useJellyPill>;

function mountHarness(enabled: boolean) {
  const enabledRef = ref(enabled);
  let api!: Api;
  const Harness = defineComponent({
    setup() {
      const navRef = ref<HTMLElement | null>(null);
      api = useJellyPill({
        enabled: () => enabledRef.value,
        navRef,
        sources: () => [enabledRef.value],
      });
      return () => h('div', { ref: navRef, class: 'nav' }, [
        h('div', { class: 'nav-item is-active' }),
        h('div', { class: 'jelly' }),
      ]);
    },
  });
  const wrapper = mount(Harness);
  return { wrapper, enabledRef, get api() { return api; } };
}

function stubMetrics(wrapper: ReturnType<typeof mount>, metrics: { top: number; height: number; left: number; width: number }) {
  const active = wrapper.element.querySelector('.nav-item.is-active') as HTMLElement;
  Object.defineProperty(active, 'offsetTop', { value: metrics.top, configurable: true });
  Object.defineProperty(active, 'offsetHeight', { value: metrics.height, configurable: true });
  Object.defineProperty(active, 'offsetLeft', { value: metrics.left, configurable: true });
  Object.defineProperty(active, 'offsetWidth', { value: metrics.width, configurable: true });
  return active;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useJellyPill', () => {
  it('开关关闭时不显示高亮块', async () => {
    const harness = mountHarness(false);
    try {
      stubMetrics(harness.wrapper, { top: 84, height: 42, left: 12, width: 200 });
      harness.api.update();
      expect(harness.api.pill.visible).toBe(false);
    } finally {
      harness.wrapper.unmount();
    }
  });

  it('开启后按高亮项的位置与尺寸生成滑块样式', async () => {
    const harness = mountHarness(true);
    try {
      stubMetrics(harness.wrapper, { top: 84, height: 42, left: 12, width: 200 });
      harness.api.update();
      expect(harness.api.pill.visible).toBe(true);
      expect(harness.api.pillStyle.value).toEqual({
        transform: 'translate3d(12px, 84px, 0)',
        width: '200px',
        height: '42px',
      });
    } finally {
      harness.wrapper.unmount();
    }
  });

  it('位置变化时触发一次挤压动画并在结束后复位', async () => {
    vi.useFakeTimers();
    const harness = mountHarness(true);
    try {
      stubMetrics(harness.wrapper, { top: 84, height: 42, left: 12, width: 200 });
      harness.api.update();
      expect(harness.api.pill.hopping).toBe(false);

      stubMetrics(harness.wrapper, { top: 126, height: 42, left: 12, width: 200 });
      harness.api.update();
      expect(harness.api.pill.hopping).toBe(true);
      expect(harness.api.pill.top).toBe(126);

      vi.advanceTimersByTime(600);
      expect(harness.api.pill.hopping).toBe(false);
    } finally {
      harness.wrapper.unmount();
    }
  });

  it('滚动容器里没有高亮项时隐藏滑块', async () => {
    const harness = mountHarness(true);
    try {
      harness.wrapper.element.querySelector('.nav-item.is-active')?.classList.remove('is-active');
      harness.api.update();
      expect(harness.api.pill.visible).toBe(false);
      await nextTick();
    } finally {
      harness.wrapper.unmount();
    }
  });
});
