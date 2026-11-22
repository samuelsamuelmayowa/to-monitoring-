import { ArrowRight, Bell, LayoutDashboard, ScrollText, ShieldCheck, Activity, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// This page is a Vite + React Router port of the Lovable temporary entry page.
// Authentication state comes from the backend-verified cookie session.
export default function Welcome() {
  const { user } = useAuth()
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b1022] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 8% 16%, rgba(124,58,237,0.3), transparent 37%),radial-gradient(ellipse at 90% 75%, rgba(236,72,153,0.13),transparent 34%),linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
          backgroundSize: 'auto,auto,32px 32px,32px 32px',
        }} />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 py-5">
          <Link to="/" aria-label="T.O. Monitoring homepage" className="flex items-center gap-3">
            <img src="/to-analytics-logo.png" alt="T.O. Analytics" className="h-11 max-w-36 object-contain" />
            <span className="h-7 w-px bg-white/20" aria-hidden="true" />
            <span className="text-base font-bold tracking-tight text-white">Monitoring</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Authentication navigation">
            <Link to="/" className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white sm:inline-flex">Full homepage</Link>
            {user ? (
              <Link to="/workspace" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">Open workspace</Link>
            ) : (
              <>
                <Link to="/login" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Sign in</Link>
                <Link to="/signup" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">Get started</Link>
              </>
            )}
          </nav>
        </header>

        <main className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_1.08fr] lg:gap-16 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-violet-200">
              <Activity size={14} aria-hidden="true" /> Built by T.O. Analytics
            </div>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
              Understand your applications, <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">end to end.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
              Bring application logs, dashboards and alerts into one place — built for independent developers and growing engineering teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? '/workspace' : '/signup'} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-900/30 transition hover:-translate-y-0.5 hover:brightness-110">
                {user ? 'Open workspace' : 'Get started'} <ArrowRight size={17} aria-hidden="true" />
              </Link>
              {!user && <Link to="/login" className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">I already have an account</Link>}
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-4 text-sm text-slate-300">
              <li className="flex items-center gap-2"><ScrollText size={17} className="text-violet-300" /> Log Explorer</li>
              <li className="flex items-center gap-2"><LayoutDashboard size={17} className="text-violet-300" /> Dashboards</li>
              <li className="flex items-center gap-2"><Bell size={17} className="text-violet-300" /> Alerts</li>
            </ul>
            <p className="mt-8 text-xs leading-relaxed text-slate-400">Product preview. Monitoring integrations and customer workspaces are being built.</p>
          </motion.div>
          <MonitoringIllustration />
        </main>
      </div>
    </div>
  )
}

// Replaces the missing Lovable-specific MonitoringIllustration import.
// All displayed values are static demonstration data, not actual telemetry.
function MonitoringIllustration() {
  const requests = [40, 44, 38, 53, 48, 61, 56, 72, 67, 59, 74, 66, 78, 70, 85, 73, 90]
  const eventRows = [
    { code: '500', name: 'POST /api/checkout', type: 'text-rose-300', time: '14:32:08' },
    { code: '200', name: 'GET /api/products', type: 'text-emerald-300', time: '14:31:56' },
    { code: '401', name: 'POST /api/login', type: 'text-amber-300', time: '14:31:41' },
  ]
  return (
    <motion.section initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} aria-label="Illustrative monitoring dashboard preview" className="relative min-w-0">
      <div aria-hidden="true" className="absolute -inset-5 rounded-[36px] bg-violet-600/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#141b30] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#1a2138] px-5 py-4">
          <div className="flex items-center gap-2.5 text-sm font-bold"><img src="/to-mark.png" alt="" className="h-7 w-7 object-contain"/> <span>T.O. Monitoring</span></div>
          <span className="rounded-md bg-violet-500/20 px-2 py-1 text-[10px] font-bold tracking-wider text-violet-200">DEMO DATA</span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Personal workspace</p><h2 className="mt-1 text-lg font-bold">My Shopping API</h2></div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300"><CheckCircle2 size={12}/> Sample project</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[['Requests', '24,580'], ['Error rate', '0.42%'], ['Avg. latency', '146ms']].map(([label,value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:p-4"><div className="text-[10px] text-slate-400 sm:text-xs">{label}</div><div className="mt-2 text-lg font-bold tracking-tight text-white sm:text-2xl">{value}</div></div>)}
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Request activity</h3><span className="text-[11px] text-slate-400">Illustrative last hour</span></div>
            <div className="flex h-36 items-end gap-1.5" aria-hidden="true">{requests.map((height, i) => <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-violet-800/70 to-violet-400" style={{ height: `${height}%`, opacity: .62 + i / 52 }}/>)}</div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>60 min ago</span><span>Now</span></div>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><h3 className="text-sm font-semibold">Recent events</h3><span className="text-[11px] text-violet-200">Sample logs</span></div>
            {eventRows.map(row => <div key={row.name} className="flex items-center gap-3 border-t border-white/5 px-4 py-3 text-[11px] sm:text-xs"><span className={`w-8 font-bold ${row.type}`}>{row.code}</span><span className="min-w-0 flex-1 truncate font-mono text-slate-200">{row.name}</span><span className="text-slate-500">{row.time}</span></div>)}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-xl border border-violet-300/20 bg-[#252444] px-4 py-3 text-xs font-medium text-violet-100 shadow-lg sm:flex"><ShieldCheck size={17} className="text-violet-300"/> Workspace isolation is a design requirement</div>
    </motion.section>
  )
}
