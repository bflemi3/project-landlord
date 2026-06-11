import { TabsContent } from '@/components/ui/tabs'

import { PropertyHeader } from './property-header'
import { PropertyTabs } from './property-tabs'
import { TabPlaceholder } from './tab-placeholder'
import { BillsPanel } from './bills-panel'
import { TENANT_TAB_IDS } from './property-tabs-config'

interface TenantPropertyViewProps {
  propertyId: string
}

// pb clears the mobile floating tab bar; desktop falls back to the layout's gap.
export function TenantPropertyView({ propertyId }: TenantPropertyViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-24 md:pb-0">
      <PropertyHeader propertyId={propertyId} />
      <PropertyTabs tabs={TENANT_TAB_IDS}>
        <TabsContent value="rent">
          <TabPlaceholder tab="rent" />
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
