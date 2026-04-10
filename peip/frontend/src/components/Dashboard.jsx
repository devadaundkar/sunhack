import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import RepoInput from './RepoInput'
import HealthScoreCard from './HealthScoreCard'
import { GitBranch, Clock, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [job, setJob] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = () => {
    axios.get('http://localhost:8000/api/reports/')
      .then(r => setReports(r.data))
      .catch(() => {})
  }

  const handleAnalyze = async (repoUrl) => {
    setLoading(true)
    setJob({ status: 'running', progress: 0, message: 'Starting analysis...' })

    try {
      const res = await axios.post('http://localhost:8000/api/analyze/', { repo_url: repoUrl })
      const jobId = res.data.job_id
      pollJob(jobId)
    } catch (err) {
      toast.error('Failed to start analysis')
      setLoading(false)
      setJob(null)
    }
  }

  const pollJob = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/job/${jobId}/`)
        const j = res.data
        setJob(j)

        if (j.status === 'complete') {
          clearInterval(interval)
          setLoading(false)
          toast.success('Analysis complete!')
          fetchReports()
          navigate(`/report/${j.report_id}`)
        } else if (j.status === 'error') {
          clearInterval(interval)
          setLoading(false)
          toast.error(`Error: ${j.message}`)
          setJob(null)
        }
      } catch (e) {
        clearInterval(interval)
        setLoading(false)
      }
    }, 2000)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.75rem',
          lineHeight: 1.2
        }}>
          Predictive Engineering Intelligence
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '1.05rem', maxWidth: 580, margin: '0 auto' }}>
          Analyze any GitHub repo — get health scores, failure predictions,
          and a CEO-ready business impact report in minutes.
        </p>
      </div>

      <RepoInput onAnalyze={handleAnalyze} loading={loading} job={job} />

      {reports.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={16} color="var(--text2)" />
            <h2 style={{ fontSize: '1rem', color: 'var(--text2)', fontWeight: 600 }}>Recent Analyses</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {reports.map(r => (
              <div
                key={r.id}
                className="card"
                onClick={() => navigate(`/report/${r.id}`)}
                style={{ cursor: 'pointer', transition: 'border-color 0.2s', ':hover': { borderColor: 'var(--accent)' } }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GitBranch size={16} color="var(--accent)" />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--accent)' }}>
                      {r.repo_name}
                    </span>
                  </div>
                  <span className={`tag tag-${r.risk_level}`}>{r.risk_level}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: getScoreColor(r.overall_health_score) }}>
                      {Math.round(r.overall_health_score)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>Health Score</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)' }}>
                      {r.total_commits}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>Commits (6mo)</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--warning)' }}>
                      {(r.bug_fix_ratio * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>Bug Ratio</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text2)' }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getScoreColor(score) {
  if (score >= 75) return 'var(--success)'
  if (score >= 50) return 'var(--warning)'
  return 'var(--danger)'
}