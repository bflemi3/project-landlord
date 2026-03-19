'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackButton() {
  const router = useRouter()
  const t = useTranslations('common')

  function handleClick() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <Button variant="ghost" onClick={handleClick}>
      <ChevronLeft />
      {t('back')}
    </Button>
  )
}
