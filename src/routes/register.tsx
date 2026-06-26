import { useState } from 'react'
import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'donor' | 'receiver'>('donor')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: err } = await authClient.signUp.email({ name, email, password })
    if (err) {
      setError(err.message ?? m['register.errorFallback']())
      return
    }
    navigate({ to: role === 'receiver' ? '/dashboard/profile' : '/explore' })
  }

  return (
    <div className="mx-auto max-w-sm rise-in">
      <h1 className="display-title text-3xl font-bold" style={{ color: 'var(--sea-ink)' }}>
        {m['register.title']()}
      </h1>
      <form onSubmit={onSubmit} className="island-shell mt-6 rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>{m['register.roleLabel']()}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={role === 'donor' ? 'default' : 'outline'}
              onClick={() => setRole('donor')}
              className="flex-1"
            >
              {m['register.roleDonor']()}
            </Button>
            <Button
              type="button"
              variant={role === 'receiver' ? 'default' : 'outline'}
              onClick={() => setRole('receiver')}
              className="flex-1"
            >
              {m['register.roleReceiver']()}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{m['register.nameLabel']()}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{m['register.emailLabel']()}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{m['register.passwordLabel']()}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
        <Button type="submit" className="w-full">{m['register.submit']()}</Button>
      </form>
    </div>
  )
}
