import { useState } from 'react'

import { authorizeUpload, commitUpload } from '#/server/uploads'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'

type Kind =
  | 'transfer_proof'
  | 'invoice'
  | 'receipt'
  | 'product_photo'
  | 'delivery_photo'
  | 'identity_doc'

type Props = {
  kind: Kind
  visibility?: 'public' | 'private' | 'admin_only'
  linkedEntityType?: 'donation' | 'expense' | 'campaign' | 'recipient_verification' | 'payout'
  linkedEntityId?: string
  onCommitted?: (id: string) => void
  label?: string
}

const KIND_LABEL: Record<Kind, string> = {
  transfer_proof: 'Transfer proof',
  invoice: 'Invoice',
  receipt: 'Receipt',
  product_photo: 'Product photo',
  delivery_photo: 'Delivery photo',
  identity_doc: 'Identity document',
}

export function UploadForm({
  kind,
  visibility = 'private',
  linkedEntityType,
  linkedEntityId,
  onCommitted,
  label,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ id: string } | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const auth = await authorizeUpload({
        data: {
          filename: file.name,
          contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: file.size,
          kind,
          visibility,
          linkedEntityType,
          linkedEntityId,
        },
      })

      const put = await fetch(auth.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!put.ok) throw new Error(`Upload failed (${put.status})`)

      const committed = await commitUpload({
        data: {
          objectKey: auth.objectKey,
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: file.size,
          kind,
          visibility,
          linkedEntityType,
          linkedEntityId,
        },
      })
      setDone(committed)
      onCommitted?.(committed.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Label>{label ?? KIND_LABEL[kind]}</Label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={onFile}
        className="mt-1 block text-sm"
      />
      {busy && <p className="text-xs mt-1" style={{ color: 'var(--sea-ink-soft)' }}>Uploading…</p>}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>{error}</p>}
      {done && (
        <div className="mt-2 flex items-center gap-2">
          <img src={`/api/img/${done.id}`} alt="" className="h-16 w-16 rounded object-cover" />
          <span className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
            Uploaded — pending moderation.
          </span>
        </div>
      )}
      {busy && <Button disabled className="mt-2">Uploading…</Button>}
    </div>
  )
}
