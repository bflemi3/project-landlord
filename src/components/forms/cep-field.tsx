'use client'

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAddressProvider } from '@/lib/address/provider'
import type { AddressLookupResult } from '@/lib/address/types'

const addressProvider = getAddressProvider('BR')

interface CepFieldProps {
  onAddressFound: (result: AddressLookupResult) => void
  defaultValue?: string
}

export const CepField = memo(function CepField({ onAddressFound, defaultValue }: CepFieldProps) {
  // 1. Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // 2. Context
  const t = useTranslations('properties')

  // 4. State
  const [looking, setLooking] = useState(false)
  const [found, setFound] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // 7. Effects — cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  // 8. Callbacks
  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    e.target.value = addressProvider.formatPostalCode(raw)

    setFound(false)
    setNotFound(false)

    // Cancel any pending request
    abortControllerRef.current?.abort()
    clearTimeout(debounceTimerRef.current)

    if (raw.length === 8) {
      setLooking(true)

      debounceTimerRef.current = setTimeout(async () => {
        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
          const result = await addressProvider.lookupPostalCode(raw)

          // If this request was aborted, don't update state
          if (controller.signal.aborted) return

          if (result) {
            onAddressFound(result)
            setFound(true)
          } else {
            setNotFound(true)
          }
        } catch {
          if (!controller.signal.aborted) {
            setNotFound(true)
          }
        } finally {
          if (!controller.signal.aborted) {
            setLooking(false)
          }
        }
      }, 300)
    } else {
      setLooking(false)
    }
  }, [onAddressFound])

  // 10. Return
  return (
    <div>
      <Label htmlFor="postal_code" className="mb-2">{t('postalCode')}</Label>
      <Input
        id="postal_code"
        name="postal_code"
        type="text"
        inputMode="numeric"
        placeholder={t('postalCodePlaceholder')}
        defaultValue={defaultValue}
        onChange={handleChange}
        maxLength={9}
      />
      {looking && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {t('postalCodeLooking')}
        </p>
      )}
      {found && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
          <Check className="size-3" />
          {t('postalCodeFound')}
        </p>
      )}
      {notFound && (
        <p className="mt-1.5 text-xs text-muted-foreground">{t('postalCodeNotFound')}</p>
      )}
      {!looking && !found && !notFound && (
        <p className="mt-1.5 text-xs text-muted-foreground">{t('addressHint')}</p>
      )}
    </div>
  )
})
