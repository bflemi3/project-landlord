import { Suspense } from 'react'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { PageLoader } from '@/components/page-loader'
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
} from '@/components/empty-state'
import { Button } from '@/components/ui/button'

function ProviderRegistry() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <Building2 />
      </EmptyStateIcon>
      <EmptyStateTitle>No providers yet</EmptyStateTitle>
      <EmptyStateDescription>
        Providers are companies whose bills are processed through the billing intelligence pipeline.
        Add your first provider to get started.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button render={<Link href="/eng/providers/new" />} nativeButton={false}>
          Add provider
        </Button>
      </EmptyStateActions>
    </EmptyState>
  )
}

export default function EngProvidersPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProviderRegistry />
    </Suspense>
  )
}
