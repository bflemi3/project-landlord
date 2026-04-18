import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateAndFetchInviteContext } from '@/app/actions/validate-invite'
import { redeemInviteByCodeCore } from '@/data/profiles/actions/redeem-invite-by-code'
import SignUpForm from './sign-up-form'

interface SignUpPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { code } = await searchParams

  // No code in URL — render the form with step 1 (code entry)
  if (!code) {
    return <SignUpForm />
  }

  // Check if user is already authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Already logged in — redeem the code, refresh JWT so middleware sees
    // has_redeemed_invite on the /app request, then redirect.
    const result = await redeemInviteByCodeCore(supabase, user.id, code)
    if (result.success) {
      await supabase.auth.refreshSession()
    }
    redirect('/app')
  }

  // Validate the code and fetch context
  const context = await validateAndFetchInviteContext(code)

  if (!context.valid) {
    return <SignUpForm codeError={context.reason} />
  }

  return (
    <SignUpForm
      prevalidatedCode={context.code}
      invitedEmail={context.invitedEmail}
      propertyName={context.propertyName ?? undefined}
    />
  )
}
