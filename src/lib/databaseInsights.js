export const isDatabase = s => s.span_kind === 'CLIENT' && ['mysql','postgresql','sqlite','redis','mongodb'].includes(s.db_system)
const operations = new Set(['SELECT','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP','BEGIN','COMMIT','ROLLBACK','GET','SET','DEL','FIND','FINDONE','AGGREGATE','COUNT','PING','EXECUTE'])
export const databaseName = s => `${s.db_system === 'mysql' ? 'MySQL' : s.db_system} ${operations.has(s.db_operation) ? s.db_operation : 'query'}`
export function databaseOutcome(s) {
  if (!s.span_error) return 'Unknown'
  if (['TimeoutError','ETIMEDOUT','timeout'].includes(s.error_type)) return 'Failed · timeout'
  if (['ECONNREFUSED','ECONNRESET','ENOTFOUND'].includes(s.error_type)) return 'Failed · connection failure'
  return 'Failed · database operation failure'
}
export function requestEvidence(spans, request, threshold=500, countThreshold=10) {
  const database = spans.filter(s => isDatabase(s) && s.trace_id === request.trace_id)
  const durations = database.map(s => s.duration_ms).filter(Number.isFinite)
  return { database, count: database.length, warning: database.length >= countThreshold,
    slow: database.filter(s => s.duration_ms > threshold).length,
    errors: database.filter(s => s.span_error).length,
    slowest: durations.length ? Math.max(...durations) : null }
}
export function timelinePositions(spans) {
  const timed = spans.filter(s => Number.isFinite(Date.parse(s.started_at)) && Number.isFinite(s.duration_ms))
  if (!timed.length) return []
  const start = Math.min(...timed.map(s => Date.parse(s.started_at)))
  const end = Math.max(...timed.map(s => Date.parse(s.started_at)+s.duration_ms)), window = end-start || 1
  return timed.map(span => ({ span, offset: Date.parse(span.started_at)-start, left: (Date.parse(span.started_at)-start)/window*100, width: span.duration_ms/window*100 }))
}
