import { useState, useEffect, useRef } from 'react'
import {
  Key, Download, Upload, RotateCcw, Info, Check, Eye, EyeOff,
  ChevronRight, AlertTriangle, Wifi, Database
} from 'lucide-react'
import { getSetting, setSetting, exportData, importData, seedDatabase } from '../db/db'
import { SEASON_INFO } from '../data/sessions'

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
        <Icon size={14} className="text-green-700" />
      </div>
      <h2 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h2>
    </div>
  )
}

function SettingCard({ children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-3">
      {children}
    </div>
  )
}

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importError, setImportError] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    getSetting('groqApiKey').then(key => {
      if (key) {
        setSavedKey(key)
        setApiKey(key)
      }
    })
  }, [])

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    await setSetting('groqApiKey', trimmed)
    setSavedKey(trimmed)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2500)
  }

  const handleRemoveKey = async () => {
    await setSetting('groqApiKey', null)
    setSavedKey(null)
    setApiKey('')
  }

  const handleExport = async () => {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `u6-coach-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        await importData(data)
        setImportSuccess(true)
        setTimeout(() => setImportSuccess(false), 3000)
      } catch (err) {
        setImportError('Invalid backup file. Please use a file exported from this app.')
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleReset = async () => {
    setResetting(true)
    await seedDatabase()
    setResetting(false)
    setResetDone(true)
    setShowResetConfirm(false)
    setTimeout(() => setResetDone(false), 3000)
  }

  const maskedKey = savedKey
    ? savedKey.slice(0, 8) + '••••••••••••••••••••' + savedKey.slice(-4)
    : ''

  return (
    <div className="animate-fade-in pb-4">
      <div className="mb-5">
        <h1 className="font-display font-black text-2xl text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your coaching app</p>
      </div>

      {/* ── AI Section ──────────────────────────────────── */}
      <SectionHeader icon={Key} title="AI Assistant" />
      <SettingCard>
        <div className="p-4">
          <p className="text-sm font-semibold text-gray-800 mb-1">Groq API Key</p>
          <p className="text-xs text-gray-500 mb-3">
            Free at{' '}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noreferrer"
              className="text-green-600 font-medium underline underline-offset-2"
            >
              console.groq.com
            </a>
            {' '}— powers the AI Coach with Llama 3.1
          </p>

          {savedKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <Check size={14} className="text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-800 font-mono flex-1 truncate">
                  {showKey ? savedKey : maskedKey}
                </span>
                <button onClick={() => setShowKey(v => !v)} className="text-green-600 flex-shrink-0">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRemoveKey}
                  className="flex-1 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 rounded-xl py-2 hover:bg-red-100 transition-colors"
                >
                  Remove Key
                </button>
                <button
                  onClick={() => { setSavedKey(null); setApiKey('') }}
                  className="flex-1 text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 rounded-xl py-2 hover:bg-gray-100 transition-colors"
                >
                  Replace Key
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="gsk_••••••••••••••••••••••••"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  keySaved
                    ? 'bg-green-100 text-green-700'
                    : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {keySaved ? '✓ Key Saved!' : 'Save API Key'}
              </button>
            </div>
          )}
        </div>
      </SettingCard>

      {/* ── Data Section ────────────────────────────────── */}
      <SectionHeader icon={Database} title="Data & Backup" />

      {/* Export */}
      <SettingCard>
        <button
          onClick={handleExport}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Export Backup</p>
            <p className="text-xs text-gray-500">Save player data, notes, and scores as JSON</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </button>
      </SettingCard>

      {/* Import */}
      <SettingCard>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Upload size={16} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Import Backup</p>
            <p className="text-xs text-gray-500">
              {importing ? 'Importing…' : 'Restore from a previous backup file'}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        {importSuccess && (
          <div className="px-4 pb-3">
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Check size={13} className="text-green-600" />
              <p className="text-xs text-green-700 font-medium">Import successful!</p>
            </div>
          </div>
        )}
        {importError && (
          <div className="px-4 pb-3">
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500" />
              <p className="text-xs text-red-700">{importError}</p>
            </div>
          </div>
        )}
      </SettingCard>

      {/* Cross-device tip */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-3">
        <Wifi size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">Using on multiple devices?</span> Export on one device and Import on the other to sync your player data and notes.
        </p>
      </div>

      {/* ── Reset Section ───────────────────────────────── */}
      <SectionHeader icon={RotateCcw} title="Reset" />
      <SettingCard>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <RotateCcw size={16} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-600">Reset Player Roster</p>
              <p className="text-xs text-gray-500">Restore default 5-player roster (keeps notes)</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>
        ) : (
          <div className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-700">
                This will re-add the default Player 1–5 roster. Any custom player names or emojis will be overwritten. Notes and scores are kept.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 text-xs font-semibold text-white bg-red-500 rounded-xl py-2.5 hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {resetting ? 'Resetting…' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        )}
        {resetDone && (
          <div className="px-4 pb-3">
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Check size={13} className="text-green-600" />
              <p className="text-xs text-green-700 font-medium">Roster reset complete!</p>
            </div>
          </div>
        )}
      </SettingCard>

      {/* ── About Section ───────────────────────────────── */}
      <SectionHeader icon={Info} title="About" />
      <SettingCard>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">App</span>
            <span className="text-xs font-semibold text-gray-700">U-6 Coach Command</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Season</span>
            <span className="text-xs font-semibold text-gray-700">{SEASON_INFO.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Sessions</span>
            <span className="text-xs font-semibold text-gray-700">16 practices + 8 games</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Storage</span>
            <span className="text-xs font-semibold text-gray-700">Local (IndexedDB)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">AI Model</span>
            <span className="text-xs font-semibold text-gray-700">Llama 3.1 via Groq</span>
          </div>
        </div>

        <div className="border-t border-gray-50 px-4 py-3">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Coaching frameworks: FC Barcelona Academy · The Gunner Way (Arsenal) · Ajax TIPS · Coerver Coaching · Horst Wein / Funino
          </p>
        </div>
      </SettingCard>
    </div>
  )
}
