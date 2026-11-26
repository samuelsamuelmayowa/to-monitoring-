import { monitoringRequest } from './monitoringApi.js'

export function keyMetadata(result) {
  if (!Array.isArray(result?.keys)) throw new Error('Invalid key metadata response.')
  const keys = result.keys.map(key => {
    if (typeof key?.id !== 'string' || typeof key.key_prefix !== 'string') throw new Error('Invalid key metadata response.')
    // Never retain accidental extra response fields such as hashes or secrets.
    return { id: key.id, key_prefix: key.key_prefix, created_at: key.created_at,
      last_used_at: key.last_used_at ?? null, revoked_at: key.revoked_at ?? null }
  })
  const active = keys.filter(key => !key.revoked_at).length
  const count = result.active_count ?? (keys.length < 50 ? active : null)
  if (count !== null && (!Number.isSafeInteger(count) || count < active)) throw new Error('Invalid active key count.')
  return { keys, activeCount: count, maxActiveKeys: 3 }
}

export function connectionMessage(details) {
  if (details.statusError) return `Connection error — ${details.statusError}`
  if (!details.status) return 'Checking connection…'
  if (details.status.connected) return 'Connected — authenticated HTTP server spans received in the last 10 minutes'
  if (details.status.has_received) return 'Not connected — no trace received in the last 10 minutes'
  if (!details.keysLoaded || details.keysLoading) return 'Not connected — checking active ingestion keys'
  if (details.keysError || details.activeCount === null) return 'Not connected — active-key status unavailable; refresh key metadata'
  return details.activeCount > 0
    ? 'Waiting for telemetry — an active ingestion key exists; start your instrumented application'
    : 'Not connected — no active ingestion keys; generate a key to begin'
}

// Read-only controller: selection + asynchronous metadata/status requests. No
// creation or revocation is ever triggered by selecting, polling, or retrying.
export function createApplicationDetails({ request = monitoringRequest, onStatus = () => {}, onStatusError = () => {} } = {}) {
  let state = { projectId: null, keys: [], activeCount: null, maxActiveKeys: 3,
    keysLoading: false, keysLoaded: false, keysError: '', status: null, statusLoading: false, statusError: '' }
  let selection = 0, keyRequest = 0, statusRequest = 0, keysAbort, statusAbort
  const listeners = new Set()
  const update = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()) }
  function cancel() { selection++; keysAbort?.abort(); statusAbort?.abort() }
  async function refreshKeys() {
    if (!state.projectId) return
    const id = state.projectId, version = selection, requestId = ++keyRequest
    keysAbort?.abort(); keysAbort = new AbortController()
    const signal = keysAbort.signal
    update({ keysLoading: true, keysError: '' })
    try {
      const result = keyMetadata(await request(`/projects/${encodeURIComponent(id)}/keys`, { signal }))
      if (version !== selection || requestId !== keyRequest) return
      update({ ...result, keysLoaded: true, keysLoading: false })
    } catch (error) {
      if (version !== selection || requestId !== keyRequest || signal.aborted) return
      update({ keys: [], keysLoading: false, keysLoaded: true, activeCount: null, keysError: error.message || 'Key metadata could not be loaded.' })
    }
  }
  async function refreshStatus() {
    if (!state.projectId) return
    const id = state.projectId, version = selection, requestId = ++statusRequest
    statusAbort?.abort(); statusAbort = new AbortController()
    const signal = statusAbort.signal
    update({ statusLoading: true, statusError: '' })
    try {
      const status = await request(`/projects/${encodeURIComponent(id)}/status`, { signal })
      if (typeof status?.connected !== 'boolean' || !Number.isSafeInteger(status.span_count) || status.span_count < 0) throw new Error('Invalid connection status response.')
      if (version !== selection || requestId !== statusRequest) return
      update({ status, statusLoading: false }); onStatus(id, status)
    } catch (error) {
      if (version !== selection || requestId !== statusRequest || signal.aborted) return
      const message = error.message || 'Connection status could not be loaded.'
      update({ status: null, statusLoading: false, statusError: message }); onStatusError(id, message)
    }
  }
  function selectProject(id) {
    // Re-selecting the same application must not erase its known active keys.
    if (id === state.projectId) return
    cancel()
    update({ projectId: id, keys: [], activeCount: null, keysLoaded: false, keysError: '',
      keysLoading: false, status: null, statusError: '', statusLoading: false })
    if (id) { void refreshKeys(); void refreshStatus() }
  }
  async function refresh() { await Promise.all([refreshKeys(), refreshStatus()]) }
  return { getSnapshot: () => state, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    selectProject, refreshKeys, refreshStatus, refresh, cancel }
}
