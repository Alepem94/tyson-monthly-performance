import { Music2, Users, Eye, Heart, TrendingUp, Megaphone, Play, LineChart } from 'lucide-react'
import { KPICard, KPICardSkeleton } from '../ui/KPICard'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'

import { PlatformInsightsCard, mergeLegacyObservations } from '../ui/EditorialInsights'
import { TopPostsSection } from '../ui/PostCard'
import { safeNumber, prevMonth, pctChange } from '../../utils/format'
import { PaidMediaSection } from './SocialSection'
import { PlatformSubnav } from '../ui/PlatformSubnav'
import { useNavigate, useParams } from 'react-router-dom'

const ACCENT = '#a855f7'

export function TikTokSection({
  data, campanas = [], allCampanas = [], proyecciones = [], topPosts = [],
  observaciones, historical = [], loading, hallazgos = [],
}) {
  const activeMonth = data?.mes || null
  const navigate = useNavigate()
  const { marcaId } = useParams()

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
        <SectionHeader icon={Music2} title="TikTok" subtitle="Sin datos para este mes" accentColor={ACCENT} />
        <EmptyState icon={Music2} title="Sin datos disponibles"
          message="No hay información registrada para TikTok en el mes seleccionado." />
      </div>
    )
  }

  const engagement = (Math.floor(safeNumber(data.engagement_rate) * 10000) / 100).toFixed(2)

  const pm = prevMonth(data?.mes)
  const prevData = (historical || []).find(r => r.mes === pm)
  const prevEngagement = prevData ? (Math.floor(safeNumber(prevData.engagement_rate) * 10000) / 100) : null
  const yearMonth = activeMonth ? `${Number(String(activeMonth).slice(0, 4)) - 1}-${String(activeMonth).slice(5, 7)}` : null
  const yearData = (historical || []).find(r => r.mes === yearMonth)
  const yearEngagement = yearData ? (Math.floor(safeNumber(yearData.engagement_rate) * 10000) / 100) : null



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader icon={Music2} title="TikTok" subtitle="Métricas de video corto" accentColor={ACCENT} />
        <PlatformSubnav platform="tiktok" accent={ACCENT} />
      </div>

      <PlatformInsightsCard
        items={mergeLegacyObservations(
          (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === 'tiktok'),
          (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === 'tiktok')
        )}
        accent={ACCENT}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Seguidores"       value={safeNumber(data.seguidores)}        icon={Users}      accentColor={ACCENT}     variation={pctChange(data.seguidores, prevData?.seguidores)} variationYear={pctChange(data.seguidores, yearData?.seguidores)} delay={0} />
        <KPICard title="Views"            value={safeNumber(data.views)}             icon={Play}       accentColor="#f97316"    variation={pctChange(data.views, prevData?.views)} variationYear={pctChange(data.views, yearData?.views)} delay={1} />
        <KPICard title="Views 6s+"        value={safeNumber(data.views_6s)}          icon={Eye}        accentColor="#a78bfa"    variation={pctChange(data.views_6s, prevData?.views_6s)} variationYear={pctChange(data.views_6s, yearData?.views_6s)} delay={2} />
        <KPICard title="Interacciones"    value={safeNumber(data.interacciones)}     icon={Heart}      accentColor="#f43f5e"    variation={pctChange(data.interacciones, prevData?.interacciones)} variationYear={pctChange(data.interacciones, yearData?.interacciones)} delay={3} />
      </div>

      {[
        safeNumber(data.engagement_rate) > 0,
        safeNumber(data.nuevos_seguidores) > 0,
        safeNumber(data.publicaciones) > 0,
      ].some(Boolean) && (
        <div className="grid grid-cols-3 gap-4">
          {safeNumber(data.engagement_rate) > 0 && (
            <KPICard title="Engagement" value={engagement} suffix="%" icon={TrendingUp}
              accentColor="#22c55e" formatter={v => v} variation={pctChange(parseFloat(engagement), prevEngagement)} variationYear={pctChange(parseFloat(engagement), yearEngagement)} delay={4} />
          )}
          {safeNumber(data.nuevos_seguidores) > 0 && (
            <KPICard title="Nuevos Seguidores" value={safeNumber(data.nuevos_seguidores)}
              icon={Users} accentColor={ACCENT} variation={pctChange(data.nuevos_seguidores, prevData?.nuevos_seguidores)} variationYear={pctChange(data.nuevos_seguidores, yearData?.nuevos_seguidores)} delay={5} />
          )}
          {safeNumber(data.publicaciones) > 0 && (
            <KPICard title="Publicaciones" value={safeNumber(data.publicaciones)}
              icon={Megaphone} accentColor="#a78bfa" variation={pctChange(data.publicaciones, prevData?.publicaciones)} delay={6} />
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
            <LineChart className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">¿Quieres analizar el histórico?</p>
            <p className="text-xs text-white/45 mt-0.5">Fanpage y Paid Media, con selección de KPIs y lectura automática.</p>
          </div>
        </div>
        <button onClick={() => navigate(`/dashboard/${marcaId}/tiktok/historico`)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white border" style={{ background: `${ACCENT}18`, borderColor: `${ACCENT}55` }}>Ver histórico →</button>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wrappers de ruta: pestañas "Paid Media" y "Top Post" (TikTok)
// ═══════════════════════════════════════════════════════════════════════════════
export function TikTokPaidMediaSection({
  data, campanas = [], allCampanas = [], proyecciones = [],
  observaciones, loading, hallazgos = [],
}) {
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
        <SectionHeader icon={Music2} title="TikTok" subtitle="Paid Media" accentColor={ACCENT} />
        <PlatformSubnav platform="tiktok" accent={ACCENT} />
      </div>

      <PaidMediaSection
        platform="tiktok"
        month={activeMonth}
        campanas={campanas}
        allCampanas={allCampanas}
        proyecciones={proyecciones}
        accent={ACCENT}
        hallazgos={hallazgos}
        observaciones={observaciones}
      />
    </div>
  )
}

export function TikTokTopPostSection({ topPosts = [], loading }) {
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
        <SectionHeader icon={Music2} title="TikTok" subtitle="Top Post" accentColor={ACCENT} />
        <PlatformSubnav platform="tiktok" accent={ACCENT} />
      </div>

      <TopPostsSection posts={topPosts} platform="tiktok" />
    </div>
  )
}
