import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-secondary px-6 dark:bg-background">
      <div className="fixed top-0 right-0 z-50 p-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-sm dark:border dark:border-border">
          {children}
        </div>
      </div>

      <footer className="py-6 text-center">
        <LanguageSwitcher />
      </footer>
    </div>
  )
}
