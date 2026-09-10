import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Facebook, Instagram, Music2, Megaphone,
  MessageSquare, Sparkles, ChevronLeft, ChevronRight, ArrowLeft,
  LineChart, Calendar, Flag,
} from 'lucide-react'
import { displayBrandName } from '../../utils/brands'

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: 'cronologia', label: 'Cronología', icon: Calendar, feature: null },
    ],
  },
  {
    label: 'Mensual',
    items: [
      { to: 'overview',     label: 'Resumen',      icon: LayoutDashboard, feature: null },
      { to: 'facebook',     label: 'Facebook',     icon: Facebook,        feature: null },
      { to: 'instagram',    label: 'Instagram',    icon: Instagram,       feature: null },
      { to: 'tiktok',       label: 'TikTok',        icon: Music2,          feature: null },
      { to: 'google-ads',   label: 'Google Ads',   icon: Megaphone,       feature: 'googleAds' },
      { to: 'sentiment',    label: 'Sentiment',    icon: MessageSquare,   feature: 'sentiment' },
      { to: 'hallazgos',    label: 'Hallazgos',    icon: Sparkles,        feature: null },
    ],
  },
  {
    label: 'Campañas',
    items: [
      { to: 'campanas',     label: 'Campañas',      icon: Flag,            feature: null },
      { to: 'proyecciones', label: 'Proyecciones',  icon: LineChart,       feature: null },
    ],
  },
]

const MONTH_ONLY_ITEMS = new Set(['sentiment', 'hallazgos'])

export function Sidebar({ brandConfig, theme, collapsed, setCollapsed, features = {}, showMonthOnly = true }) {
  const { marcaId } = useParams()
  const navigate = useNavigate()

  const navGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.feature && features[item.feature] === false) return false
        if (!showMonthOnly && MONTH_ONLY_ITEMS.has(item.to)) return false
        return true
      }),
    }))
    .filter(group => group.items.length > 0)

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 transition-all duration-300 sidebar-hideable ${
        collapsed ? 'w-20' : 'w-[260px]'
      }`}
      style={{
        background: theme.sidebarBg || 'rgba(0,0,0,0.40)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-3 mb-6 mt-1 px-1">
          {brandConfig?.logo_url && (
            <div className="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
              <img
                src={brandConfig.logo_url}
                alt={brandConfig.nombre}
                className="w-9 h-9 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-white/45 font-semibold">Marca</p>
              <p className="text-sm font-bold text-white truncate font-display">{displayBrandName(marcaId, brandConfig?.nombre)}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Cambiar marca</span>}
        </button>

        <nav className="flex-1 overflow-y-auto -mx-2 px-2">
          {navGroups.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.label && !collapsed && (
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-3 pt-4 pb-1">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && (
                <div className="h-px bg-white/8 mx-3 my-2" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={`/dashboard/${marcaId}/${item.to}`}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isActive ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="active-pill"
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: `linear-gradient(135deg, ${theme.primary}33, ${theme.primary}11)`,
                              border: `1px solid ${theme.primary}55`,
                              boxShadow: `0 4px 16px -4px ${theme.primary}55`,
                            }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                          />
                        )}
                        <Icon className="w-4 h-4 flex-shrink-0 relative" />
                        {!collapsed && <span className="relative">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Contraer</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
