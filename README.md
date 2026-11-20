# 新站说明 · Yike Wu

单页静态个人主页：深色科技感为主、可一键切浅色，中英双语，项目卡片可展开详情，简历可直接下载，无任何第三方依赖、无追踪脚本。

```
index.html            ← 所有文案和结构（中英并列）
404.html              ← 旧链接（/publications/、/zh/ 等）自动跳到对应区块
robots.txt / .nojekyll
assets/css/main.css   ← 设计系统：颜色、字号、间距、组件
assets/css/fonts.css  ← 自托管字体 @font-face（自动生成）
assets/fonts/*.woff2  ← Space Grotesk + Inter，共 ~174KB
assets/js/main.js     ← 交互：主题/语言/筛选/弹窗/BibTeX/⌘K/点云背景
assets/img/avatar.webp         ← 圆形头像用的抠图人像（透明背景）
assets/img/profile.webp        ← 完整上半身抠图（头像的源图，也是重新生成头像的输入）
assets/img/og.jpg              ← 分享卡片图（1200×630）
assets/img/iros2026*.webp      ← 论文插图（弹窗里全宽展示）
assets/cv.pdf                  ← 简历（首页与联系区都有下载按钮）
preview/*.png         ← 桌面/手机/浅色/中文效果截图（只是给你看的，不用上线）
tools/*.py            ← 自检与素材脚本（不用上线）
```

## 怎么改内容

| 想改什么 | 改哪里 |
| --- | --- |
| 自我介绍、News、经历、联系方式 | `index.html`，搜对应文字。**中英文各一份**，成对修改 |
| 项目卡片（标题/描述/分类） | `index.html` 里的 `<article class="card" data-project="...">` |
| 项目弹窗里的详细内容、配图 | `assets/js/main.js` 顶部的 `PROJECTS` 对象 |
| 论文条目 / BibTeX | `index.html` 的 `<li class="pub">` + `assets/js/main.js` 的 `BIB` |
| 主色、圆角、间距、字号 | `assets/css/main.css` 开头的 `:root` 变量（`--accent`、`--pad`、`--radius`） |
| 简历 | 直接替换 `assets/cv.pdf`（**文件名保持 cv.pdf**，按钮不用改） |
| 照片 | 替换 `assets/img/profile.webp`；换图后记得同步 `index.html` 里 `<img>` 的 `width`/`height` |

双语机制：每个要翻译的元素都写成

```html
<span lang="en">…</span><span lang="zh">…</span>
```

`html[data-lang]` 决定显示哪一个，切换语言不需要重新渲染页面。

## 照片是怎么处理的

原图是纯白背景的棚照，脚本从四条边做「白色泛洪」把背景判掉，再把边缘收 1px、羽化、做白边反预乘，导出带透明通道的 WebP；第二个脚本把它放进 480×480 的透明方框（胸口贴底、头顶留 8% 空间），生成圆形头像用的 avatar.webp 和分享图 `og.jpg`。

重跑（换照片后用）：

```powershell
# 改 tools/cutout-portrait.py 里的 SRC 路径，然后
python tools/cutout-portrait.py   # 抠背景 → profile.webp
python tools/make-avatar.py      # 裁成圆形头像 → avatar.webp + og.jpg
```

## 本地预览

```powershell
python -m http.server 8000
# 打开 http://127.0.0.1:8000
```

（直接双击 `index.html` 用 `file://` 打开会因为字体 CORS 掉字重。）

## 自检脚本（可选）

```powershell
python tools/fetch-fonts.py     # 重新下载字体
python tools/build-images.py    # 重新压缩论文插图（需要 wyk-site/ 里的原图）
python tools/qa.py              # 6 种视口布局检查 + 14 张截图（需先起 :8765 服务）
python tools/smoke.py           # 主题/语言/筛选/弹窗/⌘K/滚动 的交互冒烟测试
python tools/check-html.py      # 标签闭合、重复 id、alt 缺失
python tools/check-i18n.py      # 中英文是否成对
python tools/make-avatar.py     # 头像 / 分享图
```

`qa.py` 和 `smoke.py` 需要本机 Chrome，且静态服务跑在 `http://127.0.0.1:8765`。它们会自动把
`tools/check-page.html`、`tools/frame-host.html` 临时拷到站点根目录，跑完自动删掉。

## 目前验证过的

- 1440 / 1280 / 820 / 390 / 360 五种宽度：无横向溢出、无文字截断、卡片等宽（525px）、封面比例精确 16:9
- 深/浅 × 中/英 四组合对比度：正文 17.2:1，次要文字 5.0:1，主色 13.6:1（浅色主题 4.6:1），全部过 AA
- 无 JS 运行时错误；主题、语言、项目筛选（5→3/2）、弹窗、⌘K 面板（11 项）、滚动进度、导航高亮均通过
- 无 JS 时内容仍然可见（`<noscript>` 兜底）；支持 `prefers-reduced-motion`；首屏无第三方请求
