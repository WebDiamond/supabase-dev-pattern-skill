// src/lib/supabase.js
// SERVICE_ROLE_KEY — bypassa RLS, solo backend. Mai esporre al client.
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default supabase
