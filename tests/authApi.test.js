import test from 'node:test'
import assert from 'node:assert/strict'
import { authRequest, clearCsrfToken } from '../src/lib/authApi.js'

test('cookie session contract and CSRF lifecycle', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options })
    return new Response(JSON.stringify(url.endsWith('/session')
      ? { authenticated: true, csrfToken: 'session-csrf' }
      : { authenticated: false }), { status: 200 })
  }
  try {
    clearCsrfToken()
    await authRequest('/session')
    await authRequest('/session/logout', { method: 'POST' })
    assert.equal(requests[0].credentials, 'include')
    assert.equal(requests[0].cache, 'no-store')
    assert.equal(requests[0].headers['X-CSRF-Token'], undefined)
    assert.equal(requests[1].headers['X-CSRF-Token'], 'session-csrf')
    clearCsrfToken()
    await authRequest('/login', { method: 'POST', body: { email: 'test@example.com', password: 'example' } })
    assert.equal(requests[2].headers['X-CSRF-Token'], undefined)
    assert.deepEqual(JSON.parse(requests[2].body), { email: 'test@example.com', password: 'example' })
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 })
    await assert.rejects(authRequest('/login', { method: 'POST' }), /Invalid credentials/)
    globalThis.fetch = async () => new Response('<html>Wrong proxy</html>')
    await assert.rejects(authRequest('/session'), /invalid response/)
  } finally { globalThis.fetch = originalFetch; clearCsrfToken() }
})
