import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let vite, Overview, ApplicationsPanel, ProjectKeys
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  Overview = (await vite.ssrLoadModule('/src/pages/Overview.jsx')).default
  ApplicationsPanel = (await vite.ssrLoadModule('/src/pages/ApplicationsPanel.jsx')).default
  ProjectKeys = (await vite.ssrLoadModule('/src/pages/ProjectKeys.jsx')).default
})
after(async () => { await vite?.close() })
const render = state => renderToStaticMarkup(createElement(Overview, { state, onRefresh() {}, onApplications() {} }))
const project = { id: 'mafa', name: 'MAFACONNECT API' }
const ready = { projects: [project], applicationCount: 1, loading: false, refreshing: false, metricsLoading: false, error: '', statuses: { mafa: { data: { connected: false, span_count: 0, has_received: false } } } }
const card = (html, label) => html.split('<article').find(part => part.includes(`<p>${label}</p>`))

test('Overview renders one registered application and zero spans without claiming connection', () => {
  const html = render(ready)
  assert.match(card(html, 'Applications'), /<strong>1<\/strong>/)
  assert.match(card(html, 'HTTP Server Spans'), /<strong>0<\/strong>/)
  assert.match(card(html, 'Connected Applications'), /<strong>0<\/strong>/)
  assert.match(html, /2 of 3 complete/)
  assert.match(html, /67%/)
  assert.ok(!html.includes('20% Preview'))
  assert.ok(!html.includes('Log Events'))
  assert.ok(!html.includes('not connected to live data yet'))
})

test('Overview renders telemetry errors as unavailable while keeping the application count', () => {
  const html = render({ ...ready, statuses: { mafa: { error: 'Connection status failed' } } })
  assert.match(card(html, 'Applications'), /<strong>1<\/strong>/)
  assert.match(card(html, 'HTTP Server Spans'), /<strong>—<\/strong>/)
  assert.match(html, /role="alert"/)
  assert.match(html, /Connection status failed/)
})

test('Overview has real empty/loading states and only shows connected after verified status', () => {
  assert.match(render({ ...ready, projects: [], applicationCount: 0, statuses: {} }), /Add Your First Application/)
  const loading = render({ ...ready, projects: [], applicationCount: null, statuses: {}, loading: true, metricsLoading: true })
  assert.match(loading, /Loading your applications and telemetry/)
  assert.match(card(loading, 'Applications'), /<strong>—<\/strong>/)
  const connected = render({ ...ready, statuses: { mafa: { data: { connected: true, span_count: 4 } } } })
  assert.match(connected, /Your application is connected/)
  assert.match(connected, /100%/)
})

test('Applications uses the shared registered list and selects its first project on entry', () => {
  const html = renderToStaticMarkup(createElement(ApplicationsPanel, { user: { id: 'owner' }, projectState: ready, projectStore: {} }))
  assert.match(html, /MAFACONNECT API/)
  assert.match(html, /aria-pressed="true" class="to-app-selected"/)
  assert.match(html, /Generate ingestion key/)
})

test('key UI distinguishes missing displayed secret from three active keys and exposes only metadata', () => {
  const details={keys:Array.from({length:3},(_,i)=>({id:String(i),key_prefix:`to_live_TEST000${i}`,created_at:'2026-11-25T10:00:00Z',last_used_at:null,revoked_at:null,key_hash:'PRIVATE_HASH',secret:'OLD_SECRET'})),activeCount:3,maxActiveKeys:3,keysLoaded:true,keysLoading:false,keysError:''}
  const html=renderToStaticMarkup(createElement(ProjectKeys,{details}))
  assert.match(html,/No newly generated secret currently displayed/)
  assert.match(html,/Active ingestion keys \(3\/3\)/)
  assert.match(html,/datetime="2026-11-25T10:00:00Z"/i)
  assert.match(html,/Created:/)
  assert.match(html,/>Revoke<\/button>/)
  assert.match(html,/<button[^>]+disabled=""[^>]*>.*?Generate new key/)
  assert.ok(!html.includes('PRIVATE_HASH')&&!html.includes('OLD_SECRET'))
  assert.ok(!html.includes('<p>No active ingestion keys.</p>'))
  const failed=renderToStaticMarkup(createElement(ProjectKeys,{details:{...details,keys:[],activeCount:null,keysError:'read failed'}}))
  assert.match(failed,/Key metadata unavailable/)
  assert.ok(!failed.includes('<p>No active ingestion keys.</p>'))
})
