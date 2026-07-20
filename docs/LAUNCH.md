# "Who's That?" — Launch Copy

所有对外文案（英文）+ 每节附中文使用说明。链接已使用正式域名 `https://whosthatcast.com`（2026-07-21 更新：文案已同步集级剧透护盾、进度记忆等新功能）。

---

## 1. Reddit — 回复 r/SomebodyMakeThis 原帖（脸盲求助帖）

> **使用说明**：直接回复在原帖下（不要另开新帖）。发之前查一下楼主是否还活跃；如果帖子已归档无法评论，就给楼主发私信（chat），内容一样。这条是整个发布计划里最重要的一条——楼主的"感谢回复"就是最好的社交证明，后续其他帖子可以引用。

Hey — I saw this post a while back and it stuck with me. I ended up building it.

It's called "Who's That?" — you search any movie or TV show and get a wall of character cards: photo, character name, actor name, how many episodes they're in. So when someone shows up on screen and you're lost, you can check in a few seconds without reading a plot summary.

The part I spent the most time on is spoilers: for TV shows you can set "I've watched up to S3 E5" — down to the exact episode — and it hides every character who appears later. No accidental "oh, so THAT person becomes important." It also remembers where you left off, so next time you open a show it's already filtered.

It's free, no signup, no ads, works on your phone: https://whosthatcast.com

I don't have prosopagnosia myself, so I've mostly been guessing at what actually helps vs. what just looks nice. If you (or anyone else reading this) try it and something is confusing or missing, I'd genuinely love to hear it — you're the person I built this for.

---

## 2. Reddit — r/SideProject

> **使用说明**：新帖，选 text post。r/SideProject 对自我推广宽容，但最好在评论区积极回复每一条反馈。可以在正文末尾放链接，也可以在第一条评论补充技术细节。

**Title:**

I built a spoiler-free "who is this character?" guide because someone on Reddit asked for it — free, no signup

**Body:**

A while ago I saw a post on r/SomebodyMakeThis from someone with prosopagnosia (face blindness — about 2% of people have some form of it). They said they couldn't enjoy movies because they can't tell the characters apart, and every existing solution (IMDb, wikis, Googling) is a spoiler minefield.

That seemed like a real problem worth a few days, so I built "Who's That?":

- Search any movie or show → a wall of character cards (photo, character name, actor, episode count)
- For TV: set "I've watched up to S3 E5" — down to the exact episode — and everyone who appears later is hidden. That's the whole point — you can look someone up mid-episode without getting spoiled. It remembers your progress per show.
- Tap any actor → "where do I know them from?" — their other notable roles

And honestly, you don't need face blindness to want this. Anyone who's watched an ensemble show ("wait, is that the guy from episode 2?") has this problem.

Stack: Vite + React, TMDB API for the data, deployed on Vercel. Total budget so far: $0. Built the first working version in a few days, leaning heavily on AI for the boring parts.

Link: https://whosthatcast.com

It's free, no account, no ads. Would love feedback — especially on whether the spoiler shield actually feels trustworthy, because that's the feature everything else depends on.

---

## 3. Reddit — r/InternetIsBeautiful

> **使用说明**：这个版块只接受链接帖（link post），标题即卖点，正文/首评一段即可。规则严格：不能太营销、频率限制严（通常每人每月限发一次自己的站），发之前务必读当天的版规侧栏。

**Title:**

A spoiler-free character guide for any movie or TV show — tell it which season you're on, and it hides everyone who appears later

**First comment (one paragraph):**

Search any show, get a wall of character cards (photo, character name, actor, episode count), and expand any actor to see where else you know them from. The spoiler part is the reason it exists: someone with face blindness posted on Reddit that they couldn't look up "who is this character" anywhere without getting spoiled, so this lets you set how far you've watched and filters accordingly. Free, no signup, no ads — data comes from TMDB.

---

## 4. Reddit — r/Prosopagnosia

> **使用说明**：语气最需要小心的一帖。这是患者社区，不是流量渠道——把它当成"给核心用户交作业"。发帖前先潜水看几天社区语气；正文里不要出现任何增长类语言（launch、check it out、love to see your support 等）。之后所有评论都要认真回、慢慢回。

**Title:**

Someone here (or on r/SomebodyMakeThis) asked for a spoiler-safe way to keep track of characters — I built one, and I'd like your honest feedback

**Body:**

Hi everyone. I want to be upfront: I don't have prosopagnosia. A while back, someone posted asking for a tool to help them follow movies and TV, because looking up "wait, who is that?" always meant risking spoilers on IMDb or a wiki. That post is the only reason this exists.

What it does:

- Search a movie or show and see every character as a card: photo, character name, actor name, episode count — so you can match a face to a name quickly, mid-episode
- For TV shows, you set "I've watched up to season N, episode M" and characters who only appear later are hidden completely — it remembers where you are in each show
- You can expand an actor to see their other roles ("where do I know them from")

It's free, there's no signup, no ads, and it works on phones: https://whosthatcast.com

What I'd really like from this community, if you're willing: tell me where it falls short. I've been designing around my *guess* of what's useful — for example, are photos alone enough, or would things like "distinctive features" descriptions (hair, glasses, voice) help more? Is anything about the layout hard to use? I'll read every reply, and I'm happy to build what's actually needed rather than what I assumed.

Thanks — and thanks to whoever wrote that original post.

---

## 5. Hacker News — Show HN

> **使用说明**：用链接直接提交（URL 指向站点，不是博客文章），提交后**立刻**把 first comment 贴在自己帖子下。HN 忌讳营销词，技术细节和诚实的局限性反而加分。发布后 1–2 小时内守在评论区。

**Title:**

Show HN: Who's That? – A spoiler-free character guide for movies and TV

**First comment:**

Hi HN. This started with a Reddit post from someone with prosopagnosia (face blindness) who said they couldn't enjoy TV because they can't tell characters apart, and every way of looking someone up — IMDb, fan wikis, Google — is full of spoilers. That seemed like a well-defined problem, so I built this.

What it does: search any movie or show, get a grid of character cards (photo, character name, actor, episode count). For TV shows you set "I've watched up to S3 E5" — down to the exact episode — and it hides any character who first appears after that point. It remembers your progress per show. You can also expand an actor to see their other notable work, and each character has a stable "who plays X in Y" page.

How it works:

- Vite + React SPA, data from the TMDB API. Season-level filtering uses per-season aggregate_credits; episode-level filtering merges per-episode credits (including guest stars) for the partial season, so a character who debuts in E6 never leaks when you're on E5
- Deployed on Vercel; a small serverless function injects per-page meta tags/OG/JSON-LD into the SPA shell so title, per-season, and "who plays X in Y" pages are indexable and unfurl properly
- The spoiler shield is intentionally conservative: if I can't determine when a character first appears, they stay hidden rather than risk leaking

Honest limitations: it's only as good as TMDB's data, which is great for popular shows and spottier for older or niche ones. Guest characters with sparse credits can be mislabeled or missing. And a character's *photo* is whatever TMDB serves, which occasionally reflects a later-season look.

Free, no signup, no ads, no tracking beyond basic analytics. I'd appreciate feedback on edge cases in the spoiler logic — that's the part that has to be trustworthy or the whole thing is pointless.

---

## 6. Product Hunt

> **使用说明**：PH 需要 gallery 图（建议 3–5 张，按下面的 caption 顺序做截图）。发布当天太平洋时间 00:01 上线最有利。Maker comment 在上线后立即发。tagline 保持 60 字符以内。

**Name:**

Who's That?

**Tagline** (54 chars):

Spoiler-free character guides for any movie or show

**Short description:**

Search any movie or TV show and see every character at a glance — photo, name, actor, and where else you know them from. Watching a series? Tell it exactly where you are — down to the episode — and it hides everyone who appears later, and remembers your progress. Free, no signup, works as an app (PWA), in English and Chinese. Built for anyone who's ever asked "wait, who is that again?" — including the ~2% of people with face blindness.

**First comment (maker):**

Hey Product Hunt 👋

"Who's That?" exists because of a single Reddit post: someone with prosopagnosia (face blindness) asked for a way to follow movies and shows without spoiling themselves, because they can't tell characters apart and looking anyone up on IMDb or a wiki is a spoiler minefield.

So the core feature is the spoiler shield: pick "I've watched up to S3 E5" — down to the exact episode — and every character who appears later is hidden. It remembers your progress per show. Beyond that, you get a card wall for any title (photo, character, actor, episode count) and a "where do I know them from?" expansion for every actor.

It turned out the audience is much bigger than face-blind viewers — basically anyone watching an ensemble show with a big cast.

It's free, no account, no ads. Built solo with Vite/React on top of TMDB data. I'd love to hear what's missing — especially from anyone who watches with subtitles, has trouble with faces, or juggles three shows at once like I do.

**Gallery captions (3):**

1. Every character in one glance — photo, name, actor, and episode count for any movie or show.
2. The spoiler shield: say how far you've watched, and characters from later seasons stay hidden.
3. "Where do I know them from?" — expand any actor to see their other roles instantly.

---

## 7. X/Twitter 线程（4–5 条）

> **使用说明**：第一条是 hook，链接放在第 4 条（首条带外链会被限流）。可以给第 1 条配一张产品截图、第 2 条配 spoiler shield 的动图。发完后把线程链接回贴到各 Reddit 帖的评论里没有必要，反过来可以。

**Tweet 1 (hook):**

Someone on Reddit said they can't enjoy movies because they have face blindness — they literally can't tell the characters apart. And every way to look up "who is that?" is full of spoilers.

So I built the tool they asked for.

**Tweet 2:**

It's called "Who's That?"

Search any movie or show → every character as a card: photo, name, actor, episode count.

Mid-episode "wait, who is this??" → answered in 5 seconds, no plot summaries, no wikis.

**Tweet 3:**

The key feature: a spoiler shield.

Watching a series? Set "I've watched up to S3 E5" — down to the exact episode — and every character who shows up later is hidden. You can browse the entire cast without a single spoiler.

**Tweet 4:**

Also: tap any actor to see where else you know them from. That "is that the guy from...?" itch, scratched.

Free. No signup. No ads. Works on your phone.

https://whosthatcast.com

**Tweet 5:**

~2% of people have some form of face blindness, but honestly everyone who watches ensemble shows has this problem.

Built solo, $0 budget, a few days with Vite + React + TMDB. Feedback very welcome 🙏

---

## 8. 发布节奏建议（中文）

### 发布顺序与间隔

1. **Day 0：回复 r/SomebodyMakeThis 原帖**（第 1 节）。这是道义上的第一步，也是最好的验证——楼主的正面回复以后处处能用。同一天可以顺手发 r/Prosopagnosia（第 4 节），两个都是"服务用户"而非"推广"，不冲突。
2. **Day 2–3：r/SideProject**（第 2 节）。低风险社区，用来收集第一轮陌生人反馈、修 bug。
3. **Day 5–7：r/InternetIsBeautiful**（第 3 节）。此时产品已经过两轮反馈打磨。这个版块量大，是 Reddit 端的主攻。
4. **Day 7–10：Show HN**（第 5 节）。等站点稳定、TMDB 数据边缘情况处理过再上，HN 用户会立刻去搜冷门剧试图搞挂它。
5. **Day 14 左右：Product Hunt**（第 6 节）。放最后，因为 PH 需要准备物料（图、动图），且前面积累的反馈可以写进 maker comment。
6. **Twitter 线程**：不占独立档期，配合 HN 或 PH 当天发即可。

**核心原则：不要同一天全平台铺开。** 一是每个平台的评论都需要你实时守着回复；二是如果产品有问题，分散发布让你有机会在下一站之前修掉；三是同天多平台刷屏容易被识别为营销行为。

### 最佳发布时间（美国时区）

- **Reddit**：美东周一至周四早 8–10 点（= 北京时间晚 20–22 点，冬令时 21–23 点）最好，能吃到美国全天流量。周五下午和周末效果差。
- **Hacker News**：美东工作日早 8–11 点。避开重大科技新闻日。
- **Product Hunt**：太平洋时间 00:01（= 北京时间下午 15–16 点）准时上线，争取完整 24 小时投票窗口。
- **Twitter**：美东早 9–11 点或晚 19–21 点。

### 各 Subreddit 规则要点（发前务必再读一遍当时版规）

- **9:1 原则**（Reddit 全站自我推广指引）：每 1 条推广自己产品的内容，应有约 9 条正常参与（评论、帮助他人）。发布前几周就开始在目标版块正常活跃，不要用小号空降。
- **r/SomebodyMakeThis**：回复原帖属于"完成请求"，是这个版块存在的意义，最安全。
- **r/SideProject**：对自荐友好，几乎无 karma 门槛，但要求真诚分享过程而非纯广告。
- **r/InternetIsBeautiful**：规则最严——通常要求账号有一定 karma 和账龄；**自己的网站每 30 天只能发一次**；标题不能标题党；不能带 referral/统计参数。被删了不要重发，先联系 mod。
- **r/Prosopagnosia**：小社区，无明确自荐规则，但正因如此更要克制。以提问和征求意见的姿态出现，绝不催促、绝不发第二次。
- 所有 Reddit 帖：**不要在多个版块粘贴同一段文字**，站方和用户都会识别 crosspost 式营销；每个版块的文案已按其文化单独写好，不要混用。

### 如何处理反馈

- **前 2 小时守在评论区**（尤其 HN 和 IIB），每条都回，速度本身就是好感。
- 负面反馈一律先认可再解释："You're right, X is rough — it's because Y. I'll fix it." HN 尤其吃这一套，防御性回复会被踩到底。
- 有人报 bug：修完后回到原评论说"fixed, thanks"，这是最便宜的口碑。
- 脸盲社区的功能建议单独记录，优先级最高——他们是产品存在的理由，也是故事的核心。
- 楼主（原求助者）如果回复了，征得同意后可以在后续帖子里引用（"the person who requested it said..."）。

### 不要做的事

- 不要用小号给自己点赞/顶帖——Reddit 和 HN 都有环卫算法，被抓直接 shadowban，站点域名可能被全站拉黑。
- 不要在 HN 里请朋友直接点链接投票（HN 会识别"直达投票"并降权，让朋友自己刷到再投）。
- 不要在标题里用 "revolutionary / game-changing / AI-powered" 之类的词——这些社区对营销语免疫且反感。
- 不要在 r/Prosopagnosia 谈增长、用户数、launch。
- 不要发布当天改动大功能——只修 bug，别引入新问题。
- 不要对差评争辩或删帖跑路；沉默消失比负评更伤。
- 域名迁移到 whosthatcast.com 之前，确认旧链接会 301 跳转，否则所有帖子里的链接会失效。
