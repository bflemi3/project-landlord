'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, ArrowRight, FileWarning, RefreshCw, Upload } from 'lucide-react'
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ContractExtractionErrorCode } from '@/lib/contract-extraction/types'

const WARNING_CODES: ReadonlyArray<ContractExtractionErrorCode> = [
  'file_too_large',
  'no_text_extractable',
  'password_protected',
  'empty_file',
  'unsupported_format',
  'unsupported_language',
  'not_a_contract',
]

const CODES_WITHOUT_CTA: ReadonlyArray<ContractExtractionErrorCode> = ['api_key_missing']

const RETRY_CODES: ReadonlyArray<ContractExtractionErrorCode> = [
  'password_protected',
  'extraction_failed',
  'extraction_timeout',
  'rate_limited',
]

export function ContractUploadError({
  code,
  onCta,
}: {
  code: ContractExtractionErrorCode
  onCta: () => void
}) {
  const t = useTranslations('propertyCreation.errors')
  const isWarning = WARNING_CODES.includes(code)
  const showCta = !CODES_WITHOUT_CTA.includes(code)

  type MessageKey = Parameters<typeof t>[0]
  const Icon = isWarning ? AlertTriangle : FileWarning
  const CtaIcon =
    code === 'unsupported_language' ? ArrowRight : RETRY_CODES.includes(code) ? RefreshCw : Upload
  const tone = isWarning ? 'warning' : 'destructive'

  return (
    <Card
      variant="solid"
      size="none"
      role="alert"
      data-slot="file-upload-error"
      data-variant={tone}
    >
      <EmptyState className="py-10">
        <EmptyStateIcon tone={tone}>
          <Icon />
        </EmptyStateIcon>
        <EmptyStateTitle>{t(`${code}.title` as MessageKey)}</EmptyStateTitle>
        <EmptyStateDescription>{t(`${code}.message` as MessageKey)}</EmptyStateDescription>
        {showCta && (
          <EmptyStateActions>
            <Button
              data-slot="file-upload-error-action"
              variant="secondary"
              className="border-border border"
              onClick={onCta}
            >
              <CtaIcon data-icon="inline-start" />
              {t(`${code}.cta` as MessageKey)}
            </Button>
          </EmptyStateActions>
        )}
      </EmptyState>
    </Card>
  )
}
