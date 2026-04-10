import { useState } from 'react'
import axios from 'axios'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'

export default function FileAnalysis({ files }) {
  const [expanded, setExpanded] = useState(null)
  const [insights, setInsights] = useState({})
  const [loadingInsight, setLoadingInsight] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  const sorted = [...files].sort((a, b) => b.risk_score - a.risk_score)
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const getInsight = async (file, idx) => {
    if (insights[idx]) return
    setLoadingInsight(idx)
    try {
      const res = await axios.post('http://localhost:8000/api/file-insight/', { file_data: file })
      setInsights(prev => ({ ...prev, [idx]: res.data.insight }))
    } catch {
      setInsights(prev => ({ ...prev, [idx]: 'Could not generate insight.' }))
    }
    setLoadingInsight(null)
  }

  const getRankColor = (rank) => {
    const colors = { A: 'var(--success)', B: '#84cc16', C: 'var(--warning)', D: '#f97316', E: 'var(--danger)', F: '#dc2626' }
    return colors[rank] || 'var(--text2)'
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>📁 File-Level Analysis</h3>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text2)', fontFamily: 'var(--mono)', padding: '0.5rem 0.75rem', background: 'var(--surface2)', borderRadius: 6 }}>
        <span style={{ flex: 3 }}>FILE PATH</span>
        <span style={{ width: 60, textAlign: 'center' }}>CHANGES</span>
        <span style={{ width: 60, textAlign: 'center' }}>BUG%</span>
        <span style={{ width: 60, textAlign: 'center' }}>COMPLEX</span>
        <span style={{ width: 60, textAlign: 'center' }}>RISK</span>
      </div>

      {paginated.map((file, i) => {
        const globalIdx = page * PAGE_SIZE + i
        const isOpen = expanded === globalIdx

        return (
          <div key={globalIdx} style={{ marginBottom: 4 }}>
            <div
              onClick={() => {
                setExpanded(isOpen ? null : globalIdx)
                if (!isOpen) getInsight(file, globalIdx)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', borderRadius: 6, cursor: 'pointer',
                background: isOpen ? 'var(--surface2)' : 'transparent',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => !isOpen && (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: 'var(--text2)', width: 14 }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span style={{ flex: 3, fontFamily: 'var(--mono)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                {file.path}
              </span>
              <span style={{ width: 60, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text2)' }}>{file.change_count}</span>
              <span style={{ width: 60, textAlign: 'center', fontSize: '0.8rem', color: file.bug_ratio > 0.3 ? 'var(--danger)' : 'var(--text2)' }}>
                {(file.bug_ratio * 100).toFixed(0)}%
              </span>
              <span style={{ width: 60, textAlign: 'center', fontSize: '0.8rem', color: getRankColor(file.complexity_rank), fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {file.complexity_rank || '—'}
              </span>
              <span style={{ width: 60, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: file.risk_score > 30 ? 'var(--danger)' : file.risk_score > 15 ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--mono)' }}>
                {file.risk_score.toFixed(1)}
              </span>
            </div>

            {isOpen && (
              <div style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'var(--surface2)', borderRadius: '0 0 6px 6px', marginTop: -4 }}>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <Stat label="LOC" value={file.loc || '—'} />
                  <Stat label="Authors" value={file.authors?.length || 1} />
                  <Stat label="Last Modified" value={file.last_modified || 'N/A'} />
                  <Stat label="Churn" value={file.churn || 0} />
                  <Stat label="MI Index" value={file.maintainability_index ? `${file.maintainability_index}%` : 'N/A'} />
                </div>

                {file.functions?.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginBottom: '0.3rem' }}>Top Complex Functions:</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {file.functions.map((fn, fi) => (
                        <span key={fi} style={{
                          padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.72rem',
                          fontFamily: 'var(--mono)', background: 'var(--bg)',
                          color: getRankColor(fn.rank), border: `1px solid ${getRankColor(fn.rank)}40`
                        }}>
                          {fn.name} ({fn.complexity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  background: 'var(--bg)', borderRadius: 6, padding: '0.75rem',
                  borderLeft: '3px solid var(--accent)', fontSize: '0.82rem',
                  color: 'var(--text)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
                }}>
                  <Zap size={14} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>
                    {loadingInsight === globalIdx
                      ? 'Generating AI insight...'
                      : insights[globalIdx] || 'Loading insight...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Pagination */}
      {sorted.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.4rem 0.75rem', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem' }}>
            ← Prev
          </button>
          <span style={{ padding: '0.4rem 0.75rem', color: 'var(--text2)', fontSize: '0.8rem' }}>
            {page + 1} / {Math.ceil(sorted.length / PAGE_SIZE)}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= sorted.length}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.4rem 0.75rem', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}