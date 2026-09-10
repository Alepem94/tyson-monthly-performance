import { safeNumber } from './format'
import { getCampaignPlatform, normalizeMetricKey } from './campaigns'

const cleanKey = (value) => normalizeMetricKey(value || '').replace(/\s+/g, ' ').trim()

export const SOCIAL_HISTORY_METRICS = {
  facebook: [
    { key: 'seguidores', label: 'Seguidores', color: '#60a5fa', icon: 'users', format: 'number' },
    { key: 'alcance', label: 'Alcance', color: '#22d3ee', icon: 'eye', format: 'number' },
    { key: 'interacciones', label: 'Interacciones', color: '#ec4899', icon: 'heart', format: 'number' },
    { key: 'engagement_rate', label: 'Engagement Rate', color: '#22c55e', icon: 'activity', format: 'percent' },
  ],
  instagram: [
    { key: 'seguidores', label: 'Seguidores', color: '#fb923c', icon: 'users', format: 'number' },
    { key: 'alcance', label: 'Alcance', color: '#22d3ee', icon: 'eye', format: 'number' },
    { key: 'interacciones', label: 'Interacciones', color: '#ec4899', icon: 'heart', format: 'number' },
    { key: 'engagement_rate', label: 'Engagement Rate', color: '#22c55e', icon: 'activity', format: 'percent' },
  ],
  tiktok: [
    { key: 'seguidores', label: 'Seguidores', color: '#a855f7', icon: 'users', format: 'number' },
    { key: 'views', label: 'Views', color: '#f97316', icon: 'eye', format: 'number' },
    { key: 'interacciones', label: 'Interacciones', color: '#f43f5e', icon: 'heart', format: 'number' },
    { key: 'engagement_rate', label: 'Engagement Rate', color: '#22c55e', icon: 'activity', format: 'percent' },
  ],
}

export function getSocialMetricConfig(platform) {
  return SOCIAL_HISTORY_METRICS[platform] || SOCIAL_HISTORY_METRICS.facebook
}

function aggregatePlatformRows(rows = []) {
  const byMonth = new Map()
  for (const row of rows) {
    if (!row?.mes) continue
    if (!byMonth.has(row.mes)) byMonth.set(row.mes, [])
    byMonth.get(row.mes).push(row)
  }

  return [...byMonth.entries()].map(([mes, monthRows]) => {
    // Monthly sheets normally contain one row. When daily data exists, use the
    // last row for stock metrics (followers) and sums for flow metrics.
    const sorted = [...monthRows].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))
    const last = sorted[sorted.length - 1] || {}
    const seguidores = safeNumber(last.seguidores || monthRows[monthRows.length - 1]?.seguidores)
    const alcance = monthRows.reduce((sum, r) => sum + safeNumber(r.alcance), 0)
    const views = monthRows.reduce((sum, r) => sum + safeNumber(r.views), 0)
    const interacciones = monthRows.reduce((sum, r) => sum + safeNumber(r.interacciones), 0)
    const publicaciones = monthRows.reduce((sum, r) => sum + safeNumber(r.publicaciones), 0)

    // If the source is already monthly, the row value is preferred over a sum.
    const source = monthRows.length === 1 ? monthRows[0] : last
    const sourceReach = safeNumber(source.alcance)
    const sourceViews = safeNumber(source.views)
    const sourceInteractions = safeNumber(source.interacciones)
    const sourceFollowers = safeNumber(source.seguidores)

    const finalReach = monthRows.length === 1 ? sourceReach : alcance
    const finalViews = monthRows.length === 1 ? sourceViews : views
    const finalInteractions = monthRows.length === 1 ? sourceInteractions : interacciones
    const finalFollowers = sourceFollowers || seguidores

    const rawER = safeNumber(source.engagement_rate)
    const base = finalReach || finalViews
    const derivedER = base > 0 ? (finalInteractions / base) * 100 : 0
    // Existing dashboard stores ER as decimal (0.025 = 2.5%). Preserve that
    // convention in the normalized row so the UI can render it consistently.
    const engagementRate = rawER > 0 ? rawER * 100 : derivedER

    return {
      mes,
      seguidores: finalFollowers,
      alcance: finalReach,
      views: finalViews,
      interacciones: finalInteractions,
      engagement_rate: engagementRate,
      publicaciones,
    }
  }).sort((a, b) => a.mes.localeCompare(b.mes))
}

export function buildPlatformHistory(rows = [], platform, maxMonths = 12, endMonth = null) {
  const normalized = aggregatePlatformRows(rows)
  const filtered = normalized.filter(r => !endMonth || r.mes <= endMonth)
  return filtered.slice(-maxMonths)
}

export function buildAccountHistory({ facebook = [], instagram = [], tiktok = [] }, maxMonths = 12, endMonth = null) {
  const maps = {
    facebook: new Map(aggregatePlatformRows(facebook).map(r => [r.mes, r])),
    instagram: new Map(aggregatePlatformRows(instagram).map(r => [r.mes, r])),
    tiktok: new Map(aggregatePlatformRows(tiktok).map(r => [r.mes, r])),
  }
  const months = [...new Set([
    ...maps.facebook.keys(),
    ...maps.instagram.keys(),
    ...maps.tiktok.keys(),
  ])].sort().filter(m => !endMonth || m <= endMonth)

  const rows = months.map(mes => {
    const fb = maps.facebook.get(mes) || {}
    const ig = maps.instagram.get(mes) || {}
    const tt = maps.tiktok.get(mes) || {}
    const seguidores = safeNumber(fb.seguidores) + safeNumber(ig.seguidores) + safeNumber(tt.seguidores)
    const alcance = safeNumber(fb.alcance) + safeNumber(ig.alcance) + safeNumber(tt.views)
    const interacciones = safeNumber(fb.interacciones) + safeNumber(ig.interacciones) + safeNumber(tt.interacciones)
    const engagementRate = alcance > 0 ? (interacciones / alcance) * 100 : 0
    return { mes, seguidores, alcance, interacciones, engagement_rate: engagementRate }
  })

  return rows.slice(-maxMonths)
}

export function metricValue(row, key) {
  return safeNumber(row?.[key])
}

export function buildMetricSeries(rows = [], key, label = key) {
  return rows.map(row => ({ mes: row.mes, [label]: metricValue(row, key) }))
}

export function formatHistoricalValue(value, format = 'number') {
  const n = safeNumber(value)
  if (format === 'percent') return `${n.toFixed(2)}%`
  return new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function getMetricHighlights(rows = [], key, currentMonth = null) {
  const usable = rows.filter(r => Number.isFinite(Number(r?.[key])) && safeNumber(r[key]) > 0)
  if (!usable.length) return null

  const current = currentMonth ? usable.find(r => r.mes === currentMonth) : usable[usable.length - 1]
  const best = usable.reduce((winner, row) => safeNumber(row[key]) > safeNumber(winner[key]) ? row : winner, usable[0])
  const prior = current ? usable.filter(r => r.mes !== current.mes) : []
  const avg = prior.length ? prior.reduce((sum, r) => sum + safeNumber(r[key]), 0) / prior.length : 0
  const vsAverage = avg > 0 ? ((safeNumber(current?.[key]) / avg) - 1) * 100 : null
  const rank = current ? [...usable].sort((a, b) => safeNumber(b[key]) - safeNumber(a[key])).findIndex(r => r.mes === current.mes) + 1 : null

  return {
    bestMonth: best.mes,
    bestValue: safeNumber(best[key]),
    currentMonth: current?.mes || null,
    currentValue: safeNumber(current?.[key]),
    averagePrevious: avg,
    vsAverage,
    rank,
    totalMonths: usable.length,
    isBestCurrent: Boolean(current && current.mes === best.mes),
  }
}

export function enrichCampaignRows(campanas = [], platform) {
  return campanas.filter(c => getCampaignPlatform(c) === platform)
}

export function campaignMetricKey(row) {
  return cleanKey(row?.objetivo_detectado || row?.objetivo || row?._objective || row?.metrica || 'resultado') || 'resultado'
}

export function campaignMetricLabel(row) {
  return row?.objetivo_detectado || row?.objetivo || row?._objective || row?.metrica || 'Resultado'
}

export function buildPaidMediaHistory(campanas = [], platform, maxMonths = 12, endMonth = null) {
  const rows = enrichCampaignRows(campanas, platform)
    .filter(c => c.mes && (!endMonth || c.mes <= endMonth))

  const metricMap = new Map()
  for (const row of rows) {
    const key = campaignMetricKey(row)
    if (!metricMap.has(key)) metricMap.set(key, { key, label: campaignMetricLabel(row) })
  }

  const months = [...new Set(rows.map(r => r.mes))].sort().slice(-maxMonths)
  const byMetricMonth = {}
  for (const metric of metricMap.values()) {
    byMetricMonth[metric.key] = new Map()
  }

  for (const row of rows) {
    const key = campaignMetricKey(row)
    if (!byMetricMonth[key]) continue
    const month = byMetricMonth[key].get(row.mes) || { result: 0, spend: 0 }
    month.result += safeNumber(row.resultado)
    month.spend += safeNumber(row.inversion)
    byMetricMonth[key].set(row.mes, month)
  }

  const metrics = [...metricMap.values()].map((metric, idx) => ({
    ...metric,
    color: ['#22d3ee', '#ec4899', '#a78bfa', '#f59e0b', '#60a5fa', '#34d399', '#fb7185', '#c084fc'][idx % 8],
  }))

  const series = months.map(mes => {
    const row = { mes }
    for (const metric of metrics) {
      const value = byMetricMonth[metric.key]?.get(mes)
      row[`result_${metric.key}`] = value ? value.result : null
      row[`spend_${metric.key}`] = value ? value.spend : null
      row[`cpr_${metric.key}`] = value && value.result > 0
        ? (metric.label.toLowerCase().includes('alcance') || metric.label.toLowerCase().includes('reach')
          ? (value.spend / value.result) * 1000
          : value.spend / value.result)
        : null
    }
    const monthRows = rows.filter(r => r.mes === mes)
    row.spend_total = monthRows.length ? monthRows.reduce((sum, r) => sum + safeNumber(r.inversion), 0) : null
    row.result_total = monthRows.length ? monthRows.reduce((sum, r) => sum + safeNumber(r.resultado), 0) : null
    return row
  })

  return { months, metrics, series }
}
