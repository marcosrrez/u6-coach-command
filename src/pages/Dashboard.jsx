import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, isToday, isFuture, isPast, differenceInDays } from 'date-fns'
import { ChevronRight, CheckCircle2, Clock, Target, Zap, Star, Trophy } from 'lucide-react'
import { ALL_SESSIONS, SEASON_INFO, PRACTICES, GAMES } from '../data/sessions'
import { getCompletedSessionIds } from '../db/db'

const FRAMEWORK_COLORS = {
  Barça: 'bg-blue-600',
  Arsenal: 'bg-red-600',
  Ajax: 'bg-amber-500',
  Coerver: 'bg-purple-600',
  Funino: 'bg-green-600',
  Universal: 'bg-gray-500',
}

const HEART_COLORS = {
  'H — Humility': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🤲' },
  'E — Effort':   { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   icon: '💪' },
  'A — Ambition': { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200',  icon: '🎯' },
  'R — Respect':  { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🤝' },
  'T — Teamwork': { bg: 'bg-purple-50',text: 'text-purple-700',border: 'border-purple-200',icon: '⭐' },
}

function SessionCard({ session, completed, navigate }) {
  const isGame = session.type === 'game'
  const heartStyle = HEART_COLORS[session.heartValue] || HEART_COLORS['H — Humility']

  return (
    <button
      onClick={() => navigate(isGame ? `/game/${session.id}` : `/session/${session.id}`)}
      className="w-full text-left bg-white rounded-2xl border border-green-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{isGame ? '🏆' : '⚽'}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isGame ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
              {isGame ? `Game ${session.gameNumber}` : `Practice ${session.sessionNumber}`}
            </span>
            {completed && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                <CheckCircle2 size={11} /> Done
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-gray-900 text-base leading-tight truncate">{session.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{session.subtitle || session.focus}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!isGame && session.frameworks?.slice(0,2).map(fw => (
              <span key={fw} className={`text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[fw] || 'bg-gray-500'}`}>
                {fw}
              </span>
            ))}
            {!isGame && session.heartValue && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${heartStyle.bg} ${heartStyle.text}`}>
                {heartStyle.icon} {session.heartValue.split(' — ')[1]}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ChevronRight size={16} className="text-gray-300" />
          {!isGame && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
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
      <div className="pitch-bg rounded-3xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-200 text-xs font-medium uppercase tracking-wider">Season 2026</p>
            <h2 className="font-display font-bold text-2xl mt-0.5">
              {format(today, 'MMMM d')}
            </h2>
            <p className="text-green-200 text-sm">{format(today, 'EEEE')}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-black">{stats.daysLeft}</p>
            <p className="text-green-200 text-xs">days left</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-green-200 mb-1.5">
            <span>{stats.completed} sessions done</span>
            <span>{stats.total - stats.completed} remaining</span>
          </div>
          <div className="bg-white/20 rounded-full h-2">
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
            <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center">
              <div className="text-lg">{icon}</div>
              <div className="font-display font-black text-xl leading-tight">{value}</div>
              <div className="text-green-200 text-[10px] leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's session ───────────────────────────── */}
      {todaySession ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-green" />
            <h2 className="font-display font-bold text-gray-900">Today's Session</h2>
          </div>
          <SessionCard
            session={todaySession}
            completed={completedIds.has(todaySession.id)}
            navigate={navigate}
          />
        </div>
      ) : (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
          <p className="text-2xl mb-1">🌱</p>
          <p className="text-green-800 font-semibold">No session today</p>
          <p className="text-green-600 text-sm">Rest day — recovery is part of development!</p>
        </div>
      )}

      {/* ── Next session ────────────────────────────── */}
      {nextSession && !isToday(parseISO(nextSession.date)) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-gray-900">Up Next</h2>
            <span className="text-xs text-gray-500">
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
        <h2 className="font-display font-bold text-gray-900 mb-2">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📚', label: 'Drill Library', desc: '30+ drills', to: '/drills', color: 'from-purple-50 to-purple-100 border-purple-200' },
            { icon: '👥', label: 'My Players', desc: '5 athletes', to: '/players', color: 'from-blue-50 to-blue-100 border-blue-200' },
            { icon: '🤖', label: 'AI Coach', desc: 'Ask anything', to: '/ai', color: 'from-green-50 to-green-100 border-green-200' },
            { icon: '📅', label: 'Full Calendar', desc: '8-week plan', to: '/calendar', color: 'from-amber-50 to-amber-100 border-amber-200' },
          ].map(({ icon, label, desc, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`bg-gradient-to-br ${color} border rounded-2xl p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]`}
            >
              <span className="text-2xl block mb-1">{icon}</span>
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent sessions ─────────────────────────── */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-gray-900">Recent</h2>
            <button onClick={() => navigate('/calendar')} className="text-green-600 text-sm font-medium">
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
      <div className="bg-white rounded-2xl border border-green-100 p-4">
        <h3 className="font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>💚</span> HEART Values
        </h3>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(HEART_COLORS).map(([key, style]) => (
            <div key={key} className={`${style.bg} ${style.border} border rounded-xl p-2 text-center`}>
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
