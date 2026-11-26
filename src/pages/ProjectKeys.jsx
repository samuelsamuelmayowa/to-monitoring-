import { KeyRound, RefreshCw } from 'lucide-react'

function KeyDate({ value }) {
  if (!value) return <span>Not recorded</span>
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? <span>Not recorded</span> : <time dateTime={value}>{date.toLocaleString()}</time>
}

export default function ProjectKeys({ details, secret = '', showSecret = false, onToggleSecret, onRefresh, onGenerate, onRevoke, pendingRevoke, onConfirmRevoke, onCancelRevoke, busy = false }) {
  const active = details.keys.filter(key => !key.revoked_at)
  const atLimit = details.activeCount !== null && details.activeCount >= details.maxActiveKeys
  const uncertain = !details.keysLoaded || details.keysLoading || Boolean(details.keysError) || details.activeCount === null
  return <section className="ws-card to-app-card">
    <h2>2. Generate ingestion key</h2><p>These send-only credentials authenticate telemetry for the selected application. They cannot read private traces.</p>
    <div className="to-app-key"><KeyRound size={18}/><code>{secret ? showSecret ? secret : '••••••••••••••••••••••••' : 'No newly generated secret currently displayed'}</code>{secret && <button type="button" onClick={onToggleSecret}>{showSecret ? 'Hide' : 'Show'}</button>}</div>
    <p className="to-app-small">The secret above is shown only after you explicitly create a key. Existing secrets cannot be recovered. No displayed secret does not mean that no active keys exist.</p>
    <div className="to-app-status-top"><h3>Active ingestion keys {details.activeCount === null ? '' : `(${details.activeCount}/${details.maxActiveKeys})`}</h3><button type="button" className="ws-secondary" onClick={onRefresh} disabled={details.keysLoading || busy}><RefreshCw size={15}/>Refresh keys</button></div>
    {details.keysLoading && <p role="status">Loading active key metadata…</p>}
    {details.keysError && <p role="alert" className="to-app-error">Key metadata unavailable: {details.keysError}. Refresh to check existing keys.</p>}
    {!uncertain && details.activeCount === 0 && <p>No active ingestion keys.</p>}
    {!details.keysLoading && !details.keysError && details.keysLoaded && details.activeCount === null && <p role="status">Active-key status is unknown because this API response may omit older active keys. Update the backend key-list endpoint; do not assume there are no keys.</p>}
    {active.map(key => <article className="to-app-key-record" key={key.id}>
      <div><strong><code>{key.key_prefix}…</code></strong><span className="ws-badge ws-green">Active</span></div>
      <p>Created: <KeyDate value={key.created_at}/></p><p>Last used: <KeyDate value={key.last_used_at}/></p>
      {pendingRevoke === key.id ? <div><p>Revoke this key? Applications using it will no longer be able to send telemetry.</p><button className="ws-secondary" type="button" disabled={busy} onClick={() => onConfirmRevoke(key.id)}>Confirm revoke</button><button className="ws-secondary" type="button" onClick={onCancelRevoke} disabled={busy}>Cancel</button></div> : <button type="button" className="ws-secondary" onClick={() => onRevoke(key.id)} disabled={busy}>Revoke</button>}
    </article>)}
    {atLimit && <p className="to-app-small">All three active-key slots are occupied. Use an existing secret saved on your server. If a secret is lost, choose an unused key to revoke only after confirming it is safe.</p>}
    <button type="button" className="ws-secondary" onClick={onGenerate} disabled={busy || uncertain || atLimit}><KeyRound size={16}/>{busy ? 'Working…' : 'Generate new key'}</button>
    <p className="to-app-small">Secrets belong only in your server environment. Refreshing or checking connection status never creates or revokes a key. Last use can include an empty request and does not prove traces were stored.</p>
    {details.keys.some(key => key.revoked_at) && <details><summary>Recent revoked keys</summary>{details.keys.filter(key => key.revoked_at).map(key => <p key={key.id}><code>{key.key_prefix}…</code> · Revoked <KeyDate value={key.revoked_at}/></p>)}</details>}
  </section>
}
