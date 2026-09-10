import { useMemo } from 'react'
import { safeNumber } from '../utils/format'

const SUM_FIELDS = [
  'alcance', 'impresiones', 'impresiones_visibles', 'interacciones', 'inversion',
  'views', 'views_6s', 'nuevos_seguidores', 'publicaciones',
  'clics', 'conversiones', 'visualizaciones', 'resultado',
]
const LAST_FIELDS = ['seguidores']

function aggregateRows(rows, extraFields = []) {
  if (!rows || rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))
  const result = { ...sorted[sorted.length - 1] }

  for (const field of [...SUM_FIELDS, ...extraFields]) {
    let total = 0, hasValue = false
    for (const r of sorted) {
      const v = safeNumber(r[field], NaN)
      if (!isNaN(v)) { total += v; hasValue = true }
    }
    if (hasValue) result[field] = total
  }

  for (const field of LAST_FIELDS) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const v = safeNumber(sorted[i][field], NaN)
      if (!isNaN(v) && v > 0) { result[field] = v; break }
    }
  }

  const totalInteracciones = safeNumber(result.interacciones)
  const totalAlcance = safeNumber(result.alcance) || safeNumber(result.views)
  if (totalAlcance > 0) result.engagement_rate = totalInteracciones / totalAlcance

  return result
}

function aggregateArrayRows(rows, groupByFields = []) {
  if (!rows || rows.length === 0) return []
  if (groupByFields.length === 0) return rows
  const groups = {}
  for (const r of rows) {
    const key = groupByFields.map(f => String(r[f] || '')).join('|')
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }
  return Object.values(groups).map(group => aggregateRows(group))
}

function pickBestMonthRow(rows, filterFn) {
  const matches = rows.filter(filterFn)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  const withFecha = matches.filter(r => r.fecha)
  if (withFecha.length > 0) {
    return withFecha.reduce((best, r) => r.fecha > best.fecha ? r : best, withFecha[0])
  }

  return matches.reduce((best, r) => {
    return safeNumber(r.seguidores, 0) > safeNumber(best.seguidores, 0) ? r : best
  }, matches[0])
}

export function rangeInSameMonth(startDate, endDate) {
  if (!startDate || !endDate) return false
  return startDate.slice(0, 7) === endDate.slice(0, 7)
}

export function useDateFilter(data, { mode, selectedMonth, startDate, endDate }) {
  const filtered = useMemo(() => {
    if (!data) return {}

    const inRange = (r) => {
      if (!r.fecha) return false
      return r.fecha >= startDate && r.fecha <= endDate
    }
    const inMonth = (r) => r.mes === selectedMonth

    const getSingleForMonth = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return null
      const hasFecha = arr.some(r => r.fecha)

      if (mode === 'month') {
        if (hasFecha) return aggregateRows(arr.filter(inMonth))
        return pickBestMonthRow(arr, inMonth)
      }
      if (hasFecha) return aggregateRows(arr.filter(inRange))
      return null
    }

    const getArrayForPeriod = (arr, groupBy = []) => {
      if (!Array.isArray(arr) || arr.length === 0) return []
      const hasFecha = arr.some(r => r.fecha)
      if (mode === 'month') {
        if (hasFecha) {
          const monthRows = arr.filter(inMonth)
          return groupBy.length > 0 ? aggregateArrayRows(monthRows, groupBy) : monthRows
        }
        return arr.filter(inMonth)
      }
      if (hasFecha) {
        const rangeRows = arr.filter(inRange)
        return groupBy.length > 0 ? aggregateArrayRows(rangeRows, groupBy) : rangeRows
      }
      return []
    }

    const getMonthOnly = (arr) => {
      if (!Array.isArray(arr)) return []
      if (mode === 'month') return arr.filter(inMonth)
      return []
    }

    const getSingleMonthOnly = (arr) => {
      if (!Array.isArray(arr)) return null
      if (mode === 'month') return pickBestMonthRow(arr, inMonth)
      return null
    }

    const showProyecciones = mode === 'month' ||
      (mode === 'range' && rangeInSameMonth(startDate, endDate))
    const proyMonth = mode === 'month' ? selectedMonth
      : (showProyecciones ? startDate?.slice(0, 7) : null)

    // Proyecciones: se conserva UNA sola colección, como en la arquitectura
    // original. Las filas Mensual tienen mes; las filas Campaña pueden no tenerlo.
    // Cada componente decide cómo usar cada tipo y no pierde las filas de campaña.
    const allProy = Array.isArray(data.proyecciones) ? data.proyecciones : []

    return {
      empresa: data.empresa,
      facebook:  getSingleForMonth(data.facebook),
      instagram: getSingleForMonth(data.instagram),
      tiktok:    getSingleForMonth(data.tiktok),
      googleAds: getArrayForPeriod(data.googleAds, ['tipo_red']),
      googleAdsCiudades: getArrayForPeriod(data.googleAdsCiudades, ['ciudad']),
      googleAdsKeywords: getArrayForPeriod(data.googleAdsKeywords, ['keyword']),
      campanas:  getArrayForPeriod(data.campanas, ['nombre_campana', 'plataforma']),
      topPosts:  getMonthOnly(data.topPosts),
      sentiment: getSingleMonthOnly(data.sentiment),
      sentimentCapturas: mode === 'month'
        ? (data.sentimentCapturas || []).filter(r => r.mes === selectedMonth) : [],
      competencia:  getMonthOnly(data.competencia),
      hallazgos:    getMonthOnly(data.hallazgos),
      observaciones: getMonthOnly(data.observaciones),
      // IMPORTANTE: no separar proyecciones por fecha/tipo aquí.
      // Paid Media recibe la tabla completa y cruza Mensual/Campaña internamente.
      proyecciones: allProy,
      // Alias de compatibilidad: mantienen la información disponible sin
      // convertirlos en la fuente principal de Paid Media.
      proyeccionesMensuales: showProyecciones
        ? allProy.filter(r => {
            const tipo = String(r.tipo_proyeccion || 'Mensual').trim().toLowerCase()
            return tipo === 'mensual' && r.mes === proyMonth
          })
        : [],
      proyeccionesCampana: allProy.filter(r => String(r.tipo_proyeccion || '').trim().toLowerCase() === 'campaña'),
      proyeccionesTodas: allProy,
      _mode: mode,
      _showMonthOnly: mode === 'month',
      _showProyecciones: showProyecciones,
      _proyMonth: proyMonth,
    }
  }, [data, mode, selectedMonth, startDate, endDate])

  const historicalData = useMemo(() => {
    const aggregateByMonth = (arr) => {
      if (!Array.isArray(arr)) return []
      const byMonth = {}
      for (const r of arr) {
        const m = r.mes
        if (!m) continue
        if (!byMonth[m]) byMonth[m] = []
        byMonth[m].push(r)
      }
      return Object.entries(byMonth).map(([mes, rows]) => {
        const hasFecha = rows.some(r => r.fecha)
        if (hasFecha) return aggregateRows(rows)
        return pickBestMonthRow(rows, () => true)
      }).filter(Boolean)
    }

    return {
      facebook:   aggregateByMonth(data.facebook  || []),
      instagram:  aggregateByMonth(data.instagram || []),
      tiktok:     aggregateByMonth(data.tiktok    || []),
      googleAds:  data.googleAds   || [],
      competencia: data.competencia || [],
    }
  }, [data])

  return { filtered, historicalData }
}
