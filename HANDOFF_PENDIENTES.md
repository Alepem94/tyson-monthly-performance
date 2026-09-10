# Handoff — Estado del dashboard (para continuar con otra IA)

Este repo parte de tu `prueba-competencia-main` (tu implementación de la
sección Competencia, que se revisó y se dejó como base — ver
`BITACORA_COMPETENCIA.md` para el detalle de esa parte). Sobre esa base se
aplicaron primero los cambios de la ronda anterior, y ahora los de esta
ronda (puntos A, B, C y una primera pasada del D). Todo lo que sigue
pendiente está anotado abajo para que puedas pasarle este archivo a otra IA
y continúe sin perder contexto.

## ✅ Ya aplicado (ronda anterior)

1. **Bug de mapeo de columnas corregido** (`src/utils/sheetDataParser.js`):
   el campo `tipo_red` (Google Ads) tenía los alias `'network'` y `'red'`,
   y al evaluarse antes que el campo `red` de Competencia, cualquier columna
   llamada "Red" o "Network" se mapeaba mal — esto rompía silenciosamente
   `row.red` en toda la sección de Competencia. Se quitaron esos dos alias
   genéricos de `tipo_red` (Google Ads sigue funcionando con `tipored` /
   `tipoobjetivo` / `adtype`).

2. **Nombres de marca corregidos** — `src/utils/brands.js` con un mapeo
   `marca_id → nombre a mostrar` ("La Botanera", "Chamoy Mega",
   "Pacific Mix"), aplicado en `BrandSelector.jsx`, `Header.jsx`,
   `Sidebar.jsx`.

3. **Página inicial** (`BrandSelector.jsx`): título "Resultados
   Mensuales" + "2026" debajo, sin badge "Reportes mensuales".

4. **Termómetro de Sentiment más chico** (`size="sm"` en
   `SentimentGauge.jsx`, usado en `SentimentSection.jsx`).

5. **Resumen Ejecutivo** (`Overview.jsx`) — el layout ya existía como se
   pidió, no requirió cambios.

6. **Leyenda que exponía la fuente de datos** en
   `CompetenciaSection.jsx` → corregida.

## ✅ Ya aplicado (esta ronda)

### A. Navegación por pestañas dentro de Facebook / Instagram / TikTok — HECHO
`src/components/ui/PlatformSubnav.jsx` ahora tiene 4 accesos: **Desempeño**,
**Paid Media**, **Top Post**, **Competencia**.

- `src/components/sections/SocialSection.jsx` (Facebook/Instagram) se
  partió en 3 componentes exportados:
  - `SocialSection` → ahora SOLO Desempeño (KPIs de fanpage + hallazgos +
    tarjeta "Ver histórico"). Ya no renderiza Paid Media ni Top Posts.
  - `SocialPaidMediaSection` → header + subnav + `PaidMediaSection`
    (sin cambios internos).
  - `SocialTopPostSection` → header + subnav + `TopPostsSection`.
- `src/components/sections/TikTokSection.jsx` se partió igual:
  `TikTokSection` (solo Desempeño), `TikTokPaidMediaSection`,
  `TikTokTopPostSection`.
- `src/pages/Dashboard.jsx` — se agregaron las rutas nuevas para las 3
  plataformas: `facebook|instagram|tiktok` + `/paid-media` y `/top-post`,
  fuera del bloque `showMonthOnly` (igual que Desempeño, siempre
  disponibles — Paid Media/Top Posts no dependían de eso antes tampoco).

### B. "Desglose por campañas" como bloque expandible — HECHO
En `PaidMediaSection` (dentro de `SocialSection.jsx`, reutilizado por
TikTok) el desglose ahora es un acordeón cerrado por default
(`breakdownOpen`, estado inicial `false`). Al abrirlo incluye, en este
orden, dentro del mismo bloque: los hallazgos del desglose
(`BreakdownInsightsAccordion` con `paidBreakdownHallazgos`), el toggle de
grupos, la KPI de inversión del grupo y la tabla. Antes los hallazgos se
mostraban siempre arriba de la tabla; ahora viven adentro del acordeón.

### C. Tamaño de Top Posts — HECHO (ajuste estático, falta validar a ojo)
En `src/components/ui/PostCard.jsx`:
- Altura de embed reducida: `EMBED_MIN_HEIGHT` 420→300,
  `EMBED_MAX_HEIGHT` 620→460.
- Ancho del embed de Facebook reducido: `FACEBOOK_EMBED_WIDTH` 360→320
  (afecta tanto el `data-width` del widget nativo como el iframe de
  `plugins/post.php`).
- Grid de `TopPostsSection`: antes `md:grid-cols-2` fijo (máx. 2 por
  fila); ahora escala hasta 3-4 columnas (`sm:grid-cols-2 xl:grid-cols-3
  2xl:grid-cols-4`) y `PAGE_SIZE` subió de 3 a 4 posts por página.

**Importante:** los embeds nativos (Facebook/Instagram/TikTok) tienen
anchos mínimos que no se pueden forzar por CSS sin que se vean rotos —
Instagram en particular no acepta bien anchos por debajo de ~326px. Con
`FACEBOOK_EMBED_WIDTH=320` puede que en la columna de 4 (2xl) el embed de
Facebook se vea recortado o desbordado si la columna queda más angosta
que eso. **Esto no se pudo validar en vivo** (sin `npm install` en este
entorno) — al correr `npm run dev`, revisar cómo se ven los embeds reales
en cada breakpoint y, si hace falta, bajar `FACEBOOK_EMBED_WIDTH` un poco
más o quitar la columna `2xl:grid-cols-4` y dejarlo en máximo 3.

### D. Revisión de leyendas de cara a cliente — PARCIAL
Se encontró y corrigió un mensaje visible para el cliente en
`PostCard.jsx` (estado de embed fallido) que mencionaba textualmente
"Pega un embed público... en la columna `embed_url` del Excel" — se
cambió a un mensaje neutro ("Vista previa no disponible... consulta la
publicación original"). El resto de las menciones a "Sheet" en el código
(`useSheetData.js`, `sheetDataParser.js`, `campaigns.js`, comentarios,
mensajes de error de configuración en `BrandSelector.jsx`/
`useSheetData.js`) son técnicas o solo aparecen si falta la variable de
entorno / falla la carga — no se tocaron porque no son texto que el
cliente vea en uso normal. Vale la pena, con el dashboard corriendo,
un repaso visual de tooltips, subtítulos y estados vacíos en el resto de
las secciones (Overview, GoogleAdsSection, ProyeccionesSection,
Historical, SentimentSection) por si hay alguna frase similar que no se
detecta solo leyendo el código.

## Nota técnica para quien continúe

Este entorno tampoco tuvo acceso a red (`npm install` da 403 al intentar
contactar el registry), así que de nuevo **nada de esto se corrió con
`npm run dev` / `npm run build`**. A diferencia de la ronda anterior, esta
vez sí se pudo usar un `esbuild` ya instalado en el entorno (ajeno al
proyecto) para verificar que:
- Los 5 archivos tocados (`SocialSection.jsx`, `TikTokSection.jsx`,
  `Dashboard.jsx`, `PlatformSubnav.jsx`, `PostCard.jsx`) son JSX
  sintácticamente válidos.
- El árbol de imports relativos desde `src/App.jsx` resuelve completo sin
  rutas rotas (bundle con paquetes de npm marcados como externos).

Eso da bastante más confianza que una revisión puramente visual/diff, pero
sigue sin ser lo mismo que verlo correr: antes de dar por buena la
entrega, conviene levantar el proyecto (local o preview de Vercel) y
revisar visualmente, en particular:
- Las 3 pestañas nuevas (Paid Media, Top Post) en Facebook, Instagram y
  TikTok — que el subnav de 4 accesos no se vea apretado en mobile.
- El acordeón de "Desglose por campañas" — que abra/cierre bien y que los
  hallazgos se vean correctos adentro.
- Los Top Posts en la grilla nueva de hasta 4 columnas — ajustar
  `FACEBOOK_EMBED_WIDTH`/breakpoints a ojo si algo se ve recortado.
