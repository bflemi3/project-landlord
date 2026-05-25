import * as React from 'react'
import { cn } from '@/lib/utils'

type IconTileSize = 'sm' | 'md' | 'lg'
type IconTileShape = 'square' | 'circle'
type IconTileTone =
  | 'primary'
  | 'muted'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive'
  | 'highlight'

const sizeClasses: Record<IconTileSize, string> = {
  sm: 'size-8 [&_svg]:size-4',
  md: 'size-9 [&_svg]:size-4',
  lg: 'size-10 [&_svg]:size-[18px]',
}

const shapeClasses: Record<IconTileShape, Record<IconTileSize, string>> = {
  square: {
    sm: 'rounded-lg',
    md: 'rounded-lg',
    lg: 'rounded-xl',
  },
  circle: {
    sm: 'rounded-full',
    md: 'rounded-full',
    lg: 'rounded-full',
  },
}

// Tones use the subtle paired tokens in globals.css for a tinted surface +
// darker readable glyph. `muted` stays quiet with the neutral muted pair.
const toneClasses: Record<IconTileTone, string> = {
  primary: 'bg-primary-subtle text-primary-subtle-foreground',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success-subtle text-success-subtle-foreground',
  warning: 'bg-warning-subtle text-warning-subtle-foreground',
  info: 'bg-info-subtle text-info-subtle-foreground',
  destructive: 'bg-destructive-subtle text-destructive-subtle-foreground',
  highlight: 'bg-highlight-subtle text-highlight-subtle-foreground',
}

function IconTile({
  className,
  size = 'md',
  shape = 'square',
  tone = 'primary',
  ...props
}: React.ComponentProps<'div'> & {
  size?: IconTileSize
  shape?: IconTileShape
  tone?: IconTileTone
}) {
  return (
    <div
      data-slot="icon-tile"
      data-size={size}
      data-shape={shape}
      data-tone={tone}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizeClasses[size],
        shapeClasses[shape][size],
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

export { IconTile }
