import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

// Render real components with synthetic identities. No server is listened on,
// no environment file is loaded, and no external application is contacted.
const server = await createServer({ configFile: false, envDir: false, cacheDir: 'node_modules/.vite-phase6-checks', plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' })

try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.js')
  const { default: Navbar } = await server.ssrLoadModule('/src/components/Navbar.jsx')
  const { RequireSession } = await server.ssrLoadModule('/src/components/RouteAccess.jsx')
  const { default: Workspace } = await server.ssrLoadModule('../admin/adminFront/src/AdminWorkspace.jsx')
  function render(component, auth, path = '/tests') {
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(AuthContext.Provider, { value: auth }, component)))
  }
  const nav = render(React.createElement(Navbar), { user: null, loading: false })
  assert.equal((nav.match(/>PYQ</g) ?? []).length, 0)
  assert.ok(nav.includes('aria-label="Main navigation"'))
  assert.ok(nav.includes('aria-controls="mobile-navigation"'))
  assert.match(nav.match(/<a[^>]*href="\/tests"[^>]*>Tests<\/a>/)?.[0] ?? '', /aria-current="page"/)
  const pending = render(React.createElement(RequireSession, null, React.createElement('p', null, 'Protected fixture')), { user: null, loading: true })
  assert.ok(pending.includes('Checking your sign-in'))
  assert.ok(!pending.includes('Protected fixture'))
  const signedIn = render(React.createElement(RequireSession, null, React.createElement('p', null, 'Protected fixture')), { user: { id: 'synthetic-user' }, loading: false })
  assert.ok(signedIn.includes('Protected fixture'))
  for (const [role, hasRoles, hasPapers] of [['editor', false, false], ['test_manager', false, true], ['administrator', false, true], ['super_administrator', true, true]]) {
    const html = renderToStaticMarkup(React.createElement(Workspace, { roles: [role], overview: React.createElement('p', null, 'Overview fixture') }))
    assert.ok(html.includes('role="tablist"'))
    assert.ok(html.includes('aria-selected="true"'))
    assert.equal(html.includes('>Users &amp; roles</button>'), hasRoles)
    assert.equal(html.includes('>PYQ verification</button>'), hasPapers)
    assert.equal(html.includes('>Review queue</button>'), ['administrator','super_administrator'].includes(role))
    assert.equal(html.includes('>Attempts &amp; results</button>'), ['administrator','super_administrator'].includes(role))
    assert.equal(html.includes('>Activity</button>'), role === 'super_administrator')
  }
  for(const [file,title] of [['TestWorkspace','Tests and versions'],['OperationsPanel','Attempts and results'],['UserManagement','Users and application access'],['MediaLibrary','Media library']]){
    const {default:Panel}=await server.ssrLoadModule(`../admin/adminFront/src/${file}.jsx`)
    const html=render(React.createElement(Panel,{roles:['super_administrator']}),{user:{id:'synthetic-user'},loading:false})
    assert.ok(html.includes(title))
  }
  const {VersionPreview}=await server.ssrLoadModule('../admin/adminFront/src/VersionReview.jsx')
  const preview=renderToStaticMarkup(React.createElement(VersionPreview,{detail:{title:'Synthetic fixture',version_number:1,status:'draft',workflow_state:'submitted',duration_seconds:600,attempt_limit:1,review_policy:{results:'after_submit',answers:'with_results'},preview:[{code:'M',title:'Math',questions:[{id:'q',question_snapshot:'Fixture question',options_snapshot:['First','Second','Third','Fourth'],correct_option_snapshot:1,explanation_snapshot:'Fixture explanation'}]}]}}))
  assert.ok(preview.includes('Fixture question')&&preview.includes('Second')&&preview.includes('— correct')&&preview.includes('Fixture explanation'))
  console.log('Component integration checks passed: navigation, protected loading/content, and role-specific accessible admin tabs.')
} finally {
  await server.close()
}
