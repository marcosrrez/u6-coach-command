import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react'
import { DRILLS, DRILL_CATEGORIES, FRAMEWORKS, searchDrills, getDrillsByCategory, getDrillsByFramework } from '../data/drills'

const FRAMEWORK_COLORS = {
  Barça: 'bg-blue-600 text-white',
  Arsenal: 'bg-red-600 text-white',
  Ajax: 'bg-amber-500 text-white',
  Coerver: 'bg-purple-600 text-white',
  Funino: 'bg-green-600 text-white',
  Universal: 'bg-gray-500 text-white',
}

const DIFFICULTY = { 1: { label: 'Beginner', color: 'text-green-600' }, 2: { label: 'Intermediate', color: 'text-amber-600' }, 3: { label: 'Advanced', color: 'text-red-600' } }

const CATEGORY_ICONS = {
  'Warm-Up': '🏃', 'Dribbling': '⚽', 'Passing': '↔️', 'Shooting': '🎯',
  'Rondo': '⭕', 'Small-Sided Game': '🏟️', '1v1': '🤺', 'Scanning': '👀',
  'Fun / Story': '🎭', 'Cool-Down': '💚',
}

function DrillCard({ drill }) {
  const [expanded, setExpanded] = useState(false)
  const diff = DIFFICULTY[drill.difficulty]

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200`}>
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{CATEGORY_ICONS[drill.category] || '⚽'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-bold text-gray-900 text-sm leading-tight">{drill.name}</h3>
              {expanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[drill.framework] || 'bg-gray-200 text-gray-700'}`}>
                {drill.framework}
              </span>
              <span className={`text-[10px] font-semibold ${diff.color}`}>
                {diff.label}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock size={9} /> {drill.duration}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Users size={9} /> {drill.players}
              </span>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
          {/* Description */}
          <p className="text-sm text-gray-600 pt-3">{drill.description}</p>

          {/* Setup */}
          {drill.setup && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1">⚙️ Setup</p>
              <p className="text-xs text-blue-700">{drill.setup}</p>
            </div>
          )}

          {/* Equipment */}
          {drill.equipment?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">📦 Equipment</p>
              <div className="flex flex-wrap gap-1.5">
                {drill.equipment.map((item, i) => (
                  <span key={i} className="bg-gray-50 border border-gray-200 text-gray-600 text-[11px] px-2 py-1 rounded-lg">{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {drill.instructions?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">📋 Instructions</p>
              <ol className="space-y-1.5">
                {drill.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Coaching cues */}
          {drill.coachingCues?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">🗣️ Coaching Cues</p>
              <div className="flex flex-wrap gap-1.5">
                {drill.coachingCues.map((cue, i) => (
                  <span key={i} className="bg-amber-50 text-amber-800 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-amber-200">
                    "{cue}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* HEART + TIPS */}
          <div className="flex gap-2">
            {drill.heartValue && (
              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg">💚 {drill.heartValue}</span>
            )}
            {drill.tipsModel && (
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-lg">🔵 TIPS: {drill.tipsModel}</span>
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
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl text-gray-900">Drill Library</h1>
        <p className="text-gray-500 text-sm">{DRILLS.length} drills from 5 frameworks</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search drills..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
        />
      </div>

      {/* Framework filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...FRAMEWORKS].map(fw => (
          <button
            key={fw}
            onClick={() => setActiveFramework(fw)}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
              activeFramework === fw
                ? fw === 'All' ? 'bg-gray-800 text-white' : `${FRAMEWORK_COLORS[fw]} shadow-sm`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {fw}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...DRILL_CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              activeCategory === cat
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            {cat === 'All' ? 'All Categories' : `${CATEGORY_ICONS[cat]} ${cat}`}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold">No drills found</p>
            <p className="text-sm">Try a different search or filter</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium">{filtered.length} drill{filtered.length !== 1 ? 's' : ''} found</p>
            {filtered.map(drill => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
