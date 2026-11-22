import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const { pathname } = useLocation()
  const isLogin = pathname === '/login'
  const { user, loading, authenticate } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action) {
    setBusy(true); setError('')
    try { await action(); navigate('/workspace', { replace: true }) }
    catch (err) {
      const messages = {
        'auth/popup-closed-by-user': 'Google sign-in was cancelled. Please try again.',
        'auth/popup-blocked': 'Allow popups for this site and try Google sign-in again.',
        'auth/unauthorized-domain': 'Google sign-in is not configured for this domain yet.',
        'auth/network-request-failed': 'Unable to reach Google. Check your connection and try again.',
      }
      setError(messages[err.code] || err.message || 'Sign-in failed. Please try again.')
    } finally { setBusy(false) }
  }
  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const body = { email: fields.get('email').trim(), password: fields.get('password') }
    if (!isLogin) {
      body.name = fields.get('name').trim()
      if (!body.name) { setError('Enter your name.'); return }
      if (body.password !== fields.get('confirmPassword')) { setError('Passwords do not match.'); return }
    }
    await run(() => authenticate(isLogin ? '/login' : '/sighup', body))
  }
  if (!loading && user) return <Navigate to="/workspace" replace />
  const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100'
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f6ff] px-5 py-12 text-[#282039]">
    <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-7 shadow-xl shadow-violet-900/10 sm:p-9">
      <Link to="/" className="inline-flex items-center gap-3"><img src="/to-analytics-logo.png" alt="T.O. Analytics" className="h-12 w-36 object-contain"/><span className="font-bold">Monitoring</span></Link>
      <h1 className="mt-8 text-3xl font-extrabold">{isLogin ? 'Sign in to Monitoring' : 'Create your account'}</h1>
      <p className="mt-3 text-sm text-slate-600">Use your T.O. Analytics account to access Monitoring.</p>
      <form key={pathname} onSubmit={submit} className="mt-7 space-y-4">
        <fieldset disabled={busy || loading} className="space-y-4 disabled:opacity-60">
          {!isLogin && <label className="block text-sm font-semibold">Name<input name="name" autoComplete="name" required maxLength={100} className={inputClass}/></label>}
          <label className="block text-sm font-semibold">Email address<input name="email" type="email" autoComplete="email" required className={inputClass}/></label>
          <label className="block text-sm font-semibold">Password<input name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength={isLogin ? undefined : 8} className={inputClass}/></label>
          {!isLogin && <label className="block text-sm font-semibold">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={inputClass}/></label>}
          <button type="submit" className="w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white hover:bg-violet-800">{busy ? 'Please wait…' : loading ? 'Checking session…' : isLogin ? 'Sign in' : 'Create account'}</button>
          <button type="button" onClick={() => run(async () => {
            const { getGoogleIdToken } = await import('../lib/googleAuth')
            await authenticate('/google', { idToken: await getGoogleIdToken() })
          })} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-50">Continue with Google</button>
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </form>
      <div className="mt-7 flex flex-wrap justify-between gap-3 text-sm"><Link to="/" className="font-semibold text-violet-700">Back to homepage</Link><Link to={isLogin ? '/signup' : '/login'} onClick={() => setError('')} className="font-semibold text-violet-700">{isLogin ? 'Create account' : 'Already have an account?'}</Link></div>
    </div>
  </main>
}
