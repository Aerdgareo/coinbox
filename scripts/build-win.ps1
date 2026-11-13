param(
  [ValidateSet('inno', 'portable', 'all')]
  [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$innoCandidates = @(
  'D:\Inno Setup 7\ISCC.exe',
  'D:\Inno Setup 6\ISCC.exe',
  'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
  'C:\Program Files\Inno Setup 6\ISCC.exe',
  'C:\Program Files (x86)\Inno Setup 5\ISCC.exe'
)
$iscc = $innoCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  $cmd = Get-Command iscc -ErrorAction SilentlyContinue
  if ($cmd) { $iscc = $cmd.Source }
}

$makensis = $null
$nsisCache = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache\nsis'
if (Test-Path $nsisCache) {
  $found = Get-ChildItem $nsisCache -Recurse -Filter 'makensis.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { $makensis = $found.FullName }
}
if (-not $makensis) {
  $cmd = Get-Command makensis -ErrorAction SilentlyContinue
  if ($cmd) { $makensis = $cmd.Source }
}

Write-Host '== 1/3 构建前端 ==' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'vite build 失败' }

Write-Host '== 2/3 打包应用目录 ==' -ForegroundColor Cyan
npx electron-builder --win --x64 --dir
if ($LASTEXITCODE -ne 0) { throw 'electron-builder 失败' }

if ($Target -eq 'inno' -or $Target -eq 'all') {
  if (-not $iscc) { throw '未找到 Inno Setup 的 ISCC.exe，请安装 Inno Setup 或修改脚本里的路径' }
  Write-Host "== 3/3 Inno Setup: $iscc ==" -ForegroundColor Cyan
  & $iscc 'installer\coinbox.iss'
  if ($LASTEXITCODE -ne 0) { throw 'Inno Setup 编译失败' }
}

if ($Target -eq 'portable' -or $Target -eq 'all') {
  if (-not $makensis) { throw '未找到 makensis.exe，请安装 NSIS 或先运行一次 electron-builder' }
  Write-Host "== 3/3 NSIS 便携版: $makensis ==" -ForegroundColor Cyan
  & $makensis -INPUTCHARSET UTF8 'installer\portable.nsi'
  if ($LASTEXITCODE -ne 0) { throw 'NSIS 编译失败' }
}

Write-Host ''
Write-Host '完成，产物在 release\ 目录：' -ForegroundColor Green
Get-ChildItem 'release\*.exe' | Select-Object Name, @{N = 'SizeMB'; E = { [math]::Round($_.Length / 1MB, 1) } } | Format-Table -AutoSize