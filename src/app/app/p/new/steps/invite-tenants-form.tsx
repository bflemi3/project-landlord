'use client'

import { useState, type MutableRefObject } from 'react'
import { useTranslations } from 'next-intl'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidEmail } from '@/lib/validation'

export interface InviteEntry {
  email: string
  name: string
  sent: boolean
}

export function InviteTenantsForm({
  propertyName,
  onSubmit,
  isSubmitting,
  stateRef,
}: {
  propertyName: string
  onSubmit: (invites: InviteEntry[]) => void
  isSubmitting: boolean
  stateRef: MutableRefObject<InviteEntry[]>
}) {
  // 2. Context
  const t = useTranslations('properties')

  // 4. State
  const [tenants, _setTenants] = useState<InviteEntry[]>(stateRef.current)
  function setTenants(update: InviteEntry[] | ((prev: InviteEntry[]) => InviteEntry[])) {
    _setTenants((prev) => {
      const next = typeof update === 'function' ? update(prev) : update
      stateRef.current = next
      return next
    })
  }
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  // 5. Derived
  const hasTenants = tenants.length > 0
  const canAdd = isValidEmail(email)

  // 8. Callbacks
  function handleAdd() {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return

    if (!isValidEmail(trimmedEmail)) {
      setError(t('invalidEmail'))
      return
    }

    if (tenants.some((entry) => entry.email === trimmedEmail)) {
      setError(t('alreadyInvited'))
      return
    }

    setTenants((prev) => [...prev, { email: trimmedEmail, name: name.trim(), sent: false }])
    setEmail('')
    setName('')
    setError('')
  }

  function handleRemove(index: number) {
    setTenants((prev) => prev.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  function handleSubmit() {
    onSubmit(tenants)
  }

  function handleSkip() {
    onSubmit([])
  }

  // 10. Return
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-6">
      <h1 className="mb-2 text-2xl font-bold text-foreground">{t('inviteTenants')}</h1>
      <p className="mb-6 text-base text-muted-foreground">{t('inviteDescription')}</p>

      {/* Added tenants */}
      {hasTenants && (
        <div className="mb-6 space-y-2">
          {tenants.map((tenant, i) => {
            const initial = (tenant.name?.[0] ?? tenant.email[0]).toUpperCase()
            return (
              <div
                key={tenant.email}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm dark:bg-zinc-800"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  {tenant.name && (
                    <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{tenant.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(i)}
                  disabled={isSubmitting}
                >
                  <X />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add tenant form */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="tenant-email" className="mb-2">{t('tenantEmail')}</Label>
          <Input
            id="tenant-email"
            type="email"
            placeholder={t('tenantEmailPlaceholder')}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="tenant-name" className="mb-2">{t('tenantName')}</Label>
          <Input
            id="tenant-name"
            type="text"
            placeholder={t('tenantNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button
          variant={canAdd ? 'secondary' : 'ghost'}
          size="sm"
          onClick={handleAdd}
          disabled={!canAdd || isSubmitting}
          className="rounded-xl text-base md:text-sm"
        >
          <Plus />
          {t('addTenant')}
        </Button>
      </div>

      {/* Actions — pushed to bottom */}
      <div className="mt-auto space-y-3 pt-8">
        {hasTenants && (
          <Button
            onClick={handleSubmit}
            className="h-12 w-full rounded-2xl"
            size="lg"
            loading={isSubmitting}
          >
            {t('continue')}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="h-12 w-full rounded-2xl"
          size="lg"
          disabled={isSubmitting}
        >
          {t('skipForNow')}
        </Button>
      </div>
    </div>
  )
}
