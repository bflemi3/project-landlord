'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/responsive-modal'
import { deletePropertyAction } from '@/data/properties/actions/delete-property'

export function DeletePropertyButton({
  propertyId,
  propertyName,
}: {
  propertyId: string
  propertyName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete property
      </Button>
      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModal.Header>
          <ResponsiveModal.Title>Delete {propertyName}?</ResponsiveModal.Title>
          <ResponsiveModal.Description>
            This permanently removes the property, units, rent, contracts, expenses, memberships,
            and invitations. Tenants and landlords keep their accounts.
          </ResponsiveModal.Description>
        </ResponsiveModal.Header>
        <ResponsiveModal.Footer className="flex flex-col gap-2">
          <Button
            variant="destructive"
            loading={isPending}
            onClick={() => {
              startTransition(async () => {
                await deletePropertyAction(propertyId)
              })
            }}
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
        </ResponsiveModal.Footer>
      </ResponsiveModal>
    </>
  )
}
