import test from 'node:test'
import assert from 'node:assert/strict'
import { createTraceExplorerStore, decodeSpans, defaultFilters, filterSpans, traceForest } from '../src/lib/traceExplorer.js'

const traceId = 'a'.repeat(32), otherTrace = 'b'.repeat(32), spanId = '1'.repeat(16)
const at = Date.parse('2026-11-26T12:00:00Z')
const row = overrides => ({ id: 'stored-row', started_at: new Date(at - 60000).toISOString(), received_at: new Date(at).toISOString(), service_name: 'mafaconnect-api', trace_id: traceId, span_id: spanId, http_method: 'GET', http_route: '/products/:id', http_status: 200, duration_ms: 12.5, span_error: false, ...overrides })
const tick = () => new Promise(resolve => setImmediate(resolve))

test('decodes legacy and advanced shapes, bounds the batch, and drops raw attributes and secrets', () => {
  const decoded = decodeSpans({ spans: [row({ secret: 'PRIVATE_KEY', key_hash: 'PRIVATE_HASH', attributes: { token: 'PRIVATE_TOKEN' } })] })
  assert.equal(decoded.spans[0].parent_span_id, null)
  assert.equal(decoded.truncated, false)
  assert.ok(!JSON.stringify(decoded).includes('PRIVATE'))
  assert.equal(decodeSpans({ spans: [], possibly_truncated: true }).truncated, true)
  assert.equal(decodeSpans({ spans: Array.from({ length: 100 }, (_, i) => row({ span_id: i.toString(16).padStart(15, '0') + '1' })) }).truncated, true)
  for (const result of [{ spans: Array(101).fill(row()) }, { spans: [row(), row()] }, { spans: [row({ http_method: {} })] }, { spans: [row({ trace_id: 'bad' })] }, { spans: [row({ duration_ms: -1 })] }, { spans: [row({ started_at: 'bad' })] }, { spans: [], possibly_truncated: 'false' }]) assert.throws(() => decodeSpans(result), /invalid|duplicate/)
  assert.throws(() => decodeSpans({ spans: [row()] }, otherTrace), /invalid spans/)
})

test('filters only loaded rows by time, status, error flag and supported text fields', () => {
  const spans = decodeSpans({ spans: [row(), row({ span_id: '2'.repeat(16), http_status: 404, http_method: 'POST', service_name: 'orders-api', http_route: '/orders/:id' }), row({ span_id: '3'.repeat(16), http_status: 500, span_error: true, started_at: new Date(at - 2 * 86400000).toISOString() })] }).spans
  assert.equal(filterSpans(spans, defaultFilters, at).length, 2)
  assert.equal(filterSpans(spans, { ...defaultFilters, range: 'all', status: 'error' }, at).length, 1)
  assert.equal(filterSpans(spans, { ...defaultFilters, status: '4xx' }, at).length, 1)
  assert.equal(filterSpans(spans, { ...defaultFilters, search: 'ORDERS', field: 'service' }, at).length, 1)
  assert.equal(filterSpans(spans, { ...defaultFilters, search: 'GET', field: 'method' }, at).length, 1)
  assert.equal(filterSpans(spans, { ...defaultFilters, search: '/products', field: 'endpoint' }, at).length, 1)
  assert.equal(filterSpans(spans, { ...defaultFilters, search: traceId, field: 'trace' }, at).length, 2)
  assert.equal(filterSpans(spans, { ...defaultFilters, search: spanId, field: 'span' }, at).length, 1)
  assert.equal(filterSpans(spans, { ...defaultFilters, search: 'missing' }, at).length, 0)
  assert.equal(filterSpans([row({ started_at: null, http_status: null })], { ...defaultFilters, status: 'unknown' }, at).length, 1)
})

test('loads only authenticated-client GET paths with limit 100 and an exact scoped trace query', async () => {
  const calls = []
  const store = createTraceExplorerStore({ request: async (path, options) => { calls.push({ path, options }); return { spans: [row()] } }, now: () => at })
  store.selectProject('owned-project'); await tick()
  store.selectProject('owned-project'); await tick()
  await store.openTrace(traceId)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].path, '/projects/owned-project/spans?limit=100')
  assert.equal(calls[1].path, `/projects/owned-project/spans?trace_id=${traceId}&limit=100`)
  assert.ok(calls.every(call => call.options.signal instanceof AbortSignal && !call.options.method && !call.path.includes('/keys')))
  assert.equal(store.getSnapshot().list.loadedAt, at)
  store.closeTrace(); assert.equal(store.getSnapshot().detail.traceId, null)
  assert.equal(store.getSnapshot().list.spans.length, 1)
  await store.openTrace('invalid'); assert.equal(calls.length, 2)
})

test('default transport reuses cookie authentication and never sends ingestion credentials', async () => {
  const originalFetch = globalThis.fetch, calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ spans: [row()] }), { status: 200 })
  }
  const store = createTraceExplorerStore()
  try {
    store.selectProject('owned'); await tick(); await store.openTrace(traceId)
    assert.equal(calls.length, 2)
    for (const { url, options } of calls) {
      assert.ok(url.startsWith('/api/monitoring/projects/owned/spans?'))
      assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'include'); assert.equal(options.cache, 'no-store')
      assert.equal(options.headers['x-to-project-key'], undefined)
    }
  } finally { store.cancel(); globalThis.fetch = originalFetch }
})

test('late lists and trace details cannot cross projects or replace newer detail selections', async () => {
  const pending = new Map()
  const store = createTraceExplorerStore({ request: (path, options) => new Promise(resolve => pending.set(path, { resolve, signal: options.signal })) })
  store.selectProject('old')
  const oldDetail = store.openTrace(traceId)
  store.selectProject('new')
  assert.equal(store.getSnapshot().list.spans.length, 0)
  assert.equal(store.getSnapshot().detail.traceId, null)
  pending.get('/projects/old/spans?limit=100').resolve({ spans: [row()] })
  pending.get(`/projects/old/spans?trace_id=${traceId}&limit=100`).resolve({ spans: [row()] })
  assert.equal(pending.get('/projects/old/spans?limit=100').signal.aborted, true)
  pending.get('/projects/new/spans?limit=100').resolve({ spans: [] })
  await oldDetail; await tick()
  assert.equal(store.getSnapshot().projectId, 'new')
  assert.deepEqual(store.getSnapshot().list.spans, [])
  const first = store.openTrace(traceId), second = store.openTrace(otherTrace)
  pending.get(`/projects/new/spans?trace_id=${otherTrace}&limit=100`).resolve({ spans: [row({ trace_id: otherTrace })] })
  await second
  pending.get(`/projects/new/spans?trace_id=${traceId}&limit=100`).resolve({ spans: [row()] })
  await first
  assert.equal(store.getSnapshot().detail.traceId, otherTrace)
  store.selectProject(null); assert.equal(store.getSnapshot().list.spans.length, 0)
})

test('failed refresh clears prior rows and retry can recover without fabricating successful detail', async () => {
  let failure = false
  const store = createTraceExplorerStore({ request: async () => { if (failure) throw new Error('Authentication required'); return { spans: [row()] } } })
  store.selectProject('owned'); await tick(); failure = true; await store.refresh()
  assert.equal(store.getSnapshot().list.spans.length, 0)
  assert.match(store.getSnapshot().list.error, /Authentication required/)
  await store.openTrace(traceId)
  assert.equal(store.getSnapshot().detail.loaded, false)
  assert.equal(store.getSnapshot().detail.spans.length, 0)
  failure = false; await store.refresh(); assert.equal(store.getSnapshot().list.spans.length, 1)
})

test('hierarchy retains children, missing parents, cycles and zero durations without inventing spans', () => {
  const child = row({ span_id: '2'.repeat(16), parent_span_id: spanId, span_kind: 'CLIENT', duration_ms: 0 })
  const missing = row({ span_id: '3'.repeat(16), parent_span_id: '9'.repeat(16) })
  const forest = traceForest([child, row(), missing])
  assert.deepEqual(forest.map(item => item.span.span_id), [spanId, child.span_id, missing.span_id])
  assert.equal(forest[1].depth, 1); assert.equal(forest[2].missingParent, true)
  const cycle = traceForest([row({ parent_span_id: child.span_id }), child])
  assert.equal(cycle.length, 2); assert.equal(cycle[0].detached, true)
  const deep = Array.from({ length: 100 }, (_, i) => row({ span_id: (i + 1).toString(16).padStart(16, '0'), parent_span_id: i ? i.toString(16).padStart(16, '0') : null }))
  assert.equal(traceForest(deep).at(-1).depth, 99)
})
