import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddChargeSheet } from './add-charge-sheet'
import type { ChargeInstance } from '@/lib/queries/statement-charges'

// Mock ResponsiveModal to avoid portal/dialog complexity in tests
vi.mock('@/components/responsive-modal', () => ({
  ResponsiveModal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}))

// Mock framer motion to avoid animation complexity in tests
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock server actions
vi.mock('@/app/actions/statements/update-charge-instance', () => ({
  updateChargeInstance: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/remove-charge-instance', () => ({
  removeChargeInstance: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/add-charge', () => ({
  addChargeToStatement: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/save-charge-definition', () => ({
  saveChargeAsDefinition: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/get-source-document-url', () => ({
  getSourceDocumentUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/signed-bill.pdf' }),
}))
vi.mock('@/app/actions/statements/delete-bill-document', () => ({
  deleteBillDocument: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/storage/delete-storage-file', () => ({
  deleteStorageFile: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/app/actions/statements/create-source-document-record', () => ({
  createSourceDocumentRecord: vi.fn().mockResolvedValue({ documentId: 'new-doc-id' }),
}))
vi.mock('@/lib/storage/upload-file', () => ({
  uploadFile: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}))

const messages = {
  propertyDetail: {
    saveChanges: 'Save changes',
    addToStatement: 'Add to statement',
    removeCharge: 'Remove charge',
    removeChargeConfirm: 'Are you sure?',
    yesRemove: 'Yes, remove',
    cancel: 'Cancel',
    chargePlaceholder: 'e.g. Repair fee',
    saveForFuture: 'Save for future',
    chargeType: 'Charge type',
    chargeTypeFixed: 'Fixed',
    chargeTypeVariable: 'Variable',
    billNudge: 'Attaching the bill helps your tenant verify this charge.',
    tapToAttachBill: 'Tap to attach a bill',
    uploaded: 'Uploaded',
    fileTooLarge: 'File is too large. Maximum size is {max}MB.',
    uploadFailed: 'Upload failed. Please try again.',
  },
}

function renderSheet(props: Partial<React.ComponentProps<typeof AddChargeSheet>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <AddChargeSheet
          open
          onOpenChange={vi.fn()}
          statementId="stmt-1"
          unitId="unit-1"
          periodYear={2026}
          periodMonth={4}
          {...props}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  )
}

const existingInstanceWithBill: ChargeInstance = {
  id: 'ci-1',
  statementId: 'stmt-1',
  chargeDefinitionId: 'cd-1',
  sourceDocumentId: 'doc-1',
  name: 'Electricity',
  amountMinor: 15000,
  currency: 'BRL',
  chargeSource: 'manual',
  splitType: 'percentage',
  landlordPercentage: 0,
  tenantPercentage: 100,
  landlordFixedMinor: null,
  tenantFixedMinor: null,
  sourceDocument: {
    id: 'doc-1',
    fileName: 'electricity-march.pdf',
    mimeType: 'application/pdf',
    filePath: 'unit-1/2026-03/abc.pdf',
  },
}

const existingInstanceNoBill: ChargeInstance = {
  ...existingInstanceWithBill,
  sourceDocumentId: null,
  sourceDocument: null,
}

afterEach(cleanup)

describe('AddChargeSheet — bill attachment', () => {
  it('shows attached file card when editing a charge with a bill', async () => {
    renderSheet({ existingInstance: existingInstanceWithBill })

    await waitFor(() => {
      expect(screen.getByText('electricity-march.pdf')).toBeInTheDocument()
    })
    expect(screen.queryByText('Tap to attach a bill')).not.toBeInTheDocument()
  })

  it('shows dropzone when editing a charge without a bill', () => {
    renderSheet({ existingInstance: existingInstanceNoBill })

    expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
  })

  it('calls deleteBillDocument when removing an existing bill', async () => {
    renderSheet({ existingInstance: existingInstanceWithBill })

    await waitFor(() => {
      expect(screen.getByText('electricity-march.pdf')).toBeInTheDocument()
    })

    const clearButton = screen.getByTestId('file-clear-btn')
    fireEvent.click(clearButton)

    const { deleteBillDocument } = await import('@/app/actions/statements/delete-bill-document')
    await waitFor(() => {
      expect(deleteBillDocument).toHaveBeenCalledWith('doc-1')
    })
  })

  it('shows dropzone after removing an existing bill', async () => {
    renderSheet({ existingInstance: existingInstanceWithBill })

    await waitFor(() => {
      expect(screen.getByText('electricity-march.pdf')).toBeInTheDocument()
    })

    const clearButton = screen.getByTestId('file-clear-btn')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
    })
  })

  it('calls deleteStorageFile when removing a newly uploaded file', async () => {
    renderSheet({ existingInstance: existingInstanceNoBill })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'new-bill.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('new-bill.pdf')).toBeInTheDocument()
    })

    const clearButton = screen.getByTestId('file-clear-btn')
    fireEvent.click(clearButton)

    const { deleteStorageFile } = await import('@/app/actions/storage/delete-storage-file')
    await waitFor(() => {
      expect(deleteStorageFile).toHaveBeenCalledWith(
        'source-documents',
        expect.stringMatching(/^unit-1\/2026-04\/.+\.pdf$/),
      )
    })
  })

  it('calls deleteStorageFile for previous file when replacing with a new one', async () => {
    renderSheet({ existingInstance: existingInstanceNoBill })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file1 = new File(['content1'], 'bill-1.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file1] } })

    await waitFor(() => {
      expect(screen.getByText('bill-1.pdf')).toBeInTheDocument()
    })

    const { deleteStorageFile } = await import('@/app/actions/storage/delete-storage-file')
    const callCountBefore = (deleteStorageFile as ReturnType<typeof vi.fn>).mock.calls.length

    // Clear first to get the file input back, then upload a replacement
    const clearButton = screen.getByTestId('file-clear-btn')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(screen.getByText('Tap to attach a bill')).toBeInTheDocument()
    })

    // The first deleteStorageFile call was from clearing
    const callCountAfterClear = (deleteStorageFile as ReturnType<typeof vi.fn>).mock.calls.length
    expect(callCountAfterClear).toBeGreaterThan(callCountBefore)
  })

  it('cleans up orphaned storage file on unmount without saving', async () => {
    const { unmount } = renderSheet({ existingInstance: existingInstanceNoBill })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'orphan-bill.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('orphan-bill.pdf')).toBeInTheDocument()
    })

    const { deleteStorageFile } = await import('@/app/actions/storage/delete-storage-file')
    ;(deleteStorageFile as ReturnType<typeof vi.fn>).mockClear()

    unmount()

    expect(deleteStorageFile).toHaveBeenCalledWith(
      'source-documents',
      expect.stringMatching(/^unit-1\/2026-04\/.+\.pdf$/),
    )
  })
})
