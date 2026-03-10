import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns'
import { CheckCircle2, Circle, ChevronRight, Lock } from 'lucide-react'
import { ALL_SESSIONS, SEASON_INFO } from '../data/sessions'
import { getCompletedSessionIds } from '../db/db'

const PHASE_THEMES = {
  1: { label: 'Phase 1: Know the Ball', color: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
  2: { label: 'Phase 2: Play the Game', color: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-800' },
}

const WEEK_THEMES = {
  1: 'My Ball', 2: 'Touch & Move', 3: 'Eyes Up', 4: 'Beat Your Opponent',
  5: 'Our Ball', 6: 'Find the Space', 7: 'The Complete Player', 8: "How Far We've Come"
}

function SessionRow({ session, completed, isActive, navigate }) {
  const isGame = session.type === 'game'
  const pastPending = isPast(parseISO(session.date)) && !completed && !isToday(parseISO(session.date))

  return (
    <button
      onClick={() => navigate(isGame ? `/game/${session.id}` : `/session/${session.id}`)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left
        ${isActive ? 'bg-green-50 ring-1 ring-green-300' : 'hover:bg-gray-50'}
        ${pastPending ? 'opacity-60' : ''}
      `}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {completed
          ? <CheckCircle2 size={18} className="text-green-500" />
          : isActive
          ? <div className="w-4.5 h-4.5 rounded-full border-2 border-green-500 animate-pulse-green" style={{width:18,height:18}} />
          : <Circle size={18} className={isPast(parseISO(session.date)) ? 'text-gray-300' : 'text-gray-200'} />
        }
      </div>

      {/* Day + emoji */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className="text-lg">{isGame ? '🏆' : '⚽'}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isGame ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {isGame ? `G${session.gameNumber}` : `P${session.sessionNumber}`}
          </span>
          <span className="text-sm font-semibold text-gray-900 truncate">{session.title}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(parseISO(session.date), 'EEE, MMM d')}
          {!isGame && ` · ${session.duration}min`}
        </p>
      </div>

      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const [completedIds, setCompletedIds] = useState(new Set())

  useEffect(() => {
    getCompletedSessionIds().then(setCompletedIds)
  }, [])

  // Group by week
  const weeks = useMemo(() => {
    const grouped = {}
    ALL_SESSIONS.forEach(s => {
      if (!grouped[s.week]) grouped[s.week] = []
      grouped[s.week].push(s)
    })
    return Object.entries(grouped)
      .sort(([a],[b]) => Number(a)-Number(b))
      .map(([week, sessions]) => ({
        week: Number(week),
        sessions: sessions.sort((a,b) => a.date.localeCompare(b.date)),
      }))
  }, [])

  const completedCount = [...ALL_SESSIONS].filter(s => completedIds.has(s.id)).length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl text-gray-900">Season Calendar</h1>
        <p className="text-gray-500 text-sm">
          {format(parseISO(SEASON_INFO.startDate), 'MMM d')} – {format(parseISO(SEASON_INFO.endDate), 'MMM d, yyyy')} ·{' '}
          <span className="text-green-600 font-semibold">{completedCount}/{ALL_SESSIONS.length} done</span>
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-blue-500 inline-block" />Phase 1</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-green-500 inline-block" />Phase 2</span>
        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" />Complete</span>
        <span className="flex items-center gap-1">🏆 Game</span>
      </div>

      {/* Weeks */}
      {weeks.map(({ week, sessions }) => {
        const phase = week <= 4 ? 1 : 2
        const phemeStyle = PHASE_THEMES[phase]
        const weekCompleted = sessions.filter(s => completedIds.has(s.id)).length
        const hasToday = sessions.some(s => isToday(parseISO(s.date)))

        return (
          <div
            key={week}
            className={`bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden border-l-4 ${phemeStyle.color}`}
          >
            {/* Week header */}
            <div className={`px-4 py-3 ${phemeStyle.bg} flex items-start justify-between`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${phemeStyle.text} uppercase tracking-wide`}>
                    Week {week}
                  </span>
                  {hasToday && (
                    <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse-green">
                      THIS WEEK
                    </span>
                  )}
                </div>
                <p className="font-display font-bold text-gray-800 text-sm mt-0.5">
                  "{WEEK_THEMES[week]}"
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-gray-700">{weekCompleted}/{sessions.length}</p>
                <p className="text-[10px] text-gray-500">done</p>
              </div>
            </div>

            {/* Sessions */}
            <div className="p-2 space-y-0.5">
              {sessions.map(session => (
                <SessionRow
                  key={session.id}
                  session={session}
                  completed={completedIds.has(session.id)}
                  isActive={isToday(parseISO(session.date))}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Season total */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-4 text-white text-center">
        <p className="text-4xl mb-1">⚽</p>
        <p className="font-display font-black text-xl">U-6 Season 2026</p>
        <p className="text-green-200 text-sm">16 practices · 8 games · 5 players · 5 frameworks</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            ['Barça', '🔵'], ['Arsenal', '🔴'], ['Ajax', '🟡'],
          ].map(([name, emoji]) => (
            <div key={name} className="bg-white/15 rounded-xl py-2 text-center">
              <div className="text-lg">{emoji}</div>
              <div className="text-[10px] font-semibold text-green-100">{name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
