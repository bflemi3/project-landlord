/**
 * Minimal Pluggy API types covering only the fields we read.
 * Reference: https://docs.pluggy.ai/reference
 */

export type PluggyItemStatus =
  | 'CREATED'
  | 'UPDATING'
  | 'LOGIN_IN_PROGRESS'
  | 'WAITING_USER_INPUT'
  | 'WAITING_USER_ACTION'
  | 'UPDATED'
  | 'OUTDATED'
  | 'ERROR'
  | 'LOGIN_ERROR'
  | 'MERGING'
  | 'DELETED'

export type PluggyItem = {
  id: string
  status: PluggyItemStatus
  connector: {
    id: number
    name: string
    institutionUrl?: string
    imageUrl?: string
    primaryColor?: string
    country?: string
  }
}

export type PluggyAccount = {
  id: string
  type: string
  subtype?: string | null
  name: string
  marketingName?: string | null
  number?: string | null
  currencyCode: string
}

export type PluggyConnectTokenResponse = {
  accessToken: string
}

export type PluggyAuthResponse = {
  apiKey: string
}

export type PluggyAccountsResponse = {
  results: PluggyAccount[]
}
