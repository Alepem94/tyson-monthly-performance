# Bitácora — Cambio de Competencia

## Alcance

Se modificó exclusivamente la arquitectura y lógica de la sección **Competencia**. No se tocaron las demás secciones funcionales del dashboard.

## Cambios aplicados

### 1. Navegación
- Se eliminó `Competencia` como elemento independiente del Sidebar.
- Se agregaron accesos de subsección dentro de:
  - Facebook → Competencia
  - Instagram → Competencia
  - TikTok → Competencia
- Se creó `PlatformSubnav` para reutilizar la navegación de cada plataforma.
- Se agregaron las rutas:
  - `/dashboard/:marcaId/facebook/competencia`
  - `/dashboard/:marcaId/instagram/competencia`
  - `/dashboard/:marcaId/tiktok/competencia`

### 2. Fuente de datos
La pestaña `Competencia` sigue siendo la fuente y ahora se reconocen los campos:
- `marca`
- `mes`
- `competidor`
- `red`
- `seguidores`
- `crecimiento_pct`
- `posts`
- `engagement_pct`
- `interaccion`

Se agregaron aliases para crecimiento e interacción y se normalizan como valores numéricos.

### 3. Benchmark trimestral
La lógica está separada en `src/utils/competitionAnalytics.js`.

Para cada mes seleccionado:
- Julio, agosto y septiembre → benchmark de abril-junio.
- Octubre, noviembre y diciembre → benchmark de julio-septiembre.
- Enero de 2027 → benchmark de octubre-diciembre de 2026.
- Y así sucesivamente.

El promedio considera marca + competidores, únicamente de la misma plataforma.

Para porcentajes se calcula el promedio de los valores de origen; no se suman porcentajes.

### 4. KPI Cards
La vista de Competencia muestra:
- Crecimiento de comunidad
- Posts publicados
- Interacción total
- Engagement Rate

Cada tarjeta presenta:
- Resultado del mes de la marca.
- Benchmark del trimestre anterior.
- Variación porcentual contra el benchmark.

### 5. Ranking competitivo
Se agregó un selector de KPI:
- Seguidores
- Crecimiento de comunidad
- Posts publicados
- Interacción total
- Engagement Rate

El ranking se calcula con el mes seleccionado, no con el trimestre.

La marca se identifica usando `marcaId` y el nombre configurado de la marca, evitando hardcodear competidores.

Cada competidor muestra su variación porcentual contra la marca.

### 6. Detalle completo
Se agregó una tabla con todos los KPIs de la nueva estructura del Sheet:
- Seguidores
- Crecimiento
- Posts
- Interacción
- Engagement Rate

### 7. Manejo de datos
- Los porcentajes decimales del Sheet, como `0.043`, se muestran como `4.30%`.
- Los valores faltantes no se convierten a cero durante el promedio del benchmark cuando el campo realmente no existe.
- Si no hay trimestre anterior, se muestra `Benchmark no disponible`.
- Si faltan meses del trimestre, se indica `datos parciales`.
- Se evita división entre cero.
- La lógica es independiente del año y funciona con el cambio de trimestre y de año.

## Archivos modificados

- `src/pages/Dashboard.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/sections/CompetenciaSection.jsx`
- `src/components/sections/SocialSection.jsx`
- `src/components/sections/TikTokSection.jsx`
- `src/components/ui/PlatformSubnav.jsx` (nuevo)
- `src/utils/competitionAnalytics.js` (nuevo)
- `src/utils/sheetDataParser.js`
- `src/utils/sheetConfig.js`

## Validación

El entorno disponible para esta edición no contiene Node.js/npm, por lo que no fue posible ejecutar `npm run build` dentro de este entorno.

Se realizó revisión estática de los archivos modificados y comparación contra el repositorio original. No se modificaron dependencias ni la conexión al Google Sheet.
