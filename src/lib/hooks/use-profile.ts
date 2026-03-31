'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  preferredLocale: string | null
  pixKey: string | null
  pixKeyType: string | null
}

async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, preferred_locale')
    .eq('id', user.id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    avatarUrl: data.avatar_url,
    preferredLocale: data.preferred_locale,
    pixKey: null, // TODO: add to profiles table when payment section is built
    pixKeyType: null,
  }
}

export function useProfile() {
  return useSuspenseQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })
}
