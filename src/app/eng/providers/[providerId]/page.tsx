'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/error-box'
import { PageLoader } from '@/components/page-loader'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { deleteProvider } from '@/data/providers/actions/delete-provider'
import { createClient } from '@/lib/supabase/client'

interface ProviderSummary {
  name: string
  display_name: string | null
}

export default function ProviderDetailPage({
  params,
}: {
  params: Promise<{ providerId: string }>
}) {
  const router = useRouter()

  const [provider, setProvider] = useState<ProviderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { providerId } = await params
      const supabase = createClient()
      const { data } = await supabase
        .from('providers')
        .select('name, display_name')
        .eq('id', providerId)
        .single()
      setProvider(data)
      setLoading(false)
    }
    load()
  }, [params])

  async function handleDelete() {
    const { providerId } = await params
    setDeleting(true)
    setError(null)

    const result = await deleteProvider(providerId)

    if (result.success) {
      router.push('/eng/providers')
    } else {
      setError(result.error ?? 'Failed to delete')
      setDeleting(false)
      setDialogOpen(false)
    }
  }

  if (loading) return <PageLoader />

  const providerName = provider?.display_name || provider?.name || 'Provider'

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{providerName}</h1>
          {provider?.display_name && provider.name !== provider.display_name && (
            <p className="mt-0.5 text-sm text-muted-foreground">{provider.name}</p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" type="button" />
            }
          >
            <Trash2 />
            Delete provider
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Delete {providerName}?</DialogTitle>
              <DialogDescription>
                This will permanently delete the provider and all related data including
                profiles, test bills, and charge definitions. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={deleting}
              >
                Delete provider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="mb-6"><ErrorBox message={error} /></div>}

      <EmptyState
        icon={FileText}
        heading="Provider detail coming soon"
        description="This page will show provider info, profiles, and accuracy data."
      />
    </div>
  )
}
