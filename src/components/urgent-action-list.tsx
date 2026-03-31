'use client'

import {
  ChevronRight, Check, AlertTriangle, MessageCircle, FileText,
} from 'lucide-react'
import type { UrgentAction } from '@/lib/types/property'

const iconMap: Record<string, React.ElementType> = {
  overdue_payment: AlertTriangle,
  payment_claim: Check,
  dispute: MessageCircle,
  bill_review: FileText,
}

const colorMap: Record<string, string> = {
  overdue_payment: 'text-rose-500 bg-rose-500/10',
  payment_claim: 'text-amber-500 bg-amber-500/10',
  dispute: 'text-amber-500 bg-amber-500/10',
  bill_review: 'text-sky-500 bg-sky-500/10',
}

export function UrgentActionList({ urgentActions }: { urgentActions: UrgentAction[] }) {
  return (
    <div className="space-y-2">
      {urgentActions.map((action, i) => {
        const Icon = iconMap[action.type] ?? AlertTriangle
        const color = colorMap[action.type] ?? 'text-amber-500 bg-amber-500/10'
        return (
          <button
            key={i}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/20 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
          </button>
        )
      })}
    </div>
  )
}
