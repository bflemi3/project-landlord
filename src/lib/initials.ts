/**
 * Derive 1–2 character display initials for an avatar fallback.
 *
 * Falls back along: name → email → '?'. Single-word names produce one letter;
 * multi-word names use first + last word's leading letter (so "Maria da Silva"
 * → "MS", not "MD"). Whitespace is collapsed before splitting so stray double
 * spaces don't produce empty parts.
 */
export function getInitials(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim() ?? ''
  if (trimmedName.length > 0) {
    const parts = trimmedName.split(/\s+/)
    if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
  }

  const trimmedEmail = email?.trim() ?? ''
  if (trimmedEmail.length > 0) return trimmedEmail.charAt(0).toUpperCase()

  return '?'
}
