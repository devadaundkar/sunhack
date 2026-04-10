import { useMemo } from 'react'

export default function RiskHeatmap({ files }) {
  const topFiles = useMemo(() => {
    return [...files]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 20)
  }, [files])

  const maxRisk = Math.max(...topFiles.map(f => f.risk_score), 1)

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>🔥 Risk Heatmap — Top 20 Files</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {topFiles.map((file, i) => {
          const pct = (file.risk_score / maxRisk) * 100
          const color = pct > 70 ? 'var(--danger)' : pct > 40 ? 'var(--warning)' : 'var(--success)'
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 20, fontSize: '0.7rem', color: 'var(--text2)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'var(--mono)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginBottom: 3
                }}>
                  {file.path}
                </div>
                <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, borderRadius: 4,
                    background: color, transition: 'width 0.8s ease',
                    opacity: 0.85
                  }} />
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color, fontFamily: 'var(--mono)', width: 40, textAlign: 'right' }}>
                {file.risk_score.toFixed(1)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}