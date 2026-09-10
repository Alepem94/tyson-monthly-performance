import { useState, useEffect, useMemo, useCallback } from 'react'
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { useSheetData } from '../hooks/useSheetData'
import { useDateFilter } from '../hooks/useDateFilter'
import { Overview } from '../components/sections/Overview'
import { Timeline } from '../components/sections/Timeline'
import { SocialSection, SocialPaidMediaSection, SocialTopPostSection } from '../components/sections/SocialSection'
import { TikTokSection, TikTokPaidMediaSection, TikTokTopPostSection } from '../components/sections/TikTokSection'
import { GoogleAdsSection } from '../components/sections/GoogleAdsSection'
import { SentimentSection } from '../components/sections/SentimentSection'
import { CompetenciaSection } from '../components/sections/CompetenciaSection'
import { HallazgosSection } from '../components/sections/HallazgosSection'
import { ProyeccionesSection } from '../components/sections/ProyeccionesSection'
import { PlatformHistory } from '../components/sections/Historical'
import { detectAvailableBuckets } from '../utils/campaigns'
import { exportDashboardPDF } from '../utils/exportPDF'
import { exportDashboardData } from '../utils/exportToExcel'

const brandThemes = {
  // Tyson Foods Mx — rojo y azul marino de marca, sobre un fondo bastante
  // más claro que el resto de las marcas (base más cargada al blanco).
  tyson: {
    primary: '#D2232A', secondary: '#00205B', bgBase: '#4A1E1E',
    focusColor: 'rgba(210, 35, 42, 0.45)',
    ambient1: 'rgba(210, 35, 42, 0.30)', ambient2: 'rgba(0, 32, 91, 0.22)',
    sidebarBg: 'rgba(58, 24, 24, 0.55)',
  },
}

const defaultTheme = {
  primary: '#6366f1', secondary: '#818cf8', bgBase: '#0a0a1a',
  focusColor: 'rgba(99, 102, 241, 0.35)',
  ambient1: 'rgba(79, 70, 229, 0.25)', ambient2: 'rgba(129, 140, 248, 0.15)',
  sidebarBg: 'rgba(10, 10, 26, 0.55)',
}

export function Dashboard() {
  const { marcaId } = useParams()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [filterMode, setFilterMode] = useState('month') // 'month' | 'range'
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [presentationMode, setPresentationMode] = useState(false)
  const [bucket, setBucket] = useState('mensual')
  const [exportStatus, setExportStatus] = useState(null)

  const {
    data, loading, error, refresh, isRefreshing,
    availableMonths, dateRange, isDailyData, brandConfig, features,
    partialErrors,
  } = useSheetData(marcaId)

  const baseTheme = brandThemes[marcaId] || defaultTheme
  const theme = brandConfig?.color_primario
    ? { ...baseTheme, primary: brandConfig.color_primario }
    : baseTheme

  // Auto-select first month
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, selectedMonth])

  // Auto-set date range when switching to range mode
  useEffect(() => {
    if (filterMode === 'range' && !startDate && dateRange) {
      // Default to last month's range
      const lastMonth = availableMonths[0]
      if (lastMonth) {
        const [y, m] = lastMonth.split('-').map(Number)
        const daysInMonth = new Date(y, m, 0).getDate()
        setStartDate(`${lastMonth}-01`)
        setEndDate(`${lastMonth}-${String(daysInMonth).padStart(2, '0')}`)
      }
    }
  }, [filterMode, startDate, dateRange, availableMonths])

  // Use date filter hook
  const { filtered: filteredData, historicalData } = useDateFilter(data, {
    mode: filterMode,
    selectedMonth,
    startDate,
    endDate,
  })

  const showMonthOnly = filteredData._showMonthOnly
  const showProyecciones = filteredData._showProyecciones

  // Available campaign buckets
  const availableBuckets = useMemo(
    () => detectAvailableBuckets(filteredData.campanas || []),
    [filteredData.campanas]
  )

  // PDF & Excel export — only available in month/period mode
  const canExport = filterMode === 'month'

  const handleExportPDF = useCallback(async () => {
    if (!canExport) return
    setExportStatus('Generando PDF…')
    try {
      await exportDashboardPDF({
        brandConfig,
        filteredData,
        allData: data,
        selectedMonth,
        features,
        onProgress: (step, total, label) => {
          setExportStatus(`Generando PDF… ${label} (${step}/${total})`)
        },
      })
      setExportStatus(null)
    } catch (err) {
      console.error('PDF export error:', err)
      setExportStatus('Error al exportar PDF')
      setTimeout(() => setExportStatus(null), 3000)
    }
  }, [canExport, brandConfig, filteredData, data, selectedMonth, features])

  const handleExportExcel = useCallback(async () => {
    if (!canExport) return
    setExportStatus('Generando Excel…')
    try {
      await exportDashboardData({
        brandConfig,
        filteredData,
        allData: data,
        selectedMonth,
        onProgress: setExportStatus,
      })
      setExportStatus(null)
    } catch (err) {
      console.error('Excel export error:', err)
      const message = err?.message ? `Error al exportar Excel: ${err.message}` : 'Error al exportar Excel'
      setExportStatus(message)
      setTimeout(() => setExportStatus(null), 6000)
    }
  }, [canExport, brandConfig, filteredData, data, selectedMonth])

  const handleRangeChange = useCallback((s, e) => {
    setStartDate(s)
    setEndDate(e)
  }, [])

  // Desde el timeline: fija el mes elegido y navega a la sección de detalle
  // correspondiente (Resumen por defecto, o la plataforma que se haya tocado).
  const handleNavigateFromTimeline = useCallback((mes, section = 'overview') => {
    setFilterMode('month')
    setSelectedMonth(mes)
    navigate(`/dashboard/${marcaId}/${section}`)
  }, [marcaId, navigate])

  const handleFilterModeChange = useCallback((mode) => {
    setFilterMode(mode)
    if (mode === 'month') {
      // Reset range
      setStartDate(null)
      setEndDate(null)
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="glass-card p-8 rounded-2xl text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-white/60 text-sm">{error}</p>
          <button onClick={refresh} className="mt-4 px-4 py-2 rounded-lg glass-strong text-sm">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Determine the "effective month" for sections that need it
  const effectiveMonth = filterMode === 'month'
    ? selectedMonth
    : (startDate ? startDate.slice(0, 7) : selectedMonth)

  return (
    <div className="min-h-screen text-white" style={{ background: theme.bgBase }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-60" style={{ background: theme.ambient1 }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-40" style={{ background: theme.ambient2 }} />
      </div>

      <div className="relative flex min-h-screen">
        <Sidebar
          marcaId={marcaId}
          brandConfig={brandConfig}
          theme={theme}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          features={features}
          showMonthOnly={showMonthOnly}
          bucket={bucket}
          setBucket={setBucket}
          availableBuckets={availableBuckets}
          presentationMode={presentationMode}
        />

        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <Header
            marcaId={marcaId}
            brandConfig={brandConfig}
            theme={theme}
            months={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            filterMode={filterMode}
            onFilterModeChange={handleFilterModeChange}
            startDate={startDate}
            endDate={endDate}
            onRangeChange={handleRangeChange}
            minDate={dateRange?.min}
            maxDate={dateRange?.max}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            presentationMode={presentationMode}
            setPresentationMode={setPresentationMode}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            isExporting={!!exportStatus}
            exportStatus={exportStatus}
            canExport={canExport}
          />

          {/* Partial load warning: some sheets failed after retries, so the
              sections that depend on them may show incomplete/empty data. */}
          {partialErrors && partialErrors.length > 0 && (
            <div className="px-4 md:px-6 pb-2">
              <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs px-3 py-2">
                <span className="font-semibold">Algunas pestañas del Sheet no cargaron:</span>{' '}
                {partialErrors.map(e => e.sheet).join(', ')}.{' '}
                Las secciones correspondientes pueden verse vacías o incompletas.{' '}
                <button onClick={refresh} className="underline hover:text-amber-100">
                  Reintentar carga
                </button>
              </div>
            </div>
          )}

          {/* Range mode indicator */}
          {filterMode === 'range' && (
            <div className="px-4 md:px-6 pb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Modo rango personalizado
                {!showMonthOnly && <span>· Secciones de análisis mensual ocultas</span>}
                {showProyecciones && <span>· Proyecciones visibles</span>}
              </div>
            </div>
          )}

          <div className="p-4 md:p-6 space-y-6">
            <Routes>
              <Route path="cronologia" element={
                <Timeline
                  data={data}
                  theme={theme}
                  loading={loading}
                  onNavigateMonth={handleNavigateFromTimeline}
                />
              } />

              <Route path="overview" element={
                <Overview
                  data={filteredData}
                  historical={historicalData}
                  selectedMonth={effectiveMonth}
                  loading={loading}
                  theme={theme}
                  features={features}
                  hallazgos={filteredData.hallazgos}
                  observaciones={filteredData.observaciones}
                  allCampanas={data.campanas || []}
                  allGoogleAds={data.googleAds || []}
                />
              } />

              <Route path="facebook" element={
                <SocialSection
                  platform="facebook"
                  data={filteredData.facebook}
                  campanas={filteredData.campanas}
                  allCampanas={data.campanas || []}
                  proyecciones={filteredData.proyecciones || []}
                  topPosts={filteredData.topPosts}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'facebook')}
                  historical={historicalData.facebook}
                  loading={loading}
                  theme={theme}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              <Route path="instagram" element={
                <SocialSection
                  platform="instagram"
                  data={filteredData.instagram}
                  campanas={filteredData.campanas}
                  allCampanas={data.campanas || []}
                  proyecciones={filteredData.proyecciones || []}
                  topPosts={filteredData.topPosts}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'instagram')}
                  historical={historicalData.instagram}
                  loading={loading}
                  theme={theme}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              <Route path="tiktok" element={
                <TikTokSection
                  data={filteredData.tiktok}
                  campanas={filteredData.campanas}
                  allCampanas={data.campanas || []}
                  proyecciones={filteredData.proyecciones || []}
                  topPosts={filteredData.topPosts}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'tiktok')}
                  historical={historicalData.tiktok}
                  loading={loading}
                  theme={theme}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              <Route path="facebook/paid-media" element={
                <SocialPaidMediaSection
                  platform="facebook"
                  data={filteredData.facebook}
                  campanas={filteredData.campanas}
                  allCampanas={data.campanas || []}
                  proyecciones={filteredData.proyecciones || []}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'facebook')}
                  loading={loading}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              <Route path="facebook/top-post" element={
                <SocialTopPostSection
                  platform="facebook"
                  topPosts={filteredData.topPosts}
                  loading={loading}
                />
              } />

              <Route path="instagram/paid-media" element={
                <SocialPaidMediaSection
                  platform="instagram"
                  data={filteredData.instagram}
                  campanas={filteredData.campanas}
                  allCampanas={data.campanas || []}
                  proyecciones={filteredData.proyecciones || []}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'instagram')}
                  loading={loading}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              <Route path="instagram/top-post" element={
                <SocialTopPostSection
                  platform="instagram"
                  topPosts={filteredData.topPosts}
                  loading={loading}
                />
              } />

              <Route path="tiktok/paid-media" element={
                <TikTokPaidMediaSection
                  data={filteredData.tiktok}
                  campanas={filteredData.campanas}
                  allCampanas={data.campanas || []}
                  proyecciones={filteredData.proyecciones || []}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'tiktok')}
                  loading={loading}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              <Route path="tiktok/top-post" element={
                <TikTokTopPostSection
                  topPosts={filteredData.topPosts}
                  loading={loading}
                />
              } />

              <Route path="facebook/historico" element={
                <PlatformHistory
                  platform="facebook"
                  historical={historicalData.facebook}
                  campanas={data.campanas || []}
                  currentMonth={effectiveMonth}
                  theme={theme}
                />
              } />

              <Route path="instagram/historico" element={
                <PlatformHistory
                  platform="instagram"
                  historical={historicalData.instagram}
                  campanas={data.campanas || []}
                  currentMonth={effectiveMonth}
                  theme={theme}
                />
              } />

              <Route path="tiktok/historico" element={
                <PlatformHistory
                  platform="tiktok"
                  historical={historicalData.tiktok}
                  campanas={data.campanas || []}
                  currentMonth={effectiveMonth}
                  theme={theme}
                />
              } />

              <Route path="google-ads" element={
                <GoogleAdsSection
                  data={filteredData.googleAds}
                  ciudades={filteredData.googleAdsCiudades}
                  keywords={filteredData.googleAdsKeywords}
                  proyecciones={filteredData.proyecciones || []}
                  selectedMonth={effectiveMonth}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'google-ads')}
                  loading={loading}
                  hallazgos={filteredData.hallazgos}
                />
              } />

              {showMonthOnly && (
                <>
                  <Route path="facebook/competencia" element={
                    <CompetenciaSection
                      platform="facebook"
                      allData={data.competencia || []}
                      selectedMonth={effectiveMonth}
                      brandId={marcaId}
                      brandConfig={brandConfig}
                      loading={loading}
                    />
                  } />

                  <Route path="instagram/competencia" element={
                    <CompetenciaSection
                      platform="instagram"
                      allData={data.competencia || []}
                      selectedMonth={effectiveMonth}
                      brandId={marcaId}
                      brandConfig={brandConfig}
                      loading={loading}
                    />
                  } />

                  <Route path="tiktok/competencia" element={
                    <CompetenciaSection
                      platform="tiktok"
                      allData={data.competencia || []}
                      selectedMonth={effectiveMonth}
                      brandId={marcaId}
                      brandConfig={brandConfig}
                      loading={loading}
                    />
                  } />

                  <Route path="sentiment" element={
                    <SentimentSection
                      data={filteredData.sentiment}
                      capturas={filteredData.sentimentCapturas}
                      observaciones={filteredData.observaciones?.filter(o => o.seccion === 'sentiment')}
                      loading={loading}
                      theme={theme}
                    />
                  } />


                  <Route path="hallazgos" element={
                    <HallazgosSection
                      data={[
                        ...(filteredData.hallazgos || []).filter(h => String(h.seccion || '').toLowerCase() === 'conclusiones'),
                        ...(filteredData.observaciones || []).filter(o => String(o.seccion || '').toLowerCase() === 'conclusiones'),
                      ]}
                      loading={loading}
                      theme={theme}
                    />
                  } />
                </>
              )}

              <Route path="proyecciones" element={
                <ProyeccionesSection
                  data={filteredData.proyecciones || []}
                  allData={(data && data.proyecciones) || []}
                  proyeccionesCampana={filteredData.proyeccionesCampana || []}
                  selectedMonth={effectiveMonth}
                  allCampanas={(data && data.campanas) || []}
                  googleAdsData={(data && data.googleAds) || []}
                  observaciones={filteredData.observaciones?.filter(o => o.seccion === 'proyecciones')}
                  loading={loading}
                  theme={theme}
                  bucket={bucket}
                />
              } />

              <Route path="*" element={<Navigate to="cronologia" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
