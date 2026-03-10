import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { GAMES } from '../data/sessions'
import { markSessionComplete, isSessionComplete } from '../db/db'

const STEPS = [
  { id: 'warmup',    label: 'Pre-Game Warmup', emoji: '🏃' },
  { id: 'teamtalk',  label: 'Team Talk',       emoji: '💬' },
  { id: 'halftime',  label: 'Halftime',        emoji: '⏸️' },
  { id: 'postgame',  label: 'Post-Game',       emoji: '🎉' },
]

export default function GameDay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const game = GAMES.find(g => g.id === id)

  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (game) isSessionComplete(game.id).then(setCompleted)
  }, [game?.id])

  const handleComplete = async () => {
    await markSessionComplete(game.id, 'game')
    setCompleted(true)
  }

  if (!game) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-3">🏆</p>
        <p className="font-display font-bold text-xl text-gray-700">Game not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-green-600 font-semibold">← Go back</button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Game Day {game.gameNumber} · Week {game.week}
            </span>
            <h1 className="font-display font-black text-2xl mt-2 leading-tight">{game.title}</h1>
            <p className="text-amber-100 text-sm mt-0.5">{game.subtitle}</p>
            <p className="text-amber-100 text-xs mt-2">
              {format(parseISO(game.date), 'EEEE, MMMM d')}
            </p>
          </div>
          <span className="text-5xl">🏆</span>
        </div>

        {/* Focus */}
        <div className="mt-4 bg-white/15 rounded-2xl p-3">
          <p className="text-xs font-bold text-amber-100 uppercase tracking-wide mb-1">🎯 Today's Focus</p>
          <p className="font-display font-bold text-lg text-white">{game.focus}</p>
          {game.heartValue && (
            <p className="text-amber-100 text-xs mt-1">💚 HEART: {game.heartValue}</p>
          )}
        </div>
      </div>

      {/* Step navigator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              step === i
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white border border-gray-100 text-gray-500 hover:border-amber-200'
            }`}
          >
            <span>{s.emoji}</span>
            <span className="whitespace-nowrap">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Step: Pre-Game Warmup ─────────────────────── */}
      {step === 0 && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🏃</span>
              <h3 className="font-display font-bold text-gray-900">Pre-Game Warmup</h3>
              <span className="text-xs text-gray-400">{game.pregameWarmup?.duration} min</span>
            </div>
            <div className="space-y-3">
              {game.pregameWarmup?.activities?.map((act, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3">
                  <p className="font-semibold text-sm text-gray-900">{act.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{act.duration} min · {act.description}</p>
                  {act.setup && (
                    <p className="text-xs text-blue-600 mt-1">⚙️ {act.setup}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full bg-amber-500 text-white font-semibold py-3.5 rounded-2xl hover:bg-amber-600 transition-colors active:scale-95"
          >
            Next: Team Talk →
          </button>
        </div>
      )}

      {/* ── Step: Team Talk ───────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💬</span>
              <h3 className="font-display font-bold text-xl">Team Talk</h3>
            </div>
            <p className="text-green-100 text-sm mb-4">{game.teamTalk?.message}</p>
            <div className="bg-white/15 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-green-200 uppercase mb-1">🎯 One Focus</p>
              <p className="font-display font-bold text-lg">{game.teamTalk?.focus}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-green-200 uppercase mb-2">🔑 Keywords</p>
              <div className="flex flex-wrap gap-2">
                {game.teamTalk?.keywords?.map((kw, i) => (
                  <span key={i} className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                    "{kw}"
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🦁</p>
            <p className="font-display font-bold text-amber-900">Let's GO!</p>
            <p className="text-amber-700 text-sm">They're ready. You're ready. Enjoy it!</p>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-amber-500 text-white font-semibold py-3.5 rounded-2xl hover:bg-amber-600 transition-colors active:scale-95"
          >
            Next: Halftime →
          </button>
        </div>
      )}

      {/* ── Step: Halftime ────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⏸️</span>
              <h3 className="font-display font-bold text-xl text-gray-900">Halftime</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Funino principle: ask questions, don't tell.</p>

            <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-3">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">❓ Ask the Players</p>
              <p className="font-display font-bold text-green-900 text-lg">"{game.halftimeFocus?.question}"</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">💡 Coach Tip</p>
              <p className="text-sm text-blue-800">{game.halftimeFocus?.tip}</p>
            </div>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-amber-500 text-white font-semibold py-3.5 rounded-2xl hover:bg-amber-600 transition-colors active:scale-95"
          >
            Next: Post-Game →
          </button>
        </div>
      )}

      {/* ── Step: Post-Game Reflection ────────────────── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎉</span>
              <h3 className="font-display font-bold text-xl text-gray-900">Post-Game Reflection</h3>
            </div>

            <div className="space-y-2 mb-4">
              {game.postgameReflection?.questions?.map((q, i) => (
                <div key={i} className="flex gap-3 bg-green-50 rounded-xl p-3">
                  <span className="text-green-600 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-green-800 font-medium">{q}</p>
                </div>
              ))}
            </div>

            {game.postgameReflection?.note && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 uppercase mb-1">📝 Coach Note</p>
                <p className="text-sm text-amber-800">{game.postgameReflection.note}</p>
              </div>
            )}
          </div>

          {/* Ceremony (Game 8 only) */}
          {game.ceremony && (
            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl p-5 text-white">
              <h3 className="font-display font-black text-xl mb-3 text-center">🏅 Season Awards!</h3>
              <div className="space-y-2">
                {game.ceremony.awards?.map((award, i) => (
                  <div key={i} className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">{award.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{award.name}</p>
                      <p className="text-xs text-amber-100">{award.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!completed ? (
            <button
              onClick={handleComplete}
              className="w-full bg-green-600 text-white font-display font-bold py-4 rounded-2xl text-lg hover:bg-green-700 transition-colors active:scale-95 shadow-sm"
            >
              ✅ Mark Game Day Complete
            </button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <CheckCircle2 size={32} className="text-green-500 mx-auto mb-1" />
              <p className="font-display font-bold text-green-800">Game Day Complete! 🏆</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
