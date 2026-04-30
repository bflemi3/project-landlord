'use client'

import { memo, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Check } from 'lucide-react'
import { FieldHint } from '@/components/forms/field-hint'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAddressProvider } from '@/lib/address/provider'
import type { AddressLookupResult } from '@/lib/address/types'

const addressProvider = getAddressProvider('BR')

interface CepFieldProps {
  onAddressFound: (result: AddressLookupResult) => void
  /**
   * Uncontrolled initial value. Used when the parent doesn't pass a
   * `value` / `onValueChange` pair. Mutually exclusive with controlled mode.
   */
  defaultValue?: string
  /**
   * Controlled value. When BOTH `value` and `onValueChange` are supplied, the
   * field renders as a controlled `<Input>` and `defaultValue` is ignored.
   */
  value?: string
  /**
   * Receives the formatted CEP string (`'01310-100'`) on every change. Wired
   * by `formatPostalCode` so callers don't need to format themselves.
   */
  onValueChange?: (formatted: string) => void
  labelExtra?: ReactNode
}

export const CepField = memo(function CepField({
  onAddressFound,
  defaultValue,
  value,
  onValueChange,
  labelExtra,
}: CepFieldProps) {
  // 1. Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // 2. Context
  const t = useTranslations('properties')

  // 4. State
  const [looking, setLooking] = useState(false)
  const [found, setFound] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // 5. Derived — controlled mode active when both props are provided.
  const isControlled = value !== undefined && onValueChange !== undefined

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
    const formatted = addressProvider.formatPostalCode(raw)

    if (isControlled) {
      onValueChange?.(formatted)
    } else {
      // Uncontrolled — preserve original behavior of mutating the input value
      // so the visible value stays formatted without forcing the parent to
      // re-render.
      e.target.value = formatted
    }

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
  }, [isControlled, onValueChange, onAddressFound])

  // 10. Return
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="postal_code">{t('postalCode')}{labelExtra}</Label>
      <Input
        id="postal_code"
        name="postal_code"
        type="text"
        inputMode="numeric"
        placeholder={t('postalCodePlaceholder')}
        {...(isControlled
          ? { value: value as string }
          : { defaultValue })}
        onChange={handleChange}
        maxLength={9}
      />
      {looking && (
        <FieldHint className="flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          {t('postalCodeLooking')}
        </FieldHint>
      )}
      {found && (
        <FieldHint className="flex items-center gap-1.5 text-primary">
          <Check className="size-3" />
          {t('postalCodeFound')}
        </FieldHint>
      )}
      {notFound && (
        <FieldHint>{t('postalCodeNotFound')}</FieldHint>
      )}
      {!looking && !found && !notFound && (
        <FieldHint>{t('addressHint')}</FieldHint>
      )}
    </div>
  )
})
