import { m } from '#/paraglide/messages.js'

type Props = {
  identity?: boolean
  payout?: boolean
  location?: boolean
  trustLevel?: string
}

const CHIP = 'rounded-full px-2.5 py-1 text-xs font-medium border'

export function TrustBadges({ identity, payout, location }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={CHIP}
        style={
          identity
            ? { background: 'var(--palm)', color: 'white', borderColor: 'var(--palm)' }
            : { color: 'var(--sea-ink-soft)', borderColor: 'var(--line)' }
        }
      >
        {identity ? m['trustBadges.identityVerified']() : m['trustBadges.identityPending']()}
      </span>
      <span
        className={CHIP}
        style={
          payout
            ? { background: 'var(--palm)', color: 'white', borderColor: 'var(--palm)' }
            : { color: 'var(--sea-ink-soft)', borderColor: 'var(--line)' }
        }
      >
        {payout ? m['trustBadges.payoutVerified']() : m['trustBadges.payoutPending']()}
      </span>
      <span
        className={CHIP}
        style={
          location
            ? { background: 'var(--palm)', color: 'white', borderColor: 'var(--palm)' }
            : { color: 'var(--sea-ink-soft)', borderColor: 'var(--line)' }
        }
      >
        {location ? m['trustBadges.locationVerified']() : m['trustBadges.locationPending']()}
      </span>
    </div>
  )
}
