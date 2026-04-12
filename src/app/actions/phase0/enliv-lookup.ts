'use server'

import { fetchEnlivDebitos } from '@/lib/providers/enliv/api-client'

export async function lookupEnlivDebitos(cpf: string) {
  try {
    const result = await fetchEnlivDebitos(cpf)
    return { success: true as const, data: result }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
