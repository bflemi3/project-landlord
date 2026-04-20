'use client'

import { AlertTriangle, Check, MessageCircle, FileText } from 'lucide-react'
import { IconTile } from '@/components/icon-tile'
import {
  List,
  ListRowBody,
  ListRowChevron,
  ListRowDescription,
  ListRowLeading,
  ListRowTitle,
  ListRowTrailing,
  listRowClassName,
} from '@/components/list-row'
import { Card } from '@/components/ui/card'
import type { UrgentAction } from '@/lib/types/property'

const iconMap: Record<string, React.ElementType> = {
  overdue_payment: AlertTriangle,
  payment_claim: Check,
  dispute: MessageCircle,
  bill_review: FileText,
}

const toneMap: Record<string, React.ComponentProps<typeof IconTile>['tone']> = {
  overdue_payment: 'destructive',
  payment_claim: 'warning',
  dispute: 'warning',
  bill_review: 'info',
}

export function UrgentActionList({ urgentActions }: { urgentActions: UrgentAction[] }) {
  return (
    <Card size="none">
      <List>
        {urgentActions.map((action, i) => {
          const Icon = iconMap[action.type] ?? AlertTriangle
          const tone = toneMap[action.type] ?? 'warning'
          return (
            <button key={i} type="button" className={listRowClassName({ variant: 'embedded' })}>
              <ListRowLeading>
                <IconTile size="lg" shape="circle" tone={tone}>
                  <Icon />
                </IconTile>
              </ListRowLeading>
              <ListRowBody>
                <ListRowTitle>{action.title}</ListRowTitle>
                <ListRowDescription>{action.description}</ListRowDescription>
              </ListRowBody>
              <ListRowTrailing>
                <ListRowChevron />
              </ListRowTrailing>
            </button>
          )
        })}
      </List>
    </Card>
  )
}
