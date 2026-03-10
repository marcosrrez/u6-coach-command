import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const CORE_PRINCIPLES = [
    {
        icon: '🎮',
        title: 'The Game is the Teacher',
        description: 'We don\'t lecture — the game teaches. Small-sided games with smart constraints create natural learning moments. The coach asks questions, never gives answers.',
        source: 'Funino / Horst Wein',
    },
    {
        icon: '😄',
        title: 'Joy Before Results',
        description: 'If a child isn\'t smiling, their brain isn\'t open to learning motor skills. Joy is our primary metric. Every child must leave feeling they conquered something.',
        source: 'Arsenal 4 S\'s',
    },
    {
        icon: '⚽',
        title: 'The Ball is the Central Sun',
        description: 'All cognitive and social development orbits around the ball. We develop an intense, personal relationship with the ball through 1,000+ touches per session.',
        source: 'Barça Academy / Coerver',
    },
    {
        icon: '🌍',
        title: 'Universal Players, Not Positions',
        description: 'No fixed positions at U-6. Every player is a playmaker. We develop "Total Footballers" who understand space before they understand roles.',
        source: 'Ajax / Dutch Total Football',
    },
]

const FRAMEWORKS = [
    {
        name: 'FC Barcelona',
        tag: 'Barça Academy',
        color: 'from-blue-500 to-blue-700',
        borderColor: 'border-blue-500/30',
        tagBg: 'bg-blue-500/20 text-blue-300',
        philosophy: 'Dynamic Systems Theory — learning occurs through the continuous, non-linear interaction of the individual, the task, and the environment.',
        keyIdeas: [
            'HEART Values: Humility, Effort, Ambition, Respect, Teamwork',
            '3-Second Rule: win the ball back immediately after losing it',
            'Further Leg: receive with the foot furthest from the defender',
            '4-Phase Session: Activation → Technical Block → PSS Games → Reflection',
            'Rondo: the signature of Barça — 3v1 adapted for U-6',
        ],
        signature: 'The Rondo',
    },
    {
        name: 'Arsenal',
        tag: 'The Gunner Way',
        color: 'from-red-500 to-red-700',
        borderColor: 'border-red-500/30',
        tagBg: 'bg-red-500/20 text-red-300',
        philosophy: 'The "Strong Young Gunner" model — elite performance is built on elite resilience and character, not just talent.',
        keyIdeas: [
            '4 Pillars: Effective Team Player, Efficient Mover, Lifelong Learner, Champion Mentality',
            '4 S\'s: Safe, Sweating, Smiling, Success',
            'Play-Practice-Play: arrival street football → carousel stations → small-sided finale',
            'Narrative Coaching: story-based drills that engage five-year-old imaginations',
            '"Kicking is not soccer" — focus on Ball Mastery and 1v1 Dominance',
        ],
        signature: 'Story-Based Coaching',
    },
    {
        name: 'Ajax',
        tag: 'TIPS Model',
        color: 'from-amber-500 to-amber-700',
        borderColor: 'border-amber-500/30',
        tagBg: 'bg-amber-500/20 text-amber-300',
        philosophy: 'TIPS — Technique, Insight, Personality, Speed. Developing the "Total Player" who dominates the ball in 360 degrees.',
        keyIdeas: [
            'The "Ajax Head": constant left-right scanning swivel',
            'Speed of Action: how fast the brain moves from perception to execution',
            'Personality: creativity, flair, and the guts to try a trick in a 1v1',
            'Transition Speed: train instant reaction to ball loss or gain',
            'Chaos Rondo: 3v3+1 with immediate zone transitions',
        ],
        signature: 'The Chaos Rondo',
    },
    {
        name: 'Coerver',
        tag: 'Technical Foundation',
        color: 'from-violet-500 to-violet-700',
        borderColor: 'border-violet-500/30',
        tagBg: 'bg-violet-500/20 text-violet-300',
        philosophy: 'The world\'s leading methodology for Individual Ball Mastery. Build the best "touch" through high-repetition, structured skill development.',
        keyIdeas: [
            'Foundation Pyramid: Ball Mastery → Receiving & Passing at U-6 level',
            '6 Surfaces: Inside, Outside, Sole, Laces, Heel, and Toe of both feet',
            '1,000 touches per session',
            'Moves to Beat: Changes of Direction, Stop-Starts, Feints',
            'Mirror Game: removes fear of the ball through social technical repetition',
        ],
        signature: 'The Mirror Game',
    },
    {
        name: 'Horst Wein',
        tag: 'Funino',
        color: 'from-teal-500 to-teal-700',
        borderColor: 'border-teal-500/30',
        tagBg: 'bg-teal-500/20 text-teal-300',
        philosophy: '"Fun + Niño" — the cognitive revolution in youth soccer. The game itself is the best teacher; the coach is a facilitator of discovery.',
        keyIdeas: [
            '4-Goal Field: two mini-goals on each end force decision-making',
            '3v3 Format: the simplest form of the beautiful game',
            'Scoring Zone: players must dribble or pass into the zone — kills "boot it" mentality',
            'Perceptive Questioning: "Where is the goal the defenders aren\'t guarding?"',
            'Breaks the "beehive" effect — players learn to switch play 3–4 years early',
        ],
        signature: 'The 4-Goal Game',
    },
]

const HEART_VALUES = [
    { letter: 'H', name: 'Humility', icon: '🤲', description: 'Listening when the coach speaks. Being open to learning. Celebrating teammates.', color: 'from-amber-500/20 to-amber-600/10', textColor: 'text-amber-400' },
    { letter: 'E', name: 'Effort', icon: '💪', description: '"Trying your best even when the ball runs away." Effort is the one thing fully in our control.', color: 'from-red-500/20 to-red-600/10', textColor: 'text-red-400' },
    { letter: 'A', name: 'Ambition', icon: '🎯', description: 'The desire to improve. Setting small goals and chasing them. "Can you try with your other foot?"', color: 'from-blue-500/20 to-blue-600/10', textColor: 'text-blue-400' },
    { letter: 'R', name: 'Respect', icon: '🤝', description: 'Respect for teammates, opponents, coaches, and the game itself. Fair play always.', color: 'from-emerald-500/20 to-emerald-600/10', textColor: 'text-emerald-400' },
    { letter: 'T', name: 'Teamwork', icon: '⭐', description: 'From "my ball" to "our ball." Understanding that soccer is a collective game.', color: 'from-violet-500/20 to-violet-600/10', textColor: 'text-violet-400' },
]

const SESSION_PHASES = [
    { phase: 'I', name: 'Dynamic Activation', duration: '10 min', icon: '🏃', description: 'Coordination & environment scanning through play-based games. Traffic Jam, Shadow Dribbling.', color: 'bg-sky-500/20 text-sky-300' },
    { phase: 'II', name: 'Technical-Coordinative Block', duration: '15 min', icon: '⚽', description: 'Ball Mastery & Technical Automatisms. Gate Dribbling, Body Part Dribbling, Further Leg.', color: 'bg-emerald-500/20 text-emerald-300' },
    { phase: 'III', name: 'Small-Sided Games (PSS)', duration: '15 min', icon: '🎮', description: '3v3 or 4v4 with no goalkeepers. Decision-making & collective instinct in controlled environments.', color: 'bg-amber-500/20 text-amber-300' },
    { phase: 'IV', name: 'Integral Reflection', duration: '5 min', icon: '💚', description: 'Circle talk on HEART values. Cognitive recovery. "What did we learn today?"', color: 'bg-violet-500/20 text-violet-300' },
]

const KEY_PRINCIPLES = [
    { title: 'The 3-Second Rule', emoji: '⏱️', description: 'When you lose the ball, win it back in 3 seconds. Coaches use a loud countdown — "3… 2… 1!" — to create an emotional anchor that turns frustration into mission.' },
    { title: 'The Further Leg', emoji: '🦵', description: 'Receive the ball with the foot furthest from the defender. This creates an "open body position" that lets you see the whole pitch.' },
    { title: 'Scanning (Ajax Head)', emoji: '👀', description: 'The constant left-right visual swivel before receiving the ball. "Head up! Can you see the empty grass?"' },
    { title: 'No Fixed Positions', emoji: '🔄', description: 'Assigning fixed positions to five-year-olds is a pedagogical error. Instead, teach "Comprehension of the North" — know which goal to attack and defend.' },
    { title: 'No Goalkeepers', emoji: '🚫', description: 'No permanent keepers in small-sided games. More goals = more fun. No child relegated to a static role. Everyone touches the ball.' },
    { title: 'Questions, Not Instructions', emoji: '❓', description: '"Where is the goal no one is guarding?" Perceptive questioning develops game intelligence 3–4 years earlier than being told what to do.' },
]

function FrameworkCard({ framework }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className={`glass-card-solid overflow-hidden border ${framework.borderColor} hover-lift`}>
            <button
                className="w-full text-left p-4"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${framework.tagBg}`}>
                                {framework.tag}
                            </span>
                        </div>
                        <h3 className="font-display font-bold text-slate-100 text-lg">{framework.name}</h3>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{framework.philosophy}</p>
                    </div>
                    <div className="flex-shrink-0 mt-1">
                        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 animate-fade-in">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Ideas</p>
                        <div className="space-y-1.5">
                            {framework.keyIdeas.map((idea, i) => (
                                <div key={i} className="flex gap-2 text-sm text-slate-300">
                                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>
                                    <span>{idea}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`bg-gradient-to-r ${framework.color} rounded-xl p-3`}>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Signature Drill</p>
                        <p className="font-display font-bold text-white text-sm">{framework.signature}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function Philosophy() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Hero ────────────────────────────────────── */}
            <div className="pitch-bg rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
                <div className="relative">
                    <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest mb-1">Our Foundation</p>
                    <h1 className="font-display font-black text-3xl leading-tight">Coaching<br />Philosophy</h1>
                    <p className="text-emerald-100/80 text-sm mt-2 max-w-sm leading-relaxed">
                        Inspired by the world's best youth academies — FC Barcelona, Arsenal, Ajax, Coerver, and Funino — adapted for our U-6 players.
                    </p>
                </div>
            </div>

            {/* ── Core Principles ─────────────────────────── */}
            <div>
                <h2 className="font-display font-bold text-slate-100 text-lg mb-3">Core Principles</h2>
                <div className="grid grid-cols-2 gap-3">
                    {CORE_PRINCIPLES.map((principle) => (
                        <div key={principle.title} className="glass-card-solid p-4 hover-lift">
                            <span className="text-2xl block mb-2">{principle.icon}</span>
                            <h3 className="font-display font-bold text-slate-100 text-sm leading-tight mb-1">{principle.title}</h3>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{principle.description}</p>
                            <p className="text-[9px] text-slate-600 mt-2 uppercase tracking-wider font-semibold">{principle.source}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── The 5 Frameworks ────────────────────────── */}
            <div>
                <h2 className="font-display font-bold text-slate-100 text-lg mb-1">The 5 Frameworks</h2>
                <p className="text-sm text-slate-500 mb-3">Tap to explore each methodology</p>
                <div className="space-y-3">
                    {FRAMEWORKS.map((fw) => (
                        <FrameworkCard key={fw.name} framework={fw} />
                    ))}
                </div>
            </div>

            {/* ── HEART Values ────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💚</span>
                    <h2 className="font-display font-bold text-slate-100 text-lg">HEART Values</h2>
                </div>
                <p className="text-sm text-slate-500 mb-3">The Barça Academy's character framework — forming good people before good players.</p>
                <div className="space-y-2">
                    {HEART_VALUES.map((value) => (
                        <div key={value.letter} className={`glass-card-solid p-4 bg-gradient-to-r ${value.color}`}>
                            <div className="flex items-start gap-3">
                                <div className={`text-2xl flex-shrink-0`}>{value.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`font-display font-black text-lg ${value.textColor}`}>{value.letter}</span>
                                        <span className="font-display font-bold text-slate-200 text-sm">— {value.name}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">{value.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Session Structure ───────────────────────── */}
            <div>
                <h2 className="font-display font-bold text-slate-100 text-lg mb-1">Session Structure</h2>
                <p className="text-sm text-slate-500 mb-3">The 45-minute Barça Academy format</p>
                <div className="space-y-2">
                    {SESSION_PHASES.map((phase) => (
                        <div key={phase.phase} className="glass-card-solid p-4 flex items-start gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${phase.color} flex items-center justify-center text-lg`}>
                                {phase.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-display font-bold text-slate-200 text-sm">{phase.name}</span>
                                    <span className="text-[10px] text-slate-500 font-semibold">{phase.duration}</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{phase.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Key Coaching Principles ──────────────────── */}
            <div>
                <h2 className="font-display font-bold text-slate-100 text-lg mb-3">Key Coaching Anchors</h2>
                <div className="grid grid-cols-2 gap-3">
                    {KEY_PRINCIPLES.map((principle) => (
                        <div key={principle.title} className="glass-card-solid p-3.5 hover-lift">
                            <span className="text-xl block mb-1.5">{principle.emoji}</span>
                            <h3 className="font-display font-bold text-slate-200 text-xs leading-tight mb-1">{principle.title}</h3>
                            <p className="text-[10px] text-slate-500 leading-relaxed">{principle.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Bottom quote ────────────────────────────── */}
            <div className="glass-card-solid p-5 text-center">
                <p className="text-2xl mb-2">🌱</p>
                <p className="font-display font-bold text-slate-200 text-sm italic leading-relaxed">
                    "We are not training soccer players — we are training human beings who happen to play soccer."
                </p>
                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-semibold">La Masia Philosophy</p>
            </div>
        </div>
    )
}
