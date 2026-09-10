import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Facebook, Instagram, Music2, Megaphone, Users, Eye, Heart,
  ChevronDown, ChevronRight, Zap, ArrowUpRight,
} from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { safeNumber, formatNumber, formatCurrency, formatMonthLong } from '../../utils/format'
import { buildTimeline } from '../../utils/timeline'

const PLATFORM_META = {
  facebook:  { icon: Facebook,  accent: '#3b82f6', label: 'Facebook' },
  instagram: { icon: Instagram, accent: '#f97316', label: 'Instagram' },
  tiktok:    { icon: Music2,    accent: '#a855f7', label: 'TikTok' },
}

// ── Mini-tarjeta de plataforma dentro del nodo del mes ──────────────────────
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

// ── Tarjeta de campaña de periodo específico ────────────────────────────────
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

// ── Nodo de un mes en el timeline ────────────────────────────────────────────
function MonthNode({ entry, theme, onNavigate, isFirst }) {
  const { mes, facebook, instagram, tiktok, googleAds, campaigns, hasMonthlyReport } = entry

  return (
    <div className="relative pl-10">
      {/* Línea vertical + punto */}
      <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col items-center">
        <div
          className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 z-10"
          style={{
            background: hasMonthlyReport ? theme.primary : 'transparent',
            borderColor: theme.primary,
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: theme.primary }} />
            <h3 className="text-base font-bold text-white font-display capitalize">{formatMonthLong(mes)}</h3>
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

        {hasMonthlyReport ? (
          <div className="flex flex-wrap gap-2">
            <PlatformChip platform="facebook" row={facebook} onClick={() => onNavigate(mes, 'facebook')} />
            <PlatformChip platform="instagram" row={instagram} onClick={() => onNavigate(mes, 'instagram')} />
            <PlatformChip platform="tiktok" row={tiktok} onClick={() => onNavigate(mes, 'tiktok')} />
            <GoogleAdsChip rows={googleAds} onClick={() => onNavigate(mes, 'google-ads')} />
          </div>
        ) : (
          <p className="text-[11px] text-white/35">Sin reporte mensual para este periodo — solo campañas de periodo específico.</p>
        )}

        {campaigns.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
              {campaigns.length === 1 ? 'Campaña activa en este periodo' : `${campaigns.length} campañas activas en este periodo`}
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
// Timeline principal — reemplaza el selector de "un mes a la vez" como forma
// de navegar el histórico: aquí SIEMPRE se ven todos los meses y todas las
// campañas de periodo específico que coincidieron con cada uno.
// ═══════════════════════════════════════════════════════════════════════════════
export function Timeline({ data, theme, loading, onNavigateMonth }) {
  const [order, setOrder] = useState('desc') // 'desc' = más reciente primero

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

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl skeleton" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Calendar}
        title="Cronología"
        subtitle="Reportes mensuales y campañas de periodo específico, en orden cronológico"
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
          message="En cuanto haya filas con mes (o fecha_inicio/fecha_fin) en el Sheet, aparecerán aquí en orden cronológico."
        />
      ) : (
        <div>
          {entries.map((entry, i) => (
            <MonthNode
              key={entry.mes}
              entry={entry}
              theme={theme}
              isFirst={i === entries.length - 1}
              onNavigate={onNavigateMonth}
            />
          ))}
        </div>
      )}
    </div>
  )
}
