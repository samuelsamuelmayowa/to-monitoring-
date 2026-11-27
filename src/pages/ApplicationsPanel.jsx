import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Activity, CheckCircle2, ClipboardCopy, CloudUpload, PlusCircle, RefreshCw, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react'
import './ApplicationsPanel.css'
import { monitoringRequest } from '../lib/monitoringApi.js'
import { envSnippet, powershellSnippet, OTEL_INSTALL, OTEL_START } from '../lib/otelSetup'
import { createApplicationDetails, connectionMessage } from '../lib/applicationDetails.js'
import ProjectKeys from './ProjectKeys'
import ApplicationSelector from './ApplicationSelector'

// Share the existing HttpOnly session and CSRF lifecycle used by sign-in.
const request = (_user, path, options = {}) => monitoringRequest(path, options)

function Snippet({ title, code, disabled = false }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (disabled) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch { setCopied(false) }
  }
  return <section className="to-app-snippet">
    <div className="to-app-snippet-heading"><strong>{title}</strong><button type="button" onClick={copy} disabled={disabled}><ClipboardCopy size={15}/>{copied ? 'Copied' : 'Copy'}</button></div>
    <pre><code>{code}</code></pre>
  </section>
}

function friendlyDate(value) {
  if (!value) return 'No events received yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

export default function ApplicationsPanel({ user, projectStore, projectState, selectedProjectId, onSelectProject }) {
  const apps = projectState.projects
  const loading = projectState.loading
  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('Shopping API')
  const [environment, setEnvironment] = useState('development')
  const [generated, setGenerated] = useState(null)
  const [pendingRevoke, setPendingRevoke] = useState(null)
  const [showSecret, setShowSecret] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const detailsStore = useMemo(() => createApplicationDetails({ onStatus: projectStore.noteStatus, onStatusError: projectStore.noteStatusError }), [projectStore])
  const detailsSnapshot = useSyncExternalStore(detailsStore.subscribe, detailsStore.getSnapshot, detailsStore.getSnapshot)

  const selection = selectedProjectId === undefined ? selectedId : selectedProjectId
  const currentId = apps.some(app => app.id === selection) ? selection : apps[0]?.id || null
  const selected = apps.find(app => app.id === currentId) || null
  const hasIngest = Boolean(selected?.ingest_url)

  const details = detailsSnapshot.projectId === currentId ? detailsSnapshot : {
    projectId: currentId, keys: [], activeCount: null, maxActiveKeys: 3,
    keysLoaded: false, keysLoading: true, keysError: '', status: null, statusLoading: true, statusError: '',
  }
  const newSecret = generated?.projectId === currentId ? generated.secret : ''
  useEffect(() => {
    detailsStore.selectProject(currentId)
    const timer = setInterval(() => void detailsStore.refreshStatus(), 15000)
    return () => { clearInterval(timer); detailsStore.selectProject(null) }
  }, [currentId, detailsStore])

  async function createProject(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy('create'); setError('')
    try {
      const created = await request(user, '/projects', {
        method: 'POST',
        body: { name: name.trim(), runtime: 'nodejs', environment },
      })
      projectStore.addProject(created.project)
      setSelectedId(created.project.id)
      onSelectProject?.(created.project.id)
      setGenerated(null)
      setShowSecret(false)
      setPendingRevoke(null)
    } catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  async function generateKey() {
    if (!selected || details.keysLoading || !details.keysLoaded || details.keysError || details.activeCount === null || details.activeCount >= 3) return
    const projectId = selected.id
    setBusy('key'); setError('')
    try {
      const result = await request(user, `/projects/${encodeURIComponent(projectId)}/keys`, { method: 'POST' })
      if (detailsStore.getSnapshot().projectId !== projectId) return
      setGenerated({ projectId, secret: result.secret, keyId: result.key.id })
      setShowSecret(true)
    } catch (err) {
      if (detailsStore.getSnapshot().projectId === projectId) setError(err.message)
    } finally {
      // A rejected creation (including 409) must still restore authoritative
      // metadata. This GET does not create another key or retry the POST.
      if (detailsStore.getSnapshot().projectId === projectId) await detailsStore.refreshKeys()
      setBusy('')
    }
  }

  function choose(id) {
    if (id === currentId) return
    detailsStore.selectProject(id)
    setSelectedId(id)
    onSelectProject?.(id)
    setGenerated(null)
    setShowSecret(false)
    setPendingRevoke(null)
    setError('')
  }

  async function revokeKey(id) {
    const projectId = currentId
    if (pendingRevoke?.projectId !== projectId || pendingRevoke.keyId !== id) return
    setBusy('revoke'); setError('')
    try {
      await request(user, `/projects/${encodeURIComponent(projectId)}/keys/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (detailsStore.getSnapshot().projectId !== projectId) return
      if (generated?.keyId === id) { setGenerated(null); setShowSecret(false) }
      setPendingRevoke(null)
    } catch (err) {
      if (detailsStore.getSnapshot().projectId === projectId) setError(err.message)
    } finally {
      if (detailsStore.getSnapshot().projectId === projectId) await detailsStore.refreshKeys()
      setBusy('')
    }
  }
  const setup = { name: selected?.name || 'shopping-api', endpoint: selected?.ingest_url, secret: newSecret || 'YOUR_PROJECT_SECRET' }
  const envText = envSnippet(setup)
  const currentStatus = details.status
  const connectionError = details.statusError

  return <div className="to-app-panel">
    <header className="to-app-heading"><div><span className="ws-badge ws-purple">OpenTelemetry • Node.js</span><h1>Applications</h1><p>Connect your existing backend without uploading its source code.</p></div><Activity size={29}/></header>
    {error && <div className="to-app-error" role="alert"><TriangleAlert size={18}/><span>{error}</span></div>}
    {projectState.error && <div className="to-app-error" role="alert"><span>{projectState.error}</span><button className="ws-secondary" onClick={projectStore.refresh}>Retry applications</button></div>}
    {loading ? <section className="ws-card to-app-card">Loading your applications…</section> : <>
      <div className="to-app-layout">
        <section className="ws-card to-app-card">
          <h2>1. Register application</h2>
          <p>Applications are private to your signed-in account. Team sharing is planned.</p>
          <form onSubmit={createProject} className="to-app-form">
            <label htmlFor="to-app-name">Application name</label>
            <input id="to-app-name" maxLength={80} value={name} onChange={e => setName(e.target.value)} required placeholder="Shopping API"/>
            <label htmlFor="to-app-runtime">Runtime</label>
            <input id="to-app-runtime" disabled value="Node.js" readOnly/>
            <label htmlFor="to-app-environment">Environment</label>
            <select id="to-app-environment" value={environment} onChange={e => setEnvironment(e.target.value)}><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option></select>
            <button className="ws-primary" type="submit" disabled={busy === 'create'}><PlusCircle size={17}/>{busy === 'create' ? 'Creating…' : 'Create application'}</button>
          </form>
          {apps.length > 0 && <ApplicationSelector projects={apps} selectedId={currentId} onSelect={choose} />}
        </section>
        <div className="to-app-details">
          {selected ? <>
            <p className="to-app-small">Selected application: <strong>{selected.name}</strong> · Project ID: <code>{currentId}</code></p>
            <ProjectKeys details={details} secret={newSecret} showSecret={showSecret}
              onToggleSecret={() => setShowSecret(value => !value)} onRefresh={detailsStore.refreshKeys}
              onGenerate={generateKey} busy={Boolean(busy)}
              pendingRevoke={pendingRevoke?.projectId === currentId ? pendingRevoke.keyId : null}
              onRevoke={id => setPendingRevoke({projectId: currentId, keyId: id})}
              onConfirmRevoke={revokeKey} onCancelRevoke={() => setPendingRevoke(null)} />
            <section className="ws-card to-app-card"><h2>3. Install OpenTelemetry</h2><p>Run this inside the existing Node.js backend folder.</p>
              <Snippet title="Terminal · Node.js 22.15+" code={OTEL_INSTALL}/>
            </section>
            <section className="ws-card to-app-card"><h2>4. Configure the backend</h2><p>Add these values to the backend's <code>.env</code> file. The endpoint below comes from your T.O. API configuration.</p>
              <p className="to-app-small">Enable HTTP, Express and mysql2 together to correlate supported MySQL operations with requests. Dependency storage requires advanced tracing on the receiver. Background database activity does not establish an HTTP connection.</p>
              <Snippet title="Backend .env — keep private" code={envText} disabled={!hasIngest}/>
              <details><summary>Windows PowerShell alternative</summary><Snippet title="PowerShell · current session" code={powershellSnippet(setup)} disabled={!hasIngest}/></details>
              {!hasIngest && <p className="to-app-small">Ingestion URL is not configured on the backend. Configure <code>MONITORING_PUBLIC_OTLP_TRACES_URL</code> before connecting.</p>}
            </section>
            <section className="ws-card to-app-card"><h2>5. Start your Node.js application</h2><p>For a CommonJS Express service using Node.js 22+, run:</p>
              <Snippet title="Terminal" code={OTEL_START}/>
              <p className="to-app-small">Replace <code>server.cjs</code> with your CommonJS entry file. With PowerShell environment variables, omit <code>--env-file=.env</code>. Call an Express route, allow a few seconds for batch export, then check the connection. ESM instrumentation needs separate loader setup. Only HTTP/JSON traces are supported; protobuf, logs, and metrics are unavailable.</p>
            </section>
            <section className="ws-card to-app-card to-app-status"><div className="to-app-status-top"><h2>Connection status</h2><button className="ws-secondary" type="button" onClick={detailsStore.refresh} disabled={details.statusLoading || details.keysLoading}><RefreshCw size={15}/>{details.statusLoading ? 'Checking…' : 'Check connection'}</button></div>
              <div className={connectionError ? 'to-app-error' : currentStatus?.connected ? 'to-app-connected' : 'to-app-pending'} role={connectionError ? 'alert' : 'status'}>{currentStatus?.connected ? <CheckCircle2 size={21}/> : <CloudUpload size={21}/>} {connectionMessage(details)}</div>
              <p>HTTP telemetry: {currentStatus ? friendlyDate(currentStatus.last_seen_at) : 'Receipt is not yet verified'}</p>
              <p className="to-app-small">Database telemetry: {currentStatus?.database_last_seen_at ? friendlyDate(currentStatus.database_last_seen_at) : 'No stored activity reported'}</p>
              <p className="to-app-small">Application availability: unknown — telemetry receipt is not an availability check.</p>
              <p className="to-app-small">{currentStatus?.span_count ?? '—'} stored HTTP server spans · 7-day retention</p>
              <p className="to-app-small">An empty OTLP request can return HTTP 200 with zero stored spans. Connection requires an eligible HTTP SERVER span; the receiver reports newly stored spans in X-TO-Stored-Spans.</p>
              <div className="to-app-status-foot"><ShieldCheck size={16}/><span>Only authenticated telemetry for this project is accepted. Private by default.</span></div>
            </section>
          </> : <section className="ws-card to-app-card"><Terminal size={32}/><h2>Create your first application</h2><p>Once created, the OpenTelemetry connection guide will appear here.</p></section>}
        </div>
      </div>
    </>}
  </div>
}
