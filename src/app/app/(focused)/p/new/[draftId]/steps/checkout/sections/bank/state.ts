// Bank is a placeholder until its data model lands.

export type BankTouched = ReadonlySet<string>

/** Server-error slice for this section. */
export type BankServerErrors = Record<string, string[]>

export function defaultBankServerErrors(): BankServerErrors {
  return {}
}

export function isValid(): boolean {
  return true
}

export function isDefault(): boolean {
  return true
}

export function defaultTouched(): BankTouched {
  return new Set()
}

export function setAllTouched(prev: BankTouched): BankTouched {
  return prev
}
