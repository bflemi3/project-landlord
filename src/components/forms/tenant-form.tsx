'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getInitials } from '@/lib/initials'
import { cn } from '@/lib/utils'

// =============================================================================
// Avatar — initials derived from name, email as fallback when name is empty
// =============================================================================

type TenantFormAvatarProps = Omit<
  React.ComponentProps<typeof Avatar>,
  'children'
> & {
  name: string
  email: string
}

function TenantFormAvatar({ name, email, ...props }: TenantFormAvatarProps) {
  return (
    <Avatar data-slot="tenant-form-avatar" {...props}>
      <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
    </Avatar>
  )
}

// =============================================================================
// Text-field primitives — Name, TaxId, Email
// =============================================================================
//
// Each renders the bare `<Input>` control with sensible autocomplete defaults
// for its semantic. Consumers wrap with `<Field>` / `<FieldLabel>` /
// `<FieldError>` themselves, matching the way property.tsx and rent-dates.tsx
// compose `<Input>` directly.
//
// `onValueChange` exposes the string value (not the event) — same shape as
// `<CurrencyInput>` and `<Switch>`. Other native props (id, name, onBlur,
// disabled, aria-*) pass through to the underlying input.

type TenantFormTextFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> & {
  value: string
  onValueChange: (value: string) => void
}

function TenantFormName({
  value,
  onValueChange,
  ...props
}: TenantFormTextFieldProps) {
  return (
    <Input
      data-slot="tenant-form-name"
      type="text"
      autoComplete="name"
      autoCapitalize="words"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    />
  )
}

// Placeholder for now — will swap the inner control for a country-aware
// `<TaxId>` primitive in a follow-up piece, with masking and check-digit
// validation driven by the country provider. The slot name and outer API stay
// the same so consumers don't churn.
function TenantFormTaxId({
  value,
  onValueChange,
  ...props
}: TenantFormTextFieldProps) {
  return (
    <Input
      data-slot="tenant-form-tax-id"
      type="text"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    />
  )
}

function TenantFormEmail({
  value,
  onValueChange,
  ...props
}: TenantFormTextFieldProps) {
  return (
    <Input
      data-slot="tenant-form-email"
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    />
  )
}

// =============================================================================
// Invite toggle — Switch
// =============================================================================

type TenantFormInviteToggleProps = React.ComponentProps<typeof Switch>

function TenantFormInviteToggle({
  className,
  ...props
}: TenantFormInviteToggleProps) {
  return (
    <Switch
      data-slot="tenant-form-invite-toggle"
      className={className}
      {...props}
    />
  )
}

// =============================================================================
// Remove button — ghost icon button with destructive hover
// =============================================================================

type TenantFormRemoveButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'variant' | 'size'
>

function TenantFormRemoveButton({
  className,
  ...props
}: TenantFormRemoveButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="tenant-form-remove-button"
      className={cn(
        'text-muted-foreground hover:text-destructive',
        className,
      )}
      {...props}
    >
      <X />
    </Button>
  )
}

// =============================================================================
// Exports
// =============================================================================

export {
  TenantFormAvatar,
  TenantFormName,
  TenantFormTaxId,
  TenantFormEmail,
  TenantFormInviteToggle,
  TenantFormRemoveButton,
}
