import { useMemo, useState } from 'react'
import { BarChart3, Facebook, FileText, Heart, Instagram, TrendingUp, Trophy, Users, Music2 } from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'
import { DataTable } from '../ui/DataTable'
import { PlatformSubnav } from '../ui/PlatformSubnav'
import {
  COMPETITION_METRICS,
  calculateBenchmarkVariation,
  calculateQuarterBenchmark,
  calculateRanking,
  calculateVsBrand,
  formatBenchmarkValue,
  formatCompetitionPercent,
  formatRankingValue,
  getBrandAliases,
  normalizePlatformKey,
} from '../../utils/competitionAnalytics'

const PLATFORM_CONFIG = {
  facebook: { label: 'Facebook', icon: Facebook, accent: '#3b82f6' },
  instagram: { label: 'Instagram', icon: Instagram, accent: '#ec4899' },
  tiktok: { label: 'TikTok', icon: Music2, accent: '#22d3ee' },
}

const BENCHMARK_METRICS = [
  { key: 'crecimiento_pct', label: 'Crecimiento de comunidad', icon: TrendingUp, type: 'percent' },
  { key: 'posts', label: 'Posts publicados', icon: FileText, type: 'number' },
  { key: 'interaccion', label: 'Interacción total', icon: Heart, type: 'number' },
  { key: 'engagement_pct', label: 'Engagement Rate', icon: BarChart3, type: 'percent' },
]

function formatMonthRange(months = []) {
  if (months.length !== 3) return ''
  const labels = months.map(m => {
    const [year, month] = m.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString('es-MX', { month: 'long' })
  })
  return `${labels[0].charAt(0).toUpperCase() + labels[0].slice(1)} — ${labels[2]}`
}

function signedPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function BenchmarkCard({ metric, result, benchmark, variation, accent, delay }) {
  const Icon = metric.icon
  const isPositive = variation !== null && variation >= 0

  return (
    <div
      className="glass-card relative overflow-hidden rounded-2xl p-5"
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: accent }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-xl" style={{ background: `${accent}20`, boxShadow: `inset 0 0 0 1px ${accent}30` }}>
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
          {variation !== null && (
            <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
              {signedPercent(variation)}
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-white/55 uppercase tracking-wider mb-1.5">{metric.label}</p>
        <div className="text-3xl font-bold font-display tracking-tight text-white">
          {metric.type === 'percent' ? formatCompetitionPercent(result) : formatBenchmarkValue(result, metric)}
        </div>
        <div className="mt-2 space-y-0.5">
          <p className="text-[11px] text-white/45">
            Benchmark: <span className="text-white/65 font-medium">{formatBenchmarkValue(benchmark, metric)}</span>
          </p>
          <p className="text-[10px] text-white/30">vs benchmark</p>
        </div>
      </div>
    </div>
  )
}

function RankingBar({ row, max, brandValue, metric, accent }) {
  const width = max > 0 ? Math.max(3, (row.value / max) * 100) : 3
  const vsBrand = row.isBrand ? null : calculateVsBrand(row.value, brandValue)

  return (
    <div className={`rounded-xl border p-3 ${row.isBrand ? 'bg-white/[0.06]' : 'bg-white/[0.02]'}`} style={{ borderColor: row.isBrand ? `${accent}55` : 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0">{row.position}</span>
          <span className={`text-sm truncate ${row.isBrand ? 'font-bold text-white' : 'text-white/80'}`}>{row.competidor}</span>
          {row.isBrand && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: accent, background: `${accent}18` }}>MARCA</span>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">{formatRankingValue(row.value, metric)}</p>
          {!row.isBrand && <p className={`text-[10px] ${vsBrand === null ? 'text-white/30' : vsBrand >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{vsBrand === null ? '—' : `${signedPercent(vsBrand)} vs marca`}</p>}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: row.isBrand ? accent : `${accent}70` }} />
      </div>
    </div>
  )
}

export function CompetenciaSection({
  platform,
  allData = [],
  selectedMonth,
  brandId,
  brandConfig,
  loading,
}) {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.facebook
  const [selectedMetric, setSelectedMetric] = useState('seguidores')

  const platformRows = useMemo(() => {
    const key = normalizePlatformKey(platform)
    return (allData || []).filter(row => normalizePlatformKey(row?.red) === key)
  }, [allData, platform])

  const currentRows = useMemo(() => {
    return platformRows.filter(row => row?.mes === selectedMonth)
  }, [platformRows, selectedMonth])

  const brandAliases = useMemo(
    () => getBrandAliases(brandId, brandConfig?.nombre),
    [brandId, brandConfig?.nombre]
  )

  const benchmarkData = useMemo(
    () => calculateQuarterBenchmark(platformRows, platform, selectedMonth),
    [platformRows, platform, selectedMonth]
  )

  const rankingData = useMemo(
    () => calculateRanking(platformRows, platform, selectedMonth, COMPETITION_METRICS.find(m => m.key === selectedMetric) || COMPETITION_METRICS[0], brandAliases),
    [platformRows, platform, selectedMonth, selectedMetric, brandAliases]
  )

  const currentBrand = useMemo(
    () => currentRows.find(row => {
      const candidate = String(row?.competidor || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
      return [...brandAliases].some(alias => alias === candidate)
    }) || null,
    [currentRows, brandAliases]
  )

  const currentMetricRows = useMemo(() => {
    return BENCHMARK_METRICS.concat([{ key: 'seguidores', label: 'Seguidores', icon: Users, type: 'number' }])
      .reduce((acc, metric) => {
        acc[metric.key] = currentBrand?.[metric.key]
        return acc
      }, {})
  }, [currentBrand])

  if (loading) {
    return <div className="rounded-2xl skeleton h-96" />
  }

  if (!selectedMonth || !currentRows.length) {
    return (
      <div className="space-y-6">
        <PlatformSubnav platform={platform} accent={cfg.accent} />
        <SectionHeader icon={cfg.icon} title="Competencia" subtitle={`Benchmark y ranking competitivo · ${cfg.label}`} accentColor={cfg.accent} />
        <EmptyState icon={Users} title="Sin datos de competencia" message={`No hay datos de competencia para ${cfg.label} y el mes seleccionado.`} />
      </div>
    )
  }

  const selectedMetricConfig = COMPETITION_METRICS.find(m => m.key === selectedMetric) || COMPETITION_METRICS[0]
  const brandValue = rankingData.brandRow?.value
  const maxValue = Math.max(...rankingData.ranking.map(row => row.value), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PlatformSubnav platform={platform} accent={cfg.accent} />
      </div>

      <SectionHeader
        icon={cfg.icon}
        title="Competencia"
        subtitle={`Benchmark y ranking competitivo · ${cfg.label}`}
        accentColor={cfg.accent}
      />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Benchmark</h2>
            <p className="text-xs text-white/45 mt-1">
              {benchmarkData.quarter
                ? `${benchmarkData.quarter.label} · ${formatMonthRange(benchmarkData.quarter.months)}`
                : 'Trimestre de referencia no disponible'}
              {benchmarkData.partial ? ' · datos parciales' : ''}
            </p>
          </div>
          <p className="text-[11px] text-white/30 max-w-sm text-right">
            Promedio trimestral de la marca y competidores de {cfg.label}. Se utiliza como referencia para los tres meses siguientes.
          </p>
        </div>

        {!benchmarkData.benchmark ? (
          <div className="glass-card rounded-2xl p-6 text-center text-sm text-white/45">
            Benchmark no disponible para este mes porque todavía no existe un trimestre anterior de referencia.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {BENCHMARK_METRICS.map((metric, index) => (
              <BenchmarkCard
                key={metric.key}
                metric={metric}
                result={currentMetricRows[metric.key]}
                benchmark={benchmarkData.benchmark[metric.key]}
                variation={calculateBenchmarkVariation(currentMetricRows[metric.key], benchmarkData.benchmark[metric.key])}
                accent={cfg.accent}
                delay={index}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">Comparativo competitivo</h2>
            <p className="text-xs text-white/45 mt-1">
              {rankingData.brandPosition ? `La marca ocupa el lugar #${rankingData.brandPosition} de ${rankingData.total}` : 'No se encontró el registro de la marca en este mes'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl border border-white/10 bg-white/[0.025]">
            {COMPETITION_METRICS.map(metric => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${selectedMetric === metric.key ? 'text-white' : 'text-white/45 hover:text-white/80'}`}
                style={selectedMetric === metric.key ? { background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}45` } : { border: '1px solid transparent' }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {rankingData.ranking.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rankingData.ranking.map(row => (
              <RankingBar
                key={`${row.competidor}-${row.position}`}
                row={row}
                max={maxValue}
                brandValue={brandValue}
                metric={selectedMetricConfig}
                accent={cfg.accent}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Trophy} title="Sin ranking disponible" message="No hay resultados numéricos para este KPI en el mes seleccionado." />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white">Detalle competitivo</h2>
          <p className="text-xs text-white/45 mt-1">Todos los KPIs del mes seleccionado, por perfil.</p>
        </div>
        <DataTable
          columns={[
            { key: 'competidor', label: 'Competidor', bold: true },
            { key: 'seguidores', label: 'Seguidores', align: 'right', render: v => formatRankingValue(v, { type: 'number' }) },
            { key: 'crecimiento_pct', label: 'Crecimiento', align: 'right', render: v => formatCompetitionPercent(v) },
            { key: 'posts', label: 'Posts', align: 'right', render: v => formatRankingValue(v, { type: 'number' }) },
            { key: 'interaccion', label: 'Interacción', align: 'right', render: v => formatRankingValue(v, { type: 'number' }) },
            { key: 'engagement_pct', label: 'Engagement', align: 'right', render: v => formatCompetitionPercent(v) },
          ]}
          data={currentRows}
        />
      </section>
    </div>
  )
}
