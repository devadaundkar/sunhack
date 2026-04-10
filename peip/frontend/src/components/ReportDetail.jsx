import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import HealthScoreCard from './HealthScoreCard'
import RiskHeatmap from './RiskHeatmap'
import CEOReport from './CEOReport'
import FileAnalysis from './FileAnalysis'
import { ArrowLeft, GitBranch, Users, Code2, AlertTriangle } from 'lucide-react'

export default function ReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`http://localhost:8000/api/reports/${id}/`)
      .then(r => { setReport(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
      Loading report...
    </div>
  )
  if (!report) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>
      Report not found.
    </div>
  )

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', fontSize: '0.8rem' }}>
        <p style={{ color: 'var(--text2)', marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontFamily: 'var(--mono)' }}>{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem', animation: 'fade-in-up 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link to="/" style={{ color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <GitBranch size={20} color="var(--accent)" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>{report.repo_name}</h1>
        </div>
        <span className={`tag tag-${report.risk_level}`}>{report.risk_level?.toUpperCase()}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text2)' }}>
          Analyzed: {new Date(report.created_at).toLocaleString()}
        </span>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={<Code2 size={16} />} label="Total Files" value={report.total_files} />
        <StatCard icon={<GitBranch size={16} />} label="Commits (6mo)" value={report.total_commits} />
        <StatCard icon={<AlertTriangle size={16} />} label="Bug Fix Ratio" value={`${(report.bug_fix_ratio * 100).toFixed(1)}%`} color="var(--warning)" />
        <StatCard icon={<Code2 size={16} />} label="Avg Complexity" value={report.avg_complexity?.toFixed(2)} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
        <HealthScoreCard
          score={report.overall_health_score}
          riskLevel={report.risk_level}
          failureProbability={report.predicted_failure_probability}
          cost={report.estimated_cost_of_inaction}
        />

        {/* Commit trend chart */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>📈 Commit & Bug Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={report.commit_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <Tooltip content={customTooltip} />
              <Line type="monotone" dataKey="commits" stroke="var(--accent)" strokeWidth={2} dot={false} name="Total Commits" />
              <Line type="monotone" dataKey="bugs" stroke="var(--danger)" strokeWidth={2} dot={false} name="Bug Fixes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap + CEO Report */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {report.top_risky_files?.length > 0 && (
          <RiskHeatmap files={report.top_risky_files} />
        )}
        <CEOReport report={report.ceo_report} repoName={report.repo_name} />
      </div>

      {/* File analysis */}
      {report.file_analysis?.length > 0 && (
        <FileAnalysis files={report.file_analysis} />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text2)', fontSize: '0.78rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--mono)', color: color || 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}