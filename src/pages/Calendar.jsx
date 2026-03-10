import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { ALL_SESSIONS, SEASON_INFO } from '../data/sessions'
import { getCompletedSessionIds } from '../db/db'

const PHASE_THEMES = {
  1: { label: 'Phase 1: Know the Ball', color: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-300' },
  2: { label: 'Phase 2: Play the Game', color: 'border-l-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
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
        ${isActive ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : 'hover:bg-white/5'}
        ${pastPending ? 'opacity-50' : ''}
      `}
    >
      <div className="flex-shrink-0">
        {completed
          ? <CheckCircle2 size={18} className="text-emerald-400" />
          : isActive
            ? <div className="w-4.5 h-4.5 rounded-full border-2 border-emerald-400 animate-glow-pulse" style={{ width: 18, height: 18 }} />
            : <Circle size={18} className={isPast(parseISO(session.date)) ? 'text-slate-600' : 'text-slate-700'} />
        }
      </div>

      <div className="flex-shrink-0 w-8 text-center">
        <span className="text-lg">{isGame ? '🏆' : '⚽'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isGame ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {isGame ? `G${session.gameNumber}` : `P${session.sessionNumber}`}
          </span>
          <span className="text-sm font-semibold text-slate-200 truncate">{session.title}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {format(parseISO(session.date), 'EEE, MMM d')}
          {!isGame && ` · ${session.duration}min`}
        </p>
      </div>

      <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
    </button>
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const [completedIds, setCompletedIds] = useState(new Set())

  useEffect(() => {
    getCompletedSessionIds().then(setCompletedIds)
  }, [])

  const weeks = useMemo(() => {
    const grouped = {}
    ALL_SESSIONS.forEach(s => {
      if (!grouped[s.week]) grouped[s.week] = []
      grouped[s.week].push(s)
    })
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, sessions]) => ({
        week: Number(week),
        sessions: sessions.sort((a, b) => a.date.localeCompare(b.date)),
      }))
  }, [])

  const completedCount = [...ALL_SESSIONS].filter(s => completedIds.has(s.id)).length

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display font-black text-2xl text-slate-100">Season Calendar</h1>
        <p className="text-slate-500 text-sm">
          {format(parseISO(SEASON_INFO.startDate), 'MMM d')} – {format(parseISO(SEASON_INFO.endDate), 'MMM d, yyyy')} ·{' '}
          <span className="text-emerald-400 font-semibold">{completedCount}/{ALL_SESSIONS.length} done</span>
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-blue-500 inline-block" />Phase 1</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-emerald-500 inline-block" />Phase 2</span>
        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" />Complete</span>
        <span className="flex items-center gap-1">🏆 Game</span>
      </div>

      {weeks.map(({ week, sessions }) => {
        const phase = week <= 4 ? 1 : 2
        const phaseStyle = PHASE_THEMES[phase]
        const weekCompleted = sessions.filter(s => completedIds.has(s.id)).length
        const hasToday = sessions.some(s => isToday(parseISO(s.date)))

        return (
          <div
            key={week}
            className={`glass-card-solid overflow-hidden border-l-4 ${phaseStyle.color}`}
          >
            <div className={`px-4 py-3 ${phaseStyle.bg} flex items-start justify-between`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${phaseStyle.text} uppercase tracking-wide`}>
                    Week {week}
                  </span>
                  {hasToday && (
                    <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-glow-pulse">
                      THIS WEEK
                    </span>
                  )}
                </div>
                <p className="font-display font-bold text-slate-200 text-sm mt-0.5">
                  "{WEEK_THEMES[week]}"
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-300">{weekCompleted}/{sessions.length}</p>
                <p className="text-[10px] text-slate-500">done</p>
              </div>
            </div>

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

      <div className="pitch-bg rounded-2xl p-4 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
        <div className="relative">
          <p className="text-4xl mb-1">⚽</p>
          <p className="font-display font-black text-xl">U-6 Season 2026</p>
          <p className="text-emerald-200/80 text-sm">16 practices · 8 games · 5 players · 5 frameworks</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              ['Barça', '🔵'], ['Arsenal', '🔴'], ['Ajax', '🟡'],
            ].map(([name, emoji]) => (
              <div key={name} className="bg-white/10 rounded-xl py-2 text-center backdrop-blur-sm">
                <div className="text-lg">{emoji}</div>
                <div className="text-[10px] font-semibold text-emerald-100">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
