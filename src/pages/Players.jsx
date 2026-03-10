import { useState, useEffect } from 'react'
import { Edit2, Check, X, Star, TrendingUp } from 'lucide-react'
import {
  getPlayers, updatePlayer,
  getPlayerNotes, getPlayerScores,
} from '../db/db'
import { PRACTICES } from '../data/sessions'

const HEART_ATTRS = [
  { key: 'humility',  label: 'Humility',  icon: '🤲', color: 'text-amber-600' },
  { key: 'effort',    label: 'Effort',    icon: '💪', color: 'text-red-600' },
  { key: 'ambition',  label: 'Ambition',  icon: '🎯', color: 'text-blue-600' },
  { key: 'respect',   label: 'Respect',   icon: '🤝', color: 'text-green-600' },
  { key: 'teamwork',  label: 'Teamwork',  icon: '⭐', color: 'text-purple-600' },
]

const TIPS_ATTRS = [
  { key: 'technique', label: 'Technique', icon: '⚙️', color: 'text-blue-600' },
  { key: 'insight',   label: 'Insight',   icon: '💡', color: 'text-amber-600' },
  { key: 'personality',label:'Personality',icon: '😄', color: 'text-pink-600' },
  { key: 'speed',     label: 'Speed',     icon: '⚡', color: 'text-purple-600' },
]

const PLAYER_EMOJIS = ['⚽', '🌟', '🦁', '⚡', '🎯', '🔥', '🦊', '🐯', '🚀', '💫']
const PLAYER_COLORS = ['#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

function ScoreBar({ value, maxValue = 5, color = 'bg-green-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`${color} rounded-full h-2 transition-all duration-500`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 w-4 text-right">{value}</span>
    </div>
  )
}

function PlayerCard({ player, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: player.name, emoji: player.emoji, color: player.color })
  const [notes, setNotes] = useState([])
  const [scores, setScores] = useState([])
  const [tab, setTab] = useState('profile')

  useEffect(() => {
    getPlayerNotes(player.id).then(setNotes)
    getPlayerScores(player.id).then(setScores)
  }, [player.id])

  const handleSave = async () => {
    await updatePlayer(player.id, draft)
    onUpdate({ ...player, ...draft })
    setEditing(false)
  }

  // Compute average scores from all sessions
  const avgScores = scores.length === 0 ? {} : (() => {
    const totals = {}
    const counts = {}
    scores.forEach(s => {
      [...HEART_ATTRS, ...TIPS_ATTRS].forEach(attr => {
        if (s[attr.key] !== undefined) {
          totals[attr.key] = (totals[attr.key] || 0) + s[attr.key]
          counts[attr.key] = (counts[attr.key] || 0) + 1
        }
      })
    })
    const avgs = {}
    Object.keys(totals).forEach(k => {
      avgs[k] = Math.round((totals[k] / counts[k]) * 10) / 10
    })
    return avgs
  })()

  // Get session notes with session names
  const notesWithSession = notes
    .filter(n => n.text?.trim())
    .map(n => {
      const session = PRACTICES.find(p => p.id === n.sessionId)
      return { ...n, sessionTitle: session?.title || 'Session' }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Player header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {editing ? (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex gap-1 flex-wrap">
                {PLAYER_EMOJIS.map(e => (
                  <button key={e} onClick={() => setDraft(d => ({ ...d, emoji: e }))}
                    className={`text-lg p-1 rounded-lg ${draft.emoji === e ? 'bg-green-100 ring-2 ring-green-400' : 'hover:bg-gray-50'}`}>
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {PLAYER_COLORS.map(c => (
                  <button key={c} onClick={() => setDraft(d => ({ ...d, color: c }))}
                    className={`w-6 h-6 rounded-full transition-all ${draft.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: player.color + '20', color: player.color }}
            >
              {player.emoji}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="font-display font-bold text-lg w-full border-b-2 border-green-400 focus:outline-none pb-0.5"
                autoFocus
              />
            ) : (
              <h3 className="font-display font-bold text-lg text-gray-900">{player.name}</h3>
            )}
            <p className="text-xs text-gray-400">#{player.jerseyNumber} · {player.position}</p>
          </div>

          <div className="flex gap-1">
            {editing ? (
              <>
                <button onClick={handleSave} className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditing(false)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <X size={16} />
                </button>
              </>
            ) : (
              <button onClick={() => { setEditing(true); setDraft({ name: player.name, emoji: player.emoji, color: player.color }) }}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-t border-gray-100">
        {[
          { id: 'profile', label: 'HEART' },
          { id: 'tips', label: 'TIPS' },
          { id: 'notes', label: `Notes${notesWithSession.length > 0 ? ` (${notesWithSession.length})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === t.id ? 'text-green-700 border-b-2 border-green-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'profile' && (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Barça HEART Values</p>
            {HEART_ATTRS.map(attr => (
              <div key={attr.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <span>{attr.icon}</span> {attr.label}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {avgScores[attr.key] ? `avg ${avgScores[attr.key]}` : 'No data yet'}
                  </span>
                </div>
                <ScoreBar
                  value={avgScores[attr.key] || 0}
                  color={attr.key === 'humility' ? 'bg-amber-400' :
                         attr.key === 'effort' ? 'bg-red-400' :
                         attr.key === 'ambition' ? 'bg-blue-400' :
                         attr.key === 'respect' ? 'bg-green-400' : 'bg-purple-400'}
                />
              </div>
            ))}
            {scores.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">Add scores in Session → Player Notes to see development data.</p>
            )}
          </div>
        )}

        {tab === 'tips' && (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Ajax TIPS Model</p>
            {TIPS_ATTRS.map(attr => (
              <div key={attr.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <span>{attr.icon}</span> {attr.label}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {avgScores[attr.key] ? `avg ${avgScores[attr.key]}` : 'No data yet'}
                  </span>
                </div>
                <ScoreBar
                  value={avgScores[attr.key] || 0}
                  color={attr.key === 'technique' ? 'bg-blue-400' :
                         attr.key === 'insight' ? 'bg-amber-400' :
                         attr.key === 'personality' ? 'bg-pink-400' : 'bg-purple-400'}
                />
              </div>
            ))}
            {scores.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">TIPS scores will appear after session scoring.</p>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-2">
            {notesWithSession.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">
                No notes yet. Add notes from within a session.
              </p>
            ) : notesWithSession.map((note, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">{note.sessionTitle}</p>
                <p className="text-xs text-gray-700">{note.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Players() {
  const [players, setPlayers] = useState([])

  useEffect(() => {
    getPlayers().then(setPlayers)
  }, [])

  const handleUpdatePlayer = (updated) => {
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display font-black text-2xl text-gray-900">My Players</h1>
        <p className="text-gray-500 text-sm">{players.length} athletes · Tap to edit name & emoji</p>
      </div>

      {/* Framework reminder */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">📊 Tracking Models</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-2.5">
            <p className="text-xs font-bold text-green-700 mb-1">💚 Barça HEART</p>
            <p className="text-[10px] text-gray-500">Humility · Effort · Ambition · Respect · Teamwork</p>
          </div>
          <div className="bg-white rounded-xl p-2.5">
            <p className="text-xs font-bold text-blue-700 mb-1">🔵 Ajax TIPS</p>
            <p className="text-[10px] text-gray-500">Technique · Insight · Personality · Speed</p>
          </div>
        </div>
      </div>

      {/* Player cards */}
      {players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">👥</p>
          <p className="font-semibold text-gray-600">Loading players...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map(player => (
            <PlayerCard key={player.id} player={player} onUpdate={handleUpdatePlayer} />
          ))}
        </div>
      )}
    </div>
  )
}
