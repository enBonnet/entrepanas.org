import { useState } from 'react'
import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: err } = await authClient.signIn.email({ email, password })
    if (err) {
      setError(err.message ?? 'Sign in failed')
      return
    }
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="mx-auto max-w-sm rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        Sign in
      </h1>
      <form onSubmit={onSubmit} className="island-shell mt-6 rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
    </div>
  )
}
