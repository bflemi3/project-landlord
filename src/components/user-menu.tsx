'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import posthog from 'posthog-js'
import { LogOut, User, CreditCard, Landmark, Palette, Camera, Sun, Moon, Monitor } from 'lucide-react'

import { Suspense } from 'react'
import { BankAccountsPanel } from '@/components/bank-accounts/bank-accounts-panel'
import { BankAccountsPanelSkeleton } from '@/components/bank-accounts/bank-accounts-panel-skeleton'

import { type UseMutationResult, useQueryClient } from '@tanstack/react-query'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldActionRow,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/responsive-modal'
import { TaxIdInput, TaxIdLabel } from '@/components/ui/tax-id'
import { createClient } from '@/lib/supabase/client'
import { useProfile, useUpdateNameMutation, useUpdateTaxIdMutation } from '@/data/profiles/client'
import { profileQueryKey } from '@/data/profiles/shared'
import { nameInputSchema, taxIdInputSchema } from '@/schemas/profile'
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated'
import { useFormValidation, zodValidator, type Validator } from '@/lib/forms/use-form-validation'
import { useServerValidationErrors } from '@/lib/forms/use-server-validation-errors'
import type { ValidationFieldErrors } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { type Locale, locales } from '@/i18n/routing'

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const localeLabels: Record<Locale, { short: string; native: string }> = {
  en: { short: 'EN', native: 'English' },
  'pt-BR': { short: 'PT-BR', native: 'Português' },
  es: { short: 'ES', native: 'Español' },
}

export function UserMenuTrigger() {
  const { data: profile } = useProfile()
  const [open, setOpen] = useState(false)

  const userName = profile?.full_name ?? undefined
  const avatarUrl = profile?.avatar_url ?? undefined

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName ?? ''} />}
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        </Avatar>
      </button>

      <UserSettingsModal open={open} onOpenChange={setOpen} />
    </>
  )
}

// =============================================================================
// Settings modal content
// =============================================================================

type SettingsSection = 'profile' | 'payment' | 'bank' | 'appearance'

function UserSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('settings')
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  const sections: { key: SettingsSection; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: t('profile'), icon: User },
    { key: 'payment', label: t('payment'), icon: CreditCard },
    { key: 'bank', label: t('bankAccounts'), icon: Landmark },
    { key: 'appearance', label: t('appearance'), icon: Palette },
  ]

  async function handleSignOut() {
    posthog.reset()
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
      <ResponsiveModal.Header>
        <ResponsiveModal.Title>{t('title')}</ResponsiveModal.Title>
      </ResponsiveModal.Header>
      <ResponsiveModal.Content>
        {/* Nav — segmented on mobile, sidebar on desktop */}
        <div className="md:flex md:gap-6">
          <div className="md:bg-muted flex flex-col md:w-44 md:shrink-0 md:rounded-xl md:p-2">
            {/* Mobile: pill segmented control */}
            <div className="bg-secondary/60 mb-6 flex gap-1 rounded-xl p-1 md:mb-0 md:flex-col md:rounded-none md:bg-transparent md:p-0">
              {sections.map((section) => {
                const isActive = activeSection === section.key
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors md:flex-none md:justify-start md:px-3',
                      isActive
                        ? 'bg-background text-foreground md:bg-primary/10 md:text-primary shadow-sm md:shadow-none'
                        : 'text-muted-foreground hover:text-foreground md:hover:bg-secondary',
                    )}
                  >
                    <section.icon className="size-4" />
                    <span className="md:inline">{section.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Sign out at bottom of nav — desktop only */}
            <div className="mt-auto hidden pt-4 md:block">
              <button
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <LogOut className="size-4" />
                {t('signOut')}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="min-h-50 flex-1 md:min-h-70">
            {activeSection === 'profile' && <ProfileSection />}
            {activeSection === 'payment' && <PaymentSection />}
            {activeSection === 'bank' && <BankAccountsSection />}
            {activeSection === 'appearance' && <AppearanceSection />}
          </div>
        </div>
      </ResponsiveModal.Content>

      {/* Sign out — mobile only */}
      <ResponsiveModal.Footer className="flex justify-center md:hidden">
        <div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive flex items-center gap-1.5 text-sm transition-colors"
          >
            <LogOut className="size-3.5" />
            {t('signOut')}
          </button>
        </div>
      </ResponsiveModal.Footer>
    </ResponsiveModal>
  )
}

// =============================================================================
// Profile section — pure composition; each child owns its own state
// =============================================================================

function ProfileSection() {
  return (
    <div className="space-y-6">
      <AvatarField />
      <FieldGroup>
        <EmailField />
        <NameField />
        <TaxIdField />
      </FieldGroup>
      <LanguageField />
    </div>
  )
}

// =============================================================================
// useEditableProfileField — shared lifecycle for single-field text inputs
// (Name, Tax ID): local edit state, dirty tracking, validation, save mutation,
// server-error surface, touched-reset on success. Avatar/email/language don't
// share this shape and stay self-contained.
// =============================================================================

type EditableMutation<T> = UseMutationResult<T, { errors: ValidationFieldErrors<T> }, string>

interface UseEditableProfileFieldOptions<TInput> {
  fieldKey: keyof TInput & string
  initialValue: string
  validator: Validator<TInput>
  mutation: EditableMutation<TInput>
}

function useEditableProfileField<TInput>({
  fieldKey,
  initialValue,
  validator,
  mutation,
}: UseEditableProfileFieldOptions<TInput>) {
  const [value, setValue] = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)

  const values = useMemo(() => ({ [fieldKey]: value }) as unknown as TInput, [fieldKey, value])
  const form = useFormValidation({ values, validator })
  const serverErrors = useServerValidationErrors<TInput>()

  const dirty = value !== savedValue
  const isPending = mutation.isPending

  const save = useCallback(() => {
    if (!dirty || !form.isValid) return
    serverErrors.clearServerErrors()
    mutation.mutate(value, {
      onSuccess: (_data, raw) => {
        setSavedValue(raw)
        form.clearTouched(fieldKey)
      },
      onError: (err) => serverErrors.setServerErrors(err.errors),
    })
  }, [dirty, fieldKey, form, mutation, serverErrors, value])

  const generalError = serverErrors.serverErrors.general?.[0]
  const fieldError =
    (form.hasError(fieldKey) ? form.errors[fieldKey]?.[0] : undefined) ??
    serverErrors.getServerError(fieldKey) ??
    generalError

  return {
    value,
    setValue,
    dirty,
    isPending,
    save,
    isValid: form.isValid,
    markTouched: () => form.markTouched(fieldKey),
    clearFieldError: () => serverErrors.clearServerErrors(fieldKey),
    error: fieldError,
    showError: !!fieldError,
  }
}

// =============================================================================
// AvatarField — image upload + invalidate
// =============================================================================

function AvatarField() {
  const t = useTranslations('settings')
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const userName = profile?.full_name ?? undefined
  const avatarUrl = profile?.avatar_url ?? undefined

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      return
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Cache buster so the browser shows the new image immediately.
      const freshUrl = `${publicUrl}?t=${Date.now()}`

      await supabase.from('profiles').update({ avatar_url: freshUrl }).eq('id', user.id)

      // All consumers read via useProfile() — invalidate refreshes them in lockstep.
      await queryClient.invalidateQueries({ queryKey: profileQueryKey() })
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName ?? ''} />}
          <AvatarFallback className="text-base">{getInitials(userName)}</AvatarFallback>
        </Avatar>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full shadow-sm transition-colors disabled:opacity-50"
        >
          <Camera className="size-3" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground font-semibold">{userName || t('noName')}</p>
        <p className="text-muted-foreground text-sm">{t('profileDescription')}</p>
      </div>
    </div>
  )
}

// =============================================================================
// EmailField — read-only display, sourced from auth identity
// =============================================================================

function EmailField() {
  const t = useTranslations('settings')
  const { data: profile } = useProfile()
  const email = profile?.email ?? ''

  return (
    <Field>
      <FieldLabel htmlFor="settings-email">{t('email')}</FieldLabel>
      <Input id="settings-email" type="email" value={email} readOnly autoComplete="email" />
      <FieldDescription>{t('emailDescription')}</FieldDescription>
    </Field>
  )
}

// =============================================================================
// NameField — full name input with inline save
// =============================================================================

function NameField() {
  const t = useTranslations('settings')
  const { data: profile } = useProfile()
  const mutation = useUpdateNameMutation()
  const validator = useMemo(() => zodValidator(nameInputSchema), [])
  const field = useEditableProfileField({
    fieldKey: 'full_name',
    initialValue: profile?.full_name ?? '',
    validator,
    mutation,
  })

  return (
    <Field data-invalid={field.showError || undefined}>
      <FieldLabel htmlFor="settings-name">{t('fullName')}</FieldLabel>
      <FieldActionRow
        actionVisible={field.dirty}
        action={
          <Button
            onClick={field.save}
            loading={field.isPending}
            disabled={!field.isValid}
            className="shrink-0"
          >
            {t('save')}
          </Button>
        }
      >
        <Input
          id="settings-name"
          value={field.value}
          onChange={(e) => {
            field.setValue(e.target.value)
            field.clearFieldError()
          }}
          onBlur={field.markTouched}
          placeholder={t('fullNamePlaceholder')}
          autoComplete="name"
          aria-invalid={field.showError}
          aria-describedby={field.showError ? 'settings-name-error' : undefined}
        />
      </FieldActionRow>
      {field.showError && field.error && (
        <FieldError id="settings-name-error">{t(`validation.${field.error}`)}</FieldError>
      )}
    </Field>
  )
}

// =============================================================================
// TaxIdField — CPF/CNPJ input with inline save
// =============================================================================

function TaxIdField() {
  const t = useTranslations('settings')
  const { data: profile } = useProfile()
  const mutation = useUpdateTaxIdMutation()
  const validator = useMemo(() => zodValidator(taxIdInputSchema), [])
  const field = useEditableProfileField({
    fieldKey: 'tax_id',
    initialValue: profile?.tax_id ?? '',
    validator,
    mutation,
  })

  return (
    <Field data-invalid={field.showError || undefined}>
      <TaxIdLabel
        htmlFor="settings-tax-id"
        countryCode="BR"
        mode="cpf-or-cnpj"
        value={field.value}
      />
      <FieldActionRow
        actionVisible={field.dirty}
        action={
          <Button
            onClick={field.save}
            loading={field.isPending}
            disabled={!field.isValid}
            className="shrink-0"
          >
            {t('save')}
          </Button>
        }
      >
        <TaxIdInput
          id="settings-tax-id"
          countryCode="BR"
          mode="cpf-or-cnpj"
          value={field.value}
          onValueChange={(next) => {
            field.setValue(next)
            field.clearFieldError()
          }}
          onBlur={field.markTouched}
          aria-invalid={field.showError}
          aria-describedby={
            field.showError ? 'settings-tax-id-error' : 'settings-tax-id-description'
          }
        />
      </FieldActionRow>
      <FieldDescription id="settings-tax-id-description">{t('taxIdDescription')}</FieldDescription>
      {field.showError && field.error && (
        <FieldError id="settings-tax-id-error">{t(`validation.${field.error}`)}</FieldError>
      )}
    </Field>
  )
}

// =============================================================================
// LanguageField — locale selector (cookie + reload)
// =============================================================================

function LanguageField() {
  const t = useTranslations('settings')
  const currentLocale = useLocale()

  function handleChange(locale: Locale) {
    if (locale === currentLocale) return
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    window.location.reload()
  }

  return (
    <div>
      <Label className="mb-2">{t('language')}</Label>
      <div className="grid grid-cols-3 gap-2">
        {locales.map((locale) => {
          const isActive = locale === currentLocale
          const label = localeLabels[locale]
          return (
            <button
              key={locale}
              onClick={() => handleChange(locale)}
              className={cn(
                'flex items-center justify-center rounded-xl border px-3 py-2.5 transition-colors',
                isActive
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/30',
              )}
            >
              <span
                className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}
              >
                <span className="md:hidden">{label.short}</span>
                <span className="hidden md:inline">{label.native}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Bank accounts section — wraps the shared BankAccountsPanel
// =============================================================================

function BankAccountsSection() {
  const t = useTranslations('bankAccounts')

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('sectionDescription')}</p>
      <Suspense fallback={<BankAccountsPanelSkeleton />}>
        <BankAccountsPanel surface="settings" />
      </Suspense>
    </div>
  )
}

// =============================================================================
// Payment section — Pix key placeholder
// =============================================================================

function PaymentSection() {
  const t = useTranslations('settings')

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('paymentDescription')}</p>
      <div className="border-border rounded-2xl border border-dashed p-6 text-center">
        <CreditCard className="text-muted-foreground/40 mx-auto mb-2 size-6" />
        <p className="text-muted-foreground text-sm">{t('pixComingSoon')}</p>
      </div>
    </div>
  )
}

// =============================================================================
// Appearance section — theme radio cards
// =============================================================================

const themeOptions = [
  { value: 'light', icon: Sun, labelKey: 'themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'themeSystem' },
] as const

function AppearanceSection() {
  const t = useTranslations('settings')
  const tTheme = useTranslations('theme')
  const { theme, setTheme } = useTheme()
  const hydrated = useHasHydrated()

  function handleThemeChange(value: string) {
    setTheme(value)
    if (value === 'system') {
      localStorage.removeItem('theme')
    }
  }

  if (!hydrated) return null

  return (
    <div>
      <Label className="mb-3">{t('theme')}</Label>
      <div className="grid grid-cols-3 gap-2">
        {themeOptions.map(({ value, icon: Icon }) => {
          const isActive = theme === value
          return (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl border p-3 transition-colors',
                isActive
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/30',
              )}
            >
              <Icon className={cn('size-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span
                className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}
              >
                {tTheme(value)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
