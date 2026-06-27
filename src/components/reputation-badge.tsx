import type { ComponentType } from 'react'
import { Award, BadgeCheck, Leaf, ShieldCheck, Sprout } from 'lucide-react'

import { m } from '#/paraglide/messages.js'

// Public reputation tier chip: coarse Spanish word + icon only. Raw score and
// counts are admin-only by design (see server projections). The icon name comes
// from the server (TIER_ICON) so the projection stays the single source.

export type ReputationTier = 'nuevo' | 'en proceso' | 'verificado' | 'confiable'

const ICONS: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  sprout: Sprout,
  leaf: Leaf,
  'badge-check': BadgeCheck,
  'shield-check': ShieldCheck,
}

const TIER_STYLE: Record<ReputationTier, { background: string; color: string; border: string }> = {
  nuevo: { background: 'transparent', color: 'var(--sea-ink-soft)', border: 'var(--line)' },
  'en proceso': { background: 'var(--sand)', color: 'var(--sea-ink)', border: 'var(--line)' },
  verificado: { background: 'var(--palm)', color: 'white', border: 'var(--palm)' },
  confiable: { background: 'var(--palm)', color: 'white', border: 'var(--palm)' },
}

const TIER_LABEL: Record<ReputationTier, () => string> = {
  nuevo: m['reputation.tierNuevo'],
  'en proceso': m['reputation.tierEnProceso'],
  verificado: m['reputation.tierVerificado'],
  confiable: m['reputation.tierConfiable'],
}

export function ReputationBadge({ tier, icon }: { tier: ReputationTier; icon?: string }) {
  const Icon = ICONS[icon ?? ''] ?? Award
  const style = TIER_STYLE[tier]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
      style={style}
    >
      <Icon size={14} />
      {TIER_LABEL[tier]()}
    </span>
  )
}
