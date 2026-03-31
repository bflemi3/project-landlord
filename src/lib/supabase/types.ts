import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type TypedSupabaseClient = SupabaseClient<Database>
