'use client'

import { useState, useActionState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Search,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InfoBox, InfoBoxIcon, InfoBoxContent } from '@/components/info-box'
import { ErrorBox } from '@/components/error-box'
import { lookupCnpjAction, type LookupCnpjResult } from '@/data/providers/actions/lookup-cnpj'
import { extractCnpjsFromBill } from '@/data/providers/actions/extract-cnpjs-from-bill'
import { createProvider, type CreateProviderState } from '@/data/providers/actions/create-provider'
import { findProviderByTaxId, type ExistingProvider } from '@/data/providers/actions/find-provider-by-tax-id'
import Link from 'next/link'

type LookupPhase = 'idle' | 'looking_up' | 'found' | 'not_found' | 'error' | 'duplicate'
type BillPhase = 'idle' | 'extracting' | 'selecting_cnpj' | 'done'

export default function NewProviderPage() {
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Router
  const router = useRouter()

  // State — tax ID + lookup
  const [taxId, setTaxId] = useState('')
  const [lookupPhase, setLookupPhase] = useState<LookupPhase>('idle')
  const [lookupResult, setLookupResult] = useState<LookupCnpjResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [existingProvider, setExistingProvider] = useState<ExistingProvider | null>(null)

  // State — bill
  const [billPhase, setBillPhase] = useState<BillPhase>('idle')
  const [billFile, setBillFile] = useState<File | null>(null)
  const [cnpjOptions, setCnpjOptions] = useState<LookupCnpjResult[]>([])
  const [billMessage, setBillMessage] = useState<string | null>(null)

  // State — editable provider fields
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [countryCode, setCountryCode] = useState('BR')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  // Derived
  const fieldsEnabled = lookupPhase === 'found' || lookupPhase === 'not_found'

  // Form action
  const [createState, createAction, isCreating] = useActionState(
    async (prev: CreateProviderState, formData: FormData) => {
      if (lookupResult?.companyCacheId) {
        formData.set('company_cache_id', lookupResult.companyCacheId)
      }
      if (billFile) {
        formData.set('bill_file', billFile)
      }

      const result = await createProvider(prev, formData)
      if (result.success && result.providerId) {
        router.push(`/eng/providers/${result.providerId}`)
      }
      return result
    },
    { success: false },
  )

  const canSave = fieldsEnabled && name.trim() && !isCreating

  // Callbacks
  async function runLookup(id: string) {
    setLookupPhase('looking_up')
    setLookupError(null)
    setExistingProvider(null)

    // Check for existing provider with this tax ID
    const dupeCheck = await findProviderByTaxId(id)
    if (dupeCheck.found && dupeCheck.provider) {
      setExistingProvider(dupeCheck.provider)
      setLookupPhase('duplicate')
      return
    }

    const result = await lookupCnpjAction(id)
    setLookupResult(result)

    if (result.status === 'found' && result.companyInfo) {
      setLookupPhase('found')
      setName(result.companyInfo.companyName)
      setDisplayName(result.companyInfo.companyName)
      setPhone(result.companyInfo.phone ?? '')
      setEmail(result.companyInfo.email ?? '')
    } else if (result.status === 'not_found') {
      setLookupPhase('not_found')
    } else {
      setLookupPhase('error')
      setLookupError(result.message ?? 'Lookup failed')
    }
  }

  async function handleLookup() {
    if (!taxId.trim()) return
    await runLookup(taxId)
  }

  async function handleBillUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setBillFile(file)
    setBillMessage(null)
    setBillPhase('extracting')

    const extractFd = new FormData()
    extractFd.set('file', file)
    const extractResult = await extractCnpjsFromBill(extractFd)

    if (!extractResult.success) {
      setBillMessage(extractResult.message ?? 'Extraction failed')
      setBillFile(null)
      setBillPhase('idle')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (extractResult.cnpjs.length === 0) {
      setBillMessage(extractResult.message ?? 'No CNPJs found. Enter a tax ID manually.')
      setBillPhase('done')
      return
    }

    if (extractResult.cnpjs.length === 1) {
      setTaxId(extractResult.cnpjs[0])
      setBillPhase('done')
      await runLookup(extractResult.cnpjs[0])
      return
    }

    // Multiple CNPJs — look up all in parallel, then let the engineer choose
    setBillPhase('selecting_cnpj')
    const results = await Promise.all(
      extractResult.cnpjs.map((cnpj) => lookupCnpjAction(cnpj)),
    )
    setCnpjOptions(results)
  }

  function handleCnpjSelect(result: LookupCnpjResult) {
    const cnpj = result.companyInfo?.cnpj ?? ''
    setTaxId(cnpj)
    setBillPhase('done')
    setCnpjOptions([])
    setLookupResult(result)

    if (result.status === 'found' && result.companyInfo) {
      setLookupPhase('found')
      setName(result.companyInfo.companyName)
      setDisplayName(result.companyInfo.companyName)
      setPhone(result.companyInfo.phone ?? '')
      setEmail(result.companyInfo.email ?? '')
    } else if (result.status === 'not_found') {
      setLookupPhase('not_found')
    }
  }

  function handleClearBill() {
    setBillFile(null)
    setBillPhase('idle')
    setBillMessage(null)
    setCnpjOptions([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Add Provider</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a tax ID or upload a bill to look up company information.
        </p>
      </div>

      <form action={createAction} className="space-y-6">
        <fieldset disabled={isCreating} className="space-y-6">
          {/* Tax ID + Lookup */}
          <section>
            <label className="mb-2 block text-sm font-medium">Tax ID</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleLookup()
                    }
                  }}
                  placeholder="Enter CNPJ or tax ID"
                  disabled={lookupPhase === 'looking_up'}
                />
              </div>
              <Button
                type="button"
                className="h-12 rounded-2xl"
                onClick={handleLookup}
                disabled={!taxId.trim() || lookupPhase === 'looking_up'}
                loading={lookupPhase === 'looking_up'}
              >
                <Search />
                Lookup
              </Button>
            </div>
          </section>

          {/* Bill upload */}
          <section>
            <label className="mb-2 block text-sm font-medium">Or upload a bill</label>
            {!billFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/70"
              >
                <Upload className="size-4" />
                Upload PDF to extract tax ID
              </button>
            ) : (
              <div className="rounded-2xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <FileText className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{billFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {billPhase === 'extracting' && 'Extracting tax IDs...'}
                      {billPhase === 'selecting_cnpj' && 'Select a CNPJ below'}
                      {billPhase === 'done' && `${(billFile.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                  {billPhase === 'extracting' && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={handleClearBill}
                  >
                    <X />
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleBillUpload}
              className="hidden"
            />
            {billMessage && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                {billMessage}
              </p>
            )}
          </section>

          {/* CNPJ selection (when multiple found in bill) */}
          {billPhase === 'selecting_cnpj' && (
            <section className="rounded-2xl border border-border p-4">
              <p className="mb-3 text-sm font-medium">
                {cnpjOptions.length === 0
                  ? 'Looking up tax IDs found in the document...'
                  : 'Multiple companies found — select the provider:'}
              </p>
              {cnpjOptions.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {cnpjOptions.map((result) => {
                    const cnpj = result.companyInfo?.cnpj ?? ''
                    const info = result.companyInfo
                    return (
                      <button
                        key={cnpj}
                        type="button"
                        onClick={() => handleCnpjSelect(result)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                      >
                        <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">
                              {info?.companyName ?? 'Unknown company'}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatCnpj(cnpj)}
                            </span>
                          </div>
                          {info && (
                            <p className="mt-0.5 truncate text-muted-foreground">
                              {[info.activityDescription, info.city && info.state ? `${info.city}, ${info.state}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                          {result.status === 'not_found' && (
                            <p className="mt-0.5 text-amber-600 dark:text-amber-400">
                              Not found in public registries
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Lookup status messages */}
          {lookupPhase === 'not_found' && (
            <InfoBox variant="warning">
              <InfoBoxIcon><AlertCircle /></InfoBoxIcon>
              <InfoBoxContent>
                Company not found in public registries. You can fill in the details manually.
              </InfoBoxContent>
            </InfoBox>
          )}

          {lookupPhase === 'error' && (
            <InfoBox variant="destructive">
              <InfoBoxIcon><AlertCircle /></InfoBoxIcon>
              <InfoBoxContent>
                {lookupError}
                <button
                  type="button"
                  onClick={handleLookup}
                  className="ml-2 underline underline-offset-2"
                >
                  Retry
                </button>
              </InfoBoxContent>
            </InfoBox>
          )}

          {/* Duplicate provider */}
          {lookupPhase === 'duplicate' && existingProvider && (
            <section className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">A provider with this tax ID already exists</span>
              </div>
              <div className="mb-4 rounded-xl bg-muted/50 px-4 py-3">
                <p className="font-medium">{existingProvider.display_name || existingProvider.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    existingProvider.tax_id && formatCnpj(existingProvider.tax_id),
                    existingProvider.email,
                    existingProvider.phone,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/eng/providers/${existingProvider.id}`} />}
                >
                  Go to provider
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setExistingProvider(null)
                    setLookupPhase('idle')
                    setLookupResult(null)
                    setLookupError(null)
                    setTaxId('')
                    setBillFile(null)
                    setBillPhase('idle')
                    setBillMessage(null)
                    setCnpjOptions([])
                    setName('')
                    setDisplayName('')
                    setCountryCode('BR')
                    setEmail('')
                    setPhone('')
                    setWebsite('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  Create another
                </Button>
              </div>
            </section>
          )}

          {/* Company info from lookup (read-only) */}
          {lookupPhase === 'found' && lookupResult?.companyInfo && (
            <InfoBox variant="success">
              <InfoBoxIcon><CheckCircle2 /></InfoBoxIcon>
              <InfoBoxContent>
                <p className="mb-2 font-medium">Company found</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <DetailItem label="Legal name" value={lookupResult.companyInfo.legalName} />
                  <DetailItem label="Trade name" value={lookupResult.companyInfo.companyName} />
                  <DetailItem label="Activity" value={lookupResult.companyInfo.activityDescription} />
                  <DetailItem
                    label="Location"
                    value={
                      lookupResult.companyInfo.city && lookupResult.companyInfo.state
                        ? `${lookupResult.companyInfo.city}, ${lookupResult.companyInfo.state}`
                        : null
                    }
                  />
                  {lookupResult.companyInfo.email && (
                    <DetailItem label="Email (registry)" value={lookupResult.companyInfo.email} />
                  )}
                  {lookupResult.companyInfo.phone && (
                    <DetailItem label="Phone (registry)" value={lookupResult.companyInfo.phone} />
                  )}
                </dl>
              </InfoBoxContent>
            </InfoBox>
          )}

          {/* Editable provider fields */}
          {fieldsEnabled && (
            <section className="space-y-4 border-t border-border pt-6">
              <h2 className="text-sm font-medium">Provider details</h2>

              <FieldGroup label="Name" required>
                <Input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Provider name"
                />
              </FieldGroup>

              <FieldGroup label="Display name">
                <Input
                  name="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Human-friendly display name"
                />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Country code">
                  <Input
                    name="country_code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="BR"
                  />
                </FieldGroup>
                <FieldGroup label="Tax ID">
                  <Input value={taxId} disabled />
                  <input type="hidden" name="tax_id" value={taxId} />
                </FieldGroup>
              </div>

              <FieldGroup label="Email">
                <Input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@provider.com"
                />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Phone">
                  <Input
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </FieldGroup>
                <FieldGroup label="Website">
                  <Input
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                  />
                </FieldGroup>
              </div>

              {createState.errors?.name && (
                <p className="text-sm text-destructive">{createState.errors.name}</p>
              )}
              {createState.errors?.general && (
                <ErrorBox message={createState.errors.general} />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.push('/eng/providers')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSave} loading={isCreating}>
                  Create provider
                </Button>
              </div>
            </section>
          )}
        </fieldset>
      </form>
    </div>
  )
}

function FieldGroup({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all font-medium">{value}</dd>
    </div>
  )
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}
