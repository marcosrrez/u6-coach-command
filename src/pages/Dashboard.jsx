import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, isToday, isFuture, isPast, differenceInDays } from 'date-fns'
import { ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { ALL_SESSIONS, SEASON_INFO, PRACTICES, GAMES } from '../data/sessions'
import { getCompletedSessionIds } from '../db/db'

const FRAMEWORK_COLORS = {
  Barça: 'bg-blue-500/20 text-blue-300',
  Arsenal: 'bg-red-500/20 text-red-300',
  Ajax: 'bg-amber-500/20 text-amber-300',
  Coerver: 'bg-violet-500/20 text-violet-300',
  Funino: 'bg-teal-500/20 text-teal-300',
  Universal: 'bg-slate-500/20 text-slate-300',
}

const HEART_COLORS = {
  'H — Humility': { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '🤲' },
  'E — Effort': { bg: 'bg-red-500/10', text: 'text-red-400', icon: '💪' },
  'A — Ambition': { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '🎯' },
  'R — Respect': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '🤝' },
  'T — Teamwork': { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: '⭐' },
}

function SessionCard({ session, completed, navigate }) {
  const isGame = session.type === 'game'
  const heartStyle = HEART_COLORS[session.heartValue] || HEART_COLORS['H — Humility']

  return (
    <button
      onClick={() => navigate(isGame ? `/game/${session.id}` : `/session/${session.id}`)}
      className="w-full text-left glass-card-solid p-4 hover-lift transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{isGame ? '🏆' : '⚽'}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGame ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {isGame ? `Game ${session.gameNumber}` : `Practice ${session.sessionNumber}`}
            </span>
            {completed && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 flex items-center gap-1">
                <CheckCircle2 size={10} /> Done
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-slate-100 text-base leading-tight truncate">{session.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{session.subtitle || session.focus}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!isGame && session.frameworks?.slice(0, 2).map(fw => (
              <span key={fw} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[fw] || 'bg-slate-500/20 text-slate-300'}`}>
                {fw}
              </span>
            ))}
            {!isGame && session.heartValue && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${heartStyle.bg} ${heartStyle.text}`}>
                {heartStyle.icon} {session.heartValue.split(' — ')[1]}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ChevronRight size={16} className="text-slate-600" />
          {!isGame && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={11} /> {session.duration}m
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [completedIds, setCompletedIds] = useState(new Set())
  const today = new Date()

  useEffect(() => {
    getCompletedSessionIds().then(setCompletedIds)
  }, [])

  const { todaySession, nextSession, recentSessions, stats } = useMemo(() => {
    const sorted = [...ALL_SESSIONS].sort((a, b) => a.date.localeCompare(b.date))

    let todaySession = sorted.find(s => isToday(parseISO(s.date)))
    let upcomingSessions = sorted.filter(s => isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))
    let nextSession = upcomingSessions.find(s => !isToday(parseISO(s.date)))
    let recentSessions = sorted
      .filter(s => isPast(parseISO(s.date)) && !isToday(parseISO(s.date)))
      .slice(-3)
      .reverse()

    const completed = sorted.filter(s => completedIds.has(s.id)).length
    const total = sorted.length
    const daysLeft = differenceInDays(parseISO(SEASON_INFO.endDate), today)
    const practicesLeft = PRACTICES.filter(p => isFuture(parseISO(p.date)) || isToday(parseISO(p.date))).length
    const gamesLeft = GAMES.filter(g => isFuture(parseISO(g.date)) || isToday(parseISO(g.date))).length

    return {
      todaySession,
      nextSession: nextSession || upcomingSessions[0],
      recentSessions,
      stats: { completed, total, daysLeft, practicesLeft, gamesLeft }
    }
  }, [completedIds])

  const progressPct = Math.round((stats.completed / stats.total) * 100)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Season progress hero ───────────────────────── */}
      <div className="pitch-bg rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">Season 2026</p>
              <h2 className="font-display font-bold text-2xl mt-0.5">
                {format(today, 'MMMM d')}
              </h2>
              <p className="text-emerald-200/80 text-sm">{format(today, 'EEEE')}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-black">{stats.daysLeft}</p>
              <p className="text-emerald-200/80 text-xs">days left</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-emerald-200/80 mb-1.5">
              <span>{stats.completed} sessions done</span>
              <span>{stats.total - stats.completed} remaining</span>
            </div>
            <div className="bg-white/15 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { icon: '⚽', value: stats.practicesLeft, label: 'practices left' },
              { icon: '🏆', value: stats.gamesLeft, label: 'games left' },
              { icon: '💯', value: `${progressPct}%`, label: 'complete' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center backdrop-blur-sm">
                <div className="text-lg">{icon}</div>
                <div className="font-display font-black text-xl leading-tight">{value}</div>
                <div className="text-emerald-200/70 text-[10px] leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Today's session ───────────────────────────── */}
      {todaySession ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-glow-pulse" />
            <h2 className="font-display font-bold text-slate-100">Today's Session</h2>
          </div>
          <SessionCard
            session={todaySession}
            completed={completedIds.has(todaySession.id)}
            navigate={navigate}
          />
        </div>
      ) : (
        <div className="glass-card-solid p-4 text-center">
          <p className="text-2xl mb-1">🌱</p>
          <p className="text-slate-200 font-semibold">No session today</p>
          <p className="text-slate-500 text-sm">Rest day — recovery is part of development!</p>
        </div>
      )}

      {/* ── Next session ────────────────────────────── */}
      {nextSession && !isToday(parseISO(nextSession.date)) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-slate-100">Up Next</h2>
            <span className="text-xs text-slate-500">
              {format(parseISO(nextSession.date), 'EEE, MMM d')}
            </span>
          </div>
          <SessionCard
            session={nextSession}
            completed={completedIds.has(nextSession.id)}
            navigate={navigate}
          />
        </div>
      )}

      {/* ── Quick access ───────────────────────────── */}
      <div>
        <h2 className="font-display font-bold text-slate-100 mb-2">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📚', label: 'Drill Library', desc: '30+ drills', to: '/drills', gradient: 'from-violet-500/15 to-violet-600/5', border: 'border-violet-500/20' },
            { icon: '👥', label: 'My Players', desc: '5 athletes', to: '/players', gradient: 'from-blue-500/15 to-blue-600/5', border: 'border-blue-500/20' },
            { icon: '🤖', label: 'AI Coach', desc: 'Ask anything', to: '/ai', gradient: 'from-indigo-500/15 to-indigo-600/5', border: 'border-indigo-500/20' },
            { icon: '📅', label: 'Full Calendar', desc: '8-week plan', to: '/calendar', gradient: 'from-amber-500/15 to-amber-600/5', border: 'border-amber-500/20' },
          ].map(({ icon, label, desc, to, gradient, border }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-4 text-left hover-lift transition-all duration-200 active:scale-[0.98]`}
            >
              <span className="text-2xl block mb-1">{icon}</span>
              <p className="font-semibold text-slate-200 text-sm">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent sessions ─────────────────────────── */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-slate-100">Recent</h2>
            <button onClick={() => navigate('/calendar')} className="text-emerald-400 text-sm font-medium">
              See all
            </button>
          </div>
          <div className="space-y-2">
            {recentSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                completed={completedIds.has(session.id)}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── HEART values reminder ───────────────────── */}
      <div className="glass-card-solid p-4">
        <h3 className="font-display font-bold text-slate-100 mb-3 flex items-center gap-2">
          <span>💚</span> HEART Values
        </h3>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(HEART_COLORS).map(([key, style]) => (
            <div key={key} className={`${style.bg} border border-white/5 rounded-xl p-2 text-center`}>
              <div className="text-base">{style.icon}</div>
              <div className={`text-[9px] font-bold ${style.text} leading-tight mt-0.5`}>
                {key.split(' — ')[1]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
