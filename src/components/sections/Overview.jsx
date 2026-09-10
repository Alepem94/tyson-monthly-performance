import { Users, Eye, Heart, Megaphone, TrendingUp } from 'lucide-react'
import { KPICard, KPICardSkeleton } from '../ui/KPICard'
import { SectionHeader } from '../ui/SectionHeader'
import { ChartCard, DistributionDonut } from '../ui/Charts'
import { AccountHistoricalCarousel } from './Historical'
import { KeyFindingsStrip, mergeLegacyObservations } from '../ui/EditorialInsights'
import { SentimentGauge } from '../ui/SentimentGauge'
import { safeNumber, formatCurrency, prevMonth, pctChange } from '../../utils/format'

export function Overview({ data, historical, selectedMonth, loading, theme, features, hallazgos = [], observaciones = [], allCampanas = [], allGoogleAds = [] }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 rounded-2xl skeleton" />
          <div className="h-80 rounded-2xl skeleton" />
        </div>
      </div>
    )
  }

  const fb = data.facebook
  const ig = data.instagram
  const tt = data.tiktok
  const sentiment = data.sentiment
  const showGoogleAds = features?.googleAds !== false

  // Aggregate KPIs
  const totalSeguidores    = safeNumber(fb?.seguidores)    + safeNumber(ig?.seguidores)    + safeNumber(tt?.seguidores)
  const totalAlcance       = safeNumber(fb?.alcance)       + safeNumber(ig?.alcance)       + safeNumber(tt?.views)
  const totalInteracciones = safeNumber(fb?.interacciones) + safeNumber(ig?.interacciones) + safeNumber(tt?.interacciones)
  
  // Inversión comes from Campañas + Google Ads (not platform sheets)
  const campInversion = (data.campanas || []).reduce((s, r) => s + safeNumber(r.inversion), 0)
  const gadsInversion = showGoogleAds ? (data.googleAds || []).reduce((s, r) => s + safeNumber(r.inversion), 0) : 0
  const totalInversion = campInversion + gadsInversion

  // Previous month aggregation for variation badges
  const pm = prevMonth(selectedMonth)
  const py = selectedMonth ? `${Number(String(selectedMonth).slice(0, 4)) - 1}-${String(selectedMonth).slice(5, 7)}` : null
  const prevFb = (historical.facebook || []).find(r => r.mes === pm)
  const prevIg = (historical.instagram || []).find(r => r.mes === pm)
  const prevTt = (historical.tiktok || []).find(r => r.mes === pm)
  const prevSeguidores    = safeNumber(prevFb?.seguidores)    + safeNumber(prevIg?.seguidores)    + safeNumber(prevTt?.seguidores)
  const prevAlcance       = safeNumber(prevFb?.alcance)       + safeNumber(prevIg?.alcance)       + safeNumber(prevTt?.views)
  const prevInteracciones = safeNumber(prevFb?.interacciones) + safeNumber(prevIg?.interacciones) + safeNumber(prevTt?.interacciones)
  const prevInversion     = (allCampanas || []).filter(r => r.mes === pm).reduce((s, r) => s + safeNumber(r.inversion), 0) +
    (showGoogleAds ? (allGoogleAds || []).filter(r => r.mes === pm).reduce((s, r) => s + safeNumber(r.inversion), 0) : 0)

  const yearFb = (historical.facebook || []).find(r => r.mes === py)
  const yearIg = (historical.instagram || []).find(r => r.mes === py)
  const yearTt = (historical.tiktok || []).find(r => r.mes === py)
  const yearSeguidores = safeNumber(yearFb?.seguidores) + safeNumber(yearIg?.seguidores) + safeNumber(yearTt?.seguidores)
  const yearAlcance = safeNumber(yearFb?.alcance) + safeNumber(yearIg?.alcance) + safeNumber(yearTt?.views)
  const yearInteracciones = safeNumber(yearFb?.interacciones) + safeNumber(yearIg?.interacciones) + safeNumber(yearTt?.interacciones)
  const yearInversion = (allCampanas || []).filter(r => r.mes === py).reduce((s, r) => s + safeNumber(r.inversion), 0) +
    (showGoogleAds ? (allGoogleAds || []).filter(r => r.mes === py).reduce((s, r) => s + safeNumber(r.inversion), 0) : 0)

  // Investment distribution (from Campañas grouped by platform)
  const campByPlat = {}
  for (const c of (data.campanas || [])) {
    const p = String(c.plataforma || c._platform || '').toLowerCase()
    if (!campByPlat[p]) campByPlat[p] = 0
    campByPlat[p] += safeNumber(c.inversion)
  }
  const investmentData = [
    { name: 'Facebook',  value: campByPlat['facebook'] || 0, color: '#3b82f6' },
    { name: 'Instagram', value: campByPlat['instagram'] || 0, color: '#f97316' },
    { name: 'TikTok',    value: campByPlat['tiktok'] || 0, color: '#a855f7' },
    ...(showGoogleAds ? [{
      name: 'Google Ads',
      value: gadsInversion,
      color: '#f59e0b',
    }] : []),
  ].filter(d => d.value > 0)

  const totalInversionAll = investmentData.reduce((s, d) => s + d.value, 0)

  const editorialHallazgos = mergeLegacyObservations(
    (hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === 'overview'),
    (observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === 'overview')
  )


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeader
          icon={TrendingUp}
          title="Resumen Ejecutivo"
          subtitle="Vista general del desempeño del mes"
          accentColor={theme.primary}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Seguidores Totales" value={totalSeguidores}    icon={Users}     accentColor={theme.primary} variation={pctChange(totalSeguidores, prevSeguidores)} variationYear={pctChange(totalSeguidores, yearSeguidores)} delay={0} />
        <KPICard title="Alcance / Views"    value={totalAlcance}       icon={Eye}       accentColor="#22d3ee"       variation={pctChange(totalAlcance, prevAlcance)} variationYear={pctChange(totalAlcance, yearAlcance)} delay={1} />
        <KPICard title="Interacciones"      value={totalInteracciones} icon={Heart}     accentColor="#ec4899"       variation={pctChange(totalInteracciones, prevInteracciones)} variationYear={pctChange(totalInteracciones, yearInteracciones)} delay={2} />
        <KPICard title="Inversión Total"    value={totalInversion}     icon={Megaphone} accentColor="#f59e0b"       variation={pctChange(totalInversion, prevInversion)} variationYear={pctChange(totalInversion, yearInversion)} formatter={v => formatCurrency(v)} delay={3} />
      </div>

      {editorialHallazgos.length > 0 && (
        <KeyFindingsStrip items={editorialHallazgos} accent={theme.primary} max={3} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AccountHistoricalCarousel historical={historical} selectedMonth={selectedMonth} theme={theme} />
        </div>

        <ChartCard title="Distribución de Inversión" subtitle="Mix por canal" allowLogScale={false}>
          {({ expanded }) => (
            investmentData.length > 0 ? (
              <DistributionDonut
                data={investmentData}
                centerLabel="Total"
                centerValue={formatCurrency(totalInversionAll)}
                expanded={expanded}
              />
            ) : (
              <div className="h-40 flex items-center justify-center text-white/40 text-sm">
                Sin inversión registrada
              </div>
            )
          )}
        </ChartCard>
      </div>

      {sentiment && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Sentiment de Marca" subtitle="Percepción del público" className="lg:col-span-3" allowLogScale={false} expandable={false}>
            <SentimentGauge
              positivo={sentiment.positivo_pct}
              neutro={sentiment.neutro_pct}
              negativo={sentiment.negativo_pct}
            />
          </ChartCard>
        </div>
      )}
    </div>
  )
}
