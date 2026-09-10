import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Still log to console so it shows up in devtools / Vercel logs
    console.error('Render error capturado por ErrorBoundary:', error, info)
    this.setState({ info })
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#1a0505',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 640, width: '100%' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
              ⚠ Ocurrió un error al cargar el dashboard
            </h1>
            <p style={{ opacity: 0.7, marginBottom: 16, fontSize: 14 }}>
              Esto es lo que se detectó (revisa también la consola del navegador con F12):
            </p>
            <pre
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: 16,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '50vh',
                overflow: 'auto',
              }}
            >
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                padding: '10px 20px',
                background: '#fff',
                color: '#1a0505',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
