import { PluggyClient } from 'pluggy-sdk'

let cachedClient: PluggyClient | null = null

export function getPluggyClient(): PluggyClient {
  if (cachedClient) return cachedClient

  cachedClient = new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID!,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
  })

  return cachedClient
}
