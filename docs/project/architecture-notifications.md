# Notification Architecture

**Date:** 2026-04-13
**Status:** Design — not yet implemented

---

## Overview

Mabenn needs a notification system that supports multiple event types across the product. Rather than building one-off notification logic per feature, this document defines a generic pattern that all features plug into.

---

## Event Types (initial)

| Event | Recipients | Channels | Triggered by |
|---|---|---|---|
| Provider request submitted | Engineering (via playground) | In-app (playground) | User uploads bill for unknown provider |
| Provider ready | Requesting user | Email + in-app | Engineering completes provider setup |
| Payment detected | LL + tenant | In-app | Open Finance transaction match |
| Rent overdue | LL + tenant | Email + in-app | Due date passed without payment detection |
| Contract adjustment reminder | LL + tenant | Email + in-app | Upcoming IPCA adjustment date |
| Contract expiration reminder | LL + tenant | Email + in-app | Upcoming contract end date |
| Bill extraction failed | Engineering (via playground) | In-app (playground) | Extraction produces errors or low confidence |
| User correction submitted | Engineering (via playground) | In-app (playground) | User corrects an extracted value |

This list will grow. The architecture should support new event types without schema changes.

---

## Database Schema

```sql
-- Core notification table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  type text not null,                    -- 'provider_ready', 'payment_detected', etc.
  channels text[] not null,              -- ['in_app', 'email']
  status text not null default 'pending', -- pending, sent, read, dismissed
  payload jsonb not null default '{}',   -- flexible per notification type
  created_at timestamptz not null default now(),
  sent_at timestamptz,                   -- when email was sent (null if in-app only)
  read_at timestamptz,                   -- when user read/opened it
  dismissed_at timestamptz               -- when user dismissed it
);

-- Index for querying unread notifications for a user
create index idx_notifications_user_unread 
  on notifications(user_id, status) 
  where status in ('pending', 'sent');
```

### Payload examples

```json
// provider_ready
{
  "provider_id": "enliv-campeche",
  "provider_name": "Enliv",
  "category": "electricity",
  "property_id": "uuid",
  "request_id": "uuid"
}

// payment_detected
{
  "charge_instance_id": "uuid",
  "provider_name": "Enliv",
  "amount": 21847,
  "currency": "BRL",
  "paid_date": "2026-04-05",
  "detection_source": "open_finance"
}

// rent_overdue
{
  "property_id": "uuid",
  "unit_id": "uuid",
  "amount": 300000,
  "currency": "BRL",
  "due_date": "2026-04-10",
  "days_overdue": 3
}
```

---

## How Notifications Are Created

Any part of the system can create a notification by inserting a row:

```typescript
await supabase.from('notifications').insert({
  user_id: recipientId,
  type: 'provider_ready',
  channels: ['in_app', 'email'],
  payload: { provider_name: 'Enliv', ... },
})
```

No notification service layer needed initially. Direct inserts are fine for MVP. If volume grows, we add a queue.

---

## How Notifications Are Delivered

### In-app

Client queries unread notifications on load:

```typescript
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .in('status', ['pending', 'sent'])
  .order('created_at', { ascending: false })
```

Optional: Supabase Realtime subscription for live updates (notification bell updates without refresh).

When user reads a notification:

```typescript
await supabase
  .from('notifications')
  .update({ status: 'read', read_at: new Date().toISOString() })
  .eq('id', notificationId)
```

### Email

A background process (Supabase Edge Function, cron, or triggered by insert) picks up notifications where `channels` includes `'email'` and `status = 'pending'`:

1. Query pending email notifications
2. Render email template based on `type` (using existing Resend + React Email setup)
3. Send via Resend
4. Update status to `'sent'`, set `sent_at`

Email templates are mapped by notification type. Each type has its own template in `src/emails/`.

---

## How Users Control Notifications

Future consideration — not MVP. Users may want to:
- Mute specific notification types
- Choose email vs in-app per type
- Set quiet hours

For now, all notifications are delivered on all channels. Add preferences later if users request it.

---

## RLS

- Users can only read their own notifications
- Users can only update status (read/dismissed) on their own notifications
- Inserts are done server-side (service role) — users cannot create notifications

---

## Integration Points

| Feature | Creates notification | When |
|---|---|---|
| Provider request system | `provider_ready` | Provider passes accuracy threshold |
| Payment matching | `payment_detected` | Open Finance transaction matched to bill |
| Contract management | `contract_adjustment_reminder`, `contract_expiration_reminder` | Scheduled based on contract dates |
| Late payment detection | `rent_overdue` | Due date passes without payment |
| Bill extraction | `extraction_failed` | Parser returns errors or low confidence |
| User corrections | `user_correction_submitted` | User modifies an extracted value |
