import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Facebook, Instagram, Music2, Megaphone, Users, Eye, Heart,
  ChevronDown, ChevronRight, Zap, ArrowUpRight, DollarSign, TrendingUp, Flag,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { KPICard } from '../ui/KPICard'
import { safeNumber, formatNumber, formatCurrency, formatMonthLong, formatMonthShort, truncTo } from '../../utils/format'
import { buildTimeline, buildTimelineSummary } from '../../utils/timeline'

const PLATFORM_META = {
  facebook:  { icon: Facebook,  accent: '#3b82f6', label: 'Facebook' },
  instagram: { icon: Instagram, accent: '#f97316', label: 'Instagram' },
  tiktok:    { icon: Music2,    accent: '#a855f7', label: 'TikTok' },
}

// ── Mini-tarjeta de plataforma dentro del nodo ──────────────────────────────
function PlatformChip({ platform, row, onClick }) {
  const meta = PLATFORM_META[platform]
  if (!row || !meta) return null
  const Icon = meta.icon
  const alcance = safeNumber(row.alcance) || safeNumber(row.views)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition text-left flex-1 min-w-[150px]"
    >
      <span className="p-1.5 rounded-lg flex-shrink-0" style={{ background: `${meta.accent}22` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-white/85">{meta.label}</p>
        <p className="text-[11px] text-white/45 truncate">
          <Users className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />{formatNumber(row.seguidores)} ·{' '}
          <Eye className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />{formatNumber(alcance)}
        </p>
      </div>
    </button>
  )
}

function GoogleAdsChip({ rows, onClick }) {
  if (!rows || rows.length === 0) return null
  const inversion = rows.reduce((s, r) => s + safeNumber(r.inversion), 0)
  const clics = rows.reduce((s, r) => s + safeNumber(r.clics), 0)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition text-left flex-1 min-w-[150px]"
    >
      <span className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#f59e0b22' }}>
        <Megaphone className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-white/85">Google Ads</p>
        <p className="text-[11px] text-white/45 truncate">
          {formatCurrency(inversion)} · {formatNumber(clics)} clics
        </p>
      </div>
    </button>
  )
}

// ── Tarjeta de campaña atemporal ────────────────────────────────────────────
function CampaignCard({ campaign, accent }) {
  const [open, setOpen] = useState(false)
  const platformIcons = campaign.platforms
    .map(p => PLATFORM_META[p])
    .filter(Boolean)

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg flex-shrink-0" style={{ background: `${accent}25` }}>
            <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[12px] font-bold text-white truncate">{campaign.nombre}</p>
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${accent}30`, color: accent }}
              >
                {campaign.label}
              </span>
              {!campaign.isStartMonth && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 flex-shrink-0">
                  continúa
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-white/45 truncate">
              {campaign.dateLabel || 'Sin fechas registradas'}
              {platformIcons.length > 0 && ' · '}
              {platformIcons.map((m, i) => (
                <span key={i} className="inline-flex items-center align-middle ml-0.5">
                  <m.icon className="w-2.5 h-2.5" style={{ color: m.accent }} />
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold text-white">{formatCurrency(campaign.inversion)}</p>
            <p className="text-[9px] text-white/40">inversión</p>
          </div>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3 space-y-1.5 border-t border-white/10 pt-2.5">
          {campaign.objetivos.map((o, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-white/55 capitalize">
                {PLATFORM_META[o.platform]?.label || o.platform || '—'} · {o.objetivo}
              </span>
              <span className="text-white font-semibold">
                {formatNumber(o.resultado)} res. · {formatCurrency(o.inversion)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumen histórico — KPIs globales de la cuenta
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
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-bold text-white font-display">Resumen Histórico de la Cuenta</h2>
          {periodLabel && (
            <p className="text-xs text-white/45 mt-0.5">{periodLabel}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          subtitle={summary.campaignInvestment > 0 ? `${formatCurrency(summary.campaignInvestment)} en atemporales` : undefined}
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
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini gráfica de inversión mensual
// ─────────────────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs border border-white/10">
      <p className="text-white/60 mb-0.5">{formatMonthShort(label)}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function InvestmentTrendChart({ data, theme }) {
  if (!data || data.length < 2) return null

  const gradientId = 'invest-gradient'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">Inversión Mensual (AON + Google Ads)</h3>
          <p className="text-[11px] text-white/45 mt-0.5">Tendencia de inversión a lo largo del tiempo</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity={0.4} />
              <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="mes"
            tickFormatter={v => formatMonthShort(v)?.split(' ')[0]}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => formatNumber(v)}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="inversion"
            stroke={theme.primary}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Nodo del timeline — un periodo de actividad (mensual o campaña)
// ─────────────────────────────────────────────────────────────────────────────
function TimelineNode({ entry, theme, onNavigate, isFirst }) {
  const { mes, facebook, instagram, tiktok, googleAds, campaigns, hasMonthlyReport } = entry
  const nodeColor = hasMonthlyReport ? theme.primary : (theme.secondary || '#f59e0b')

  return (
    <div className="relative pl-10">
      {/* Línea vertical + punto */}
      <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col items-center">
        <div
          className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 z-10"
          style={{
            background: nodeColor,
            borderColor: nodeColor,
          }}
        />
        <div className="w-px flex-1 bg-white/12 mt-1" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className={`glass-card rounded-2xl p-4 space-y-3 ${isFirst ? '' : 'mb-5'}`}
      >
        {/* Header con mes + tipo */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4" style={{ color: nodeColor }} />
            <h3 className="text-base font-bold text-white font-display capitalize">{formatMonthLong(mes)}</h3>
            {/* Badge de tipo */}
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: hasMonthlyReport ? `${theme.primary}25` : `${nodeColor}25`,
                color: hasMonthlyReport ? theme.primary : nodeColor,
              }}
            >
              {hasMonthlyReport ? 'Mensual / AON' : 'Solo campañas'}
            </span>
          </div>
          {hasMonthlyReport && (
            <button
              onClick={() => onNavigate(mes)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              Ver reporte completo <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Contenido: reporte mensual o solo campañas */}
        {hasMonthlyReport ? (
          <div className="flex flex-wrap gap-2">
            <PlatformChip platform="facebook" row={facebook} onClick={() => onNavigate(mes, 'facebook')} />
            <PlatformChip platform="instagram" row={instagram} onClick={() => onNavigate(mes, 'instagram')} />
            <PlatformChip platform="tiktok" row={tiktok} onClick={() => onNavigate(mes, 'tiktok')} />
            <GoogleAdsChip rows={googleAds} onClick={() => onNavigate(mes, 'google-ads')} />
          </div>
        ) : (
          // Mes sin AON pero con campañas atemporales — mostrar campañas como contenido principal
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <p className="text-[11px] text-white/50 mb-0.5">
              Sin reporte mensual AON — {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} atemporal{campaigns.length !== 1 ? 'es' : ''} activa{campaigns.length !== 1 ? 's' : ''} en este periodo
            </p>
          </div>
        )}

        {/* Campañas atemporales (siempre que existan) */}
        {campaigns.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex items-center gap-1.5">
              <Zap className="w-3 h-3" style={{ color: theme.secondary || '#f59e0b' }} />
              {hasMonthlyReport
                ? `${campaigns.length} campaña${campaigns.length !== 1 ? 's' : ''} atemporal${campaigns.length !== 1 ? 'es' : ''} activa${campaigns.length !== 1 ? 's' : ''}`
                : 'Detalle de campañas'
              }
            </p>
            <div className="space-y-2">
              {campaigns.map(c => <CampaignCard key={c.key + mes} campaign={c} accent={theme.secondary || theme.primary} />)}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Timeline principal — línea de tiempo continua de actividad de la cuenta
// ═══════════════════════════════════════════════════════════════════════════════
export function Timeline({ data, theme, loading, onNavigateMonth }) {
  const [order, setOrder] = useState('desc')

  const entries = useMemo(() => {
    const built = buildTimeline({
      facebook: data?.facebook || [],
      instagram: data?.instagram || [],
      tiktok: data?.tiktok || [],
      googleAds: data?.googleAds || [],
      sentiment: data?.sentiment || [],
      campanas: data?.campanas || [],
    })
    return order === 'desc' ? built : [...built].reverse()
  }, [data, order])

  const summary = useMemo(() => buildTimelineSummary({
    facebook: data?.facebook || [],
    instagram: data?.instagram || [],
    tiktok: data?.tiktok || [],
    googleAds: data?.googleAds || [],
    campanas: data?.campanas || [],
  }), [data])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl skeleton" />
        <div className="h-48 rounded-2xl skeleton" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl skeleton" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Calendar}
        title="Cronología"
        subtitle="Línea de tiempo continua: reportes mensuales AON y campañas atemporales"
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

      {entries.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin datos todavía"
          message="En cuanto haya filas con mes (o fecha_inicio/fecha_fin) en el Sheet, aparecerán aquí en orden cronológico — tanto campañas mensuales como atemporales."
        />
      ) : (
        <>
          {/* Resumen histórico */}
          <TimelineSummary summary={summary} theme={theme} />

          {/* Gráfica de inversión */}
          <InvestmentTrendChart data={summary.investSeries} theme={theme} />

          {/* Línea de tiempo continua */}
          <div>
            {entries.map((entry, i) => (
              <TimelineNode
                key={entry.mes}
                entry={entry}
                theme={theme}
                isFirst={i === entries.length - 1}
                onNavigate={onNavigateMonth}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
