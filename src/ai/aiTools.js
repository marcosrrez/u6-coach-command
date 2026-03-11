// ─── AI Tool Definitions & Executors ──────────────────────────────────────────
// Groq tool-calling system for full-system AI access.
// Each tool is defined in OpenAI-compatible format and has an executor function.

import { DRILLS } from '../data/drills'
import { PRACTICES, GAMES, SEASON_INFO } from '../data/sessions'
import {
    getPlayers, getCustomDrills, addCustomDrill, deleteCustomDrill,
    getPlayerNotes, savePlayerNote, getPlayerScores, saveDevelopmentScore,
    getCompletedSessionIds, getSessionCustomization, saveSessionCustomization,
    markSessionComplete, addPlayer, deletePlayer,
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
            name: 'draw_field_diagram',
            description: 'Draw a visual tactical/drill diagram on a mini soccer field grid. Use this whenever the coach asks to visualize a drill setup, formation, or positioning. Also use proactively when creating a drill to show the spatial layout.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Short diagram title, e.g. "Cone Maze Setup" or "4v1 Rondo"' },
                    cols: { type: 'integer', description: 'Grid width in cells (5–12). Default: 8.' },
                    rows: { type: 'integer', description: 'Grid height in cells (4–8). Default: 6.' },
                    elements: {
                        type: 'array',
                        description: 'Elements to place on the field grid.',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['cone', 'player', 'defender', 'coach', 'ball', 'goal'], description: 'Element type. cone=orange triangle, player=green circle, defender=red circle, coach=blue circle, ball=white circle, goal=white rectangle.' },
                                col: { type: 'integer', description: 'Column (0-based, left to right)' },
                                row: { type: 'integer', description: 'Row (0-based, top to bottom)' },
                                label: { type: 'string', description: 'Short 1-2 char label shown inside the element, e.g. "1", "A", "GK"' },
                                color: { type: 'string', description: 'Optional hex color override, e.g. "#f59e0b"' },
                            },
                            required: ['type', 'col', 'row'],
                        },
                    },
                    arrows: {
                        type: 'array',
                        description: 'Movement arrows between grid positions.',
                        items: {
                            type: 'object',
                            properties: {
                                fromCol: { type: 'integer' },
                                fromRow: { type: 'integer' },
                                toCol: { type: 'integer' },
                                toRow: { type: 'integer' },
                                dashed: { type: 'boolean', description: 'True for ball movement/passes, false for player runs.' },
                                color: { type: 'string', description: 'Arrow color, e.g. "#ffffff" or "#f59e0b"' },
                            },
                            required: ['fromCol', 'fromRow', 'toCol', 'toRow'],
                        },
                    },
                },
                required: ['title', 'elements'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'mark_session_complete',
            description: 'Mark a practice session or game as completed in the season tracker. Use when the coach says they just finished a session or game.',
            parameters: {
                type: 'object',
                properties: {
                    sessionNumber: { type: 'integer', description: 'Practice session number (1–16) or game number (1–8)' },
                    type: { type: 'string', enum: ['practice', 'game'], description: 'Whether this is a practice or a game' },
                },
                required: ['sessionNumber', 'type'],
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
    {
        type: 'function',
        function: {
            name: 'add_player',
            description: 'Add a new player to the team roster. Use when the coach asks to add, create, or register a new player.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Player name' },
                    emoji: { type: 'string', description: 'Emoji icon for the player (e.g. ⚽, 🌟, 🦁)' },
                    color: { type: 'string', description: 'Hex color for the player (e.g. #16a34a)' },
                    jerseyNumber: { type: 'integer', description: 'Jersey number (auto-assigned if omitted)' },
                },
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_player',
            description: 'Remove a player from the roster and delete all their associated notes and scores. Use when the coach asks to remove or delete a player.',
            parameters: {
                type: 'object',
                properties: {
                    playerId: { type: 'integer', description: 'ID of the player to remove (get IDs from get_players)' },
                },
                required: ['playerId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'score_player',
            description: 'Save HEART (Humility, Effort, Ambition, Respect, Teamwork) and/or TIPS (Technique, Insight, Personality, Speed) development scores for a player on a specific session. Each score is 1–5. Use when the coach gives feedback on a player\'s performance.',
            parameters: {
                type: 'object',
                properties: {
                    playerId: { type: 'integer', description: 'Player ID' },
                    sessionNumber: { type: 'integer', description: 'Practice session number (1–16)' },
                    humility: { type: 'integer', minimum: 1, maximum: 5 },
                    effort: { type: 'integer', minimum: 1, maximum: 5 },
                    ambition: { type: 'integer', minimum: 1, maximum: 5 },
                    respect: { type: 'integer', minimum: 1, maximum: 5 },
                    teamwork: { type: 'integer', minimum: 1, maximum: 5 },
                    technique: { type: 'integer', minimum: 1, maximum: 5 },
                    insight: { type: 'integer', minimum: 1, maximum: 5 },
                    personality: { type: 'integer', minimum: 1, maximum: 5 },
                    speed: { type: 'integer', minimum: 1, maximum: 5 },
                },
                required: ['playerId', 'sessionNumber'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_drills',
            description: 'Search the drill library by keyword. Matches against drill names, descriptions, and categories. Use when the coach asks to find a drill or wants drill recommendations.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search keyword (e.g. "dribbling", "warm-up", "pirate")' },
                },
                required: ['query'],
            },
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

        case 'draw_field_diagram': {
            return {
                success: true,
                message: `Diagram "${args.title}" created.`,
                diagram: {
                    title: args.title,
                    cols: Math.min(Math.max(args.cols || 8, 4), 14),
                    rows: Math.min(Math.max(args.rows || 6, 3), 10),
                    elements: args.elements || [],
                    arrows: args.arrows || [],
                },
            }
        }

        case 'mark_session_complete': {
            const session = args.type === 'game'
                ? GAMES.find(g => g.gameNumber === args.sessionNumber)
                : PRACTICES.find(p => p.sessionNumber === args.sessionNumber)
            if (!session) return { error: `${args.type} ${args.sessionNumber} not found.` }
            await markSessionComplete(session.id, args.type)
            return { success: true, message: `${args.type === 'game' ? 'Game' : 'Practice'} ${args.sessionNumber} marked as complete!` }
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

        case 'add_player': {
            const id = await addPlayer({
                name: args.name,
                emoji: args.emoji || '⚽',
                color: args.color || '#16a34a',
                jerseyNumber: args.jerseyNumber,
            })
            const players = await getPlayers()
            const newPlayer = players.find(p => p.id === id)
            return {
                success: true,
                message: `Added ${args.name} to the roster! (Jersey #${newPlayer?.jerseyNumber || '?'})`,
                player: newPlayer,
            }
        }

        case 'delete_player': {
            const players = await getPlayers()
            const player = players.find(p => p.id === args.playerId)
            if (!player) return { error: `Player with ID ${args.playerId} not found.` }
            await deletePlayer(args.playerId)
            return { success: true, message: `Removed ${player.name} (#${player.jerseyNumber}) from the roster.` }
        }

        case 'score_player': {
            const session = PRACTICES.find(p => p.sessionNumber === args.sessionNumber)
            if (!session) return { error: `Session ${args.sessionNumber} not found.` }
            const scores = {}
            const scoreKeys = ['humility', 'effort', 'ambition', 'respect', 'teamwork', 'technique', 'insight', 'personality', 'speed']
            scoreKeys.forEach(k => { if (args[k] !== undefined) scores[k] = args[k] })
            if (Object.keys(scores).length === 0) return { error: 'No scores provided.' }
            await saveDevelopmentScore(session.id, args.playerId, scores)
            return {
                success: true,
                message: `Saved ${Object.keys(scores).length} score(s) for player ${args.playerId} on session ${args.sessionNumber}.`,
                scores,
            }
        }

        case 'search_drills': {
            const q = (args.query || '').toLowerCase()
            const customDrills = await getCustomDrills()
            const allDrills = [...DRILLS, ...customDrills.map(d => ({ ...d, id: `custom-${d.id}`, isCustom: true }))]
            const matches = allDrills.filter(d =>
                d.name?.toLowerCase().includes(q) ||
                d.description?.toLowerCase().includes(q) ||
                d.category?.toLowerCase().includes(q) ||
                d.instructions?.some(inst => inst.toLowerCase().includes(q))
            )
            return {
                query: args.query,
                matchCount: matches.length,
                drills: matches.slice(0, 10).map(d => ({
                    id: d.id, name: d.name, category: d.category,
                    framework: d.framework, duration: d.duration,
                    description: d.description?.slice(0, 120) + (d.description?.length > 120 ? '...' : ''),
                    isCustom: !!d.isCustom,
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

    return `You are Coach AI — an expert U-6 soccer coaching assistant with FULL ACCESS to this team's coaching system. You can read and modify sessions, drills, player data, scores, and the entire season plan.

## Your Coaching Frameworks
1. **FC Barcelona (Barça)**: HEART values, Rondo, 3-Second Rule, Dynamic Systems Theory
2. **Arsenal (The Gunner Way)**: Strong Young Gunner model, 4 S's, story-based coaching
3. **Ajax TIPS**: Technique, Insight, Personality, Speed. "Ajax Head" scanning
4. **Coerver**: Foundation Pyramid, 1000 touches/session, 6 foot surfaces
5. **Horst Wein / Funino**: 4-goal field, 3v3 format, coach questions only at stoppages

## Team Context
- ${players.length} players: ${players.map(p => `${p.emoji} ${p.name} (#${p.jerseyNumber}, ID:${p.id})`).join(', ')}
- Ages 5–6, practices Tue/Thu, games Saturday, 45-min sessions
- Season progress: ${completedCount}/${PRACTICES.length} practices completed
${nextSession ? `- Next session: Practice ${nextSession.sessionNumber} — "${nextSession.title}" (${nextSession.date})` : '- All sessions completed!'}
- Drill library: ${DRILLS.length + customDrills.length} drills (${customDrills.length} custom AI-created)

## Your Capabilities (Tools)
You have powerful tools to manage the entire coaching system:
- **Create drills** → invent new drills, auto-added to library
- **Search drills** → find drills by keyword, category, or theme
- **Draw field diagrams** → visualize drill setups on a mini soccer field
- **Read/modify session plans** → view and edit practice phases
- **Mark sessions complete** → track season progress
- **Add/delete players** → manage the team roster
- **Read player info** → see roster, notes, development scores
- **Save player notes** → record observations after sessions
- **Score players** → save HEART and TIPS development scores (1–5)
- **View season overview** → see full schedule and progress

## Proactive Behaviors
- When the coach mentions a player performing well or poorly, PROACTIVELY offer to save a development note or score.
- When discussing a drill, PROACTIVELY draw a field diagram to visualize it.
- When the coach asks about drills, SEARCH the library first before suggesting.
- You CAN chain multiple tools in one response. For example: search drills → add best match to a session → draw the field diagram.
- When creating a drill, ALWAYS also draw a field diagram showing the setup.
- When the coach says "we just finished practice", mark it complete AND ask if they want to record player notes.

## Rules
- Be warm, encouraging, practical. You're talking to a volunteer parent-coach.
- Keep answers concise — coach reads on their phone at the field.
- When creating drills: age-appropriate for 5-6 year olds, story-based, max 8 min.
- When modifying sessions: explain what you changed and why.
- Joy and play are the PRIORITY. Every child succeeds every session.
- Use tools proactively when the coach's question involves app data.
- Always include player IDs when referencing players so you can take action on them.`
}

