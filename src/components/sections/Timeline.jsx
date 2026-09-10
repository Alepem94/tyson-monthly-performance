import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Facebook, Instagram, Music2, Megaphone, Users, Eye,
  ArrowUpRight, DollarSign, TrendingUp, Flag,
} from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { KPICard } from '../ui/KPICard'
import { safeNumber, formatNumber, formatCurrency, formatMonthLong, formatMonthShort, truncTo } from '../../utils/format'
import { buildTimeline, buildTimelineSummary, buildSpecificCampaigns } from '../../utils/timeline'

const PLATFORM_META = {
  facebook:  { icon: Facebook,  accent: '#3b82f6', label: 'FB' },
  instagram: { icon: Instagram, accent: '#f97316', label: 'IG' },
  tiktok:    { icon: Music2,    accent: '#a855f7', label: 'TT' },
  google:    { icon: Megaphone, accent: '#f59e0b', label: 'GAds' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact summary — 4 KPIs in one row, no chart
// ─────────────────────────────────────────────────────────────────────────────
function TimelineSummary({ summary, theme }) {
  const periodLabel = summary.firstMonth && summary.lastMonth
    ? `${formatMonthShort(summary.firstMonth)} – ${formatMonthShort(summary.lastMonth)}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <KPICard
        title="Meses con Actividad"
        value={summary.totalMonths}
        icon={Calendar}
        accentColor={theme.primary}
        delay={0}
      />
      <KPICard
        title="Campañas Atemporales"
        value={summary.totalCampaigns}
        icon={Flag}
        accentColor="#f59e0b"
        delay={1}
      />
      <KPICard
        title="Inversión Total"
        value={summary.totalInvestment}
        icon={DollarSign}
        accentColor="#22d3ee"
        formatter={v => formatCurrency(v)}
        subtitle={periodLabel || undefined}
        delay={2}
      />
      <KPICard
        title="Crecimiento de Seguidores"
        value={summary.followerGrowth}
        icon={TrendingUp}
        accentColor="#22c55e"
        formatter={v => (v >= 0 ? '+' : '') + formatNumber(v)}
        subtitle={summary.followerGrowthPct !== null ? `${truncTo(summary.followerGrowthPct, 1)}% vs inicio` : undefined}
        delay={3}
      />
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Month card — clickable entry to the monthly report
// ─────────────────────────────────────────────────────────────────────────────
function MonthCard({ entry, theme, onClick, index }) {
  const { mes, facebook, instagram, tiktok, googleAds, campaigns, hasMonthlyReport } = entry

  const monthlyInvest =
    safeNumber(facebook?.inversion) +
    safeNumber(instagram?.inversion) +
    safeNumber(tiktok?.inversion) +
    (googleAds || []).reduce((s, r) => s + safeNumber(r.inversion), 0)

  const totalReach =
    safeNumber(facebook?.alcance) +
    safeNumber(instagram?.alcance) +
    safeNumber(tiktok?.views)

  const platforms = []
  if (facebook) platforms.push('facebook')
  if (instagram) platforms.push('instagram')
  if (tiktok) platforms.push('tiktok')
  if (googleAds?.length > 0) platforms.push('google')

  const nodeColor = hasMonthlyReport ? theme.primary : (theme.secondary || '#f59e0b')

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={onClick}
      className="glass-card rounded-2xl p-4 text-left hover:bg-white/[0.05] transition-all group relative overflow-hidden"
      style={{ borderColor: `${nodeColor}22` }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: nodeColor }} />

      <div className="flex items-center justify-between mb-2 pl-1">
        <h4 className="text-sm font-bold text-white capitalize font-display">{formatMonthLong(mes)}</h4>
        <span
          className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${nodeColor}25`, color: nodeColor }}
        >
          {hasMonthlyReport ? 'Mensual' : 'Solo campañas'}
        </span>
      </div>

      <div className="pl-1 space-y-1">
        <p className="text-lg font-bold text-white font-display">
          {monthlyInvest > 0 ? formatCurrency(monthlyInvest) : '—'}
        </p>
        <p className="text-[11px] text-white/40">inversión del mes</p>
      </div>

      {totalReach > 0 && (
        <p className="pl-1 text-[11px] text-white/50 mt-1">
          <Eye className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />{formatNumber(totalReach)} alcance total
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pl-1">
        <div className="flex items-center gap-1.5">
          {platforms.map(p => {
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
        {campaigns.length > 0 && (
          <span className="text-[10px] text-white/40">{campaigns.length} campañas activas</span>
        )}
      </div>

      <div className="mt-3 pl-1 flex items-center gap-1 text-[11px] font-semibold text-white/50 group-hover:text-white transition-colors">
        Ver reporte completo
        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign card — clickable entry to the campaign report
// ─────────────────────────────────────────────────────────────────────────────
function CampaignEntryCard({ campaign, theme, onClick, index }) {
  const accent = theme.secondary || theme.primary || '#f59e0b'
  const platformIcons = campaign.platforms.map(p => PLATFORM_META[p]).filter(Boolean)

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={onClick}
      className="glass-card rounded-2xl p-4 text-left hover:bg-white/[0.05] transition-all group relative overflow-hidden"
      style={{ borderColor: `${accent}22` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />

      <div className="flex items-center justify-between mb-2 pl-1">
        <div className="flex items-center gap-2 min-w-0">
          <Flag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
          <h4 className="text-sm font-bold text-white truncate font-display">{campaign.label}</h4>
        </div>
        {campaign.nombres.length > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 bg-white/10 text-white/50">
            {campaign.nombres.length} campañas
          </span>
        )}
      </div>

      <div className="pl-1 space-y-1">
        <p className="text-lg font-bold text-white font-display">
          {campaign.inversion > 0 ? formatCurrency(campaign.inversion) : 'Solo meta'}
        </p>
        <p className="text-[11px] text-white/40">
          {campaign.inversion > 0 ? 'inversión total' : 'sin resultados aún'}
        </p>
      </div>

      {campaign.resultado > 0 && (
        <p className="pl-1 text-[11px] text-white/50 mt-1">
          <TrendingUp className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />{formatNumber(campaign.resultado)} resultados
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pl-1">
        <div className="flex items-center gap-1.5">
          {platformIcons.map((m, i) => {
            const PIcon = m.icon
            return (
              <span key={i} className="p-1 rounded-md" style={{ background: `${m.accent}18` }}>
                <PIcon className="w-3 h-3" style={{ color: m.accent }} />
              </span>
            )
          })}
        </div>
        {campaign.dateLabel && (
          <span className="text-[10px] text-white/40">{campaign.dateLabel}</span>
        )}
      </div>

      <div className="mt-3 pl-1 flex items-center gap-1 text-[11px] font-semibold text-white/50 group-hover:text-white transition-colors">
        Ver detalle de campaña
        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Timeline — now a clean INDEX page, not an infinite scroll
// ═══════════════════════════════════════════════════════════════════════════════
export function Timeline({ data, theme, loading, onNavigateMonth, onNavigateCampaign }) {
  const [order, setOrder] = useState('desc')

  const entries = useMemo(() => {
    const built = buildTimeline(data)
    return order === 'desc' ? built : [...built].reverse()
  }, [data, order])

  const summary = useMemo(() => buildTimelineSummary(data), [data])

  const campaigns = useMemo(() => {
    const built = buildSpecificCampaigns(data?.campanas || [])
    return [...built].sort((a, b) => (b.startMonth || '').localeCompare(a.startMonth || ''))
  }, [data])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-2xl skeleton" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Calendar}
        title="Cronología"
        subtitle="Selecciona un mes o campaña para ver el reporte completo"
        accentColor={theme.primary}
        actions={
          <button
            onClick={() => setOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            {order === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
          </button>
        }
      />

      {entries.length === 0 && campaigns.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin datos todavía"
          message="En cuanto haya filas con mes (o fecha_inicio/fecha_fin) en el Sheet, aparecerán aquí como tarjetas para entrar al reporte."
        />
      ) : (
        <>
          {/* Compact summary */}
          <TimelineSummary summary={summary} theme={theme} />

          {/* Monthly reports */}
          {entries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: theme.primary }} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Reportes Mensuales</h3>
                <span className="text-xs text-white/35">({entries.length})</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {entries.map((entry, i) => (
                  <MonthCard
                    key={entry.mes}
                    entry={entry}
                    theme={theme}
                    index={i}
                    onClick={() => onNavigateMonth(entry.mes)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Campaign entries */}
          {campaigns.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4" style={{ color: theme.secondary || theme.primary }} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Campañas Atemporales</h3>
                <span className="text-xs text-white/35">({campaigns.length})</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((campaign, i) => (
                  <CampaignEntryCard
                    key={campaign.key}
                    campaign={campaign}
                    theme={theme}
                    index={i}
                    onClick={onNavigateCampaign}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
