/**
 * builtbyzero Support Chat Widget
 * v0.1 — stub mode (proxies to /api/support)
 * Zero PII collection. No trackers. localStorage only.
 * < 15KB gzipped target.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "bbz_chat_v1";
  const API_ENDPOINT = "/api/support";

  // ── Helpers ───────────────────────────────────────────────────────────────

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory(msgs) {
    try {
      // Keep last 100 messages max
      const trimmed = msgs.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // storage full — ignore
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function genId() {
    return Math.random().toString(36).slice(2, 10);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const CSS = `
:root {
  --bbz-accent: #60a5fa;
  --bbz-accent-dark: #2563eb;
  --bbz-bg: #111;
  --bbz-surface: #1a1a1a;
  --bbz-border: #2a2a2a;
  --bbz-text: #f0eee8;
  --bbz-muted: #888;
  --bbz-bubble-size: 52px;
  --bbz-panel-w: 360px;
  --bbz-panel-h: 520px;
  --bbz-radius: 12px;
  --bbz-z: 9999;
}

@media (prefers-color-scheme: light) {
  :root {
    --bbz-accent: #2563eb;
    --bbz-accent-dark: #1d4ed8;
    --bbz-bg: #fff;
    --bbz-surface: #f7f5f0;
    --bbz-border: #ddd;
    --bbz-text: #0a0a0a;
    --bbz-muted: #6b6b6b;
  }
}

#bbz-chat-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

#bbz-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: var(--bbz-z);
  width: var(--bbz-bubble-size);
  height: var(--bbz-bubble-size);
  border-radius: 50%;
  background: var(--bbz-accent);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
  transition: transform 0.15s ease, background 0.15s ease;
  color: #fff;
  font-size: 22px;
  line-height: 1;
}

#bbz-toggle:hover {
  background: var(--bbz-accent-dark);
  transform: scale(1.07);
}

#bbz-toggle:focus-visible {
  outline: 3px solid var(--bbz-accent);
  outline-offset: 3px;
}

#bbz-toggle[aria-expanded="true"] .bbz-icon-chat { display: none; }
#bbz-toggle[aria-expanded="false"] .bbz-icon-close { display: none; }

#bbz-panel {
  position: fixed;
  bottom: calc(var(--bbz-bubble-size) + 36px);
  right: 24px;
  z-index: var(--bbz-z);
  width: var(--bbz-panel-w);
  height: var(--bbz-panel-h);
  background: var(--bbz-bg);
  border: 1px solid var(--bbz-border);
  border-radius: var(--bbz-radius);
  box-shadow: 0 8px 40px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

#bbz-panel[hidden] {
  display: none !important;
}

#bbz-panel.bbz-opening {
  animation: bbz-pop-in 0.18s ease forwards;
}

@keyframes bbz-pop-in {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* Mobile: full-screen */
@media (max-width: 480px) {
  #bbz-panel {
    width: 100vw;
    height: 100dvh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
  #bbz-toggle {
    bottom: 16px;
    right: 16px;
  }
}

/* ── Header ── */
#bbz-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--bbz-surface);
  border-bottom: 1px solid var(--bbz-border);
  flex-shrink: 0;
}

.bbz-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bbz-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
}

.bbz-header-text {
  flex: 1;
  min-width: 0;
}

.bbz-header-name {
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 0.9rem;
  color: var(--bbz-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bbz-header-sub {
  font-size: 0.75rem;
  color: var(--bbz-muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

#bbz-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--bbz-muted);
  font-size: 0.75rem;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.12s;
  white-space: nowrap;
}

#bbz-clear-btn:hover { color: var(--bbz-text); }
#bbz-clear-btn:focus-visible { outline: 2px solid var(--bbz-accent); }

/* ── Messages ── */
#bbz-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 0.92rem;
  line-height: 1.5;
  scroll-behavior: smooth;
}

#bbz-messages::-webkit-scrollbar { width: 4px; }
#bbz-messages::-webkit-scrollbar-track { background: transparent; }
#bbz-messages::-webkit-scrollbar-thumb { background: var(--bbz-border); border-radius: 2px; }

.bbz-msg {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 82%;
}

.bbz-msg.bbz-user {
  align-self: flex-end;
  align-items: flex-end;
}

.bbz-msg.bbz-agent {
  align-self: flex-start;
  align-items: flex-start;
}

.bbz-bubble {
  padding: 9px 13px;
  border-radius: 14px;
  word-break: break-word;
  white-space: pre-wrap;
}

.bbz-msg.bbz-user .bbz-bubble {
  background: var(--bbz-accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bbz-msg.bbz-agent .bbz-bubble {
  background: var(--bbz-surface);
  color: var(--bbz-text);
  border: 1px solid var(--bbz-border);
  border-bottom-left-radius: 4px;
}

.bbz-msg-meta {
  font-size: 0.7rem;
  color: var(--bbz-muted);
  padding: 0 4px;
}

/* Typing indicator */
.bbz-typing .bbz-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
}

.bbz-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--bbz-muted);
  animation: bbz-bounce 1.2s infinite;
}
.bbz-dot:nth-child(2) { animation-delay: 0.2s; }
.bbz-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bbz-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40%           { transform: translateY(-5px); opacity: 1; }
}

/* Error state */
.bbz-error .bbz-bubble {
  background: #3b1111;
  border-color: #7f1d1d;
  color: #fca5a5;
}

/* ── Input area ── */
#bbz-footer {
  display: flex;
  gap: 8px;
  padding: 12px 12px 14px;
  border-top: 1px solid var(--bbz-border);
  background: var(--bbz-surface);
  flex-shrink: 0;
}

#bbz-input {
  flex: 1;
  background: var(--bbz-bg);
  border: 1px solid var(--bbz-border);
  border-radius: 8px;
  color: var(--bbz-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 0.9rem;
  line-height: 1.4;
  padding: 9px 12px;
  resize: none;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.12s;
}

#bbz-input::placeholder { color: var(--bbz-muted); }
#bbz-input:focus {
  outline: none;
  border-color: var(--bbz-accent);
}

#bbz-send {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-self: flex-end;
  background: var(--bbz-accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, transform 0.1s;
}

#bbz-send:hover:not(:disabled) {
  background: var(--bbz-accent-dark);
}

#bbz-send:active:not(:disabled) {
  transform: scale(0.94);
}

#bbz-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

#bbz-send:focus-visible {
  outline: 3px solid var(--bbz-accent);
  outline-offset: 2px;
}

#bbz-send svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* ── Disclaimer ── */
#bbz-disclaimer {
  text-align: center;
  font-size: 0.68rem;
  color: var(--bbz-muted);
  padding: 4px 12px 8px;
  font-family: -apple-system, system-ui, sans-serif;
}
`;

  // ── HTML template ──────────────────────────────────────────────────────────

  const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`;
  const ICON_SEND = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  function buildDOM() {
    // Style injection
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    // Root wrapper
    const root = document.createElement("div");
    root.id = "bbz-chat-root";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Support chat");

    // Toggle button
    const toggle = document.createElement("button");
    toggle.id = "bbz-toggle";
    toggle.setAttribute("aria-label", "Open support chat");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "bbz-panel");
    toggle.innerHTML = `<span class="bbz-icon-chat">${ICON_CHAT}</span><span class="bbz-icon-close">${ICON_CLOSE}</span>`;

    // Panel
    const panel = document.createElement("div");
    panel.id = "bbz-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-label", "ZOS Support chat");
    panel.hidden = true;
    panel.innerHTML = `
      <div id="bbz-header">
        <div class="bbz-avatar" aria-hidden="true">0</div>
        <div class="bbz-header-text">
          <div class="bbz-header-name">ZOS Support <span style="font-weight:400;opacity:0.7;">(AI)</span></div>
          <div class="bbz-header-sub">builtbyzero · usually replies instantly</div>
        </div>
        <button id="bbz-clear-btn" title="Clear conversation" aria-label="Clear conversation history">clear</button>
      </div>
      <div id="bbz-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div id="bbz-disclaimer">AI-powered · no data stored server-side</div>
      <div id="bbz-footer">
        <textarea
          id="bbz-input"
          placeholder="Ask anything…"
          rows="1"
          aria-label="Message input"
          autocomplete="off"
          spellcheck="true"
          maxlength="1000"
        ></textarea>
        <button id="bbz-send" aria-label="Send message" disabled>${ICON_SEND}</button>
      </div>
    `;

    root.appendChild(toggle);
    root.appendChild(panel);
    document.body.appendChild(root);

    return {
      root,
      toggle,
      panel,
      messagesEl: panel.querySelector("#bbz-messages"),
      input: panel.querySelector("#bbz-input"),
      sendBtn: panel.querySelector("#bbz-send"),
      clearBtn: panel.querySelector("#bbz-clear-btn"),
    };
  }

  // ── Message rendering ──────────────────────────────────────────────────────

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderMessage(msg, container) {
    const wrap = document.createElement("div");
    wrap.className = `bbz-msg bbz-${msg.role}${msg.error ? " bbz-error" : ""}`;
    wrap.dataset.id = msg.id;

    const bubble = document.createElement("div");
    bubble.className = "bbz-bubble";
    bubble.textContent = msg.content;

    const meta = document.createElement("div");
    meta.className = "bbz-msg-meta";
    meta.textContent = msg.role === "user" ? "you" : "ZOS Support (AI)";
    if (msg.ts) meta.textContent += " · " + formatTime(msg.ts);

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    container.appendChild(wrap);
    return wrap;
  }

  function addTypingIndicator(container) {
    const wrap = document.createElement("div");
    wrap.className = "bbz-msg bbz-agent bbz-typing";
    wrap.id = "bbz-typing";
    wrap.setAttribute("aria-label", "ZOS is typing");
    wrap.innerHTML = `<div class="bbz-bubble"><span class="bbz-dot"></span><span class="bbz-dot"></span><span class="bbz-dot"></span></div>`;
    container.appendChild(wrap);
    return wrap;
  }

  function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
  }

  // ── API call ───────────────────────────────────────────────────────────────

  async function callSupport(message, history) {
    const payload = {
      message,
      // Send last 10 turns of context (no PII — just message content)
      history: history.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.reply || data.message || "…";
  }

  // ── Widget controller ──────────────────────────────────────────────────────

  function init() {
    const { toggle, panel, messagesEl, input, sendBtn, clearBtn } = buildDOM();
    let history = loadHistory();
    let open = false;
    let busy = false;

    // Restore history on load
    if (history.length === 0) {
      // First-visit greeting
      history.push({
        id: genId(),
        role: "agent",
        content:
          "Hey — I'm ZOS, the AI that built this site. Ask me anything about builtbyzero, the products, or how this all works.",
        ts: Date.now(),
      });
      saveHistory(history);
    }

    function renderAll() {
      messagesEl.innerHTML = "";
      history.forEach((m) => renderMessage(m, messagesEl));
      scrollToBottom(messagesEl);
    }

    function setOpen(val) {
      open = val;
      panel.hidden = !val;
      toggle.setAttribute("aria-expanded", val ? "true" : "false");
      toggle.setAttribute("aria-label", val ? "Close support chat" : "Open support chat");
      if (val) {
        panel.classList.add("bbz-opening");
        panel.addEventListener("animationend", () => panel.classList.remove("bbz-opening"), { once: true });
        renderAll();
        setTimeout(() => input.focus(), 50);
      }
    }

    function setBusy(val) {
      busy = val;
      sendBtn.disabled = val || input.value.trim().length === 0;
      input.disabled = val;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text || busy) return;

      const userMsg = { id: genId(), role: "user", content: text, ts: Date.now() };
      history.push(userMsg);
      saveHistory(history);
      renderMessage(userMsg, messagesEl);
      scrollToBottom(messagesEl);

      input.value = "";
      input.style.height = "auto";
      setBusy(true);

      const typing = addTypingIndicator(messagesEl);
      scrollToBottom(messagesEl);

      try {
        const reply = await callSupport(text, history.slice(0, -1));
        typing.remove();

        const agentMsg = { id: genId(), role: "agent", content: reply, ts: Date.now() };
        history.push(agentMsg);
        saveHistory(history);
        renderMessage(agentMsg, messagesEl);
        scrollToBottom(messagesEl);
      } catch (err) {
        typing.remove();
        const errMsg = {
          id: genId(),
          role: "agent",
          content: "Something went wrong. Try again in a moment.",
          ts: Date.now(),
          error: true,
        };
        history.push(errMsg);
        saveHistory(history);
        renderMessage(errMsg, messagesEl);
        scrollToBottom(messagesEl);
      } finally {
        setBusy(false);
      }
    }

    // ── Event listeners ──────────────────────────────────────────────────────

    toggle.addEventListener("click", () => setOpen(!open));

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Auto-grow textarea
    input.addEventListener("input", () => {
      sendBtn.disabled = busy || input.value.trim().length === 0;
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });

    // Send on Enter (Shift+Enter = newline)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener("click", sendMessage);

    clearBtn.addEventListener("click", () => {
      if (confirm("Clear conversation history?")) {
        history = [];
        localStorage.removeItem(STORAGE_KEY);
        // Re-add greeting
        history.push({
          id: genId(),
          role: "agent",
          content:
            "Hey — I'm ZOS, the AI that built this site. Ask me anything about builtbyzero, the products, or how this all works.",
          ts: Date.now(),
        });
        saveHistory(history);
        renderAll();
      }
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
