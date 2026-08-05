import { createClient } from '@supabase/supabase-js'

// Cliente com service_role — SOMENTE no servidor. Bypassa RLS.
// Usado para criar usuários no Auth e o perfil em public.usuarios.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
