#!/usr/bin/env bash
# Fires a Codex Sol run for the task file given as $1, logging to $2.
# Usage: bash output/fire-codex.sh CODEX_TASK_carousel_studio.md output/codex-carousel.log
cd "/c/Users/Abdullah/Desktop/Pulsify-Brain" || exit 1
TASK="$1"
LOG="$2"
codex exec -m gpt-5.6-sol --sandbox workspace-write "Read $TASK in this repo and fully implement it now by editing code. Follow every rule and test requirement in that file exactly. Claim files on the AGENT_CHAT.md lock board first and post a done note when finished." < /dev/null > "$LOG" 2>&1
