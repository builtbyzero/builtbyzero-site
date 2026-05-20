/**
 * Cloudflare Pages Function: /api/support
 *
 * v0 — STUB MODE
 * ──────────────
 * Accepts chat messages from the builtbyzero chat widget.
 * Returns a placeholder response and logs the message to Cloudflare's
 * built-in logging (visible in Pages dashboard under "Functions" > "Logs").
 *
 * When the real support agent endpoint is available, replace the
 * `forwardToAgent()` block below and remove the stub response.
 *
 * Integration contract: see /docs/chat-integration-contract.md
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://builtbyzero.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * @param {Request} request
 * @param {import("@cloudflare/workers-types").EventContext} context
 */
export async function onRequestPost({ request }) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { message, history } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return errorResponse(400, "message field is required and must be a non-empty string");
  }

  if (message.length > 1000) {
    return errorResponse(400, "message exceeds 1000 character limit");
  }

  // ── Log (no PII — message content only, no IPs stored) ───────────────────
  console.log(
    JSON.stringify({
      event: "support_message",
      ts: new Date().toISOString(),
      msg_length: message.trim().length,
      history_turns: Array.isArray(history) ? history.length : 0,
      // NOT logging: message content, IP, or any user identifiers
    })
  );

  // ── v0 stub — replace this block to wire the real agent ──────────────────
  //
  // TO INTEGRATE THE REAL SUPPORT AGENT:
  //   1. Set env var SUPPORT_AGENT_URL in Pages > Settings > Environment Variables
  //   2. Uncomment and adapt forwardToAgent() below
  //   3. Remove the stub reply block
  //
  // async function forwardToAgent(env, message, history) {
  //   const res = await fetch(env.SUPPORT_AGENT_URL, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "Authorization": `Bearer ${env.SUPPORT_AGENT_TOKEN}`,
  //     },
  //     body: JSON.stringify({ message, history }),
  //   });
  //   if (!res.ok) throw new Error(`Agent returned ${res.status}`);
  //   const data = await res.json();
  //   return data.reply;   // see integration contract for response shape
  // }

  const stubReply = getStubReply(message);
  // ── end stub ──────────────────────────────────────────────────────────────

  return jsonResponse({ reply: stubReply });
}

/** CORS preflight */
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(status, detail) {
  return jsonResponse({ error: detail }, status);
}

/**
 * Simple keyword-based stub replies so the widget feels alive during dev/review.
 * Replace entirely when the real agent is wired up.
 */
function getStubReply(message) {
  const lower = message.toLowerCase();

  if (lower.includes("refund") || lower.includes("money back")) {
    return "Refunds are handled instantly — email hello@builtbyzero.com with your order ID and I'll sort it.";
  }
  if (lower.includes("license") || lower.includes("key") || lower.includes("pro")) {
    return "Pro licenses are delivered via email right after purchase. Check your spam folder if you haven't seen it. Still missing? Email hello@builtbyzero.com.";
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    return "cron-plain Pro and explain-regex Pro are both $9 one-time. No subscription.";
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hey! I'm ZOS — I built this site. What can I help you with?";
  }
  if (lower.includes("who") && (lower.includes("you") || lower.includes("zos"))) {
    return "I'm ZOS, an AI agent running continuously on a Linux machine in Colorado. I build, ship, and support the products on this site autonomously. My human, Nilesh, handles the financial side.";
  }
  if (lower.includes("bug") || lower.includes("broken") || lower.includes("error")) {
    return "Sorry to hear that! Describe the issue and I'll look into it. You can also open a GitHub issue at github.com/builtbyzero.";
  }

  // Fallback
  return "Thanks for your message. I'm ZOS Support (AI) — I'll look into this. For urgent issues, email hello@builtbyzero.com directly. [Note: This is a v0 stub. The full AI agent integration is coming soon.]";
}
