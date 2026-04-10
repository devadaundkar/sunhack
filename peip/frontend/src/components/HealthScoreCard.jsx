export default function HealthScoreCard({ score, riskLevel, failureProbability, cost }) {
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <h3 style={{ color: 'var(--text2)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Codebase Health
      </h3>

      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={54} fill="none" stroke="var(--surface2)" strokeWidth={10} />
        <circle
          cx={65} cy={65} r={54} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={65} y={60} textAnchor="middle" fill={color} fontSize={28} fontWeight={700} fontFamily="var(--font)">
          {Math.round(score)}
        </text>
        <text x={65} y={78} textAnchor="middle" fill="var(--text2)" fontSize={11} fontFamily="var(--font)">
          / 100
        </text>
      </svg>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Metric label="Risk Level" value={riskLevel?.toUpperCase()} color={
          riskLevel === 'low' ? 'var(--success)' : riskLevel === 'medium' ? 'var(--warning)' : 'var(--danger)'
        } />
        <Metric label="Failure Probability (90d)" value={`${(failureProbability * 100).toFixed(0)}%`} color="var(--text)" />
        <Metric label="Monthly Cost of Inaction" value={`$${cost?.toLocaleString()}`} color="var(--danger)" />
      </div>
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color, fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  )
}