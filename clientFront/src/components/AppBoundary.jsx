import { Component } from 'react'

export default class AppBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-recovery" id="main-content" tabIndex={-1}>
      <h1>This page could not be displayed</h1>
      <p>Reload to try again. Saved test answers remain on the server.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload page</button>
    </main>
  }
}
