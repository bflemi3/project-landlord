'use client'

import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

function Input({
  className,
  type,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: React.ComponentProps<'input'>) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [internalValue, setInternalValue] = React.useState(
    (value as string) ?? (defaultValue as string) ?? '',
  )

  // Sync internal state when controlled value changes
  const isControlled = value !== undefined
  const currentValue = isControlled ? (value as string) : internalValue
  const nonClearableTypes = [
    'file',
    'date',
    'datetime-local',
    'time',
    'range',
    'color',
    'checkbox',
    'radio',
    'hidden',
  ]
  const showClear =
    !nonClearableTypes.includes(type ?? 'text') && currentValue.length > 0 && !disabled

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) {
      setInternalValue(e.target.value)
    }
    onChange?.(e)
  }

  function handleClear() {
    const input = inputRef.current
    if (!input) return

    // Create a synthetic event to trigger onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set
    nativeInputValueSetter?.call(input, '')
    const event = new Event('input', { bubbles: true })
    input.dispatchEvent(event)

    if (!isControlled) {
      setInternalValue('')
    }

    input.focus()
  }

  return (
    <div className="relative">
      <InputPrimitive
        ref={inputRef}
        type={type}
        data-slot="input"
        value={isControlled ? value : internalValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-12 w-full min-w-0 rounded-2xl border bg-transparent px-4 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3',
          showClear && 'pr-10',
          className,
        )}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleClear}
          // `after:-inset-2` extends the invisible hit area to ~36×36px without
          // changing the visible icon size — comfortable for thumb taps.
          className="text-muted-foreground/50 hover:text-muted-foreground absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors after:absolute after:-inset-2"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export { Input }
