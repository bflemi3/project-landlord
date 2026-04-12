import type { PluggyWebhookEvent } from '@/lib/pluggy/types'

export async function POST(req: Request) {
  const event: PluggyWebhookEvent = await req.json()

  console.log('[Pluggy Webhook]', event.event, event.itemId)

  switch (event.event) {
    case 'item/created':
      console.log('[Pluggy] Item created:', event.itemId)
      break
    case 'item/updated':
      console.log('[Pluggy] Item updated:', event.itemId)
      break
    case 'item/error':
      console.error('[Pluggy] Item error:', event.itemId, event.error)
      break
  }

  return Response.json({ received: true })
}
