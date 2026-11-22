import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, ArrowRight, Bell, Bookmark, Building2, Check, ChevronDown, Clock3, Code2, Coffee, FileSearch, FolderPlus, Gauge, LayoutDashboard, Lightbulb, LogOut, Menu, PlusCircle, Rocket, Search, Settings, Terminal, Users, UserRound, X, Zap, BookOpen, Network, Layers } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Workspace.css'

const navigation = [
  ['Overview', LayoutDashboard], ['Applications', Network], ['Log Explorer', Terminal],
  ['Dashboards', Gauge], ['Saved Searches', Bookmark], ['Alerts', Bell],
  ['Investigations', FileSearch], ['Team', Users], ['Settings', Settings],
]
const milestones = [
  ['Create workspace', 'Your signed-in workspace preview', 'Done'],
  ['Add application', 'Register API or microservice', 'Current'],
  ['Connect data source', 'OTel agent, syslog, or library', 'Pending'],
  ['Explore your first logs', 'Telemetry ingestion stream', 'Pending'],
  ['Create monitoring dashboard', 'Pin latency, error, and rate tiles', 'Pending'],
]

export default function Workspace() {
  const { user, loading, error, refreshSession } = useAuth()
  if (loading) return <main className="ws-state" role="status">Checking your session…</main>
  if (error) return <main className="ws-state"><p role="alert">{error}</p><button onClick={() => refreshSession().catch(() => {})}>Retry session check</button><Link to="/login">Go to sign in</Link></main>
  if (!user) return <Navigate to="/login" replace />
  return <WorkspaceDashboard user={user} />
}

function WorkspaceDashboard({ user }) {
  const { logout } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const [profile, setProfile] = useState(false)
  const [active, setActive] = useState('Overview')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const menuButton = useRef(null)
  const closeButton = useRef(null)
  const profileArea = useRef(null)
  const drawerArea = useRef(null)
  const name = user.name || user.email
  const initials = name.split(/[\s@]+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  function closeDrawer() { setDrawer(false); menuButton.current?.focus() }
  function selectPage(page) { setActive(page); setDrawer(false); setProfile(false); setNotice('') }
  useEffect(() => {
    if (!drawer) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    function onKey(event) {
      if (event.key === 'Escape') { setDrawer(false); menuButton.current?.focus() }
      if (event.key === 'Tab') {
        const controls = drawerArea.current?.querySelectorAll('button:not(:disabled), a[href]')
        if (!controls?.length) return
        const first = controls[0], last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) }
  }, [drawer])
  useEffect(() => {
    if (!profile) return
    function dismiss(event) {
      if (event.type === 'keydown' ? event.key === 'Escape' : !profileArea.current?.contains(event.target)) setProfile(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss) }
  }, [profile])
  async function signOut() {
    setBusy(true); setLogoutError('')
    try { await logout() } catch (err) { setLogoutError(err.message) } finally { setBusy(false) }
  }
  const avatar = <span className="ws-avatar" aria-hidden="true">{initials}</span>
  const navItems = navigation.map(([label, Icon]) => <button key={label} onClick={() => selectPage(label)} aria-current={active === label ? 'page' : undefined} className={active === label ? 'selected' : ''}><Icon size={20}/><span>{label}</span>{label === 'Team' && <small>Personal</small>}</button>)
  return <div className="workspace-shell">
    <a href="#workspace-main" className="ws-skip">Skip to workspace</a>
    <header className="ws-header">
      <div className="ws-header-brand"><button ref={menuButton} className="ws-icon-button" aria-label="Open navigation menu" aria-expanded={drawer} aria-controls="workspace-drawer" onClick={() => { setDrawer(true); setProfile(false) }}><Menu size={24}/></button><Link to="/" aria-label="T.O. Monitoring homepage"><img src="/to-analytics-logo.png" alt="T.O. Analytics"/></Link><button className="ws-workspace-pill" onClick={() => setNotice('You are viewing your personal workspace. Company workspaces are coming soon.')}><Building2 size={16}/><span>Personal Workspace</span><ChevronDown size={14}/></button></div>
      <div className="ws-header-actions"><button className="ws-icon-button" aria-label="Notifications" onClick={() => setNotice('You have no workspace notifications.')}><Bell size={22}/></button><div className="ws-profile" ref={profileArea}><button className="ws-icon-button" aria-label="Open account menu" aria-expanded={profile} aria-controls="workspace-profile" onClick={() => setProfile(!profile)}>{avatar}</button>{profile && <div id="workspace-profile" className="ws-profile-dropdown"><strong>{name}</strong><p>{user.email}</p><hr/><button onClick={() => selectPage('Settings')}><Settings size={18}/>Account settings</button><button disabled={busy} onClick={signOut} className="ws-danger"><LogOut size={18}/>{busy ? 'Signing out…' : 'Sign out'}</button></div>}</div></div>
    </header>
    <aside className="ws-desktop-sidebar" aria-label="Workspace navigation"><div className="ws-sidebar-heading"><Activity size={20}/>T.O. Monitor</div><nav>{navItems}</nav><div className="ws-sidebar-user">{avatar}<div><strong>{name}</strong><p>Personal account</p></div></div></aside>
    {drawer && <><div className="ws-overlay" onClick={closeDrawer}/><aside ref={drawerArea} id="workspace-drawer" className="ws-drawer" role="dialog" aria-modal="true" aria-label="Workspace navigation"><div className="ws-drawer-heading"><img src="/to-mark.png" alt=""/><strong>T.O. Monitor</strong><button ref={closeButton} onClick={closeDrawer} className="ws-icon-button" aria-label="Close navigation menu"><X size={22}/></button></div><div className="ws-workspace-picker"><div className="ws-picker-label">Current workspace <span>PREVIEW</span></div><button className="ws-picker-current" onClick={closeDrawer}><UserRound size={20}/><span><strong>Personal Workspace</strong><small>Your account</small></span><Check size={18}/></button><button onClick={() => { closeDrawer(); setNotice('Creating additional workspaces is coming soon.') }}><PlusCircle size={20}/>Create new workspace</button></div><nav>{navItems}</nav><div className="ws-sidebar-user">{avatar}<div><strong>{name}</strong><p>Personal account</p></div><button disabled={busy} onClick={signOut} className="ws-icon-button" aria-label="Sign out"><LogOut size={20}/></button></div></aside></>}
    <main id="workspace-main" className="ws-main" tabIndex={-1}>
      {logoutError && <p role="alert" className="ws-error">{logoutError}</p>}
      {notice && <div role="status" className="ws-notice"><span>{notice}</span><button className="ws-icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={18}/></button></div>}
      {active === 'Overview' ? <>
        <section className="ws-welcome"><span className="ws-badge ws-purple"><span className="ws-dot"/>Workspace preview</span><h1>Welcome to Your Monitoring Workspace</h1><p>Connect your first application to begin collecting logs, investigating errors, and understanding your services.</p></section>
        <div className="ws-preview-note">Onboarding preview · Application counts, setup progress, and integrations are not connected to live data yet.</div>
        <section className="ws-metrics" aria-label="Sample workspace metrics">{[
          [Network, '0', 'Applications', 'Empty', 'red'], [Terminal, '0', 'Log Events', 'Idle', 'gray'],
          [Bell, '0', 'Active Alerts', 'Clear', 'green'], [UserRound, '1', 'Team Member', 'You', 'purple'],
        ].map(([Icon, value, label, badge, color]) => <article className="ws-metric ws-card" key={label}><div><span className="ws-metric-icon"><Icon size={19}/></span><span className={`ws-badge ws-${color}`}>{badge}</span></div><strong>{value}</strong><p>{label}</p></article>)}</section>
        <div className="ws-content-grid"><div className="ws-column">
          <section className="ws-card ws-connect"><div className="ws-section-eyebrow"><span className="ws-rocket"><Rocket size={20}/></span><span className="ws-badge ws-purple">Step 1 of 5</span></div><h2>Let’s Connect Your First Application</h2><p>Choose how you want to bring application information into T.O. Monitoring. Deploy an agent, configure a direct SDK, or forward from container runtimes.</p><button className="ws-primary" onClick={() => selectPage('Applications')}><PlusCircle size={20}/>Add Your First Application<ArrowRight size={18}/></button><a className="ws-quickstart-link" href="#quickstart"><BookOpen size={16}/>Read Quickstart Guide</a></section>
          <section className="ws-card ws-progress"><div className="ws-section-heading"><div><h2>Setup Progress</h2><p>Complete these milestones to go live</p></div><span className="ws-badge ws-purple">20% Preview</span></div><div className="ws-progress-track" role="progressbar" aria-label="Illustrative setup progress" aria-valuenow={20} aria-valuemin={0} aria-valuemax={100}><span/></div><div className="ws-milestones">{milestones.map(([title, subtitle, state], index) => <div key={title} className={`ws-milestone ${state.toLowerCase()}`}><span className="ws-step-icon">{index === 0 ? <Check size={16}/> : index === 1 ? <ArrowRight size={16}/> : <Clock3 size={16}/>}</span><div><strong>{title}</strong><p>{subtitle}</p></div><span className={`ws-badge ${index === 0 ? 'ws-green' : index === 1 ? 'ws-purple-solid' : 'ws-gray'}`}>{state}</span></div>)}</div></section>
        </div><div className="ws-column"><section id="quickstart" className="ws-card ws-tips"><h2><Code2 size={21}/>Quick Tips for Developers</h2><p>Plan your first integration. SDKs and auto-instrumentation options shown below are planned integrations.</p><div className="ws-language-grid">{[[Code2, 'Node.js', 'Express / Fastify'], [Terminal, 'Python', 'Django / FastAPI'], [Zap, 'Go (Golang)', 'Gin / Fiber / Chi'], [Coffee, 'Java', 'Spring Boot']].map(([Icon, title, description]) => <div key={title}><Icon size={20}/><span><strong>{title}</strong><small>{description}</small></span></div>)}</div><div className="ws-container-tip"><Layers size={22}/><div><strong>Docker &amp; Kubernetes</strong><p>Container setup guide coming soon</p></div></div></section><section className="ws-pro-tip"><Lightbulb size={23}/><div><h3>Pro tip: Local Dev Environment</h3><p>Start with a development application before connecting production services. Integration instructions will appear here when available.</p></div></section></div></div>
      </> : <section className="ws-card ws-section-page"><span className="ws-badge ws-purple">Workspace preview</span><h1>{active}</h1>{active === 'Settings' ? <><h2>Your account</h2><p><strong>{name}</strong><br/>{user.email}</p><p>Workspace preferences are coming soon.</p></> : <><div className="ws-empty-icon">{active === 'Applications' ? <FolderPlus size={36}/> : <Search size={36}/>}</div><h2>{active === 'Applications' ? 'Connect your first application' : `Your ${active.toLowerCase()} will appear here`}</h2><p>{active === 'Applications' ? 'Application registration and ingestion setup are being built. No applications have been created by this preview.' : 'This section is being built. Live workspace data is not connected yet.'}</p></>}<button className="ws-secondary" onClick={() => selectPage('Overview')}>Back to overview<ArrowRight size={16}/></button></section>}
      <footer className="ws-footer">T.O. Monitoring <span>Built by T.O. Analytics</span></footer>
    </main>
  </div>
}
