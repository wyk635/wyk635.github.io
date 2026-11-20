# 新站说明 · Yike Wu

单页主页 + 5 个项目详情页：深色科技感为主、可一键切浅色，中英双语，项目卡片点开是完整案例页（动机 / 做了什么 / 效果 + 图 + 视频），简历可直接下载。无第三方依赖、无追踪脚本。

```
index.html              ← 首页：首屏 / 关于 / 项目卡片 / 论文 / 经历 / 联系
404.html                ← 旧链接（/publications/、/zh/ 等）自动跳到对应区块
robots.txt / .nojekyll
projects/
  refinenet.html            ← RefineNet（IROS 2026）
  active-reconstruction.html← 主动重建
  agentic-vln.html          ← Agentic VLN（自变量机器人）
  docking.html              ← 多车接驳与换电（美团）
  aerial-search.html        ← 空中多目标搜索（RA-L 2026）
assets/
  css/main.css          ← 设计系统：颜色、字号、间距、组件（含项目页样式）
  css/fonts.css         ← 自托管字体 @font-face
  fonts/*.woff2         ← Space Grotesk + Inter，共 ~174KB
  js/main.js            ← 主题 / 语言 / 筛选 / BibTeX / ⌘K / 点云背景
  img/avatar.webp       ← 圆形头像用的抠图人像（480×480，透明底）
  img/profile.webp      ← 完整上半身抠图（头像的源图）
  img/og.jpg            ← 分享卡片图（1200×630）
  img/projects/*.webp   ← 项目页插图（来自 PPT 里的高清截图）
  video/*.mp4 + *.jpg   ← 9 段演示视频 + 封面（点击才加载）
  cv.pdf                ← 简历
preview/*.png           ← 效果截图（不用上线）
tools/*.py              ← 素材与自检脚本（不用上线）
```

## 怎么改内容

| 想改什么 | 改哪里 |
| --- | --- |
| 自我介绍、News、经历、联系方式 | `index.html`，搜对应文字。**中英文各一份**，成对修改 |
| 首页项目卡片（标题/描述/分类） | `index.html` 里的 `<a class="card" href="projects/...">` |
| 项目详情页（正文、图片、视频） | `projects/<slug>.html`，或改 `tools/build-projects.py` 重新生成 |
| 论文条目 / BibTeX | `index.html` 的 `<li class="pub">` + `assets/js/main.js` 的 `BIB` |
| 主色、圆角、间距、字号 | `assets/css/main.css` 开头的 `:root` 变量 |
| 简历 | 直接替换 `assets/cv.pdf`（**文件名保持 cv.pdf**） |
| 头像 | 替换 `assets/img/avatar.webp`（480×480 透明底方图） |

双语机制：每个要翻译的元素都写成

```html
<span lang="en">…</span><span lang="zh">…</span>
```

`html[data-lang]` 决定显示哪一个，切换语言不需要重新渲染页面。

## 项目详情页是生成的

5 个 `projects/*.html` 由 `tools/build-projects.py` 里的数据渲染出来（共用页头、页脚、上一页/下一页）。

- **想改文案/换图**：直接改生成的 HTML 也行，但如果之后又跑一次生成脚本，手改会被覆盖。
- **想长期维护**：改 `tools/build-projects.py` 里的 `PROJECTS` 列表，然后 `python tools/build-projects.py`。
- 新增一个项目：在列表里加一项（`slug` / `kicker` / `title` / `lede` / `sections`），重新生成，再在 `index.html` 加一张卡片指过去。

每页的三段结构是固定的：`01 动机` → `02 做了什么` → `03 效果`，每段可以挂 `figures`（图）和 `videos`（视频）。

## 素材是怎么来的

全部来自 `个人介绍.pptx`：

```powershell
python tools/extract-media.py       # 把 PPT 里的视频抽到 _media/（做视频时才需要）
python tools/build-project-images.py# 截图 → assets/img/projects/*.webp（直接读 PPTX，透明区域压到白底）
python tools/build-video.py         # 视频 → assets/video/*.mp4（720p 左右）
python tools/shrink-video.py        # 两段长视频再压到 480p
python tools/cutout-portrait.py     # 白底人像 → 透明背景 profile.webp
python tools/make-avatar.py         # → 圆形头像 avatar.webp + og.jpg
```

视频统一用 `preload="none"` + 封面图：不点播放就一个字节都不下载，移动端友好。

## 本地预览

```powershell
python -m http.server 8000
# 打开 http://127.0.0.1:8000
```

（直接双击 `index.html` 用 `file://` 打开会因为字体 CORS 掉字重。）

## 自检脚本

```powershell
python tools/qa.py              # 6 视口 + 3 个项目页布局检查 + 14 张截图（需先起 :8765 服务）
python tools/smoke.py           # 主题/语言/筛选/⌘K/滚动 的交互冒烟测试
python tools/check-html.py      # 所有页面的标签闭合、重复 id、alt、坏链接、中英配对
python tools/check-i18n.py      # 中英文是否成对（逐页）
```

`qa.py` / `smoke.py` / `check-i18n.py` 需要本机 Chrome，且静态服务跑在 `http://127.0.0.1:8765`；脚本会临时把辅助页面拷进站点根目录，跑完自动删掉。

## 目前验证过的

- 首页 5 档视口 + 3 个项目页：无横向溢出、无文字截断、卡片等宽、封面 16:9
- 深/浅 × 中/英 对比度：正文 17.2:1、次要文字 5.0:1、主色 13.6:1（浅色 4.6:1），全部过 AA
- 6 个页面标签闭合、无重复 id、图片均有 alt、本地资源无死链、中英文 0 处漏译
- 交互冒烟：主题、语言、筛选（5→3/2）、5 张卡片均指向存在的项目页、⌘K（11 项）、滚动高亮，0 运行时错误
