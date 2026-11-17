// Public route and navigation verification with no credentials or live data.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import { legalLinks, legalDetails, clearPrerenderedLegalMetadata } from '../src/lib/legal.js'

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://legal.test/privacy-policy' })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
window.scrollTo = () => {}
globalThis.MutationObserver = dom.window.MutationObserver
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const errors = []
const originalError = console.error
console.error = (...args) => { errors.push(args.map(String).join(' ')); originalError(...args) }
const server = await createServer({ configFile: false, envDir: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [react()], resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
let root
try {
  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  for (const page of legalLinks) {
    const rule = vercel.rewrites.find(rule => rule.source === page.to || rule.source === '/(.*)')
    assert.equal(rule?.destination, `${page.to}.html`, 'Static legal rewrites must precede the SPA fallback')
  }
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  for (const page of legalLinks) {
    const html = await readFile(new URL(`../dist${page.to}.html`, import.meta.url), 'utf8')
    const staticDocument = new JSDOM(html).window.document
    document.head.innerHTML = staticDocument.head.innerHTML
    document.getElementById('root').innerHTML = staticDocument.getElementById('root').innerHTML
    clearPrerenderedLegalMetadata(document)
    window.history.replaceState(null, '', page.to)
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(App)))
    for (let i = 0; i < 50 && !document.querySelector('.legal-copy'); i++) {
      await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
    }
    assert.equal(window.location.pathname, page.to, 'Public route must not redirect to sign-in')
    assert.equal(document.querySelectorAll('h1').length, 1)
    assert.equal(document.querySelector('h1').textContent, page.label)
    assert.equal(document.querySelectorAll('footer').length, 1)
    assert.equal(document.title, `${page.label} — NIMCET.XYZ`)
    assert.equal(document.querySelector('meta[name="description"]').content, page.description)
    assert.equal(document.querySelector('link[rel="canonical"]').href, `${legalDetails.origin}${page.to}`)
    assert.ok(document.querySelector(`a[href="mailto:${legalDetails.email}"]`))
    for (const link of document.querySelectorAll('nav[aria-label="On this page"] a')) {
      assert.ok(document.getElementById(link.hash.slice(1)), `Missing section ${link.hash}`)
    }
    for (const link of legalLinks) assert.ok(document.querySelector(`footer a[href="${link.to}"]`))
    assert.ok(document.querySelector('time[datetime="2026-11-18"]'))
    assert.equal(document.querySelectorAll('.legal-copy form').length, 0)
    const target = legalLinks.find(link => link.to !== page.to)
    await act(async () => document.querySelector(`nav[aria-label="Legal and support"] a[href="${target.to}"]`)
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
    for (let i = 0; i < 50 && document.querySelector('h1')?.textContent !== target.label; i++) {
      await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
    }
    assert.equal(document.querySelector('h1').textContent, target.label)
    assert.equal(document.title, `${target.label} — NIMCET.XYZ`)
    assert.equal(document.querySelectorAll('title').length, 1)
    assert.equal(document.querySelectorAll('meta[name="description"]').length, 1)
    assert.equal(document.querySelector('link[rel="canonical"]').href, `${legalDetails.origin}${target.to}`)
    await act(async () => root.unmount())
    root = null

    assert.equal(staticDocument.querySelector('h1').textContent, page.label)
    assert.equal(staticDocument.querySelector('title').textContent, `${page.label} — NIMCET.XYZ`)
    assert.equal(staticDocument.querySelectorAll('title').length, 1)
    assert.equal(staticDocument.querySelector('meta[name="description"]').content, page.description)
    assert.ok(staticDocument.querySelector('script[type="module"][src^="/assets/"]'))
    for (const asset of staticDocument.querySelectorAll('script[src^="/"],link[rel="stylesheet"][href^="/"]')) {
      await readFile(new URL(`../dist${asset.getAttribute('src') || asset.getAttribute('href')}`, import.meta.url))
    }
    console.log(`PASS ${page.to}: anonymous route, headings, links, metadata, SPA navigation and static HTML`)
  }
  assert.deepEqual(errors, [], 'No React console errors expected')
} finally {
  if (root) await act(async () => root.unmount())
  await server.close()
  console.error = originalError
  dom.window.close()
}
