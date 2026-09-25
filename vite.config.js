import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DefaultAzureCredential } from '@azure/identity'

const TOKEN_SCOPE = 'https://ai.azure.com/.default'

// Dev-only proxy: mints an AAD token via the developer's own `az login`
// session (DefaultAzureCredential, Node-side — never bundled to the client)
// and forwards to a deployed Foundry Hosted Agent. This project has no
// public hosting yet (Stages 1-3 are npm-run-dev-and-commit only), so a
// local proxy is enough — no Azure Function/service-principal needed, unlike
// lead-agent-demo's publicly-hosted Static Web App. Shared by both the
// Foundry IQ docs agent and the Fabric IQ sales agent — same Responses-
// protocol endpoint shape, same token scope, just a different upstream URL.
function iqAgentProxyPlugin(name, routePath, agentUrl) {
  let cachedToken = null
  const credential = new DefaultAzureCredential()

  async function getAccessToken() {
    if (cachedToken && cachedToken.expiresOnTimestamp - Date.now() > 60_000) {
      return cachedToken.token
    }
    cachedToken = await credential.getToken(TOKEN_SCOPE)
    return cachedToken.token
  }

  return {
    name,
    configureServer(server) {
      server.middlewares.use(routePath, async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        if (!agentUrl) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: `${name}: agent URL is not configured` }))
          return
        }

        try {
          const token = await getAccessToken()
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = Buffer.concat(chunks)

          const upstream = await fetch(agentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body,
          })

          if (!upstream.ok) {
            const errText = await upstream.text()
            console.error(`[${name}] upstream ${upstream.status}: ${errText}`)
            res.statusCode = upstream.status
            res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
            res.end(errText)
            return
          }

          res.statusCode = upstream.status
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
          for await (const chunk of upstream.body) res.write(chunk)
          res.end()
        } catch (err) {
          console.error(`[${name}] error:`, err)
          res.statusCode = 502
          res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      iqAgentProxyPlugin('foundry-iq-proxy', '/api/foundry-iq/responses', env.FOUNDRY_IQ_AGENT_URL),
      iqAgentProxyPlugin('fabric-iq-proxy', '/api/fabric-iq/responses', env.FABRIC_IQ_AGENT_URL),
    ],
  }
})
