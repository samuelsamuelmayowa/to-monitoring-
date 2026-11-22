import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Workspace() {
  const { user, loading, error, refreshSession, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [busy, setBusy] = useState(false)
  if (loading) return <main className="grid min-h-screen place-content-center" role="status">Checking your session…</main>
  if (error) return <main className="grid min-h-screen place-content-center gap-4 p-6 text-center"><p role="alert">{error}</p><button onClick={() => refreshSession().catch(() => {})}>Retry session check</button><Link to="/login">Go to sign in</Link></main>
  if (!user) return <Navigate to="/login" replace />
  return <main className="min-h-screen bg-[#f8f6ff] p-6 text-[#282039] sm:p-12"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-center justify-between gap-4"><Link to="/" className="text-xl font-bold">T.O. Monitoring</Link><button disabled={busy} onClick={async () => {
    setBusy(true); setLogoutError('')
    try { await logout() } catch (err) { setLogoutError(err.message) } finally { setBusy(false) }
  }} className="rounded-xl border border-violet-200 bg-white px-5 py-3 font-semibold disabled:opacity-50">{busy ? 'Signing out…' : 'Sign out'}</button></header>{logoutError && <p role="alert" className="mt-4 text-rose-700">{logoutError}</p>}<section className="mt-12 rounded-2xl border border-violet-100 bg-white p-8 shadow-sm"><p className="text-sm font-semibold text-violet-700">Your workspace</p><h1 className="mt-3 text-3xl font-bold">Welcome, {user.name || user.email}</h1><p className="mt-4 text-slate-600">Signed in as {user.email}.</p><p className="mt-6 text-slate-600">Your account is connected. Monitoring projects, dashboards, and integrations are being built.</p></section></div></main>
}
