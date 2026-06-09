import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function BankAccountsPanelSkeleton() {
  return (
    <Card size="none" className="overflow-hidden">
      <div className="divide-y divide-border/70 dark:divide-border/80">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-5">
            <Skeleton className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  )
}
