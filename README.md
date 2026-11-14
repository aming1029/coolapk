<p align="center">
  <img src="src/assets/coolapk-logo-rounded.png" width="96" alt="coolapk">
</p>

<h1 align="center">coolapk</h1>

<p align="center">基于 Tauri 2 + Vue 3 + Rust 的第三方酷安桌面客户端</p>

> [!IMPORTANT]
> 本项目是社区维护的非官方客户端，与酷安官方及深圳酷安网络科技有限公司无隶属、授权或合作关系。
> 酷安名称、Logo 及相关商标归其权利人所有。

## 简介

把酷安的核心浏览体验搬到桌面：原生窗口、托盘常驻、深链接、本地缓存与多标签阅读，
外加一套自研的玻璃质感与果冻侧边栏动效。

## 功能

### 内容浏览

- 首页信息流（关注 / 头条 / 热榜 / 快讯 / 新机 等），支持单列、双列与自适应排列
- 数码、发现、话题、酷图、应用市场、二手、装机单、商品与排行榜
- 动态详情、评论与楼中楼、话题讨论、投票、问答
- 图片查看器、Live Photo、GIF 自动播放、原图加载

### 账号与互动

- 账号切换、Cookie 管理、收藏、历史、消息、通知
- 动态发布、评论回复、转发、点赞、收藏单管理（写操作按需授权）
- 桌面通知、托盘常驻、开机自启

### 外观

| 能力 | 说明 |
| --- | --- |
| 玻璃质感 | 关闭 / 柔和 / 通透 三档，覆盖顶部导航、侧边栏、页面标签栏与移动底栏；玻璃表面垫有底色纱，保证文字对比度 |
| 果冻动效 | 侧边栏高亮块弹性回弹滑动，可单独关闭 |
| 主题 | 浅色 / 深色 / 跟随系统，品牌强调色，自定义浅色底色 |
| 排版 | 界面缩放、字号、列表密度、减少动态效果、无图模式 |

### 本地 Agent 接口

设置 → Agent 接口可开启仅监听回环地址的 REST 与 MCP 服务，供本机脚本或 AI agent
读取内容、执行受控写操作。默认关闭，调用需携带应用内生成的 token。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 桌面壳 | Tauri 2 |
| 前端 | Vue 3 + TypeScript + Pinia + Vue Router |
| 后端 | Rust（reqwest / tokio / axum） |
| 构建 | Vite 8 + NSIS |

## 开发

```bash
npm ci

npm run dev        # 前端热更新
npm run tauri dev  # 完整桌面应用

npm run typecheck  # vue-tsc 类型检查
npm test           # vitest 单元测试
npm run build      # 前端生产构建
```

环境要求：Node.js >= 22、Rust stable、WebView2 Runtime（Windows）。

## 构建安装包

Windows 下一键构建 NSIS 安装包与便携包：

```powershell
.\scripts\build-windows.ps1
```

脚本会准备工具链环境、构建前端与 Rust release 产物、生成安装包和便携 zip，
并把结果与 SHA256 校验清单写入仓库同级的 `dist/` 目录（`D:\project\kean-desktop\dist`）。

> 仓库内的 `dist/` 是 Vite 前端构建产物，会被下次构建清空；发布用的安装包不要放那里。

可选参数：`-Version 2.1.0` 同步版本号，`-SkipTests` 跳过类型检查与测试。

## 数据目录

| 平台 | 账号 / 设置 / 草稿 | 缓存与日志 |
| --- | --- | --- |
| Windows | `%APPDATA%\com.kean.desktop` | `%LOCALAPPDATA%\com.kean.desktop` |
| macOS | `~/Library/Application Support/com.kean.desktop` | `~/Library/Caches/com.kean.desktop` |
| Linux | `~/.local/share/com.kean.desktop` | `~/.cache/com.kean.desktop` |

## 许可

MIT，详见 [LICENSE](LICENSE)。第三方组件与商标声明见 [NOTICE.md](NOTICE.md)。
