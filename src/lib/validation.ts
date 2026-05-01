const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ValidationFieldErrors<TFields> = {
  [K in keyof TFields]?: readonly string[]
} & {
  general?: readonly string[]
}

export interface ValidateState<TFields> {
  valid: boolean
  fields?: TFields
  errors?: ValidationFieldErrors<TFields>
}

/**
 * Returns true if the string is a valid email format.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export function zodIssuesToFieldErrors<TFields>(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): ValidationFieldErrors<TFields> {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'general')
    fieldErrors[key] ??= []
    fieldErrors[key]!.push(issue.message)
  }

  return fieldErrors as ValidationFieldErrors<TFields>
}
