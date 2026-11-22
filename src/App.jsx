import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Box,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  Code2,
  Database,
  FileText,
  Fingerprint,
  Gauge,
  Layers3,
  LockKeyhole,
  Menu,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

const brandLogo = '/to-analytics-logo.png'
const brandMark = '/to-mark.png'

const NAV = [
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Security', href: '#security' },
]

const CHARTS = {
  '1h': {
    requests: '24,580', errors: '0.42%', latency: '146ms',
    data: [36, 43, 39, 48, 55, 45, 51, 62, 58, 72, 61, 67, 83, 71, 79, 86, 73, 88, 81, 95].map((value, i) => ({ time: `${i * 3}m`, value })),
  },
  '24h': {
    requests: '487,210', errors: '0.31%', latency: '132ms',
    data: [44, 41, 36, 39, 48, 66, 77, 69, 85, 72, 64, 57, 73, 81, 76, 90, 88, 77, 72, 82].map((value, i) => ({ time: `${i + 1}h`, value })),
  },
  '7d': {
    requests: '3.12M', errors: '0.28%', latency: '139ms',
    data: [42, 54, 49, 57, 68, 66, 81, 75, 72, 83, 67, 61, 76, 86, 77, 79, 92, 84, 81, 96].map((value, i) => ({ time: `Point ${i + 1}`, value })),
  },
}

const LOGS = [
  { time: '14:32:08', method: 'POST', path: '/api/checkout', service: 'checkout-api', status: 500, message: 'Payment request failed' },
  { time: '14:31:56', method: 'GET', path: '/api/products', service: 'storefront', status: 200, message: 'Request completed' },
  { time: '14:31:41', method: 'POST', path: '/api/login', service: 'auth-service', status: 401, message: 'Invalid credentials' },
  { time: '14:31:26', method: 'GET', path: '/api/orders', service: 'orders-api', status: 200, message: 'Request completed' },
]

const FEATURES = [
  { icon: Terminal, title: 'Understand every error', description: 'Go from a failed request to its context. Filter logs by service, endpoint, severity and time.', className: 'feature-lilac', tag: 'LOG EXPLORER' },
  { icon: Gauge, title: 'See the bigger picture', description: 'Turn individual log events into clear visual trends that help your team spot what changed.', className: 'feature-blue', tag: 'DASHBOARDS' },
  { icon: BellRing, title: 'Know what needs attention', description: 'Define meaningful alert rules and keep a traceable history of the events behind them.', className: 'feature-peach', tag: 'ALERTS' },
]

const STEPS = [
  { n: '01', icon: Users, title: 'Create a workspace', description: 'Start personally or create a workspace for your engineering team.' },
  { n: '02', icon: Box, title: 'Add your project', description: 'Organize each application and upload JSON or CSV sample logs first.' },
  { n: '03', icon: Search, title: 'Explore the signals', description: 'Investigate requests, errors and patterns in one focused interface.' },
  { n: '04', icon: BellRing, title: 'Turn insight into action', description: 'Save important views and set alert rules as monitoring evolves.' },
]

function Brand({ compact = false }) {
  return (
    <a className={`brand ${compact ? 'brand-compact' : ''}`} href="#top" aria-label="T.O. Monitoring home">
      <img className="brand-original" src={brandLogo} alt="T.O. Analytics" />
      <span className="brand-divider" aria-hidden="true" />
      <span className="brand-product">Monitoring</span>
    </a>
  )
}

function ButtonLink({ href, children, variant = 'primary', icon = true, className = '' }) {
  return (
    <a className={`button button-${variant} ${className}`} href={href}>
      {children}
      {icon && <ArrowUpRight size={18} aria-hidden="true" />}
    </a>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container navbar">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          {NAV.map(item => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="nav-actions">
          <a className="nav-home" href="https://www.to-analytics.com/" target="_blank" rel="noreferrer">T.O. Analytics <ArrowUpRight size={14} /></a>
          <a className="nav-home" href="/login">Sign in</a>
          <ButtonLink href="/signup" className="nav-cta">Get started</ButtonLink>
        </div>
        <button className="mobile-menu-toggle" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
      {open && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          {NAV.map(item => <a href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}<ChevronRight size={18} /></a>)}
          <a href="/login" onClick={() => setOpen(false)}>Sign in <ArrowRight size={18}/></a>
          <a href="/signup" onClick={() => setOpen(false)}>Get started <ArrowRight size={18}/></a>
          <a href="https://www.to-analytics.com/" target="_blank" rel="noreferrer">Visit T.O. Analytics <ArrowUpRight size={18}/></a>
        </nav>
      )}
    </header>
  )
}

function SectionHeading({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={`section-heading ${align === 'center' ? 'center' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}

function MonitoringPreview() {
  const [range, setRange] = useState('1h')
  const [query, setQuery] = useState('')
  const data = CHARTS[range]
  const rows = useMemo(() => LOGS.filter(log => `${log.path} ${log.service} ${log.status} ${log.message}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <div className="monitoring-preview" id="product">
      <div className="preview-topbar">
        <div className="preview-top-title"><img src={brandMark} alt="" /><span>T.O. Monitoring</span><span className="preview-top-separator">/</span><span className="preview-muted">Overview</span></div>
        <span className="demo-pill"><span /> DEMO DATA</span>
      </div>
      <div className="preview-content">
        <div className="preview-heading-row">
          <div><div className="preview-overline">PERSONAL WORKSPACE</div><h3>My Shopping API <ChevronRight size={19}/></h3></div>
          <div className="preview-time-tabs" aria-label="Preview time range">
            {Object.keys(CHARTS).map(key => <button key={key} onClick={() => setRange(key)} type="button" className={range === key ? 'selected' : ''} aria-pressed={range === key}>{key}</button>)}
          </div>
        </div>
        <div className="preview-stats">
          <div><span>Requests</span><strong>{data.requests}</strong><small><span className="stat-spark" /> Sample volume</small></div>
          <div><span>Error rate</span><strong>{data.errors}</strong><small className="stat-alert">HTTP 4xx / 5xx</small></div>
          <div><span>Avg. latency</span><strong>{data.latency}</strong><small>Illustrative metric</small></div>
        </div>
        <div className="chart-panel">
          <div className="chart-header"><div><strong>Request activity</strong><span>Sample traffic over the selected period</span></div><div className="legend"><span /> Requests</div></div>
          <div className="chart-container" aria-label={`Illustrative chart showing requests for ${range}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.data} margin={{ left: -36, right: 0, top: 10, bottom: 0 }}>
                <defs><linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9d77ff" stopOpacity={0.3} /><stop offset="100%" stopColor="#9d77ff" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid stroke="#30354f" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#7984a3', fontSize: 10 }} tickFormatter={(v, i) => i % 5 === 0 ? v : ''} />
                <Tooltip contentStyle={{ background: '#1e223a', border: '1px solid #414563', borderRadius: 12, color: '#fff' }} cursor={{ stroke: '#9674ff', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="value" stroke="#a887ff" strokeWidth={2.8} fill="url(#trafficGradient)" dot={false} activeDot={{ r: 4, fill: '#a887ff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="events-panel">
          <div className="events-heading"><div><strong>Recent events</strong><span>Explore sample application logs</span></div><span className="events-count">{rows.length} events</span></div>
          <label className="log-search"><Search size={15} /><input type="search" placeholder="Search events, services or status..." value={query} onChange={event => setQuery(event.target.value)} aria-label="Search sample logs" /></label>
          <div className="log-table">
            {rows.length ? rows.map((log, index) => (
              <div className="log-row" key={`${log.time}-${index}`}>
                <span className="log-time">{log.time}</span>
                <span className={`http-pill ${log.status >= 500 ? 'http-error' : log.status >= 400 ? 'http-warn' : 'http-ok'}`}>{log.status}</span>
                <span className="log-path"><b>{log.method}</b> {log.path}</span>
                <span className="log-service">{log.service}</span>
              </div>
            )) : <div className="empty-logs">No sample events match your search.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid-decoration" aria-hidden="true" />
      <div className="container hero-inner">
        <div className="hero-copy">
          <div className="announcement"><span className="announcement-dot"/> INTRODUCING T.O. MONITORING <ArrowRight size={14} /></div>
          <h1>Understand your apps.<br/><em>Before problems grow.</em></h1>
          <p className="hero-subtitle">All your application signals, one clearer picture. Explore errors, understand performance and create monitoring workflows for your projects and teams.</p>
          <div className="hero-buttons">
            <ButtonLink href="/signup">Get started</ButtonLink>
            <ButtonLink href="#how-it-works" variant="outline" icon={false}>See how it works <ArrowRight size={18}/></ButtonLink>
          </div>
          <div className="hero-highlights"><div><CircleCheck size={17} /> For individual developers</div><div><CircleCheck size={17} /> Built for growing teams</div></div>
          <div className="hero-small-note">Product concept in development · Preview uses sample data</div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/>
          <MonitoringPreview />
          <div className="floating-insight"><span className="floating-icon"><Activity size={19}/></span><div><b>Investigate with context</b><small>Events • Trends • Alerts</small></div><ArrowUpRight size={17}/></div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="section features-section" id="platform">
      <div className="container">
        <div className="section-head-row"><SectionHeading eyebrow="THE PLATFORM" title={<>Less noise. <span className="text-gradient">More clarity.</span></>} description="A focused monitoring experience that helps you move from raw application events to practical engineering decisions."/><span className="section-aside">EXPLORE THE POSSIBILITIES <ArrowUpRight size={16}/></span></div>
        <div className="features-grid">
          {FEATURES.map(({ icon: Icon, title, description, className, tag }) => <article className={`feature-card ${className}`} key={title}><div className="feature-icon"><Icon size={24}/></div><div className="feature-copy"><span className="feature-tag">{tag}</span><h3>{title}</h3><p>{description}</p></div><div className="feature-art" aria-hidden="true">{tag === 'LOG EXPLORER' ? <div className="art-logs"><i/><i/><i/></div> : tag === 'DASHBOARDS' ? <div className="art-bars">{[34,60,44,74,56,93,70].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div> : <div className="art-alert"><BellRing size={29}/><span>Rule matched</span><Check size={17}/></div>}</div></article>)}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="section how-section" id="how-it-works">
      <div className="container">
        <SectionHeading eyebrow="HOW IT WORKS" title="From project to perspective." description="Start with a small project. Add the data you need. Grow into team-wide monitoring when your infrastructure is ready." align="center"/>
        <div className="steps-grid">
          {STEPS.map(({ n, icon: Icon, title, description }) => <article className="step" key={n}><div className="step-top"><span>{n}</span><div><Icon size={22}/></div></div><h3>{title}</h3><p>{description}</p></article>)}
        </div>
        <div className="roadmap-note"><Sparkles size={18}/><span>First milestone: safe JSON/CSV sample uploads. Live Node.js integration and additional sources are planned next.</span></div>
      </div>
    </section>
  )
}

function Solutions() {
  return (
    <section className="section solutions-section" id="solutions">
      <div className="container">
        <SectionHeading eyebrow="WHO IT'S FOR" title="Start solo. Grow together." description="One monitoring product, designed for different ways of building software." align="center"/>
        <div className="solutions-grid">
          <article className="solution-card dev-solution">
            <div className="solution-header"><span className="solution-icon"><Code2 size={23}/></span><span>FOR DEVELOPERS</span></div>
            <h3>Understand what your code is telling you.</h3><p>Keep every personal project organized. See errors clearly, trace failed requests and build confidence as your applications evolve.</p>
            <div className="solution-example"><div className="solution-example-top"><Server size={17}/><b>My Shopping API</b><span>Sample</span></div><div className="solution-example-row"><span><span className="dot dot-red"/> checkout-api</span><b>HTTP 500</b></div><div className="solution-example-row"><span><span className="dot dot-green"/> storefront</span><b>HTTP 200</b></div></div>
            <a href="#product" className="text-link">Explore developer preview <ArrowRight size={17}/></a>
          </article>
          <article className="solution-card team-solution">
            <div className="solution-header"><span className="solution-icon"><Building2 size={23}/></span><span>FOR COMPANIES</span></div>
            <h3>One clear view for the whole team.</h3><p>Bring applications into private workspaces, invite collaborators and give engineers a common view of operational issues.</p>
            <div className="solution-example"><div className="solution-example-top"><Building2 size={17}/><b>Northstar Digital</b><span>Sample</span></div><div className="solution-example-row"><span><span className="dot dot-green"/> Payments API</span><b>Connected*</b></div><div className="solution-example-row"><span><span className="dot dot-green"/> Authentication API</span><b>Connected*</b></div></div>
            <a href="#security" className="text-link">Explore workspace design <ArrowRight size={17}/></a>
          </article>
        </div>
        <p className="sample-disclaimer">*Illustrative interface only. Real application connections are part of the product roadmap.</p>
      </div>
    </section>
  )
}

function Separation() {
  return (
    <section className="section separation-section">
      <div className="container split-layout">
        <div className="separation-copy"><span className="eyebrow">ONE T.O. PLATFORM · TWO PRODUCTS</span><h2>Learn in the lab.<br/><span className="text-gradient">Monitor in the real world.</span></h2><p>T.O. Analytics already provides a Splunk training experience. T.O. Monitoring extends that vision to the applications developers and companies build.</p><p>They share a brand and a learning mindset—not their event data. Training records and customer telemetry belong in separate environments.</p><a className="text-link" href="https://www.to-analytics.com/lab" target="_blank" rel="noreferrer">Visit Splunk Studio Lab <ArrowUpRight size={17}/></a></div>
        <div className="product-pair"><div className="product-mini-card"><span className="mini-icon lab-icon"><Terminal size={24}/></span><div><small>LEARN & PRACTICE</small><h3>Splunk Studio Lab</h3><p>Guided learning with practice datasets.</p></div><span className="mini-tag">Training</span></div><div className="pair-connector"><span /><Layers3 size={20}/><span /></div><div className="product-mini-card monitor-mini"><span className="mini-icon monitor-icon"><Activity size={24}/></span><div><small>MONITOR REAL SYSTEMS</small><h3>T.O. Monitoring</h3><p>Private project and team workspaces.</p></div><span className="mini-tag">Planned</span></div><div className="pair-footer"><LockKeyhole size={16}/> Customer logs stay outside the training environment</div></div>
      </div>
    </section>
  )
}

function Security() {
  return (
    <section className="section security-section" id="security">
      <div className="container security-layout">
        <div className="security-title"><span className="eyebrow">SECURITY BY DESIGN</span><h2>Trust is part of the architecture.</h2><p>Before teams connect real applications, these protections must be implemented and tested in the monitoring backend.</p><span className="security-caption">Planned requirements — not claims of current certification or deployment.</span></div>
        <div className="security-points"><div><span><Fingerprint size={23}/></span><div><h3>Workspace isolation</h3><p>Keep organization data separated and enforce access rules on the server.</p></div></div><div><span><ShieldCheck size={23}/></span><div><h3>Scoped credentials</h3><p>Control which projects can send data. Rotate and revoke access securely.</p></div></div><div><span><Database size={23}/></span><div><h3>Privacy & retention</h3><p>Protect sensitive log fields and establish clear data lifecycle policies.</p></div></div></div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="section final-section"><div className="container"><div className="final-panel"><div className="final-shape one"/><div className="final-shape two"/><div className="final-content"><span className="final-eyebrow"><Sparkles size={17}/> THE NEXT CHAPTER OF T.O. ANALYTICS</span><h2>Know your software.<br/>Build with confidence.</h2><p>We’re designing monitoring that feels approachable for individual developers and powerful enough for growing teams.</p><div className="final-buttons"><ButtonLink href="/signup" variant="light">Get started</ButtonLink><ButtonLink href="https://www.to-analytics.com/" variant="ghost" >T.O. Analytics website</ButtonLink></div></div><div className="final-mark"><img src={brandMark} alt=""/></div></div></div></section>
  )
}

function Footer() {
  return (
    <footer className="site-footer"><div className="container footer-main"><div className="footer-intro"><Brand compact/><p>Clarity for the software you build.<br/>A product in development by T.O. Analytics.</p></div><div className="footer-links"><div><b>Explore</b><a href="#platform">Platform</a><a href="#how-it-works">How it works</a><a href="#solutions">Solutions</a><a href="#security">Security approach</a></div><div><b>T.O. Analytics</b><a href="https://www.to-analytics.com/" target="_blank" rel="noreferrer">Official website <ArrowUpRight size={13}/></a><a href="https://www.to-analytics.com/lab" target="_blank" rel="noreferrer">Splunk Studio Lab <ArrowUpRight size={13}/></a></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} T.O. Analytics. All rights reserved.</span><span>Concept homepage · All monitoring data shown is fictional.</span></div></footer>
  )
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      <main id="main-content"><Hero /><Features /><HowItWorks /><Solutions /><Separation /><Security /><FinalCTA /></main>
      <Footer />
    </>
  )
}


// import { useMemo, useState } from 'react'
// import {
//   Activity,
//   ArrowRight,
//   ArrowUpRight,
//   BellRing,
//   Box,
//   Building2,
//   Check,
//   ChevronRight,
//   CircleCheck,
//   Code2,
//   Database,
//   FileText,
//   Fingerprint,
//   Gauge,
//   Layers3,
//   LockKeyhole,
//   Menu,
//   Search,
//   Server,
//   ShieldCheck,
//   Sparkles,
//   Terminal,
//   Users,
//   X,
// } from 'lucide-react'
// import {
//   Area,
//   AreaChart,
//   CartesianGrid,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
// } from 'recharts'

// const brandLogo = '/to-analytics-logo.png'
// const brandMark = '/to-mark.png'

// const NAV = [
//   { label: 'Platform', href: '#platform' },
//   { label: 'How it works', href: '#how-it-works' },
//   { label: 'Solutions', href: '#solutions' },
//   { label: 'Security', href: '#security' },
// ]

// const CHARTS = {
//   '1h': {
//     requests: '24,580', errors: '0.42%', latency: '146ms',
//     data: [36, 43, 39, 48, 55, 45, 51, 62, 58, 72, 61, 67, 83, 71, 79, 86, 73, 88, 81, 95].map((value, i) => ({ time: `${i * 3}m`, value })),
//   },
//   '24h': {
//     requests: '487,210', errors: '0.31%', latency: '132ms',
//     data: [44, 41, 36, 39, 48, 66, 77, 69, 85, 72, 64, 57, 73, 81, 76, 90, 88, 77, 72, 82].map((value, i) => ({ time: `${i + 1}h`, value })),
//   },
//   '7d': {
//     requests: '3.12M', errors: '0.28%', latency: '139ms',
//     data: [42, 54, 49, 57, 68, 66, 81, 75, 72, 83, 67, 61, 76, 86, 77, 79, 92, 84, 81, 96].map((value, i) => ({ time: `Point ${i + 1}`, value })),
//   },
// }

// const LOGS = [
//   { time: '14:32:08', method: 'POST', path: '/api/checkout', service: 'checkout-api', status: 500, message: 'Payment request failed' },
//   { time: '14:31:56', method: 'GET', path: '/api/products', service: 'storefront', status: 200, message: 'Request completed' },
//   { time: '14:31:41', method: 'POST', path: '/api/login', service: 'auth-service', status: 401, message: 'Invalid credentials' },
//   { time: '14:31:26', method: 'GET', path: '/api/orders', service: 'orders-api', status: 200, message: 'Request completed' },
// ]

// const FEATURES = [
//   { icon: Terminal, title: 'Understand every error', description: 'Go from a failed request to its context. Filter logs by service, endpoint, severity and time.', className: 'feature-lilac', tag: 'LOG EXPLORER' },
//   { icon: Gauge, title: 'See the bigger picture', description: 'Turn individual log events into clear visual trends that help your team spot what changed.', className: 'feature-blue', tag: 'DASHBOARDS' },
//   { icon: BellRing, title: 'Know what needs attention', description: 'Define meaningful alert rules and keep a traceable history of the events behind them.', className: 'feature-peach', tag: 'ALERTS' },
// ]

// const STEPS = [
//   { n: '01', icon: Users, title: 'Create a workspace', description: 'Start personally or create a workspace for your engineering team.' },
//   { n: '02', icon: Box, title: 'Add your project', description: 'Organize each application and upload JSON or CSV sample logs first.' },
//   { n: '03', icon: Search, title: 'Explore the signals', description: 'Investigate requests, errors and patterns in one focused interface.' },
//   { n: '04', icon: BellRing, title: 'Turn insight into action', description: 'Save important views and set alert rules as monitoring evolves.' },
// ]

// function Brand({ compact = false }) {
//   return (
//     <a className={`brand ${compact ? 'brand-compact' : ''}`} href="#top" aria-label="T.O. Monitoring home">
//       <img className="brand-original" src={brandLogo} alt="T.O. Analytics" />
//       <span className="brand-divider" aria-hidden="true" />
//       <span className="brand-product">Monitoring</span>
//     </a>
//   )
// }

// function ButtonLink({ href, children, variant = 'primary', icon = true, className = '' }) {
//   return (
//     <a className={`button button-${variant} ${className}`} href={href}>
//       {children}
//       {icon && <ArrowUpRight size={18} aria-hidden="true" />}
//     </a>
//   )
// }

// function Navbar() {
//   const [open, setOpen] = useState(false)
//   return (
//     <header className="site-header">
//       <div className="container navbar">
//         <Brand />
//         <nav className="nav-links" aria-label="Main navigation">
//           {NAV.map(item => <a href={item.href} key={item.href}>{item.label}</a>)}
//         </nav>
//         <div className="nav-actions">
//           <a className="nav-home" href="https://www.to-analytics.com/" target="_blank" rel="noreferrer">T.O. Analytics <ArrowUpRight size={14} /></a>
//           <ButtonLink href="#product" className="nav-cta">Explore preview</ButtonLink>
//         </div>
//         <button className="mobile-menu-toggle" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
//           {open ? <X size={23} /> : <Menu size={23} />}
//         </button>
//       </div>
//       {open && (
//         <nav className="mobile-menu" aria-label="Mobile navigation">
//           {NAV.map(item => <a href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}<ChevronRight size={18} /></a>)}
//           <a href="#product" onClick={() => setOpen(false)}>Explore the product <ArrowRight size={18}/></a>
//           <a href="https://www.to-analytics.com/" target="_blank" rel="noreferrer">Visit T.O. Analytics <ArrowUpRight size={18}/></a>
//         </nav>
//       )}
//     </header>
//   )
// }

// function SectionHeading({ eyebrow, title, description, align = 'left' }) {
//   return (
//     <div className={`section-heading ${align === 'center' ? 'center' : ''}`}>
//       <span className="eyebrow">{eyebrow}</span>
//       <h2>{title}</h2>
//       {description && <p>{description}</p>}
//     </div>
//   )
// }

// function MonitoringPreview() {
//   const [range, setRange] = useState('1h')
//   const [query, setQuery] = useState('')
//   const data = CHARTS[range]
//   const rows = useMemo(() => LOGS.filter(log => `${log.path} ${log.service} ${log.status} ${log.message}`.toLowerCase().includes(query.toLowerCase())), [query])

//   return (
//     <div className="monitoring-preview" id="product">
//       <div className="preview-topbar">
//         <div className="preview-top-title"><img src={brandMark} alt="" /><span>T.O. Monitoring</span><span className="preview-top-separator">/</span><span className="preview-muted">Overview</span></div>
//         <span className="demo-pill"><span /> DEMO DATA</span>
//       </div>
//       <div className="preview-content">
//         <div className="preview-heading-row">
//           <div><div className="preview-overline">PERSONAL WORKSPACE</div><h3>My Shopping API <ChevronRight size={19}/></h3></div>
//           <div className="preview-time-tabs" aria-label="Preview time range">
//             {Object.keys(CHARTS).map(key => <button key={key} onClick={() => setRange(key)} type="button" className={range === key ? 'selected' : ''} aria-pressed={range === key}>{key}</button>)}
//           </div>
//         </div>
//         <div className="preview-stats">
//           <div><span>Requests</span><strong>{data.requests}</strong><small><span className="stat-spark" /> Sample volume</small></div>
//           <div><span>Error rate</span><strong>{data.errors}</strong><small className="stat-alert">HTTP 4xx / 5xx</small></div>
//           <div><span>Avg. latency</span><strong>{data.latency}</strong><small>Illustrative metric</small></div>
//         </div>
//         <div className="chart-panel">
//           <div className="chart-header"><div><strong>Request activity</strong><span>Sample traffic over the selected period</span></div><div className="legend"><span /> Requests</div></div>
//           <div className="chart-container" aria-label={`Illustrative chart showing requests for ${range}`}>
//             <ResponsiveContainer width="100%" height="100%">
//               <AreaChart data={data.data} margin={{ left: -36, right: 0, top: 10, bottom: 0 }}>
//                 <defs><linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9d77ff" stopOpacity={0.3} /><stop offset="100%" stopColor="#9d77ff" stopOpacity={0.01} /></linearGradient></defs>
//                 <CartesianGrid stroke="#30354f" vertical={false} strokeDasharray="3 5" />
//                 <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#7984a3', fontSize: 10 }} tickFormatter={(v, i) => i % 5 === 0 ? v : ''} />
//                 <Tooltip contentStyle={{ background: '#1e223a', border: '1px solid #414563', borderRadius: 12, color: '#fff' }} cursor={{ stroke: '#9674ff', strokeDasharray: '4 4' }} />
//                 <Area type="monotone" dataKey="value" stroke="#a887ff" strokeWidth={2.8} fill="url(#trafficGradient)" dot={false} activeDot={{ r: 4, fill: '#a887ff' }} />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//         <div className="events-panel">
//           <div className="events-heading"><div><strong>Recent events</strong><span>Explore sample application logs</span></div><span className="events-count">{rows.length} events</span></div>
//           <label className="log-search"><Search size={15} /><input type="search" placeholder="Search events, services or status..." value={query} onChange={event => setQuery(event.target.value)} aria-label="Search sample logs" /></label>
//           <div className="log-table">
//             {rows.length ? rows.map((log, index) => (
//               <div className="log-row" key={`${log.time}-${index}`}>
//                 <span className="log-time">{log.time}</span>
//                 <span className={`http-pill ${log.status >= 500 ? 'http-error' : log.status >= 400 ? 'http-warn' : 'http-ok'}`}>{log.status}</span>
//                 <span className="log-path"><b>{log.method}</b> {log.path}</span>
//                 <span className="log-service">{log.service}</span>
//               </div>
//             )) : <div className="empty-logs">No sample events match your search.</div>}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// function Hero() {
//   return (
//     <section className="hero" id="top">
//       <div className="hero-grid-decoration" aria-hidden="true" />
//       <div className="container hero-inner">
//         <div className="hero-copy">
//           <div className="announcement"><span className="announcement-dot"/> INTRODUCING T.O. MONITORING <ArrowRight size={14} /></div>
//           <h1>Understand your apps.<br/><em>Before problems grow.</em></h1>
//           <p className="hero-subtitle">All your application signals, one clearer picture. Explore errors, understand performance and create monitoring workflows for your projects and teams.</p>
//           <div className="hero-buttons">
//             <ButtonLink href="#product">Explore the preview</ButtonLink>
//             <ButtonLink href="#how-it-works" variant="outline" icon={false}>See how it works <ArrowRight size={18}/></ButtonLink>
//           </div>
//           <div className="hero-highlights"><div><CircleCheck size={17} /> For individual developers</div><div><CircleCheck size={17} /> Built for growing teams</div></div>
//           <div className="hero-small-note">Product concept in development · Preview uses sample data</div>
//         </div>
//         <div className="hero-visual">
//           <div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/>
//           <MonitoringPreview />
//           <div className="floating-insight"><span className="floating-icon"><Activity size={19}/></span><div><b>Investigate with context</b><small>Events • Trends • Alerts</small></div><ArrowUpRight size={17}/></div>
//         </div>
//       </div>
//     </section>
//   )
// }

// function Features() {
//   return (
//     <section className="section features-section" id="platform">
//       <div className="container">
//         <div className="section-head-row"><SectionHeading eyebrow="THE PLATFORM" title={<>Less noise. <span className="text-gradient">More clarity.</span></>} description="A focused monitoring experience that helps you move from raw application events to practical engineering decisions."/><span className="section-aside">EXPLORE THE POSSIBILITIES <ArrowUpRight size={16}/></span></div>
//         <div className="features-grid">
//           {FEATURES.map(({ icon: Icon, title, description, className, tag }) => <article className={`feature-card ${className}`} key={title}><div className="feature-icon"><Icon size={24}/></div><div className="feature-copy"><span className="feature-tag">{tag}</span><h3>{title}</h3><p>{description}</p></div><div className="feature-art" aria-hidden="true">{tag === 'LOG EXPLORER' ? <div className="art-logs"><i/><i/><i/></div> : tag === 'DASHBOARDS' ? <div className="art-bars">{[34,60,44,74,56,93,70].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div> : <div className="art-alert"><BellRing size={29}/><span>Rule matched</span><Check size={17}/></div>}</div></article>)}
//         </div>
//       </div>
//     </section>
//   )
// }

// function HowItWorks() {
//   return (
//     <section className="section how-section" id="how-it-works">
//       <div className="container">
//         <SectionHeading eyebrow="HOW IT WORKS" title="From project to perspective." description="Start with a small project. Add the data you need. Grow into team-wide monitoring when your infrastructure is ready." align="center"/>
//         <div className="steps-grid">
//           {STEPS.map(({ n, icon: Icon, title, description }) => <article className="step" key={n}><div className="step-top"><span>{n}</span><div><Icon size={22}/></div></div><h3>{title}</h3><p>{description}</p></article>)}
//         </div>
//         <div className="roadmap-note"><Sparkles size={18}/><span>First milestone: safe JSON/CSV sample uploads. Live Node.js integration and additional sources are planned next.</span></div>
//       </div>
//     </section>
//   )
// }

// function Solutions() {
//   return (
//     <section className="section solutions-section" id="solutions">
//       <div className="container">
//         <SectionHeading eyebrow="WHO IT'S FOR" title="Start solo. Grow together." description="One monitoring product, designed for different ways of building software." align="center"/>
//         <div className="solutions-grid">
//           <article className="solution-card dev-solution">
//             <div className="solution-header"><span className="solution-icon"><Code2 size={23}/></span><span>FOR DEVELOPERS</span></div>
//             <h3>Understand what your code is telling you.</h3><p>Keep every personal project organized. See errors clearly, trace failed requests and build confidence as your applications evolve.</p>
//             <div className="solution-example"><div className="solution-example-top"><Server size={17}/><b>My Shopping API</b><span>Sample</span></div><div className="solution-example-row"><span><span className="dot dot-red"/> checkout-api</span><b>HTTP 500</b></div><div className="solution-example-row"><span><span className="dot dot-green"/> storefront</span><b>HTTP 200</b></div></div>
//             <a href="#product" className="text-link">Explore developer preview <ArrowRight size={17}/></a>
//           </article>
//           <article className="solution-card team-solution">
//             <div className="solution-header"><span className="solution-icon"><Building2 size={23}/></span><span>FOR COMPANIES</span></div>
//             <h3>One clear view for the whole team.</h3><p>Bring applications into private workspaces, invite collaborators and give engineers a common view of operational issues.</p>
//             <div className="solution-example"><div className="solution-example-top"><Building2 size={17}/><b>Northstar Digital</b><span>Sample</span></div><div className="solution-example-row"><span><span className="dot dot-green"/> Payments API</span><b>Connected*</b></div><div className="solution-example-row"><span><span className="dot dot-green"/> Authentication API</span><b>Connected*</b></div></div>
//             <a href="#security" className="text-link">Explore workspace design <ArrowRight size={17}/></a>
//           </article>
//         </div>
//         <p className="sample-disclaimer">*Illustrative interface only. Real application connections are part of the product roadmap.</p>
//       </div>
//     </section>
//   )
// }

// function Separation() {
//   return (
//     <section className="section separation-section">
//       <div className="container split-layout">
//         <div className="separation-copy"><span className="eyebrow">ONE T.O. PLATFORM · TWO PRODUCTS</span><h2>Learn in the lab.<br/><span className="text-gradient">Monitor in the real world.</span></h2><p>T.O. Analytics already provides a Splunk training experience. T.O. Monitoring extends that vision to the applications developers and companies build.</p><p>They share a brand and a learning mindset—not their event data. Training records and customer telemetry belong in separate environments.</p><a className="text-link" href="https://www.to-analytics.com/lab" target="_blank" rel="noreferrer">Visit Splunk Studio Lab <ArrowUpRight size={17}/></a></div>
//         <div className="product-pair"><div className="product-mini-card"><span className="mini-icon lab-icon"><Terminal size={24}/></span><div><small>LEARN & PRACTICE</small><h3>Splunk Studio Lab</h3><p>Guided learning with practice datasets.</p></div><span className="mini-tag">Training</span></div><div className="pair-connector"><span /><Layers3 size={20}/><span /></div><div className="product-mini-card monitor-mini"><span className="mini-icon monitor-icon"><Activity size={24}/></span><div><small>MONITOR REAL SYSTEMS</small><h3>T.O. Monitoring</h3><p>Private project and team workspaces.</p></div><span className="mini-tag">Planned</span></div><div className="pair-footer"><LockKeyhole size={16}/> Customer logs stay outside the training environment</div></div>
//       </div>
//     </section>
//   )
// }

// function Security() {
//   return (
//     <section className="section security-section" id="security">
//       <div className="container security-layout">
//         <div className="security-title"><span className="eyebrow">SECURITY BY DESIGN</span><h2>Trust is part of the architecture.</h2><p>Before teams connect real applications, these protections must be implemented and tested in the monitoring backend.</p><span className="security-caption">Planned requirements — not claims of current certification or deployment.</span></div>
//         <div className="security-points"><div><span><Fingerprint size={23}/></span><div><h3>Workspace isolation</h3><p>Keep organization data separated and enforce access rules on the server.</p></div></div><div><span><ShieldCheck size={23}/></span><div><h3>Scoped credentials</h3><p>Control which projects can send data. Rotate and revoke access securely.</p></div></div><div><span><Database size={23}/></span><div><h3>Privacy & retention</h3><p>Protect sensitive log fields and establish clear data lifecycle policies.</p></div></div></div>
//       </div>
//     </section>
//   )
// }

// function FinalCTA() {
//   return (
//     <section className="section final-section"><div className="container"><div className="final-panel"><div className="final-shape one"/><div className="final-shape two"/><div className="final-content"><span className="final-eyebrow"><Sparkles size={17}/> THE NEXT CHAPTER OF T.O. ANALYTICS</span><h2>Know your software.<br/>Build with confidence.</h2><p>We’re designing monitoring that feels approachable for individual developers and powerful enough for growing teams.</p><div className="final-buttons"><ButtonLink href="#product" variant="light">Explore the concept</ButtonLink><ButtonLink href="https://www.to-analytics.com/" variant="ghost" >T.O. Analytics website</ButtonLink></div></div><div className="final-mark"><img src={brandMark} alt=""/></div></div></div></section>
//   )
// }

// function Footer() {
//   return (
//     <footer className="site-footer"><div className="container footer-main"><div className="footer-intro"><Brand compact/><p>Clarity for the software you build.<br/>A product in development by T.O. Analytics.</p></div><div className="footer-links"><div><b>Explore</b><a href="#platform">Platform</a><a href="#how-it-works">How it works</a><a href="#solutions">Solutions</a><a href="#security">Security approach</a></div><div><b>T.O. Analytics</b><a href="https://www.to-analytics.com/" target="_blank" rel="noreferrer">Official website <ArrowUpRight size={13}/></a><a href="https://www.to-analytics.com/lab" target="_blank" rel="noreferrer">Splunk Studio Lab <ArrowUpRight size={13}/></a></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} T.O. Analytics. All rights reserved.</span><span>Concept homepage · All monitoring data shown is fictional.</span></div></footer>
//   )
// }

// export default function App() {
//   return (
//     <>
//       <a className="skip-link" href="#main-content">Skip to content</a>
//       <Navbar />
//       <main id="main-content"><Hero /><Features /><HowItWorks /><Solutions /><Separation /><Security /><FinalCTA /></main>
//       <Footer />
//     </>
//   )
// }
