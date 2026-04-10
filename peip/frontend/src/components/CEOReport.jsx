import { useState } from 'react'
import { FileText, Copy, Check } from 'lucide-react'

export default function CEOReport({ report, repoName }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple markdown-to-jsx renderer
  const renderReport = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} style={{ color: 'var(--accent)', marginTop: '1rem', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
          {line.replace(/\*\*/g, '')}
        </h4>
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.25rem', color: 'var(--text)', lineHeight: 1.6 }}>
          {line.slice(2)}
        </li>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} style={{ marginBottom: '0.5rem', lineHeight: 1.7, color: 'var(--text)' }}>{line}</p>
    })
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>CEO Executive Report</h3>
        </div>
        <button onClick={copy} style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '0.4rem 0.75rem', color: 'var(--text2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem'
        }}>
          {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{
        background: 'var(--surface2)', borderRadius: 8, padding: '1.25rem',
        border: '1px solid var(--border)', fontSize: '0.9rem',
        lineHeight: 1.7
      }}>
        {report ? renderReport(report) : (
          <p style={{ color: 'var(--text2)' }}>No report generated yet.</p>
        )}
      </div>
    </div>
  )
}