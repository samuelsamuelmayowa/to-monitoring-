import { monitoringRequest } from './monitoringApi.js'

function validStatus(value) {
  if (!value || typeof value.connected !== 'boolean' || !Number.isSafeInteger(value.span_count) || value.span_count < 0) {
    throw new Error('The application status response is invalid.')
  }
  return value
}

export function summarizeWorkspace(state) {
  const completeList = state.applicationCount !== null && state.applicationCount === state.projects.length
  const statuses = state.projects.map(project => state.statuses[project.id])
  const known = completeList && statuses.every(item => item?.data)
  const connected = statuses.some(item => item?.data?.connected === true)
  const connectionKnown = known || connected
  const steps = [
    { title: 'Sign in', subtitle: 'Your verified personal account', state: 'Done' },
    { title: 'Register an application', subtitle: 'Add your Node.js application', state: state.applicationCount === null ? 'Unknown' : state.applicationCount > 0 ? 'Done' : 'Current' },
    { title: 'Connect OpenTelemetry', subtitle: 'An authenticated trace received in the last 10 minutes', state: connected ? 'Done' : connectionKnown ? state.projects.length ? 'Current' : 'Pending' : 'Unknown' },
    { title: 'Collect application logs', subtitle: 'Log ingestion is not available yet', state: 'Planned' },
    { title: 'Create a dashboard', subtitle: 'Dashboard persistence is not available yet', state: 'Planned' },
  ]
  const verified = steps.slice(0, 3).filter(step => step.state === 'Done').length
  return {
    applications: state.applicationCount,
    spans: known ? statuses.reduce((count, item) => count + item.data.span_count, 0) : null,
    connectedApplications: known ? statuses.filter(item => item.data.connected).length : null,
    connected,
    progress: steps.slice(0, 3).some(step => step.state === 'Unknown') ? null : Math.round(verified / 3 * 100),
    verified, steps,
    telemetryError: !completeList && state.applicationCount !== null
      ? 'Telemetry totals are unavailable because the API returned only part of your application list.'
      : statuses.find(item => item?.error)?.error || '',
  }
}

// One instance per signed-in workspace. Shared by Overview and Applications;
// never cached across users or written to localStorage.
export function createWorkspaceOverviewStore({ request = monitoringRequest } = {}) {
  let state = { projects: [], applicationCount: null, statuses: {}, loading: true, refreshing: false, metricsLoading: true, error: '' }
  let generation = 0, controller
  let statusRevision = 0
  const statusRevisions = new Map()
  const listeners = new Set()
  function update(patch) { state = { ...state, ...patch }; listeners.forEach(listener => listener()) }
  function cancel() { generation++; controller?.abort() }

  async function refresh() {
    cancel()
    const current = generation
    const refreshRevision = statusRevision
    controller = new AbortController()
    const signal = controller.signal
    update({ refreshing: true, metricsLoading: true, error: '' })
    try {
      const result = await request('/projects', { signal })
      if (current !== generation) return
      if (!Array.isArray(result?.projects) || result.projects.some(project => !project || typeof project.id !== 'string')) throw new Error('The application list response is invalid.')
      const projects = result.projects
      // The current API supplies total. Older deployments are exact only when
      // fewer than the endpoint's 100-row limit are returned.
      const total = result.total ?? (projects.length < 100 ? projects.length : null)
      if (total !== null && (!Number.isSafeInteger(total) || total < projects.length)) throw new Error('The application count response is invalid.')
      update({ projects, applicationCount: total, statuses: Object.fromEntries(projects.filter(project => state.statuses[project.id]).map(project => [project.id, state.statuses[project.id]])), loading: false })
      const statuses = {}
      let cursor = 0
      const worker = async () => {
        while (cursor < projects.length && current === generation) {
          const project = projects[cursor++]
          try {
            statuses[project.id] = { data: validStatus(await request(`/projects/${encodeURIComponent(project.id)}/status`, { signal })) }
          } catch (error) {
            if (signal.aborted) return
            statuses[project.id] = { error: `Could not load telemetry for ${project.name || 'an application'}: ${error.message}` }
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, projects.length) }, worker))
      if (current !== generation) return
      for (const project of projects) {
        if ((statusRevisions.get(project.id) || 0) > refreshRevision && state.statuses[project.id]) statuses[project.id] = state.statuses[project.id]
      }
      update({ statuses, metricsLoading: false, refreshing: false })
    } catch (error) {
      if (current !== generation || signal.aborted) return
      update({ applicationCount: null, statuses: {}, loading: false, refreshing: false, metricsLoading: false, error: error.message || 'Unable to load your applications.' })
    }
  }

  function addProject(project) {
    cancel() // Ignore a list/status response started before registration committed.
    const exists = state.projects.some(item => item.id === project.id)
    const projects = [project, ...state.projects.filter(item => item.id !== project.id)]
    update({ projects, applicationCount: state.applicationCount === null ? null : state.applicationCount + (exists ? 0 : 1), loading: false, metricsLoading: true, error: '' })
    void refresh()
  }
  function noteStatus(id, data) {
    if (!state.projects.some(project => project.id === id)) return
    try { const status = validStatus(data); statusRevisions.set(id, ++statusRevision); update({ statuses: { ...state.statuses, [id]: { data: status } } }) }
    catch (error) { noteStatusError(id, error.message) }
  }
  function noteStatusError(id, error) {
    if (state.projects.some(project => project.id === id)) { statusRevisions.set(id, ++statusRevision); update({ statuses: { ...state.statuses, [id]: { error } } }) }
  }
  return { subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }, getSnapshot: () => state,
    refresh, cancel, addProject, noteStatus, noteStatusError }
}
