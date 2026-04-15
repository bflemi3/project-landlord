import { Suspense } from 'react'
import { Building2 } from 'lucide-react'
import { PageLoader } from '@/components/page-loader'
import { EmptyState } from '@/components/empty-state'

function ProviderRegistry() {
  return (
    <EmptyState
      icon={Building2}
      heading="No providers yet"
      description="Providers are companies whose bills are processed through the billing intelligence pipeline. Add your first provider to get started."
      action={{ label: 'Add provider', href: '/eng/providers/new' }}
    />
  )
}

export default function EngProvidersPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProviderRegistry />
    </Suspense>
  )
}
