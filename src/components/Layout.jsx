import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, BookOpen, Users, MessageCircle, Settings, Dumbbell } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/drills', icon: Dumbbell, label: 'Drills' },
  { to: '/philosophy', icon: BookOpen, label: 'Philosophy' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/ai', icon: MessageCircle, label: 'AI Coach' },
]

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto relative">
      {/* ── Top header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-emerald flex items-center justify-center shadow-lg">
            <span className="text-lg">⚽</span>
          </div>
          <div>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase leading-none">U-6 Season 2026</p>
            <h1 className="font-display font-bold text-slate-100 text-lg leading-tight">Coach Command</h1>
          </div>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`
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
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 glass-nav nav-safe">
        <div className="flex items-center justify-around px-1 py-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${isActive
                  ? 'text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : ''}`}>
                    <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
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
