// Public HTML uses the same React pages as client-side navigation.
// No environment files, credentials, auth session or live services are loaded.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { aboutPage } from '../src/lib/about.js'
import { legalLinks } from '../src/lib/legal.js'
import { pageDocumentTitle } from '../src/lib/navigation.js'
import { searchPages } from '../src/lib/searchPages.js'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const template = await readFile(path.join(projectRoot, 'dist/index.html'), 'utf8')
const server = await createServer({ root: projectRoot, configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-public-prerender',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [react()], resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })

try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.js')
  const { default: SearchMetadata } = await server.ssrLoadModule('/src/components/SearchMetadata.jsx')
  const pages = ['PrivacyPolicy', 'Terms', 'Contact'].map((moduleName, index) => [moduleName, legalLinks[index].to])
  pages.push(['About', aboutPage.to])
  for (const [route, page] of Object.entries(searchPages)) pages.push([page.module, route])

  // Dynamic routes load the original SPA shell without the homepage canonical or content.
  await writeFile(path.join(projectRoot, 'dist', 'app-shell.html'), template)
  for (const [moduleName, route] of pages) {
    const { default: Page } = await server.ssrLoadModule(`/src/pages/${moduleName}.jsx`)
    let markup = renderToString(React.createElement(MemoryRouter, { initialEntries: [route] },
      React.createElement(AuthContext.Provider, { value: { user: null, theme: 'light', loading: false } },
        React.createElement(React.Fragment, null,
          React.createElement(SearchMetadata, { pathname: route }),
          React.createElement('a', { className: 'skip-link', href: '#main-content' }, 'Skip to main content'),
          React.createElement(Page)))))
    markup = markup.replace(/<main(?![^>]*\bid=)(?=[\s>])/, '<main id="main-content" tabindex="-1"')
    // RouteAccessibility owns browser titles; emit the same title for no-JS requests.
    const metadata = [renderToString(React.createElement('title', { 'data-legal-prerender': '' },
      pageDocumentTitle(route)))]
    markup = markup.replace(/<title>[\s\S]*?<\/title>|<meta\s[^>]*\/>|<link\s[^>]*\/>/g, tag => {
      metadata.push(tag.replace(/^<(\w+)/, '<$1 data-legal-prerender=""'))
      return ''
    })
    if (!/<main\b[^>]*\bid="main-content"/.test(markup) || !/<h1[\s>]/.test(markup)) {
      throw new Error(`Incomplete prerender for ${route}`)
    }
    const html = template.replace(/<title>[\s\S]*?<\/title>/, '')
      .replace('</head>', `${metadata.join('\n')}\n</head>`)
      .replace(/(<div id="root"[^>]*>)(<\/div>)/, (_, start, end) => start + markup + end)
    const output = path.join(projectRoot, 'dist', `${route.slice(1) || 'index'}.html`)
    await writeFile(output, html)
    console.log(`Prerendered ${route}`)
  }
} finally {
  await server.close()
}
