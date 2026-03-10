import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AlertCircle, Bot, User, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSetting } from '../db/db'
import { SEASON_INFO, PRACTICES, GAMES } from '../data/sessions'

const SYSTEM_PROMPT = `You are an expert U-6 soccer coach assistant helping coach a team of 5 players through an 8-week season. You have deep knowledge of these frameworks:

1. FC Barcelona (Barça Academy): Dynamic Systems Theory, 4-phase sessions, HEART values (Humility, Effort, Ambition, Respect, Teamwork), 3-Second Rule, Rondo, Further Leg concept, 3v3/4v4 no-goalkeeper games.

2. Arsenal (The Gunner Way): Strong Young Gunner (SYG) model, 4 Pillars, 4 S's (Safe, Sweating, Smiling, Success), Play-Practice-Play structure, story-based coaching.

3. Ajax TIPS Model: Technique, Insight, Personality, Speed. "Ajax Head" scanning. Chaos Rondo with instant transitions.

4. Coerver Coaching: Foundation Pyramid, 1,000 touches per session, 6 foot surfaces, Mirror Game, Killing Touch, Step-Hop-Go, Cruyff Turn.

5. Horst Wein / Funino: 4-goal field, 3v3 format, Scoring Zone, coach asks questions ONLY during stoppages.

The team has 5 players aged 5-6. Practice days are Tuesdays and Thursdays. Games are on Saturdays. Sessions are 45 minutes.

Key principles:
- Every child succeeds every session
- Joy and play are the priority
- Technical development through repetition and fun
- No keeper in small-sided games
- Questions not instructions (Funino principle)
- Individual ball mastery before group play

Be warm, encouraging, and practical. Give specific, actionable coaching tips. Keep answers concise for a coach reading on their phone.`

const QUICK_PROMPTS = [
  { label: '🎯 Drill idea', text: 'Give me a fun dribbling drill for 5 players aged 5-6.' },
  { label: '💬 Team talk', text: 'Write a 1-minute team talk for U-6 kids before a game.' },
  { label: '😤 Crying player', text: 'One of my players is crying and doesn\'t want to play. What do I do?' },
  { label: '⚽ Rondo tips', text: 'How do I explain the 4v1 Rondo to 5-year-olds?' },
  { label: '🏃 Warm-up', text: 'What\'s a great 5-minute warm-up for U-6 kids that gets them excited?' },
  { label: '👁️ Scanning', text: 'How do I teach the "Ajax Head" scanning technique to 5-year-olds?' },
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
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

export default function AIChat() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    getSetting('groqApiKey').then(key => {
      setApiKey(key)
      if (!key) {
        setMessages([{
          role: 'assistant',
          content: "Hi Coach! 👋 I'm your AI coaching assistant, trained on Barcelona, Arsenal, Ajax, Coerver, and Funino methods.\n\nTo get started, I need your Groq API key (it's free!). Head to Settings to add it.",
        }])
      } else {
        setMessages([{
          role: 'assistant',
          content: "Hi Coach! 👋 I'm your AI coaching assistant, powered by the best youth soccer frameworks: Barça, Arsenal, Ajax, Coerver, and Funino.\n\nAsk me anything about drills, behavior management, tactical questions, or how to make training more fun!",
        }])
      }
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    if (!apiKey) {
      setError('No Groq API key found. Please add it in Settings.')
      return
    }

    setInput('')
    setError(null)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMessages = newMessages
        .filter((_, i) => !(i === 0 && newMessages[0]?.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...apiMessages,
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error?.message || `API error ${response.status}`)
      }

      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(`Error: ${err.message}`)
      setMessages(prev => prev.slice(0, -1))
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
          <p className="text-slate-500 text-sm">Powered by Groq + Llama 3.1</p>
        </div>
        {!apiKey && (
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
            <div className="glass-card-solid rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.filter(m => m.role === 'user').length === 0 && !loading && (
        <div className="py-3">
          <p className="text-xs text-slate-600 font-medium mb-2">Quick starters:</p>
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
          placeholder="Ask about drills, behavior, tactics..."
          disabled={loading || !apiKey}
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
