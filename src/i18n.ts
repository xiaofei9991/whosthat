// Minimal client-side i18n. Language is stored locally; switching reloads the
// page so every TMDB request refetches with the new `language` param.

export type Lang = 'en' | 'zh'
export type MessageKey = keyof typeof STRINGS.en

const LANG_KEY = 'wt.lang'

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'zh' || v === 'en') return v
  } catch {
    /* private mode */
  }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    /* private mode */
  }
  window.location.reload()
}

export function tmdbLang(): 'zh-CN' | 'en-US' {
  return getLang() === 'zh' ? 'zh-CN' : 'en-US'
}

export function t(
  key: MessageKey,
  vars?: Record<string, string | number | null | undefined>,
): string {
  let s: string = STRINGS[getLang()][key] ?? STRINGS.en[key] ?? String(key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v ?? ''))
  return s
}

const STRINGS = {
  en: {
    tagline: 'Spoiler-free character guides for movies & TV',
    'hero.h1': '\u201cWait\u2026 who is that again?\u201d',
    'hero.sub':
      'Look up any movie or show and get a clean character guide — faces, names, and who plays them.',
    'hero.zero': 'Zero plot spoilers.',
    'search.ph': 'Search a movie or TV show…',
    'search.none': 'No results found.',
    tv: 'TV',
    movie: 'Movie',
    yourShows: 'Your shows',
    trending: 'Trending this week',
    'prog.whole': 'Whole show',
    'prog.season': 'Up to season {n}',
    'prog.se': 'Up to S{s} · E{e}',
    remove: 'Remove',
    'blurb.h2': 'A spoiler-free cast & character guide for any movie or TV show',
    'blurb.p1':
      'Ever paused a show to ask \u201cwait, who is that again?\u201d Googling it is a minefield: search results, IMDb cast lists, and wiki pages happily reveal deaths, betrayals, and late-season arrivals. Who\u2019s That? shows you every character\u2019s face, name, and the actor who plays them — and nothing else. No recaps, no plot summaries, no accidental spoilers.',
    'blurb.p2':
      'Watching a TV series? Use the spoiler shield to tell us which season you\u2019re on, and we\u2019ll only show characters who have already appeared — so a surprise season-three arrival never gets revealed early. You can also tap any actor to see where you know them from, spoiler-free.',
    'blurb.p3':
      'Whether you lose track of large ensemble casts, mix up look-alike actors, or live with face blindness (prosopagnosia), this guide keeps every face and name one glance away, for any movie or show on any streaming service.',
    'blurb.p4':
      'Who\u2019s That? is a small independent project, and it gets better with every report of a missing face or a confusing moment. Found something wrong, missing, or awkward?',
    'blurb.p4link': 'Tell us on GitHub \u2192',
    back: '\u2190 Back to search',
    'meta.movie': 'Movie · spoiler-free character guide',
    'meta.tv1': 'TV series · 1 season · spoiler-free character guide',
    'meta.tvN': 'TV series · {n} seasons · spoiler-free character guide',
    'shield.badge': 'Spoiler shield',
    'shield.watched': 'I\u2019ve watched up to',
    'shield.whole': 'the whole show',
    'shield.season': 'season {n}',
    'shield.wholeSeason': 'whole season',
    'shield.episode': 'episode {n}',
    'shield.note': '— only characters who\u2019ve already appeared are shown.',
    'shield.saved': '(progress saved)',
    seasonGuides: 'Season guides:',
    seasonsLabel: 'Seasons:',
    'loading.chars': 'Loading characters…',
    'loading.filter': 'Filtering out spoilers…',
    'loading.answer': 'Loading answer…',
    episodes: '{n} episodes',
    'card.know': 'Where do I know them from?',
    'card.hide': 'Hide',
    'card.loading': 'Loading…',
    'card.none': 'Nothing notable found.',
    'season.label': 'Season {n}',
    'season.sub': 'Characters & cast of season {n} only — nothing from later seasons.',
    'season.all': '{name} — all seasons',
    'season.empty': 'No cast data for this season yet.',
    'wp.h1': 'Who plays {c} in {t}?',
    'wp.playedBy': ' is played by ',
    'wp.born': 'Born {d}',
    'wp.age': 'age {n}',
    'wp.diedAt': 'died at {n}',
    'wp.from': 'From {p}',
    'wp.appears1': 'Appears in 1 episode',
    'wp.appearsN': 'Appears in {n} episodes',
    'wp.spoilerNote': 'Spoiler-free: no plot details about {t}, just the face and the name.',
    'wp.elsewhere': 'Where else have you seen {p}?',
    'wp.as': 'as {c}',
    'wp.others': 'Other characters in {t}',
    'wp.back': '{t} cast & characters',
    'wp.notFound': 'We couldn\u2019t find {p} in the cast of {t}.',
    'wp.seeFull': 'See the full cast \u2192',
    'footer.about': 'About',
    'footer.faq': 'FAQ',
    'footer.privacy': 'Privacy',
    'footer.feedback': 'Feedback',
    'footer.line':
      'No plot details, ever. Data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.',
    share: 'Share',
    'share.copied': 'Link copied!',
    install: 'Install app',
    'title.default': "Who's That? — Spoiler-Free Character Guide for Movies & TV",
    'title.title': "{name}{y} Cast & Character Guide — No Spoilers | Who's That?",
    'title.season': "{name} Season {n} Characters & Cast — No Spoilers | Who's That?",
    'title.wp': "Who Plays {c} in {t}? — {p} | Who's That?",
    'recentSearches': 'Recent searches',
    continue: 'Continue',
    'theme.toLight': 'Switch to light mode',
    'theme.toDark': 'Switch to dark mode',
    'theme.toSystem': 'Use system appearance',
  },
  zh: {
    tagline: '影视无剧透角色速查',
    'hero.h1': '\u201c等等……这个人是谁来着？\u201d',
    'hero.sub': '搜索任何电影或剧集，获得一份干净的角色对照表——脸、名字、扮演者。',
    'hero.zero': '绝不剧透。',
    'search.ph': '搜索电影或剧集…',
    'search.none': '没有找到结果。',
    tv: '剧集',
    movie: '电影',
    yourShows: '我在追的',
    trending: '本周热门',
    'prog.whole': '已看完全剧',
    'prog.season': '看到第 {n} 季',
    'prog.se': '看到第 {s} 季第 {e} 集',
    remove: '移除',
    'blurb.h2': '任何影视剧的无剧透角色演员对照表',
    'blurb.p1':
      '看剧时是否常常暂停下来问\u201c这人是谁来着\u201d？直接去搜索简直是踩雷：搜索结果、IMDb 演员表和维基页面会毫不留情地剧透角色的死亡、背叛和后期登场。Who\u2019s That? 只告诉你每个角色的脸、名字和扮演者——除之外什么都没有。',
    'blurb.p2':
      '在追剧？用\u201c剧透护盾\u201d告诉我们你看到第几季，我们只显示已出场的角色——第三季才登场的角色绝不会提前暴露。点任何演员还能看 TA 的其他代表作，同样无剧透。',
    'blurb.p3':
      '不管你是记不住群像剧的大量角色、分不清长相相似的演员，还是有脸盲症（prosopagnosia），这份指南让每张脸和名字触手可及，覆盖任何平台的任何影视剧。',
    'blurb.p4':
      'Who\u2019s That? 是一个很小的独立项目，每一条\u201c少了张脸\u201d\u201c这里没看懂\u201d的反馈都会让它变好。发现哪里不对、缺失或者别扭？',
    'blurb.p4link': '来 GitHub 告诉我们 \u2192',
    back: '\u2190 返回搜索',
    'meta.movie': '电影 · 无剧透角色指南',
    'meta.tv1': '剧集 · 共 1 季 · 无剧透角色指南',
    'meta.tvN': '剧集 · 共 {n} 季 · 无剧透角色指南',
    'shield.badge': '剧透护盾',
    'shield.watched': '我看到了',
    'shield.whole': '全剧',
    'shield.season': '第 {n} 季',
    'shield.wholeSeason': '整季',
    'shield.episode': '第 {n} 集',
    'shield.note': '——只显示已出场的角色。',
    'shield.saved': '（进度已保存）',
    seasonGuides: '分季指南：',
    seasonsLabel: '各季：',
    'loading.chars': '正在加载角色…',
    'loading.filter': '正在过滤剧透…',
    'loading.answer': '正在加载答案…',
    episodes: '出演 {n} 集',
    'card.know': '我在哪见过 TA？',
    'card.hide': '收起',
    'card.loading': '加载中…',
    'card.none': '没有找到代表作。',
    'season.label': '第 {n} 季',
    'season.sub': '仅第 {n} 季的角色与演员——不含后续季的内容。',
    'season.all': '{name}——全部季',
    'season.empty': '本季暂无演员数据。',
    'wp.h1': '《{t}》里的 {c} 是谁演的？',
    'wp.playedBy': ' 的扮演者是 ',
    'wp.born': '出生于 {d}',
    'wp.age': '{n} 岁',
    'wp.diedAt': '享年 {n} 岁',
    'wp.from': '来自 {p}',
    'wp.appears1': '出演 1 集',
    'wp.appearsN': '出演 {n} 集',
    'wp.spoilerNote': '无剧透：不含《{t}》的任何剧情信息，只有脸和名字。',
    'wp.elsewhere': '你还在哪些作品里见过 {p}？',
    'wp.as': '饰 {c}',
    'wp.others': '《{t}》的其他角色',
    'wp.back': '《{t}》角色列表',
    'wp.notFound': '在《{t}》的演员表里没有找到 {p}。',
    'wp.seeFull': '查看完整演员表 \u2192',
    'footer.about': '关于',
    'footer.faq': '常见问题',
    'footer.privacy': '隐私',
    'footer.feedback': '反馈',
    'footer.line':
      '永不剧透。数据来自 TMDB。本产品使用 TMDB API，但未经 TMDB 认可或认证。',
    share: '分享',
    'share.copied': '链接已复制',
    install: '安装应用',
    'title.default': "Who's That? — 影视无剧透角色指南",
    'title.title': "{name}{y} 演员角色表 — 无剧透 | Who's That?",
    'title.season': "{name} 第 {n} 季角色演员表 — 无剧透 | Who's That?",
    'title.wp': "《{t}》{c} 的扮演者是谁？— {p} | Who's That?",
    'recentSearches': '最近搜索',
    continue: '继续看',
    'theme.toLight': '切换到浅色模式',
    'theme.toDark': '切换到深色模式',
    'theme.toSystem': '跟随系统外观',
  },
} as const

const _zhComplete: Record<MessageKey, string> = STRINGS.zh
void _zhComplete
