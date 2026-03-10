import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Send, Loader2, AlertCircle, User, Wrench, Sparkles, ChevronDown } from 'lucide-react'
import { getSetting } from '../db/db'
import { TOOL_DEFINITIONS, executeTool, buildSystemPrompt } from '../ai/aiTools'
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
        { label: '🎭 Story drill', text: 'Create a story-based dribbling drill with a pirate theme.' },
        { label: '🔵 Barça drills', text: 'Show me all Barça-style drills in the library.' },
        { label: '⭐ Top picks', text: 'What are your top 3 drills for 5-year-olds?' },
        { label: '🆕 Custom drill', text: 'Create a new warm-up drill and add it to my library.' },
      ],
    },
    '/players': {
      text: 'User is on the players/roster page.',
      quickPrompts: [
        { label: '👥 Roster', text: 'List all my players with their details.' },
        { label: '📈 Development', text: 'How is each player developing this season?' },
        { label: '📝 Save note', text: 'I want to record a development note for a player.' },
      ],
    },
    '/philosophy': {
      text: 'User is reading the coaching philosophy page.',
      quickPrompts: [
        { label: '💡 HEART values', text: 'Explain the Barça HEART values in simple terms.' },
        { label: '🧠 Rondo setup', text: 'How do I run a Rondo with 5-year-olds?' },
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

// ─── Message component ────────────────────────────────────────────────────────
function Message({ msg }) {
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
        {msg.content.split('\n').map((line, i) => {
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
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState(null)
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
  }, [open])

  // ── One-time init: build system prompt + welcome message ─────────────────────
  useEffect(() => {
    if (!open || initialized) return
    const init = async () => {
      const key = await getSetting('groqApiKey')
      const resolved = key || import.meta.env.VITE_GROQ_API_KEY || null
      const pageCtx = getPageContext(pathname)
      const base = await buildSystemPrompt()
      systemPromptRef.current = base + `\n\n## Current Page Context\n${pageCtx.text}`
      setMessages([{
        role: 'assistant',
        content: resolved ? `Hey Coach! 👋 How can I help you today?` : `Hi Coach! 👋 Add your free Groq API key in Settings to unlock AI coaching.`,
      }])
      setInitialized(true)
    }
    init()
  }, [open, initialized])

  // ── Patch system prompt when route changes; refresh welcome if pre-conversation ─
  useEffect(() => {
    if (!initialized) return
    const ctx = getPageContext(pathname)
    systemPromptRef.current = systemPromptRef.current.replace(
      /\n\n## Current Page Context\n[\s\S]*/,
      `\n\n## Current Page Context\n${ctx.text}`
    )
    // If still on first message, update it to reflect new location
    setMessages(prev => {
      if (prev.length !== 1 || prev[0].role !== 'assistant') return prev
      return [{
        role: 'assistant',
        content: apiKey ? `Hey Coach! 👋 How can I help you today?` : prev[0].content,
      }]
    })
  }, [pathname, initialized])

  // ── Update welcome message text when API key comes in ────────────────────────
  useEffect(() => {
    if (!initialized || !apiKey) return
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant' && prev[0].content.includes('API key')) {
        return [{ role: 'assistant', content: `Hey Coach! 👋 How can I help you today?` }]
      }
      return prev
    })
  }, [apiKey, initialized])

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

  // ── Groq API ──────────────────────────────────────────────────────────────────
  const callGroq = async (msgs) => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPromptRef.current }, ...msgs],
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API error ${res.status}`)
    }
    const data = await res.json()
    const msg = data.choices?.[0]?.message
    return { content: msg?.content || null, toolCalls: msg?.tool_calls || null, rawAssistantMessage: msg }
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading || !apiKey) return

    setInput('')
    setError(null)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMessages = newMessages
        .filter(m => m.role !== 'action')
        .filter((_, i) => !(i === 0 && newMessages[0]?.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }))

      let result = await callGroq(apiMessages)
      let currentMessages = [...newMessages]
      let iterations = 0

      while (result.toolCalls?.length > 0 && iterations < 5) {
        iterations++
        const toolResults = []
        for (const tc of result.toolCalls) {
          const args = JSON.parse(tc.function.arguments || '{}')
          const toolResult = await executeTool(tc.function.name, args)
          currentMessages = [...currentMessages, {
            role: 'action',
            toolName: tc.function.name.replace(/_/g, ' '),
            content: toolResult.message || toolResult.error || `Executed ${tc.function.name}`,
          }]
          setMessages(currentMessages)
          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) })
        }
        result = await callGroq([...apiMessages, result.rawAssistantMessage, ...toolResults])
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

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Slide-up panel */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
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
                <p className="text-[10px] text-slate-500 leading-tight">Groq · Llama 3.3 · Full system access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Current page context badge */}
              <span className="text-[10px] font-medium text-slate-500 bg-white/5 border border-white/8 px-2 py-1 rounded-full">
                {badge.emoji} {badge.label}
              </span>
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

          {/* Quick prompts — before first user message */}
          {!hasUserMessages && !loading && initialized && (
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

          {/* Input with safe-area bottom padding */}
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
                : 'Ask anything — drills, sessions, players...'
              }
              disabled={loading || !apiKey || !initialized}
              rows={1}
              className="flex-1 glass-input px-3 py-2.5 text-sm resize-none disabled:opacity-40"
              style={{ minHeight: '40px', maxHeight: '80px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !apiKey}
              className="flex-shrink-0 w-10 h-10 rounded-xl gradient-emerald text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>

        </div>
      </div>

      {/* FAB — with conversation indicator dot */}
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
          {/* Dot indicator: conversation in progress */}
          {hasUserMessages && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#0d1117]" />
          )}
        </button>
      )}
    </>
  )
}
