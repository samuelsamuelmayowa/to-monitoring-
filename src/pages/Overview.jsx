import { Help } from './LearnMonitoring'
import { Activity, ArrowRight, BookOpen, Check, Clock3, Code2, Coffee, Layers, Lightbulb, Network, PlusCircle, RefreshCw, Rocket, Terminal, UserRound, Zap } from 'lucide-react'
import { summarizeWorkspace } from '../lib/workspaceOverview.js'

export default function Overview({ state, onRefresh, onApplications }) {
  const summary = summarizeWorkspace(state)
  const format = value => value === null ? '—' : value.toLocaleString()
  const hasApplications = state.projects.length > 0
  const checking = state.loading || state.metricsLoading
  const current = summary.steps.slice(0, 3).find(step => step.state !== 'Done')
  const metrics = [
    [Network, format(summary.applications), 'Applications', state.loading ? 'Loading' : summary.applications === null ? 'Unavailable' : hasApplications ? 'Registered' : 'Empty', 'purple'],
    [Terminal, format(summary.spans), 'HTTP Server Spans', state.metricsLoading ? 'Loading' : summary.spans === null ? 'Unavailable' : 'Stored · 7 days', 'gray'],
    [Activity, format(summary.connectedApplications), 'Connected Applications', state.metricsLoading ? 'Checking' : summary.connectedApplications === null ? 'Unavailable' : summary.connected ? 'Receiving traces' : 'Not connected', summary.connected ? 'green' : 'gray'],
    [UserRound, 'Personal', 'Workspace', 'Your account', 'purple'],
  ]
  return <>
    <section className="ws-welcome"><span className="ws-badge ws-purple"><span className="ws-dot"/>Your workspace</span><h1>Welcome to Your Monitoring Workspace <Help term="Application monitoring"/></h1><p>Register your application and monitor authenticated OpenTelemetry HTTP server spans.</p></section>
    <div className="ws-overview-refresh"><span>{state.refreshing ? 'Updating workspace…' : 'Private applications and telemetry from your account'}</span><button className="ws-secondary" onClick={onRefresh} disabled={state.refreshing}><RefreshCw size={16}/>{state.refreshing ? 'Refreshing…' : 'Refresh'}</button></div>
    {state.loading && <p role="status" className="ws-notice">Loading your applications and telemetry…</p>}
    {state.error && <div role="alert" className="ws-error">Unable to load applications: {state.error} <button className="ws-secondary" onClick={onRefresh}>Retry</button></div>}
    {!state.metricsLoading && summary.telemetryError && <div role="alert" className="ws-error">{summary.telemetryError} Application counts are shown separately; unavailable telemetry is not counted as zero. <button className="ws-secondary" onClick={onRefresh}>Retry telemetry</button></div>}
    <section className="ws-metrics" aria-label="Workspace metrics">{metrics.map(([Icon, value, label, badge, color]) => <article className={`ws-metric ws-card ${label === 'Workspace' ? 'ws-metric-personal' : ''}`} key={label}><div><span className="ws-metric-icon"><Icon size={19}/></span><span className={`ws-badge ws-${color}`}>{badge}</span></div><strong>{value}</strong><p>{label}</p></article>)}</section>
    <div className="ws-content-grid"><div className="ws-column">
      <section className="ws-card ws-connect"><div className="ws-section-eyebrow"><span className="ws-rocket"><Rocket size={20}/></span><span className="ws-badge ws-purple">{checking ? 'Checking setup…' : summary.progress === null ? 'Setup status unavailable' : `${summary.verified} of 3 complete`}</span></div>
        <h2>{summary.connected ? 'Your application is connected' : hasApplications ? 'Connect Your Registered Application' : 'Let’s Connect Your First Application'}</h2>
        <p>{summary.connected ? 'Authenticated HTTP server spans have arrived within the last 10 minutes. Application availability is not measured.' : hasApplications ? 'Your application is registered. Generate an ingestion key and start your instrumented service to receive real traces.' : 'Connect a Node.js service using OpenTelemetry. Start by registering your application, then generate an ingestion key.'}</p>
        <button className="ws-primary" onClick={onApplications}><PlusCircle size={20}/>{hasApplications ? 'Manage Applications' : 'Add Your First Application'}<ArrowRight size={18}/></button><a className="ws-quickstart-link" href="/docs#quickstart"><BookOpen size={16}/>Read Quickstart Guide</a>
      </section>
      <section className="ws-card ws-progress"><div className="ws-section-heading"><div><h2>Setup Progress</h2><p>{current ? current.title : 'Supported connection steps complete'}</p></div><span className="ws-badge ws-purple">{summary.progress === null ? 'Unavailable' : `${summary.progress}%`}</span></div><div className="ws-progress-track" role="progressbar" aria-label="Application connection setup" aria-valuenow={summary.progress ?? undefined} aria-valuetext={summary.progress === null ? 'Connection status unavailable' : `${summary.verified} of 3 supported steps complete`} aria-valuemin={0} aria-valuemax={100}><span style={{width: `${summary.progress ?? 0}%`}}/></div>
        <div className="ws-milestones">{summary.steps.map(({ title, subtitle, state: step }) => <div key={title} className={`ws-milestone ${step.toLowerCase()}`}><span className="ws-step-icon">{step === 'Done' ? <Check size={16}/> : step === 'Current' ? <ArrowRight size={16}/> : <Clock3 size={16}/>}</span><div><strong>{title}</strong><p>{subtitle}</p></div><span className={`ws-badge ${step === 'Done' ? 'ws-green' : step === 'Current' ? 'ws-purple-solid' : 'ws-gray'}`}>{step}</span></div>)}</div><p className="ws-overview-footnote">Progress tracks sign-in, registration, and a recent trace connection. Planned logs and dashboards are excluded.</p>
      </section>
    </div><div className="ws-column"><section className="ws-card ws-tips"><h2><Code2 size={21}/>Quick Tips for Developers</h2><p>Node.js HTTP JSON traces are supported. Additional runtimes remain planned.</p><div className="ws-language-grid">{[[Code2, 'Node.js', 'OpenTelemetry · HTTP JSON'], [Terminal, 'Python', 'Planned'], [Zap, 'Go (Golang)', 'Planned'], [Coffee, 'Java', 'Planned']].map(([Icon, title, description]) => <div key={title}><Icon size={20}/><span><strong>{title}</strong><small>{description}</small></span></div>)}</div><div className="ws-container-tip"><Layers size={22}/><div><strong>Docker &amp; Kubernetes</strong><p>Container setup guide coming soon</p></div></div></section><section className="ws-pro-tip"><Lightbulb size={23}/><div><h3>Pro tip: Local Dev Environment</h3><p>Use a development application first. Configure JSON export and keep your ingestion secret on the server.</p></div></section></div></div>
  </>
}
