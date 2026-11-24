import { useCallback, useEffect, useState } from 'react'
import { Activity, CheckCircle2, ClipboardCopy, CloudUpload, KeyRound, PlusCircle, RefreshCw, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react'
import './ApplicationsPanel.css'

const API_ROOT = (import.meta.env.VITE_MONITORING_API_BASE_URL || '/api/monitoring').replace(/\/$/, '')

// Uses the existing app's HttpOnly session cookies, or a Firebase User.getIdToken()
// if AuthContext exposes a Firebase User. Adapt to your actual auth mechanism.
async function request(user, path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (typeof user?.getIdToken === 'function') {
    headers.Authorization = `Bearer ${await user.getIdToken()}`
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    credentials: 'include',
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  let data = null
  try { data = await response.json() } catch { /* server might be unavailable */ }
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

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
      setState(next)
      setError('')
    } catch (err) { setError(err.message) }
  }, [user])

  useEffect(() => {
    setState(null)
    if (!selectedId) return undefined
    void checkStatus(selectedId)
    const handle = setInterval(() => void checkStatus(selectedId), 15000)
    return () => clearInterval(handle)
  }, [selectedId, checkStatus])

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
    } catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  async function generateKey() {
    if (!selected) return
    setBusy('key'); setError('')
    try {
      const result = await request(user, `/projects/${encodeURIComponent(selected.id)}/keys`, { method: 'POST' })
      setNewSecret(result.secret)
      setShowSecret(true)
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
  }

  const envText = `OTEL_SERVICE_NAME=${selected?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'shopping-api'}\nOTEL_TRACES_EXPORTER=otlp\nOTEL_METRICS_EXPORTER=none\nOTEL_LOGS_EXPORTER=none\nOTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json\nOTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${selected?.ingest_url || 'https://YOUR-OTLP-ENDPOINT/v1/traces'}\nOTEL_EXPORTER_OTLP_TRACES_HEADERS=x-to-project-key=${newSecret || 'YOUR_SECRET_FROM_STEP_2'}`

  return <div className="to-app-panel">
    <header className="to-app-heading"><div><span className="ws-badge ws-purple">OpenTelemetry • Node.js</span><h1>Applications</h1><p>Connect your existing backend without uploading its source code.</p></div><Activity size={29}/></header>
    {error && <div className="to-app-error" role="alert"><TriangleAlert size={18}/><span>{error}</span></div>}
    {loading ? <section className="ws-card to-app-card">Loading your applications…</section> : <>
      <div className="to-app-layout">
        <section className="ws-card to-app-card">
          <h2>1. Register application</h2>
          <p>Applications belong to your signed-in workspace.</p>
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
            </section>
            <section className="ws-card to-app-card"><h2>3. Install OpenTelemetry</h2><p>Run this inside the existing Node.js backend folder.</p>
              <Snippet title="Terminal" code="npm install @opentelemetry/api @opentelemetry/auto-instrumentations-node"/>
            </section>
            <section className="ws-card to-app-card"><h2>4. Configure the backend</h2><p>Add these values to the backend's <code>.env</code> file. The endpoint below comes from your T.O. API configuration.</p>
              <Snippet title="Backend .env — keep private" code={envText} disabled={!hasIngest}/>
              {!hasIngest && <p className="to-app-small">Ingestion URL is not configured on the backend. Configure <code>MONITORING_PUBLIC_OTLP_TRACES_URL</code> before connecting.</p>}
            </section>
            <section className="ws-card to-app-card"><h2>5. Start your Node.js application</h2><p>For a CommonJS Express service using Node.js 22+, run:</p>
              <Snippet title="Terminal" code="node --env-file=.env --require @opentelemetry/auto-instrumentations-node/register server.js"/>
              <p className="to-app-small">Replace <code>server.js</code> with your application's entry file. Then open an API endpoint in your browser so it generates telemetry. ESM projects may require different startup configuration.</p>
            </section>
            <section className="ws-card to-app-card to-app-status"><div className="to-app-status-top"><h2>Connection status</h2><button className="ws-secondary" type="button" onClick={refreshStatus} disabled={busy === 'status'}><RefreshCw size={15}/>{busy === 'status' ? 'Checking…' : 'Check connection'}</button></div>
              {state?.connected ? <div className="to-app-connected"><CheckCircle2 size={21}/>Connected — authenticated OpenTelemetry spans received</div> : <div className="to-app-pending"><CloudUpload size={21}/>Waiting for the first OpenTelemetry trace</div>}
              <p>{friendlyDate(state?.last_seen_at)}</p>
              <div className="to-app-status-foot"><ShieldCheck size={16}/><span>Only authenticated telemetry for this project is accepted. Private by default.</span></div>
            </section>
          </> : <section className="ws-card to-app-card"><Terminal size={32}/><h2>Create your first application</h2><p>Once created, the OpenTelemetry connection guide will appear here.</p></section>}
        </div>
      </div>
    </>}
  </div>
}
