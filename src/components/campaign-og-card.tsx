/** @jsxImportSource satori/jsx */

export type CampaignData = {
  campaign: {
    title: string
    summary: string | null
    goalCents: number | null
    currency: string
    slug: string
  }
  recipient: {
    publicName: string
    city: string
  } | null
  raisedCents: number
  donorsCount: number
}

const W = 1200
const H = 630
const PALM = '#2d9d6e'
const SEA_INK = '#1a2b3c'
const MUTED = '#5a6b7c'
const FAINT = '#8a9baa'
const BG = '#f4f7f6'
const CARD_BG = '#ffffff'
const TRACK = '#e8eceb'

export function CampaignOgCard({
  campaign,
}: {
  campaign: CampaignData
}) {
  const { campaign: c, recipient, raisedCents, donorsCount } = campaign
  const goal = c.goalCents
  const pct = goal ? Math.min(100, Math.round((raisedCents / goal) * 100)) : 0

  return (
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BG,
        fontFamily: 'Inter',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 8, width: '100%', backgroundColor: PALM }} />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '56px 64px 48px',
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: PALM,
              letterSpacing: '-0.5px',
            }}
          >
            entrepanas
          </span>
        </div>

        {/* Title + summary */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 920,
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: SEA_INK,
              lineHeight: 1.18,
            }}
          >
            {c.title}
          </div>
          {c.summary ? (
            <div
              style={{
                fontSize: 22,
                color: MUTED,
                lineHeight: 1.4,
                marginTop: 16,
              }}
            >
              {c.summary.length > 160
                ? c.summary.slice(0, 157) + '...'
                : c.summary}
            </div>
          ) : null}
        </div>

        {/* Progress card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: CARD_BG,
            borderRadius: 16,
            padding: '28px 36px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span
              style={{ fontSize: 34, fontWeight: 700, color: PALM }}
            >
              {formatCents(raisedCents, c.currency)}
            </span>
            {goal ? (
              <span style={{ fontSize: 18, color: FAINT }}>
                de {formatCents(goal, c.currency)}
              </span>
            ) : null}
          </div>
          {goal ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: 16,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: TRACK,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: PALM,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: SEA_INK,
                  marginLeft: 16,
                }}
              >
                {pct}%
              </span>
            </div>
          ) : null}
          <div style={{ fontSize: 16, color: FAINT, marginTop: 14 }}>
            {donorsCount}{' '}
            {donorsCount === 1 ? 'donación confirmada' : 'donaciones confirmadas'}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 20, color: MUTED }}>
            {recipient ? `por ${recipient.publicName}, ${recipient.city}` : ''}
          </span>
          <span style={{ fontSize: 16, color: FAINT }}>
            entrepanas — trazabilidad de donaciones
          </span>
        </div>
      </div>
    </div>
  )
}

// ponytail: es locale + simple currency map. Intl.NumberFormat works in Workers
// with nodejs_compat, but locale es-VE currency formatting is noisy. Keep it clean.
function formatCents(cents: number, currency = 'USD'): string {
  const symbol =
    currency === 'USD' ? '$' : currency === 'VES' ? 'Bs.' : `${currency} `
  const amount = (cents / 100).toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return `${symbol}${amount}`
}