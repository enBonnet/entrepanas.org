import { useState } from 'react'

import { authorizeUpload, commitUpload } from '#/server/uploads'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { m } from '#/paraglide/messages.js'

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

const KIND_KEY = {
  transfer_proof: 'uploadForm.kindTransferProof',
  invoice: 'uploadForm.kindInvoice',
  receipt: 'uploadForm.kindReceipt',
  product_photo: 'uploadForm.kindProductPhoto',
  delivery_photo: 'uploadForm.kindDeliveryPhoto',
  identity_doc: 'uploadForm.kindIdentityDoc',
} as const

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
      if (!put.ok) {
        const code = await put.text().catch(() => '')
        throw new Error(code || m['uploadForm.errorFallback']())
      }

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
      setError(err instanceof Error ? err.message : m['uploadForm.errorFallback']())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Label>{label ?? m[KIND_KEY[kind]]()}</Label>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={onFile}
        className="mt-1"
      />
      {busy && <p className="text-xs mt-1" style={{ color: 'var(--sea-ink-soft)' }}>{m['uploadForm.uploading']()}</p>}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>{error}</p>}
      {done && (
        <div className="mt-2 flex items-center gap-2">
          <img src={`/api/img/${done.id}`} alt="" className="h-16 w-16 rounded object-cover" />
          <span className="text-xs" style={{ color: 'var(--sea-ink-soft)' }}>
            {m['uploadForm.uploaded']()}
          </span>
        </div>
      )}
      {busy && <Button disabled className="mt-2">{m['uploadForm.uploading']()}</Button>}
    </div>
  )
}
