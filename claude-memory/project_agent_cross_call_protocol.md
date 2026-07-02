---
name: agent-cross-call-protocol
description: "Claude and Codex can invoke each other headlessly; protocol lives in AGENT_CHAT.md; Claude->Codex verified live, Codex->Claude blocked on stale CLI token"
metadata: 
  node_type: memory
  type: project
  originSessionId: f4365cfb-5a05-4c17-a2b4-fe27b929db76
---

Set up 2026-07-02 per user request ("best of both worlds"). Full protocol section lives in `C:/Users/Abdullah/Desktop/Pulsify-Brain/AGENT_CHAT.md` (canonical main-root copy) — read it there, this note is just the pointer + gotchas.

- Claude -> Codex: WORKS, live-verified. `codex exec --sandbox read-only -C <dir> -o <outfile> "task" </dev/null`. codex-cli 0.142.5 installed globally via npm, ChatGPT-authed. Default model gpt-5.5 / effort medium (from ~/.codex/config.toml); override with `-m <model>` and `-c model_reasoning_effort="high"`.
- GOTCHA 1: `codex exec` hangs forever if stdin is left open in a non-interactive shell. Always `</dev/null` (bash) or pipe `''` (PowerShell).
- GOTCHA 2: `-o /dev/stdout` fails on Windows; use a real file path for the final-message output.
- Codex -> Claude: `claude -p "task" --model haiku|sonnet|opus|opusplan` is the right shape but returns 401 — standalone CLI token in ~/.claude/.credentials.json is stale (May 28); user auths via desktop app whose proxy (ANTHROPIC_BASE_URL) doesn't reach nested/standalone runs. USER-SIDE FIX: log in once from a plain terminal (`claude` then /login).
- Default pattern = builder/reviewer (other agent reviews the diff read-only before deploy), depth 1 only (no call-backs), caller owns locks/log entries in AGENT_CHAT.md.
- QUOTA POLICY (user directive, don't hit session limits): default is NO cross-call; effort scales with stakes (small diff = skip or gpt-5.4 medium, normal = gpt-5.5 medium, live-pipe/auth/deploy-critical = gpt-5.5 high, xhigh rare); one review round per change; ~9-10k token overhead per exec call so batch, never micro-call; if user says a side is low on budget it stops being callable.

**Why:** cross-model review catches what a single model misses; user wanted mutual prompting with exact model control.
**How to apply:** for a second-opinion review of a diff, shell out to `codex exec` per above instead of only self-reviewing; log the cross-call in [[AGENT_CHAT.md]]'s Log.
