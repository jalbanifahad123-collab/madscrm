import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('App error:', err); }
  reset = () => {
    try {
      ['bizcrm-clients', 'bizcrm-invoices', 'bizcrm-payments', 'bizcrm-projects', 'bizcrm-settings'].forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    window.location.reload();
  };
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, sans-serif', background: '#f3f3f5' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 12px 40px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>⚠️</div>
          <h1 style={{ fontSize: 19, margin: '10px 0 6px', color: '#17171a' }}>Something went wrong</h1>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#777' }}>
            The data saved in your browser doesn't match this version of the app.
            Try <b>Reload</b> first — if that doesn't work, <b>Reset data</b> restarts
            the app from a clean slate (with sample data).
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
            <button onClick={() => window.location.reload()} style={{ border: 0, cursor: 'pointer', borderRadius: 999, padding: '11px 20px', fontSize: 13, fontWeight: 700, background: '#2248f5', color: '#fff' }}>Reload</button>
            <button onClick={this.reset} style={{ border: 0, cursor: 'pointer', borderRadius: 999, padding: '11px 20px', fontSize: 13, fontWeight: 700, background: '#fdeceb', color: '#e5484d' }}>Reset data</button>
          </div>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
