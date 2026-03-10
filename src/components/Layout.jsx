import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, BookOpen, Users, MessageCircle, Settings, Dumbbell } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',        icon: Home,          label: 'Home'     },
  { to: '/calendar',icon: Calendar,      label: 'Calendar' },
  { to: '/drills',  icon: Dumbbell,      label: 'Drills'   },
  { to: '/players', icon: Users,         label: 'Players'  },
  { to: '/ai',      icon: MessageCircle, label: 'AI Coach' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto relative">
      {/* ── Top header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-green-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="text-xs text-green-600 font-medium tracking-wide uppercase leading-none">U-6 Season 2026</p>
            <h1 className="font-display font-bold text-gray-900 text-lg leading-tight">Coach Command</h1>
          </div>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `p-2 rounded-xl transition-colors ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`
          }
        >
          <Settings size={20} />
        </NavLink>
      </header>

      {/* ── Main content ────────────────────────────────── */}
      <main className="flex-1 pb-24 px-4 py-4 overflow-y-auto animate-fade-in">
        <Outlet />
      </main>

      {/* ── Bottom navigation ────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 bg-white border-t border-green-100 nav-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-green-700'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all duration-150 ${isActive ? 'bg-green-100' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-green-700' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
