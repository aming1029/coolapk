/**
 * 品牌与分发元数据的唯一来源。
 *
 * 改名 / 换仓库时只改这一个文件（外加 tauri.conf.json 与 package.json 的静态字段），
 * 避免仓库地址、应用名、数据目录散落在各处。
 */
export const APP_NAME = 'coolapk';
export const APP_SLUG = 'coolapk-desktop';
export const APP_DESCRIPTION = '基于 Tauri 2、Vue 3 与 Rust 的第三方酷安桌面客户端';

/** 应用标识，同时是各平台数据目录名与深链接宿主。 */
export const APP_ID = 'com.kean.desktop';
/** 兼容历史版本的应用标识，保证从旧版本升级的深链接仍然可用。 */
export const LEGACY_APP_IDS = ['com.coolapk.desktop'] as const;

export const REPO_SLUG = 'aming1029/coolapk-desktop';
export const REPO_OWNER = REPO_SLUG.split('/')[0];
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const REPO_OWNER_URL = `https://github.com/${REPO_OWNER}`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

export function isKnownAppId(host: string): boolean {
  return host === APP_ID || (LEGACY_APP_IDS as readonly string[]).includes(host);
}
