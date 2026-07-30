// Two locales, no framework: en + Traditional Chinese (zh-Hant).
// Static DOM text uses data-i18n / data-i18n-title attributes; dynamic
// strings use t()/tf(). Language switch persists and reloads.

const en: Record<string, string> = {
  rotation: 'rotation',
  reference: 'reference',
  grid: 'grid',
  edgesOnly: 'edges only',
  edgesTitle: 'hide loose interior pieces while you build the frame',
  sound: 'sound',
  scatter: 'scatter',
  recut: 're-cut',
  games: 'puzzles',
  solvedBanner: 'SOLVED 🎉',
  libTitle: 'Puzzles',
  libEmpty: 'No puzzles yet — add a photo or try the demo image.',
  newFromPhoto: '+ new from photo',
  demoImage: 'demo image',
  close: 'close',
  installHint: '📲 This app installs: Chrome/Edge — “install” icon in the address bar · iPhone/iPad — Share → Add to Home Screen',
  gotIt: 'got it',
  ngTitle: 'New puzzle',
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  challenge: 'challenge (≈2.5× pieces)',
  customSummary: 'custom…',
  piecesLabel: 'pieces',
  tabLabel: 'tab',
  tabTitle: 'tab size — smaller knobs are subtler and harder',
  varyLabel: 'vary',
  varyTitle: 'shape variety — LOW makes pieces look alike (harder)',
  startCustom: 'start custom',
  cancel: 'cancel',
  pieces: 'pieces',
  clusters: 'clusters',
  noPuzzle: 'no puzzle open — pick one from puzzles',
  resume: 'resume',
  solvedMark: 'solved ✓',
  stored: '{mb} MB stored',
  evict: '⚠ not persistent — the browser may evict saves after long inactivity',
  bestSuffix: ' · best {t}',
  personalBest: ' · personal best!',
  heicFail: 'could not read that image',
  demoName: 'demo',
}

const zh: Record<string, string> = {
  rotation: '旋轉',
  reference: '參考圖',
  grid: '格線',
  edgesOnly: '只看邊塊',
  edgesTitle: '先拼邊框：暫時隱藏散落的內部拼圖塊',
  sound: '音效',
  scatter: '打散',
  recut: '重新切割',
  games: '拼圖庫',
  solvedBanner: '完成！🎉',
  libTitle: '拼圖庫',
  libEmpty: '還沒有拼圖 — 加入一張照片，或試試示範圖片。',
  newFromPhoto: '＋ 從照片新增',
  demoImage: '示範圖片',
  close: '關閉',
  installHint: '📲 可安裝為 App：Chrome/Edge — 網址列的「安裝」圖示 · iPhone/iPad — 分享 → 加入主畫面',
  gotIt: '知道了',
  ngTitle: '新拼圖',
  easy: '簡單',
  medium: '中等',
  hard: '困難',
  challenge: '挑戰模式（約 2.5× 片數）',
  customSummary: '自訂…',
  piecesLabel: '片數',
  tabLabel: '榫頭',
  tabTitle: '榫頭大小 — 越小越含蓄、越難辨認',
  varyLabel: '變化',
  varyTitle: '形狀變化 — 變化低時拼圖塊彼此相似（更難）',
  startCustom: '開始自訂',
  cancel: '取消',
  pieces: '片',
  clusters: '組',
  noPuzzle: '尚未開啟拼圖 — 從拼圖庫選一個',
  resume: '繼續',
  solvedMark: '完成 ✓',
  stored: '已使用 {mb} MB',
  evict: '⚠ 儲存空間未設為持久 — 長期未使用時瀏覽器可能清除存檔',
  bestSuffix: ' · 最佳 {t}',
  personalBest: ' · 個人最佳！',
  heicFail: '無法讀取這張圖片',
  demoName: '示範',
}

export type Lang = 'en' | 'zh'
let lang: Lang =
  (localStorage.getItem('jig.lang') as Lang | null) ??
  (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')

export const getLang = (): Lang => lang
export function setLang(l: Lang): void {
  localStorage.setItem('jig.lang', l)
  location.reload()
}

export const t = (k: string): string => (lang === 'zh' ? zh[k] : en[k]) ?? en[k] ?? k
export const tf = (k: string, vars: Record<string, string | number>): string =>
  t(k).replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n]))

export function applyStatic(): void {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'
  for (const el of document.querySelectorAll('[data-i18n]'))
    el.textContent = t(el.getAttribute('data-i18n')!)
  for (const el of document.querySelectorAll('[data-i18n-title]'))
    (el as HTMLElement).title = t(el.getAttribute('data-i18n-title')!)
}
