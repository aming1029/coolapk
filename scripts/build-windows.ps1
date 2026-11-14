<#
.SYNOPSIS
  一键构建 Windows 安装包与便携包。

.DESCRIPTION
  封装本项目的构建前置条件：
    1. 把 MinGW-w64 / cargo 放进 PATH，并设置 libsodium 预编译目录；
    2. 同步版本号（可选）、构建前端与 Rust release 产物；
    3. 调用 tauri bundler 生成 NSIS 安装包；
    4. 附带 WebView2Loader.dll 打便携包，输出 SHA256 校验清单。

.EXAMPLE
  .\scripts\build-windows.ps1
  .\scripts\build-windows.ps1 -Version 2.1.0
#>
param(
  [string]$Version,
  [string]$MinGwBin = 'C:\mingw\ucrt64\bin',
  [string]$SodiumLibDir = 'C:\libsodium\libsodium-win64\lib',
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
# 注意：仓库内的 dist/ 是 Vite 前端产物目录，会被下次构建清空；
# 发布产物统一放到仓库同级的 dist/，与源码目录分开，避免误删或误提交。
$distDir = Join-Path (Split-Path -Parent $repoRoot) 'dist'
$releaseDir = Join-Path $repoRoot 'src-tauri\target\release'

function Write-Step($message) { Write-Host "==> $message" -ForegroundColor Cyan }

# PowerShell 5.1 会把原生程序的 stderr 当成 ErrorRecord，
# 在 $ErrorActionPreference='Stop' 下会直接中断脚本（cargo 的进度输出就走 stderr）。
# 因此原生调用统一走这里：临时放宽 EAP，再按退出码判定成败。
function Invoke-Native {
  param([string]$FilePath, [string[]]$Arguments)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $FilePath @Arguments 2>&1 | Out-Host
  } finally {
    $ErrorActionPreference = $previous
  }
  if ($LASTEXITCODE -ne 0) { throw "$FilePath 执行失败，退出码 $LASTEXITCODE" }
}

Write-Step '检查构建环境'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw '缺少 Node.js（>= 22）' }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  $cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
  if (-not (Test-Path -LiteralPath $cargo)) { throw '缺少 Rust 工具链，请先安装 rustup' }
  $env:PATH = "$(Join-Path $env:USERPROFILE '.cargo\bin');$env:PATH"
}
if (Test-Path -LiteralPath $MinGwBin) { $env:PATH = "$MinGwBin;$env:PATH" }
if (-not $env:SODIUM_LIB_DIR -and (Test-Path -LiteralPath $SodiumLibDir)) { $env:SODIUM_LIB_DIR = $SodiumLibDir }

Set-Location -LiteralPath $repoRoot

if ($Version) {
  Write-Step "同步版本号到 $Version"
  Invoke-Native 'npm' @('run', 'version:set', '--', $Version)
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
  Write-Step '安装前端依赖'
  Invoke-Native 'npm' @('ci')
}

if (-not $SkipTests) {
  Write-Step '类型检查与单元测试'
  Invoke-Native 'npm' @('run', 'typecheck')
  Invoke-Native 'npm' @('test')
}

Write-Step '构建安装包'
Invoke-Native 'npx' @('tauri', 'build', '--bundles', 'nsis')

Write-Step '打包便携版'
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Get-ChildItem -LiteralPath $distDir -File | Where-Object {
  $_.Name -match '(?:setup\.exe|portable\.exe|portable-x64\.zip|SHA256SUMS\.txt)$'
} | Remove-Item -Force
# 必须显式按 UTF-8 读取：PowerShell 5.1 默认按 ANSI 解析，中文描述会让 JSON 解析失败。
$version = (Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
$portableStage = Join-Path $env:TEMP "coolapk-desktop-portable-$version"
if (Test-Path -LiteralPath $portableStage) { Remove-Item -LiteralPath $portableStage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $portableStage | Out-Null
Copy-Item (Join-Path $releaseDir 'coolapk_desktop.exe') $portableStage -Force
Copy-Item (Join-Path $repoRoot 'src-tauri\resources\WebView2Loader.dll') $portableStage -Force
Compress-Archive -Path (Join-Path $portableStage '*') -DestinationPath (Join-Path $distDir "coolapk-desktop-$version-portable-x64.zip") -Force

$installerSource = Join-Path $releaseDir "bundle\nsis\coolapk_${version}_x64-setup.exe"
if (-not (Test-Path -LiteralPath $installerSource -PathType Leaf)) {
  throw "未找到当前版本的 NSIS 安装包: $installerSource"
}
Copy-Item $installerSource (Join-Path $distDir "coolapk-desktop_${version}_x64-setup.exe") -Force
# 单文件便携版：应用内自动更新下载的附件，必须带 x64 + setup/portable 命名规则才能被识别。
Copy-Item (Join-Path $releaseDir 'coolapk_desktop.exe') (Join-Path $distDir "coolapk-desktop_${version}_x64-portable.exe") -Force

Write-Step '生成校验清单'
$lines = Get-ChildItem $distDir -File | Where-Object { $_.Name -ne 'SHA256SUMS.txt' } | ForEach-Object {
  $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
  "$hash  $($_.Name)"
}
$lines | Set-Content -Path (Join-Path $distDir 'SHA256SUMS.txt') -Encoding ASCII
$lines | Write-Host

Write-Step '完成'
Get-ChildItem $distDir | Select-Object Name, @{ n = 'MB'; e = { [math]::Round($_.Length / 1MB, 2) } } | Format-Table -AutoSize
