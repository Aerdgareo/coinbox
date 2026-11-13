# 立绘背景素材（未包含在仓库中）

`public/backgrounds/` 下的图片来自作者的私人收藏，**角色与画师版权归原权利人所有，因此不随本仓库分发**。
仓库里所有与立绘相关的代码（主题分组、配色提取、显示方式）都可正常工作，只是缺少图片文件。

## 想自己补上

把图片放进本目录，文件名与 `src/themes.js` 里的主题 id 对应即可：

```
public/backgrounds/congyu-01.webp     → 主题 photo-congyu-01
public/backgrounds/miku-01.webp       → 主题 photo-miku-01
...
```

每张图的主色记录在 `src/bg-colors.js`，新增图片后需要同步补一条（或把 `accent` 写在主题里）。

## 批量生成

仓库提供了脚本，从素材源目录批量裁切、压缩并提取主色：

```bash
python scripts/make-all-backgrounds.py
```

脚本里的素材源路径、分组名需要按你自己的目录结构调整。

## 法规提示

二次创作图片的传播权通常仍归原画师/版权方。请仅在个人使用范围内处理，不要随公开仓库分发，也不要用于商业用途。
