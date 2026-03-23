import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HomeContent } from './home-content'
import { HomeSkeleton } from './home-skeleton'

export default async function AppHomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub as string

  // Fetch profile for greeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? undefined

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent firstName={firstName} />
    </Suspense>
  )
}
