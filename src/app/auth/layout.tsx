import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-secondary px-6 dark:bg-background">
      {/* Teal glow — offset toward top-left, behind the auth form */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Light mode */}
        <div
          className="absolute h-[300px] w-[500px] rounded-full blur-[80px] dark:hidden"
          style={{
            left: 'calc(50% - 350px)',
            top: 'calc(50% - 300px)',
            background: 'radial-gradient(ellipse, oklch(0.704 0.14 182.503 / 0.25) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute h-[500px] w-[800px] rounded-full blur-[120px] dark:hidden"
          style={{
            left: 'calc(50% - 500px)',
            top: 'calc(50% - 400px)',
            background: 'radial-gradient(ellipse, oklch(0.704 0.14 182.503 / 0.1) 0%, transparent 70%)',
          }}
        />
        {/* Dark mode — slightly stronger */}
        <div
          className="absolute hidden h-[300px] w-[500px] rounded-full blur-[80px] dark:block"
          style={{
            left: 'calc(50% - 350px)',
            top: 'calc(50% - 300px)',
            background: 'radial-gradient(ellipse, oklch(0.704 0.14 182.503 / 0.35) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute hidden h-[500px] w-[800px] rounded-full blur-[120px] dark:block"
          style={{
            left: 'calc(50% - 500px)',
            top: 'calc(50% - 400px)',
            background: 'radial-gradient(ellipse, oklch(0.704 0.14 182.503 / 0.15) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-8 shadow-lg dark:border dark:border-border dark:shadow-none">
          {children}
        </div>
      </div>

      <footer className="relative flex items-center justify-center gap-8 py-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </footer>
    </div>
  )
}
