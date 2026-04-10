import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Activity, Cpu } from 'lucide-react'

export default function Navbar() {
  const [ollamaStatus, setOllamaStatus] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:8000/api/ollama-status/')
      .then(r => setOllamaStatus(r.data))
      .catch(() => setOllamaStatus({ status: 'offline' }))
  }, [])

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)'
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Activity size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>PEIP</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>Predictive Engineering Intelligence</div>
        </div>
      </Link>

      {ollamaStatus && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={14} color={ollamaStatus.status === 'online' ? 'var(--success)' : 'var(--danger)'} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
            Ollama {ollamaStatus.status === 'online' ? `● ${ollamaStatus.current}` : '○ offline'}
          </span>
        </div>
      )}
    </nav>
  )
}