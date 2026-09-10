import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Facebook, Instagram, Users, Eye, Heart, TrendingUp, Megaphone, DollarSign, BarChart2, ChevronDown, ChevronUp, Target, LineChart } from 'lucide-react'
import { KPICard, KPICardSkeleton, VariationBadge, ComparisonLegend } from '../ui/KPICard'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { ChartCard } from '../ui/Charts'
import { PlatformInsightsCard, PaidMediaExecutiveCard, BreakdownInsightsAccordion, mergeLegacyObservations } from '../ui/EditorialInsights'
import { TopPostsSection } from '../ui/PostCard'
import { DataTable } from '../ui/DataTable'
import { PlatformSubnav } from '../ui/PlatformSubnav'
import { CampaignToggle } from '../ui/CampaignToggle'
import { safeNumber, formatNumber, formatCurrency, formatDecimal, truncTo, prevMonth, pctChange } from '../../utils/format'
import { useNavigate, useParams } from 'react-router-dom'
import { buildCampaignPerformance, getCampaignPlatform, tipoCampanaToBucket, bucketToLabel } from '../../utils/campaigns'

const PLATFORM_CONFIG = {
  facebook:  { icon: Facebook,  accent: '#3b82f6', label: 'Facebook' },
    instagram: { icon: Instagram, accent: '#f97316', label: 'Instagram' },
}

const METRIC_STYLE = {
  'alcance':           { accent: '#22d3ee', icon: Eye },
  'reach':             { accent: '#22d3ee', icon: Eye },
  'interacción':       { accent: '#ec4899', icon: Heart },
  'interaccion':       { accent: '#ec4899', icon: Heart },
  'likes':             { accent: '#f43f5e', icon: Heart },
  'thruplays':         { accent: '#a78bfa', icon: TrendingUp },
  'visitas al perfil': { accent: '#22c55e', icon: Users },
  'views':             { accent: '#f59e0b', icon: Eye },
  'views norte':       { accent: '#f59e0b', icon: Eye },
  'views pacifico':    { accent: '#fb923c', icon: Eye },
}
function metricStyle(metrica) {
  const key = String(metrica || '').toLowerCase().trim()
  return METRIC_STYLE[key] || { accent: '#94a3b8', icon: TrendingUp }
}
function capitalize(s) {
  return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '—'
}
const normPlat = v => String(v || '').toLowerCase().trim()
// Normaliza keys de objetivo/métrica: lowercase, trim, sin acentos
const normKey = v => String(v || '').toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// ── Grupos únicos, mensual primero ───────────────────────────────────────────
function getGroups(rows) {
  const seen = new Map()
  for (const r of rows) {
    const tipo = r.tipo_campana || 'AON'
    const key  = tipoCampanaToBucket(tipo)
    if (!seen.has(key)) seen.set(key, tipo)
  }
  const order = ['mensual', ...([...seen.keys()].filter(k => k !== 'mensual').sort())]
  return order.filter(k => seen.has(k)).map(k => ({ key: k, label: bucketToLabel(k, seen.get(k)) }))
}

// ── Inversión de campañas para plataforma+bucket ─────────────────────────────
// bucket=null → todas las campañas de la plataforma
function campanaInversion(campanas, platform, bucket) {
  return campanas
    .filter(c => {
      const cPlat   = getCampaignPlatform(c)
      const cBucket = c._bucket || tipoCampanaToBucket(c.tipo_campana)
      return cPlat === platform && (bucket === null || cBucket === bucket)
    })
    .reduce((a, c) => a + safeNumber(c.inversion), 0)
}

// ── Inversión por objetivo dentro de un grupo ────────────────────────────────
// Cruza: plataforma + tipo_campana + objetivo_detectado ↔ objetivo
function buildObjectiveInversionMap(campanas, platform, bucket) {
  const map = {}
  campanas
    .filter(c => {
      const cPlat   = getCampaignPlatform(c)
      const cBucket = c._bucket || tipoCampanaToBucket(c.tipo_campana)
      return cPlat === platform && cBucket === bucket
    })
    .forEach(c => {
      const key = normKey(c._objective || c.objetivo_detectado || c.objetivo || '')
      if (!key) return
      map[key] = (map[key] || 0) + safeNumber(c.inversion)
    })
  return map
}

// ── Resumen de metas por objetivo a nivel plataforma ─────────────────────────
// Reglas confirmadas: proyección/presupuesto (resultado/inversión) se SUMAN
// entre tipos de campaña; CPR, RTR y Frecuencia se PROMEDIAN.
// Solo considera tipo_proyeccion Mensual (campañas no se suman al mes)
function buildPlatformProjectionSummary(proyecciones, platform, month) {
  const map = {}
  for (const r of (proyecciones || [])) {
    if ((r.tipo_proyeccion || 'Mensual') !== 'Mensual') continue
    if (normPlat(r.plataforma) !== platform || r.mes !== month) continue
    const objKey = normKey(r.objetivo || r.metrica || '')
    if (!objKey) continue
    if (!map[objKey]) {
      map[objKey] = {
        proyeccionSum: 0, presupuestoSum: 0,
        cprValues: [], rtrValues: [], rtrLabel: null, frecuenciaValues: [],
      }
    }
    const cell = map[objKey]
    cell.proyeccionSum += safeNumber(r.proyeccion)
    cell.presupuestoSum += safeNumber(r.presupuesto)
    if (safeNumber(r.cpr_meta) > 0) cell.cprValues.push(safeNumber(r.cpr_meta))
    if (r.rtr !== undefined && r.rtr !== null && String(r.rtr).trim() !== '' && r.metrica_rtr) {
      cell.rtrValues.push(safeNumber(r.rtr))
      cell.rtrLabel = r.metrica_rtr
    }
    if (safeNumber(r.frecuencia) > 0) cell.frecuenciaValues.push(safeNumber(r.frecuencia))
  }
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const result = {}
  for (const [key, cell] of Object.entries(map)) {
    result[key] = {
      proyeccionSum: cell.proyeccionSum || null,
      presupuestoSum: cell.presupuestoSum || null,
      cprMeta: avg(cell.cprValues),
      rtrMeta: avg(cell.rtrValues),
      rtrLabel: cell.rtrLabel,
      frecuenciaMeta: avg(cell.frecuenciaValues),
    }
  }
  return result
}

// ── CPR Meta a nivel grupo: lee cpr_meta de la fila exacta ──────────────────
function getGroupCPRMeta(proyecciones, platform, bucket, objKey) {
  const rows = (proyecciones || []).filter(r => {
    if ((r.tipo_proyeccion || 'Mensual') !== 'Mensual') return false
    return normPlat(r.plataforma) === platform
      && tipoCampanaToBucket(r.tipo_campana || 'AON') === bucket
      && normKey(r.objetivo || r.metrica || '') === objKey
  })
  if (rows.length === 0) return null
  // Tomar el cpr_meta de la primera fila que lo tenga
  for (const r of rows) {
    const cpr = safeNumber(r.cpr_meta)
    if (cpr > 0) return cpr
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// PaidMediaSection — reutilizable para FB, IG y TikTok
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: detecta si la métrica es de tipo "alcance" → CPM (por mil)
const isCPM = (metrica) => {
  const k = normKey(metrica || '')
  return k.includes('alcance') || k.includes('reach')
}

// Helper: nombre del CPR según la métrica
const cprLabel = (metrica) => {
  const k = normKey(metrica || '')
  if (k.includes('alcance') || k.includes('reach')) return 'CPM (x1,000)'
  if (k.includes('interacc') || k.includes('interaccion')) return 'CPI (Interacción)'
  if (k.includes('view')) return 'CPV (View)'
  if (k.includes('like')) return 'CPL (Like)'
  if (k.includes('thruplay')) return 'CPTV (ThruPlay)'
  if (k.includes('visitas')) return 'CPVP (Visita Perfil)'
  return `CPR (${capitalize(metrica)})`
}

function projectionKeys(row) {
  return [...new Set([row?.objetivo, row?.metrica].map(normKey).filter(Boolean))]
}

function findCampaignPerformance(performanceMap, row) {
  for (const key of projectionKeys(row)) {
    if (performanceMap[key]) return performanceMap[key]
  }
  return null
}

function KpiRow({ label, value, formatted, badges, lowerIsBetter = false }) {
  const hasAnyBadge = badges.ma != null || badges.aa != null || badges.proy != null
  return (
    <div className="py-2.5 border-b border-white/[0.06] last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] text-white/45 font-medium">{label}</span>
        <span className="text-sm font-bold font-display text-white">{formatted}</span>
      </div>
      {hasAnyBadge && (
        <div className="flex flex-wrap gap-1 mt-1.5 justify-end">
          {badges.ma != null && <VariationBadge value={badges.ma} kind="ma" lowerIsBetter={lowerIsBetter} />}
          {badges.aa != null && <VariationBadge value={badges.aa} kind="aa" lowerIsBetter={lowerIsBetter} />}
          {badges.proy != null && <VariationBadge value={badges.proy} kind="proy" lowerIsBetter={lowerIsBetter} />}
        </div>
      )}
    </div>
  )
}

function ObjectiveResultCard({ card, accent, delay = 0 }) {
  const Icon = metricStyle(card.label).icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.06 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-lg" style={{ background: `${accent}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </span>
        <p className="text-sm font-bold text-white capitalize">{card.label}</p>
      </div>

      <div>
        <KpiRow label="Resultado" formatted={formatNumber(card.resultado.real)} badges={card.resultado} />
        <KpiRow label="Inversión" formatted={formatCurrency(card.inversion.real)} badges={card.inversion} />
        {card.costo && (
          <KpiRow label="Costo por resultado" formatted={`$${formatDecimal(card.costo.real, 2)}`} badges={card.costo} lowerIsBetter />
        )}
        {card.rtr && card.rtr.real != null && (
          <KpiRow label={card.rtr.label} formatted={`${truncTo(card.rtr.real, 2)}%`} badges={card.rtr} />
        )}
        {card.frecuencia && card.frecuencia.real != null && (
          <KpiRow label="Frecuencia" formatted={formatDecimal(card.frecuencia.real, 2)} badges={card.frecuencia} />
        )}
      </div>
    </motion.div>
  )
}

export function PaidMediaSection({ platform, month, campanas, allCampanas = [], proyecciones, accent, hallazgos = [], observaciones = [] }) {
  // Defensive normalization: the section must render even if a Sheet returns an unexpected shape.
  const safeCampanas = Array.isArray(campanas) ? campanas : []
  const safeAllCampanas = Array.isArray(allCampanas) ? allCampanas : []
  const safeProyecciones = Array.isArray(proyecciones) ? proyecciones : []
  const [bucket, setBucket] = useState('mensual')
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const paidHallazgos = useMemo(() => mergeLegacyObservations(
    (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === `${platform}-paid`),
    (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === `${platform}-paid`)
  ), [hallazgos, observaciones, platform])
  // Hallazgos propios del desglose de Paid Media (distintos a los de arriba,
  // junto a la Inversión Total). Usan el sufijo "-desglose" para poder
  // cargarse de forma independiente en la hoja Hallazgos/Observaciones.
  const paidBreakdownHallazgos = useMemo(() => mergeLegacyObservations(
    (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === `${platform}-paid-desglose`),
    (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === `${platform}-paid-desglose`)
  ), [hallazgos, observaciones, platform])

  // Proyecciones de esta plataforma y mes (marca ya filtrada por el hook)
  const platProy = useMemo(
    () => safeProyecciones.filter(p => normPlat(p.plataforma) === platform && p.mes === month),
    [safeProyecciones, platform, month]
  )

  // Previous month proyecciones for variation
  const pm = prevMonth(month)
  const prevPlatProy = useMemo(
    () => safeProyecciones.filter(p => normPlat(p.plataforma) === platform && p.mes === pm),
    [safeProyecciones, platform, pm]
  )
  const py = month ? `${Number(String(month).slice(0, 4)) - 1}-${String(month).slice(5, 7)}` : null

  const inversionTotal = useMemo(() => campanaInversion(safeCampanas, platform, null), [safeCampanas, platform])
  const platformPerformance = useMemo(
    () => buildCampaignPerformance(safeCampanas, platform, null),
    [safeCampanas, platform]
  )
  const prevPlatformPerformance = useMemo(
    () => buildCampaignPerformance(safeAllCampanas.filter(r => r.mes === pm), platform, null),
    [safeAllCampanas, platform, pm]
  )
  const yearPlatformPerformance = useMemo(
    () => buildCampaignPerformance(safeAllCampanas.filter(r => r.mes === py), platform, null),
    [safeAllCampanas, platform, py]
  )

  const groups = useMemo(() => getGroups(platProy), [platProy])

  // Auto-select first bucket that has data if 'mensual' has none
  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.key === bucket)) {
      setBucket(groups[0].key)
    }
  }, [groups, bucket])

  const projectionSummary = useMemo(
    () => buildPlatformProjectionSummary(safeProyecciones, platform, month),
    [safeProyecciones, platform, month]
  )

  const objectiveCards = useMemo(() => {
    return Object.entries(platformPerformance)
      .filter(([, actual]) => actual.resultado > 0 || actual.inversion > 0)
      .map(([key, actual]) => {
        const label = actual.objetivo || actual.metrica || key
        const prevActual = prevPlatformPerformance[key]
        const yearActual = yearPlatformPerformance[key]
        const meta = projectionSummary[key] || {}
        const cpm = isCPM(label)

        const cprOf = a => a?.resultado > 0 ? (cpm ? (a.inversion / a.resultado) * 1000 : a.inversion / a.resultado) : null
        const cprReal = cprOf(actual), cprPrev = cprOf(prevActual), cprYear = cprOf(yearActual)

        const hasRtr = !!meta.rtrLabel
        const rtrOf = a => hasRtr && a?.hasImpresiones && a.impresiones > 0 ? (a.resultado / a.impresiones) * 100 : null
        const rtrReal = rtrOf(actual), rtrPrev = rtrOf(prevActual), rtrYear = rtrOf(yearActual)

        const frecOf = a => cpm && a?.hasImpresiones && a.resultado > 0 ? a.impresiones / a.resultado : null
        const frecReal = frecOf(actual), frecPrev = frecOf(prevActual), frecYear = frecOf(yearActual)

        const withVariations = (real, prev, year, metaVal) => ({
          real,
          ma: (real != null && prev != null) ? pctChange(real, prev) : null,
          aa: (real != null && year != null) ? pctChange(real, year) : null,
          proy: (real != null && metaVal > 0) ? pctChange(real, metaVal) : null,
          metaValue: metaVal || null,
        })

        return {
          key, label, isAlcance: cpm,
          resultado: withVariations(actual.resultado, prevActual?.resultado, yearActual?.resultado, meta.proyeccionSum),
          inversion: withVariations(actual.inversion, prevActual?.inversion, yearActual?.inversion, meta.presupuestoSum),
          costo: cprReal != null ? withVariations(cprReal, cprPrev, cprYear, meta.cprMeta) : null,
          rtr: hasRtr ? { ...withVariations(rtrReal, rtrPrev, rtrYear, meta.rtrMeta), label: meta.rtrLabel } : null,
          frecuencia: cpm ? withVariations(frecReal, frecPrev, frecYear, meta.frecuenciaMeta) : null,
        }
      })
      .sort((a, b) => b.resultado.real - a.resultado.real)
  }, [platformPerformance, prevPlatformPerformance, yearPlatformPerformance, projectionSummary])

  const groupPerformance = useMemo(
    () => buildCampaignPerformance(safeCampanas, platform, bucket),
    [safeCampanas, platform, bucket]
  )

  // Filas del grupo seleccionado
  const groupRows = useMemo(
    () => platProy
      .filter(r => tipoCampanaToBucket(r.tipo_campana || 'AON') === bucket)
      .map(r => {
        const actual = findCampaignPerformance(groupPerformance, r)
        return {
          ...r,
          _realFromCampaign: actual?.resultado || 0,
          _invFromCampaign: actual?.inversion || 0,
        }
      })
      .sort((a, b) => safeNumber(b._realFromCampaign) - safeNumber(a._realFromCampaign)),
    [platProy, bucket, groupPerformance]
  )

  // Mapa objetivo → inversión para el grupo actual
  const objInvMap = useMemo(
    () => buildObjectiveInversionMap(safeCampanas, platform, bucket),
    [safeCampanas, platform, bucket]
  )

  const groupInversion = useMemo(() => campanaInversion(safeCampanas, platform, bucket), [safeCampanas, platform, bucket])
  const groupLabel     = groups.find(g => g.key === bucket)?.label || bucket
  const prevInversion = useMemo(() => campanaInversion(safeAllCampanas.filter(r => r.mes === pm), platform, null), [safeAllCampanas, platform, pm])
  const yearInversion = useMemo(() => campanaInversion(safeAllCampanas.filter(r => r.mes === py), platform, null), [safeAllCampanas, platform, py])

  // Subtítulo del header
  const subtitle = [
    inversionTotal > 0 ? `${formatCurrency(inversionTotal)} inversión` : '',
    objectiveCards.length > 0 ? `${objectiveCards.length} objetivo${objectiveCards.length !== 1 ? 's' : ''}` : '',
    groups.length > 1 ? `${groups.length} grupos` : '',
  ].filter(Boolean).join(' · ')


  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}33` }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: `${accent}14` }}>
        <div className="p-2 rounded-xl" style={{ background: `${accent}25` }}>
          <BarChart2 className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Paid Media</p>
          {subtitle && <p className="text-[11px] text-white/50">{subtitle}</p>}
        </div>
      </div>

      <div className="p-5 space-y-6" style={{ background: 'rgba(0,0,0,0.28)' }}>

          {/* ── 1. Inversión Total del mes ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)] gap-4 items-stretch">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                Inversión total del mes
              </p>
              <div className="grid grid-cols-1 max-w-xs gap-3">
                <KPICard title="Inversión Total" value={inversionTotal} icon={DollarSign}
                  accentColor="#f59e0b" formatter={formatCurrency}
                  variation={prevInversion > 0 ? pctChange(inversionTotal, prevInversion) : null}
                  variationYear={yearInversion > 0 ? pctChange(inversionTotal, yearInversion) : null}
                  subtitle="Suma de todas las campañas, sin distinguir objetivo"
                  delay={0} />
              </div>
            </div>
            {paidHallazgos.length > 0 && <PaidMediaExecutiveCard items={paidHallazgos} accent={accent} />}
          </div>

          {/* ── 2. Resultados por objetivo ── */}
          {objectiveCards.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                Resultados por objetivo
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {objectiveCards.map((card, i) => (
                  <ObjectiveResultCard key={card.key} card={card} accent={metricStyle(card.label).accent} delay={i} />
                ))}
              </div>
              <ComparisonLegend className="mt-3" />
            </div>
          )}

          {/* ── 3. Desglose por campañas (colapsable, cerrado por default) ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">
            <button
              type="button"
              onClick={() => setBreakdownOpen(v => !v)}
              className="w-full flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                Desglose por campañas
              </p>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${breakdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {breakdownOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/8"
                >
                  <div className="p-4 space-y-4">
                    {paidBreakdownHallazgos.length > 0 && (
                      <BreakdownInsightsAccordion items={paidBreakdownHallazgos} accent={accent} />
                    )}

                    {groups.length > 1 && (
                      <div>
                        <CampaignToggle buckets={groups} selected={bucket} onChange={setBucket} accentColor={accent} />
                      </div>
                    )}

                    {/* Inversión del grupo */}
                    {groupInversion > 0 && (
                      <div>
                        <KPICard title={`Inversión — ${groupLabel}`} value={groupInversion}
                          icon={DollarSign} accentColor="#f59e0b" formatter={formatCurrency} delay={0} />
                      </div>
                    )}

                    {/* Tabla: Objetivo | Métrica | Resultado | Meta | vs Meta | Inversión | CPR | CPR vs Meta */}
                    {groupRows.length > 0 ? (
                      <DataTable
                        columns={[
                          { key: 'objetivo', label: 'Objetivo', bold: true,
                            render: v => <span className="capitalize">{v || '—'}</span> },
                          { key: 'metrica', label: 'Métrica',
                            render: v => <span className="text-white/60 text-xs capitalize">{v || '—'}</span> },
                          { key: '_realFromCampaign', label: 'Resultado', align: 'right',
                            render: v => safeNumber(v) > 0 ? formatNumber(v) : <span className="text-white/30">—</span> },
                          { key: 'proyeccion', label: 'Proyección', align: 'right',
                            render: v => safeNumber(v) > 0 ? formatNumber(v) : <span className="text-white/30">—</span> },
                          { key: '_vs', label: 'vs Proyección', align: 'right',
                            render: (_, r) => {
                              const proy = safeNumber(r.proyeccion), real = safeNumber(r._realFromCampaign)
                              if (!proy || !real) return <span className="text-white/30">—</span>
                              const pct = ((real / proy) - 1) * 100
                              return <span className={pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                                {pct >= 0 ? '+' : ''}{truncTo(pct, 2)}%
                              </span>
                            },
                          },
                          { key: '_inv', label: 'Inversión', align: 'right',
                            render: (_, r) => {
                              const inv = safeNumber(r._invFromCampaign)
                              return inv > 0 ? formatCurrency(inv) : <span className="text-white/30">—</span>
                            },
                          },
                          { key: '_cpr', label: 'CPR', align: 'right',
                            render: (_, r) => {
                              const metricKey = normKey(r.metrica || r.objetivo || '')
                              const objKey = normKey(r.objetivo || '')
                              const inv = safeNumber(r._invFromCampaign)
                              const real = safeNumber(r._realFromCampaign)
                              if (!inv || !real) return <span className="text-white/30">—</span>
                              const cpr = isCPM(r.metrica || r.objetivo) ? (inv / real) * 1000 : inv / real
                              return (
                                <div>
                                  <div className="text-sm font-mono text-amber-200">${formatDecimal(cpr, 2)}</div>
                                  {isCPM(r.metrica || r.objetivo) && <div className="text-[10px] text-white/40">x1,000</div>}
                                </div>
                              )
                            },
                          },
                          { key: '_cpr_vs', label: 'CPR vs Meta', align: 'right',
                            render: (_, r) => {
                              const metricKey = normKey(r.metrica || r.objetivo || '')
                              const objKey = normKey(r.objetivo || '')
                              const inv = safeNumber(r._invFromCampaign)
                              const real = safeNumber(r._realFromCampaign)
                              if (!inv || !real) return <span className="text-white/30">—</span>
                              const cprReal = isCPM(r.metrica || r.objetivo) ? (inv / real) * 1000 : inv / real
                              // Leer CPR meta del sheet (cpr_meta de la fila de proyección de este grupo)
                              const cprMeta = getGroupCPRMeta(platProy, platform, bucket, metricKey)
                                || getGroupCPRMeta(platProy, platform, bucket, objKey)
                              if (!cprMeta) return <span className="text-white/30">—</span>
                              // Variación: si CPR real < meta → bueno (positivo), CPR real > meta → malo (negativo)
                              const pct = ((cprMeta - cprReal) / cprMeta) * 100
                              return (
                                <span className={pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                                  {pct >= 0 ? '+' : ''}{truncTo(pct, 2)}%
                                </span>
                              )
                            },
                          },
                        ]}
                        data={groupRows}
                      />
                    ) : (
                      <p className="text-white/40 text-sm text-center py-4">
                        Sin datos para este grupo en el mes seleccionado
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SocialSection principal (Facebook e Instagram)
// ═══════════════════════════════════════════════════════════════════════════════
export function SocialSection({
  platform, data, campanas = [], allCampanas = [], proyecciones = [], topPosts = [],
  observaciones, historical = [], loading, hallazgos = [],
}) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook
  const navigate = useNavigate()
  const { marcaId } = useParams()
  const activeMonth = data?.mes || null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={cfg.icon} title={cfg.label} subtitle="Sin datos para este mes" accentColor={cfg.accent} />
        <EmptyState icon={cfg.icon} title="Sin datos disponibles"
          message="No hay información registrada para esta plataforma en el mes seleccionado." />
      </div>
    )
  }

  const engagement = (Math.floor(safeNumber(data.engagement_rate) * 10000) / 100).toFixed(2)

  // Previous month data for variation badges
  const pm = prevMonth(data?.mes)
  const prevData = (historical || []).find(r => r.mes === pm)
  const prevEngagement = prevData ? (Math.floor(safeNumber(prevData.engagement_rate) * 10000) / 100) : null
  const yearMonth = activeMonth ? `${Number(String(activeMonth).slice(0, 4)) - 1}-${String(activeMonth).slice(5, 7)}` : null
  const yearData = (historical || []).find(r => r.mes === yearMonth)
  const yearEngagement = yearData ? (Math.floor(safeNumber(yearData.engagement_rate) * 10000) / 100) : null



  const primaryKpis = [
    { key: 'seguidores',    title: 'Seguidores',    value: safeNumber(data.seguidores),    icon: Users,      accent: cfg.accent, variation: pctChange(data.seguidores, prevData?.seguidores), variationYear: pctChange(data.seguidores, yearData?.seguidores) },
    { key: 'alcance',       title: 'Alcance',       value: safeNumber(data.alcance),       icon: Eye,        accent: '#22d3ee',  variation: pctChange(data.alcance, prevData?.alcance), variationYear: pctChange(data.alcance, yearData?.alcance) },
    { key: 'interacciones', title: 'Interacciones', value: safeNumber(data.interacciones), icon: Heart,      accent: '#ec4899',  variation: pctChange(data.interacciones, prevData?.interacciones), variationYear: pctChange(data.interacciones, yearData?.interacciones) },
    { key: 'engagement',    title: 'Engagement',    value: engagement,                     icon: TrendingUp, accent: '#22c55e', suffix: '%', fmt: v => v, variation: pctChange(parseFloat(engagement), prevEngagement), variationYear: pctChange(parseFloat(engagement), yearEngagement) },
  ]

  const secondaryKpis = [
    { key: 'nuevos_seguidores', title: 'Nuevos Seguidores', value: safeNumber(data.nuevos_seguidores), icon: Users,     accent: cfg.accent },
    { key: 'publicaciones',     title: 'Publicaciones',     value: safeNumber(data.publicaciones),     icon: Megaphone, accent: '#a78bfa' },
    { key: 'impresiones',       title: 'Impresiones',       value: safeNumber(data.impresiones),       icon: Eye,       accent: '#22d3ee' },
  ].filter(k => k.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader icon={cfg.icon} title={cfg.label} subtitle="Métricas de desempeño" accentColor={cfg.accent} />
        <PlatformSubnav platform={platform} accent={cfg.accent} />
      </div>

      <PlatformInsightsCard
        items={mergeLegacyObservations(
          (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === platform),
          (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === platform)
        )}
        accent={cfg.accent}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKpis.map((k, i) => (
          <KPICard key={k.key} title={k.title} value={k.value} icon={k.icon}
            accentColor={k.accent} suffix={k.suffix} formatter={k.fmt} variation={k.variation} variationYear={k.variationYear} delay={i} />
        ))}
      </div>

      {secondaryKpis.length > 0 && (
        <div className={`grid gap-4 ${
          secondaryKpis.length === 1 ? 'grid-cols-1 sm:max-w-xs' :
          secondaryKpis.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {secondaryKpis.map((k, i) => (
            <KPICard key={k.key} title={k.title} value={k.value} icon={k.icon}
              accentColor={k.accent} delay={4 + i} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}30` }}>
            <LineChart className="w-4 h-4" style={{ color: cfg.accent }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">¿Quieres analizar el histórico?</p>
            <p className="text-xs text-white/45">Consulta fanpage y Paid Media por mes, con selección de KPIs.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/dashboard/${marcaId}/${platform}/historico`)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white border transition hover:scale-[1.01]"
          style={{ background: `${cfg.accent}18`, borderColor: `${cfg.accent}55` }}
        >Ver histórico →</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wrappers de ruta: pestañas "Paid Media" y "Top Post" (Facebook / Instagram)
// ═══════════════════════════════════════════════════════════════════════════════
export function SocialPaidMediaSection({
  platform, data, campanas = [], allCampanas = [], proyecciones = [],
  observaciones, loading, hallazgos = [],
}) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook
  const activeMonth = data?.mes || null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader icon={cfg.icon} title={cfg.label} subtitle="Paid Media" accentColor={cfg.accent} />
        <PlatformSubnav platform={platform} accent={cfg.accent} />
      </div>

      <PaidMediaSection
        platform={platform}
        month={activeMonth}
        campanas={campanas}
        allCampanas={allCampanas}
        proyecciones={proyecciones}
        accent={cfg.accent}
        hallazgos={hallazgos}
        observaciones={observaciones}
      />
    </div>
  )
}

export function SocialTopPostSection({ platform, topPosts = [], loading }) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader icon={cfg.icon} title={cfg.label} subtitle="Top Post" accentColor={cfg.accent} />
        <PlatformSubnav platform={platform} accent={cfg.accent} />
      </div>

      <TopPostsSection posts={topPosts} platform={platform} />
    </div>
  )
}
