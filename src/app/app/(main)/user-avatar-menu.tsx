import { FadeIn } from '@/components/fade-in'
import { UserMenuTrigger } from '@/components/user-menu'
import { getProfile } from '@/data/profiles/server'

export async function UserAvatarMenu() {
  const profile = await getProfile()
  return (
    <FadeIn>
      <div id="app-avatar" className="fixed top-4 right-8 z-30 hidden md:block">
        <UserMenuTrigger
          userName={profile?.fullName ?? undefined}
          avatarUrl={profile?.avatarUrl ?? undefined}
        />
      </div>
    </FadeIn>
  )
}
