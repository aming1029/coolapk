<template>
  <div class="settings-page-container">
    <div class="settings-layout-card" :class="{ 'is-mobile': mobileLayout }" @keydown.esc.stop="handleEscape">
      <aside v-if="!mobileLayout" class="settings-sidebar">
        <h2 class="settings-title">设置中心</h2>

        <label class="settings-search">
          <i class="fas fa-search" aria-hidden="true"></i>
          <input
            v-model="query"
            type="search"
            class="settings-search-input"
            placeholder="搜索设置项"
            aria-label="搜索设置项"
            @keydown.enter.prevent="openFirstResult"
          />
          <button v-if="query" type="button" class="settings-search-clear" aria-label="清除搜索" @click="query = ''">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </label>

        <nav class="settings-menu custom-scrollbar" aria-label="设置栏目">
          <template v-for="group in filteredGroups" :key="group.name">
            <p class="settings-group-title">{{ group.name }}</p>
            <router-link
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="settings-menu-item"
              active-class="is-active"
              :title="item.description"
            >
              <i :class="[item.icon, 'menu-icon']" aria-hidden="true"></i>
              <span class="menu-label">{{ item.label }}</span>
            </router-link>
          </template>
          <p v-if="!filteredGroups.length" class="settings-menu-empty">没有匹配的设置项</p>
        </nav>
      </aside>

      <button v-if="mobileLayout && categoriesOpen" type="button" class="settings-category-backdrop" aria-label="关闭设置分类" @click="closeCategories"></button>
      <header v-if="mobileLayout" class="settings-navigation">
        <h2 class="settings-title">设置中心</h2>
        <div class="settings-category-picker">
          <button ref="categoryTrigger" type="button" class="settings-category-trigger" aria-label="设置分类" aria-haspopup="dialog" :aria-expanded="categoriesOpen" aria-controls="settings-category-panel" @click="toggleCategories">
            <i :class="currentCategory.icon" aria-hidden="true"></i><span>{{ currentCategory.label }}</span><i class="fas fa-chevron-down category-chevron" :class="{ 'is-open': categoriesOpen }" aria-hidden="true"></i>
          </button>
          <div v-if="categoriesOpen" id="settings-category-panel" ref="categoryPanel" class="settings-category-panel custom-scrollbar" role="dialog" aria-label="设置分类">
            <div class="category-panel-heading"><strong>设置分类</strong><span>选择设置栏目</span></div>
            <label class="settings-search is-compact">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input v-model="query" type="search" class="settings-search-input" placeholder="搜索设置项" aria-label="搜索设置项" @keydown.enter.prevent="openFirstResult" />
              <button v-if="query" type="button" class="settings-search-clear" aria-label="清除搜索" @click="query = ''">
                <i class="fas fa-xmark" aria-hidden="true"></i>
              </button>
            </label>
            <nav class="settings-category-grid" aria-label="设置栏目">
              <template v-for="group in filteredGroups" :key="group.name">
                <p class="category-group-title">{{ group.name }}</p>
                <button v-for="item in group.items" :key="item.path" type="button" class="settings-category-card" :class="{ 'is-active': currentCategory.path === item.path }" :aria-current="currentCategory.path === item.path ? 'page' : undefined" @click="selectCategory(item.path)">
                  <i :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span>
                </button>
              </template>
              <p v-if="!filteredGroups.length" class="settings-menu-empty">没有匹配的设置项</p>
            </nav>
          </div>
        </div>
      </header>

      <section class="settings-content custom-scrollbar">
        <header class="settings-page-head">
          <div class="settings-page-head-main">
            <i :class="currentCategory.icon" aria-hidden="true"></i>
            <h3>{{ currentCategory.label }}</h3>
          </div>
          <p class="settings-page-desc">{{ currentCategory.description }}</p>
        </header>
        <router-view v-slot="{ Component }">
          <component :is="Component" v-if="Component" />
        </router-view>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onDeactivated, ref, watch } from 'vue';
import { useAndroidBackButton } from '../../utils/androidBackButton';
import { useRoute, useRouter } from 'vue-router';
import { useMobileLayout } from '../../composables/useOfficialMobileFeedDetail';
const route = useRoute();
const router = useRouter();
const mobileLayout = useMobileLayout();

type SettingsMenuItem = {
  path: string;
  label: string;
  icon: string;
  group: string;
  description: string;
  keywords: string[];
};

/**
 * 设置栏目定义。
 *
 * group 决定分组顺序（Map 保序，首次出现的位置即分组位置），
 * keywords 只参与搜索匹配，不展示给用户。
 */
const settingsMenu: SettingsMenuItem[] = [
  { path: '/settings/profile', label: '个人信息', icon: 'fas fa-id-card', group: '账户与安全', description: '头像、昵称与个人资料展示', keywords: ['昵称', '头像', '资料'] },
  { path: '/settings/account', label: '账号与安全', icon: 'fas fa-user-shield', group: '账户与安全', description: '登录状态、Cookie 与账号切换', keywords: ['登录', 'cookie', '账号', '切换'] },
  { path: '/settings/privacy', label: '隐私设置', icon: 'fas fa-lock', group: '账户与安全', description: '隐私开关与数据可见性', keywords: ['隐私', '可见', '数据'] },

  { path: '/settings/notifications', label: '通知设置', icon: 'fas fa-bell', group: '内容与通知', description: '通知类型、提示音与轮询间隔', keywords: ['通知', '提示音', '未读', '轮询'] },
  { path: '/settings/content', label: '内容偏好', icon: 'fas fa-sliders-h', group: '内容与通知', description: '信息流、评论与图片的显示偏好', keywords: ['信息流', '评论', '图片', '自动播放'] },
  { path: '/settings/downloads', label: '下载与缓存', icon: 'fas fa-download', group: '内容与通知', description: '下载目录、并发数与缓存清理', keywords: ['下载', '缓存', '目录', '清理'] },

  { path: '/settings/appearance', label: '外观设置', icon: 'fas fa-palette', group: '外观与行为', description: '主题、玻璃质感、果冻动效与排版', keywords: ['主题', '深色', '浅色', '玻璃', '毛玻璃', '果冻', '字号', '缩放', '密度', '颜色'] },
  { path: '/settings/shortcuts', label: '快捷键', icon: 'fas fa-keyboard', group: '外观与行为', description: '全局快捷键与按键提示', keywords: ['快捷键', '键盘', '热键'] },
  { path: '/settings/startup', label: '启动与行为', icon: 'fas fa-power-off', group: '外观与行为', description: '开机自启、托盘常驻与窗口行为', keywords: ['自启', '托盘', '窗口', '置顶'] },

  { path: '/settings/network', label: '网络代理', icon: 'fas fa-globe', group: '系统与高级', description: '代理服务器与网络诊断', keywords: ['代理', 'proxy', '网络'] },
  { path: '/settings/device', label: '设备信息', icon: 'fas fa-mobile-alt', group: '系统与高级', description: '设备指纹与机型伪装', keywords: ['设备', '机型', '指纹', '伪装'] },
  { path: '/settings/agent', label: 'Agent 接口', icon: 'fas fa-robot', group: '系统与高级', description: '本地 REST / MCP 接口与权限范围', keywords: ['agent', 'mcp', 'rest', '接口', '自动化'] },
  { path: '/settings/diagnostics', label: '诊断日志', icon: 'fas fa-file-lines', group: '系统与高级', description: '运行日志与问题排查', keywords: ['日志', '诊断', '排查'] },
  { path: '/settings/about', label: '关于酷安', icon: 'fas fa-info-circle', group: '系统与高级', description: '版本信息、更新检查与开源许可', keywords: ['版本', '更新', '许可', '关于'] },
];

const query = ref('');

function matchesQuery(item: SettingsMenuItem, keyword: string): boolean {
  if (!keyword) return true;
  const haystack = [item.label, item.description, ...item.keywords].join(' ').toLowerCase();
  return haystack.includes(keyword);
}

/** 按分组聚合栏目；搜索时过滤空分组，避免留下孤立标题。 */
const filteredGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  const groups: { name: string; items: SettingsMenuItem[] }[] = [];
  for (const item of settingsMenu) {
    if (!matchesQuery(item, keyword)) continue;
    const group = groups.find(entry => entry.name === item.group);
    if (group) group.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }
  return groups;
});

const categoriesOpen = ref(false);
const categoryTrigger = ref<HTMLButtonElement | null>(null);
const categoryPanel = ref<HTMLElement | null>(null);
// 分类卡片和触发按钮始终跟随路由，支持直接打开和前进后退。
const currentCategory = computed(() => settingsMenu.find(item => item.path === route.path)
  ?? settingsMenu.find(item => item.path === '/settings/appearance')!);

/** Esc 先关分类面板，再清空搜索词，都不满足时才交给外层处理。 */
function handleEscape() {
  if (mobileLayout.value && categoriesOpen.value) {
    closeCategories();
    return;
  }
  if (query.value) query.value = '';
}

async function toggleCategories() {
  if (categoriesOpen.value) { closeCategories(); return; }
  categoriesOpen.value = true;
  await nextTick();
  categoryPanel.value?.querySelector<HTMLButtonElement>('.is-active')?.focus({ preventScroll: true });
}
function closeCategories() { categoriesOpen.value = false; categoryTrigger.value?.focus({ preventScroll: true }); }
function selectCategory(path: string) {
  closeCategories();
  if (path !== route.path && settingsMenu.some(item => item.path === path)) void router.push(path);
}
/** 搜索框回车直达第一个命中栏目。 */
function openFirstResult() {
  const first = filteredGroups.value[0]?.items[0];
  if (!first) return;
  if (mobileLayout.value) closeCategories();
  if (first.path !== route.path) void router.push(first.path);
}
useAndroidBackButton(() => categoriesOpen.value, closeCategories);
watch(() => route.fullPath, () => { categoriesOpen.value = false; });
watch(mobileLayout, () => { categoriesOpen.value = false; });
onDeactivated(() => { categoriesOpen.value = false; });
</script>

<style scoped>
.settings-page-container { width: 100%; height: 100%; min-width: 0; min-height: 0; display: flex; background: var(--surface); }
.settings-layout-card { flex: 1; min-width: 0; min-height: 0; height: 100%; position: relative; display: flex; overflow: hidden; background: var(--surface); }
.settings-layout-card.is-mobile { flex-direction: column; }
.settings-sidebar { width: 196px; background: var(--surface); border-right: 1px solid var(--border); padding: var(--space-4) var(--space-3); display: flex; flex-direction: column; flex-shrink: 0; min-height: 0; }
.settings-sidebar .settings-title { margin-bottom: var(--space-3); }
.settings-title { margin: 0; color: var(--text-primary); font-size: var(--font-size-title-md); font-weight: var(--font-weight-bold); }

/* 搜索框：桌面侧栏与移动端分类面板共用 */
.settings-search { display: flex; align-items: center; gap: 8px; height: 34px; margin-bottom: var(--space-3); padding: 0 10px; border: 1px solid var(--border-light); border-radius: var(--radius-control); background: var(--surface-hover); color: var(--text-tertiary); flex-shrink: 0; }
.settings-search:focus-within { border-color: var(--brand-primary); background: var(--surface); }
.settings-search > i { font-size: 12px; }
.settings-search-input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: var(--font-size-caption); outline: none; }
.settings-search-input::placeholder { color: var(--text-tertiary); }
.settings-search-input::-webkit-search-cancel-button { display: none; }
.settings-search-clear { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--text-tertiary); cursor: pointer; }
.settings-search-clear:hover { background: var(--surface-active); color: var(--text-primary); }
.settings-search.is-compact { margin: 0 4px 12px; }

.settings-menu { display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0; overflow-y: auto; padding-right: 2px; }
.settings-group-title { margin: 10px 0 2px; padding: 0 var(--space-4); color: var(--text-tertiary); font-size: 11px; font-weight: var(--font-weight-semibold); letter-spacing: 0; text-transform: none; }
.settings-group-title:first-child { margin-top: 0; }
.settings-menu-item { display: flex; align-items: center; gap: var(--space-3); height: 38px; padding: 0 var(--space-4); border-radius: var(--radius-control); font-size: var(--font-size-sub); color: var(--text-secondary); font-weight: var(--font-weight-medium); text-decoration: none; transition: background-color var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default); }
.settings-menu-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.settings-menu-item.is-active { background: var(--brand-soft); color: var(--brand-primary); font-weight: var(--font-weight-semibold); }
.menu-icon { font-size: 15px; width: 18px; text-align: center; flex-shrink: 0; }
.menu-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.settings-menu-empty { margin: 12px var(--space-4); color: var(--text-tertiary); font-size: var(--font-size-caption); line-height: 1.5; }

.settings-navigation { position: relative; z-index: 12; flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px 24px; border-bottom: 1px solid var(--border); }
.settings-category-picker { position: relative; width: min(280px, 100%); max-width: 100%; }
.settings-category-trigger { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 13px; background: var(--surface-hover); color: var(--text-secondary); font: inherit; cursor: pointer; }
.settings-category-trigger > span { flex: 1; text-align: left; }
.category-chevron { font-size: 12px; transition: transform var(--duration-fast); }
.category-chevron.is-open { transform: rotate(180deg); }
.settings-category-trigger:focus-visible, .settings-category-card:focus-visible { outline: 2px solid var(--brand-primary); outline-offset: -2px; }
.settings-category-backdrop { position: absolute; inset: 0; z-index: 11; border: 0; background: #0003; cursor: default; }
.settings-category-panel { position: absolute; top: calc(100% + 8px); left: 0; width: min(460px, calc(100vw - 32px)); max-height: min(480px, calc(var(--app-viewport-height, 100dvh) - 180px)); box-sizing: border-box; padding: 16px 12px 12px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 13px; background: var(--surface); box-shadow: var(--shadow-lg); }
.category-panel-heading { display: flex; align-items: center; gap: 10px; margin: 0 4px 12px; color: var(--text-primary); }
.category-panel-heading strong { font-size: 16px; }
.category-panel-heading > span { color: var(--text-tertiary); font-size: 12px; }
.settings-category-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.category-group-title { grid-column: 1 / -1; margin: 8px 4px 0; color: var(--text-tertiary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.settings-category-grid > .category-group-title:first-child { margin-top: 0; }
.settings-category-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; min-height: 60px; padding: 6px 4px; border: 1px solid var(--border-light); border-radius: 13px; background: var(--surface-hover); color: var(--text-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.settings-category-card > i { font-size: 18px; }
.settings-category-card:hover { background: var(--brand-soft); }
.settings-category-card.is-active { color: var(--brand-primary); background: var(--brand-soft); }

/* 当前栏目页头：解决内容区隐藏 .section-title 后“不知道自己在哪一页”的问题 */
.settings-page-head { margin-bottom: var(--space-4); padding-bottom: var(--space-3); border-bottom: 1px solid var(--divider); }
.settings-page-head-main { display: flex; align-items: center; gap: 10px; color: var(--text-primary); }
.settings-page-head-main > i { font-size: 16px; color: var(--brand-primary); }
.settings-page-head-main > h3 { margin: 0; font-size: var(--font-size-title-sm, 16px); font-weight: var(--font-weight-bold); }
.settings-page-desc { margin: 6px 0 0 26px; color: var(--text-tertiary); font-size: var(--font-size-caption); line-height: 1.5; }

.settings-content { flex: 1; min-width: 0; min-height: 0; padding: var(--space-6); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }
/* 子设置页共享可用宽度，移除各页遗留的固定上限，同时允许窄窗口收缩。 */
.settings-content :deep(.settings-section) { width: 100%; max-width: none; min-width: 0; box-sizing: border-box; }
/* 按内容所需宽度换行，系统放大字体或 PC 窄窗口时也不能让操作挤扁说明。 */
.settings-content :deep(.setting-row) { flex-wrap: wrap; gap: 12px 16px; }
.settings-content :deep(.setting-row > .row-info) { flex: 1 1 200px; min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
.settings-content :deep(.setting-row > .select-control), .settings-content :deep(.setting-row > .text-input) { max-width: 100%; min-width: 0; }
.settings-content :deep(.setting-row > .row-actions) { flex-wrap: wrap; flex-shrink: 0; max-width: 100%; margin-left: 0; }
.settings-content :deep(.setting-row .app-button) { max-width: 100%; height: auto; min-height: 28px; white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 600px) {
  /* 多按钮操作独占一行，不能为了同排展示而把说明或按钮文字挤成竖排。 */
  .settings-content :deep(.setting-row > .row-actions) { flex-basis: 100%; justify-content: flex-start; }
}
/* 栏目名称由桌面侧栏或移动端分类按钮展示，内容区不再重复标题，保留说明与账号信息。 */
.settings-content :deep(.section-title) { display: none; }
.is-mobile .settings-navigation { padding: 10px 16px; }
.is-mobile .settings-title { display: none; }
.is-mobile .settings-category-picker, .is-mobile .settings-category-panel { width: 100%; }
.is-mobile .settings-content { padding: 16px; }
.is-mobile .settings-page-head { margin-bottom: 12px; padding-bottom: 10px; }
</style>
