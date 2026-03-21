import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border py-6">
        <div className="flex items-center justify-center gap-8">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          © 2026 mabenn · Privacy · Terms
        </p>
      </footer>
    </div>
  )
}
