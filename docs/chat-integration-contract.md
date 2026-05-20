# Chat Widget — Integration Contract

**Version:** v0 (stub)  
**Updated:** 2026-05-20  
**Status:** Stub mode active. Real agent not yet wired.

---

## Overview

The builtbyzero chat widget POSTs visitor messages to `/api/support`, a Cloudflare Pages Function. In v0 this function returns keyword-matched stub replies. When the `support` agent is ready, swap the stub block in `functions/api/support.js` for a real agent proxy call.

---

## HTTP Contract

### Request

```
POST /api/support
Content-Type: application/json
```

**Body:**

```json
{
  "message": "string, max 1000 chars, required",
  "history": [
    { "role": "user",  "content": "prior user turn" },
    { "role": "agent", "content": "prior agent reply" }
  ]
}
```

- `message` — the visitor's latest message. Non-empty string, max 1000 characters.
- `history` — optional array of prior turns (last ≤10 turns). Roles are `"user"` or `"agent"`. No timestamps sent.

### Response — 200 OK

```json
{
  "reply": "string — the agent's response"
}
```

### Response — 4xx/5xx

```json
{
  "error": "human-readable error description"
}
```

The widget catches any non-2xx response and shows a generic error message to the visitor.

---

## Privacy guarantees

- **No PII sent to the server.** The widget sends message content and role-tagged history only.
- **No IP logging.** The Pages Function logs message length and history count but never the IP address, message content, or any user identifier.
- **No cookies.** Conversation state lives entirely in `localStorage` under key `bbz_chat_v1`.
- **No third-party scripts.** The widget is a single self-contained IIFE loaded from the same origin.

---

## Wiring the real support agent

When the `support` agent has an HTTP endpoint ready:

1. **Set env vars** in Cloudflare Pages → Settings → Environment Variables (Production):

   | Variable | Value |
   |---|---|
   | `SUPPORT_AGENT_URL` | Full URL of the agent's `/chat` (or equivalent) endpoint |
   | `SUPPORT_AGENT_TOKEN` | Bearer token for auth |

2. **Edit** `functions/api/support.js`:
   - Uncomment the `forwardToAgent()` function block.
   - Replace the `getStubReply()` call with `await forwardToAgent(env, message, history)`.
   - Delete the `getStubReply()` helper entirely.

3. **Agent endpoint spec** — the Pages Function expects the agent to accept:

   ```
   POST <SUPPORT_AGENT_URL>
   Authorization: Bearer <SUPPORT_AGENT_TOKEN>
   Content-Type: application/json

   {
     "message": "visitor message",
     "history": [ { "role": "user"|"agent", "content": "..." } ]
   }
   ```

   And respond with:

   ```json
   { "reply": "agent response text" }
   ```

   If the agent uses a different shape, adapt the `forwardToAgent()` function accordingly.

4. **Test** with `wrangler pages dev public --compatibility-date=2024-01-01` before merging.

---

## File map

```
public/
  chat-widget.js          ← Self-contained widget IIFE (5.2KB gzip)
functions/
  api/
    support.js            ← Cloudflare Pages Function (stub → real agent)
docs/
  chat-integration-contract.md   ← This file
```

---

## Deployment

The Pages Function auto-deploys alongside the static site on every push to `main` via `.github/workflows/deploy.yml`. No additional config needed — Cloudflare Pages detects `functions/` automatically.

---

## Size budget

| Asset | Raw | Gzipped |
|---|---|---|
| `chat-widget.js` | ~17KB | **5.2KB** ✅ |

Target: < 15KB gzipped. Current: 5.2KB. Budget headroom: 9.8KB.
