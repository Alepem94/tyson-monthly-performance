import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useCountUp } from '../../hooks/useCountUp'
import { formatNumber, truncTo } from '../../utils/format'

// Siglas estandarizadas para comparaciones — ver <ComparisonLegend/> para la nota completa.
export const COMPARISON_LABELS = {
  ma: { sigla: 'MA', full: 'vs. Mes Anterior' },
  aa: { sigla: 'AA', full: 'vs. Año Anterior (mismo mes)' },
  proy: { sigla: 'PROY', full: 'vs. Proyección / meta del mes' },
}

export function VariationBadge({ value, kind = 'ma', lowerIsBetter = false }) {
  const num = parseFloat(value)
  if (isNaN(num)) return null
  const isPos = num > 0
  const isNeg = num < 0
  const isGood = lowerIsBetter ? isNeg : isPos
  const isBad = lowerIsBetter ? isPos : isNeg
  const { sigla, full } = COMPARISON_LABELS[kind] || COMPARISON_LABELS.ma
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold max-w-full min-w-0
        ${isGood ? 'badge-positive' : ''}
        ${isBad ? 'badge-negative' : ''}
        ${!isPos && !isNeg ? 'badge-neutral' : ''}`}
      title={full}
    >
      {isPos && <TrendingUp className="w-3 h-3 shrink-0" />}
      {isNeg && <TrendingDown className="w-3 h-3 shrink-0" />}
      {!isPos && !isNeg && <Minus className="w-2.5 h-2.5 shrink-0" />}
      <span className="font-bold shrink-0">{isPos ? '+' : ''}{truncTo(num, 2)}%</span>
      <span className="opacity-70 ml-0.5 shrink-0">{sigla}</span>
    </div>
  )
}

// Nota aclaratoria — colocar una vez por sección donde aparezcan estas siglas
// (por ejemplo, al pie de Paid Media), no en cada card.
export function ComparisonLegend({ className = '' }) {
  return (
    <p className={`text-[11px] text-white/35 ${className}`}>
      <span className="font-semibold text-white/45">MA</span> = mes anterior ·{' '}
      <span className="font-semibold text-white/45">AA</span> = mismo mes, año anterior ·{' '}
      <span className="font-semibold text-white/45">PROY</span> = meta/proyección del mes ·{' '}
      <span className="font-semibold text-white/45">RTR</span> = tasa de resultado definida en Proyecciones
    </p>
  )
}

/**
 * KPI Card with:
 *   - Animated count-up number
 *   - Optional sparkline trend (last N months)
 *   - Up to 2 variation badges (vs period / vs projection)
 *   - Glass card with hover lift
 */
export function KPICard({
  title,
  value,
  variation,           // % change vs previous period
  variationProj,       // % change vs projection (optional second badge)
  variationYear,       // % change vs same month previous year
  lowerIsBetter = false, // true for cost metrics such as CPR/CPM/CPI/CPV
  subtitle,
  icon: Icon,
  prefix = '',
  suffix = '',
  delay = 0,
  trendData = null,
  accentColor = '#ffffff',
  formatter = null,
}) {
  const numValue = parseFloat(value)
  const isCountable = !isNaN(numValue) && Math.abs(numValue) < 1e9
  const valueDecimals = String(value).includes('.') ? (String(value).split('.')[1] || '').length : 0
  const animated = useCountUp(isCountable ? numValue : 0, { duration: 1200, decimals: valueDecimals })
  const display = isCountable
    ? (formatter ? formatter(animated) : formatNumber(animated))
    : value

  const hasVar   = variation !== null && variation !== undefined && !isNaN(parseFloat(variation))
  const hasProj  = variationProj !== null && variationProj !== undefined && !isNaN(parseFloat(variationProj))
  const hasYear  = variationYear !== null && variationYear !== undefined && !isNaN(parseFloat(variationYear))
  const numVar   = hasVar ? parseFloat(variation) : 0

  const trendColor = hasVar ? ((lowerIsBetter ? numVar < 0 : numVar > 0) ? '#22c55e' : (lowerIsBetter ? numVar > 0 : numVar < 0) ? '#ef4444' : accentColor) : accentColor
  const trendId = `spark-${title.replace(/\s/g, '')}-${delay}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: delay * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card relative overflow-hidden rounded-2xl p-5 group"
    >
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50"
        style={{ background: accentColor }}
      />

      <div className="relative">
        {/* Icon + badges row */}
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: `${accentColor}22`,
                boxShadow: `inset 0 0 0 1px ${accentColor}33`,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: accentColor }} />
            </div>
          )}

          {(hasVar || hasProj || hasYear) && (
            <div className="flex flex-col items-end gap-1 min-w-0 max-w-[62%]">
              {hasVar && <VariationBadge value={variation} kind="ma" lowerIsBetter={lowerIsBetter} />}
              {hasProj && <VariationBadge value={variationProj} kind="proy" lowerIsBetter={lowerIsBetter} />}
              {hasYear && <VariationBadge value={variationYear} kind="aa" lowerIsBetter={lowerIsBetter} />}
            </div>
          )}
        </div>

        <p className="text-[11px] font-semibold text-white/55 mb-1.5 uppercase tracking-wider">
          {title}
        </p>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-3xl font-bold font-display text-white tracking-tight">
            {prefix}{display}{suffix}
          </span>
        </div>

        {subtitle && (
          <p className="text-xs text-white/50 mb-3">{subtitle}</p>
        )}

        {trendData && trendData.length > 1 && (
          <div className="mt-3 h-10 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id={trendId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={trendColor}
                  strokeWidth={2}
                  fill={`url(#${trendId})`}
                  isAnimationActive
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function KPICardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 h-[160px]">
      <div className="w-10 h-10 rounded-xl skeleton mb-4" />
      <div className="h-3 w-20 skeleton rounded mb-2" />
      <div className="h-8 w-28 skeleton rounded mb-2" />
      <div className="h-10 w-full skeleton rounded mt-3" />
    </div>
  )
}
