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
        {identity ? 'Identity verified' : 'Identity: pending'}
      </span>
      <span
        className={CHIP}
        style={
          payout
            ? { background: 'var(--palm)', color: 'white', borderColor: 'var(--palm)' }
            : { color: 'var(--sea-ink-soft)', borderColor: 'var(--line)' }
        }
      >
        {payout ? 'Payout verified' : 'Payout: pending'}
      </span>
      <span
        className={CHIP}
        style={
          location
            ? { background: 'var(--palm)', color: 'white', borderColor: 'var(--palm)' }
            : { color: 'var(--sea-ink-soft)', borderColor: 'var(--line)' }
        }
      >
        {location ? 'Location verified' : 'Location: pending'}
      </span>
    </div>
  )
}
