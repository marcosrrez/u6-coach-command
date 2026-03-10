import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react'
import { DRILLS, DRILL_CATEGORIES, FRAMEWORKS, searchDrills } from '../data/drills'

const FRAMEWORK_COLORS = {
  Barça: 'bg-blue-500/20 text-blue-300',
  Arsenal: 'bg-red-500/20 text-red-300',
  Ajax: 'bg-amber-500/20 text-amber-300',
  Coerver: 'bg-violet-500/20 text-violet-300',
  Funino: 'bg-teal-500/20 text-teal-300',
  Universal: 'bg-slate-500/20 text-slate-300',
}

const DIFFICULTY = { 1: { label: 'Beginner', color: 'text-emerald-400' }, 2: { label: 'Intermediate', color: 'text-amber-400' }, 3: { label: 'Advanced', color: 'text-red-400' } }

const CATEGORY_ICONS = {
  'Warm-Up': '🏃', 'Dribbling': '⚽', 'Passing': '↔️', 'Shooting': '🎯',
  'Rondo': '⭕', 'Small-Sided Game': '🏟️', '1v1': '🤺', 'Scanning': '👀',
  'Fun / Story': '🎭', 'Cool-Down': '💚',
}

function DrillCard({ drill }) {
  const [expanded, setExpanded] = useState(false)
  const diff = DIFFICULTY[drill.difficulty]

  return (
    <div className="glass-card-solid overflow-hidden transition-all duration-200">
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{CATEGORY_ICONS[drill.category] || '⚽'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-bold text-slate-200 text-sm leading-tight">{drill.name}</h3>
              {expanded ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[drill.framework] || 'bg-slate-500/20 text-slate-300'}`}>
                {drill.framework}
              </span>
              <span className={`text-[10px] font-semibold ${diff.color}`}>
                {diff.label}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Clock size={9} /> {drill.duration}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Users size={9} /> {drill.players}
              </span>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <p className="text-sm text-slate-400 pt-3">{drill.description}</p>

          {drill.setup && (
            <div className="bg-blue-500/10 border border-blue-500/15 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wide mb-1">⚙️ Setup</p>
              <p className="text-xs text-blue-200/80">{drill.setup}</p>
            </div>
          )}

          {drill.equipment?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">📦 Equipment</p>
              <div className="flex flex-wrap gap-1.5">
                {drill.equipment.map((item, i) => (
                  <span key={i} className="bg-white/5 border border-white/8 text-slate-400 text-[11px] px-2 py-1 rounded-lg">{item}</span>
                ))}
              </div>
            </div>
          )}

          {drill.instructions?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">📋 Instructions</p>
              <ol className="space-y-1.5">
                {drill.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {drill.coachingCues?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">🗣️ Coaching Cues</p>
              <div className="flex flex-wrap gap-1.5">
                {drill.coachingCues.map((cue, i) => (
                  <span key={i} className="bg-amber-500/10 text-amber-300 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-amber-500/15">
                    "{cue}"
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {drill.heartValue && (
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg">💚 {drill.heartValue}</span>
            )}
            {drill.tipsModel && (
              <span className="bg-blue-500/10 text-blue-300 text-[10px] font-bold px-2 py-1 rounded-lg">🔵 TIPS: {drill.tipsModel}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Drills() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeFramework, setActiveFramework] = useState('All')

  const filtered = useMemo(() => {
    let result = DRILLS
    if (query.trim()) result = searchDrills(query)
    if (activeCategory !== 'All') result = result.filter(d => d.category === activeCategory)
    if (activeFramework !== 'All') result = result.filter(d => d.framework === activeFramework)
    return result
  }, [query, activeCategory, activeFramework])

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display font-black text-2xl text-slate-100">Drill Library</h1>
        <p className="text-slate-500 text-sm">{DRILLS.length} drills from 5 frameworks</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search drills..."
          className="w-full glass-input pl-10 pr-4 py-3 text-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...FRAMEWORKS].map(fw => (
          <button
            key={fw}
            onClick={() => setActiveFramework(fw)}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeFramework === fw
                ? fw === 'All' ? 'bg-slate-200 text-slate-900' : `${FRAMEWORK_COLORS[fw]} shadow-sm`
                : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
              }`}
          >
            {fw}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...DRILL_CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${activeCategory === cat
                ? 'gradient-emerald text-white shadow-sm'
                : 'glass-card-solid text-slate-500 hover:text-slate-300'
              }`}
          >
            {cat === 'All' ? 'All Categories' : `${CATEGORY_ICONS[cat]} ${cat}`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold text-slate-300">No drills found</p>
            <p className="text-sm">Try a different search or filter</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600 font-medium">{filtered.length} drill{filtered.length !== 1 ? 's' : ''} found</p>
            {filtered.map(drill => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
