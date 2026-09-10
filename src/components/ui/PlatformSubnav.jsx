import { NavLink, useParams } from 'react-router-dom'

export function PlatformSubnav({ platform, accent = '#a78bfa' }) {
  const { marcaId } = useParams()

  const items = [
    { to: `/dashboard/${marcaId}/${platform}`, label: 'Desempeño', end: true },
    { to: `/dashboard/${marcaId}/${platform}/paid-media`, label: 'Paid Media', end: false },
    { to: `/dashboard/${marcaId}/${platform}/top-post`, label: 'Top Post', end: false },
    { to: `/dashboard/${marcaId}/${platform}/competencia`, label: 'Competencia', end: false },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.025] w-fit">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              isActive ? 'text-white shadow-sm' : 'text-white/45 hover:text-white/80 hover:bg-white/5'
            }`
          }
          style={({ isActive }) => isActive ? {
            background: `${accent}18`,
            border: `1px solid ${accent}45`,
          } : { border: '1px solid transparent' }}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
