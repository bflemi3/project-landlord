'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Check, Loader2 } from 'lucide-react'

import { ResponsiveModal } from '@/components/responsive-modal'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { captureEvent } from '@/lib/analytics/capture'
import { readFirstTouchAttribution } from '@/lib/analytics/utm'
import { completeWaitlist } from '@/app/actions/waitlist'
import { type EmailLocale } from '@/emails/i18n'
import {
  PROPERTY_COUNT_TOKENS,
  ROLE_TOKENS,
  WORKFLOW_TOKENS,
  waitlistModalSchema,
  type PropertyCountToken,
  type WaitlistRoleToken,
  type WorkflowToken,
} from '@/schemas/waitlist'
import { useWaitlist } from './waitlist-context'

const ROLE_LABEL_KEY: Record<WaitlistRoleToken, string> = {
  landlord: 'waitlistRoleLandlord',
  tenant: 'waitlistRoleTenant',
  both: 'waitlistRoleBoth',
  imobiliaria: 'waitlistRoleImobiliaria',
  other: 'waitlistRoleOther',
}

const WORKFLOW_LABEL_KEY: Record<WorkflowToken, string> = {
  whatsapp: 'waitlistWorkflowWhatsapp',
  email: 'waitlistWorkflowEmail',
  spreadsheet: 'waitlistWorkflowSpreadsheet',
  bank_app: 'waitlistWorkflowBankApp',
  imobiliaria: 'waitlistWorkflowImobiliaria',
  marketplace: 'waitlistWorkflowMarketplace',
  dedicated_software: 'waitlistWorkflowSoftware',
  accountant: 'waitlistWorkflowAccountant',
  other: 'waitlistWorkflowOther',
}

type FieldKey = 'role' | 'propertyCount' | 'workflow' | 'feedback'

export function WaitlistModal() {
  const t = useTranslations('landing')
  const locale = useLocale() as EmailLocale
  const { modalOpen, email: ctxEmail, role: ctxRole, closeModal } = useWaitlist()

  const [role, setRole] = useState<WaitlistRoleToken | ''>('')
  const [propertyCount, setPropertyCount] = useState<PropertyCountToken | ''>('')
  const [workflow, setWorkflow] = useState<WorkflowToken[]>([])
  const [feedback, setFeedback] = useState('')
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  // On open, seed role from the gate toggle. The email isn't editable here —
  // it's already captured (and welcomed) — so it's shown read-only below.
  useEffect(() => {
    if (!modalOpen) return
    setRole(ctxRole)
    setErrors({})
    setSubmitError(false)
  }, [modalOpen, ctxRole])

  const roleOptions = ROLE_TOKENS.map((token) => ({ value: token, label: t(ROLE_LABEL_KEY[token]) }))
  const countOptions = PROPERTY_COUNT_TOKENS.map((token) => ({ value: token, label: token }))
  const workflowOptions = WORKFLOW_TOKENS.map((token) => ({
    value: token,
    label: t(WORKFLOW_LABEL_KEY[token]),
  }))

  function errorMessage(key: string | undefined): string | undefined {
    if (!key) return undefined
    if (key === 'tooLong') return t('waitlistErrTooLong')
    return t('waitlistErrRequired')
  }

  function toggleWorkflow(token: WorkflowToken) {
    setWorkflow((prev) =>
      prev.includes(token) ? prev.filter((x) => x !== token) : [...prev, token],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Guard against a rapid double-submit firing `waitlist_joined` twice — the
    // disabled button covers most of it, this covers the synchronous race.
    if (loading) return
    setSubmitError(false)

    const parsed = waitlistModalSchema.safeParse({
      email: ctxEmail,
      role,
      propertyCount,
      workflow,
      feedback: feedback.trim() === '' ? undefined : feedback,
    })

    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setErrors({
        role: fe.role?.[0],
        propertyCount: fe.propertyCount?.[0],
        workflow: fe.workflow?.[0],
        feedback: fe.feedback?.[0],
      })
      return
    }
    setErrors({})

    const data = parsed.data
    setLoading(true)
    try {
      const result = await completeWaitlist({
        email: data.email,
        role: data.role,
        propertyCount: data.propertyCount,
        workflow: data.workflow,
        feedback: data.feedback,
        locale,
      })
      if (!result.success) {
        setSubmitError(true)
        return
      }
      // They already joined at the gate; this is the optional profile enrich.
      const attribution = readFirstTouchAttribution()
      captureEvent('waitlist_profile_completed', {
        email: data.email,
        locale,
        role: data.role,
        property_count: data.propertyCount,
        workflow: data.workflow,
        ...attribution,
      })
      closeModal()
    } catch {
      setSubmitError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={modalOpen}
      onOpenChange={(o) => (o ? undefined : closeModal())}
      // px-0 pulls the scroll area edge-to-edge so its scrollbar sits flush to
      // the modal's right edge; the header, form, and footer re-add px-6 so the
      // content stays inset.
      className="dark px-0 sm:max-w-lg"
    >
      <ResponsiveModal.Header className="px-6">
        <ResponsiveModal.Title className="font-display text-[22px] font-medium tracking-tight">
          {t('waitlistModalTitle')}
        </ResponsiveModal.Title>
        <ResponsiveModal.Description className="text-[14px] leading-snug">
          {t('waitlistModalDescription')}
        </ResponsiveModal.Description>
      </ResponsiveModal.Header>

      <ResponsiveModal.Content>
        <form id="waitlist-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-7 px-6">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-foreground">
              {t('waitlistModalEmailReadonlyLabel')}
            </p>
            <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-foreground/[0.03] px-4 py-3">
              <Check className="size-4 shrink-0 text-highlight" aria-hidden />
              <span className="truncate text-[14px] text-foreground">{ctxEmail}</span>
            </div>
          </div>

          <RadioField
            label={t('waitlistRoleQuestion')}
            options={roleOptions}
            value={role}
            onChange={setRole}
            error={errorMessage(errors.role)}
          />

          <RadioField
            label={t('waitlistCountQuestion')}
            options={countOptions}
            value={propertyCount}
            onChange={setPropertyCount}
            error={errorMessage(errors.propertyCount)}
          />

          <CheckboxField
            label={t('waitlistWorkflowQuestion')}
            hint={t('waitlistWorkflowHint')}
            options={workflowOptions}
            value={workflow}
            onToggle={toggleWorkflow}
            error={errorMessage(errors.workflow)}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="waitlist-modal-feedback" className="text-[13px] font-medium text-foreground">
              {t('waitlistFeedbackQuestion')}{' '}
              <span className="font-normal text-muted-foreground">{t('waitlistOptional')}</span>
            </Label>
            <Textarea
              id="waitlist-modal-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={1000}
              rows={3}
              aria-invalid={!!errors.feedback}
              className="focus-visible:border-highlight focus-visible:ring-highlight/25"
            />
            {errors.feedback && (
              <p role="alert" className="text-[12.5px] text-red-400">
                {errorMessage(errors.feedback)}
              </p>
            )}
          </div>
        </form>
      </ResponsiveModal.Content>

      <ResponsiveModal.Footer className="px-6">
        <button
          type="submit"
          form="waitlist-modal-form"
          disabled={loading}
          className="group inline-flex items-center justify-center gap-2 bg-[#f5f0e8] font-medium text-[#1c1917] transition-colors hover:bg-[#ebe5d9] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {t('waitlistModalSubmit')}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </>
          )}
        </button>
        {submitError && (
          <p role="alert" className="mt-2 text-center text-[12.5px] text-red-400">
            {t('waitlistModalError')}
          </p>
        )}
      </ResponsiveModal.Footer>
    </ResponsiveModal>
  )
}

function RadioField<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T | ''
  onChange: (value: T) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-foreground">{label}</p>
      <RadioGroup
        aria-label={label}
        value={value === '' ? null : value}
        onValueChange={(v) => v && onChange(v as T)}
        className="gap-0.5"
      >
        {options.map((opt) => (
          <Label
            key={opt.value}
            className="flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-[14px] font-normal text-foreground"
          >
            <RadioGroupItem value={opt.value} tone="highlight" />
            <span>{opt.label}</span>
          </Label>
        ))}
      </RadioGroup>
      {error && (
        <p role="alert" className="text-[12.5px] text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

function CheckboxField<T extends string>({
  label,
  hint,
  options,
  value,
  onToggle,
  error,
}: {
  label: string
  hint?: string
  options: { value: T; label: string }[]
  value: T[]
  onToggle: (value: T) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-foreground">
        {label}
        {hint && <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span>}
      </p>
      <div role="group" aria-label={label} className="flex flex-col gap-0.5">
        {options.map((opt) => (
          <Label
            key={opt.value}
            className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px] font-normal text-foreground"
          >
            <Checkbox
              tone="highlight"
              checked={value.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
            />
            <span>{opt.label}</span>
          </Label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
