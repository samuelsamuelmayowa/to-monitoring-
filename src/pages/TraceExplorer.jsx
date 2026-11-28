import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Activity, RefreshCw, X } from 'lucide-react'
import ApplicationSelector from './ApplicationSelector'
import { createTraceExplorerStore, defaultFilters, filterSpans, spanTime, traceForest } from '../lib/traceExplorer.js'
import './TraceExplorer.css'
import { RequestInsights } from './DatabaseInsights'
import { Help } from './LearnMonitoring'

const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Unavailable'
const duration = value => value == null ? 'Unavailable' : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value)} ms`
const label = span => span.span_name || (span.http_method ? `${span.http_method} ${span.http_route || '(route unavailable)'}` : span.db_system ? `${span.db_system} ${span.db_operation || 'query'}` : 'Span')
const empty = { spans: [], loaded: false, loading: true, error: '', truncated: false }

export default function TraceExplorer({ projectState, projectStore, selectedProjectId, onSelectProject, onApplications }) {
  const store = useMemo(() => createTraceExplorerStore(), [])
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [filters, setFilters] = useState(defaultFilters)
  const opener = useRef(null)
  const currentId = !projectState.error && !projectState.loading
    ? projectState.projects.find(project => project.id === selectedProjectId)?.id || projectState.projects[0]?.id || null : null
  useEffect(() => { store.selectProject(currentId); return () => store.selectProject(null) }, [currentId, store])
  // Hide the previous project's result synchronously, before effects execute.
  const state = snapshot.projectId === currentId ? snapshot : { projectId: currentId, list: empty, detail: {} }
  return <TraceExplorerView projectState={projectState} currentId={currentId} state={state} filters={filters}
    onFilter={(key, value) => setFilters(previous => ({ ...previous, [key]: value }))}
    onReset={() => setFilters(defaultFilters)} onSelect={onSelectProject}
    onRefresh={store.refresh} onRefreshProjects={projectStore.refresh} onApplications={onApplications}
    onOpen={(id, event) => { if (event) opener.current = event.currentTarget; void store.openTrace(id) }}
    onClose={() => { store.closeTrace(); opener.current?.focus() }} />
}

export function TraceExplorerView({ projectState, currentId, state, filters = defaultFilters, onFilter, onReset, onSelect, onRefresh, onRefreshProjects, onApplications, onOpen, onClose }) {
  const { list, detail } = state
  const rows = filterSpans(list.spans, filters, list.loadedAt || 0)
  const project = projectState.projects.find(item => item.id === currentId)
  const projectsPartial = projectState.applicationCount === null && projectState.projects.length === 100 || projectState.applicationCount > projectState.projects.length
  return <div className="trace-explorer">
    <header className="te-heading"><div><span className="ws-badge ws-purple"><Activity size={14}/>OpenTelemetry traces</span><h1>Trace Explorer <Help term="Trace IDs and span IDs"/></h1><p>Inspect real HTTP requests and their available spans.</p></div><button className="ws-secondary" disabled={!currentId || list.loading || !!projectState.error} onClick={onRefresh}><RefreshCw size={16}/>{list.loading ? 'Loading…' : 'Refresh traces'}</button></header>
    {projectState.error ? <div className="ws-error" role="alert">Applications could not be loaded: {projectState.error} <button className="ws-secondary" onClick={onRefreshProjects}>Retry applications</button></div>
      : projectState.loading ? <section className="ws-card te-state" role="status">Loading your applications…</section>
        : !projectState.projects.length ? <section className="ws-card te-state"><h2>No applications registered</h2><p>Register an application to explore its HTTP traces.</p><button className="ws-primary" onClick={onApplications}>Manage Applications</button></section>
          : <>
            <section className="ws-card te-controls" aria-label="Trace filters">
              <ApplicationSelector compact projects={projectState.projects} selectedId={currentId} onSelect={onSelect}/>
              <label className="te-field">Time range<select value={filters.range} onChange={event => onFilter('range', event.target.value)}><option value="15m">Last 15 minutes</option><option value="1h">Last hour</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="all">All returned spans</option></select></label>
              <label className="te-field">Status<select value={filters.status} onChange={event => onFilter('status', event.target.value)}><option value="all">All statuses</option><option value="error">Error flag</option><option value="2xx">HTTP 2xx</option><option value="3xx">HTTP 3xx</option><option value="4xx">HTTP 4xx</option><option value="5xx">HTTP 5xx</option><option value="unknown">HTTP status unavailable</option></select></label>
              <label className="te-field">Search field<select value={filters.field} onChange={event => onFilter('field', event.target.value)}><option value="all">All supported fields</option><option value="service">Service</option><option value="endpoint">Normalized endpoint</option><option value="method">HTTP method</option><option value="trace">Trace ID</option><option value="span">Span ID</option></select></label>
              <label className="te-field te-search">Search loaded spans<input type="search" maxLength={120} value={filters.search} onChange={event => onFilter('search', event.target.value)} placeholder="Service, endpoint, method or ID"/></label>
              <button className="ws-secondary" onClick={onReset}>Reset filters</button>
              <p className="te-scope">Filters apply only to the latest batch of up to 100 returned server spans. Time range uses span start time (received time if unavailable), relative to the last refresh. Older matching requests may exist outside this batch.</p>
              {projectsPartial && <p className="te-scope" role="status">The API returned only part of your application list. Only returned applications can be selected here.</p>}
            </section>
            <section className="ws-card te-results" aria-label="HTTP server spans" aria-busy={list.loading}>
              <div className="te-results-heading"><div><h2>{project?.name}</h2><p>{list.loaded ? `${rows.length} matching of ${list.spans.length} loaded server spans` : 'HTTP server spans'}{list.loadedAt ? ` · Refreshed ${date(new Date(list.loadedAt).toISOString())}` : ''}</p></div><span className="ws-badge ws-gray">100-span response limit</span></div>
              {list.truncated && <p className="te-warning" role="status">Results may be truncated. The API limit was reached or the server flagged a partial response. This is not complete trace history; pagination is unavailable.</p>}
              {list.loading ? <div className="te-state" role="status">Loading HTTP server spans…</div>
                : list.error ? <div className="ws-error" role="alert">Unable to load traces: {list.error} <button className="ws-secondary" onClick={onRefresh}>Retry traces</button></div>
                  : list.loaded && !list.spans.length ? <div className="te-state"><h3>No stored HTTP server spans returned</h3><p>Confirm telemetry is arriving for this application. Data may also have expired under retention.</p></div>
                    : list.loaded && !rows.length ? <div className="te-state"><h3>No loaded spans match these filters</h3><p>This does not prove there are no matches outside the returned batch.</p><button className="ws-secondary" onClick={onReset}>Reset filters</button></div>
                      : rows.length > 0 && <div className="te-table-wrap" tabIndex={0} aria-label="Scrollable trace results"><table className="te-table"><caption className="te-sr-only">Loaded HTTP server spans for {project?.name}</caption><thead><tr><th scope="col">Timestamp</th><th scope="col">Service</th><th scope="col">Request / normalized endpoint</th><th scope="col">Status</th><th scope="col">Duration</th><th scope="col">Error</th><th scope="col">Trace</th></tr></thead><tbody>{rows.map(span => <tr key={`${span.trace_id}:${span.span_id}`}><td><time dateTime={span.started_at || span.received_at}>{date(span.started_at || span.received_at)}</time></td><td>{span.service_name}</td><td><strong className="te-method">{span.http_method || '—'}</strong><code>{span.http_route || 'Route unavailable'}</code></td><td><Status span={span}/></td><td className="te-number">{duration(span.duration_ms)}</td><td>{span.span_error ? <span className="te-error">Error</span> : <span aria-label="No error flag">—</span>}</td><td><button className="te-trace-link" onClick={event => onOpen(span.trace_id, event)} aria-label={`Open trace ${span.trace_id}`}><code>{span.trace_id.slice(0, 12)}…</code></button></td></tr>)}</tbody></table></div>}
            </section>
            {detail.traceId && <TraceDetail key={`${currentId}:${detail.traceId}`} projectId={currentId} detail={detail} onRetry={() => onOpen(detail.traceId)} onClose={onClose}/>}
          </>}
  </div>
}

function Status({ span }) { return <span className={`te-status ${span.http_status >= 500 ? 'te-error' : span.http_status >= 400 ? 'te-amber' : ''}`}>{span.http_status ?? '—'}</span> }

export function TraceDetail({ projectId, detail, onRetry, onClose }) {
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [detail.traceId])
  const forest = traceForest(detail.spans)
  const times = detail.spans.map(spanTime).filter(Number.isFinite)
  const start = times.length ? Math.min(...times) : 0
  const end = Math.max(start, ...detail.spans.map(span => (Number.isFinite(spanTime(span)) ? spanTime(span) : start) + (span.duration_ms || 0)))
  const window = end - start || 1
  const hasClient = detail.spans.some(span => span.span_kind === 'CLIENT')
  return <section className="ws-card te-detail" aria-label="Trace detail" aria-busy={detail.loading}>
    <div className="te-results-heading"><div><h2 ref={heading} tabIndex={-1}>Available trace spans</h2><code className="te-id">{detail.traceId}</code></div><button className="ws-secondary" onClick={onClose}><X size={16}/>Close trace</button></div>
    <p className="te-scope">Up to 100 stored spans for this trace in the selected application. Sampling, retention and excluded spans can leave gaps. Parent-child relationships use only returned IDs; no missing spans are reconstructed.</p>
    {detail.truncated && <p role="status" className="te-warning">Trace results may be truncated. The full trace cannot be confirmed and additional pages are unavailable.</p>}
    {detail.loading ? <p role="status" className="te-state">Loading available trace spans…</p>
      : detail.error ? <div className="ws-error" role="alert">Unable to load trace detail: {detail.error} <button className="ws-secondary" onClick={onRetry}>Retry trace detail</button><p>Trace ID queries require the backend advanced read capability. This does not require enabling dependency ingestion.</p></div>
        : detail.loaded && !detail.spans.length ? <p className="te-state">No spans returned for this trace. It may have expired or no longer be available.</p>
          : <>
            {!hasClient && detail.loaded && <p className="te-scope">No dependency spans returned. Only available spans are shown; this does not prove the request had no dependencies.</p>}
            <RequestInsights spans={detail.spans} projectId={projectId} truncated={detail.truncated}/><ol className="te-span-tree" aria-label="Available span hierarchy">{forest.map(({ span, depth, missingParent, detached }) => {
              const left = Math.max(0, Math.min(100, (spanTime(span) - start) / window * 100)) || 0
              const width = Math.max(0.6, Math.min(100 - left, (span.duration_ms || 0) / window * 100))
              return <li key={span.span_id} className="te-span" style={{ '--te-depth': Math.min(depth, 8) }}>
                <div className="te-span-top"><span className="ws-badge ws-purple">{span.span_kind || 'Kind unavailable'}</span><strong>{label(span)}</strong><span>{span.service_name}</span><span className="te-number">{duration(span.duration_ms)}</span>{span.span_error && <span className="te-error">Error</span>}</div>
                <div className="te-timeline" role="img" aria-label={`Starts ${Math.max(0, spanTime(span) - start).toFixed(3)} ms after first available span; duration ${duration(span.duration_ms)}`}><span style={{ left: `${left}%`, width: `${width}%` }}/></div>
                {missingParent && <p className="te-relation">Parent span not returned</p>}{detached && <p className="te-relation">Unresolved or cyclic parent relationship</p>}
                {depth > 8 && <p className="te-relation">Depth {depth}; visual indentation capped</p>}
                <details><summary>Span details · <code>{span.span_id}</code></summary><dl className="te-span-fields">{[
                  ['Span ID', span.span_id], ['Parent span ID', span.parent_span_id], ['Trace ID', span.trace_id], ['Started', date(span.started_at)], ['Received', date(span.received_at)],
                  ['HTTP method', span.http_method], ['Normalized endpoint', span.http_route], ['HTTP status', span.http_status], ['Environment', span.environment], ['Service version', span.service_version],
                  ['Database system', span.db_system], ['Database operation', span.db_operation], ['Error type', span.error_type],
                ].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? 'Unavailable'}</dd></div>)}</dl></details>
              </li>
            })}</ol>
          </>}
  </section>
}
