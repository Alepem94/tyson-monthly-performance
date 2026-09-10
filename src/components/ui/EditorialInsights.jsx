import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Brain, Check, ChevronRight, Lightbulb, X } from 'lucide-react'

const norm = v => String(v || '')
  .toLowerCase()
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const KEY_TYPES = new Set(['clave', 'key', 'key insight', 'hallazgo clave', 'headline', 'resumen'])
const OBS_TYPES = new Set(['observacion', 'observation', 'observaciones'])
const LEARNING_TYPES = new Set(['aprendizaje', 'learning', 'aprendizajes'])

function isType(item, types) {
  return types.has(norm(item?.tipo))
}

function cleanBullet(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .map(s => s.replace(/^(?:[-•*·]|\d+[.)])\s*/, ''))
    .filter(Boolean)
}

function itemBullets(item) {
  return cleanBullet(item?.descripcion || item?.observacion || '')
}


export function mergeLegacyObservations(hallazgos = [], observaciones = []) {
  const base = Array.isArray(hallazgos) ? hallazgos : []
  const legacy = (Array.isArray(observaciones) ? observaciones : []).map((o, i) => ({
    ...o,
    tipo: o.tipo || 'observacion',
    _legacyObservation: true,
    _legacyId: i,
  }))
  return [...base, ...legacy]
}

export function splitEditorialInsights(items = []) {
  const valid = (Array.isArray(items) ? items : [items]).filter(Boolean).filter(item =>
    String(item?.titulo || '').trim() || String(item?.descripcion || item?.observacion || '').trim()
  )

  const key = valid.filter(item => isType(item, KEY_TYPES))
  const observations = valid.filter(item => isType(item, OBS_TYPES))
  const learnings = valid.filter(item => isType(item, LEARNING_TYPES))
  const legacy = valid.filter(item => !KEY_TYPES.has(norm(item?.tipo)) && !OBS_TYPES.has(norm(item?.tipo)) && !LEARNING_TYPES.has(norm(item?.tipo)))

  return { valid, key, observations, learnings, legacy }
}

// Compact, title-focused strip for account-level "hallazgos clave" — caps at
// 3 items and only shows tipo=clave, on purpose: this lives on the Overview
// page and should read in 5 seconds, not repeat the detail shown later on
// each platform's own page.
export function KeyFindingsStrip({ items = [], accent = '#facc15', max = 3 }) {
  const { key } = useMemo(() => splitEditorialInsights(items), [items])
  const top = key.slice(0, max)
  if (!top.length) return null

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${top.length >= 3 ? 'lg:grid-cols-3' : ''} gap-3`}>
      {top.map((item, i) => (
        <motion.div
          key={`${item.titulo || i}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4"
        >
          <div className="absolute inset-y-3 left-0 w-[2px] rounded-r-full" style={{ background: accent }} />
          <div className="pl-2">
            <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: accent }}>Hallazgo clave</span>
            <p className="text-sm font-semibold font-display text-white leading-snug mt-1.5">{item.titulo || 'Hallazgo'}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function EditorialInsightCard({ items = [], accent = '#facc15', compact = false, className = '' }) {
  const { key, observations, learnings, legacy } = useMemo(() => splitEditorialInsights(items), [items])
  const rows = [
    ...key.map(item => ({ ...item, _kind: 'Hallazgo clave' })),
    ...observations.map(item => ({ ...item, _kind: 'Observación' })),
    ...learnings.map(item => ({ ...item, _kind: 'Aprendizaje' })),
    ...legacy.map(item => ({ ...item, _kind: item.tipo || 'Hallazgo' })),
  ]
  if (!rows.length) return null

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] ${compact ? 'p-4' : 'p-5'} ${className}`}>
      <div className="absolute -top-24 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15" style={{ background: accent }} />
      <div className="relative">
        <div className="mb-4">
          <h3 className="text-sm font-bold font-display text-white">Hallazgos Clave</h3>
          <p className="text-[11px] text-white/40 mt-0.5">Top insights del mes</p>
        </div>

        <div className="space-y-1">
          {rows.map((item, i) => {
            const description = cleanBullet(item?.descripcion || item?.observacion || '').join(' · ')
            const kind = norm(item._kind)
            const isObservation = kind.includes('observacion')
            const isLearning = kind.includes('aprendizaje')
            const itemAccent = isObservation ? '#60a5fa' : isLearning ? '#34d399' : accent
            return (
              <motion.div
                key={`${item.titulo || item.descripcion || i}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-white/[0.035] transition-colors"
              >
                <span
                  className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                  style={{ background: `${itemAccent}14`, border: `1px solid ${itemAccent}35` }}
                >
                  <Lightbulb className="w-4 h-4" style={{ color: itemAccent }} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold font-display text-white leading-snug">
                    {item.titulo || description || 'Hallazgo'}
                  </p>
                  {description && item.titulo && (
                    <p className="text-xs text-white/45 mt-1 leading-relaxed line-clamp-2">{description}</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PaidMediaExecutiveCard({ items = [], accent = '#facc15' }) {
  const { key, observations, learnings, legacy } = useMemo(() => splitEditorialInsights(items), [items])
  const headline = key[0] || legacy[0] || observations[0] || learnings[0]
  if (!headline) return null

  const bullets = [
    ...observations.flatMap(itemBullets),
    ...learnings.flatMap(itemBullets),
    ...legacy.slice(1).flatMap(itemBullets),
  ]
  const clean = [...new Set(bullets)].filter(Boolean).slice(0, 5)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 h-full">
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-15" style={{ background: accent }} />
      <div className="relative h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `${accent}16`, border: `1px solid ${accent}30` }}>
            <Lightbulb className="w-3.5 h-3.5" style={{ color: accent }} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: accent }}>Lectura de Paid Media</p>
            <p className="text-[11px] text-white/35">Hallazgo ejecutivo</p>
          </div>
        </div>
        <h3 className="text-sm sm:text-[15px] font-semibold font-display text-white leading-snug mt-2">
          {headline.titulo || headline.descripcion || headline.observacion}
        </h3>
        {clean.length > 0 && (
          <ul className="mt-4 space-y-2">
            {clean.map((bullet, i) => (
              <li key={`${bullet}-${i}`} className="flex gap-2 text-xs text-white/55 leading-relaxed">
                <span className="mt-[0.42rem] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function BreakdownInsightsAccordion({ items = [], accent = '#facc15', label = 'Observaciones del desglose' }) {
  const [open, setOpen] = useState(false)
  const { observations, learnings, legacy } = useMemo(() => splitEditorialInsights(items), [items])
  const obsBullets = observations.flatMap(itemBullets)
  const learningBullets = learnings.flatMap(itemBullets)
  const fallback = legacy.flatMap(itemBullets)
  const total = obsBullets.length + learningBullets.length + fallback.length
  if (!total) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: accent }}>{label}</p>
          <p className="text-xs text-white/40 mt-0.5">{total} {total === 1 ? 'hallazgo disponible' : 'hallazgos disponibles'}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/8"
          >
            <div className="p-4 space-y-5 max-h-[360px] overflow-y-auto">
              {obsBullets.length > 0 && <InsightList title="Observaciones" icon={<ArrowUpRight className="w-3.5 h-3.5" />} accent={accent} bullets={obsBullets} />}
              {learningBullets.length > 0 && <InsightList title="Aprendizajes" icon={<Check className="w-3.5 h-3.5" />} accent={accent} bullets={learningBullets} />}
              {obsBullets.length === 0 && learningBullets.length === 0 && fallback.length > 0 && <InsightList title="Hallazgos" icon={<Lightbulb className="w-3.5 h-3.5" />} accent={accent} bullets={fallback} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PlatformInsightsCard({ items = [], accent = '#facc15', label = 'Hallazgos' }) {
  const [open, setOpen] = useState(false)
  const { key, observations, learnings, legacy } = useMemo(() => splitEditorialInsights(items), [items])
  const headline = key[0] || legacy[0] || observations[0] || learnings[0]
  if (!headline) return null

  const obsBullets = observations.flatMap(itemBullets)
  const learningBullets = learnings.flatMap(itemBullets)
  const fallbackBullets = legacy.slice(1).flatMap(itemBullets)
  const total = obsBullets.length + learningBullets.length + fallbackBullets.length

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="absolute inset-y-0 left-0 w-[2px]" style={{ background: accent }} />
        <div className="flex items-start justify-between gap-4 pl-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: accent }}>Hallazgo clave</span>
            </div>
            <p className="text-sm sm:text-[15px] font-semibold font-display text-white leading-snug line-clamp-3">
              {headline.titulo || headline.descripcion || headline.observacion}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold border transition-all hover:bg-white/10"
            style={{ color: accent, borderColor: `${accent}35`, background: `${accent}0c` }}
          >
            {label}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {total > 0 && (
          <div className="mt-3 pl-2 flex items-center gap-2 text-[10px] text-white/38">
            <span>{total} {total === 1 ? 'hallazgo' : 'hallazgos'} adicionales</span>
            <span>·</span>
            <span>Observaciones + aprendizajes</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[82vh] overflow-hidden rounded-2xl border border-white/12 bg-[#111117]/95 shadow-2xl flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Brain className="w-4 h-4" style={{ color: accent }} />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: accent }}>{label}</span>
                  </div>
                  <h3 className="text-lg font-semibold font-display text-white">{headline.titulo || 'Análisis del periodo'}</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                    <h4 className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/45">Hallazgo clave</h4>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <p className="text-sm text-white/85 leading-relaxed">{headline.titulo || headline.descripcion || headline.observacion}</p>
                  </div>
                </section>

                {obsBullets.length > 0 && (
                  <InsightList title="Observaciones" icon={<ArrowUpRight className="w-3.5 h-3.5" />} accent={accent} bullets={obsBullets} />
                )}
                {learningBullets.length > 0 && (
                  <InsightList title="Aprendizajes" icon={<Check className="w-3.5 h-3.5" />} accent={accent} bullets={learningBullets} />
                )}
                {obsBullets.length === 0 && learningBullets.length === 0 && fallbackBullets.length > 0 && (
                  <InsightList title="Hallazgos" icon={<Lightbulb className="w-3.5 h-3.5" />} accent={accent} bullets={fallbackBullets} />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function InsightList({ title, icon, accent, bullets }) {
  const clean = [...new Set(bullets)].filter(Boolean)
  if (!clean.length) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md" style={{ background: `${accent}14`, color: accent }}>
          {icon}
        </span>
        <h4 className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/50">{title}</h4>
      </div>
      <ul className="space-y-2">
        {clean.map((bullet, i) => (
          <li key={`${bullet}-${i}`} className="flex gap-3 rounded-xl border border-white/7 bg-white/[0.018] px-4 py-3 text-sm text-white/68 leading-relaxed">
            <span className="mt-[0.48rem] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
