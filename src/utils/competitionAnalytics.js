export const COMPETITION_METRICS = [
  { key: 'seguidores', label: 'Seguidores', type: 'number' },
  { key: 'crecimiento_pct', label: 'Crecimiento de comunidad', type: 'percent' },
  { key: 'posts', label: 'Posts publicados', type: 'number' },
  { key: 'interaccion', label: 'Interacción total', type: 'number' },
  { key: 'engagement_pct', label: 'Engagement Rate', type: 'percent' },
]

const normalizeText = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')
  .trim()

const normalizePlatform = value => normalizeText(value)

export function getPreviousQuarter(selectedMonth) {
  if (!/^\d{4}-\d{2}$/.test(String(selectedMonth || ''))) return null

  const [year, month] = String(selectedMonth).split('-').map(Number)
  const currentQuarter = Math.floor((month - 1) / 3) + 1
  let previousQuarter = currentQuarter - 1
  let previousYear = year

  if (previousQuarter === 0) {
    previousQuarter = 4
    previousYear -= 1
  }

  const firstMonth = (previousQuarter - 1) * 3 + 1
  const months = [0, 1, 2].map(offset => {
    const m = firstMonth + offset
    return `${previousYear}-${String(m).padStart(2, '0')}`
  })

  return {
    year: previousYear,
    quarter: previousQuarter,
    months,
    label: `Q${previousQuarter} ${previousYear}`,
  }
}

export function getCurrentQuarter(selectedMonth) {
  if (!/^\d{4}-\d{2}$/.test(String(selectedMonth || ''))) return null
  const [year, month] = String(selectedMonth).split('-').map(Number)
  return Math.floor((month - 1) / 3) + 1
}

export function normalizeRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  // The source Sheet uses decimal ratios such as 0.043 for 4.3%.
  return Math.abs(n) <= 1 ? n * 100 : n
}

export function formatCompetitionPercent(value, decimals = 2) {
  const n = normalizeRate(value)
  if (n === null) return '—'
  return `${n.toFixed(decimals)}%`
}

export function formatBenchmarkValue(value, metric) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  if (metric?.type === 'percent') return formatCompetitionPercent(value)
  return Math.round(Number(value)).toLocaleString('es-MX')
}

export function formatRankingValue(value, metric) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  if (metric?.type === 'percent') return formatCompetitionPercent(value)
  return Math.round(Number(value)).toLocaleString('es-MX')
}

export function getBrandAliases(brandId, brandName) {
  return new Set([normalizeText(brandId), normalizeText(brandName)].filter(Boolean))
}

export function isMainBrand(row, brandAliases) {
  const competitor = normalizeText(row?.competidor)
  return competitor !== '' && brandAliases.has(competitor)
}

function finiteValues(rows, field) {
  return rows
    .map(row => Number(row?.[field]))
    .filter(Number.isFinite)
}

function average(rows, field) {
  const values = finiteValues(rows, field)
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function calculateQuarterBenchmark(data, platform, selectedMonth) {
  const previousQuarter = getPreviousQuarter(selectedMonth)
  if (!previousQuarter) {
    return { benchmark: null, quarter: null, partial: false, rowsUsed: 0 }
  }

  const platformKey = normalizePlatform(platform)
  const rows = (data || []).filter(row =>
    normalizePlatform(row?.red) === platformKey && previousQuarter.months.includes(row?.mes)
  )

  const benchmark = {}
  for (const metric of COMPETITION_METRICS.filter(m => m.key !== 'seguidores')) {
    benchmark[metric.key] = average(rows, metric.key)
  }

  const availableMonths = new Set(rows.map(row => row?.mes).filter(Boolean))
  const partial = availableMonths.size < previousQuarter.months.length

  return {
    benchmark,
    quarter: previousQuarter,
    partial,
    rowsUsed: rows.length,
    availableMonths: [...availableMonths].sort(),
  }
}

export function calculateRanking(data, platform, selectedMonth, metric, brandAliases) {
  const platformKey = normalizePlatform(platform)
  const rows = (data || []).filter(row =>
    normalizePlatform(row?.red) === platformKey && row?.mes === selectedMonth && row?.competidor
  )

  const deduped = new Map()
  for (const row of rows) {
    const key = normalizeText(row.competidor)
    if (!key) continue
    // Keep the last record if the source has accidental duplicate rows.
    deduped.set(key, row)
  }

  const ranking = [...deduped.values()]
    .map(row => ({
      ...row,
      isBrand: isMainBrand(row, brandAliases),
      value: Number(row?.[metric.key]),
    }))
    .filter(row => Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value)
    .map((row, index) => ({ ...row, position: index + 1 }))

  const brandRow = ranking.find(row => row.isBrand) || null

  return {
    ranking,
    brandRow,
    brandPosition: brandRow?.position || null,
    total: ranking.length,
  }
}

export function calculateVsBrand(value, brandValue) {
  const current = Number(value)
  const brand = Number(brandValue)
  if (!Number.isFinite(current) || !Number.isFinite(brand) || brand === 0) return null
  return ((current - brand) / Math.abs(brand)) * 100
}

export function calculateBenchmarkVariation(value, benchmark) {
  const current = Number(value)
  const base = Number(benchmark)
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return null
  return ((current - base) / Math.abs(base)) * 100
}

export function normalizePlatformKey(value) {
  return normalizePlatform(value)
}
