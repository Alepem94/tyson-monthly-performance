// ─────────────────────────────────────────────────────────────────────────────
// ROBUST SHEET DATA PARSER
// Lee cualquier estructura de Google Sheet y la normaliza automáticamente
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeImageUrl } from './urls'
import { enrichCampaign } from './campaigns'

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD DETECTION — Mapear columnas automáticamente
// ═══════════════════════════════════════════════════════════════════════════════

const stripSpecial = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-áàâäãéèêëíìîïóòôöõúùûüñ]/g, (m) => {
      const map = {
        ' ': '', '_': '', '-': '',
        'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ñ': 'n',
      }
      return m in map ? map[m] : m
    })

const fieldAliases = {
  // Identifiers
  marca: ['marca', 'brand', 'brandid'],
  mes: ['mes', 'month', 'fecha', 'date'],
  tipo_proyeccion: ['tipoproyeccion', 'tipodeproyeccion', 'projectiontype', 'tipoproyecion'],
  tipo_campana: ['tipocampana', 'tipodecampana', 'campaigntype', 'tipocampania', 'audiencia'],
  fecha_inicio: ['fechainicio', 'inicio', 'fechadesde', 'startdate', 'periodoinicio', 'desde'],
  fecha_fin: ['fechafin', 'fin', 'fechahasta', 'enddate', 'periodofin', 'hasta'],
  
  // Social Media
  seguidores: ['seguidores', 'followers', 'seguidor'],
  alcance: ['alcance', 'reach'],
  impresiones: ['impresiones', 'impressions', 'impr'],
  impresiones_visibles: ['impresionesvisibles', 'visibleimpressions'],
  interacciones: ['interacciones', 'interactions', 'engagement'],
  engagement_rate: ['engagementrate', 'engagementpct'],
  nuevos_seguidores: ['nuevosseguidores', 'newfollowers'],
  publicaciones: ['publicaciones', 'posts'],
  inversion: ['inversion', 'investment', 'spend', 'costo', 'cost', 'inversionreal'],
  presupuesto: ['presupuesto', 'budget', 'presupuestoasignado', 'budgetasignado', 'inversionmeta', 'presupuestometa', 'inversionpresupuesto'],
  
  // TikTok
  views: ['views', 'visualizaciones', 'vistas'],
  views_6s: ['views6s', 'videocompletionrate'],
  
  // Google Ads
  clics: ['clics', 'clicks'],
  ctr: ['ctr'],
  cpc: ['cpc'],
  conversiones: ['conversiones', 'conversions'],
  cpa: ['cpa'],
  tipo_red: ['tipored', 'tipoobjetivo', 'adtype'],
  
  // Campaigns
  plataforma: ['plataforma', 'platform', 'channel', 'medio', 'media', 'canal'],
  nombre_campana: ['nombrecampana', 'campaignname', 'nombre', 'campaign', 'nombrecampania'],
  objetivo: ['objetivo', 'objective', 'goal', 'objetivodetectado', 'tipodecompra', 'tipocompra'],
  tipo_campana: ['tipocampana', 'tipodecampana', 'audiencia', 'campaigntype'],
  meta: ['meta', 'target', 'goalvalue'],
  resultado: ['resultado', 'result', 'performance', 'resultados'],
  variacion_pct: ['variacionpct', 'variation'],
  observacion: ['observacion', 'observation', 'nota'],
  
  // TopPosts
  tipo_top: ['tipotop', 'posttype'],
  descripcion: ['descripcion', 'description', 'texto'],
  embed_url: ['embedurl', 'embed', 'codigoembre', 'iframe'],
  imagen_url: ['imagenurl', 'image'],
  
  // Sentiment
  positivo_pct: ['positivopct', 'positivo'],
  neutro_pct: ['neutropct', 'neutro'],
  negativo_pct: ['negativopct', 'negativo'],
  
  // Other
  orden: ['orden', 'order', 'numero', 'position'],
  competidor: ['competidor', 'competitor'],
  red: ['red', 'network'],
  posts: ['posts', 'postcount'],
  crecimiento_pct: ['crecimientopct', 'crecimiento', 'growth', 'growthpct'],
  interaccion: ['interaccion', 'interacciones', 'interaction', 'interactions'],
  engagement_pct: ['engagementpct', 'engagementpercent', 'engagement'],
  seccion: ['seccion', 'section'],
  tipo: ['tipo', 'type'],
  titulo: ['titulo', 'title'],
  prioridad: ['prioridad', 'priority'],
  metrica: ['metrica', 'metric', 'tipodecompra', 'tipocompra'],
  proyeccion: ['proyeccion', 'projection', 'resultadometa', 'resultados', 'resultadosmeta', 'metaproyeccion', 'forecast'],
  real: ['real', 'actual'],
  cpr_meta: ['cpr', 'cprmeta', 'cpr_meta', 'costporresultado'],
  tipo_proyeccion: ['tipoproyeccion', 'tipodeproyeccion', 'projectiontype'],
  fecha_inicio: ['fechainicio', 'inicio', 'fechadesde', 'startdate'],
  fecha_fin: ['fechafin', 'fin', 'fechahasta', 'enddate'],
  rtr: ['rtr'],
  metrica_rtr: ['metricartr', 'rtrmetrica', 'rtrlabel', 'nombrertr'],
  frecuencia: ['frecuencia', 'frequency', 'freq'],
}

function detectField(columnName) {
  const normalized = stripSpecial(columnName)
  for (const [fieldName, aliases] of Object.entries(fieldAliases)) {
    if (aliases.includes(normalized)) {
      return fieldName
    }
  }
  return null  // Unknown field
}

function detectAllFields(headers) {
  const mapping = {}
  for (const header of headers) {
    const field = detectField(header)
    if (field) {
      mapping[field] = header  // Store original column name
    }
  }
  return mapping
}

function extractRow(row, fieldMapping) {
  const out = {}
  for (const [fieldName, originalHeader] of Object.entries(fieldMapping)) {
    const val = row[originalHeader]
    if (val !== null && val !== undefined && val !== '') {
      out[fieldName] = val
    }
  }
  return out
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function normalizeDate(val) {
  if (!val) return null
  if (val instanceof Date && !isNaN(val)) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}`
  }
  const s = String(val).trim()
  if (!s) return null

  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7)

  // gviz Date(2026,2,1) — 0-indexed month
  const gviz = s.match(/^Date\((\d+),\s*(\d+)(?:,\s*\d+)?/)
  if (gviz) {
    const y = parseInt(gviz[1], 10)
    const m = parseInt(gviz[2], 10) + 1
    return `${y}-${String(m).padStart(2, '0')}`
  }

  // M/D/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash) {
    const m = parseInt(slash[1], 10)
    const y = parseInt(slash[3], 10)
    if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`
  }

  // Excel serial
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const d = new Date((parseFloat(s) - 25569) * 86400000)
    if (!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  // Last resort
  const d = new Date(s)
  if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  return s
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const BRAND_ALIASES = {
  tyson: ['tyson', 'tysonfoods', 'tysonfoodsmx', 'tyson foods', 'tyson foods mx'],
  botanera: ['botanera', 'labotanera', 'la botanera'],
  chamoy: ['chamoy', 'chamoymega'],
  pacific: ['pacific', 'pacificmix', 'pacific mix'],
}

function normalizeBrand(val) {
  if (!val) return val
  const s = stripSpecial(val)
  for (const [id, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.includes(s)) return id
  }
  return s  // Fallback to original
}

export function parseSheetNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value === null || value === undefined || value === '') return 0
  let text = String(value).trim().replace(/[^0-9,.-]/g, '')
  if (!text) return 0
  const comma = text.lastIndexOf(',')
  const dot = text.lastIndexOf('.')
  if (comma > -1 && dot > -1) {
    text = comma > dot ? text.replace(/\\./g, '').replace(',', '.') : text.replace(/,/g, '')
  } else if (comma > -1) {
    const decimals = text.length - comma - 1
    text = decimals === 3 ? text.replace(/,/g, '') : text.replace(',', '.')
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROW PROCESSOR — Normaliza una fila completa
// ═══════════════════════════════════════════════════════════════════════════════

export function processRow(row, fieldMapping) {
  const extracted = extractRow(row, fieldMapping)
  
  // Normalize date fields
  if (extracted.mes) extracted.mes = normalizeDate(extracted.mes)
  
  // Normalize brand
  if (extracted.marca) extracted.marca = normalizeBrand(extracted.marca)
  
  // Normalize image URLs
  if (extracted.imagen_url) extracted.imagen_url = normalizeImageUrl(extracted.imagen_url)
  
  // Normalize numeric fields
  const numericFields = [
    'seguidores', 'alcance', 'impresiones', 'impresiones_visibles', 'interacciones',
    'engagement_rate', 'nuevos_seguidores', 'publicaciones', 'inversion', 'presupuesto',
    'views', 'views_6s', 'clics', 'ctr', 'cpc', 'conversiones', 'cpa',
    'meta', 'resultado', 'variacion_pct',
    'positivo_pct', 'neutro_pct', 'negativo_pct',
    'orden', 'posts', 'crecimiento_pct', 'interaccion', 'engagement_pct', 'prioridad',
    'proyeccion', 'real',
    'cpr_meta', 'rtr', 'frecuencia',
  ]
  for (const field of numericFields) {
    if (extracted[field] !== undefined) {
      extracted[field] = parseSheetNumber(extracted[field])
    }
  }
  
  return extracted
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH PROCESSOR — Lee y normaliza un sheet completo
// ═══════════════════════════════════════════════════════════════════════════════

export function processSheet(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return { fieldMapping: {}, rows: [] }
  }

  const headers = Object.keys(rawData[0])
  const fieldMapping = detectAllFields(headers)
  
  const rows = rawData.map((row, idx) => {
    try {
      return processRow(row, fieldMapping)
    } catch (err) {
      console.error(`Error processing row ${idx}:`, err)
      return null
    }
  }).filter(Boolean)

  return { fieldMapping, rows }
}

export function getFieldSummary(fieldMapping) {
  return Object.entries(fieldMapping).map(([field, original]) => ({
    field,
    original,
    detected: true,
  }))
}
