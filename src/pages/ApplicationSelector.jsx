import { CheckCircle2 } from 'lucide-react'

// Same account-owned application list in Applications and Trace Explorer.
export default function ApplicationSelector({ projects, selectedId, onSelect, compact = false, disabled = false }) {
  if (compact) return <label className="te-field">Application<select aria-label="Application" value={selectedId || ''} disabled={disabled || !projects.length} onChange={event => onSelect(event.target.value)}>{!projects.length && <option value="">No applications</option>}{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.environment}</option>)}</select></label>
  return <div className="to-app-existing"><strong>Your applications</strong>{projects.map(app => <button key={app.id} type="button" onClick={() => onSelect(app.id)} aria-pressed={selectedId === app.id} className={selectedId === app.id ? 'to-app-selected' : ''}><span>{app.name}<small>{app.environment}</small></span>{selectedId === app.id && <CheckCircle2 size={17}/>}</button>)}</div>
}
