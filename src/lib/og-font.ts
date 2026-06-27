// ponytail: module-level cache survives across requests in the same Worker isolate.
// Google Fonts serves woff2 to browsers (satori can't parse woff2, only TTF).
// Browsers forbid overriding User-Agent on fetch, so we can't trick the CSS API.
// These TTF URLs are versioned on Google's CDN and stable across requests.
const fontCache = new Map<string, ArrayBuffer>()

const WEIGHTS = [400, 600, 700] as const
type Weight = (typeof WEIGHTS)[number]

// Stable TTF URLs for Inter v20 (fetched with a non-browser UA server-side).
const TTF_URLS: Record<Weight, string> = {
  400: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
  600: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf',
  700: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf',
}

export interface OgFont {
  name: string
  data: ArrayBuffer
  weight: Weight
  style: 'normal'
}

export async function loadInterFonts(): Promise<OgFont[]> {
  const out: OgFont[] = []

  for (const weight of WEIGHTS) {
    const cached = fontCache.get(String(weight))
    if (cached) {
      out.push({ name: 'Inter', data: cached, weight, style: 'normal' })
      continue
    }

    const data = await fetch(TTF_URLS[weight]).then((r) => r.arrayBuffer())
    fontCache.set(String(weight), data)
    out.push({ name: 'Inter', data, weight, style: 'normal' })
  }

  if (out.length === 0) throw new Error('No fonts loaded from Google Fonts')
  return out
}