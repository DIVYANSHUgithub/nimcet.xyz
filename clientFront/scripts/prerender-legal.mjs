// Static public documents use the same React pages as client-side navigation.
// No environment files, credentials, auth session or live services are loaded.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { legalLinks } from '../src/lib/legal.js'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const template = await readFile(path.join(projectRoot, 'dist/index.html'), 'utf8')
const server = await createServer({ root: projectRoot, configFile: false, envDir: false,
  cacheDir: 'node_modules/.vite-legal-prerender',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [react()], resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })

try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.js')
  for (const [index, moduleName] of ['PrivacyPolicy', 'Terms', 'Contact'].entries()) {
    const { default: Page } = await server.ssrLoadModule(`/src/pages/${moduleName}.jsx`)
    const route = legalLinks[index].to
    let markup = renderToString(React.createElement(MemoryRouter, { initialEntries: [route] },
      React.createElement(AuthContext.Provider, { value: { user: null, loading: false } },
        React.createElement(React.Fragment, null,
          React.createElement('a', { className: 'skip-link', href: '#main-content' }, 'Skip to main content'),
          React.createElement(Page)))))
    // RouteAccessibility owns browser titles; emit the same title for no-JS requests.
    const metadata = [renderToString(React.createElement('title', { 'data-legal-prerender': '' },
      `${legalLinks[index].label} — NIMCET.XYZ`))]
    markup = markup.replace(/<title>[\s\S]*?<\/title>|<meta\s[^>]*\/>|<link\s[^>]*\/>/g, tag => {
      metadata.push(tag.replace(/^<(\w+)/, '<$1 data-legal-prerender=""'))
      return ''
    })
    if (!metadata.some(tag => tag.startsWith('<title ')) || !markup.includes('main-content')) {
      throw new Error(`Incomplete legal prerender for ${route}`)
    }
    const html = template.replace(/<title>[\s\S]*?<\/title>/, '')
      .replace('</head>', `${metadata.join('\n')}\n</head>`)
      .replace(/(<div id="root"[^>]*>)(<\/div>)/, `$1${markup}$2`)
    const output = path.join(projectRoot, 'dist', `${route.slice(1)}.html`)
    await writeFile(output, html)
    console.log(`Prerendered ${route}`)
  }
} finally {
  await server.close()
}
