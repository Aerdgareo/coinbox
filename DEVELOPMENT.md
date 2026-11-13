# 开发文档

面向想改代码或自己打包的人。只想用的话看 [README](README.md) 就行。

## 技术栈

原生 ES Module + Vite，无框架。桌面端 Electron 31，移动端 Capacitor 7（WebView 套壳）。数据全部存 `localStorage`。

```bash
npm install
npm run dev           # 浏览器开发，热更新
npm run electron:dev  # Electron 窗口调试
```

> 如果终端里有 `ELECTRON_RUN_AS_NODE=1`（部分 IDE 注入），打包出来的 exe 会静默退出。构建前先 `unset ELECTRON_RUN_AS_NODE`。

## 目录结构

```
src/
  main.js          路由 / 顶栏 / 底栏 / 隐藏界面 / 跨日检查
  state.js         状态、存储、目标/子目标、金额分配、每日次数
  draw.js          8 档概率引擎（纯函数）
  themes.js        配色主题 + 立绘背景（分组）
  bg-colors.js     每张立绘自动提取的主题色（脚本生成，勿手改）
  appearance.js    主题 / 背景 / 粒子应用
  particles.js     canvas 粒子
  congrats.js      达成恭喜弹窗
  views/           首页、抽奖、记录、设置、目标编辑、背景显示方式
  styles/          base.css + themes.css
scripts/
  make-all-backgrounds.py  从 shu 生成背景图 + 主题色
  make-app-icon.py         生成 Windows / Android 应用图标
  build-win.ps1            Windows 打包脚本
  shot-readme.cjs          README 配图（CDP 2x 截图）
installer/                 Inno Setup + NSIS 脚本
android/                   Capacitor Android 工程
```

## 抽奖规则

每天 0 点，按设置的范围生成 8 档奖金：

- 金额在 `[最低, 最高]` 之间按几何级数分布（默认 1、2、3.5、7、14、27、52、100 元）
- 基础概率约 20% → 4% 递减，另有 10%~30% 的「谢谢参与」
- 目标进度越高，后 4 档概率按进度再降
- 同一个目标同一天结果固定（日期 + 目标 ID 播种），跨日刷新
- 中奖金额按子目标优先级分配：P1 先填满，再 P2，其余进大目标

## 立绘素材流水线

`scripts/make-all-backgrounds.py` 从本地 `C:\Users\risay\Desktop\shu` 读图：

- 统一裁成 720×1280，加高斯模糊垫底、人物置顶，输出 webp（quality 82）
- 按 `前缀-序号.webp` 命名，写到 `public/backgrounds/`
- 同时提取每张图的主色，写入 `src/bg-colors.js`
- 支持向下扫一层子目录（画师作品子文件夹）
- 已存在的 webp 不重复压缩，只补算主色

新增一组：在脚本 `GROUPS` 里加 `(显示名, 前缀, 源目录, None)`，跑完再改 `src/themes.js` 的 `PHOTO_GROUPS` 加 `{ prefix, label, count }`。

Python 依赖 Pillow；本项目机器上用 `C:\Users\risay\AppData\Local\Programs\Python\Python310\python.exe`（PATH 里的 Python 没装 Pillow）。

## 打包 Windows

```bash
npm run dist:all
```

或分步（推荐，vite 清空 `dist` 时可能触发批量删除保护）：

```bash
rm -rf dist release/win-unpacked
npm run build
npx electron-builder --win --x64 --dir        # 生成 release/win-unpacked
& "D:\Inno Setup 7\ISCC.exe" installer\coinbox.iss   # 安装版
# 便携版：找 electron-builder 缓存里的 makensis 编译 installer\portable.nsi
```

## 打包 Android

```bash
export JAVA_HOME="C:/Program Files/Java/jdk-20"
export ANDROID_HOME="C:/Program Files (x86)/Android/android-sdk"
npm run android:sync
cd android && ./gradlew assembleDebug
```

产物在 `android/app/build/outputs/apk/debug/app-debug.apk`。

- minSdk 22（Android 5.1），targetSdk 35，锁定竖屏
- SDK 装在 `Program Files` 下是只读的，`android-34` 装不上，工程统一用 `android-35` + `build-tools 36` 编译（`android/build.gradle` 里强制子模块用 36）
- APK 内没有原生库（纯 Java + WebView），所以 WSA / 模拟器都能直接装

### WSA 上装不上

1. 打开「适用于 Android 的 Windows 子系统设置 → 开发人员模式」
2. `adb connect 127.0.0.1:58526`
3. `adb install -r release/CoinBox-1.0.0-Android.apk`

开了开发人员模式仍被拒，重启一次 WSA 再连。

## 已实现的几个坑（改代码前值得看一眼）

- 主题缩略图的内联样式在 HTML 属性里，`url("…")` 的双引号会截断 `style="…"`，必须写 `&quot;`
- 礼盒蝴蝶结用 `rotate` 模拟缎带，绕右端旋转时正角度是上扬、负角度是下垂
- 背景显示方式靠 `fit-*` class 切 `background-size` / `filter`；`contain` 和 `tile` 需要一层 `#bgFill` 模糊垫底，否则会露黑边
- 只用了 Android 5.1 WebView 支持的属性，`clip-path` 之类不要用
