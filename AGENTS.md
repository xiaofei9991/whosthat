# Who's That? — 项目记忆

无剧透影视角色速查工具。目标：英语市场 SEO 流量 → 广告/订阅变现。产品蓝图见 `docs/ROADMAP.md`，发布文案见 `docs/LAUNCH.md`。

## 线上环境

- **正式域名**: https://whosthatcast.com （Spaceship 购买，DNS 在 Cloudflare，apex 为主域名，www 301 到 apex）
- **托管**: Cloudflare Pages，项目名 `whosthat`
- **代码仓库**: https://github.com/xiaofei9991/whosthat （main 分支）
- **部署方式**: 连上 GitHub 后 push `main` 会自动构建；sitemap 热更新靠 Deploy Hook（`.github/workflows/daily-rebuild.yml` 每天 08:00 UTC POST）
- **环境变量（Cloudflare Pages 上配置）**: `TMDB_API_KEY`、`SITE_ORIGIN=https://whosthatcast.com`（Production + Preview）
- **分析**: Cloudflare Web Analytics（仪表盘开启，无需前端 SDK）
- **Google Search Console**: HTML meta tag 验证（token 在 `index.html`），只维护 `https://whosthatcast.com/` 一个资源，sitemap 提交 `/sitemap.xml` 和 `/sitemap-hot.xml`

## 技术架构

- **栈**: Vite 7 + React 19 + TypeScript（strict）+ Tailwind CSS 4（`@tailwindcss/vite` 插件，无 config 文件，主题在 `src/index.css` 的 `@theme`）。全仓 `.ts`/`.tsx`，不写 `.js`/`.jsx`/`.mjs`
- **路由**: 无路由库，History API 手写（`src/App.tsx` 的 `parseRoute`）。三种路由：
  - `/movie/:id/:slug`、`/tv/:id/:slug` — 角色卡片墙页
  - `/who-plays/:type/:mediaId/:personId/:slug` — pSEO 问题页
- **TMDB 代理**: 开发时走 `vite.config.ts` 的中间件，生产走 `functions/api/tmdb.ts` Pages Function。key 永不落前端。本地 key 在 `.env`（gitignored）；`wrangler pages dev` 用 `.dev.vars`
- **SEO**: `functions/_lib/page.ts` 拦截内容路由，用 `env.ASSETS.fetch('/index.html')` 注入 title/meta/OG/JSON-LD/爬虫可读 HTML（哪些路径走 Function 由 `public/_routes.json` 决定）。**改 `index.html` 结构时注意字符串替换逻辑**
- **slugify**: `src/slugify.ts` 与 `functions/_lib/page.ts`、`scripts/lib/sitemap*.ts` 内的副本必须保持同步（functions/ 与 scripts/ 不能 import src/）

## UI 约定

**完整设计契约见 `DESIGN.md`（颜色/字体/间距/组件/动效/禁忌），改 UI 前必读。** 以下是最容易踩的几条：

- 深色优先设计。浅色模式通过 `html.light` 重映射 zinc/amber CSS 变量实现（`src/index.css`），**不要**给组件加 `dark:` 变体
- 主题切换存 `localStorage.theme`（`system` | `light` | `dark`，缺省=跟随系统 `prefers-color-scheme`），`index.html` 内联脚本防闪烁（逻辑与 `src/theme.ts` 同步）；按钮三态循环 system → light → dark
- 图标用 Reicon 库（github.com/dqev/reicon）的内联 SVG，24×24 viewBox：logo/favicon 用 `face-scan-circle`，主题切换用 `computer`/`sun`/`moon`
- 入场动画类 `.animate-fade-up` / `.animate-pop-in`，fill-mode 必须是 `backwards`（`both`/`forwards` 会残留 transform，产生层叠上下文困住 z-index 并覆盖 hover transform——已踩过坑）
- 动画需支持 `prefers-reduced-motion`（脸盲用户群体对无障碍敏感）

## 产品红线

- **绝不剧透**：不展示剧情简介（TMDB overview 可能含剧透，`functions/_lib/page.ts` 刻意不用）；TV 的 spoiler shield 按季过滤角色
- TMDB 免费 key 仅限非商业使用，**上广告前必须先谈商用授权**（见 ROADMAP §4）
- 页脚必须保留 TMDB 署名（API 条款要求）

## V2 已上线功能（2026-07-20）

- **集级 spoiler shield**：整季走 `season/{n}/aggregate_credits`，零头集数逐集拉 `episode/{e}/credits`（cast + guest_stars）合并
- **进度记忆**：`src/progress.ts`，localStorage key `wt.progress`；剧集页自动恢复 shield，首页 "Your shows" 区块
- **OG 卡片**：`functions/api/og.ts`（`workers-og` + React.createElement，无 JSX）；改版式时注意 satori 只支持 flex 布局
- **PWA**：vite-plugin-pwa 配置在 `vite.config.ts`；图标改动后跑 `npx tsx scripts/generate-icons.ts` 重新生成 PNG。注意：本地沙箱构建会因 terser worker 被限制而失败，需完整权限运行 `npm run build`。**坑**：自定义 `workbox` 配置会覆盖 autoUpdate 的默认值，必须显式写 `skipWaiting: true, clientsClaim: true`，否则新部署的 SW 永远停在 waiting、老用户拿不到新版本
- **每季指南页**：`/tv/:id/season-:n/:slug`（SeasonPage 组件 + `functions/_lib/page.ts` 注入 TVSeason JSON-LD + sitemap 含季 URL）；剧集页有 "Season guides" 内链行
- **静态页**：/about、/faq、/privacy（客户端 `STATIC_PAGES` 常量渲染；服务端走 `functions/_lib/page.ts` 注入各自 canonical + FAQPage JSON-LD + 爬虫内容，FAQ 文案改动要同步 `STATIC_META`）；这些是 AdSense 审核的前提
- **首页 SEO 注入**：构建后置步骤 `scripts/inject-home-seo.ts` 往 dist/index.html 写入 canonical/OG/WebSite JSON-LD + 本周热门 18 条爬虫可见内链（HOME-HEAD/HOME-BODY 注释标记包裹）；page 函数用 index.html 做模板前会剥掉这些标记块。**坑**：本地网络偶发连不上 TMDB 时注入 0 条链接（构建不失败），Cloudflare 构建机上正常
- **面包屑**：剧集/分季/who-plays 页由 page 函数注入 BreadcrumbList JSON-LD
- **sitemap 自动放量**：构建时由 `scripts/write-sitemaps.ts` 写成静态 `dist/sitemap.xml`（避免 Cloudflare 免费 Workers 50 子请求上限）。按天数线性增长（RAMP_BASE 1000 起步，每天 +20，封顶 5000 约需 200 天，起点 2026-07-20），cap 按构建当天日期算。**约束**：URL 顺序必须保持「只往尾部追加」——所有会随 cap 增长的段必须放在列表最末尾（核心标题页 → 长尾标题页 → 头部 60 个候选的季/who-plays 页 → 第 61 个候选起每剧目一个尾部扩展块），改动后跑 `npx tsx scripts/test-sitemap.ts` 验证 `prefix stable: true`。**坑**：2026-08-12 曾因长尾标题页被夹在两个增长段中间导致前缀断裂（cap 越过 ~1317 后才暴露），以及一版「padding 补齐块长」的实验把 998 个空 `<loc>` 部署上线——不要再走 padding 路线。
- **sitemap 热门车道**：`/sitemap-hot.xml`（构建时写入）单独收录首播窗口片单（TMDB now_playing / upcoming / airing_today / 近 45 天首播的 on_the_air / discover 近 45 天首播——最后一条兜住一次性放出全季的 binge 剧，它们首播次日就从 airing_today/on_the_air 消失），每部含标题页 + 最新季 + who-plays；与主 sitemap 分离以免破坏前缀稳定。`public/_headers` 给热门车道 `s-maxage=3600`。每天 08:00 UTC 用 Deploy Hook 重建。上线后需在 GSC 额外提交 `sitemap-hot.xml`。冒烟：`npx tsx scripts/test-sitemap-hot.ts`
- **i18n（中英）**：`src/i18n.ts` 的 `t(key, vars)` + localStorage `wt.lang`（浏览器语言自动检测）。所有新增 UI 文案必须进字典（en+zh 双份），不要写死字符串；切换语言是整页 reload（让 TMDB 按新 `language` 参数重取）。静态页中文版在 `STATIC_PAGES_ZH`。SEO 注入（page 函数）仍是纯英文，与客户端 i18n 无关
- **分享/安装**：`ShareButton`（navigator.share，降级复制链接）用在剧集/季/who-plays 页；`InstallButton` 靠 beforeinstallprompt，仅在浏览器认为可安装时出现

## 常用命令

```bash
npm run dev          # 开发（需 .env 里有 TMDB_API_KEY）
npm run typecheck    # tsc --noEmit（strict）
npm run build        # typecheck + vite build + 首页 SEO + 两份 sitemap
npm run pages:dev    # 用 wrangler 预览 Pages Functions（需 .dev.vars）
```
