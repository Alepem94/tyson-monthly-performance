import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Target, ChevronLeft, ChevronRight, TrendingUp, CheckCircle2, AlertCircle, XCircle, Calendar, Megaphone } from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { ProjectionComboChart } from '../ui/Charts'
import { safeNumber, formatNumber, formatNumberFull, formatMonthShort, formatCurrency, truncTo } from '../../utils/format'
import { tipoCampanaToBucket, bucketToLabel } from '../../utils/campaigns'
import { campaignMetricKey, enrichCampaignRows } from '../../utils/historicalAnalytics'

const ACCENT = '#22c55e'
const CAMP_ACCENT = '#f59e0b'

const PLATFORM_CONFIG = {
  facebook:  { label: 'Facebook Ads',  color: '#3b82f6', bg: '#1877F2' },
  instagram: { label: 'Instagram Ads', color: '#f97316', bg: '#E1306C' },
  tiktok:    { label: 'TikTok Ads',    color: '#a855f7', bg: '#000000' },
  google:    { label: 'Google Ads',    color: '#f59e0b', bg: '#4285F4' },
  total:     { label: 'Total',         color: '#22c55e', bg: '#22c55e' },
}

const PLATFORM_ORDER = ['facebook', 'instagram', 'tiktok', 'google']

const normPlat = s => String(s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normKey = s => String(s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function getGroups(rows) {
  const seen = new Map()
  for (const r of rows) {
    const tipo = r.tipo_campana || 'AON'
    const key  = tipoCampanaToBucket(tipo)
    if (!seen.has(key)) seen.set(key, tipo)
  }
  const order = ['mensual', ...([...seen.keys()].filter(k => k !== 'mensual').sort())]
  return order.filter(k => seen.has(k)).map(k => ({
    key: k,
    label: bucketToLabel(k, seen.get(k)),
  }))
}

function getComplianceColor(pct) {
  if (pct >= 100) return '#22c55e'
  if (pct >= 80)  return '#facc15'
  return '#ef4444'
}

function computePct(real, meta) {
  const r = safeNumber(real)
  const m = safeNumber(meta)
  if (!m) return null
  return (r / m) * 100
}

function buildMonthlyObjectivePerformance(campanas, platform, bucket) {
  const map = {}
  const rows = enrichCampaignRows(campanas, platform).filter(
    r => (r._bucket || tipoCampanaToBucket(r.tipo_campana)) === bucket
  )
  for (const r of rows) {
    const key = campaignMetricKey(r)
    if (!map[r.mes]) map[r.mes] = {}
    if (!map[r.mes][key]) map[r.mes][key] = { resultado: 0, inversion: 0 }
    map[r.mes][key].resultado += safeNumber(r.resultado)
    map[r.mes][key].inversion += safeNumber(r.inversion)
  }
  return map
}

function buildMonthlyGoogleAdsPerformance(googleAdsRows) {
  const map = {}
  for (const r of (googleAdsRows || [])) {
    if (!map[r.mes]) map[r.mes] = { display: 0, video: 0 }
    const tipo = String(r.tipo_red || r._obj || '').toLowerCase()
    if (tipo.includes('display')) map[r.mes].display += safeNumber(r.impresiones_visibles)
    if (tipo.includes('video')) map[r.mes].video += safeNumber(r.views) || safeNumber(r.visualizaciones)
  }
  return map
}

// Campaign: aggregated across ALL months, no prorating
function buildCampaignObjectivePerformance(campanas, platform, bucket) {
  const map = {}
  const rows = enrichCampaignRows(campanas, platform).filter(
    r => (r._bucket || tipoCampanaToBucket(r.tipo_campana)) === bucket
  )
  for (const r of rows) {
    const key = campaignMetricKey(r)
    if (!map[key]) map[key] = { resultado: 0, inversion: 0 }
    map[key].resultado += safeNumber(r.resultado)
    map[key].inversion += safeNumber(r.inversion)
  }
  return map // key -> {resultado,inversion}
}

function buildCampaignGoogleAdsPerformance(googleAdsRows) {
  const total = { display: 0, video: 0 }
  for (const r of (googleAdsRows || [])) {
    const tipo = String(r.tipo_red || r._obj || '').toLowerCase()
    if (tipo.includes('display')) total.display += safeNumber(r.impresiones_visibles)
    if (tipo.includes('video')) total.video += safeNumber(r.views) || safeNumber(r.visualizaciones)
  }
  return total
}

function PlatformIcon({ platform, size = 20 }) {
  const p = normPlat(platform)
  if (p === 'facebook') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  if (p === 'instagram') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
  if (p === 'tiktok') return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#ffffff" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
  )
  if (p === 'google') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
  return <Target size={size} color="#ffffff" />
}

function ComplianceCard({ metrica, real, proyeccion, observacion, presupuesto, inversion }) {
  const pct = computePct(real, proyeccion)
  const hasMeta = safeNumber(proyeccion) > 0
  const color = pct !== null ? getComplianceColor(pct) : 'rgba(255,255,255,0.4)'
  const Icon = pct === null ? null : pct >= 100 ? CheckCircle2 : pct >= 80 ? AlertCircle : XCircle
  const pctPresupuesto = presupuesto ? computePct(inversion, presupuesto) : null
  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{metrica}</p>
          <p className="text-3xl font-bold font-display text-white">{formatNumberFull(real)}</p>
          {hasMeta && (
            <p className="text-xs text-white/50 mt-1">
              Proyección: <span className="text-white/70 font-semibold">{formatNumberFull(proyeccion)}</span>
            </p>
          )}
          {presupuesto > 0 && (
            <p className="text-xs text-white/50 mt-1">
              Presupuesto: <span className="text-white/70 font-semibold">{formatCurrency(presupuesto)}</span>
              {inversion > 0 && <> · Inversión: <span className="text-white/70 font-semibold">{formatCurrency(inversion)}</span></>}
            </p>
          )}
        </div>
        {hasMeta && pct !== null && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-4" style={{ borderColor: color, background: `${color}18` }}>
              <span className="text-lg font-bold" style={{ color }}>{truncTo(pct, 0)}%</span>
            </div>
            {Icon && <Icon className="w-4 h-4" style={{ color }} />}
          </div>
        )}
        {!hasMeta && <span className="text-xs px-2 py-1 rounded-full text-white/40 border border-white/10">Solo resultados</span>}
      </div>
      {hasMeta && pct !== null && (
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
        </div>
      )}
      {observacion && <p className="text-xs text-white/50 italic border-l-2 pl-3" style={{ borderColor: color + '66' }}>{observacion}</p>}
    </div>
  )
}

function MetricSlide({ metricRows, color, selectedMonth }) {
  const validRows = metricRows.filter(r => safeNumber(r.real) > 0 || safeNumber(r.proyeccion) > 0)
  if (validRows.length === 0) return <div className="flex items-center justify-center h-48 text-white/30 text-sm">Sin datos registrados</div>
  const metrica = validRows[0]?.metrica || validRows[0]?.objetivo || '—'
  const hasMeta = validRows.some(r => safeNumber(r.proyeccion) > 0)
  const currentRow = validRows.find(r => r.mes === selectedMonth) || validRows[validRows.length - 1]
  if (validRows.length === 1) {
    return <ComplianceCard metrica={metrica} real={currentRow?.real} proyeccion={currentRow?.proyeccion} observacion={currentRow?.observacion} presupuesto={safeNumber(currentRow?.presupuesto)} inversion={safeNumber(currentRow?.inversion)} />
  }
  const chartData = validRows.map(r => ({ mes: r.mes, Real: safeNumber(r.real), Meta: safeNumber(r.proyeccion) }))
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-sm font-semibold text-white">{metrica}</p>
          {!hasMeta && <span className="text-[10px] px-1.5 py-0.5 rounded text-white/40 border border-white/10 mt-1 inline-block">Solo resultados</span>}
        </div>
        {hasMeta && currentRow && (() => { const pct = computePct(currentRow.real, currentRow.proyeccion); if (pct === null) return null; const c = getComplianceColor(pct); return <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{truncTo(pct, 0)}% este mes</span> })()}
      </div>
      <ProjectionComboChart data={chartData} color={color} height={240} />
    </div>
  )
}

function MetricCarousel({ metrics, color, selectedMonth }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef(null)
  useEffect(() => { setIndex(0) }, [metrics])
  const scrollTo = useCallback((i) => {
    const el = scrollRef.current; if (!el) return
    const child = el.children[i]; if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    setIndex(i)
  }, [])
  const prev = () => scrollTo(Math.max(0, index - 1))
  const next = () => scrollTo(Math.min(metrics.length - 1, index + 1))
  if (metrics.length === 0) return <div className="flex items-center justify-center h-48 text-white/30 text-sm">Sin métricas para esta selección</div>
  return (
    <div className="space-y-3">
      <div className="relative">
        {metrics.length > 1 && index > 0 && <button onClick={prev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 rounded-full glass-strong flex items-center justify-center text-white/70 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
        <div ref={scrollRef} className="proyecciones-carousel overflow-x-auto flex snap-x snap-mandatory" onScroll={(e) => { const el = e.currentTarget; const w = el.clientWidth; const i = Math.round(el.scrollLeft / w); if (i !== index) setIndex(i) }}>
          {metrics.map((m, i) => (
            <div key={i} className="proyecciones-slide snap-start flex-shrink-0 w-full px-1"><MetricSlide metricRows={m.rows} color={color} selectedMonth={selectedMonth} /></div>
          ))}
        </div>
        {metrics.length > 1 && index < metrics.length - 1 && <button onClick={next} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 rounded-full glass-strong flex items-center justify-center text-white/70 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>}
      </div>
      {metrics.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {metrics.map((m, i) => (
            <button key={i} onClick={() => scrollTo(i)} className="transition-all duration-200 rounded-full" style={{ width: i === index ? 20 : 6, height: 6, background: i === index ? color : 'rgba(255,255,255,0.2)' }} title={m.key} />
          ))}
        </div>
      )}
      {metrics.length > 1 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {metrics.map((m, i) => (
            <button key={i} onClick={() => scrollTo(i)} className="text-[10px] px-2 py-0.5 rounded-full transition-all" style={{ background: i === index ? `${color}22` : 'rgba(255,255,255,0.05)', color: i === index ? color : 'rgba(255,255,255,0.4)', border: `1px solid ${i === index ? color + '44' : 'rgba(255,255,255,0.08)'}` }}>{m.key}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlatformCard({ platform, allRows, selectedMonth, syncedObjective, onObjectiveChange, allCampanas, googleAdsData }) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.total
  const color = cfg.color
  const platRows = useMemo(() => allRows.filter(r => normPlat(r.plataforma) === platform), [allRows, platform])
  const groups = useMemo(() => getGroups(platRows), [platRows])
  const [selectedGroup, setSelectedGroup] = useState(() => groups[0]?.key || 'mensual')
  const [localObjective, setLocalObjective] = useState(null)
  useEffect(() => { if (groups.length > 0 && !groups.some(g => g.key === selectedGroup)) setSelectedGroup(groups[0].key) }, [groups, selectedGroup])
  const handleGroupChange = useCallback((newGroup) => { setSelectedGroup(newGroup); setLocalObjective(null) }, [])
  const groupRows = useMemo(() => platRows.filter(r => tipoCampanaToBucket(r.tipo_campana || 'AON') === selectedGroup), [platRows, selectedGroup])
  const monthlyPerf = useMemo(() => {
    if (platform === 'google') return buildMonthlyGoogleAdsPerformance(googleAdsData)
    return buildMonthlyObjectivePerformance(allCampanas, platform, selectedGroup)
  }, [platform, allCampanas, googleAdsData, selectedGroup])
  const rowObjectiveKey = useCallback((r) => r.objetivo || r.metrica || '', [])
  const objectives = useMemo(() => {
    const seen = new Set()
    return groupRows.map(rowObjectiveKey).filter(o => o && !seen.has(o) && seen.add(o))
  }, [groupRows, rowObjectiveKey])
  const activeObjective = useMemo(() => {
    if (syncedObjective && objectives.includes(syncedObjective)) return syncedObjective
    if (localObjective && objectives.includes(localObjective)) return localObjective
    return objectives[0] || null
  }, [syncedObjective, localObjective, objectives])
  const syncedButUnavailable = syncedObjective && !objectives.includes(syncedObjective)
  const metrics = useMemo(() => {
    if (!activeObjective) return []
    const rows = groupRows.filter(r => rowObjectiveKey(r) === activeObjective)
    const map = new Map()
    for (const r of rows) {
      const key = r.metrica || r.objetivo || '—'
      let real = 0
      if (platform === 'google') {
        const metricaLower = String(r.metrica || '').toLowerCase()
        const objLower = String(r.objetivo || '').toLowerCase()
        const perf = monthlyPerf[r.mes]
        if (perf) {
          if (objLower === 'display' || metricaLower.includes('impresiones')) real = perf.display
          else if (objLower === 'video' || metricaLower.includes('view')) real = perf.video
        }
      } else {
        const objKey = campaignMetricKey({ objetivo_detectado: r.objetivo || r.metrica })
        real = monthlyPerf[r.mes]?.[objKey]?.resultado || 0
      }
      const enrichedRow = { ...r, real, proyeccion: safeNumber(r.proyeccion), presupuesto: safeNumber(r.presupuesto), inversion: monthlyPerf[r.mes]?.[campaignMetricKey({ objetivo_detectado: r.objetivo || r.metrica })]?.inversion || 0 }
      if (platform === 'google') {
        // inversion not needed for google in this card (uses impresiones)
        enrichedRow.inversion = 0
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(enrichedRow)
    }
    return Array.from(map.entries()).map(([key, rows]) => ({ key, rows: rows.sort((a, b) => String(a.mes).localeCompare(String(b.mes))) }))
  }, [groupRows, activeObjective, rowObjectiveKey, monthlyPerf, platform])
  const handleObjectiveChange = (obj) => { setLocalObjective(obj); onObjectiveChange?.(obj) }
  if (platRows.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="glass-card rounded-2xl overflow-hidden" style={{ borderColor: `${color}33` }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10" style={{ background: `${color}12` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg + '33', border: `1px solid ${color}44` }}><PlatformIcon platform={platform} size={18} /></div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">{cfg.label}</h3>
          {syncedButUnavailable && <p className="text-[10px] text-yellow-400/80 mt-0.5">Objetivo &quot;{syncedObjective}&quot; no disponible — mostrando: {activeObjective}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {groups.length > 1 && (
            <select value={selectedGroup} onChange={e => handleGroupChange(e.target.value)} className="proyecciones-select" style={{ '--accent': color }}>
              {groups.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          )}
          {objectives.length > 1 && (
            <select value={activeObjective || ''} onChange={e => handleObjectiveChange(e.target.value)} className="proyecciones-select" style={{ '--accent': color }}>
              {objectives.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {objectives.length === 1 && activeObjective && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>{activeObjective}</span>
          )}
        </div>
      </div>
      <div className="p-5"><MetricCarousel metrics={metrics} color={color} selectedMonth={selectedMonth} /></div>
    </motion.div>
  )
}

// ── Campaign projections (no prorating, total per campaign) ──
function CampaignCard({ campaignKey, rows, allCampanas, googleAdsData }) {
  // rows: all proyeccion rows for this campaign (same nombre_campana or tipo_campana bucket)
  const first = rows[0] || {}
  const fechas = first.fecha_inicio || first.fecha_fin ? `${first.fecha_inicio || '—'} → ${first.fecha_fin || '—'}` : null
  const tipoCampana = first.tipo_campana || '—'
  // Group rows by plataforma for display
  const byPlatform = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const p = normPlat(r.plataforma) || 'total'
      if (!map[p]) map[p] = []
      map[p].push(r)
    }
    return map
  }, [rows])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden" style={{ borderColor: `${CAMP_ACCENT}33` }}>
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3" style={{ background: `${CAMP_ACCENT}14` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${CAMP_ACCENT}22`, border: `1px solid ${CAMP_ACCENT}44` }}>
          <Megaphone className="w-4 h-4" style={{ color: CAMP_ACCENT }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{campaignKey}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">{tipoCampana}</span>
            {fechas && <span className="text-[11px] text-white/40 flex items-center gap-1"><Calendar className="w-3 h-3" /> {fechas}</span>}
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: `${CAMP_ACCENT}22`, color: CAMP_ACCENT, border: `1px solid ${CAMP_ACCENT}44` }}>Campaña · total</span>
      </div>
      <div className="p-5 space-y-4">
        {Object.entries(byPlatform).map(([plat, platRows]) => {
          const cfg = PLATFORM_CONFIG[plat] || PLATFORM_CONFIG.total
          // For this platform, compute campaña performance (total, not monthly)
          // Need tipo_campana bucket for this campaign group — use first row's tipo
          const bucket = tipoCampanaToBucket(first.tipo_campana || 'AON')
          const perfMap = plat === 'google' ? buildCampaignGoogleAdsPerformance(googleAdsData) : buildCampaignObjectivePerformance(allCampanas, plat, bucket)
          return (
            <div key={plat} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10" style={{ background: `${cfg.color}12` }}>
                <PlatformIcon platform={plat} size={16} />
                <span className="text-xs font-bold text-white">{cfg.label}</span>
              </div>
              <div className="divide-y divide-white/5">
                {platRows.map((r, idx) => {
                  const objetivo = r.objetivo || r.metrica || '—'
                  const metrica = r.metrica || r.objetivo || objetivo
                  const proy = safeNumber(r.proyeccion)
                  const pres = safeNumber(r.presupuesto)
                  let real = 0, inv = 0
                  if (plat === 'google') {
                    const objLower = String(r.objetivo || '').toLowerCase()
                    const metLower = String(r.metrica || '').toLowerCase()
                    if (objLower === 'display' || metLower.includes('impresiones')) { real = perfMap.display; }
                    else if (objLower === 'video' || metLower.includes('view')) { real = perfMap.video; }
                  } else {
                    const key = campaignMetricKey({ objetivo_detectado: objetivo })
                    real = perfMap[key]?.resultado || 0
                    inv = perfMap[key]?.inversion || 0
                  }
                  const pct = computePct(real, proy)
                  const color = pct !== null ? getComplianceColor(pct) : 'rgba(255,255,255,0.35)'
                  return (
                    <div key={idx} className="px-3 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white capitalize">{metrica} <span className="text-white/40 font-normal">· {objetivo}</span></p>
                        {r.observacion && <p className="text-[11px] text-white/40 italic mt-0.5 line-clamp-2">{r.observacion}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[11px] text-white/50">Real: <b className="text-white">{formatNumberFull(real)}</b></span>
                          <span className="text-[11px] text-white/50">Proy: <b className="text-white/70">{proy ? formatNumberFull(proy) : '—'}</b></span>
                          {pres > 0 && <span className="text-[11px] text-white/40">{formatCurrency(pres)} {inv > 0 && `→ ${formatCurrency(inv)}`}</span>}
                        </div>
                      </div>
                      {proy > 0 ? (
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2" style={{ borderColor: color, background: `${color}18` }}>
                            <span className="text-xs font-bold" style={{ color }}>{pct !== null ? `${truncTo(pct, 0)}%` : '—'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">Sin meta</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function ProyeccionesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl skeleton" />
            <div className="flex-1 space-y-1.5"><div className="h-3.5 w-28 rounded skeleton" /><div className="h-2.5 w-20 rounded skeleton" /></div>
            <div className="h-8 w-24 rounded-lg skeleton" />
          </div>
          <div className="p-5"><div className="h-56 rounded-xl skeleton" /></div>
        </div>
      ))}
    </div>
  )
}

export function ProyeccionesSection({
  data = [],
  allData = [],
  selectedMonth,
  loading,
  theme,
  allCampanas = [],
  googleAdsData = [],
  // New prop for campaign projections (passed from Dashboard)
  campanaData = [],
  proyeccionesCampana = [],
  bucket, setBucket, availableBuckets, campanas, observaciones,
}) {
  const [syncedObjective, setSyncedObjective] = useState(null)
  const [syncActive, setSyncActive] = useState(false)
  const [activeTab, setActiveTab] = useState('mensual')

  const handleObjectiveChange = useCallback((obj) => { if (syncActive) setSyncedObjective(obj) }, [syncActive])
  const toggleSync = () => { setSyncActive(v => !v); if (syncActive) setSyncedObjective(null) }

  // Monthly rows: data / allData already filtered to Mensual only by useDateFilter
  // Fallback: if caller still passes all proyecciones, split here for robustness
  const mensualRowsAll = useMemo(() => {
    const src = allData.length > 0 ? allData : data
    return src.filter(r => (r.tipo_proyeccion || 'Mensual') === 'Mensual')
  }, [allData, data])
  const mensualRowsCurrent = useMemo(() => data.filter(r => (r.tipo_proyeccion || 'Mensual') === 'Mensual'), [data])

  // Campaign rows: prefer explicit prop, fallback to filtering allData
  const campRows = useMemo(() => {
    if (Array.isArray(proyeccionesCampana) && proyeccionesCampana.length > 0) return proyeccionesCampana
    if (Array.isArray(campanaData) && campanaData.length > 0) return campanaData
    const src = allData.length > 0 ? allData : data
    return src.filter(r => (r.tipo_proyeccion || '') === 'Campaña')
  }, [proyeccionesCampana, campanaData, allData, data])

  const sourceRows = mensualRowsAll

  const platforms = useMemo(() => {
    const present = new Set(sourceRows.map(r => normPlat(r.plataforma)).filter(Boolean))
    return PLATFORM_ORDER.filter(p => present.has(p))
  }, [sourceRows])

  // Group campaign rows by campaña key (nombre_campana || tipo_campana)
  const campaignGroups = useMemo(() => {
    const map = new Map()
    for (const r of campRows) {
      const key = (r.nombre_campana && String(r.nombre_campana).trim()) || (r.tipo_campana && String(r.tipo_campana).trim()) || 'Campaña sin nombre'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return Array.from(map.entries()).map(([key, rows]) => ({ key, rows }))
  }, [campRows])

  if (loading) return <ProyeccionesSkeleton />

  const hasMensual = mensualRowsCurrent.length > 0 || mensualRowsAll.length > 0
  const hasCampana = campRows.length > 0

  if (!hasMensual && !hasCampana) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={TrendingUp} title="Proyecciones" subtitle="Metas vs resultados" accentColor={ACCENT} />
        <EmptyState icon={Target} title="Sin proyecciones registradas" message="Agrega filas a la hoja 'Proyecciones' con tipo_proyeccion Mensual/Campaña, plataforma, objetivo/métrica y proyección." />
      </div>
    )
  }

  // Auto-select tab with data
  const effectiveTab = (!hasMensual && hasCampana) ? 'campana' : (!hasCampana && hasMensual) ? 'mensual' : activeTab

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader icon={TrendingUp} title="Proyecciones" subtitle={selectedMonth ? `Metas vs resultados — ${formatMonthShort(selectedMonth)}` : 'Metas vs resultados'} accentColor={ACCENT} />
        <div className="flex items-center gap-2">
          {hasMensual && hasCampana && (
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              <button onClick={() => setActiveTab('mensual')} className={`px-3 py-1.5 text-xs font-semibold transition ${effectiveTab === 'mensual' ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white'}`}>Mensual</button>
              <button onClick={() => setActiveTab('campana')} className={`px-3 py-1.5 text-xs font-semibold transition ${effectiveTab === 'campana' ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white'}`}>Campaña</button>
            </div>
          )}
          {effectiveTab === 'mensual' && (
            <button onClick={toggleSync} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl transition-all" style={{ background: syncActive ? `${ACCENT}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${syncActive ? ACCENT + '55' : 'rgba(255,255,255,0.10)'}`, color: syncActive ? ACCENT : 'rgba(255,255,255,0.5)' }}>
              <span className="w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center" style={{ borderColor: syncActive ? ACCENT : 'currentColor' }}>{syncActive && <span className="w-1.5 h-1.5 rounded-sm" style={{ background: ACCENT }} />}</span>
              Sincronizar objetivos
            </button>
          )}
        </div>
      </div>

      {effectiveTab === 'mensual' && (
        <div className="space-y-4">
          {!hasMensual ? (
            <div className="glass-card rounded-2xl p-8 text-center"><Target className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/50 text-sm">Sin proyecciones mensuales para {formatMonthShort(selectedMonth)}</p><p className="text-white/30 text-xs mt-1">Este mes no tiene meta registrada — no se muestra 0.</p></div>
          ) : platforms.length > 0 ? (
            platforms.map(platform => (
              <PlatformCard key={platform} platform={platform} allRows={sourceRows} selectedMonth={selectedMonth} syncedObjective={syncActive ? syncedObjective : null} onObjectiveChange={handleObjectiveChange} allCampanas={allCampanas} googleAdsData={googleAdsData} />
            ))
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center"><Target className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/50 text-sm">Sin plataformas con datos mensuales</p></div>
          )}
        </div>
      )}

      {effectiveTab === 'campana' && (
        <div className="space-y-4">
          {!hasCampana ? (
            <div className="glass-card rounded-2xl p-8 text-center"><Megaphone className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/50 text-sm">Sin proyecciones de campaña</p><p className="text-white/30 text-xs mt-1">Agrega filas con tipo_proyeccion = Campaña y nombre_campana.</p></div>
          ) : (
            <>
              <p className="text-xs text-white/40 px-1">Las proyecciones de campaña muestran el total acumulado de la campaña (sin prorratear por mes). El % se calcula contra resultados reales totales de la campaña.</p>
              {campaignGroups.map(g => (
                <CampaignCard key={g.key} campaignKey={g.key} rows={g.rows} allCampanas={allCampanas} googleAdsData={googleAdsData} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
