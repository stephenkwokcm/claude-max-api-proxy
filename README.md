# Claude Max API Proxy (OpenClaw Fork)

> **Fork of [atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)**, modified for use with [OpenClaw](https://openclaw.ai).

This proxy wraps the Claude Code CLI as a subprocess and exposes an OpenAI-compatible HTTP API. It allows OpenClaw (and any other OpenAI-compatible client on the LAN) to use a Claude Max subscription instead of paying per-token API costs.

## Changes from Upstream

| Change | Why |
|--------|-----|
| Concurrency queue (max 2 parallel) | Prevents Claude Max rate limits from concurrent OpenClaw agents |
| 4-hour subprocess timeout (was 5 min) | Complex agentic tasks legitimately run long |
| `--dangerously-skip-permissions` flag | Non-interactive tool use for automated agents |
| Content array normalization | OpenClaw sends OpenAI-format `[{type:"text", text:"..."}]` content parts |
| Null guard on model name normalization | Prevents crashes when model name is missing |
| Bind `0.0.0.0` (was `127.0.0.1`) | Allows LAN access from other machines |
| `/health` exposes queue stats | Monitor active/queued/max via `curl /health` |
| `dist/` committed to repo | Enables `npm install` / `npm link` from git without build step |

## Prerequisites

1. **Claude Max subscription** ($200/month) — [claude.ai](https://claude.ai)
2. **Claude Code CLI** installed and authenticated:
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude auth login
   ```

## Installation

```bash
git clone https://github.com/stephenkwokcm/claude-max-api-proxy.git ~/claude-max-api-proxy
cd ~/claude-max-api-proxy
npm install
npm link
```

This creates a global `claude-max-api` command symlinked to your local clone. Future changes take effect after `npm run build` — no reinstall needed.

## Running

### Standalone

```bash
node ~/claude-max-api-proxy/dist/server/standalone.js
```

### macOS LaunchAgent (auto-start)

```xml
<!-- ~/Library/LaunchAgents/com.claude-max-api.plist -->
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/node</string>
    <string>/opt/homebrew/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>/Users/YOUR_USER</string>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/claude-proxy.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/claude-proxy.err.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.claude-max-api.plist
```

Restart with:
```bash
launchctl kickstart -k gui/$(id -u)/com.claude-max-api
```

## OpenClaw Configuration

Add the proxy as a provider in `~/.openclaw/openclaw.json`:

```json
{
  "models": {
    "providers": {
      "wsl-proxy": {
        "baseUrl": "http://<PROXY_HOST>:3456/v1",
        "apiKey": "not-needed",
        "api": "openai-completions",
        "models": [
          { "id": "claude-opus-4", "name": "Claude Opus 4", "contextWindow": 200000, "maxTokens": 32000 },
          { "id": "claude-sonnet-4", "name": "Claude Sonnet 4", "contextWindow": 200000, "maxTokens": 32000 },
          { "id": "claude-haiku-4", "name": "Claude Haiku 4.5", "contextWindow": 200000, "maxTokens": 8192 }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "wsl-proxy/claude-opus-4" },
      "maxConcurrent": 2,
      "subagents": {
        "maxConcurrent": 4,
        "model": "wsl-proxy/claude-sonnet-4"
      }
    }
  }
}
```

Keep `maxConcurrent` at 2 to match the proxy's concurrency limit.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with queue stats |
| `/v1/models` | GET | List available models |
| `/v1/chat/completions` | POST | Chat completions (streaming & non-streaming) |

## Available Models

| Model ID | CLI Alias |
|----------|-----------|
| `claude-opus-4` | opus |
| `claude-sonnet-4` | sonnet |
| `claude-haiku-4` | haiku |

## Monitoring

```bash
# Health check with queue stats
curl http://localhost:3456/health
# {"status":"ok","provider":"claude-code-cli","queue":{"active":0,"queued":0,"max":2}}

# Watch queue activity in real time
tail -f /tmp/claude-proxy.err.log | grep Queue
```

## Making Changes

Edit TypeScript source in `src/`, rebuild, and restart:

```bash
cd ~/claude-max-api-proxy
# edit src/...
npm run build
launchctl kickstart -k gui/$(id -u)/com.claude-max-api
```

Since the global install is a symlink (`npm link`), the rebuilt dist is picked up immediately.

## Architecture

```
src/
├── types/
│   ├── claude-cli.ts      # Claude CLI JSON output types
│   └── openai.ts          # OpenAI API types (with content array support)
├── adapter/
│   ├── openai-to-cli.ts   # Convert OpenAI requests → CLI prompt
│   └── cli-to-openai.ts   # Convert CLI responses → OpenAI format
├── subprocess/
│   └── manager.ts         # Claude CLI subprocess spawning (4hr timeout)
├── session/
│   └── manager.ts         # Session ID mapping
├── server/
│   ├── index.ts           # Express server (binds 0.0.0.0)
│   ├── routes.ts          # Route handlers + concurrency queue
│   └── standalone.ts      # Entry point
└── index.ts               # Package exports
```

## How It Works

```
OpenClaw / any OpenAI client
         ↓
    HTTP Request (OpenAI format)
         ↓
   This Proxy (Express, concurrency queue)
         ↓
   claude --print (subprocess, max 2 parallel)
         ↓
   Anthropic API (via Max subscription OAuth)
         ↓
   Response → OpenAI format → Client
```

## License

MIT

## Acknowledgments

- Original project by [atalovesyou](https://github.com/atalovesyou/claude-max-api-proxy)
- Modified for [OpenClaw](https://openclaw.ai)
- Powered by [Claude Code CLI](https://github.com/anthropics/claude-code)
