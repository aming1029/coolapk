import { computed, nextTick, onBeforeUnmount, onMounted, reactive, watch, type Ref } from 'vue';

type JellyPillState = {
  visible: boolean;
  hopping: boolean;
  top: number;
  height: number;
  left: number;
  width: number;
};

type JellyPillOptions = {
  /** 开关状态，关闭时不参与任何布局计算。 */
  enabled: () => boolean;
  /** 滚动容器，滑块以它为定位基准。 */
  navRef: Ref<HTMLElement | null>;
  /** 触发重算的响应式来源（路由、折叠状态、菜单显隐等）。 */
  sources: () => readonly unknown[];
  /** 当前高亮项选择器。 */
  selector?: string;
  /** 挤压动画时长，需与 CSS 中的 navJellyHop 保持一致。 */
  hopDuration?: number;
};

/**
 * 侧边栏果冻高亮块。
 *
 * 把「测量当前高亮项 → 驱动绝对定位滑块」这段逻辑从组件里剥离出来：
 * 组件只负责渲染滑块和样式，位置计算、重算时机与动画状态都在这里，
 * 便于单独测试，也不会让 MainSidebar 继续膨胀。
 */
export function useJellyPill(options: JellyPillOptions) {
  const { enabled, navRef, sources, selector = '.nav-item.is-active', hopDuration = 520 } = options;
  const pill = reactive<JellyPillState>({ visible: false, hopping: false, top: 0, height: 0, left: 0, width: 0 });
  const pillStyle = computed(() => ({
    transform: `translate3d(${pill.left}px, ${pill.top}px, 0)`,
    width: `${pill.width}px`,
    height: `${pill.height}px`,
  }));

  let hopTimer: number | undefined;
  let observer: ResizeObserver | undefined;

  function update() {
    const nav = navRef.value;
    if (!nav || !enabled()) {
      pill.visible = false;
      pill.hopping = false;
      return;
    }
    const active = nav.querySelector<HTMLElement>(selector);
    if (!active) {
      pill.visible = false;
      return;
    }
    const previousTop = pill.top;
    const wasVisible = pill.visible;
    pill.top = active.offsetTop;
    pill.height = active.offsetHeight;
    pill.left = active.offsetLeft;
    pill.width = active.offsetWidth;
    pill.visible = true;
    if (wasVisible && Math.abs(previousTop - pill.top) > 1) {
      pill.hopping = true;
      window.clearTimeout(hopTimer);
      hopTimer = window.setTimeout(() => { pill.hopping = false; }, hopDuration);
    }
  }

  watch(
    [enabled, () => [...sources()], navRef],
    async () => {
      await nextTick();
      update();
    },
  );

  onMounted(() => {
    void nextTick(update);
    if (typeof ResizeObserver !== 'undefined' && navRef.value) {
      observer = new ResizeObserver(() => update());
      observer.observe(navRef.value);
    }
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    window.clearTimeout(hopTimer);
  });

  return { pill, pillStyle, update };
}
