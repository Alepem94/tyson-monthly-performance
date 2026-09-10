// ─────────────────────────────────────────────────────────────────────────────
// Timeline builder — combina reportes mensuales (Facebook/Instagram/TikTok/
// Google Ads) y campañas de periodo específico (Mundial, Pal Norte, etc.) en
// una sola línea cronológica, de forma que campañas concurrentes con el
// reporte mensual (o entre sí) SIEMPRE se muestren juntas, sin necesidad de
// alternar entre vistas.
//
// No reemplaza el filtro de mes existente en el resto del dashboard: cada
// nodo del timeline sigue enlazando a las secciones detalladas ya existentes
// (Overview, Facebook/Instagram/TikTok, Google Ads, etc.) para ese mes.
// ─────────────────────────────────────────────────────────────────────────────

import { safeNumber } from './format'
import { tipoCampanaToBucket, bucketToLabel, getCampaignPlatform } from './campaigns'

// "2026-08" → 2026*12 + 8 (para comparar/ordenar meses fácilmente)
function monthIndex(yyyymm) {
  if (!yyyymm) return null
  const [y, m] = String(yyyymm).split('-').map(Number)
  if (isNaN(y) || isNaN(m)) return null
  return y * 12 + (m - 1)
}

function monthIndexToStr(idx) {
  const y = Math.floor(idx / 12)
  const m = (idx % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

// Lista de meses "YYYY-MM" entre fecha_inicio y fecha_fin (inclusive)
function monthsInRange(fechaInicio, fechaFin) {
  const start = monthIndex(fechaInicio?.slice(0, 7))
  const end = monthIndex(fechaFin?.slice(0, 7))
  if (start === null) return []
  const safeEnd = end === null ? start : end
  const months = []
  for (let i = Math.min(start, safeEnd); i <= Math.max(start, safeEnd); i++) {
    months.push(monthIndexToStr(i))
  }
  return months
}

function fmtDate(d) {
  if (!d) return null
  const [y, m, day] = String(d).split('-')
  if (!y || !m) return d
  const names = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const idx = parseInt(m, 10) - 1
  const dayPart = day ? `${parseInt(day, 10)} ` : ''
  return `${dayPart}${names[idx] || m} ${y}`
}

// ── Agrupa filas de Campañas en "campañas específicas" únicas ──────────────
// Una campaña específica = mismo nombre_campana + tipo_campana + rango de
// fechas (o mes, si no hay fechas). Cada campaña puede tener varias filas
// (una por plataforma/objetivo); se agregan sus resultados/inversión y se
// listan como desglose interno de la tarjeta.
export function buildSpecificCampaigns(campanas = []) {
  const groups = new Map()

  for (const row of campanas) {
    const tipoCampana = row._tipoCampana || row.tipo_campana || 'AON'
    const bucket = row._bucket || tipoCampanaToBucket(tipoCampana)
    if (bucket === 'mensual') continue // el AON/mensual ya se ve en el reporte del mes

    const fechaInicio = row.fecha_inicio || null
    const fechaFin = row.fecha_fin || null
    const nombre = row.nombre_campana || row._fullName || bucketToLabel(bucket, tipoCampana)

    const key = [nombre, bucket, fechaInicio || '', fechaFin || ''].join('|')
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        nombre,
        bucket,
        label: bucketToLabel(bucket, tipoCampana),
        fechaInicio,
        fechaFin,
        platforms: new Set(),
        inversion: 0,
        resultado: 0,
        objetivos: new Map(), // objetivo → { platform, resultado, inversion }
        months: new Set(),
      })
    }
    const g = groups.get(key)
    const platform = getCampaignPlatform(row)
    if (platform) g.platforms.add(platform)
    if (row.mes) g.months.add(row.mes)

    const objetivo = row._objective || row.objetivo_detectado || row.objetivo || 'Sin objetivo'
    const objKey = `${platform || '—'}::${objetivo}`
    if (!g.objetivos.has(objKey)) {
      g.objetivos.set(objKey, { platform, objetivo, resultado: 0, inversion: 0 })
    }
    const o = g.objetivos.get(objKey)
    o.resultado += safeNumber(row.resultado)
    o.inversion += safeNumber(row.inversion)

    g.inversion += safeNumber(row.inversion)
    g.resultado += safeNumber(row.resultado)
  }

  return Array.from(groups.values()).map(g => {
    const monthsFromDates = monthsInRange(g.fechaInicio, g.fechaFin)
    const months = monthsFromDates.length > 0 ? monthsFromDates : Array.from(g.months)
    return {
      key: g.key,
      nombre: g.nombre,
      bucket: g.bucket,
      label: g.label,
      fechaInicio: g.fechaInicio,
      fechaFin: g.fechaFin,
      dateLabel: g.fechaInicio
        ? `${fmtDate(g.fechaInicio)} – ${g.fechaFin ? fmtDate(g.fechaFin) : 'en curso'}`
        : null,
      platforms: Array.from(g.platforms),
      inversion: g.inversion,
      resultado: g.resultado,
      objetivos: Array.from(g.objetivos.values()),
      months: months.sort(),
      startMonth: months.length > 0 ? months.sort()[0] : null,
    }
  })
}

// ── Construye la línea de tiempo completa ───────────────────────────────────
// data = { facebook, instagram, tiktok, googleAds, sentiment, campanas } ya
// filtrados por marca (sin filtrar por mes — el timeline necesita TODOS los
// meses para poder ordenarlos cronológicamente).
export function buildTimeline(data = {}) {
  const { facebook = [], instagram = [], tiktok = [], googleAds = [], sentiment = [], campanas = [] } = data

  const monthsSet = new Set()
  const indexByMonth = (arr, field = 'mes') => {
    const map = new Map()
    for (const r of arr) {
      if (!r[field]) continue
      monthsSet.add(r[field])
      if (!map.has(r[field])) map.set(r[field], [])
      map.get(r[field]).push(r)
    }
    return map
  }

  const fbByMonth = indexByMonth(facebook)
  const igByMonth = indexByMonth(instagram)
  const ttByMonth = indexByMonth(tiktok)
  const gadsByMonth = indexByMonth(googleAds)
  const sentByMonth = indexByMonth(sentiment)

  const specificCampaigns = buildSpecificCampaigns(campanas)
  specificCampaigns.forEach(c => c.months.forEach(m => monthsSet.add(m)))

  const months = Array.from(monthsSet).sort().reverse() // más reciente primero

  return months.map(mes => {
    const campaignsThisMonth = specificCampaigns
      .filter(c => c.months.includes(mes))
      .map(c => ({ ...c, isStartMonth: c.startMonth === mes }))
      // Campaña que empieza este mes primero, luego las que solo continúan
      .sort((a, b) => (b.isStartMonth === a.isStartMonth ? 0 : b.isStartMonth ? 1 : -1))

    const fbRow = fbByMonth.get(mes)?.[0] || null
    const igRow = igByMonth.get(mes)?.[0] || null
    const ttRow = ttByMonth.get(mes)?.[0] || null
    const gadsRows = gadsByMonth.get(mes) || []
    const sentRow = sentByMonth.get(mes)?.[0] || null

    const hasMonthlyReport = !!(fbRow || igRow || ttRow || gadsRows.length > 0)

    return {
      mes,
      hasMonthlyReport,
      facebook: fbRow,
      instagram: igRow,
      tiktok: ttRow,
      googleAds: gadsRows,
      sentiment: sentRow,
      campaigns: campaignsThisMonth,
    }
  })
}
