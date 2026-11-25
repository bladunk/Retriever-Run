import { huntHandler } from './handler.js'

Deno.serve(huntHandler({
  origin: Deno.env.get('SUPABASE_URL') ?? '',
  publishable: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  service: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
}))
