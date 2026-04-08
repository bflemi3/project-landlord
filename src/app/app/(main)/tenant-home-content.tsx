'use client'

import { useTranslations } from 'next-intl'
import { UserMenuTrigger } from '@/components/user-menu'
import { Wordmark } from '@/components/wordmark'

function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'goodMorning'
  if (hour < 18) return 'goodAfternoon'
  return 'goodEvening'
}

interface TenantHomeContentProps {
  firstName?: string
  userName?: string
  avatarUrl?: string
}

export function TenantHomeContent({ firstName, userName, avatarUrl }: TenantHomeContentProps) {
  const t = useTranslations('home')
  const greeting = t(getGreetingKey())

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
