'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'

interface NavSection {
  title: string
  items: { label: string; href: string }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Views',
    items: [
      { label: 'Home screen', href: '/preview/home' },
    ],
  },
  {
    title: 'Components',
    items: [
      { label: 'Property cards', href: '/preview/components/property-cards' },
      { label: 'Urgent actions', href: '/preview/components/urgent-actions' },
    ],
  },
]

export function PreviewShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh bg-zinc-100 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-svh w-64 shrink-0 flex-col border-r border-border bg-card dark:bg-zinc-900">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <Link href="/preview/home" className="text-sm font-bold text-foreground">
            Preview
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">Design system & views</p>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mb-0.5 block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Controls */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
