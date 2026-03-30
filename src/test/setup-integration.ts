export async function setup() {
  const { execSync } = await import('child_process')
  try {
    const output = execSync('supabase status -o json', { encoding: 'utf8' })
    const status = JSON.parse(output)
    process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY
    process.env.SUPABASE_ANON_KEY = status.ANON_KEY
  } catch {
    throw new Error('Local Supabase is not running. Start it with: supabase start')
  }

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('profiles').select('id').limit(1)
  if (error) throw new Error(`Cannot reach local Supabase: ${error.message}`)
}
