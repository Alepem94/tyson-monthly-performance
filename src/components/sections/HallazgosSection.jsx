import { motion } from 'framer-motion'
import { Brain, Check, Sparkles, Lightbulb } from 'lucide-react'
import { SectionHeader, EmptyState } from '../ui/SectionHeader'

const ACCENT = '#facc15'

const norm = v => String(v || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const OPPORTUNITY_TYPES = new Set(['oportunidad', 'oportunidades', 'opportunity'])

function bullets(item) {
  return String(item?.descripcion || item?.observacion || '')
    .split(/\r?\n/)
    .map(s => s.trim().replace(/^(?:[-•*·]|\d+[.)])\s*/, ''))
    .filter(Boolean)
}

// La sección final SOLO lee lo que se capturó específicamente como
// "conclusiones" (seccion === 'conclusiones' en Hallazgos/Observaciones).
// Todo lo demás ya se mostró en su propia página del recorrido — mostrarlo
// aquí también sería repetir la misma junta dos veces.
export function HallazgosSection({ data = [], loading, theme }) {
  if (loading) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="rounded-2xl skeleton h-64" />)}</div>
  }

  const items = (data || []).filter(h =>
    (String(h.titulo || '').trim() || bullets(h).length > 0)
  )

  if (!items.length) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={Sparkles} title="Hallazgos & Conclusiones" subtitle="Cierre del mes" accentColor={ACCENT} />
        <EmptyState icon={Sparkles} title="Sin conclusiones registradas" message="Agrega filas con seccion = 'conclusiones' en Hallazgos u Observaciones para verlas aquí." />
      </div>
    )
  }

  const opportunities = items.filter(h => OPPORTUNITY_TYPES.has(norm(h.tipo)))
  const observationsAndLearnings = items.filter(h => !OPPORTUNITY_TYPES.has(norm(h.tipo)))

  return (
    <div className="space-y-7">
      <SectionHeader
        icon={Brain}
        title="Hallazgos & Conclusiones"
        subtitle="Cierre del mes — a manera de conclusión"
        accentColor={ACCENT}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConclusionColumn
          title="Observaciones y aprendizajes"
          subtitle="Qué nos llevamos de este mes"
          items={observationsAndLearnings}
          accent="#60a5fa"
          icon={Check}
        />
        <ConclusionColumn
          title="Oportunidades"
          subtitle="En qué enfocarnos hacia adelante"
          items={opportunities}
          accent="#38bdf8"
          icon={Lightbulb}
        />
      </div>
    </div>
  )
}

function ConclusionColumn({ title, subtitle, items, accent, icon: Icon }) {
  if (!items.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-start gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${accent}16`, color: accent }}><Icon className="w-4 h-4" /></span>
          <div><h3 className="text-sm font-bold font-display text-white">{title}</h3><p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p></div>
        </div>
        <p className="text-xs text-white/30 pl-11">Sin elementos este mes.</p>
      </section>
    )
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start gap-3 mb-5">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${accent}16`, color: accent }}><Icon className="w-4 h-4" /></span>
        <div><h3 className="text-sm font-bold font-display text-white">{title}</h3><p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p></div>
      </div>
      <div className="space-y-3">
        {items.map((h, i) => (
          <motion.div key={`${h.titulo}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            {h.titulo && <p className="text-sm font-semibold text-white leading-snug mb-2">{h.titulo}</p>}
            <BulletList items={bullets(h)} accent={accent} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function BulletList({ items, accent }) {
  if (!items?.length) return null
  return <ul className="mt-1 space-y-1.5">{items.map((item, i) => <li key={`${item}-${i}`} className="flex gap-2 text-xs sm:text-sm text-white/60 leading-relaxed"><span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} /><span>{item}</span></li>)}</ul>
}
