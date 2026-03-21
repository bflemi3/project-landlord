'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const options = [
  { value: 'light', icon: Sun, labelKey: 'light' },
  { value: 'dark', icon: Moon, labelKey: 'dark' },
  { value: 'system', icon: Monitor, labelKey: 'system' },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('theme')
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
    <div className="inline-flex items-center gap-1 rounded-full bg-zinc-200 p-1 dark:bg-secondary">
      {options.map(({ value, icon: Icon, labelKey }) => (
        <Tooltip key={value}>
          <TooltipTrigger
            onClick={() => handleThemeChange(value)}
            className={cn(
              'rounded-full p-2 transition-colors',
              theme === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t(labelKey)}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
