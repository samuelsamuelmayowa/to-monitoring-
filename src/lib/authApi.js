let csrfToken = ''
export async function authRequest(path, { method = 'GET', body, signal, baseUrl = '/api' } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken
  const response = await fetch(`${baseUrl}${path}`, { method, headers, credentials: 'include', cache: 'no-store', signal, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json().catch(() => null)
  if (typeof data?.csrfToken === 'string') csrfToken = data.csrfToken
  if (!response.ok) throw new Error(data?.message || data?.error || (response.status === 404 && path.startsWith('/projects') ? 'Monitoring API route not found. Confirm the backend deployment includes /api/monitoring.' : `Request failed (${response.status}). Please try again.`))
  if (response.status === 204) return null
  if (!data) throw new Error('The authentication service returned an invalid response.')
  return data
}
export function clearCsrfToken() { csrfToken = '' }
