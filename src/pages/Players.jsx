import { useState, useEffect } from 'react'
import { Edit2, Check, X, Plus, Trash2, UserPlus } from 'lucide-react'
import {
  getPlayers, updatePlayer, addPlayer, deletePlayer,
  getPlayerNotes, getPlayerScores,
} from '../db/db'
import { PRACTICES } from '../data/sessions'

const HEART_ATTRS = [
  { key: 'humility', label: 'Humility', icon: '🤲', color: 'bg-amber-500' },
  { key: 'effort', label: 'Effort', icon: '💪', color: 'bg-red-500' },
  { key: 'ambition', label: 'Ambition', icon: '🎯', color: 'bg-blue-500' },
  { key: 'respect', label: 'Respect', icon: '🤝', color: 'bg-emerald-500' },
  { key: 'teamwork', label: 'Teamwork', icon: '⭐', color: 'bg-violet-500' },
]

const TIPS_ATTRS = [
  { key: 'technique', label: 'Technique', icon: '⚙️', color: 'bg-blue-500' },
  { key: 'insight', label: 'Insight', icon: '💡', color: 'bg-amber-500' },
  { key: 'personality', label: 'Personality', icon: '😄', color: 'bg-pink-500' },
  { key: 'speed', label: 'Speed', icon: '⚡', color: 'bg-violet-500' },
]

const PLAYER_EMOJIS = ['⚽', '🌟', '🦁', '⚡', '🎯', '🔥', '🦊', '🐯', '🚀', '💫']
const PLAYER_COLORS = ['#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

function ScoreBar({ value, maxValue = 5, color = 'bg-emerald-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white/5 rounded-full h-2">
        <div
          className={`${color} rounded-full h-2 transition-all duration-500`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-400 w-4 text-right">{value}</span>
    </div>
  )
}

function PlayerCard({ player, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: player.name, emoji: player.emoji, color: player.color })
  const [notes, setNotes] = useState([])
  const [scores, setScores] = useState([])
  const [tab, setTab] = useState('profile')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getPlayerNotes(player.id).then(setNotes)
    getPlayerScores(player.id).then(setScores)
  }, [player.id])

  const handleSave = async () => {
    await updatePlayer(player.id, draft)
    onUpdate({ ...player, ...draft })
    setEditing(false)
  }

  const handleDelete = async () => {
    await deletePlayer(player.id)
    onDelete(player.id)
  }

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

  const notesWithSession = notes
    .filter(n => n.text?.trim())
    .map(n => {
      const session = PRACTICES.find(p => p.id === n.sessionId)
      return { ...n, sessionTitle: session?.title || 'Session' }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  return (
    <div className="glass-card-solid overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {editing ? (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex gap-1 flex-wrap">
                {PLAYER_EMOJIS.map(e => (
                  <button key={e} onClick={() => setDraft(d => ({ ...d, emoji: e }))}
                    className={`text-lg p-1 rounded-lg ${draft.emoji === e ? 'bg-emerald-500/20 ring-2 ring-emerald-500/40' : 'hover:bg-white/5'}`}>
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {PLAYER_COLORS.map(c => (
                  <button key={c} onClick={() => setDraft(d => ({ ...d, color: c }))}
                    className={`w-6 h-6 rounded-full transition-all ${draft.color === c ? 'ring-2 ring-offset-1 ring-offset-slate-800 ring-slate-400 scale-110' : ''}`}
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
                className="font-display font-bold text-lg w-full bg-transparent border-b-2 border-emerald-500 focus:outline-none text-slate-100 pb-0.5"
                autoFocus
              />
            ) : (
              <h3 className="font-display font-bold text-lg text-slate-100">{player.name}</h3>
            )}
            <p className="text-xs text-slate-500">#{player.jerseyNumber} · {player.position}</p>
          </div>

          <div className="flex gap-1">
            {editing ? (
              <>
                <button onClick={handleSave} className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditing(false)} className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditing(true); setDraft({ name: player.name, emoji: player.emoji, color: player.color }) }}
                  className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setConfirmDelete(true)}
                  className="p-2 rounded-xl text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
            <p className="text-xs text-red-300">Delete <strong>{player.name}</strong> and all their data?</p>
            <div className="flex gap-2">
              <button onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-semibold hover:bg-white/10 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-t border-white/5">
        {[
          { id: 'profile', label: 'HEART' },
          { id: 'tips', label: 'TIPS' },
          { id: 'notes', label: `Notes${notesWithSession.length > 0 ? ` (${notesWithSession.length})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === t.id ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'profile' && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Barça HEART Values</p>
            {HEART_ATTRS.map(attr => (
              <div key={attr.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span>{attr.icon}</span> {attr.label}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {avgScores[attr.key] ? `avg ${avgScores[attr.key]}` : 'No data yet'}
                  </span>
                </div>
                <ScoreBar value={avgScores[attr.key] || 0} color={attr.color} />
              </div>
            ))}
            {scores.length === 0 && (
              <p className="text-xs text-slate-600 italic text-center py-2">Add scores in Session → Player Notes to see development data.</p>
            )}
          </div>
        )}

        {tab === 'tips' && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Ajax TIPS Model</p>
            {TIPS_ATTRS.map(attr => (
              <div key={attr.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span>{attr.icon}</span> {attr.label}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {avgScores[attr.key] ? `avg ${avgScores[attr.key]}` : 'No data yet'}
                  </span>
                </div>
                <ScoreBar value={avgScores[attr.key] || 0} color={attr.color} />
              </div>
            ))}
            {scores.length === 0 && (
              <p className="text-xs text-slate-600 italic text-center py-2">TIPS scores will appear after session scoring.</p>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-2">
            {notesWithSession.length === 0 ? (
              <p className="text-xs text-slate-600 italic text-center py-4">
                No notes yet. Add notes from within a session.
              </p>
            ) : notesWithSession.map((note, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-slate-600 font-semibold uppercase mb-1">{note.sessionTitle}</p>
                <p className="text-xs text-slate-300">{note.text}</p>
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
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('⚽')
  const [newColor, setNewColor] = useState('#16a34a')

  useEffect(() => {
    getPlayers().then(setPlayers)
  }, [])

  const handleUpdatePlayer = (updated) => {
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const handleDeletePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const handleAddPlayer = async () => {
    if (!newName.trim()) return
    try {
      const id = await addPlayer({ name: newName.trim(), emoji: newEmoji, color: newColor })
      const refreshed = await getPlayers()
      setPlayers(refreshed)
      setNewName('')
      setNewEmoji('⚽')
      setNewColor('#16a34a')
      setAdding(false)
    } catch (err) {
      console.error('ADD PLAYER ERROR:', err)
      alert(`Add Player Error: ${err.message}`)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl text-slate-100">My Players</h1>
          <p className="text-slate-500 text-sm">{players.length} athletes · Tap to edit or delete</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${adding
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'gradient-emerald text-white hover:opacity-90'
            }`}
        >
          {adding ? <><X size={14} /> Cancel</> : <><UserPlus size={14} /> Add Player</>}
        </button>
      </div>

      {/* Add player form */}
      {adding && (
        <div className="glass-card-solid p-4 space-y-3 border-2 border-emerald-500/20">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">New Player</p>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Player name"
            autoFocus
            className="w-full glass-input px-3 py-2.5 text-sm font-semibold text-slate-100"
            onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
          />
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Emoji</p>
            <div className="flex gap-1 flex-wrap">
              {PLAYER_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  className={`text-lg p-1.5 rounded-lg ${newEmoji === e ? 'bg-emerald-500/20 ring-2 ring-emerald-500/40' : 'hover:bg-white/5'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Color</p>
            <div className="flex gap-1.5 flex-wrap">
              {PLAYER_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button
            onClick={handleAddPlayer}
            disabled={!newName.trim()}
            className="w-full gradient-emerald text-white font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40"
          >
            <span className="flex items-center justify-center gap-2"><Plus size={14} /> Add to Roster</span>
          </button>
        </div>
      )}

      <div className="glass-card-solid p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">📊 Tracking Models</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-2.5">
            <p className="text-xs font-bold text-emerald-400 mb-1">💚 Barça HEART</p>
            <p className="text-[10px] text-slate-500">Humility · Effort · Ambition · Respect · Teamwork</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/15 rounded-xl p-2.5">
            <p className="text-xs font-bold text-blue-300 mb-1">🔵 Ajax TIPS</p>
            <p className="text-[10px] text-slate-500">Technique · Insight · Personality · Speed</p>
          </div>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">👥</p>
          <p className="font-semibold text-slate-400">No players yet</p>
          <p className="text-sm text-slate-600 mt-1">Tap "Add Player" to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map(player => (
            <PlayerCard key={player.id} player={player} onUpdate={handleUpdatePlayer} onDelete={handleDeletePlayer} />
          ))}
        </div>
      )}
    </div>
  )
}
