'use client'

import { useRef, useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { LogOut, User, CreditCard, Palette, Camera, Sun, Moon, Monitor, Check } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/responsive-modal'
import { createClient } from '@/lib/supabase/client'
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

interface UserMenuTriggerProps {
  userName?: string
  avatarUrl?: string
}

export function UserMenuTrigger({ userName, avatarUrl }: UserMenuTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar size="default">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName ?? ''} />}
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        </Avatar>
      </button>

      <UserSettingsModal
        open={open}
        onOpenChange={setOpen}
        userName={userName}
        avatarUrl={avatarUrl}
      />
    </>
  )
}

// =============================================================================
// Settings modal content
// =============================================================================

type SettingsSection = 'profile' | 'payment' | 'appearance'

function UserSettingsModal({
  open,
  onOpenChange,
  userName,
  avatarUrl,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName?: string
  avatarUrl?: string
}) {
  const t = useTranslations('settings')
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  const sections: { key: SettingsSection; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: t('profile'), icon: User },
    { key: 'payment', label: t('payment'), icon: CreditCard },
    { key: 'appearance', label: t('appearance'), icon: Palette },
  ]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      className="sm:max-w-2xl"
    >
      {/* Nav — segmented on mobile, sidebar on desktop */}
      <div className="mt-2 md:mt-4 md:flex md:gap-6">
        <div className="flex flex-col md:w-44 md:shrink-0 md:rounded-xl md:bg-zinc-50 md:p-2 md:dark:bg-zinc-800/60">
          {/* Mobile: pill segmented control */}
          <div className="mb-6 flex gap-1 rounded-xl bg-secondary/60 p-1 md:mb-0 md:flex-col md:rounded-none md:bg-transparent md:p-0">
            {sections.map((section) => {
              const isActive = activeSection === section.key
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors md:flex-none md:justify-start md:px-3',
                    isActive
                      ? 'bg-background text-foreground shadow-sm md:bg-primary/10 md:text-primary md:shadow-none'
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
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="size-4" />
              {t('signOut')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[200px] flex-1 md:min-h-[280px]">
          {activeSection === 'profile' && (
            <ProfileSection userName={userName} avatarUrl={avatarUrl} />
          )}
          {activeSection === 'payment' && <PaymentSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
        </div>
      </div>

      {/* Sign out — mobile only */}
      <div className="mt-6 flex justify-center md:hidden">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="size-3.5" />
          {t('signOut')}
        </button>
      </div>
    </ResponsiveModal>
  )
}

// =============================================================================
// Profile section — editable name, avatar, language
// =============================================================================

function ProfileSection({ userName, avatarUrl }: { userName?: string; avatarUrl?: string }) {
  const t = useTranslations('settings')
  const currentLocale = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(userName ?? '')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [dirty, setDirty] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    setDirty(value.trim() !== (userName ?? '').trim())
  }

  async function handleSaveName() {
    if (!dirty || !name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ full_name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    setSaving(false)
    setDirty(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploadingAvatar(false)
      return
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Add cache buster so the browser shows the new image
      const freshUrl = `${publicUrl}?t=${Date.now()}`

      await supabase
        .from('profiles')
        .update({ avatar_url: freshUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      setCurrentAvatarUrl(freshUrl)
    }

    setUploadingAvatar(false)
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleLocaleChange(locale: Locale) {
    if (locale === currentLocale) return
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar size="lg">
            {currentAvatarUrl && <AvatarImage src={currentAvatarUrl} alt={userName ?? ''} />}
            <AvatarFallback className="text-base">{getInitials(name || userName)}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Camera className="size-3" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{name || t('noName')}</p>
          <p className="text-sm text-muted-foreground">{t('profileDescription')}</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <Label htmlFor="settings-name" className="mb-2">{t('fullName')}</Label>
        <div className="flex gap-2">
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            autoComplete="name"
          />
          {dirty && (
            <Button
              onClick={handleSaveName}
              loading={saving}
              size="default"
              className="shrink-0"
            >
              {t('save')}
            </Button>
          )}
        </div>
      </div>

      {/* Language */}
      <div>
        <Label className="mb-2">{t('language')}</Label>
        <div className="grid grid-cols-3 gap-2">
          {locales.map((locale) => {
            const isActive = locale === currentLocale
            const label = localeLabels[locale]
            return (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                className={cn(
                  'flex items-center justify-center rounded-xl border px-3 py-2.5 transition-colors',
                  isActive
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                  <span className="md:hidden">{label.short}</span>
                  <span className="hidden md:inline">{label.native}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
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
      <p className="text-sm text-muted-foreground">{t('paymentDescription')}</p>
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <CreditCard className="mx-auto mb-2 size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('pixComingSoon')}</p>
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function handleThemeChange(value: string) {
    setTheme(value)
    if (value === 'system') {
      localStorage.removeItem('theme')
    }
  }

  if (!mounted) return null

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
                'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 transition-colors',
                isActive
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/30',
              )}
            >
              <Icon className={cn('size-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                {tTheme(value)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

