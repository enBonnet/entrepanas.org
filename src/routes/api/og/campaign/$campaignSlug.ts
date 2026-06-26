import { createFileRoute, notFound } from '@tanstack/react-router'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import wasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url'

import { getCampaignBySlug } from '#/server/campaigns'
import { CampaignOgCard } from '#/components/campaign-og-card'
import { loadInterFonts } from '#/lib/og-font'

// ponytail: singleflight WASM init — resvg-wasm throws if initWasm called twice.
// The promise memoizes across requests in the same Worker isolate.
let resvgReady: Promise<void> | null = null

async function ensureResvg(): Promise<void> {
  if (!resvgReady) {
    resvgReady = (async () => {
      // Vite ?url import resolves to the WASM asset path. Workers need an
      // absolute URL, so resolve against import.meta.url (the Worker origin).
      const res = await fetch(new URL(wasmUrl, import.meta.url))
      await initWasm(res)
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
      },
    },
  },
})