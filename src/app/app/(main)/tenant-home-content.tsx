'use client'

import { useTranslations } from 'next-intl'
import { UserMenuTrigger } from '@/components/user-menu'
import { Wordmark } from '@/components/wordmark'

interface TenantHomeContentProps {
  firstName?: string
  userName?: string
  avatarUrl?: string
  greetingKey: 'goodMorning' | 'goodAfternoon' | 'goodEvening'
}

export function TenantHomeContent({ firstName, userName, avatarUrl, greetingKey }: TenantHomeContentProps) {
  const t = useTranslations('home')
  const greeting = t(greetingKey)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-4 md:hidden">
        <Wordmark className="h-5" />
        <UserMenuTrigger userName={userName} avatarUrl={avatarUrl} />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4 md:pt-14">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
      </div>
    </div>
  )
}
