import { lazy, Suspense, useState } from 'react'

const Questions = lazy(() => import('./QuestionWorkspace'))
const Papers = lazy(() => import('./PYQApproval'))
const Media = lazy(() => import('./MediaLibrary'))
const Users = lazy(() => import('./UserManagement'))
const Monitoring = lazy(() => import('./OperationsPanel'))
const Overview = lazy(() => import('./OperationsPanel').then(module => ({ default: module.AdminOverview })))
const Activity = lazy(() => import('./OperationsPanel').then(module => ({ default: module.ActivityPanel })))
const Reviews = lazy(() => import('./VersionReview').then(module => ({ default: module.ReviewQueue })))
const Tests = lazy(() => import('./TestWorkspace'))

export default function AdminWorkspace({ roles, overview }) {
  const [active, setActive] = useState('overview')
  const [visited, setVisited] = useState(['overview'])
  const tabs = [{ id: 'overview', label: 'Overview', content: <Overview roles={roles}>{overview}</Overview> }, { id: 'questions', label: 'Questions & catalog', content: <Questions roles={roles} /> }, { id: 'media', label: 'Media', content: <Media /> }]
  if (roles.some(role => ['test_manager', 'administrator', 'super_administrator'].includes(role))) tabs.push({ id: 'tests', label: 'Test authoring', content: <Tests roles={roles} /> }, { id: 'papers', label: 'PYQ verification', content: <Papers roles={roles} /> })
  if (roles.some(role => ['administrator','super_administrator'].includes(role))) tabs.push({ id: 'reviews', label: 'Review queue', content: <Reviews roles={roles} /> }, { id: 'users', label: roles.includes('super_administrator') ? 'Users & roles' : 'Users', content: <Users roles={roles} /> }, { id: 'attempts', label: 'Attempts & results', content: <Monitoring /> })
  if (roles.includes('super_administrator')) tabs.push({ id: 'audit', label: 'Activity', content: <Activity /> })
  const selected = tabs.some(tab => tab.id === active) ? active : 'overview'
  function activate(id) {
    setActive(id)
    setVisited(current => current.includes(id) ? current : [...current, id])
  }
  return <>
    <div className="admin-tabs" role="tablist" aria-label="Administration tools" onKeyDown={event => {
      const index = tabs.findIndex(tab => tab.id === selected)
      let next
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = tabs.length - 1
      if (next === undefined) return
      event.preventDefault(); activate(tabs[next].id)
      event.currentTarget.querySelectorAll('[role="tab"]')[next].focus()
    }}>
      {tabs.map(tab => <button key={tab.id} id={`admin-tab-${tab.id}`} role="tab" type="button" aria-selected={selected === tab.id} aria-controls={`admin-panel-${tab.id}`} tabIndex={selected === tab.id ? 0 : -1} onClick={() => activate(tab.id)}>{tab.label}</button>)}
    </div>
    {tabs.map(tab => <section key={tab.id} id={`admin-panel-${tab.id}`} role="tabpanel" aria-labelledby={`admin-tab-${tab.id}`} hidden={selected !== tab.id} tabIndex={0}>
      {visited.includes(tab.id) && <Suspense fallback={<p role="status">Loading tools…</p>}>{tab.content}</Suspense>}
    </section>)}
  </>
}
