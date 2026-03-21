import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-secondary px-6 dark:bg-background">
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-8 shadow-lg dark:border dark:border-border dark:shadow-none">
          {children}
        </div>
      </div>

      <footer className="flex items-center justify-center gap-8 py-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </footer>
    </div>
  )
}
