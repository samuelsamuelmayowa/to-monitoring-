import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, CheckCircle2, ClipboardCopy, CloudUpload, KeyRound, PlusCircle, RefreshCw, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react'
import './ApplicationsPanel.css'
import { authRequest } from '../lib/authApi'
import { envSnippet, powershellSnippet, OTEL_INSTALL, OTEL_START } from '../lib/otelSetup'

const API_ROOT = (import.meta.env.VITE_MONITORING_API_BASE_URL || '/api/monitoring').replace(/\/$/, '')

// Share the existing HttpOnly session and CSRF lifecycle used by sign-in.
const request = (_user, path, options = {}) => authRequest(path, { ...options, baseUrl: API_ROOT })

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

export default function ApplicationsPanel({ user }) {
  const [apps, setApps] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('Shopping API')
  const [environment, setEnvironment] = useState('development')
  const [newSecret, setNewSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState(null)
  const [keys, setKeys] = useState([])
  const selection = useRef(null)

  const selected = apps.find(app => app.id === selectedId) || null
  const hasIngest = Boolean(selected?.ingest_url)

  const load = useCallback(async () => {
    try {
      const result = await request(user, '/projects')
      const list = result.projects || []
      setApps(list)
      setSelectedId(old => old && list.some(a => a.id === old) ? old : list[0]?.id || null)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { void load() }, [load])

  const checkStatus = useCallback(async (projectId) => {
    try {
      const next = await request(user, `/projects/${encodeURIComponent(projectId)}/status`)
      if (selection.current !== projectId) return
      setState({ ...next, projectId })
      setStatusError(null)
    } catch (err) { if (selection.current === projectId) setStatusError({ projectId, message: err.message }) }
  }, [user])

  useEffect(() => {
    selection.current = selectedId
    if (!selectedId) return undefined
    void checkStatus(selectedId)
    let cancelled = false
    request(user, `/projects/${encodeURIComponent(selectedId)}/keys`).then(result => {
      if (!cancelled) setKeys(result.keys)
    }).catch(err => { if (!cancelled) setError(err.message) })
    const handle = setInterval(() => void checkStatus(selectedId), 15000)
    return () => { cancelled = true; selection.current = null; clearInterval(handle) }
  }, [selectedId, checkStatus, user])

  async function createProject(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy('create'); setError('')
    try {
      const created = await request(user, '/projects', {
        method: 'POST',
        body: { name: name.trim(), runtime: 'nodejs', environment },
      })
      setApps(old => [created.project, ...old])
      setSelectedId(created.project.id)
      setNewSecret('')
      setShowSecret(false)
      setKeys([])
    } catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  async function generateKey() {
    if (!selected) return
    const projectId = selected.id
    setBusy('key'); setError('')
    try {
      const result = await request(user, `/projects/${encodeURIComponent(projectId)}/keys`, { method: 'POST' })
      if (selection.current !== projectId) return
      setNewSecret(result.secret)
      setShowSecret(true)
      const resultKeys = await request(user, `/projects/${encodeURIComponent(projectId)}/keys`)
      if (selection.current === projectId) setKeys(resultKeys.keys)
    } catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  async function refreshStatus() {
    if (!selected) return
    setBusy('status')
    await checkStatus(selected.id)
    setBusy('')
  }

  function choose(id) {
    setSelectedId(id)
    setNewSecret('')
    setShowSecret(false)
    setError('')
    setKeys([])
  }

  async function revokeKey(id) {
    setBusy('revoke'); setError('')
    try {
      await request(user, `/projects/${encodeURIComponent(selected.id)}/keys/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setKeys(old => old.map(key => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key))
      setNewSecret(''); setShowSecret(false)
    } catch (err) { setError(err.message) }
    finally { setBusy('') }
  }
  const setup = { name: selected?.name || 'shopping-api', endpoint: selected?.ingest_url, secret: newSecret || 'YOUR_PROJECT_SECRET' }
  const envText = envSnippet(setup)
  const currentStatus = state?.projectId === selectedId ? state : null
  const connectionError = statusError?.projectId === selectedId ? statusError.message : ''

  return <div className="to-app-panel">
    <header className="to-app-heading"><div><span className="ws-badge ws-purple">OpenTelemetry • Node.js</span><h1>Applications</h1><p>Connect your existing backend without uploading its source code.</p></div><Activity size={29}/></header>
    {error && <div className="to-app-error" role="alert"><TriangleAlert size={18}/><span>{error}</span></div>}
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
          {apps.length > 0 && <div className="to-app-existing"><strong>Your applications</strong>{apps.map(app => <button key={app.id} type="button" onClick={() => choose(app.id)} aria-pressed={selectedId === app.id} className={selectedId === app.id ? 'to-app-selected' : ''}><span>{app.name}<small>{app.environment}</small></span>{selectedId === app.id && <CheckCircle2 size={17}/>}</button>)}</div>}
        </section>
        <div className="to-app-details">
          {selected ? <>
            <section className="ws-card to-app-card"><h2>2. Generate ingestion key</h2><p>This secret only lets your Node.js service <strong>send</strong> telemetry to this project. It cannot read private logs.</p><div className="to-app-key">
              <KeyRound size={18}/><code>{newSecret ? (showSecret ? newSecret : '••••••••••••••••••••••••') : 'No new key shown'}</code>
              {newSecret && <button type="button" onClick={() => setShowSecret(v => !v)}>{showSecret ? 'Hide' : 'Show'}</button>}
            </div>
              <button type="button" className="ws-secondary" onClick={generateKey} disabled={busy === 'key'}><KeyRound size={16}/>{busy === 'key' ? 'Generating…' : 'Generate new key'}</button>
              <p className="to-app-small">Keep the key in the backend's environment variables. The server displays a newly generated key only once; do not commit it to GitHub. Creating additional keys does not revoke old keys.</p>
              {keys.map(key => <div className="to-app-key" key={key.id}><code>{key.key_prefix}…</code>{key.revoked_at ? <span>Revoked</span> : <button type="button" disabled={Boolean(busy)} onClick={() => revokeKey(key.id)}>Revoke</button>}</div>)}
            </section>
            <section className="ws-card to-app-card"><h2>3. Install OpenTelemetry</h2><p>Run this inside the existing Node.js backend folder.</p>
              <Snippet title="Terminal · Node.js 22.15+" code={OTEL_INSTALL}/>
            </section>
            <section className="ws-card to-app-card"><h2>4. Configure the backend</h2><p>Add these values to the backend's <code>.env</code> file. The endpoint below comes from your T.O. API configuration.</p>
              <Snippet title="Backend .env — keep private" code={envText} disabled={!hasIngest}/>
              <details><summary>Windows PowerShell alternative</summary><Snippet title="PowerShell · current session" code={powershellSnippet(setup)} disabled={!hasIngest}/></details>
              {!hasIngest && <p className="to-app-small">Ingestion URL is not configured on the backend. Configure <code>MONITORING_PUBLIC_OTLP_TRACES_URL</code> before connecting.</p>}
            </section>
            <section className="ws-card to-app-card"><h2>5. Start your Node.js application</h2><p>For a CommonJS Express service using Node.js 22+, run:</p>
              <Snippet title="Terminal" code={OTEL_START}/>
              <p className="to-app-small">Replace <code>server.cjs</code> with your CommonJS entry file. With PowerShell environment variables, omit <code>--env-file=.env</code>. Call an Express route, allow a few seconds for batch export, then check the connection. ESM instrumentation needs separate loader setup. Only HTTP/JSON traces are supported; protobuf, logs, and metrics are unavailable.</p>
            </section>
            <section className="ws-card to-app-card to-app-status"><div className="to-app-status-top"><h2>Connection status</h2><button className="ws-secondary" type="button" onClick={refreshStatus} disabled={busy === 'status'}><RefreshCw size={15}/>{busy === 'status' ? 'Checking…' : 'Check connection'}</button></div>
              {connectionError ? <div className="to-app-error" role="alert"><TriangleAlert size={21}/>Connection error — {connectionError}</div> : currentStatus?.connected ? <div className="to-app-connected"><CheckCircle2 size={21}/>Connected — authenticated OpenTelemetry spans received</div> : <div className="to-app-pending"><CloudUpload size={21}/>{!currentStatus ? 'Checking connection…' : currentStatus.has_received ? 'Not connected — no trace received in the last 10 minutes' : newSecret || keys.some(key => !key.revoked_at) ? 'Waiting for telemetry — start your instrumented application' : 'Not connected — generate an ingestion key to begin'}</div>}
              <p>{friendlyDate(currentStatus?.last_seen_at)}</p><p className="to-app-small">{currentStatus?.span_count ?? 0} stored HTTP server spans · 7-day retention</p>
              <div className="to-app-status-foot"><ShieldCheck size={16}/><span>Only authenticated telemetry for this project is accepted. Private by default.</span></div>
            </section>
          </> : <section className="ws-card to-app-card"><Terminal size={32}/><h2>Create your first application</h2><p>Once created, the OpenTelemetry connection guide will appear here.</p></section>}
        </div>
      </div>
    </>}
  </div>
}
