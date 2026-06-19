import { Suspense } from 'react'

import { TabsContent } from '@/components/ui/tabs'

import { PropertyHeader } from './property-header'
import { PropertyTabs } from './property-tabs'
import { TabPlaceholder } from './tab-placeholder'
import { BillsPanel } from './bills-panel'
import { BillsOverdueDot } from './bills-overdue-dot'
import { LANDLORD_TAB_IDS } from './property-tabs-config'

interface LandlordPropertyViewProps {
  propertyId: string
}

// pb clears the mobile floating tab bar; desktop falls back to the layout's gap.
export function LandlordPropertyView({ propertyId }: LandlordPropertyViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col pb-24 md:pb-0">
      <PropertyHeader className="pb-6" propertyId={propertyId} />
      <PropertyTabs
        tabs={LANDLORD_TAB_IDS}
        indicators={{
          bills: (
            <Suspense fallback={null}>
              <BillsOverdueDot propertyId={propertyId} />
            </Suspense>
          ),
        }}
      >
        <TabsContent value="revenue">
          <TabPlaceholder tab="revenue" />
        </TabsContent>
        <TabsContent value="bills">
          <BillsPanel propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="contract">
          <TabPlaceholder tab="contract" />
        </TabsContent>
        <TabsContent value="messages">
          <TabPlaceholder tab="messages" />
        </TabsContent>
      </PropertyTabs>
    </div>
  )
}
