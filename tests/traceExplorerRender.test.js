import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { defaultFilters } from '../src/lib/traceExplorer.js'
let vite, View, Detail, ApplicationSelector
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const components = await vite.ssrLoadModule('/src/pages/TraceExplorer.jsx')
  View = components.TraceExplorerView; Detail = components.TraceDetail
  ApplicationSelector = (await vite.ssrLoadModule('/src/pages/ApplicationSelector.jsx')).default
})
after(async () => { await vite?.close() })
const traceId = 'a'.repeat(32), spanId = '1'.repeat(16)
const span = { trace_id: traceId, span_id: spanId, parent_span_id: null, span_kind: 'SERVER', started_at: '2026-11-26T10:00:00Z', received_at: '2026-11-26T10:00:00Z', duration_ms: 12.5, service_name: 'mafaconnect-api', http_method: 'GET', http_route: '/products/:id', http_status: 200, span_error: false }
const projects = [{ id: 'mafa', name: 'MAFACONNECT API', environment: 'production' }, { id: 'other', name: 'Other API', environment: 'test' }]
const list = { spans: [span], loading: false, loaded: true, error: '', truncated: false, loadedAt: Date.parse(span.received_at) }
const props = { currentId: 'mafa', projectState: { projects, loading: false, error: '', applicationCount: 2 }, state: { projectId: 'mafa', list, detail: {} }, filters: { ...defaultFilters, range: 'all' } }
const render = changes => renderToStaticMarkup(createElement(View, { ...props, ...changes }))

test('Trace Explorer renders real supported fields, application choices and bounded filter scope', () => {
  const html = render()
  for (const value of ['Trace Explorer', 'MAFACONNECT API', 'Other API', 'mafaconnect-api', '/products/:id', '200', '12.5 ms', 'Open trace', traceId, '1 matching of 1 loaded', 'latest batch of up to 100', 'Search loaded spans']) assert.ok(html.includes(value), value)
  assert.ok(!html.includes('Log Explorer') && !html.includes('pagination token'))
  const selector = renderToStaticMarkup(createElement(ApplicationSelector, { projects, selectedId: 'other' }))
  assert.match(selector, /aria-pressed="true" class="to-app-selected"><span>Other API/)
})
test('renders project loading, no applications and failed project reads without stale traces', () => {
  assert.match(render({ projectState: { ...props.projectState, loading: true } }), /Loading your applications/)
  assert.match(render({ projectState: { ...props.projectState, projects: [] } }), /No applications registered/)
  const failed = render({ projectState: { ...props.projectState, error: 'Session expired' } })
  assert.match(failed, /role="alert"/); assert.match(failed, /Retry applications/)
  assert.ok(!failed.includes('mafaconnect-api'))
})
test('renders distinct list loading, storage error, empty and filtered-empty states', () => {
  const state = patch => ({ state: { ...props.state, list: { ...list, ...patch } } })
  assert.match(render(state({ loading: true })), /Loading HTTP server spans/)
  assert.match(render(state({ spans: [], loaded: false, error: 'Storage unavailable' })), /Retry traces/)
  assert.match(render(state({ spans: [] })), /No stored HTTP server spans returned/)
  assert.match(render({ filters: { ...props.filters, search: 'nothing' } }), /No loaded spans match/)
  assert.match(render(state({ truncated: true })), /not complete trace history; pagination is unavailable/)
})
test('trace detail renders correlated dependencies, gaps and allowlisted fields without raw data', () => {
  const child = { ...span, span_id: '2'.repeat(16), parent_span_id: spanId, span_kind: 'CLIENT', span_name: 'mysql SELECT', http_method: null, http_route: null, http_status: null, db_system: 'mysql', db_operation: 'SELECT', span_error: true, error_type: 'TimeoutError', secret: 'DO_NOT_EXPOSE', attributes: { sql: 'DO_NOT_EXPOSE' } }
  const orphan = { ...span, span_id: '3'.repeat(16), parent_span_id: '9'.repeat(16) }
  const html = renderToStaticMarkup(createElement(Detail, { detail: { ...list, traceId, spans: [span, child, orphan], truncated: true } }))
  for (const text of ['mysql SELECT', 'CLIENT', 'Parent span not returned', 'Trace results may be truncated', 'TimeoutError', 'Database operation', 'Parent span ID']) assert.ok(html.includes(text), text)
  assert.match(html, /--te-depth:1/)
  assert.ok(!html.includes('DO_NOT_EXPOSE'))
})
test('trace detail reports loading, unsupported reads, expiration and absence of dependencies honestly', () => {
  const renderDetail = patch => renderToStaticMarkup(createElement(Detail, { detail: { ...list, traceId, ...patch } }))
  assert.match(renderDetail({ spans: [], loading: true }), /Loading available trace spans/)
  assert.match(renderDetail({ spans: [], loaded: false, error: 'Valid trace_id requires advanced tracing' }), /advanced read capability/)
  assert.match(renderDetail({ spans: [] }), /No spans returned for this trace/)
  assert.match(renderDetail({}), /does not prove the request had no dependencies/)
})


test('request education renders safe unknown outcomes, visible timing bars and native keyboard controls', async () => {
  const { RequestInsights } = await vite.ssrLoadModule('/src/pages/DatabaseInsights.jsx')
  const { default: Learn, Help } = await vite.ssrLoadModule('/src/pages/LearnMonitoring.jsx')
  const child = { ...span, span_id:'2'.repeat(16), span_kind:'CLIENT', db_system:'mysql', db_operation:'query', http_method:null, duration_ms:600, parent_span_id:'9'.repeat(16) }
  const html = renderToStaticMarkup(createElement(RequestInsights,{spans:[span,child],projectId:'mafa',truncated:true}))
  for (const text of ['Slow database call','Unknown','Browser-only','Parent span not returned','role="img"','<summary>','response limit','HTTP request']) assert.ok(html.includes(text),text)
  assert.ok(!html.includes('Success'))
  const help = renderToStaticMarkup(createElement(Help,{term:'Database latency'}))
  for (const text of ['aria-label="Learn about Database latency"','Why it matters','Example:','Investigate:']) assert.ok(help.includes(text),text)
  const glossary = renderToStaticMarkup(createElement(Learn))
  for (const text of ['type="search"','P95 and P99','HTTP status codes','N+1 query patterns','Correlation and causation']) assert.ok(glossary.includes(text),text)
})
