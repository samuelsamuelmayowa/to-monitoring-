import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceOverviewStore, summarizeWorkspace } from '../src/lib/workspaceOverview.js'

const project = { id: 'mafa-project', name: 'MAFACONNECT API' }
const idle = { connected: false, has_received: false, last_seen_at: null, span_count: 0 }
const tick = () => new Promise(resolve => setImmediate(resolve))
function setup(projects = [project], statuses = { [project.id]: idle }, total = projects.length) {
  const calls = []
  const store = createWorkspaceOverviewStore({ request: async (path, options) => {
    calls.push({ path, options })
    if (path === '/projects') return { projects, total }
    const id = decodeURIComponent(path.split('/')[2])
    const response = statuses[id]
    if (response instanceof Error) throw response
    return response
  } })
  return { store, calls }
}

test('one registered MAFACONNECT application is one application before telemetry arrives', async () => {
  const { store } = setup()
  await store.refresh()
  const summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.applications, 1)
  assert.equal(summary.spans, 0)
  assert.equal(summary.connectedApplications, 0)
  assert.equal(summary.connected, false)
  assert.equal(summary.progress, 67)
  assert.deepEqual(summary.steps.map(step => step.state), ['Done', 'Done', 'Current', 'Planned', 'Planned'])
})

test('535 historic HTTP spans and fresh database telemetry preserve counts without claiming connection', async () => {
  const { store } = setup([project], { [project.id]: {
    ...idle, has_received: true, span_count: 535, database_active: true, http_active: false,
    last_seen_at: '2026-11-26T18:46:00Z', database_last_seen_at: '2026-11-27T10:13:00Z', availability: 'unknown',
  } })
  await store.refresh()
  const summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.applications, 1)
  assert.equal(summary.spans, 535)
  assert.equal(summary.connectedApplications, 0)
  assert.equal(summary.connected, false)
})

test('sums actual stored spans and connections; stale traces do not claim a live connection', async () => {
  const second = { id: 'second-project', name: 'Second API' }
  const { store } = setup([project, second], {
    [project.id]: { ...idle, connected: true, span_count: 3, has_received: true },
    [second.id]: { ...idle, span_count: 7, has_received: true },
  })
  await store.refresh()
  let summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.applications, 2)
  assert.equal(summary.spans, 10)
  assert.equal(summary.connectedApplications, 1)
  assert.equal(summary.progress, 100)
  store.noteStatus(project.id, { ...idle, span_count: 3, has_received: true })
  summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.spans, 10)
  assert.equal(summary.connectedApplications, 0)
  assert.equal(summary.progress, 67)
})

test('empty successful responses are zero; pending and failed responses are unknown', async () => {
  const { store } = setup([])
  assert.equal(summarizeWorkspace(store.getSnapshot()).applications, null)
  await store.refresh()
  let summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.applications, 0)
  assert.equal(summary.spans, 0)
  assert.equal(summary.progress, 33)
  const failed = createWorkspaceOverviewStore({ request: async () => { throw new Error('Please sign in') } })
  await failed.refresh()
  summary = summarizeWorkspace(failed.getSnapshot())
  assert.equal(summary.applications, null)
  assert.equal(summary.spans, null)
  assert.equal(summary.progress, null)
  assert.match(failed.getSnapshot().error, /sign in/)
})

test('a telemetry failure preserves the real registration count without fabricating zero spans', async () => {
  const { store } = setup([project], { [project.id]: new Error('Status service unavailable') })
  await store.refresh()
  const summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.applications, 1)
  assert.equal(summary.spans, null)
  assert.equal(summary.connectedApplications, null)
  assert.equal(summary.progress, null)
  assert.match(summary.telemetryError, /Status service unavailable/)
})

test('registration notifies the shared Overview immediately, before the follow-up GET finishes', async () => {
  let registered = false, finish
  const store = createWorkspaceOverviewStore({ request: async path => {
    if (path !== '/projects') return idle
    if (!registered) return { projects: [], total: 0 }
    return new Promise(resolve => { finish = resolve })
  } })
  await store.refresh()
  const observed = []
  const unsubscribe = store.subscribe(() => observed.push(store.getSnapshot().applicationCount))
  registered = true
  store.addProject(project)
  assert.equal(store.getSnapshot().applicationCount, 1)
  assert.ok(observed.includes(1))
  finish({ projects: [project], total: 1 })
  await tick()
  assert.equal(summarizeWorkspace(store.getSnapshot()).spans, 0)
  unsubscribe()
})

test('a list request from before registration cannot overwrite the newly registered application', async () => {
  let calls = 0, finishOld
  const store = createWorkspaceOverviewStore({ request: async path => {
    if (path !== '/projects') return idle
    calls++
    if (calls === 1) return new Promise(resolve => { finishOld = resolve })
    return { projects: [project], total: 1 }
  } })
  const old = store.refresh()
  store.addProject(project)
  await tick()
  finishOld({ projects: [], total: 0 })
  await old
  assert.equal(store.getSnapshot().applicationCount, 1)
  assert.equal(store.getSnapshot().projects[0].name, 'MAFACONNECT API')
})

test('the authenticated client and configured API root are reused', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify(url.endsWith('/status') ? idle : { projects: [project], total: 1 }))
  }
  try {
    const store = createWorkspaceOverviewStore()
    await store.refresh()
    assert.equal(calls[0].url, '/api/monitoring/projects')
    assert.equal(calls[1].url, '/api/monitoring/projects/mafa-project/status')
    assert.ok(calls.every(call => call.options.credentials === 'include' && call.options.cache === 'no-store'))
  } finally { globalThis.fetch = original }
})

test('new owner stores are isolated and truncated lists never masquerade as workspace trace totals', async () => {
  const { store } = setup([project], { [project.id]: idle }, 125)
  await store.refresh()
  const summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.applications, 125)
  assert.equal(summary.spans, null)
  assert.match(summary.telemetryError, /part of your application list/)
  store.cancel()
  const otherOwner = createWorkspaceOverviewStore()
  assert.deepEqual(otherOwner.getSnapshot().projects, [])
  assert.equal(otherOwner.getSnapshot().applicationCount, null)
})

test('malformed API data is an error, not an empty or connected workspace', async () => {
  const store = createWorkspaceOverviewStore({ request: async () => ({ projects: null }) })
  await store.refresh()
  assert.match(store.getSnapshot().error, /invalid/)
  assert.equal(summarizeWorkspace(store.getSnapshot()).applications, null)
  const { store: invalid } = setup([project], { [project.id]: { connected: true } })
  await invalid.refresh()
  assert.equal(summarizeWorkspace(invalid.getSnapshot()).spans, null)
})

test('an older Overview refresh cannot overwrite a newer Applications connection check', async () => {
  let finishStatus
  const store = createWorkspaceOverviewStore({ request: async path => path === '/projects'
    ? { projects: [project], total: 1 }
    : new Promise(resolve => { finishStatus = resolve }) })
  const refresh = store.refresh()
  await tick()
  store.noteStatus(project.id, { ...idle, connected: true, span_count: 9 })
  finishStatus(idle)
  await refresh
  assert.equal(summarizeWorkspace(store.getSnapshot()).spans, 9)
  assert.equal(summarizeWorkspace(store.getSnapshot()).connectedApplications, 1)
})

test('failed session/list refresh clears a previously connected summary instead of presenting stale readiness', async () => {
  let fail = false
  const store = createWorkspaceOverviewStore({ request: async path => {
    if (fail) throw new Error('Session expired')
    return path === '/projects' ? { projects: [project], total: 1 } : { ...idle, connected: true, span_count: 2 }
  } })
  await store.refresh()
  assert.equal(summarizeWorkspace(store.getSnapshot()).connected, true)
  fail = true
  await store.refresh()
  const summary = summarizeWorkspace(store.getSnapshot())
  assert.equal(summary.connected, false)
  assert.equal(summary.applications, null)
  assert.equal(summary.spans, null)
  assert.match(store.getSnapshot().error, /expired/)
})
