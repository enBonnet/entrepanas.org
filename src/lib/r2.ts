import { AwsClient } from 'aws4fetch'
import { env } from 'cloudflare:workers'

// Direct browser->R2 uploads via short-lived presigned PUT URLs (SigV4).
// Binary files never touch the Worker. Reads are gated through /api/img/$id so
// moderation/visibility is enforced server-side.

const MAX_EXPIRES = 600 // seconds; keep presigned URLs short-lived

function client() {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    // ponytail: region "auto" is the documented R2 value.
    region: 'auto',
    service: 's3',
  })
}

function objectUrl(key: string) {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`
}

export async function createPresignedPutUrl(opts: {
  key: string
  contentType: string
  expiresSeconds?: number
}) {
  const expires = Math.min(opts.expiresSeconds ?? MAX_EXPIRES, MAX_EXPIRES)
  // aws4fetch defaults X-Amz-Expires to 86400 if absent; set ours first.
  const url = new URL(objectUrl(opts.key))
  url.searchParams.set('X-Amz-Expires', String(expires))

  const signed = await client().sign(url, {
    method: 'PUT',
    aws: { signQuery: true },
  })
  return { url: signed.url, expiresIn: expires }
}
