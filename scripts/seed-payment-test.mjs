#!/usr/bin/env node
/**
 * Seed a landlord + property + rent + connected bank account for the live
 * webhook harness (scripts/test-payment-matching.sh). Prints the rent id.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=… SUPABASE_ANON_KEY=… node scripts/seed-payment-test.mjs
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const URL = 'http://127.0.0.1:54321'
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.SUPABASE_ANON_KEY
if (!SR || !ANON) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY')

const admin = createClient(URL, SR)
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const email = `seed-${suffix}@test.local`
const password = 'test-password-123!'

const { data: u, error: ue } = await admin.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { full_name: 'Seed Landlord' },
})
if (ue) throw new Error(`createUser: ${ue.message}`)
const userId = u.user.id

const client = createClient(URL, ANON)
const { error: se } = await client.auth.signInWithPassword({ email, password })
if (se) throw new Error(`signIn: ${se.message}`)

const propertyId = crypto.randomUUID()
const { data: prop, error: pe } = await client.rpc('create_property', {
  p_property_id: propertyId,
  p_property: { name: 'Seed Property', country_code: 'BR', street: 'Rua Teste', number: '123', city: 'Sao Paulo', state: 'SP', postal_code: '01310100' },
  p_unit: { name: 'Seed Unit', currency: 'BRL' },
})
if (pe) throw new Error(`create_property: ${pe.message}`)
const unitId = prop.unit_id

const { data: rent, error: re } = await client
  .from('rent')
  .insert({ unit_id: unitId, amount_minor: 250_000, currency: 'BRL', due_day_of_month: 5, start_date: '2026-06-01', end_date: '2026-11-30', created_by: userId })
  .select('id').single()
if (re) throw new Error(`insert rent: ${re.message}`)

const { error: be } = await client.rpc('register_bank_item', {
  p_pluggy_item_id: `pluggy-item-${suffix}`,
  p_institution_id: '201',
  p_institution_name: 'Pluggy Bank BR (sandbox)',
  p_accounts: [{ pluggy_account_id: `pluggy-acct-${suffix}`, account_type: 'BANK', account_subtype: 'CHECKING_ACCOUNT', name: 'Conta corrente', masked_number: '****1234', currency_code: 'BRL' }],
})
if (be) throw new Error(`register_bank_item: ${be.message}`)

// Only the rent id on stdout, so the caller can capture it.
process.stdout.write(rent.id)
