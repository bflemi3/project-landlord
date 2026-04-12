export interface PluggyWebhookEvent {
  event: 'item/created' | 'item/updated' | 'item/error'
  itemId: string
  eventId: string
  error?: { code: string; message: string }
}
