import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react'

// Intentionally a placeholder: the shared Lovable snippet has NO real login/signup implementation.
// Replace this route with the real auth components when you import them and connect your existing backend.
export default function AuthPreview() {
  const { pathname } = useLocation()
  const isLogin = pathname === '/login'
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6ff] px-5 py-12 text-[#282039]">
      <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-7 shadow-xl shadow-violet-900/10 sm:p-9">
        <Link to="/" aria-label="Return to T.O. Monitoring homepage" className="inline-flex items-center gap-3">
          <img src="/to-analytics-logo.png" alt="T.O. Analytics" className="h-12 w-36 object-contain" />
          <span className="h-6 w-px bg-violet-200" />
          <span className="font-bold">Monitoring</span>
        </Link>
        <div className="mt-9 flex size-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><LockKeyhole size={23} /></div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{isLogin ? 'Sign in to Monitoring' : 'Create your account'}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">The Lovable code you shared contains only a temporary homepage, not the authentication forms or backend integration.</p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-violet-700"/><p>This is a UI placeholder. Google sign-in and email/password authentication have <strong>not</strong> been connected. Your existing T.O. backend should verify sessions before workspace access.</p></div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"><ArrowLeft size={16}/> Back to homepage</Link><Link to={isLogin ? '/signup' : '/login'} className="text-sm font-semibold text-slate-600 hover:text-violet-700">{isLogin ? 'Create account' : 'Already have an account?'}</Link></div>
      </div>
    </main>
  )
}
