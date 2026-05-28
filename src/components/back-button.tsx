'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BackButtonProps = {
  className?: string
  label?: string
  href?: string
  onClick?: VoidFunction
}

export function BackButton({ className, label, href, onClick }: BackButtonProps) {
  const router = useRouter()
  const t = useTranslations('common')

  function handleClick() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  if (href) {
    return (
      <Button className={className} variant="link" render={<Link href={href} />}>
        <ChevronLeft />
        {label ?? t('back')}
      </Button>
    )
  }

  return (
    <Button className={className} variant="ghost" onClick={onClick ?? handleClick}>
      <ChevronLeft />
      {label ?? t('back')}
    </Button>
  )
}
