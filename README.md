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

## 下载与安装

从 [Releases](https://github.com/aming1029/coolapk-desktop/releases/latest) 下载最新稳定版。

| 形式 | 文件名 | 说明 |
| --- | --- | --- |
| 安装版 | `coolapk-desktop_<版本>_x64-setup.exe` | NSIS 安装包，带开始菜单快捷方式与卸载入口 |
| 便携版 | `coolapk-desktop-<版本>-portable-x64.zip` | 解压即用，需保留同目录的 `WebView2Loader.dll` |
| 单文件便携版 | `coolapk-desktop_<版本>_x64-portable.exe` | 自动更新下载的附件，也可单独运行 |

- 平台：Windows 10 / 11 x64
- 依赖：Microsoft Edge WebView2 Runtime，Win10 / 11 通常已自带
- 安装包未做代码签名，首次运行出现 SmartScreen 提示属正常现象，可点「更多信息 → 仍要运行」
- 每个 Release 附件都带 `SHA256SUMS.txt`，可用于校验下载完整性

## 界面截图

![首页](docs/screenshots/%E9%A6%96%E9%A1%B5.png)

更多截图与布局对比图放在 `docs/screenshots/`。

## 常见问题

**启动后白屏，或一直停在启动页**

先确认 WebView2 Runtime 已安装且不是过旧版本，仍不行就看日志
`%LOCALAPPDATA%\com.kean.desktop\logs\coolapk-diagnostics.log` 的最后几十行。
2.0.1 起已补齐旧版 WebView2 缺失的 `findLastIndex`，启动流程也加了超时保护与内置启动页，失败时会直接显示原因。

**首页加载不出数据，一片空白**

2.0.1 起首页接口异常会自动降级显示热榜，并在列表上方提示，可先点「重试」。
若依然为空，通常是接口风控或网络问题，附上日志中的 `feed_load_failed` 记录更容易定位。

**提示有新版本，但下载或安装没反应**

安装版会直接下载安装包；便携版从 2.0.2 起支持应用内自动更新，
2.0.1 及更早的便携版需要手动下载一次新包，之后即可自动更新。

**便携版更新后打不开**

确认 `WebView2Loader.dll` 与 exe 在同一目录，缺失会导致程序无法启动。

**登录状态丢了**

登录态保存在 Cookie 中，「设置 → 账号与安全」可重新登录；更换机器或清理数据目录后需要重新登录。

**怎么备份数据**

账号、设置、草稿都在系统数据目录，见下方[数据目录](#数据目录)。

## 版本与更新

当前稳定版：**2.0.2**

| 版本 | 主要内容 |
| --- | --- |
| 2.0.2 | 修复便携版自动更新缺少 `WebView2Loader.dll` 导致的静默失败；打包脚本额外产出单文件便携版 |
| 2.0.1 | 修复 Win10 白屏（旧 WebView2 缺少 `findLastIndex`、启动阶段阻塞、缺少启动提示）；首页接口异常时降级热榜并可重试 |
| 2.0.0 | 首个稳定版 |

- 完整更新说明见 [Releases](https://github.com/aming1029/coolapk-desktop/releases)
- 应用内「设置 → 关于酷安」以及侧边栏底部的更新按钮都可以检查更新

## 技术栈

| 层 | 选型 |
| --- | --- |
| 桌面壳 | Tauri 2 |
| 前端 | Vue 3 + TypeScript + Pinia + Vue Router |
| 后端 | Rust（reqwest / tokio / axum） |
| 构建 | Vite 8 + NSIS |

## 项目结构

```text
src/                  前端（Vue 3 + TypeScript）
  pages/              页面级组件
  components/         通用 UI 组件
  features/           领域功能模块
  stores/             Pinia 状态
  api/                调用 Rust 命令的 API 封装
  utils/              工具函数与诊断
  styles/             全局样式与主题变量
src-tauri/            Rust 桌面端
  src/coolapk/        酷安接口、请求构造与业务命令
  src/agent_bridge/   本地 REST / MCP Agent 接口
scripts/              构建、发布与 UI 回归脚本
docs/                 接口文档、诊断说明与截图
```

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
