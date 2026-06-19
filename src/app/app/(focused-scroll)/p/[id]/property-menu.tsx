'use client'

import { Suspense, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Ellipsis, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ResponsivePopover } from '@/components/responsive-popover'
import { ResponsiveModal } from '@/components/responsive-modal'
import { useProperty } from '@/data/properties/client'
import { deletePropertyAction } from '@/data/properties/actions/delete-property'

// Header overflow menu — popover on desktop, bottom sheet on mobile
// (ResponsivePopover). Destructive actions live here, out of the page body.
export function PropertyMenu({ propertyId }: { propertyId: string }) {
  const t = useTranslations('property.menu')
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <ResponsivePopover open={menuOpen} onOpenChange={setMenuOpen}>
        <ResponsivePopover.Trigger
          render={
            <Button variant="ghost" size="icon" aria-label={t('open')}>
              <Ellipsis />
            </Button>
          }
        />
        <ResponsivePopover.Content title={t('open')} className="w-56 p-1.5" align="end">
          <div className="flex flex-col px-3 pb-3 md:p-0">
            <button
              type="button"
              className="text-destructive hover:bg-destructive-subtle flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0"
              onClick={() => {
                setMenuOpen(false)
                setDeleteOpen(true)
              }}
            >
              <Trash2 />
              {t('delete')}
            </button>
          </div>
        </ResponsivePopover.Content>
      </ResponsivePopover>

      {deleteOpen ? (
        <Suspense fallback={null}>
          <DeletePropertyDialog
            propertyId={propertyId}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </Suspense>
      ) : null}
    </>
  )
}

function DeletePropertyDialog({
  open,
  propertyId,
  onOpenChange,
}: {
  open: boolean
  propertyId: string
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('property.deleteDialog')
  const [isPending, startTransition] = useTransition()
  const { data: property } = useProperty(propertyId)

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModal.Header>
        <ResponsiveModal.Title>{t('title', { name: property.name })}</ResponsiveModal.Title>
        <ResponsiveModal.Description>{t('description')}</ResponsiveModal.Description>
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
          {t('confirm')}
        </Button>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
          {t('cancel')}
        </Button>
      </ResponsiveModal.Footer>
    </ResponsiveModal>
  )
}
