import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const RESEND_FROM = 'mabenn <noreply@mabenn.com>'
export const RESEND_REPLY_TO = 'hello@mabenn.com'
export const RESEND_WAITLIST_SEGMENT_ID = process.env.RESEND_WAITLIST_SEGMENT_ID!
