import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AlertCircle, Bot, User, Settings, Wrench, Sparkles, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSetting } from '../db/db'
import { executeTool, buildSystemPrompt } from '../ai/aiTools'
import { callAI, getGeminiKey } from '../ai/aiService'

const QUICK_PROMPTS = [
  { label: '🎯 Drill idea', text: 'Create a fun dribbling drill with a pirate theme for my 5-year-olds.' },
  { label: '📋 Next practice', text: 'Show me the plan for my next practice session.' },
  { label: '👥 My players', text: 'Show me info about my players.' },
  { label: '⚽ Rondo tips', text: 'How do I explain the 4v1 Rondo to 5-year-olds?' },
  { label: '🔄 Swap drill', text: 'Can you add a fun warm-up to session 1?' },
  { label: '📊 Season', text: 'Give me an overview of my season progress.' },
]

// ─── Message component ────────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user'
  const isAction = msg.role === 'action'

  if (isAction) {
    return (
      <div className="flex gap-2.5">
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
          <Wrench size={13} />
        </div>
        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">{msg.toolName}</span>
          </div>
          <p className="text-sm text-emerald-200/80">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${isUser ? 'gradient-emerald text-white' : 'bg-white/5 border border-white/10 text-slate-400'
        }`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
        ? 'gradient-emerald text-white rounded-tr-sm'
        : 'glass-card-solid text-slate-300 rounded-tl-sm'
        }`}>
        {msg.content.split('\n').map((line, i) => (
          <p key={i} className={line === '' ? 'mt-2' : ''}>{line}</p>
        ))}
      </div>
    </div>
  )
}

// ─── Main AI Chat Page ────────────────────────────────────────────────────────
export default function AIChat() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState(null)
  const [geminiKey, setGeminiKey] = useState(null)
  const [activeProvider, setActiveProvider] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const systemPromptRef = useRef('')

  // Load API keys and build dynamic system prompt
  useEffect(() => {
    const init = async () => {
      const key = await getSetting('groqApiKey')
      const resolvedKey = key || import.meta.env.VITE_GROQ_API_KEY || null
      setApiKey(resolvedKey)
      const gKey = getGeminiKey()
      setGeminiKey(gKey)
      const hasAnyKey = !!(resolvedKey || gKey)

      // Build dynamic system prompt with live context
      systemPromptRef.current = await buildSystemPrompt()

      if (!hasAnyKey) {
        setMessages([{
          role: 'assistant',
          content: "Hi Coach! 👋 I'm your AI coaching assistant with full access to your sessions, drills, and player data.\n\nTo get started, I need your Groq API key (it's free!). Head to Settings to add it.",
        }])
      } else {
        setMessages([{
          role: 'assistant',
          content: "Hi Coach! 👋 I'm your AI coaching assistant with full access to your entire coaching system.\n\nI can:\n• 🎯 Create custom drills and add them to your library\n• 📋 Read and modify any session plan\n• 👥 Track player notes and development\n• 📊 Show your season overview\n\nJust ask me anything!",
        }])
      }
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ─── Send message with tool calling support ─────────────────────────────────
  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    const hasAnyKey = !!(apiKey || geminiKey)
    if (!hasAnyKey) {
      setError('No API key found. Please add a Groq key in Settings.')
      return
    }

    setInput('')
    setError(null)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Build API messages (exclude welcome message and action cards)
      const apiMessages = newMessages
        .filter(m => m.role !== 'action')
        .filter((_, i) => !(i === 0 && newMessages[0]?.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }))

      // Call AI with fallback
      let result = await callAI({ groqKey: apiKey, geminiKey, systemPrompt: systemPromptRef.current, messages: apiMessages })
      setActiveProvider(result.provider)
      let currentMessages = [...newMessages]

      // Tool calling loop (max 10 iterations for safety)
      let iterations = 0
      while (result.toolCalls && result.toolCalls.length > 0 && iterations < 10) {
        iterations++

        // Execute each tool call
        const toolResults = []
        for (const tc of result.toolCalls) {
          const args = JSON.parse(tc.function.arguments || '{}')
          const toolResult = await executeTool(tc.function.name, args)

          // Show action card
          const actionMsg = {
            role: 'action',
            toolName: tc.function.name.replace(/_/g, ' '),
            content: toolResult.message || toolResult.error || `Executed ${tc.function.name}`,
          }
          currentMessages = [...currentMessages, actionMsg]
          setMessages(currentMessages)

          toolResults.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          })
        }

        // Send tool results back for final response
        const followUp = [
          ...apiMessages,
          result.rawAssistantMessage,
          ...toolResults,
        ]
        result = await callAI({ groqKey: apiKey, geminiKey, systemPrompt: systemPromptRef.current, messages: followUp })
        setActiveProvider(result.provider)
      }

      // Final assistant reply
      if (result.content) {
        currentMessages = [...currentMessages, { role: 'assistant', content: result.content }]
        setMessages(currentMessages)
      }
    } catch (err) {
      console.error('AI Chat error:', err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-display font-black text-2xl text-slate-100">AI Coach</h1>
          <p className="text-slate-500 text-sm">
            Full system access · {activeProvider === 'gemini' ? 'Google Gemini 2.0 Flash' : 'Groq + Llama 3.3'}
          </p>
        </div>
        {!(apiKey || geminiKey) && (
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-amber-500/15 transition-colors"
          >
            <Settings size={13} /> Add API Key
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-400">
              <Bot size={14} />
            </div>
            <div className="glass-card-solid rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              <span className="text-xs text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.filter(m => m.role === 'user').length === 0 && !loading && (
        <div className="py-3">
          <p className="text-xs text-slate-600 font-medium mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qp.text)}
                className="glass-card-solid text-slate-400 text-xs font-medium px-3 py-1.5 rounded-full hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything — I can read & edit your sessions, drills, and players..."
          disabled={loading || !(apiKey || geminiKey)}
          rows={1}
          className="flex-1 glass-input px-3 py-2.5 text-sm resize-none disabled:opacity-40"
          style={{ minHeight: '44px', maxHeight: '100px' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim() || !apiKey}
          className="flex-shrink-0 w-10 h-10 rounded-xl gradient-emerald text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
