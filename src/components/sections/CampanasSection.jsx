import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Flag, Target, DollarSign, TrendingUp, Facebook, Instagram, Music2, Megaphone, ChevronDown, ChevronRight } from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { KPICard } from '../ui/KPICard'
import { safeNumber, formatNumber, formatCurrency, formatDecimal, truncTo } from '../../utils/format'
import { tipoCampanaToBucket } from '../../utils/campaigns'
import { buildSpecificCampaigns } from '../../utils/timeline'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const normalizeName = (s) =>
  String(s || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const isCPM = (metrica) => {
  const k = normalizeName(metrica)
  return k.includes('alcance') || k.includes('reach')
}

function getComplianceColor(pct) {
  if (pct === null || pct === undefined) return 'rgba(255,255,255,0.4)'
  if (pct >= 100) return '#22c55e'
  if (pct >= 80) return '#facc15'
  return '#ef4444'
}

const PLATFORM_META = {
  facebook:  { icon: Facebook,  accent: '#3b82f6', label: 'FB' },
  instagram: { icon: Instagram, accent: '#f97316', label: 'IG' },
  tiktok:    { icon: Music2,    accent: '#a855f7', label: 'TT' },
  google:    { icon: Megaphone, accent: '#f59e0b', label: 'GAds' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Build campaign results — matching por bucket (tipo_campana), no por nombre
// ─────────────────────────────────────────────────────────────────────────────
function buildCampaignResults(proyeccionesCampana = [], allCampanas = []) {
  const specificCampaigns = buildSpecificCampaigns(allCampanas)

  // Build projection lookup by bucket (tipo_campana → bucket)
  const projByBucket = new Map()
  for (const proj of proyeccionesCampana) {
    const tipoCampana = proj.tipo_campana || proj.nombre_campana || ''
    const bucket = tipoCampanaToBucket(tipoCampana)
    if (!bucket) continue
    if (!projByBucket.has(bucket)) {
      projByBucket.set(bucket, {
        name: tipoCampana,
        tipo: tipoCampana,
        fechaInicio: proj.fecha_inicio || null,
        fechaFin: proj.fecha_fin || null,
        projections: [],
      })
    }
    projByBucket.get(bucket).projections.push(proj)
  }

  const matchedBuckets = new Set()

  // Enrich specific campaigns with matching projections (by bucket)
  const results = specificCampaigns.map(camp => {
    const proj = projByBucket.get(camp.bucket)
    if (proj) matchedBuckets.add(camp.bucket)

    const objectives = camp.objetivos.map(obj => {
      const objKey = normalizeName(obj.objetivo)
      const matchingProj = (proj?.projections || []).find(p => {
        const pObjKey = normalizeName(p.objetivo || p.metrica || '')
        return pObjKey === objKey || pObjKey.includes(objKey) || objKey.includes(pObjKey)
      })

      const meta = safeNumber(matchingProj?.proyeccion)
      const presupuesto = safeNumber(matchingProj?.presupuesto)
      const resultado = safeNumber(obj.resultado)
      const inversion = safeNumber(obj.inversion)
      const cumplimiento = meta > 0 ? (resultado / meta) * 100 : null
      const cpr = resultado > 0
        ? (isCPM(obj.objetivo) ? (inversion / resultado) * 1000 : inversion / resultado)
        : null

      return {
        objetivo: obj.objetivo,
        plataforma: obj.platform || '—',
        presupuesto, meta, resultado, inversion, cumplimiento, cpr,
        detalles: obj.detalles || [],
      }
    })

    // Add projection-only objectives (no matching campaign results yet)
    for (const p of (proj?.projections || [])) {
      const pObjKey = normalizeName(p.objetivo || p.metrica || '')
      const hasMatch = objectives.some(o => normalizeName(o.objetivo) === pObjKey)
      if (!hasMatch) {
        objectives.push({
          objetivo: p.objetivo || p.metrica || '—',
          plataforma: p.plataforma || '—',
          presupuesto: safeNumber(p.presupuesto),
          meta: safeNumber(p.proyeccion),
          resultado: 0, inversion: 0, cumplimiento: null, cpr: null,
          detalles: [],
        })
      }
    }

    const totalMeta = objectives.reduce((s, o) => s + o.meta, 0)
    const totalResultado = objectives.reduce((s, o) => s + o.resultado, 0)
    const totalPresupuesto = objectives.reduce((s, o) => s + o.presupuesto, 0)
    const totalInversion = objectives.reduce((s, o) => s + o.inversion, 0)
    const overallCumplimiento = totalMeta > 0 ? (totalResultado / totalMeta) * 100 : null

    return {
      name: camp.label,
      bucket: camp.bucket,
      tipo: camp.label,
      fechaInicio: camp.fechaInicio || proj?.fechaInicio || null,
      fechaFin: camp.fechaFin || proj?.fechaFin || null,
      dateLabel: camp.dateLabel,
      platforms: camp.platforms,
      nombres: camp.nombres,
      objectives,
      totalMeta, totalResultado, totalPresupuesto, totalInversion,
      overallCumplimiento,
    }
  })

  // Add projection-only campaigns (planned but no results yet)
  for (const [bucket, proj] of projByBucket) {
    if (matchedBuckets.has(bucket)) continue
    const objectives = proj.projections.map(p => ({
      objetivo: p.objetivo || p.metrica || '—',
      plataforma: p.plataforma || '—',
      presupuesto: safeNumber(p.presupuesto),
      meta: safeNumber(p.proyeccion),
      resultado: 0, inversion: 0, cumplimiento: null, cpr: null,
      detalles: [],
    }))
    const totalMeta = objectives.reduce((s, o) => s + o.meta, 0)
    const totalPresupuesto = objectives.reduce((s, o) => s + o.presupuesto, 0)
    results.push({
      name: proj.name,
      bucket,
      tipo: proj.name,
      fechaInicio: proj.fechaInicio,
      fechaFin: proj.fechaFin,
      dateLabel: null,
      platforms: [...new Set(proj.projections.map(p => p.plataforma).filter(Boolean))],
      nombres: [],
      objectives,
      totalMeta, totalResultado: 0, totalPresupuesto, totalInversion: 0,
      overallCumplimiento: null,
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// CampaignCard — una tarjeta por tipo de campaña, con desglose expandible
// ─────────────────────────────────────────────────────────────────────────────
function ObjectiveRow({ obj, theme }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetalles = obj.detalles && obj.detalles.length > 0
  const objColor = getComplianceColor(obj.cumplimiento)

  return (
    <>
      <tr className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
        <td className="px-4 py-2.5 text-white/85 font-semibold capitalize">
          {hasDetalles && (
            <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center mr-1.5 text-white/40 hover:text-white">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
          {obj.objetivo}
        </td>
        <td className="px-4 py-2.5 text-white/55 text-xs capitalize">{obj.plataforma}</td>
        <td className="px-4 py-2.5 text-right text-white/85 font-mono">
          {obj.presupuesto > 0 ? formatCurrency(obj.presupuesto) : <span className="text-white/30">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right text-white/85 font-mono">
          {obj.meta > 0 ? formatNumber(obj.meta) : <span className="text-white/30">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right text-white font-mono font-bold">
          {obj.resultado > 0 ? formatNumber(obj.resultado) : <span className="text-white/30">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right font-mono">
          {obj.cumplimiento !== null ? (
            <span style={{ color: objColor }} className="font-bold">{truncTo(obj.cumplimiento, 0)}%</span>
          ) : <span className="text-white/30">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right text-white/85 font-mono">
          {obj.inversion > 0 ? formatCurrency(obj.inversion) : <span className="text-white/30">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right text-amber-200 font-mono">
          {obj.cpr !== null ? `$${formatDecimal(obj.cpr, 2)}` : <span className="text-white/30">—</span>}
        </td>
      </tr>
      {expanded && hasDetalles && (
        <tr className="bg-white/[0.02]">
          <td colSpan={8} className="px-4 py-2">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold mb-1">Desglose por campaña</p>
              {obj.detalles.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] text-white/55">
                  <span className="truncate flex-1 mr-3" title={d.nombre}>{d.nombre}</span>
                  <span className="text-white/70 font-mono">{formatNumber(d.resultado)} res.</span>
                  <span className="text-white/50 font-mono ml-3">{formatCurrency(d.inversion)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CampaignCard({ campaign, theme, index }) {
  const color = getComplianceColor(campaign.overallCumplimiento)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="glass-card rounded-2xl overflow-hidden"
      style={{ borderColor: `${theme.primary}33` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10"
        style={{ background: `${theme.primary}0d` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: `${theme.primary}20` }}>
            <Flag className="w-4 h-4" style={{ color: theme.primary }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white truncate">{campaign.name}</h3>
              {campaign.nombres.length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0 bg-white/10 text-white/50">
                  {campaign.nombres.length} campañas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {campaign.dateLabel && (
                <p className="text-[11px] text-white/45">{campaign.dateLabel}</p>
              )}
              {campaign.dateLabel && campaign.nombres.length > 0 && <span className="text-white/20">·</span>}
              {campaign.nombres.length > 0 && (
                <p className="text-[10px] text-white/35 truncate max-w-[280px]">
                  {campaign.nombres.slice(0, 2).join(', ')}{campaign.nombres.length > 2 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Platform icons */}
          <div className="flex items-center gap-1.5">
            {campaign.platforms.map(p => {
              const meta = PLATFORM_META[p]
              if (!meta) return null
              const PIcon = meta.icon
              return (
                <span key={p} className="p-1 rounded-md" style={{ background: `${meta.accent}18` }}>
                  <PIcon className="w-3 h-3" style={{ color: meta.accent }} />
                </span>
              )
            })}
          </div>

          {/* Compliance circle */}
          {campaign.overallCumplimiento !== null ? (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
              style={{ borderColor: color, background: `${color}18` }}
            >
              <span className="text-xs font-bold" style={{ color }}>
                {truncTo(campaign.overallCumplimiento, 0)}%
              </span>
            </div>
          ) : (
            <span className="text-[10px] px-2 py-1 rounded-full text-white/40 border border-white/10 flex-shrink-0">
              Solo meta
            </span>
          )}
        </div>
      </div>

      {/* Objectives table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-left">Objetivo</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-left">Plataforma</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-right">Presupuesto</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-right">Meta</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-right">Resultado</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-right">Cumpl.</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-right">Inversión</th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 text-right">CPR</th>
            </tr>
          </thead>
          <tbody>
            {campaign.objectives.map((obj, i) => (
              <ObjectiveRow key={i} obj={obj} theme={theme} />
            ))}
          </tbody>
          {campaign.objectives.length > 1 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.03]">
                <td className="px-4 py-2.5 text-[11px] font-bold uppercase text-white/60" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right text-white font-mono font-bold text-xs">
                  {campaign.totalPresupuesto > 0 ? formatCurrency(campaign.totalPresupuesto) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-white font-mono font-bold text-xs">
                  {campaign.totalMeta > 0 ? formatNumber(campaign.totalMeta) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-white font-mono font-bold text-xs">
                  {campaign.totalResultado > 0 ? formatNumber(campaign.totalResultado) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-xs" style={{ color }}>
                  {campaign.overallCumplimiento !== null ? `${truncTo(campaign.overallCumplimiento, 0)}%` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-white font-mono font-bold text-xs">
                  {campaign.totalInversion > 0 ? formatCurrency(campaign.totalInversion) : '—'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function CampanasSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <div className="h-4 w-40 rounded skeleton" />
          </div>
          <div className="p-5">
            <div className="h-32 rounded-xl skeleton" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export function CampanasSection({
  proyeccionesCampana = [],
  allCampanas = [],
  loading,
  theme,
}) {
  const campaigns = useMemo(
    () => buildCampaignResults(proyeccionesCampana, allCampanas),
    [proyeccionesCampana, allCampanas]
  )

  const totalPresupuesto = campaigns.reduce((s, c) => s + c.totalPresupuesto, 0)
  const totalInversion = campaigns.reduce((s, c) => s + c.totalInversion, 0)
  const totalMeta = campaigns.reduce((s, c) => s + c.totalMeta, 0)
  const totalResultado = campaigns.reduce((s, c) => s + c.totalResultado, 0)
  const avgCumplimiento = totalMeta > 0 ? (totalResultado / totalMeta) * 100 : null

  if (loading) return <CampanasSkeleton />

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Flag}
        title="Campañas Atemporales"
        subtitle="Resultados de campañas que trascienden el mes calendario"
        accentColor={theme.primary}
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Sin campañas atemporales"
          message="Las campañas con tipo_campana distinto a 'AON' (Mensual) aparecerán aquí con sus presupuestos, metas y resultados."
        />
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Tipos de Campaña"
              value={campaigns.length}
              icon={Flag}
              accentColor={theme.primary}
              delay={0}
            />
            <KPICard
              title="Presupuesto Total"
              value={totalPresupuesto}
              icon={DollarSign}
              accentColor="#f59e0b"
              formatter={v => formatCurrency(v)}
              delay={1}
            />
            <KPICard
              title="Inversión Total"
              value={totalInversion}
              icon={TrendingUp}
              accentColor="#22d3ee"
              formatter={v => formatCurrency(v)}
              delay={2}
            />
            <KPICard
              title="Cumplimiento Global"
              value={avgCumplimiento !== null ? Math.round(avgCumplimiento) : 0}
              icon={Target}
              accentColor={getComplianceColor(avgCumplimiento)}
              suffix="%"
              delay={3}
            />
          </div>

          {/* Campaign cards */}
          <div className="space-y-4">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.bucket + i} campaign={c} theme={theme} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
