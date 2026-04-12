import { getPluggyClient } from '@/lib/pluggy/client'

export async function POST(req: Request) {
  const pluggy = getPluggyClient()
  const { clientUserId } = await req.json()

  const connectToken = await pluggy.createConnectToken({
    clientUserId,
  })

  return Response.json({ accessToken: connectToken.accessToken })
}
