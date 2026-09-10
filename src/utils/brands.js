// ─────────────────────────────────────────────────────────────────────────────
// Dashboard de una sola marca: Tyson Foods Mx.
// BRAND_ID es el identificador fijo (coincide con la columna `marca` del
// Google Sheet) usado en toda la app en vez de un selector multi-marca.
// ─────────────────────────────────────────────────────────────────────────────
export const BRAND_ID = 'tyson'

// Nombre de marca forzado en pantalla — independiente de cómo esté escrito
// en la pestaña _MARCAS del Google Sheet (evita depender de que el analista
// capture el nombre con mayúsculas/espacios exactos).
export const BRAND_DISPLAY_NAMES = {
  tyson: 'Tyson Foods Mx',
}

export function displayBrandName(marcaId, fallback) {
  return BRAND_DISPLAY_NAMES[marcaId] || fallback || '—'
}
