import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Timer, Flag, Users, Package
} from 'lucide-react'
import { PRACTICES } from '../data/sessions'
import {
  markSessionComplete, isSessionComplete,
  getCheckedPhases, checkPhase, uncheckPhase,
  getSessionNotes, savePlayerNote, getPlayers,
} from '../db/db'

const FRAMEWORK_COLORS = {
  Barça: 'bg-blue-600 text-white',
  Arsenal: 'bg-red-600 text-white',
  Ajax: 'bg-amber-500 text-white',
  Coerver: 'bg-purple-600 text-white',
  Funino: 'bg-green-600 text-white',
  Universal: 'bg-gray-500 text-white',
}

const PHASE_ICONS = { '🏃': '🏃', '⚽': '⚽', '🎮': '🎮', '💚': '💚', '🔥': '🔥' }

// ─── Timer component ──────────────────────────────────────────────────────────
function PhaseTimer({ durationMin, running, onComplete }) {
  const totalSec = durationMin * 60
  const [remaining, setRemaining] = useState(totalSec)
  const [started, setStarted] = useState(false)
  const interval = useRef(null)

  useEffect(() => {
    setRemaining(totalSec)
    setStarted(false)
  }, [totalSec])

  useEffect(() => {
    if (running && started) {
      interval.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval.current)
            onComplete?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(interval.current)
    }
    return () => clearInterval(interval.current)
  }, [running, started])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const progress = ((totalSec - remaining) / totalSec) * 100
  const isUrgent = remaining <= 60 && remaining > 0 && started

  const handleStart = () => { setStarted(true) }
  const handleReset = () => { setRemaining(totalSec); setStarted(false) }

  return (
    <div className={`rounded-2xl p-4 transition-colors duration-300 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <Timer size={15} />
          <span>Phase Timer</span>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg hover:bg-white/80 text-gray-500 transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white/60 rounded-full h-2 mb-3">
        <div
          className={`rounded-full h-2 transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between">
        <span className={`timer-display font-display font-black text-4xl ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
          {mm}:{ss}
        </span>
        {!started ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors active:scale-95"
          >
            <Play size={14} fill="white" /> Start
          </button>
        ) : (
          <p className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-green-600'}`}>
            {isUrgent ? '⚠️ Wrapping up!' : remaining === 0 ? '✅ Done!' : '⏱ Running'}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Phase card ───────────────────────────────────────────────────────────────
function PhaseCard({ phase, phaseIndex, checked, onCheck, activeTimer, onTimerToggle }) {
  const [expanded, setExpanded] = useState(phaseIndex === 0)
  const isActive = activeTimer === phaseIndex

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden
      ${checked ? 'border-green-200 opacity-75' : isActive ? 'border-green-400 shadow-md' : 'border-gray-100 shadow-sm'}
    `}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          onClick={e => { e.stopPropagation(); onCheck(phaseIndex) }}
          className="flex-shrink-0"
        >
          {checked
            ? <CheckCircle2 size={22} className="text-green-500" />
            : <Circle size={22} className="text-gray-300 hover:text-gray-400 transition-colors" />
          }
        </button>
        <span className="text-xl">{phase.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-gray-900 text-sm">{phase.name}</span>
            <span className="text-xs text-gray-400">{phase.duration} min</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{phase.activity}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[phase.framework] || 'bg-gray-200 text-gray-700'}`}>
            {phase.framework?.split(' / ')[0]}
          </span>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50">
          {/* Timer */}
          <div className="pt-3">
            <PhaseTimer
              durationMin={phase.duration}
              running={isActive}
              onComplete={() => onTimerToggle(null)}
            />
            <button
              onClick={() => onTimerToggle(isActive ? null : phaseIndex)}
              className={`mt-2 w-full py-2 rounded-xl font-semibold text-sm transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isActive ? <span className="flex items-center justify-center gap-2"><Pause size={14} /> Pause Timer</span>
                        : <span className="flex items-center justify-center gap-2"><Play size={14} fill="currentColor" /> Run This Phase</span>}
            </button>
          </div>

          {/* Setup */}
          {phase.setup && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">⚙️ Setup</p>
              <p className="text-sm text-blue-700">{phase.setup}</p>
            </div>
          )}

          {/* Description */}
          {phase.description && (
            <p className="text-sm text-gray-600">{phase.description}</p>
          )}

          {/* Instructions */}
          {phase.instructions?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📋 Instructions</p>
              <ol className="space-y-1.5">
                {phase.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Coaching cues */}
          {phase.coachingCues?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">🗣️ Coaching Cues</p>
              <div className="flex flex-wrap gap-2">
                {phase.coachingCues.map((cue, i) => (
                  <span key={i} className="bg-amber-50 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-xl border border-amber-200">
                    "{cue}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Session Page ────────────────────────────────────────────────────────
export default function Session() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = PRACTICES.find(p => p.id === id)

  const [completed, setCompleted] = useState(false)
  const [checkedPhases, setCheckedPhases] = useState(new Set())
  const [activeTimer, setActiveTimer] = useState(null)
  const [players, setPlayers] = useState([])
  const [notes, setNotes] = useState({})
  const [savedNotes, setSavedNotes] = useState({})
  const [activeTab, setActiveTab] = useState('plan')

  useEffect(() => {
    if (!session) return
    isSessionComplete(session.id).then(setCompleted)
    getCheckedPhases(session.id).then(setCheckedPhases)
    getPlayers().then(setPlayers)
    getSessionNotes(session.id).then(noteList => {
      const map = {}
      noteList.forEach(n => { map[n.playerId] = n.text })
      setSavedNotes(map)
      setNotes(map)
    })
  }, [session?.id])

  const handleCheckPhase = async (phaseIndex) => {
    const newChecked = new Set(checkedPhases)
    if (newChecked.has(phaseIndex)) {
      newChecked.delete(phaseIndex)
      await uncheckPhase(session.id, phaseIndex)
    } else {
      newChecked.add(phaseIndex)
      await checkPhase(session.id, phaseIndex)
    }
    setCheckedPhases(newChecked)
    // Auto-complete if all phases checked
    if (newChecked.size === session.phases.length && !completed) {
      await markSessionComplete(session.id, 'practice')
      setCompleted(true)
    }
  }

  const handleToggleComplete = async () => {
    if (!completed) {
      await markSessionComplete(session.id, 'practice')
      setCompleted(true)
    }
  }

  const handleSaveNote = async (playerId) => {
    const text = notes[playerId] || ''
    await savePlayerNote(session.id, playerId, text)
    setSavedNotes(prev => ({ ...prev, [playerId]: text }))
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-3">🔍</p>
        <p className="font-display font-bold text-xl text-gray-700">Session not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-green-600 font-semibold">← Go back</button>
      </div>
    )
  }

  const phasesCompleted = checkedPhases.size
  const phasesTotal = session.phases.length
  const progressPct = Math.round((phasesCompleted / phasesTotal) * 100)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium mb-3 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Hero card */}
        <div className="pitch-bg rounded-3xl p-5 text-white">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Practice {session.sessionNumber} · Week {session.week}
                </span>
                {completed && (
                  <span className="text-[11px] font-bold bg-green-400/30 text-green-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> Complete
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-2xl leading-tight">{session.title}</h1>
              <p className="text-green-200 text-sm mt-0.5">{session.subtitle}</p>
            </div>
            <span className="text-3xl">⚽</span>
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {session.frameworks?.map(fw => (
              <span key={fw} className={`text-xs font-bold px-2.5 py-1 rounded-full ${FRAMEWORK_COLORS[fw] || 'bg-white/20'}`}>
                {fw}
              </span>
            ))}
            <span className="text-xs text-green-200 flex items-center gap-1">
              <Timer size={12} /> {session.duration} min
            </span>
            <span className="text-xs text-green-200">
              {format(parseISO(session.date), 'EEE, MMM d')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-green-200 mb-1">
              <span>{phasesCompleted}/{phasesTotal} phases</span>
              <span>{progressPct}%</span>
            </div>
            <div className="bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* HEART value */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">💚 Today's HEART Value</p>
        <p className="font-display font-bold text-green-900 text-base">{session.heartValue}</p>
        <p className="text-green-700 text-sm mt-1">{session.heartMessage}</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'plan', label: 'Session Plan' },
          { id: 'equipment', label: 'Equipment' },
          { id: 'notes', label: 'Player Notes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Session Plan ─────────────────────────── */}
      {activeTab === 'plan' && (
        <div className="space-y-3">
          {/* Coach notes */}
          {session.coachNotes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">🧠 Coach Notes</p>
              <p className="text-sm text-amber-800">{session.coachNotes}</p>
            </div>
          )}

          {/* Phases */}
          {session.phases.map((phase, i) => (
            <PhaseCard
              key={i}
              phase={phase}
              phaseIndex={i}
              checked={checkedPhases.has(i)}
              onCheck={handleCheckPhase}
              activeTimer={activeTimer}
              onTimerToggle={setActiveTimer}
            />
          ))}

          {/* Mark complete button */}
          {!completed && (
            <button
              onClick={handleToggleComplete}
              className="w-full bg-green-600 text-white font-display font-bold py-4 rounded-2xl text-lg hover:bg-green-700 transition-colors active:scale-95 shadow-sm"
            >
              ✅ Mark Session Complete
            </button>
          )}
          {completed && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <CheckCircle2 size={32} className="text-green-500 mx-auto mb-1" />
              <p className="font-display font-bold text-green-800">Session Complete! Great coaching! 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Equipment ────────────────────────────── */}
      {activeTab === 'equipment' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-gray-600" />
              <h3 className="font-display font-bold text-gray-900">Equipment Checklist</h3>
            </div>
            <div className="space-y-2">
              {session.equipment?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-800 uppercase mb-1">🎯 Session Focus</p>
            <p className="text-sm text-blue-700">{session.focus}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📊 Session Info</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Date', value: format(parseISO(session.date), 'EEEE, MMM d') },
                { label: 'Duration', value: `${session.duration} minutes` },
                { label: 'Players', value: `${session.playerCount} athletes` },
                { label: 'Phase', value: `Phase ${session.phase}` },
                { label: 'Theme', value: `"${session.theme}"` },
                { label: 'Primary', value: session.primaryFramework },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Player Notes ─────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Add notes for each player after the session.</p>
          {players.map(player => (
            <div key={player.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: player.color }}
                >
                  {player.emoji}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{player.name}</p>
                  <p className="text-[10px] text-gray-400">#{player.jerseyNumber}</p>
                </div>
              </div>
              <textarea
                value={notes[player.id] || ''}
                onChange={e => setNotes(prev => ({ ...prev, [player.id]: e.target.value }))}
                placeholder="What did you notice? What to focus on next time?"
                className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-300 placeholder-gray-300"
                rows={3}
              />
              <button
                onClick={() => handleSaveNote(player.id)}
                className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  savedNotes[player.id] === notes[player.id]
                    ? 'text-gray-400 bg-gray-50'
                    : 'text-green-700 bg-green-50 hover:bg-green-100'
                }`}
              >
                {savedNotes[player.id] === notes[player.id] ? '✓ Saved' : 'Save Note'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
