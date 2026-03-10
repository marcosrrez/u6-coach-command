// ─── AI Tool Definitions & Executors ──────────────────────────────────────────
// Groq tool-calling system for full-system AI access.
// Each tool is defined in OpenAI-compatible format and has an executor function.

import { DRILLS } from '../data/drills'
import { PRACTICES, GAMES, SEASON_INFO } from '../data/sessions'
import {
    getPlayers, getCustomDrills, addCustomDrill, deleteCustomDrill,
    getPlayerNotes, savePlayerNote, getPlayerScores,
    getCompletedSessionIds, getSessionCustomization, saveSessionCustomization,
} from '../db/db'

// ─── Tool Definitions (sent to Groq) ──────────────────────────────────────────
export const TOOL_DEFINITIONS = [
    {
        type: 'function',
        function: {
            name: 'create_drill',
            description: 'Create a new custom drill and add it to the drill library. Use this when the coach asks you to invent, design, or create a new drill or activity.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the drill' },
                    category: { type: 'string', enum: ['Warm-Up', 'Dribbling', 'Passing', 'Shooting', 'Rondo', 'Small-Sided Game', '1v1', 'Scanning', 'Fun / Story', 'Cool-Down'], description: 'Category' },
                    framework: { type: 'string', enum: ['Barça', 'Arsenal', 'Ajax', 'Coerver', 'Funino', 'Universal'], description: 'Coaching framework' },
                    players: { type: 'string', description: 'Player count range, e.g. "3–6"' },
                    duration: { type: 'string', description: 'Duration range, e.g. "5–8 min"' },
                    equipment: { type: 'array', items: { type: 'string' }, description: 'Equipment needed' },
                    difficulty: { type: 'integer', enum: [1, 2, 3], description: '1=Beginner, 2=Intermediate, 3=Advanced' },
                    description: { type: 'string', description: 'Full description of the drill' },
                    setup: { type: 'string', description: 'Setup instructions' },
                    instructions: { type: 'array', items: { type: 'string' }, description: 'Step-by-step instructions' },
                    coachingCues: { type: 'array', items: { type: 'string' }, description: 'Short coaching cues to call out' },
                    heartValue: { type: 'string', enum: ['Humility', 'Effort', 'Ambition', 'Respect', 'Teamwork'], description: 'HEART value this drill develops' },
                },
                required: ['name', 'category', 'description', 'instructions'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_all_drills',
            description: 'Get the full drill library including both built-in and custom AI-created drills. Use this when the coach asks about available drills, wants to find a specific type of drill, or needs drill recommendations.',
            parameters: {
                type: 'object', properties: {
                    category: { type: 'string', description: 'Optional: filter by category' },
                    framework: { type: 'string', description: 'Optional: filter by framework' },
                }
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_session_plan',
            description: 'Get the full plan for a specific practice session including all phases, activities, and coaching notes. Use this when the coach asks about a session, wants to review a plan, or needs info about an upcoming practice.',
            parameters: {
                type: 'object', properties: {
                    sessionNumber: { type: 'integer', description: 'Practice session number (1–16)' },
                }, required: ['sessionNumber']
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_session_plan',
            description: 'Add or remove a drill from a specific phase of a session. Use this when the coach says to add a drill to a session, swap an activity, or modify the session plan.',
            parameters: {
                type: 'object', properties: {
                    sessionNumber: { type: 'integer', description: 'Practice session number (1–16)' },
                    phaseIndex: { type: 'integer', description: 'Phase index (0-based)' },
                    action: { type: 'string', enum: ['add', 'remove'], description: 'Action to perform' },
                    drillName: { type: 'string', description: 'Name of the drill to add (for "add" action)' },
                    activityIndex: { type: 'integer', description: 'Index of activity to remove (for "remove" action)' },
                    duration: { type: 'integer', description: 'Duration in minutes (default 5)' },
                }, required: ['sessionNumber', 'phaseIndex', 'action']
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_players',
            description: 'Get information about all players on the roster including names, jersey numbers, and emoji identifiers.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_player_note',
            description: 'Save a note about a player for a specific session. Use this when the coach asks to record observations or feedback about a player.',
            parameters: {
                type: 'object', properties: {
                    playerId: { type: 'integer', description: 'Player ID' },
                    sessionNumber: { type: 'integer', description: 'Practice session number (1–16)' },
                    note: { type: 'string', description: 'Note text' },
                }, required: ['playerId', 'sessionNumber', 'note']
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_player_history',
            description: 'Get all notes and development scores for a specific player across all sessions.',
            parameters: {
                type: 'object', properties: {
                    playerId: { type: 'integer', description: 'Player ID' },
                }, required: ['playerId']
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_season_overview',
            description: 'Get the full season schedule showing all 16 practices and 8 games, including which sessions are completed and upcoming dates.',
            parameters: { type: 'object', properties: {} },
        },
    },
]

// ─── Tool Executors ───────────────────────────────────────────────────────────
export async function executeTool(toolName, args) {
    switch (toolName) {
        case 'create_drill': {
            const drill = {
                name: args.name,
                category: args.category || 'Warm-Up',
                framework: args.framework || 'Universal',
                players: args.players || '3–6',
                duration: args.duration || '5–8 min',
                equipment: args.equipment || [],
                difficulty: args.difficulty || 1,
                description: args.description,
                setup: args.setup || '',
                instructions: args.instructions || [],
                coachingCues: args.coachingCues || [],
                heartValue: args.heartValue || 'Effort',
                tipsModel: 'Technique',
                isCustom: true,
            }
            const id = await addCustomDrill(drill)
            return { success: true, drillId: id, name: drill.name, message: `Created drill "${drill.name}" and added to library.` }
        }

        case 'get_all_drills': {
            const customDrills = await getCustomDrills()
            let allDrills = [...DRILLS, ...customDrills.map(d => ({ ...d, id: `custom-${d.id}`, isCustom: true }))]
            if (args.category) allDrills = allDrills.filter(d => d.category === args.category)
            if (args.framework) allDrills = allDrills.filter(d => d.framework === args.framework)
            return {
                totalDrills: allDrills.length,
                drills: allDrills.map(d => ({
                    name: d.name, category: d.category, framework: d.framework,
                    duration: d.duration, difficulty: d.difficulty, isCustom: !!d.isCustom,
                })),
            }
        }

        case 'get_session_plan': {
            const session = PRACTICES.find(p => p.sessionNumber === args.sessionNumber)
            if (!session) return { error: `Session ${args.sessionNumber} not found.` }
            const cust = await getSessionCustomization(session.id)
            const phases = cust?.phases || session.phases
            return {
                sessionNumber: session.sessionNumber,
                title: session.title,
                subtitle: session.subtitle,
                date: session.date,
                duration: session.duration,
                heartValue: session.heartValue,
                heartMessage: session.heartMessage,
                coachNotes: session.coachNotes,
                phases: phases.map((p, i) => ({
                    index: i,
                    name: p.name,
                    duration: p.duration,
                    activity: p.activity,
                    framework: p.framework,
                    activities: p.activities?.map(a => ({ name: a.name, duration: a.duration })) || null,
                })),
            }
        }

        case 'update_session_plan': {
            const session = PRACTICES.find(p => p.sessionNumber === args.sessionNumber)
            if (!session) return { error: `Session ${args.sessionNumber} not found.` }
            const cust = await getSessionCustomization(session.id)
            const phases = cust?.phases ? JSON.parse(JSON.stringify(cust.phases)) : JSON.parse(JSON.stringify(session.phases))
            const phase = phases[args.phaseIndex]
            if (!phase) return { error: `Phase ${args.phaseIndex} not found.` }

            if (args.action === 'add') {
                // Find drill by name
                const customDrills = await getCustomDrills()
                const allDrills = [...DRILLS, ...customDrills]
                const drill = allDrills.find(d => d.name.toLowerCase() === (args.drillName || '').toLowerCase())
                if (!drill) return { error: `Drill "${args.drillName}" not found in library.` }

                if (!phase.activities) {
                    phase.activities = [{
                        name: phase.activity, duration: phase.duration,
                        framework: phase.framework, setup: phase.setup,
                        description: phase.description, instructions: phase.instructions,
                        coachingCues: phase.coachingCues,
                    }]
                }
                phase.activities.push({
                    name: drill.name, duration: args.duration || 5,
                    framework: drill.framework, setup: drill.setup,
                    description: drill.description, instructions: drill.instructions,
                    coachingCues: drill.coachingCues,
                    drillId: drill.id,
                })
                phase.activity = phase.activities.map(a => a.name).join(' → ')
                phase.duration = phase.activities.reduce((s, a) => s + a.duration, 0)
            } else if (args.action === 'remove') {
                if (!phase.activities) return { error: 'No activities to remove.' }
                const idx = args.activityIndex ?? phase.activities.length - 1
                const removed = phase.activities.splice(idx, 1)
                if (phase.activities.length === 0) {
                    phases[args.phaseIndex] = JSON.parse(JSON.stringify(session.phases[args.phaseIndex]))
                } else {
                    phase.activity = phase.activities.map(a => a.name).join(' → ')
                    phase.duration = phase.activities.reduce((s, a) => s + a.duration, 0)
                }
                return { success: true, message: `Removed "${removed[0]?.name}" from phase ${args.phaseIndex}.` }
            }

            await saveSessionCustomization(session.id, phases)
            return { success: true, message: `Updated session ${args.sessionNumber} phase ${args.phaseIndex}.` }
        }

        case 'get_players': {
            const players = await getPlayers()
            return {
                playerCount: players.length,
                players: players.map(p => ({
                    id: p.id, name: p.name, emoji: p.emoji,
                    jerseyNumber: p.jerseyNumber, position: p.position,
                })),
            }
        }

        case 'update_player_note': {
            const session = PRACTICES.find(p => p.sessionNumber === args.sessionNumber)
            if (!session) return { error: `Session ${args.sessionNumber} not found.` }
            await savePlayerNote(session.id, args.playerId, args.note)
            return { success: true, message: `Saved note for player ${args.playerId} on session ${args.sessionNumber}.` }
        }

        case 'get_player_history': {
            const [notes, scores] = await Promise.all([
                getPlayerNotes(args.playerId).catch(() => []),
                getPlayerScores(args.playerId).catch(() => []),
            ])
            return { playerId: args.playerId, notes, scores }
        }

        case 'get_season_overview': {
            const completed = await getCompletedSessionIds()
            return {
                seasonInfo: SEASON_INFO,
                practices: PRACTICES.map(p => ({
                    number: p.sessionNumber, title: p.title, date: p.date,
                    duration: p.duration, completed: completed.has(p.id),
                })),
                games: GAMES.map(g => ({
                    number: g.gameNumber, opponent: g.opponent, date: g.date,
                    completed: completed.has(g.id),
                })),
            }
        }

        default:
            return { error: `Unknown tool: ${toolName}` }
    }
}

// ─── Dynamic System Prompt ────────────────────────────────────────────────────
export async function buildSystemPrompt() {
    const players = await getPlayers()
    const completed = await getCompletedSessionIds()
    const customDrills = await getCustomDrills()

    const nextSession = PRACTICES.find(p => !completed.has(p.id))
    const completedCount = PRACTICES.filter(p => completed.has(p.id)).length

    return `You are Coach AI — an expert U-6 soccer coaching assistant with FULL ACCESS to this team's coaching system. You can read and modify sessions, drills, player data, and the entire season plan.

## Your Coaching Frameworks
1. **FC Barcelona (Barça)**: HEART values, Rondo, 3-Second Rule, Dynamic Systems Theory
2. **Arsenal (The Gunner Way)**: Strong Young Gunner model, 4 S's, story-based coaching
3. **Ajax TIPS**: Technique, Insight, Personality, Speed. "Ajax Head" scanning
4. **Coerver**: Foundation Pyramid, 1000 touches/session, 6 foot surfaces
5. **Horst Wein / Funino**: 4-goal field, 3v3 format, coach questions only at stoppages

## Team Context
- ${players.length} players: ${players.map(p => `${p.emoji} ${p.name} (#${p.jerseyNumber})`).join(', ')}
- Ages 5–6, practices Tue/Thu, games Saturday, 45-min sessions
- Season progress: ${completedCount}/${PRACTICES.length} practices completed
${nextSession ? `- Next session: Practice ${nextSession.sessionNumber} — "${nextSession.title}" (${nextSession.date})` : '- All sessions completed!'}
- Drill library: ${DRILLS.length + customDrills.length} drills (${customDrills.length} custom AI-created)

## Your Capabilities (Tools)
You have tools to:
- **Create new drills** → adds to the library automatically
- **Read session plans** → see full details of any practice
- **Modify session plans** → add/remove drills from phases
- **Read player info** → see roster, notes, development scores
- **Save player notes** → record observations after sessions
- **View season overview** → see full schedule and completion status

## Rules
- Be warm, encouraging, practical. You're talking to a volunteer parent-coach.
- Keep answers concise — coach reads on their phone at the field.
- When creating drills: age-appropriate for 5-6 year olds, story-based, max 8 min.
- When modifying sessions: explain what you changed and why.
- Joy and play are the PRIORITY. Every child succeeds every session.
- Use tools proactively when the coach's question involves app data.`
}
