// ─── AI Service: Groq + Google Gemini Fallback ───────────────────────────────
// Centralized AI calling with automatic fallback from Groq → Gemini on rate limit.

import { TOOL_DEFINITIONS } from './aiTools'

// ─── Groq API ─────────────────────────────────────────────────────────────────
async function callGroq(apiKey, systemPrompt, messages, signal) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        signal,
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            tools: TOOL_DEFINITIONS,
            tool_choice: 'auto',
            max_tokens: 1024,
            temperature: 0.7,
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const status = res.status
        const message = err.error?.message || `Groq API error ${status}`
        const error = new Error(message)
        error.status = status
        error.isRateLimit = status === 429 || status === 503
        throw error
    }

    const data = await res.json()
    const msg = data.choices?.[0]?.message
    return {
        content: msg?.content || null,
        toolCalls: msg?.tool_calls || null,
        rawAssistantMessage: msg,
        provider: 'groq',
    }
}

// ─── Google Gemini API ────────────────────────────────────────────────────────
// Translate OpenAI-format tools → Gemini format, call the API, translate back.

function toGeminiTools(openaiTools) {
    return [{
        functionDeclarations: openaiTools.map(t => {
            const fn = t.function
            const params = { ...fn.parameters }
            // Gemini doesn't support 'enum' on top-level properties the same way;
            // we keep it as-is since the Gemini API can handle standard JSON Schema
            return {
                name: fn.name,
                description: fn.description,
                parameters: params,
            }
        }),
    }]
}

function toGeminiMessages(systemPrompt, openaiMessages) {
    const contents = []

    for (const msg of openaiMessages) {
        if (msg.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: msg.content }] })
        } else if (msg.role === 'assistant') {
            if (msg.tool_calls?.length > 0) {
                // Assistant message with function calls
                const parts = []
                if (msg.content) parts.push({ text: msg.content })
                for (const tc of msg.tool_calls) {
                    parts.push({
                        functionCall: {
                            name: tc.function.name,
                            args: JSON.parse(tc.function.arguments || '{}'),
                        },
                    })
                }
                contents.push({ role: 'model', parts })
            } else if (msg.content) {
                contents.push({ role: 'model', parts: [{ text: msg.content }] })
            }
        } else if (msg.role === 'tool') {
            // Tool result → Gemini uses functionResponse
            contents.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: 'tool_result',
                        response: JSON.parse(msg.content || '{}'),
                    },
                }],
            })
        }
    }

    return contents
}

function fromGeminiResponse(data) {
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts || []

    let content = null
    const toolCalls = []

    for (const part of parts) {
        if (part.text) {
            content = (content || '') + part.text
        }
        if (part.functionCall) {
            toolCalls.push({
                id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: 'function',
                function: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args || {}),
                },
            })
        }
    }

    // Build a rawAssistantMessage compatible with the OpenAI format
    const rawAssistantMessage = {
        role: 'assistant',
        content,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    }

    return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
        rawAssistantMessage,
        provider: 'gemini',
    }
}

async function callGemini(geminiKey, systemPrompt, messages, signal) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`

    const contents = toGeminiMessages(systemPrompt, messages)
    const tools = toGeminiTools(TOOL_DEFINITIONS)

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools,
            tool_config: { function_calling_config: { mode: 'AUTO' } },
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.7,
            },
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Gemini API error ${res.status}`)
    }

    const data = await res.json()
    return fromGeminiResponse(data)
}

// ─── Unified caller with automatic fallback ───────────────────────────────────
export async function callAI({ groqKey, geminiKey, systemPrompt, messages, signal }) {
    // Try Groq first if key available
    if (groqKey) {
        try {
            return await callGroq(groqKey, systemPrompt, messages, signal)
        } catch (err) {
            if (err.isRateLimit && geminiKey) {
                console.warn('[AI] Groq rate-limited, falling back to Gemini...')
                // fall through to Gemini
            } else {
                throw err
            }
        }
    }

    // Fallback: Gemini
    if (geminiKey) {
        return await callGemini(geminiKey, systemPrompt, messages, signal)
    }

    throw new Error('No AI API key configured. Add a Groq or Google AI key in Settings.')
}

// ─── Key resolution ───────────────────────────────────────────────────────────
export function getGeminiKey() {
    return import.meta.env.VITE_GOOGLE_AI_KEY || null
}
