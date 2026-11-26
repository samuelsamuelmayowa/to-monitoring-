import { monitoringRequest } from './monitoringApi.js'

const TRACE = /^(?!0{32}$)[0-9a-f]{32}$/
const SPAN = /^(?!0{16}$)[0-9a-f]{16}$/
const fields = ['id', 'received_at', 'started_at', 'service_name', 'trace_id', 'span_id', 'http_method', 'http_route', 'http_status', 'duration_ms', 'span_error', 'parent_span_id', 'span_kind', 'span_name', 'environment', 'service_version', 'db_system', 'db_operation', 'error_type']
export const defaultFilters = { range: '24h', status: 'all', field: 'all', search: '' }
const ranges = { '15m': 900000, '1h': 3600000, '24h': 86400000, '7d': 604800000 }
const searchFields = { service: ['service_name'], endpoint: ['http_route'], method: ['http_method'], trace: ['trace_id'], span: ['span_id'], all: ['service_name', 'http_route', 'http_method', 'trace_id', 'span_id'] }

export function decodeSpans(result, traceId) {
  if (!Array.isArray(result?.spans) || result.spans.length > 100 || result.possibly_truncated !== undefined && typeof result.possibly_truncated !== 'boolean') throw new Error('The trace response is invalid.')
  const seen = new Set()
  const spans = result.spans.map(row => {
    if (!row || !TRACE.test(row.trace_id) || !SPAN.test(row.span_id) || traceId && row.trace_id !== traceId
      || typeof row.service_name !== 'string' || typeof row.span_error !== 'boolean'
      || row.parent_span_id != null && !SPAN.test(row.parent_span_id)
      || row.duration_ms != null && !(typeof row.duration_ms === 'number' && Number.isFinite(row.duration_ms) && row.duration_ms >= 0)
      || row.http_status != null && !(Number.isInteger(row.http_status) && row.http_status >= 100 && row.http_status <= 599)
      || ['id', 'http_method', 'http_route', 'span_name', 'environment', 'service_version', 'db_system', 'db_operation', 'error_type'].some(key => row[key] != null && (typeof row[key] !== 'string' || row[key].length > 200))
      || row.span_kind != null && !['SERVER', 'CLIENT'].includes(row.span_kind)
      || !row.started_at && !row.received_at
      || ['received_at', 'started_at'].some(key => row[key] != null && (typeof row[key] !== 'string' || !Number.isFinite(Date.parse(row[key]))))) throw new Error('The trace response contains invalid spans.')
    const key = `${row.trace_id}:${row.span_id}`
    if (seen.has(key)) throw new Error('The trace response contains duplicate spans.')
    seen.add(key)
    // Do not cache arbitrary server fields, key data, or raw attributes.
    return Object.fromEntries(fields.map(key => [key, row[key] ?? null]))
  })
  return { spans, truncated: result.possibly_truncated === true || spans.length === 100 }
}

export function spanTime(span) { return Date.parse(span.started_at || span.received_at) }
export function filterSpans(spans, filters, now = Date.now()) {
  const query = filters.search.trim().toLowerCase()
  return spans.filter(span => {
    const age = now - spanTime(span)
    if (ranges[filters.range] && (!Number.isFinite(age) || age > ranges[filters.range] || age < -300000)) return false
    if (filters.status === 'error' && !span.span_error) return false
    if (/^[2-5]xx$/.test(filters.status) && Math.floor(span.http_status / 100) !== Number(filters.status[0])) return false
    if (filters.status === 'unknown' && span.http_status !== null) return false
    return !query || (searchFields[filters.field] || searchFields.all).some(key => String(span[key] ?? '').toLowerCase().includes(query))
  })
}

// A forest, not a fabricated complete trace. Preserve missing parents and break
// cycles iteratively; an untrusted graph must never cause recursive overflow.
export function traceForest(spans) {
  const byId = new Map(spans.map(span => [span.span_id, span]))
  const children = new Map(), roots = []
  for (const span of spans) {
    const parent = span.parent_span_id
    if (!parent || !byId.has(parent) || parent === span.span_id) roots.push(span)
    else { const group = children.get(parent) || []; group.push(span); children.set(parent, group) }
  }
  const output = [], visited = new Set()
  function walk(root) {
    const stack = [{ span: root, depth: 0 }]
    while (stack.length) {
      const { span, depth } = stack.pop()
      if (visited.has(span.span_id)) continue
      visited.add(span.span_id)
      output.push({ span, depth, missingParent: !!span.parent_span_id && !byId.has(span.parent_span_id), detached: depth === 0 && !!span.parent_span_id && byId.has(span.parent_span_id) })
      const group = [...(children.get(span.span_id) || [])].sort((a, b) => spanTime(a) - spanTime(b))
      for (let i = group.length - 1; i >= 0; i--) stack.push({ span: group[i], depth: depth + 1 })
    }
  }
  roots.sort((a, b) => spanTime(a) - spanTime(b)).forEach(walk)
  spans.forEach(span => { if (!visited.has(span.span_id)) walk(span) })
  return output
}

const emptyList = () => ({ spans: [], loading: false, loaded: false, error: '', truncated: false, loadedAt: null })
const emptyDetail = () => ({ ...emptyList(), traceId: null })
export function createTraceExplorerStore({ request = monitoringRequest, now = Date.now } = {}) {
  let state = { projectId: null, list: emptyList(), detail: emptyDetail() }
  let listVersion = 0, detailVersion = 0, listAbort, detailAbort
  const listeners = new Set()
  const update = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()) }
  function cancel() { listVersion++; detailVersion++; listAbort?.abort(); detailAbort?.abort() }
  async function refresh() {
    const projectId = state.projectId
    if (!projectId) return
    listAbort?.abort(); listAbort = new AbortController()
    const signal = listAbort.signal, version = ++listVersion
    update({ list: { ...emptyList(), loading: true } })
    try {
      const result = decodeSpans(await request(`/projects/${encodeURIComponent(projectId)}/spans?limit=100`, { signal }))
      if (version !== listVersion || signal.aborted) return
      update({ list: { ...result, loaded: true, loading: false, error: '', loadedAt: now() } })
    } catch (error) {
      if (version !== listVersion || signal.aborted) return
      update({ list: { ...emptyList(), error: error.message || 'Unable to load traces.' } })
    }
  }
  function selectProject(projectId) {
    if (projectId === state.projectId) return
    cancel(); update({ projectId, list: emptyList(), detail: emptyDetail() })
    if (projectId) void refresh()
  }
  function closeTrace() { detailVersion++; detailAbort?.abort(); update({ detail: emptyDetail() }) }
  async function openTrace(traceId) {
    if (!state.projectId) return
    if (!TRACE.test(traceId)) { closeTrace(); update({ detail: { ...emptyDetail(), error: 'Invalid trace ID.' } }); return }
    detailAbort?.abort(); detailAbort = new AbortController()
    const signal = detailAbort.signal, version = ++detailVersion, projectId = state.projectId
    update({ detail: { ...emptyDetail(), traceId, loading: true } })
    try {
      const result = decodeSpans(await request(`/projects/${encodeURIComponent(projectId)}/spans?trace_id=${traceId}&limit=100`, { signal }), traceId)
      if (version !== detailVersion || signal.aborted) return
      update({ detail: { ...result, traceId, loaded: true, loading: false, error: '', loadedAt: now() } })
    } catch (error) {
      if (version !== detailVersion || signal.aborted) return
      update({ detail: { ...emptyDetail(), traceId, error: error.message || 'Unable to load this trace.' } })
    }
  }
  return { getSnapshot: () => state, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }, selectProject, refresh, openTrace, closeTrace, cancel }
}
