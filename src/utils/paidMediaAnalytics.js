// ─────────────────────────────────────────────────────────────────────────────
// paidMediaAnalytics.js
// KPI catalog + insight calculations for the Paid Media historical explorer.
//
// Reuses the existing objective-detection logic (campaignMetricKey/Label from
// historicalAnalytics.js) instead of re-implementing it, and reuses the same
// CPM-vs-CPR convention already used across the app (alcance-type objectives
// are cost-per-mille, everything else is cost-per-result).
// ─────────────────────────────────────────────────────────────────────────────
import { safeNumber, pctChange, prevMonth } from './format'
import { campaignMetricKey, campaignMetricLabel, enrichCampaignRows } from './historicalAnalytics'

const PALETTE = ['#22d3ee', '#ec4899', '#a78bfa', '#f59e0b', '#60a5fa', '#34d399', '#fb7185', '#c084fc']

// ── Smart cost label — mirrors the CPM-vs-CPR rule already used in buildPaidMediaHistory ──
function costLabelFor(objectiveLabel) {
  const s = String(objectiveLabel || '').toLowerCase()
  if (s.includes('alcance') || s.includes('reach')) return 'CPM'
  if (s.includes('interac')) return 'CPI'
  if (s.includes('seguidor')) return 'Costo por seguidor'
  if (s.includes('thruplay')) return 'Costo por ThruPlay'
  if (s.includes('visita') && s.includes('perfil')) return 'Costo por visita'
  if (s.includes('like')) return 'Costo por like'
  if (s.includes('view')) return 'Costo por vista'
  return 'Costo por resultado'
}

function isAlcanceLike(objectiveLabel) {
  const s = String(objectiveLabel || '').toLowerCase()
  return s.includes('alcance') || s.includes('reach')
}

function isSeguidoresLike(objectiveLabel) {
  return String(objectiveLabel || '').toLowerCase().includes('seguidor')
}

// ── Rate label for impression-based rates (ETR/VTR) — only for objectives
// where "impresiones" on the campaign row is a meaningful denominator.
// Alcance and Seguidores are excluded: alcance's rate vs. its own impressions
// isn't a useful KPI here, and follower growth uses total fans, not impressions.
function impressionRateLabelFor(objectiveLabel) {
  const s = String(objectiveLabel || '').toLowerCase()
  if (s.includes('alcance') || s.includes('reach') || s.includes('seguidor')) return null
  if (s.includes('interac')) return 'ETR'
  if (s.includes('thruplay')) return 'VTR'
  return 'Tasa'
}

// "2026-08" → ['2026-01', ..., '2026-08']
function yearToDateMonths(currentMonth) {
  if (!currentMonth) return []
  const [y, m] = String(currentMonth).split('-')
  const month = parseInt(m, 10)
  if (!y || !Number.isFinite(month)) return []
  return Array.from({ length: month }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)
}

// ── Builds the full KPI catalog for one platform, scoped to Jan → currentMonth ──
// socialRows: aggregated monthly platform rows (from buildPlatformHistory), used
// only to compute "Tasa de crecimiento de seguidores" (needs total fans/month).
export function buildPaidMediaKPICatalog(campanas = [], platform, socialRows = [], currentMonth) {
  const months = yearToDateMonths(currentMonth)
  if (!months.length) return { months: [], objectives: [], kpis: [] }

  const rows = enrichCampaignRows(campanas, platform).filter(c => c.mes && months.includes(c.mes))
  const fansByMonth = new Map((socialRows || []).map(r => [r.mes, safeNumber(r.seguidores)]))

  // Group by objective key, in first-seen order (matches existing dynamic discovery)
  const objectiveOrder = []
  const objectiveLabel = new Map()
  for (const row of rows) {
    const key = campaignMetricKey(row)
    if (!objectiveLabel.has(key)) {
      objectiveLabel.set(key, campaignMetricLabel(row))
      objectiveOrder.push(key)
    }
  }

  // month → { [objectiveKey]: { result, spend, impresiones, hasImpresiones } }
  const byMonth = new Map(months.map(m => [m, {}]))
  for (const row of rows) {
    const key = campaignMetricKey(row)
    const bucket = byMonth.get(row.mes)
    if (!bucket) continue
    if (!bucket[key]) bucket[key] = { result: 0, spend: 0, impresiones: 0, hasImpresiones: false }
    bucket[key].result += safeNumber(row.resultado)
    bucket[key].spend += safeNumber(row.inversion)
    // Solo cuenta impresiones si la celda trae un dato real — así una campaña
    // sin ese dato no se confunde con impresiones = 0.
    if (row.impresiones !== undefined && row.impresiones !== null && String(row.impresiones).trim() !== '') {
      bucket[key].impresiones += safeNumber(row.impresiones)
      bucket[key].hasImpresiones = true
    }
  }

  const kpis = []
  const objectives = objectiveOrder.map((key, idx) => ({ key, label: objectiveLabel.get(key), color: PALETTE[idx % PALETTE.length] }))

  objectives.forEach(({ key, label, color }) => {
    const resultSeries = {}
    const spendSeries = {}
    const costSeries = {}
    const rateSeries = {}
    let hasCost = false
    let hasRate = false
    const impressionRateLabel = impressionRateLabelFor(label)

    for (const mes of months) {
      const cell = byMonth.get(mes)?.[key]
      resultSeries[mes] = cell ? cell.result : null
      spendSeries[mes] = cell ? cell.spend : null
      if (cell && cell.result > 0) {
        costSeries[mes] = isAlcanceLike(label) ? (cell.spend / cell.result) * 1000 : cell.spend / cell.result
        hasCost = true
      } else {
        costSeries[mes] = null
      }
      if (isSeguidoresLike(label)) {
        const fans = fansByMonth.get(mes)
        rateSeries[mes] = cell && cell.result != null && fans > 0 ? (cell.result / fans) * 100 : null
      } else if (impressionRateLabel) {
        rateSeries[mes] = cell && cell.hasImpresiones && cell.impresiones > 0 ? (cell.result / cell.impresiones) * 100 : null
      } else {
        rateSeries[mes] = null
      }
      if (rateSeries[mes] != null) hasRate = true
    }

    kpis.push({
      id: `result::${key}`, objectiveKey: key, label, role: 'result',
      unit: 'number', better: 'higher', accumulate: true, color, series: resultSeries,
    })
    kpis.push({
      id: `spend::${key}`, objectiveKey: key, label: `Inversión · ${label}`, role: 'investment',
      unit: 'currency', better: null, accumulate: true, color, series: spendSeries,
    })
    if (hasCost) {
      kpis.push({
        id: `cost::${key}`, objectiveKey: key, label: costLabelFor(label), role: 'cost',
        unit: 'currency', better: 'lower', accumulate: false, color, series: costSeries,
      })
    }
    if (hasRate) {
      kpis.push({
        id: `rate::${key}`, objectiveKey: key,
        label: isSeguidoresLike(label) ? 'Tasa de crecimiento' : impressionRateLabel,
        role: 'rate', unit: 'percent', better: 'higher', accumulate: false, color, series: rateSeries,
      })
    }
  })

  // Synthetic "Inversión total" — sums every objective active that month.
  const totalSeries = {}
  for (const mes of months) {
    const bucket = byMonth.get(mes)
    if (!bucket || Object.keys(bucket).length === 0) { totalSeries[mes] = null; continue }
    totalSeries[mes] = Object.values(bucket).reduce((sum, v) => sum + v.spend, 0)
  }
  kpis.unshift({
    id: 'spend::__total__', objectiveKey: '__total__', label: 'Inversión total', role: 'investment-total',
    unit: 'currency', better: null, accumulate: true, color: '#f59e0b', series: totalSeries,
  })

  return { months, objectives, kpis }
}

// ── Insight calculations for one KPI, scoped to Jan → currentMonth ─────────
// NOTE: per spec, the average explicitly includes the current month
// (e.g. "Promedio Ene-Jun" when viewing June) — this differs on purpose from
// getMetricHighlights() elsewhere in the app, which excludes the current month.
export function computeKpiInsights(kpi, months, currentMonth) {
  const entries = months.map(mes => ({ mes, value: kpi.series[mes] }))
  const usable = entries.filter(e => e.value !== null && e.value !== undefined && Number.isFinite(e.value))
  if (!usable.length) return null

  const currentEntry = entries.find(e => e.mes === currentMonth)
  const currentValue = currentEntry && currentEntry.value != null ? currentEntry.value : null

  const cmp = kpi.better === 'lower'
    ? (a, b) => a < b
    : (a, b) => a > b
  const best = usable.reduce((winner, e) => cmp(e.value, winner.value) ? e : winner, usable[0])

  const avg = usable.reduce((sum, e) => sum + e.value, 0) / usable.length
  const vsAverage = currentValue != null ? pctChange(currentValue, avg) : null

  const prior = prevMonth(currentMonth)
  const priorEntry = prior ? entries.find(e => e.mes === prior && e.value != null) : null
  const vsPrevMonth = priorEntry && currentValue != null ? pctChange(currentValue, priorEntry.value) : null

  const january = months[0]
  const janEntry = january && january !== currentMonth ? entries.find(e => e.mes === january && e.value != null) : null
  const vsJanuary = janEntry && currentValue != null ? pctChange(currentValue, janEntry.value) : null

  const accumulated = kpi.accumulate ? usable.reduce((sum, e) => sum + e.value, 0) : null

  return {
    currentValue,
    currentMonth: currentEntry?.mes || null,
    bestMonth: best.mes,
    bestValue: best.value,
    isBestCurrent: currentValue != null && best.mes === currentMonth,
    average: avg,
    vsAverage,
    vsPrevMonth,
    hasPrevMonth: Boolean(priorEntry),
    vsJanuary: currentMonth === january ? null : vsJanuary,
    isJanuary: currentMonth === january,
    accumulated,
    monthsCounted: usable.length,
  }
}
