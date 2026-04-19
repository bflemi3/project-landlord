import * as React from 'react'
import { cn } from '@/lib/utils'

type IconTileSize = 'sm' | 'md' | 'lg'
type IconTileTone =
  | 'primary'
  | 'muted'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'

const sizeClasses: Record<IconTileSize, string> = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-9 rounded-lg [&_svg]:size-4',
  lg: 'size-10 rounded-xl [&_svg]:size-5',
}

// Tones use the subtle status tokens in globals.css for status variants,
// bg-secondary for default primary accents, and bg-muted for quiet ones.
const toneClasses: Record<IconTileTone, string> = {
  primary: 'bg-secondary text-primary',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success-subtle text-success-subtle-foreground',
  warning: 'bg-warning-subtle text-warning-subtle-foreground',
  info: 'bg-info-subtle text-info-subtle-foreground',
  destructive: 'bg-destructive-subtle text-destructive-subtle-foreground',
}

function IconTile({
  className,
  size = 'md',
  tone = 'primary',
  ...props
}: React.ComponentProps<'div'> & {
  size?: IconTileSize
  tone?: IconTileTone
}) {
  return (
    <div
      data-slot="icon-tile"
      data-size={size}
      data-tone={tone}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

export { IconTile }
