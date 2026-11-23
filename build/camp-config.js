export function publicCampConfig(env) {
  const url = env.SUPABASE_URL?.trim()
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url && !key) return null
  let endpoint
  try { endpoint = new URL(url) } catch { throw new Error('Set SUPABASE_URL to your Supabase project HTTPS URL.') }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      endpoint.pathname !== '/') {
    throw new Error('Set SUPABASE_URL to the bare Supabase project HTTPS URL.')
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key ?? '')) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key starting with sb_publishable_.')
  }
  return { url: endpoint.origin, key }
}
