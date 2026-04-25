'use client'

import {
  DetailPageLayoutBody,
  DetailPageLayoutMain,
  DetailPageLayoutSidebar,
} from '@/components/detail-page-layout'
import { PropertySection } from './sections/property'
import { RentDatesSection } from './sections/rent-dates'
import { TenantsSection } from './sections/tenants'
import { ExpensesSection } from './sections/expenses'
import { CpfSection } from './sections/cpf'
import { BankSection } from './sections/bank'
import { CheckoutSummary } from './checkout-summary'
import { CheckoutMobileBar } from './checkout-mobile-bar'

/**
 * Step 2 root. Owns its own scroll container so the mobile bottom bar can be
 * rendered as a sibling outside the scroll area — flex layout pins it to the
 * viewport bottom permanently, rather than relying on `position: sticky`
 * (which loses its anchor when the containing block ends above the viewport).
 */
export function PropertyCheckoutShell() {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 pb-8">
          <DetailPageLayoutBody className="mt-8">
            <DetailPageLayoutMain>
              <div className="flex flex-col gap-4 md:gap-6">
                <PropertySection />
                <RentDatesSection />
                <TenantsSection />
                <ExpensesSection />
                <CpfSection />
                <BankSection />
              </div>
            </DetailPageLayoutMain>

            <DetailPageLayoutSidebar className="md:sticky md:top-6">
              <CheckoutSummary className="hidden md:flex" />
            </DetailPageLayoutSidebar>
          </DetailPageLayoutBody>
        </div>
      </div>

      <CheckoutMobileBar className="md:hidden" />
    </>
  )
}
