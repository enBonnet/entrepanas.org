import { useState } from 'react'
import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { error: err } = await authClient.signIn.email({ email, password })
      if (err) {
        setError(err.message ?? m['login.errorFallback']())
        return
      }
      navigate({ to: '/dashboard' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['login.title']()}
      </h1>
      <form onSubmit={onSubmit} className="island-shell mt-6 rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{m['login.emailLabel']()}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{m['login.passwordLabel']()}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? m['login.submitting']?.() ?? '…' : m['login.submit']()}</Button>
      </form>
    </div>
  )
}
