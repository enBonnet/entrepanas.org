import { createFileRoute, notFound } from '@tanstack/react-router'

import { getCampaignBySlug } from '#/server/campaigns'

// ponytail: dynamic imports — satori + resvg-wasm pull in WebAssembly bindings
// whose wasm-bindgen glue touches WebAssembly at module-eval time. The route
// tree statically imports every route, so a top-level import here would crash
// SSR boot in the local Cloudflare dev embedder (WASM codegen disallowed).
// Lazy-importing inside the handler defers evaluation until this endpoint is
// actually requested. In deployed Workers (wasm allowed) the behavior is identical.
let resvgReady: Promise<void> | null = null

async function ensureResvg(): Promise<void> {
  if (!resvgReady) {
    resvgReady = (async () => {
      const { initWasm } = await import('@resvg/resvg-wasm')
      const wasmUrl = (await import('@resvg/resvg-wasm/index_bg.wasm?url')).default
      const url = new URL(wasmUrl, import.meta.url)
      // Dev SSR runs under Node where `file://` URLs can't be fetch()'d — read
      // from disk instead. In Workers `import.meta.url` is an http(s) origin
      // and fetch works normally.
      let bytes: ArrayBuffer
      if (url.protocol === 'file:') {
        const { readFile } = await import('node:fs/promises')
        bytes = (await readFile(url)).buffer
      } else {
        bytes = await (await fetch(url)).arrayBuffer()
      }
      await initWasm(bytes)
    })().catch((e) => {
      resvgReady = null
      throw e
    })
  }
  return resvgReady
}

export const Route = createFileRoute('/api/og/campaign/$campaignSlug')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const campaign = await getCampaignBySlug({
          data: { slug: params.campaignSlug },
        })
        if (!campaign) throw notFound()

        try {
          const [{ default: satori }, { Resvg }, { CampaignOgCard }, { loadInterFonts }] =
            await Promise.all([
              import('satori'),
              import('@resvg/resvg-wasm'),
              import('#/components/campaign-og-card'),
              import('#/lib/og-font'),
            ])

          const [fonts] = await Promise.all([loadInterFonts(), ensureResvg()])

          // CampaignOgCard uses @jsxImportSource satori, so calling it as a
          // function returns a Satori VNode that satori() can render directly.
          const svg = await satori(
            CampaignOgCard({
              campaign: {
                campaign: campaign.campaign,
                recipient: campaign.recipient ?? null,
                raisedCents: campaign.raisedCents,
                donorsCount: campaign.donorsCount,
              },
            }),
            {
              width: 1200,
              height: 630,
              fonts: fonts.map((f) => ({
                name: f.name,
                data: f.data,
                weight: f.weight,
                style: f.style,
              })),
            },
          )

          const resvg = new Resvg(svg, {
            background: '#f4f7f6',
            fitTo: { mode: 'width', value: 1200 },
          })
          const png = resvg.render().asPng()

          return new Response(new Uint8Array(png), {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        } catch {
          // ponytail: WASM unavailable (local dev embedder blocks codegen) —
          // return a 1×1 transparent PNG so the <img>/download doesn't hard-fail.
          // The route works in deployed Workers where WASM is allowed.
          const transparent = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            'base64',
          )
          return new Response(transparent, {
            status: 503,
            headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
          })
        }
      },
    },
  },
})