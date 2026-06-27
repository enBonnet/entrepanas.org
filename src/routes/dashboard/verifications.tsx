import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { recipientQueries } from '#/lib/queries/recipients'
import { UploadForm } from '#/components/upload-form'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/dashboard/verifications')({
  component: VerificationsPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(recipientQueries.mine())
  },
})

function VerificationsPage() {
  const { data: profile } = useSuspenseQuery(recipientQueries.mine())

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>{m['verificationsPage.title']()}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        {m['verificationsPage.note']()}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Status label={m['verificationsPage.identityLabel']()} value={profile?.identityVerificationStatus ?? 'unverified'} />
        <Status label={m['verificationsPage.payoutLabel']()} value={profile?.payoutVerificationStatus ?? 'unverified'} />
        <Status label={m['verificationsPage.locationLabel']()} value={profile?.locationVerificationStatus ?? 'unverified'} />
      </div>

      {!profile ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>{m['verificationsPage.needProfile']()}</p>
      ) : (
        <div className="island-shell rounded-2xl p-6 mt-6">
          <UploadForm
            kind="identity_doc"
            visibility="admin_only"
            linkedEntityType="recipient_verification"
            linkedEntityId={profile.id}
            label={m['verificationsPage.idUploadLabel']()}
          />
        </div>
      )}
    </div>
  )
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="feature-card rounded-2xl p-5">
      <p className="island-kicker">{label}</p>
      <p className="mt-1 font-semibold capitalize" style={{ color: 'var(--sea-ink)' }}>{value}</p>
    </div>
  )
}