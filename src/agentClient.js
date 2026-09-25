// Thin client for the real Foundry Hosted Agents (Foundry IQ docs, Fabric IQ
// sales performance), each proxied through the local Vite dev server (see
// vite.config.js) so the AAD bearer token never reaches the browser.
// Adapted from lead-agent-demo/src/agentClient.js's Responses-protocol SSE parser.

async function* parseSSEStream(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sepIndex
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)

      const dataLines = rawEvent
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
      if (!dataLines.length) continue

      const data = dataLines.join('\n')
      if (data === '[DONE]') continue

      try {
        yield JSON.parse(data)
      } catch {
        // ignore malformed/partial SSE frames
      }
    }
  }
}

/**
 * Run one turn against a deployed Foundry Hosted Agent, proxied at `proxyPath`.
 *
 * callbacks:
 *   - onText(fullText): streamed assistant text, called with the accumulated
 *     text so far each time new text arrives
 *   - onDone(): called when the run completes successfully
 *   - onError(message): called on failure
 */
async function runIQQuery(proxyPath, question, callbacks = {}) {
  const { onText = () => {}, onDone = () => {}, onError = () => {} } = callbacks

  try {
    const response = await fetch(proxyPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: question, stream: true }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`Agent request failed: ${response.status} ${response.statusText}`)
    }

    const textByItemId = new Map()

    for await (const event of parseSSEStream(response)) {
      switch (event.type) {
        case 'response.output_text.delta': {
          const itemId = event.item_id
          const prev = textByItemId.get(itemId) || ''
          const next = prev + event.delta
          textByItemId.set(itemId, next)
          onText(next)
          break
        }
        case 'response.completed':
          onDone()
          break
        case 'response.incomplete':
          onError(event.response?.incomplete_details?.reason || 'Response incomplete')
          break
        default:
          break
      }
    }
  } catch (err) {
    onError(err.message || String(err))
  }
}

/** Run one turn of the Foundry IQ docs agent (Azure AI Search grounded). */
export function runFoundryIQQuery(question, callbacks = {}) {
  return runIQQuery('/api/foundry-iq/responses', question, callbacks)
}

/** Run one turn of the Fabric IQ sales performance agent (live semantic model grounded). */
export function runFabricIQQuery(question, callbacks = {}) {
  return runIQQuery('/api/fabric-iq/responses', question, callbacks)
}
