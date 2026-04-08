const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = 'MABENN'
const SUFFIX_LENGTH = 4

export function generateInviteCode(): string {
  let suffix = ''
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `${PREFIX}-${suffix}`
}
