import * as React from 'react'

import { cn } from '@/lib/utils'

type CardSize = 'sm' | 'md' | 'lg' | 'xl' | 'compound' | 'none'
type CardVariant = 'solid' | 'dashed'

const sizeClasses: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-7',
  compound: 'py-5',
  none: '',
}

const variantClasses: Record<CardVariant, string> = {
  solid: 'border border-transparent dark:border-border',
  dashed: 'border border-dashed border-border',
}

type CardShellOptions = {
  size?: CardSize
  variant?: CardVariant
  interactive?: boolean
  className?: string
}

function cardShellClassName({
  size = 'md',
  variant = 'solid',
  interactive = false,
  className,
}: CardShellOptions = {}) {
  return cn(
    'rounded-card bg-card text-card-foreground shadow-card dark:shadow-none overflow-hidden',
    sizeClasses[size],
    variantClasses[variant],
    interactive && 'transition-all hover:shadow-card-hover dark:hover:border-primary/30',
    className,
  )
}

function Card({
  className,
  size = 'md',
  variant = 'solid',
  interactive = false,
  ...props
}: React.ComponentProps<'div'> & CardShellOptions) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cardShellClassName({ size, variant, interactive, className })}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min items-start gap-1 px-5',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        'has-data-[slot=card-description]:grid-rows-[auto_auto]',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-base leading-snug font-medium', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-5', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center border-t border-border px-5 pt-4', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardShellClassName,
}
export type { CardSize, CardVariant, CardShellOptions }
