import { createClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/fade-in'
import { HomeContent } from './home-content'

export default async function AppHomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? undefined

  return (
    <FadeIn className="h-full">
      <HomeContent
        firstName={firstName}
        userName={profile?.full_name ?? undefined}
        avatarUrl={profile?.avatar_url ?? undefined}
      />
    </FadeIn>
  )
}
