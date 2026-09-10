import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { BRAND_ID } from './utils/brands'

// Dashboard de una sola marca (Tyson Foods Mx): no hay selector de marcas
// ni módulo de influencers — toda ruta cae siempre en /dashboard/tyson.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/dashboard/${BRAND_ID}`} replace />} />
        <Route path="/dashboard/:marcaId/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to={`/dashboard/${BRAND_ID}`} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
