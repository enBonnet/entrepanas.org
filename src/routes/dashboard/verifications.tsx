import { createFileRoute } from '@tanstack/react-router'

import { getMyProfile } from '#/server/recipients'
import { UploadForm } from '#/components/upload-form'

export const Route = createFileRoute('/dashboard/verifications')({
  component: VerificationsPage,
  loader: async () => getMyProfile(),
})

function VerificationsPage() {
  const profile = Route.useLoaderData()

  return (
    <div>
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>Verification</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>
        Identity documents are admin-only and never shown publicly.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Status label="Identity" value={profile?.identityVerificationStatus ?? 'unverified'} />
        <Status label="Payout" value={profile?.payoutVerificationStatus ?? 'unverified'} />
        <Status label="Location" value={profile?.locationVerificationStatus ?? 'unverified'} />
      </div>

      {!profile ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--sea-ink-soft)' }}>Create a profile first.</p>
      ) : (
        <div className="island-shell rounded-2xl p-6 mt-6">
          <UploadForm
            kind="identity_doc"
            visibility="admin_only"
            linkedEntityType="recipient_verification"
            linkedEntityId={profile.id}
            label="Government ID + selfie"
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
