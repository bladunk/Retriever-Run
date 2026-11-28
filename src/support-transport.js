import { campPublicConfig, fetchForCamp } from './camp-transport.js'

export function createSupportTransport({ settings = campPublicConfig, developer = false,
  load = () => import('@supabase/supabase-js') } = {}) {
  let client
  let signingIn
  const unavailable = { status: 'unavailable' }
  async function api() {
    if (!client) {
      client = load().then(({ createClient }) => createClient(settings.url, settings.key, {
        global: { fetch: fetchForCamp((...args) => fetch(...args), 8000) },
        db: { retry: false },
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: true,
          storage: developer ? globalThis.sessionStorage : globalThis.localStorage,
          storageKey: developer ? 'retriever-run.command.session' : 'retriever-run.feedback.session' },
      })).catch(error => { client = undefined; throw error })
    }
    return client
  }

  async function submissionIdentity(sdk) {
    if (!signingIn) signingIn = (async () => {
      const { data, error } = await sdk.auth.getSession()
      if (error) return false
      if (data.session) return true
      const response = await sdk.auth.signInAnonymously()
      return Boolean(response.data?.session)
    })().finally(() => { signingIn = undefined })
    return signingIn
  }

  async function call(name, args, submission = false) {
    if (!settings || globalThis.navigator?.onLine === false) return unavailable
    try {
      const sdk = await api()
      if (submission && !await submissionIdentity(sdk)) return { status: 'auth_unavailable' }
      const { data, error } = await sdk.rpc(name, args)
      if (error?.code === '42501') return { status: 'denied' }
      if (['PGRST202', '42883'].includes(error?.code)) return { status: 'not_configured' }
      return error || typeof data?.status !== 'string' ? unavailable : data
    } catch { return unavailable }
  }

  return {
    send: record => call('rr_support_submit', { p_record: record }, true),
    receipt: (receipt, action) => call('rr_support_receipt', { p_id: receipt.id, p_secret: receipt.secret, p_action: action }),
    inbox: filters => call('rr_support_inbox', { p_filters: filters }),
    detail: id => call('rr_support_detail', { p_id: id }),
    triage: (id, change) => call('rr_support_triage', { p_id: id, p_change: change }),
    remove: id => call('rr_support_owner_delete', { p_id: id }),
    async login(email, password) {
      if (!settings) return { status: 'not_configured' }
      try {
        const { error } = await (await api()).auth.signInWithPassword({ email, password })
        return { status: error ? 'denied' : 'ok' }
      } catch { return unavailable }
    },
    async logout() {
      try { await (await api()).auth.signOut({ scope: 'local' }) } catch { /* No live session available. */ }
    },
  }
}
