import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Timer, Flag, Users, Package,
  Pencil, Plus, X, Minus, ArrowUp, ArrowDown, RotateCw
} from 'lucide-react'
import { PRACTICES } from '../data/sessions'
import {
  markSessionComplete, isSessionComplete,
  getCheckedPhases, checkPhase, uncheckPhase,
  getSessionNotes, savePlayerNote, getPlayers,
  getSessionCustomization, saveSessionCustomization, deleteSessionCustomization,
} from '../db/db'
import DrillPicker from '../components/DrillPicker'

const FRAMEWORK_COLORS = {
  Barça: 'bg-blue-500/20 text-blue-300',
  Arsenal: 'bg-red-500/20 text-red-300',
  Ajax: 'bg-amber-500/20 text-amber-300',
  Coerver: 'bg-violet-500/20 text-violet-300',
  Funino: 'bg-teal-500/20 text-teal-300',
  Universal: 'bg-slate-500/20 text-slate-300',
}

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
    <div className={`rounded-2xl p-4 transition-colors duration-300 ${isUrgent ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/15'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
          <Timer size={15} />
          <span>Phase Timer</span>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="bg-white/5 rounded-full h-2 mb-3">
        <div
          className={`rounded-full h-2 transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`timer-display font-display font-black text-4xl ${isUrgent ? 'text-red-400' : 'text-slate-100'}`}>
          {mm}:{ss}
        </span>
        {!started ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 gradient-emerald text-white px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity active:scale-95"
          >
            <Play size={14} fill="white" /> Start
          </button>
        ) : (
          <p className={`text-xs font-medium ${isUrgent ? 'text-red-400' : 'text-emerald-400'}`}>
            {isUrgent ? '⚠️ Wrapping up!' : remaining === 0 ? '✅ Done!' : '⏱ Running'}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Activity content block (shared by single-activity and multi-activity) ────
function ActivityContent({ activity }) {
  return (
    <div className="space-y-3">
      {activity.setup && (
        <div className="bg-blue-500/10 border border-blue-500/15 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-1">⚙️ Setup</p>
          <p className="text-sm text-blue-200/80">{activity.setup}</p>
        </div>
      )}

      {activity.description && (
        <p className="text-sm text-slate-400">{activity.description}</p>
      )}

      {activity.instructions?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📋 Instructions</p>
          <ol className="space-y-1.5">
            {activity.instructions.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {activity.coachingCues?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🗣️ Coaching Cues</p>
          <div className="flex flex-wrap gap-2">
            {activity.coachingCues.map((cue, i) => (
              <span key={i} className="bg-amber-500/10 text-amber-300 text-xs font-medium px-3 py-1.5 rounded-xl border border-amber-500/15">
                "{cue}"
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-activity card (for multi-activity phases) ────────────────────────────
function SubActivityCard({ activity, index, total, editing, onRemove, onMoveUp, onMoveDown, onDurationChange }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">{activity.name}</p>
          {activity.framework && (
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{activity.framework}</p>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => onDurationChange(Math.max(1, activity.duration - 1))} className="p-1 rounded hover:bg-white/10 text-slate-500"><Minus size={12} /></button>
            <span className="text-xs text-emerald-400 font-bold w-6 text-center">{activity.duration}</span>
            <button onClick={() => onDurationChange(activity.duration + 1)} className="p-1 rounded hover:bg-white/10 text-slate-500"><Plus size={12} /></button>
            <span className="text-[10px] text-slate-600 mr-1">min</span>
            {index > 0 && <button onClick={onMoveUp} className="p-1 rounded hover:bg-white/10 text-slate-500"><ArrowUp size={12} /></button>}
            {index < total - 1 && <button onClick={onMoveDown} className="p-1 rounded hover:bg-white/10 text-slate-500"><ArrowDown size={12} /></button>}
            <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X size={12} /></button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 flex-shrink-0">{activity.duration} min</span>
        )}
        {open ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-white/5 pt-3">
          <ActivityContent activity={activity} />
        </div>
      )}
    </div>
  )
}

// ─── Phase card ───────────────────────────────────────────────────────────────
function PhaseCard({ phase, phaseIndex, checked, onCheck, activeTimer, onTimerToggle, editing, onAddDrill, onRemoveActivity, onMoveActivity, onDurationChange, onResetPhase }) {
  const [expanded, setExpanded] = useState(phaseIndex === 0)
  const isActive = activeTimer === phaseIndex
  const hasActivities = phase.activities?.length > 0
  const totalDuration = hasActivities ? phase.activities.reduce((s, a) => s + a.duration, 0) : phase.duration

  return (
    <div className={`glass-card-solid transition-all duration-200 overflow-hidden
      ${checked ? 'opacity-60' : isActive ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''}
    `}>
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          onClick={e => { e.stopPropagation(); onCheck(phaseIndex) }}
          className="flex-shrink-0"
        >
          {checked
            ? <CheckCircle2 size={22} className="text-emerald-400" />
            : <Circle size={22} className="text-slate-600 hover:text-slate-400 transition-colors" />
          }
        </button>
        <span className="text-xl">{phase.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-slate-200 text-sm">{phase.name}</span>
            <span className="text-xs text-slate-500">{totalDuration} min</span>
            {hasActivities && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-bold">
                {phase.activities.length} activities
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {hasActivities ? phase.activities.map(a => a.name).join(' → ') : phase.activity}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[phase.framework?.split(' / ')[0]] || 'bg-slate-500/20 text-slate-300'}`}>
            {phase.framework?.split(' / ')[0]}
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5">
          <div className="pt-3">
            <PhaseTimer
              durationMin={totalDuration}
              running={isActive}
              onComplete={() => onTimerToggle(null)}
            />
            <button
              onClick={() => onTimerToggle(isActive ? null : phaseIndex)}
              className={`mt-2 w-full py-2 rounded-xl font-semibold text-sm transition-all ${isActive
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15'
                : 'gradient-emerald text-white hover:opacity-90'
                }`}
            >
              {isActive ? <span className="flex items-center justify-center gap-2"><Pause size={14} /> Pause Timer</span>
                : <span className="flex items-center justify-center gap-2"><Play size={14} fill="currentColor" /> Run This Phase</span>}
            </button>
          </div>

          {hasActivities ? (
            <div className="space-y-2">
              {phase.activities.map((act, i) => (
                <SubActivityCard
                  key={`${act.drillId || act.name}-${i}`}
                  activity={act}
                  index={i}
                  total={phase.activities.length}
                  editing={editing}
                  onRemove={() => onRemoveActivity(phaseIndex, i)}
                  onMoveUp={() => onMoveActivity(phaseIndex, i, -1)}
                  onMoveDown={() => onMoveActivity(phaseIndex, i, 1)}
                  onDurationChange={(d) => onDurationChange(phaseIndex, i, d)}
                />
              ))}
              {editing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onAddDrill(phaseIndex)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/5 transition-colors"
                  >
                    <Plus size={14} /> Add Drill
                  </button>
                  <button
                    onClick={() => onResetPhase(phaseIndex)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-slate-500/30 text-slate-500 text-xs font-semibold hover:bg-white/5 transition-colors"
                  >
                    <RotateCw size={12} /> Reset
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <ActivityContent activity={phase} />
              {editing && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onAddDrill(phaseIndex)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/5 transition-colors"
                  >
                    <Plus size={14} /> Add Drill
                  </button>
                </div>
              )}
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

  // ── Edit mode state ──
  const [editing, setEditing] = useState(false)
  const [customPhases, setCustomPhases] = useState(null) // null = using defaults
  const [hasCustomization, setHasCustomization] = useState(false)
  const [drillPickerOpen, setDrillPickerOpen] = useState(false)
  const [drillPickerPhase, setDrillPickerPhase] = useState(null)

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
    // Load customizations
    getSessionCustomization(session.id).then(cust => {
      if (cust?.phases) {
        setCustomPhases(cust.phases)
        setHasCustomization(true)
      }
    })
  }, [session?.id])

  // Resolved phases: customized or default
  const resolvedPhases = customPhases || session?.phases || []

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
    if (newChecked.size === resolvedPhases.length && !completed) {
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

  // ── Edit helpers ──
  const ensureCustomPhases = () => {
    if (!customPhases) {
      // Deep-clone default phases into mutable state
      return JSON.parse(JSON.stringify(session.phases))
    }
    return JSON.parse(JSON.stringify(customPhases))
  }

  const updateAndSave = async (newPhases) => {
    setCustomPhases(newPhases)
    setHasCustomization(true)
    await saveSessionCustomization(session.id, newPhases)
  }

  const handleAddDrill = (phaseIndex) => {
    setDrillPickerPhase(phaseIndex)
    setDrillPickerOpen(true)
  }

  const handleDrillSelected = async (activity) => {
    const phases = ensureCustomPhases()
    const phase = phases[drillPickerPhase]
    if (!phase.activities) {
      // Convert single-activity phase to multi-activity
      phase.activities = [{
        name: phase.activity,
        duration: phase.duration,
        framework: phase.framework,
        setup: phase.setup,
        description: phase.description,
        instructions: phase.instructions,
        coachingCues: phase.coachingCues,
      }]
    }
    phase.activities.push(activity)
    // Update the summary label
    phase.activity = phase.activities.map(a => a.name).join(' → ')
    phase.duration = phase.activities.reduce((s, a) => s + a.duration, 0)
    await updateAndSave(phases)
  }

  const handleRemoveActivity = async (phaseIndex, actIndex) => {
    const phases = ensureCustomPhases()
    const phase = phases[phaseIndex]
    if (!phase.activities) return
    phase.activities.splice(actIndex, 1)
    if (phase.activities.length === 0) {
      // Restore to original default
      const original = session.phases[phaseIndex]
      phases[phaseIndex] = JSON.parse(JSON.stringify(original))
    } else {
      phase.activity = phase.activities.map(a => a.name).join(' → ')
      phase.duration = phase.activities.reduce((s, a) => s + a.duration, 0)
    }
    await updateAndSave(phases)
  }

  const handleMoveActivity = async (phaseIndex, actIndex, direction) => {
    const phases = ensureCustomPhases()
    const acts = phases[phaseIndex].activities
    if (!acts) return
    const newIndex = actIndex + direction
    if (newIndex < 0 || newIndex >= acts.length) return
      ;[acts[actIndex], acts[newIndex]] = [acts[newIndex], acts[actIndex]]
    phases[phaseIndex].activity = acts.map(a => a.name).join(' → ')
    await updateAndSave(phases)
  }

  const handleDurationChange = async (phaseIndex, actIndex, newDuration) => {
    const phases = ensureCustomPhases()
    const phase = phases[phaseIndex]
    if (phase.activities) {
      phase.activities[actIndex].duration = newDuration
      phase.duration = phase.activities.reduce((s, a) => s + a.duration, 0)
    } else {
      phase.duration = newDuration
    }
    await updateAndSave(phases)
  }

  const handleResetPhase = async (phaseIndex) => {
    const phases = ensureCustomPhases()
    phases[phaseIndex] = JSON.parse(JSON.stringify(session.phases[phaseIndex]))
    await updateAndSave(phases)
  }

  const handleResetAll = async () => {
    setCustomPhases(null)
    setHasCustomization(false)
    setEditing(false)
    await deleteSessionCustomization(session.id)
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-3">🔍</p>
        <p className="font-display font-bold text-xl text-slate-300">Session not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-400 font-semibold">← Go back</button>
      </div>
    )
  }

  const phasesCompleted = checkedPhases.size
  const phasesTotal = resolvedPhases.length
  const progressPct = Math.round((phasesCompleted / phasesTotal) * 100)

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm font-medium mb-3 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="pitch-bg rounded-3xl p-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
          <div className="relative">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold bg-white/15 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Practice {session.sessionNumber} · Week {session.week}
                  </span>
                  {completed && (
                    <span className="text-[11px] font-bold bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> Complete
                    </span>
                  )}
                </div>
                <h1 className="font-display font-black text-2xl leading-tight">{session.title}</h1>
                <p className="text-emerald-200/80 text-sm mt-0.5">{session.subtitle}</p>
              </div>
              <span className="text-3xl">⚽</span>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {session.frameworks?.map(fw => (
                <span key={fw} className={`text-xs font-bold px-2.5 py-1 rounded-full ${FRAMEWORK_COLORS[fw] || 'bg-white/15'}`}>
                  {fw}
                </span>
              ))}
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <Timer size={12} /> {session.duration} min
              </span>
              <span className="text-xs text-emerald-200/80">
                {format(parseISO(session.date), 'EEE, MMM d')}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-emerald-200/80 mb-1">
                <span>{phasesCompleted}/{phasesTotal} phases</span>
                <span>{progressPct}%</span>
              </div>
              <div className="bg-white/15 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HEART value */}
      <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4">
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">💚 Today's HEART Value</p>
        <p className="font-display font-bold text-slate-100 text-base">{session.heartValue}</p>
        <p className="text-emerald-300/70 text-sm mt-1">{session.heartMessage}</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
        {[
          { id: 'plan', label: 'Session Plan' },
          { id: 'equipment', label: 'Equipment' },
          { id: 'notes', label: 'Player Notes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id
              ? 'bg-white/10 shadow-sm text-slate-100'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Session Plan ─────────────────────────── */}
      {activeTab === 'plan' && (
        <div className="space-y-3">
          {/* Edit mode controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${editing
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                }`}
            >
              <Pencil size={12} /> {editing ? 'Editing' : 'Edit Session'}
            </button>
            {editing && hasCustomization && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15 transition-colors"
              >
                <RotateCw size={12} /> Reset All to Default
              </button>
            )}
            {hasCustomization && !editing && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full font-bold">Customized</span>
            )}
          </div>

          {session.coachNotes && (
            <div className="bg-amber-500/10 border border-amber-500/15 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-1">🧠 Coach Notes</p>
              <p className="text-sm text-amber-200/80">{session.coachNotes}</p>
            </div>
          )}

          {resolvedPhases.map((phase, i) => (
            <PhaseCard
              key={i}
              phase={phase}
              phaseIndex={i}
              checked={checkedPhases.has(i)}
              onCheck={handleCheckPhase}
              activeTimer={activeTimer}
              onTimerToggle={setActiveTimer}
              editing={editing}
              onAddDrill={handleAddDrill}
              onRemoveActivity={handleRemoveActivity}
              onMoveActivity={handleMoveActivity}
              onDurationChange={handleDurationChange}
              onResetPhase={handleResetPhase}
            />
          ))}

          {!completed && (
            <button
              onClick={handleToggleComplete}
              className="w-full gradient-emerald text-white font-display font-bold py-4 rounded-2xl text-lg hover:opacity-90 transition-opacity active:scale-95 shadow-lg"
            >
              ✅ Mark Session Complete
            </button>
          )}
          {completed && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-1" />
              <p className="font-display font-bold text-emerald-300">Session Complete! Great coaching! 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* Drill Picker Modal */}
      <DrillPicker
        open={drillPickerOpen}
        onClose={() => setDrillPickerOpen(false)}
        onSelect={handleDrillSelected}
        phaseName={drillPickerPhase !== null ? resolvedPhases[drillPickerPhase]?.name : ''}
      />

      {/* ── Tab: Equipment ────────────────────────────── */}
      {activeTab === 'equipment' && (
        <div className="space-y-3">
          <div className="glass-card-solid p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-slate-400" />
              <h3 className="font-display font-bold text-slate-200">Equipment Checklist</h3>
            </div>
            <div className="space-y-2">
              {session.equipment?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <CheckCircle2 size={16} className="text-emerald-400/60 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/15 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-300 uppercase mb-1">🎯 Session Focus</p>
            <p className="text-sm text-blue-200/80">{session.focus}</p>
          </div>

          <div className="glass-card-solid p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📊 Session Info</p>
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
                  <p className="text-[10px] text-slate-600 uppercase font-semibold">{label}</p>
                  <p className="text-sm font-semibold text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Player Notes ─────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Add notes for each player after the session.</p>
          {players.map(player => (
            <div key={player.id} className="glass-card-solid p-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: player.color + '30', color: player.color }}
                >
                  {player.emoji}
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">{player.name}</p>
                  <p className="text-[10px] text-slate-500">#{player.jerseyNumber}</p>
                </div>
              </div>
              <textarea
                value={notes[player.id] || ''}
                onChange={e => setNotes(prev => ({ ...prev, [player.id]: e.target.value }))}
                placeholder="What did you notice? What to focus on next time?"
                className="w-full text-sm glass-input px-3 py-3 resize-none"
                rows={3}
              />
              <button
                onClick={() => handleSaveNote(player.id)}
                className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${savedNotes[player.id] === notes[player.id]
                  ? 'text-slate-500 bg-white/5'
                  : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
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
