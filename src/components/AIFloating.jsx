import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bot, Send, Loader2, AlertCircle, User, Wrench, Sparkles, ChevronDown, Settings, Trash2 } from 'lucide-react'
import { getSetting, setSetting } from '../db/db'
import { TOOL_DEFINITIONS, executeTool, buildSystemPrompt } from '../ai/aiTools'
import { callAI, getGeminiKey } from '../ai/aiService'
import { PRACTICES, GAMES } from '../data/sessions'

// ─── Page badge (small chip shown in panel header) ───────────────────────────
function getPageBadge(pathname) {
  const sessionMatch = pathname.match(/^\/session\/(.+)$/)
  const gameMatch = pathname.match(/^\/game\/(.+)$/)
  if (sessionMatch) {
    const s = PRACTICES.find(p => p.id === sessionMatch[1])
    if (s) return { emoji: '📋', label: `Practice ${s.sessionNumber}` }
  }
  if (gameMatch) {
    const g = GAMES.find(g => g.id === gameMatch[1])
    if (g) return { emoji: '⚽', label: `Game ${g.gameNumber}` }
  }
  const map = {
    '/': { emoji: '🏠', label: 'Dashboard' },
    '/calendar': { emoji: '📅', label: 'Calendar' },
    '/drills': { emoji: '🎯', label: 'Drills' },
    '/players': { emoji: '👥', label: 'Players' },
    '/philosophy': { emoji: '📚', label: 'Philosophy' },
  }
  return map[pathname] || { emoji: '⚽', label: 'Coaching App' }
}

// ─── Page context (injected into system prompt) ───────────────────────────────
function getPageContext(pathname) {
  const sessionMatch = pathname.match(/^\/session\/(.+)$/)
  const gameMatch = pathname.match(/^\/game\/(.+)$/)

  if (sessionMatch) {
    const s = PRACTICES.find(p => p.id === sessionMatch[1])
    if (s) return {
      text: `User is viewing Practice ${s.sessionNumber} — "${s.title}" (${s.date}). Theme: ${s.theme}. Focus: ${s.subtitle || s.focus}.`,
      quickPrompts: [
        { label: '📋 Full plan', text: `Show me the full plan for Practice ${s.sessionNumber}.` },
        { label: '🎯 Add drill', text: `Suggest a drill to add to Practice ${s.sessionNumber}.` },
        { label: '💡 Coach tips', text: `Give me field coaching tips for the "${s.title}" theme with 5-year-olds.` },
        { label: '✅ Mark done', text: `We just finished Practice ${s.sessionNumber}. Please mark it as complete.` },
      ],
    }
  }

  if (gameMatch) {
    const g = GAMES.find(g => g.id === gameMatch[1])
    if (g) return {
      text: `User is viewing Game ${g.gameNumber}${g.opponent ? ` vs. ${g.opponent}` : ''} on ${g.date}.`,
      quickPrompts: [
        { label: '🏆 Game prep', text: 'What should I do in the warm-up before a U-6 game?' },
        { label: '⭐ Halftime', text: "What's a great halftime talk for 5-year-olds?" },
        { label: '✅ Mark done', text: `We just finished Game ${g.gameNumber}. Please mark it as complete.` },
      ],
    }
  }

  const PAGE_CONTEXTS = {
    '/': {
      text: 'User is on the home dashboard, viewing season overview and upcoming sessions.',
      quickPrompts: [
        { label: '📋 Next practice', text: 'Show me the plan for my next practice session.' },
        { label: '📊 Season overview', text: 'Give me a quick overview of my season progress.' },
        { label: '🎯 Create drill', text: 'Create a fun themed drill for my 5-year-olds.' },
        { label: '👥 My players', text: 'Show me my player roster.' },
      ],
    },
    '/calendar': {
      text: 'User is viewing the full season calendar with all 16 practices and 8 games.',
      quickPrompts: [
        { label: '📊 Progress', text: 'How many sessions have I completed this season?' },
        { label: '🗓️ Upcoming', text: 'What are my next 3 sessions?' },
        { label: '📋 Week focus', text: 'What should I focus on in training this week?' },
      ],
    },
    '/drills': {
      text: 'User is browsing the drill library.',
      quickPrompts: [
        { label: '🎭 Story drill', text: 'Create a story-based dribbling drill with a pirate theme and show me the field setup.' },
        { label: '🔵 Barça drills', text: 'Show me all Barça-style drills in the library.' },
        { label: '⭐ Top picks', text: 'What are your top 3 drills for 5-year-olds?' },
        { label: '🆕 Custom drill', text: 'Create a new warm-up drill and add it to my library.' },
      ],
    },
    '/players': {
      text: 'User is on the players/roster page.',
      quickPrompts: [
        { label: '👥 Roster', text: 'List all my players with their details.' },
        { label: '➕ Add player', text: 'Add a new player to my roster.' },
        { label: '📈 Development', text: 'How is each player developing this season?' },
        { label: '📝 Save note', text: 'I want to record a development note for a player.' },
      ],
    },
    '/philosophy': {
      text: 'User is reading the coaching philosophy page.',
      quickPrompts: [
        { label: '💡 HEART values', text: 'Explain the Barça HEART values in simple terms.' },
        { label: '🧠 Rondo setup', text: 'Show me how to set up a Rondo with 5-year-olds — draw the field diagram.' },
        { label: '⚡ Ajax TIPS', text: 'Explain the Ajax TIPS model for U-6 coaching.' },
      ],
    },
  }

  return PAGE_CONTEXTS[pathname] || {
    text: 'User is using the coaching app.',
    quickPrompts: [
      { label: '📋 Next session', text: 'Show me my next practice plan.' },
      { label: '🎯 Create drill', text: 'Create a fun drill for my 5-year-olds.' },
      { label: '📊 Season', text: 'Give me my season overview.' },
    ],
  }
}

// ─── Field diagram SVG renderer ───────────────────────────────────────────────
function FieldDiagram({ data }) {
  // Stable random ID per mount — prevents marker ID collisions across multiple diagrams
  const [id] = useState(() => `d${Math.random().toString(36).slice(2, 8)}`)
  const CELL = 36
  const cols = Math.min(Math.max(data.cols || 8, 4), 14)
  const rows = Math.min(Math.max(data.rows || 6, 3), 10)
  const W = cols * CELL
  const H = rows * CELL

  const TYPE_COLORS = {
    cone: '#f59e0b',
    player: '#10b981',
    defender: '#ef4444',
    coach: '#3b82f6',
    ball: '#f8fafc',
    goal: '#f8fafc',
  }

  return (
    <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs">📐</span>
        <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">{data.title}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-xl" style={{ maxHeight: 200 }}>
        {/* Field background */}
        <rect x={0} y={0} width={W} height={H} fill="#1c3d1c" rx={4} />
        {/* Grid lines */}
        {Array.from({ length: cols - 1 }, (_, i) => (
          <line key={`v${i}`} x1={(i + 1) * CELL} y1={4} x2={(i + 1) * CELL} y2={H - 4}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line key={`h${i}`} x1={4} y1={(i + 1) * CELL} x2={W - 4} y2={(i + 1) * CELL}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {/* Border */}
        <rect x={2} y={2} width={W - 4} height={H - 4} fill="none"
          stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} rx={3} />
        {/* Arrowhead marker — unique ID per diagram instance */}
        <defs>
          <marker id={id} markerWidth={7} markerHeight={6} refX={6} refY={3} orient="auto">
            <polygon points="0 0, 7 3, 0 6" fill="rgba(255,255,255,0.75)" />
          </marker>
        </defs>
        {/* Arrows */}
        {(data.arrows || []).map((arr, i) => {
          const x1 = arr.fromCol * CELL + CELL / 2
          const y1 = arr.fromRow * CELL + CELL / 2
          const x2 = arr.toCol * CELL + CELL / 2
          const y2 = arr.toRow * CELL + CELL / 2
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={arr.color || 'rgba(255,255,255,0.65)'}
              strokeWidth={1.8}
              strokeDasharray={arr.dashed ? '5,3' : undefined}
              markerEnd={`url(#${id})`} />
          )
        })}
        {/* Elements */}
        {(data.elements || []).map((el, i) => {
          const x = el.col * CELL + CELL / 2
          const y = el.row * CELL + CELL / 2
          const col = el.color || TYPE_COLORS[el.type] || '#ffffff'

          if (el.type === 'cone') {
            return (
              <g key={i}>
                <polygon points={`${x},${y - 11} ${x - 8},${y + 7} ${x + 8},${y + 7}`} fill={col} opacity={0.9} />
                {el.label && <text x={x} y={y + 18} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.4)">{el.label}</text>}
              </g>
            )
          }
          if (el.type === 'goal') {
            return (
              <g key={i}>
                <rect x={x - 14} y={y - 7} width={28} height={14} fill="none" stroke={col} strokeWidth={2.5} rx={1} />
                {el.label && <text x={x} y={y + 20} textAnchor="middle" fontSize={8} fill={col} opacity={0.6}>{el.label}</text>}
              </g>
            )
          }
          if (el.type === 'ball') {
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={7} fill={col} />
                <circle cx={x} cy={y} r={7} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
              </g>
            )
          }
          // player / defender / coach
          const defaultLabel = { player: 'P', defender: 'D', coach: 'C' }[el.type] || '?'
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={12} fill={col} opacity={0.85} />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="white">
                {el.label || defaultLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Message component ────────────────────────────────────────────────────────
function Message({ msg }) {
  if (msg.role === 'diagram') return <FieldDiagram data={msg.data} />

  const isUser = msg.role === 'user'

  if (msg.role === 'action') {
    return (
      <div className="flex gap-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
          <Wrench size={11} />
        </div>
        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl rounded-tl-sm px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={10} className="text-emerald-400" />
            <span className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider">{msg.toolName}</span>
          </div>
          <p className="text-xs text-emerald-200/80">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isUser ? 'gradient-emerald text-white' : 'bg-white/5 border border-white/10 text-slate-400'}`}>
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${isUser ? 'gradient-emerald text-white rounded-tr-sm' : 'glass-card-solid text-slate-300 rounded-tl-sm'}`}>
        {(msg.content || '').split('\n').map((line, i) => {
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return <p key={i} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-400">{line.slice(2)}</p>
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={i} className="font-semibold text-slate-100">{line.slice(2, -2)}</p>
          }
          return <p key={i} className={line === '' ? 'mt-1.5' : ''}>{line}</p>
        })}
      </div>
    </div>
  )
}

// ─── Main floating AI ─────────────────────────────────────────────────────────
export default function AIFloating() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState(null)
  const [geminiKey, setGeminiKey] = useState(null)
  const [activeProvider, setActiveProvider] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const systemPromptRef = useRef('')

  // ── Always refresh API key when panel opens ──────────────────────────────────
  useEffect(() => {
    if (!open) return
    getSetting('groqApiKey').then(key => {
      const resolved = key || import.meta.env.VITE_GROQ_API_KEY || null
      setApiKey(resolved)
    })
    setGeminiKey(getGeminiKey())
  }, [open])

  // ── One-time init: load history or show welcome ──────────────────────────────
  useEffect(() => {
    if (!open || initialized) return
    const init = async () => {
      try {
        const key = await getSetting('groqApiKey')
        const resolved = key || import.meta.env.VITE_GROQ_API_KEY || null
        const gKey = getGeminiKey()
        setGeminiKey(gKey)
        const hasAnyKey = !!(resolved || gKey)
        const pageCtx = getPageContext(pathname)
        const base = await buildSystemPrompt()
        systemPromptRef.current = base + `\n\n## Current Page Context\n${pageCtx.text}`

        // Restore saved chat history
        const saved = await getSetting('aiChatHistory')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed)
              return
            }
          } catch { } // ignore JSON error
        }

        // No history — show welcome
        setMessages([{
          role: 'assistant',
          content: hasAnyKey
            ? `Hey Coach! 👋 How can I help you today?`
            : `Hi Coach! 👋 Add your free Groq API key in Settings to unlock AI coaching.`,
        }])
      } catch (e) {
        console.error('AIFloating init error:', e)
        setMessages([{
          role: 'assistant',
          content: 'Hi Coach! 👋 Add your free Groq API key in Settings to unlock AI coaching.',
        }])
      } finally {
        setInitialized(true)
      }
    }
    init()
  }, [open, initialized, pathname])

  // ── Persist chat to IndexedDB whenever messages change ──────────────────────
  useEffect(() => {
    if (!initialized) return
    const toSave = messages.filter(m => m.role !== 'action').slice(-60)
    setSetting('aiChatHistory', JSON.stringify(toSave))
  }, [messages, initialized])

  // ── Patch system prompt + welcome on route change ────────────────────────────
  useEffect(() => {
    if (!initialized) return
    const ctx = getPageContext(pathname)
    systemPromptRef.current = systemPromptRef.current.replace(
      /\n\n## Current Page Context\n[\s\S]*/,
      `\n\n## Current Page Context\n${ctx.text}`
    )
    setMessages(prev => {
      if (prev.length !== 1 || prev[0].role !== 'assistant') return prev
      return [{ role: 'assistant', content: (apiKey || geminiKey) ? `Hey Coach! 👋 How can I help you today?` : prev[0].content }]
    })
  }, [pathname, initialized])

  // ── Update welcome when API key arrives ──────────────────────────────────────
  useEffect(() => {
    if (!initialized || !(apiKey || geminiKey)) return
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant' && prev[0].content.includes('API key')) {
        return [{ role: 'assistant', content: `Hey Coach! 👋 How can I help you today?` }]
      }
      return prev
    })
  }, [apiKey, geminiKey, initialized])

  // ── Scroll + focus ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }, 350)
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Clear chat ────────────────────────────────────────────────────────────────
  const clearChat = () => {
    const hasAnyKey = !!(apiKey || geminiKey)
    const welcome = {
      role: 'assistant',
      content: hasAnyKey ? `Hey Coach! 👋 How can I help you today?` : `Hi Coach! 👋 Add your free Groq API key in Settings to unlock AI coaching.`,
    }
    setMessages([welcome])
    setSetting('aiChatHistory', JSON.stringify([welcome]))
    setActiveProvider(null)
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = text || input.trim()
    const hasAnyKey = !!(apiKey || geminiKey)
    if (!userText || loading || !hasAnyKey) return

    setInput('')
    setError(null)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Exclude action/diagram cards — they're UI-only, not real conversation turns
      const apiMessages = newMessages
        .filter(m => m.role !== 'action' && m.role !== 'diagram')
        .filter((_, i) => !(i === 0 && newMessages[0]?.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }))

      let result = await callAI({ groqKey: apiKey, geminiKey, systemPrompt: systemPromptRef.current, messages: apiMessages })
      setActiveProvider(result.provider)
      let currentMessages = [...newMessages]
      let iterations = 0
      let conversationHistory = [...apiMessages]

      while (result.toolCalls?.length > 0 && iterations < 10) {
        iterations++
        const toolResults = []

        for (const tc of result.toolCalls) {
          const args = JSON.parse(tc.function.arguments || '{}')
          const toolResult = await executeTool(tc.function.name, args)

          // Action card
          currentMessages = [...currentMessages, {
            role: 'action',
            toolName: tc.function.name.replace(/_/g, ' '),
            content: toolResult.message || toolResult.error || `Executed ${tc.function.name}`,
          }]

          // Inject diagram card after the action card
          if (tc.function.name === 'draw_field_diagram' && toolResult.diagram) {
            currentMessages = [...currentMessages, { role: 'diagram', data: toolResult.diagram }]
          }

          setMessages(currentMessages)
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) })
        }

        conversationHistory = [
          ...conversationHistory,
          result.rawAssistantMessage,
          ...toolResults,
        ]

        result = await callAI({
          groqKey: apiKey, geminiKey,
          systemPrompt: systemPromptRef.current,
          messages: conversationHistory,
        })
        setActiveProvider(result.provider)
      }

      if (result.content) {
        setMessages([...currentMessages, { role: 'assistant', content: result.content }])
      }
    } catch (err) {
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const pageCtx = getPageContext(pathname)
  const badge = getPageBadge(pathname)
  const hasUserMessages = messages.some(m => m.role === 'user')

  if (pathname === '/ai') {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Slide-up panel */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-[60] transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="bg-[#0d1117] border border-white/10 rounded-t-3xl shadow-2xl flex flex-col" style={{ height: '78vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl gradient-emerald flex items-center justify-center shadow-lg">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm leading-tight">AI Coach</p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {activeProvider === 'gemini' ? 'Google · Gemini 2.0 Flash' : 'Groq · Llama 3.3'} · Full system access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-500 bg-white/5 border border-white/8 px-2 py-1 rounded-full">
                {badge.emoji} {badge.label}
              </span>
              {hasUserMessages && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 pb-2">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-400">
                  <Bot size={12} />
                </div>
                <div className="glass-card-solid rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                  <span className="text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* No API key — Settings CTA */}
          {!(apiKey || geminiKey) && initialized && (
            <div className="mx-4 mb-2 flex-shrink-0">
              <button
                onClick={() => { setOpen(false); navigate('/settings') }}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-500/15 transition-colors"
              >
                <Settings size={13} />
                Add free Groq API key to unlock AI coaching →
              </button>
            </div>
          )}

          {/* Quick prompts — shown before first user message, only when ready */}
          {!hasUserMessages && !loading && initialized && (apiKey || geminiKey) && (
            <div className="px-4 pt-1 pb-2 flex-shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {pageCtx.quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qp.text)}
                    className="glass-card-solid text-slate-400 text-xs font-medium px-2.5 py-1.5 rounded-full hover:text-emerald-400 hover:border-emerald-500/30 transition-colors active:scale-95"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 flex items-start gap-2 flex-shrink-0">
              <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Input with iOS safe-area padding */}
          <div
            className="flex gap-2 px-4 pt-2 border-t border-white/5 flex-shrink-0"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !initialized ? 'Loading...'
                  : !apiKey ? 'Add Groq API key in Settings to chat'
                    : 'Ask anything — drills, sessions, players, diagrams...'
              }
              disabled={loading || !(apiKey || geminiKey) || !initialized}
              rows={1}
              className="flex-1 glass-input px-3 py-2.5 text-sm resize-none disabled:opacity-40"
              style={{ minHeight: '40px', maxHeight: '80px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !(apiKey || geminiKey)}
              className="flex-shrink-0 w-10 h-10 rounded-xl gradient-emerald text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>

        </div>
      </div>

      {/* FAB — amber dot when conversation exists */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 gradient-emerald rounded-2xl text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            width: 52,
            height: 52,
            bottom: 90,
            right: 'max(16px, calc(50vw - 336px + 16px))',
            boxShadow: '0 4px 24px rgba(16,185,129,0.4)',
          }}
          aria-label="Open AI Coach"
        >
          <Bot size={22} />
          {hasUserMessages && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#0d1117]" />
          )}
        </button>
      )}
    </>
  )
}
