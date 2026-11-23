const config = typeof __CAMP_PUBLIC_CONFIG__ === 'undefined' ? null : __CAMP_PUBLIC_CONFIG__

export function fetchForCamp(fetcher, timeoutMs = 6500) {
  return async (resource, init = {}) => {
    const abort = new AbortController()
    const upstream = init.signal
    const cancel = () => abort.abort()
    if (upstream?.aborted) cancel()
    else upstream?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(cancel, timeoutMs)
    try {
      const result = await fetcher(resource, { ...init, signal: abort.signal })
      // Auth and RPC responses are short JSON. The timeout covers the body too.
      const body = [204, 205, 304].includes(result.status) ? null : await result.text()
      return new Response(body, { status: result.status, statusText: result.statusText, headers: result.headers })
    } finally {
      clearTimeout(timer)
      upstream?.removeEventListener('abort', cancel)
    }
  }
}

export function createCampTransport(settings = config, {
  loadSdk = () => import('@supabase/supabase-js'),
  storage = () => globalThis.localStorage,
  fetcher = (...args) => globalThis.fetch(...args),
} = {}) {
  if (!settings) return null
  const namespace = 'retriever-run.auth.' + new URL(settings.url).host
  const clients = new Map()
  const memory = new Map()
  const adapter = {
    getItem(key) {
      try { return storage().getItem(key) ?? memory.get(key) ?? null }
      catch { return memory.get(key) ?? null }
    },
    setItem(key, value) {
      memory.set(key, value)
      try { storage().setItem(key, value) } catch { /* Session lasts for the page. */ }
    },
    removeItem(key) {
      memory.delete(key)
      try { storage().removeItem(key) } catch { /* In-memory session removed. */ }
    },
  }
  const campFetch = fetchForCamp(fetcher)
  async function client(profile = 'public') {
    if (!clients.has(profile)) {
      const pending = loadSdk().then(({ createClient }) => createClient(settings.url, settings.key, {
        global: { fetch: campFetch },
        db: { retry: false },
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: profile !== 'public',
          storage: adapter,
          storageKey: namespace + '.' + profile,
        },
      })).catch(error => {
        clients.delete(profile)
        throw error
      })
      clients.set(profile, pending)
    }
    return clients.get(profile)
  }

  async function session(api) {
    const { data, error } = await api.auth.getSession()
    // A missing/invalid refresh token needs explicit reconnection. Transient
    // failures are propagated so the app never swaps identities on bad Wi-Fi.
    if (error && !['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error.code)
        && error.name !== 'AuthSessionMissingError') throw error
    return data?.session ?? null
  }

  async function rpc(api, name, args) {
    const { data, error } = await api.rpc(name, args)
    if (error || typeof data?.status !== 'string') throw new Error('camp_unavailable')
    return data
  }

  return {
    namespace,
    async nickname(profile, name) {
      const api = await client(profile)
      let active = await session(api)
      if (!active) {
        const { data, error } = await api.auth.signInAnonymously()
        if (error || !data.session?.user.id) return { status: 'auth_failed' }
        active = data.session
      }
      const result = await rpc(api, 'rr_camp_nickname', { p_nickname: name })
      return { ...result, identity: active.user.id }
    },
    async board(profile, owner, metric, offset, limit) {
      let api
      let reconnect = false
      if (owner) {
        const privateApi = await client(profile)
        try {
          if ((await session(privateApi))?.user.id === owner) api = privateApi
          else reconnect = true
        } catch { /* Public ranks are still useful during an auth outage. */ }
      }
      api ??= await client()
      const result = await rpc(api, 'rr_camp_board', { p_metric: metric, p_offset: offset, p_limit: limit })
      return { ...result, reconnect }
    },
    async submit(profile, owner, run) {
      const api = await client(profile)
      if ((await session(api))?.user.id !== owner) return { status: 'reconnect' }
      return rpc(api, 'rr_camp_submit', {
        p_run_id: run.id, p_score: run.score, p_distance: run.distance,
        p_retrieves: run.retrieves, p_duration_ms: run.durationMs,
      })
    },
  }
}
