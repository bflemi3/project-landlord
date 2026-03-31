'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { Plus, Clock, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ResponsiveModal } from '@/components/responsive-modal'
import { useProperty } from '@/lib/hooks/use-property'
import { useUnitTenants, type UnitTenant } from '@/lib/hooks/use-unit-tenants'
import { useUnitInvites, type UnitInvite } from '@/lib/hooks/use-unit-invites'
import { inviteTenant } from '@/app/actions/properties/invite-tenant'
import { resendInvite } from '@/app/actions/properties/resend-invite'
import { cancelInvite } from '@/app/actions/properties/cancel-invite'
import { removeTenant } from '@/app/actions/properties/remove-tenant'
import { unitTenantsQueryKey } from '@/lib/queries/unit-tenants'
import { isValidEmail } from '@/lib/validation'
import { unitInvitesQueryKey } from '@/lib/queries/unit-invites'

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (email) return email[0].toUpperCase()
  return '?'
}

export function TenantsSection({ propertyId, unitId }: { propertyId: string; unitId: string }) {
  const t = useTranslations('propertyDetail')
  const { data: members } = useUnitTenants(unitId)
  const { data: invites } = useUnitInvites(unitId)

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<UnitTenant | null>(null)
  const [selectedInvite, setSelectedInvite] = useState<UnitInvite | null>(null)

  const totalCount = members.length + invites.length

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('tenants')} ({totalCount})
        </h2>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setInviteModalOpen(true)}>
          <Plus className="size-3.5" />
          {t('invite')}
        </Button>
      </div>

      {totalCount === 0 ? (
        <button
          onClick={() => setInviteModalOpen(true)}
          className="w-full rounded-2xl border border-dashed border-border px-5 py-8 text-center transition-colors hover:border-primary/30"
        >
          <p className="text-sm text-muted-foreground">{t('noTenants')}</p>
        </button>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <Avatar size="sm">
                <AvatarFallback className="text-xs">{getInitials(member.name, member.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{member.name ?? member.email}</p>
                {member.name && member.email && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{member.email}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <UserCheck className="size-3.5" />
                {t('active')}
              </div>
            </button>
          ))}

          {invites.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setSelectedInvite(inv)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <Avatar size="sm">
                <AvatarFallback className="text-xs">{getInitials(inv.name, inv.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{inv.name ?? inv.email}</p>
                {inv.name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{inv.email}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="size-3.5" />
                {t('pending')}
              </div>
            </button>
          ))}
        </div>
      )}

      <InviteTenantModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        propertyId={propertyId}
        unitId={unitId}
      />

      <TenantDetailModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        unitId={unitId}
      />

      <InviteDetailModal
        invite={selectedInvite}
        onClose={() => setSelectedInvite(null)}
        unitId={unitId}
      />
    </div>
  )
}

// =============================================================================
// Invite tenant modal
// =============================================================================

function InviteTenantModal({
  open,
  onOpenChange,
  propertyId,
  unitId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  unitId: string
}) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const { data: property } = useProperty(propertyId)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.set('email', email.trim())
    fd.set('tenant_name', name.trim())
    fd.set('unit_id', unitId)
    fd.set('property_id', propertyId)
    fd.set('property_name', property.name)
    fd.set('landlord_name', '')

    const result = await inviteTenant({ success: false }, fd)

    if (!result.success) {
      setError(result.errors?.email === 'alreadyInvited' ? t('alreadyInvited') : t('inviteFailed'))
      setLoading(false)
      return
    }

    queryClient.invalidateQueries({ queryKey: unitInvitesQueryKey(unitId) })
    setEmail('')
    setName('')
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-sm"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email" className="mb-2">{t('tenantEmail')}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('tenantEmailPlaceholder')}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="invite-name" className="mb-2">{t('tenantName')}</Label>
            <Input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tenantNamePlaceholder')}
              disabled={loading}
            />
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" loading={loading} disabled={!isValidEmail(email)} className="h-12 w-full rounded-2xl" size="lg">
            {t('sendInvite')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}

// =============================================================================
// Active tenant detail modal — view + remove
// =============================================================================

function TenantDetailModal({
  member,
  onClose,
  unitId,
}: {
  member: UnitTenant | null
  onClose: () => void
  unitId: string
}) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleRemove() {
    if (!member) return
    setLoading(true)
    await removeTenant(member.id)
    queryClient.invalidateQueries({ queryKey: unitTenantsQueryKey(unitId) })
    setLoading(false)
    setConfirming(false)
    onClose()
  }

  const open = member !== null

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) { setConfirming(false); onClose() } }}
      title={t('tenantTitle')}
      className="sm:max-w-sm"
    >
      {member && (
        <div>
          {/* Tenant info */}
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{getInitials(member.name, member.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {member.name && <p className="font-semibold text-foreground">{member.name}</p>}
              {member.email && <p className="text-sm text-muted-foreground">{member.email}</p>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <UserCheck className="size-3.5" />
              {t('active')}
            </div>
          </div>

          {/* Remove action */}
          {confirming ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">{t('removeTenantConfirm')}</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  loading={loading}
                  className="flex-1 rounded-2xl"
                >
                  {t('confirmRemove')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-2xl"
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <Button
                variant="link"
                onClick={() => setConfirming(true)}
                className="h-auto p-0 text-sm text-muted-foreground hover:text-destructive"
              >
                {t('removeTenant')}
              </Button>
            </div>
          )}
        </div>
      )}
    </ResponsiveModal>
  )
}

// =============================================================================
// Pending invite detail modal — resend + cancel
// =============================================================================

function InviteDetailModal({
  invite,
  onClose,
  unitId,
}: {
  invite: UnitInvite | null
  onClose: () => void
  unitId: string
}) {
  const t = useTranslations('propertyDetail')
  const queryClient = useQueryClient()
  const [resending, setResending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function handleResend() {
    if (!invite) return
    setResending(true)
    await resendInvite(invite.id)
    queryClient.invalidateQueries({ queryKey: unitInvitesQueryKey(unitId) })
    setResending(false)
    onClose()
  }

  async function handleCancel() {
    if (!invite) return
    setCancelling(true)
    await cancelInvite(invite.id)
    queryClient.invalidateQueries({ queryKey: unitInvitesQueryKey(unitId) })
    setCancelling(false)
    setConfirmCancel(false)
    onClose()
  }

  const open = invite !== null

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) { setConfirmCancel(false); onClose() } }}
      title={t('pendingInviteTitle')}
      className="sm:max-w-sm"
    >
      {invite && (
        <div>
          {/* Invite info card */}
          <div className="rounded-xl bg-secondary/50 px-4 py-3.5 dark:bg-zinc-800/50">
            <p className="font-semibold text-foreground">{invite.name ?? invite.email}</p>
            {invite.name && <p className="mt-0.5 text-sm text-muted-foreground">{invite.email}</p>}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {t('invitedOn', {
                date: format(new Date(invite.sentAt), 'MMM d'),
                relative: formatDistanceToNow(new Date(invite.sentAt), { addSuffix: true }),
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button
              variant="secondary"
              onClick={handleResend}
              loading={resending}
              className="h-11 w-full rounded-2xl"
            >
              {t('resendInvite')}
            </Button>

            {confirmCancel ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('cancelInviteConfirm')}</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    loading={cancelling}
                    className="flex-1 rounded-2xl"
                  >
                    {t('confirmCancel')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 rounded-2xl"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setConfirmCancel(true)}
                  className="h-auto p-0 text-sm text-muted-foreground hover:text-destructive"
                >
                  {t('cancelInvite')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </ResponsiveModal>
  )
}
