# Who's That? — 项目记忆

无剧透影视角色速查工具。目标：英语市场 SEO 流量 → 广告/订阅变现。产品蓝图见 `docs/ROADMAP.md`，发布文案见 `docs/LAUNCH.md`。

## 线上环境

- **正式域名**: https://whosthatcast.com （Spaceship 购买，DNS 已指向 Vercel，apex 为主域名，www 301 到 apex）
- **旧域名**: whosthat-app.vercel.app → 301 到正式域名（vercel.json redirects）
- **托管**: Vercel，项目名 `whosthat`，账号 xiaofei9991（GitHub 登录）
- **代码仓库**: https://github.com/xiaofei9991/whosthat （main 分支）
- **部署方式**: `git push origin main` 后运行 `npx vercel deploy --prod --yes`（Git 集成不会自动部署，需手动跑 CLI）
- **环境变量（Vercel 上已配置）**: `TMDB_API_KEY`、`SITE_ORIGIN=https://whosthatcast.com`
- **分析**: Vercel Web Analytics（`@vercel/analytics` 的 `inject()` 在 `src/main.jsx`）
- **Google Search Console**: HTML meta tag 验证（token 在 `index.html`），只维护 `https://whosthatcast.com/` 一个资源，sitemap 提交 `/sitemap.xml`

## 技术架构

- **栈**: Vite 7 + React 19 + Tailwind CSS 4（`@tailwindcss/vite` 插件，无 config 文件，主题在 `src/index.css` 的 `@theme`）
- **路由**: 无路由库，History API 手写（`src/App.jsx` 的 `parseRoute`）。三种路由：
  - `/movie/:id/:slug`、`/tv/:id/:slug` — 角色卡片墙页
  - `/who-plays/:type/:mediaId/:personId/:slug` — pSEO 问题页
- **TMDB 代理**: 开发时走 `vite.config.js` 的中间件，生产走 `api/tmdb.js` serverless。key 永不落前端。本地 key 在 `.env`（gitignored）
- **SEO**: `api/page.js` 拦截路由请求，读 `dist/index.html` 注入 title/meta/OG/JSON-LD/爬虫可读 HTML（rewrite 规则在 `vercel.json`）；`api/sitemap.js` 动态生成 sitemap。**改 `index.html` 结构时注意 `api/page.js` 的字符串替换逻辑**
- **slugify**: `src/slugify.js` 与 `api/page.js` 内的副本必须保持同步（api/ 不能 import src/）

## UI 约定

**完整设计契约见 `DESIGN.md`（颜色/字体/间距/组件/动效/禁忌），改 UI 前必读。** 以下是最容易踩的几条：

- 深色优先设计。浅色模式通过 `html.light` 重映射 zinc/amber CSS 变量实现（`src/index.css`），**不要**给组件加 `dark:` 变体
- 主题切换存 `localStorage.theme`，`index.html` 内联脚本防闪烁
- 图标用 Reicon 库（github.com/dqev/reicon）的内联 SVG，24×24 viewBox：logo/favicon 用 `face-scan-circle`，主题切换用 `sun`/`moon`
- 入场动画类 `.animate-fade-up` / `.animate-pop-in`，fill-mode 必须是 `backwards`（`both`/`forwards` 会残留 transform，产生层叠上下文困住 z-index 并覆盖 hover transform——已踩过坑）
- 动画需支持 `prefers-reduced-motion`（脸盲用户群体对无障碍敏感）

## 产品红线

- **绝不剧透**：不展示剧情简介（TMDB overview 可能含剧透，`api/page.js` 刻意不用）；TV 的 spoiler shield 按季过滤角色
- TMDB 免费 key 仅限非商业使用，**上广告前必须先谈商用授权**（见 ROADMAP §4）
- 页脚必须保留 TMDB 署名（API 条款要求）

## V2 已上线功能（2026-07-20）

- **集级 spoiler shield**：整季走 `season/{n}/aggregate_credits`，零头集数逐集拉 `episode/{e}/credits`（cast + guest_stars）合并
- **进度记忆**：`src/progress.js`，localStorage key `wt.progress`；剧集页自动恢复 shield，首页 "Your shows" 区块
- **OG 卡片**：`api/og.js`（edge runtime + @vercel/og，React.createElement 写法，无 JSX）；改版式时注意 satori 只支持 flex 布局
- **PWA**：vite-plugin-pwa 配置在 `vite.config.js`；图标改动后跑 `node scripts/generate-icons.mjs` 重新生成 PNG。注意：本地沙箱构建会因 terser worker 被限制而失败，需完整权限运行 `npm run build`。**坑**：自定义 `workbox` 配置会覆盖 autoUpdate 的默认值，必须显式写 `skipWaiting: true, clientsClaim: true`，否则新部署的 SW 永远停在 waiting、老用户拿不到新版本
- **每季指南页**：`/tv/:id/season-:n/:slug`（SeasonPage 组件 + api/page.js `kind=season` 注入 TVSeason JSON-LD + sitemap 含季 URL）；剧集页有 "Season guides" 内链行
- **静态页**：/about、/faq、/privacy（`STATIC_PAGES` 常量渲染，vercel.json 有对应 rewrite 到 index.html）；这些是 AdSense 审核的前提
- **sitemap 自动放量**：`api/sitemap.js` 按天数线性增长（RAMP\_BASE 1000 起步，每天 +60，封顶 5000，起点 2026-07-20），无需人工干预。**约束**：URL 顺序必须保持「只往尾部追加」（核心标题页 → 头部 60 个剧目的季/who-plays 页 → 尾部核心剧目扩展 → 长尾标题页 → 长尾扩展），改动后跑 `node scripts/test-sitemap.mjs` 验证 `prefix stable: true`。函数 maxDuration 已在 vercel.json 提到 60s（全量时要拉 400+ 个 credits）
- **i18n（中英）**：`src/i18n.js` 的 `t(key, vars)` + localStorage `wt.lang`（浏览器语言自动检测）。所有新增 UI 文案必须进字典（en+zh 双份），不要写死字符串；切换语言是整页 reload（让 TMDB 按新 `language` 参数重取）。静态页中文版在 `STATIC_PAGES_ZH`。SEO 注入（api/page.js）仍是纯英文，与客户端 i18n 无关
- **分享/安装**：`ShareButton`（navigator.share，降级复制链接）用在剧集/季/who-plays 页；`InstallButton` 靠 beforeinstallprompt，仅在浏览器认为可安装时出现

## 常用命令

```bash
npm run dev        # 开发（需 .env 里有 TMDB_API_KEY）
npm run build      # 构建（部署前先本地跑一遍确认）
npx vercel deploy --prod --yes   # 生产部署
```
