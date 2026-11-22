import { createContext, useContext, useEffect, useState } from 'react'
import { authRequest, clearCsrfToken } from '../lib/authApi'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function refreshSession(signal) {
    setLoading(true)
    setError('')
    try {
      const data = await authRequest('/session', { signal })
      setUser(data.authenticated === true ? data.user : null)
      return data
    } catch (err) {
      if (err.name === 'AbortError') return
      setUser(null)
      setError(err.message || 'Unable to check your session.')
      throw err
    } finally { if (!signal?.aborted) setLoading(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    refreshSession(controller.signal).catch(() => {})
    return () => controller.abort()
  }, [])
  async function authenticate(path, body) {
    await authRequest(path, { method: 'POST', body })
    const session = await refreshSession()
    if (session?.authenticated !== true || !session.user) throw new Error('Your session could not be saved. Please allow cookies and try again.')
  }
  async function logout() {
    await authRequest('/session')
    await authRequest('/session/logout', { method: 'POST' })
    clearCsrfToken()
    setUser(null)
  }
  return <AuthContext.Provider value={{ user, loading, error, refreshSession, authenticate, logout }}>{children}</AuthContext.Provider>
}
export function useAuth() { return useContext(AuthContext) }
