// ponytail: module-level cache survives across requests in the same Worker isolate.
// Google Fonts CSS URLs are stable, first request is ~200ms slower, rest are instant.
const fontCache = new Map<string, ArrayBuffer>()

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'

const WEIGHTS = [400, 600, 700] as const
type Weight = (typeof WEIGHTS)[number]

export interface OgFont {
  name: string
  data: ArrayBuffer
  weight: Weight
  style: 'normal'
}

export async function loadInterFonts(): Promise<OgFont[]> {
  const css = await fetch(FONTS_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  }).then((r) => r.text())

  // Parse @font-face blocks: extract weight + first url() per block
  const blocks = css.split('@font-face').slice(1)
  const out: OgFont[] = []

  for (const block of blocks) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/)
    if (!weightMatch) continue
    const w = Number(weightMatch[1])
    if (!WEIGHTS.includes(w as Weight)) continue
    const weight = w as Weight

    const cached = fontCache.get(String(weight))
    if (cached) {
      out.push({ name: 'Inter', data: cached, weight, style: 'normal' })
      continue
    }

    const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)
    if (!urlMatch?.[1]) continue
    const data = await fetch(urlMatch[1]).then((r) => r.arrayBuffer())
    fontCache.set(String(weight), data)
    out.push({ name: 'Inter', data, weight, style: 'normal' })
  }

  if (out.length === 0) throw new Error('No fonts loaded from Google Fonts')
  return out
}