---
type: playbook
tags: [operations, ai, claude, codex, vault]
sources: [[AGENTS]], [[CLAUDE]], [[synthesis/vsl-pattern-lab]]
created: 2026-05-09
updated: 2026-05-09
---

# Claude and Codex collaboration

Claude is Abdul's main LLM. Codex helps maintain the vault, structure the system, edit files safely, and keep Obsidian usable. Both models should work from the same source of truth instead of creating competing versions of Pulsify's strategy.

## Why this matters for Pulsify

The vault exists so strategy compounds. If Claude and Codex create separate interpretations, the vault turns into noise. If both use the same files, the work compounds: Claude can think through copy and strategy, Codex can maintain structure and operational hygiene, and Abdul keeps direction.

## Roles

Claude is primary for:

- Strategic conversations with Abdul
- VSL writing and copy direction
- Persona refinement
- High-context ideation
- Reviewing transcript patterns when Abdul feeds them in

Codex is primary for:

- Creating and maintaining vault structure
- Updating index and log
- Creating templates and reusable markdown systems
- Checking broken links, stale pages, and missing context
- Turning repeated workflows into stable Obsidian pages
- Making sure raw sources, wiki synthesis, and client files stay separated

Both can write synthesis, but neither should overwrite the other's work without reading the existing page first.

## Shared rules

1. `raw-sources/` stores inputs. Do not rewrite raw transcripts, SOPs, or source files except to add new user-supplied material.
2. `wiki/` stores synthesis. This is where patterns, frameworks, decisions, and reusable intelligence live.
3. `wiki/index.md` gets updated when new durable pages are created.
4. `wiki/log.md` gets a short entry when a meaningful decision, ingest, or structural change happens.
5. Contradictions get flagged. They are not silently smoothed over.
6. Claude and Codex should cite the same Obsidian pages when giving strategic answers.

## VSL workflow split

Abdul transcribes VSLs and drops the transcript into `raw-sources/vsls/`.

Claude or Codex can then create the analysis page in `wiki/synthesis/vsl-patterns/`.

The workflow:

1. Read the raw transcript.
2. Segment the VSL.
3. Extract the persuasion pattern.
4. Map it to [[people/marcus-avatar]].
5. Add the reusable pattern card to [[synthesis/vsl-pattern-lab]] or a dedicated analysis page.
6. Update [[wiki/index]] and [[wiki/log]] if a durable page is created.

## Current priorities

1. Build the VSL pattern library.
2. Use patterns to sharpen Pulsify's own VSL.
3. Prepare the next YouTube video on sales/funnel automation.
4. Document the AI system architecture behind content, funnels, outreach, and sales infrastructure.
5. Return to outreach once the VSL and next video direction are structurally clear.

## Open questions / gaps

- The dedicated [[concepts/pulse-system]] page still needs to exist.
- The AI system architecture needs a canonical page that separates Pulse Engine, Pulse Brain, and Pulse Loop.
- The VSL transcript library has not started yet.

## Source trail

- [[AGENTS]]
- [[CLAUDE]]
- [[synthesis/vsl-pattern-lab]]

