import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import ReportDetail from './components/ReportDetail'

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font)'
          }
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/report/:id" element={<ReportDetail />} />
      </Routes>
    </div>
  )
}