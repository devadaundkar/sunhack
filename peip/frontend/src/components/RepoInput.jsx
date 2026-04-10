import { useState } from 'react'
import {  Globe, Search, Loader } from 'lucide-react'

const SAMPLE_REPOS = [
  'https://github.com/django/django',
  'https://github.com/pallets/flask',
  'https://github.com/psf/requests',
]

export default function RepoInput({ onAnalyze, loading, job }) {
  const [url, setUrl] = useState('')

  const handleSubmit = () => {
    if (!url.trim()) return
    onAnalyze(url.trim())
  }

  return (
    <div className="card glow-accent" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Globe size={18} color="var(--accent)" />
        <span style={{ fontWeight: 600 }}>Enter GitHub / GitLab Repository URL</span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="https://github.com/owner/repository"
          disabled={loading}
          style={{
            flex: 1,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            color: 'var(--text)',
            fontFamily: 'var(--mono)',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button className="btn-primary" onClick={handleSubmit} disabled={loading || !url.trim()}>
          {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
          {loading ? ' Analyzing...' : ' Analyze'}
        </button>
      </div>

      {/* Sample repos */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Try:</span>
        {SAMPLE_REPOS.map(r => (
          <button key={r} onClick={() => setUrl(r)} disabled={loading}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '0.2rem 0.5rem', color: 'var(--text2)',
              fontFamily: 'var(--mono)', fontSize: '0.7rem', cursor: 'pointer'
            }}>
            {r.split('/').slice(-2).join('/')}
          </button>
        ))}
      </div>

      {/* Progress */}
      {job && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{job.message}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{job.progress}%</span>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
              width: `${job.progress}%`,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}