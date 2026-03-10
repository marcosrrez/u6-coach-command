import { useState, useEffect, useMemo } from 'react'
import { X, Search, Plus, Clock, Users, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { DRILLS, DRILL_CATEGORIES, FRAMEWORKS } from '../data/drills'
import { getCustomDrills } from '../db/db'

const FRAMEWORK_COLORS = {
    Barça: 'bg-blue-500/20 text-blue-300',
    Arsenal: 'bg-red-500/20 text-red-300',
    Ajax: 'bg-amber-500/20 text-amber-300',
    Coerver: 'bg-violet-500/20 text-violet-300',
    Funino: 'bg-teal-500/20 text-teal-300',
    Universal: 'bg-slate-500/20 text-slate-300',
}

const DIFF_LABELS = ['', 'Beginner', 'Intermediate', 'Advanced']

function DrillCard({ drill, expandedId, setExpandedId, handleSelect }) {
    return (
        <div className="glass-card-solid overflow-hidden">
            <button
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(expandedId === drill.id ? null : drill.id)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-200">{drill.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${FRAMEWORK_COLORS[drill.framework] || ''}`}>
                            {drill.framework}
                        </span>
                        {drill.isCustom && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 flex items-center gap-0.5">
                                <Sparkles size={8} /> AI
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-0.5"><Clock size={10} /> {drill.duration}</span>
                        <span className="flex items-center gap-0.5"><Users size={10} /> {drill.players}</span>
                        <span>{DIFF_LABELS[drill.difficulty] || ''}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={e => { e.stopPropagation(); handleSelect(drill) }}
                        className="p-1.5 rounded-lg gradient-emerald text-white hover:opacity-90 transition-opacity"
                    >
                        <Plus size={14} />
                    </button>
                    {expandedId === drill.id
                        ? <ChevronUp size={12} className="text-slate-500" />
                        : <ChevronDown size={12} className="text-slate-500" />
                    }
                </div>
            </button>

            {expandedId === drill.id && (
                <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-2">
                    <p className="text-xs text-slate-400">{drill.description}</p>
                    {drill.setup && (
                        <div className="bg-blue-500/10 border border-blue-500/15 rounded-lg p-2">
                            <p className="text-[10px] font-bold text-blue-300 uppercase mb-0.5">Setup</p>
                            <p className="text-xs text-blue-200/80">{drill.setup}</p>
                        </div>
                    )}
                    {drill.instructions?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Steps</p>
                            <ol className="space-y-0.5">
                                {drill.instructions.map((s, i) => (
                                    <li key={i} className="text-xs text-slate-400 flex gap-1.5">
                                        <span className="text-emerald-400 font-bold flex-shrink-0">{i + 1}.</span>
                                        {s}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const PHASE_CATEGORY_MAP = {
    'Dynamic Activation': ['Warm-Up'],
    'Technical Block': ['Dribbling', 'Passing', 'Shooting', '1v1', 'Scanning'],
    'Small-Sided Game': ['Small-Sided Game', 'Rondo', '1v1'],
    'HEART Circle': ['Fun / Story', 'Cool-Down'],
}

export default function DrillPicker({ open, onClose, onSelect, phaseName }) {
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [framework, setFramework] = useState('All')
    const [expandedId, setExpandedId] = useState(null)
    const [customDrillsList, setCustomDrillsList] = useState([])

    useEffect(() => {
        if (open) getCustomDrills().then(setCustomDrillsList)
    }, [open])

    const allDrills = useMemo(() => {
        return [...DRILLS, ...customDrillsList.map(d => ({ ...d, id: `custom-${d.id}`, isCustom: true }))]
    }, [customDrillsList])

    const { suggested, rest } = useMemo(() => {
        let results = allDrills
        if (category !== 'All') results = results.filter(d => d.category === category)
        if (framework !== 'All') results = results.filter(d => d.framework === framework)
        if (search.trim()) {
            const q = search.toLowerCase()
            results = results.filter(d =>
                d.name.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q)
            )
        }
        const priorityCategories = PHASE_CATEGORY_MAP[phaseName] || []
        if (priorityCategories.length === 0 || category !== 'All') {
            return { suggested: [], rest: results }
        }
        return {
            suggested: results.filter(d => priorityCategories.includes(d.category)),
            rest: results.filter(d => !priorityCategories.includes(d.category)),
        }
    }, [search, category, framework, allDrills, phaseName])

    const handleSelect = (drill) => {
        // Convert drill library entry to an activity object
        const activity = {
            drillId: drill.id,
            name: drill.name,
            duration: 5, // default 5 min
            framework: drill.framework,
            setup: drill.setup,
            description: drill.description,
            instructions: drill.instructions,
            coachingCues: drill.coachingCues,
        }
        onSelect(activity)
        onClose()
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-slate-900 border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div>
                        <h2 className="font-display font-bold text-slate-100 text-lg">Add Drill</h2>
                        <p className="text-xs text-slate-500">Adding to {phaseName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-white/5">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search drills..."
                            className="w-full glass-input pl-9 pr-3 py-2 text-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-white/5 scrollbar-hide">
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="text-xs bg-white/5 border border-white/10 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500/30"
                    >
                        <option value="All">All Categories</option>
                        {DRILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={framework}
                        onChange={e => setFramework(e.target.value)}
                        className="text-xs bg-white/5 border border-white/10 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500/30"
                    >
                        <option value="All">All Frameworks</option>
                        {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <span className="text-[10px] text-slate-600 flex items-center ml-auto flex-shrink-0">
                        {suggested.length + rest.length} drills
                    </span>
                </div>

                {/* Drill list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {suggested.length === 0 && rest.length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-8">No drills found</p>
                    ) : (
                        <>
                            {suggested.length > 0 && (
                                <>
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-1 pb-1">
                                        ★ Suggested for {phaseName}
                                    </p>
                                    {suggested.map(drill => <DrillCard key={drill.id} drill={drill} expandedId={expandedId} setExpandedId={setExpandedId} handleSelect={handleSelect} />)}
                                    {rest.length > 0 && (
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="flex-1 h-px bg-white/5" />
                                            <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">Full Library</span>
                                            <div className="flex-1 h-px bg-white/5" />
                                        </div>
                                    )}
                                </>
                            )}
                            {rest.map(drill => <DrillCard key={drill.id} drill={drill} expandedId={expandedId} setExpandedId={setExpandedId} handleSelect={handleSelect} />)}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
