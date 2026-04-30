import { cn } from "@/lib/utils"

type ErrorHintProps = {
  className?: string
  error: string
  field: string
}
export function ErrorHint({ className, field, error }: ErrorHintProps) {
  return (
    <p id={`${field}-error`} role="alert" className={cn("text-destructive text-sm", className)}>
      {error}
    </p>
  )
}