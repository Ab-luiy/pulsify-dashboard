# Pulsify visual reference library

Drop pictures, brand screenshots, backgrounds, gradients, posters, websites and other visual references into **inbox/**. Any filename is fine. No sorting or explanation required.

Optional: add one sentence in reference-notes.md saying what caught your eye. "Only the background", "love the colors, hate the type", and "not sure why I like this" are useful notes.

Tell Claude or Codex: "Review the new visual references." Both agents use this same library.

## How we use it

1. Look at every new image. Keep the original file unchanged.
2. Record the filename, source link if known, what the founder explicitly likes or dislikes, and our interpretation separately in reference-notes.md.
3. Analyze color relationships, gradients, lighting, texture, typography, spacing, composition, mood and the underlying concept. A saved image is inspiration; it does not mean every element is approved.
4. Update taste-profile.md when repeated patterns or explicit feedback support it. Link every observation to its references. Keep uncertain interpretations marked as tentative.
5. Make selected moodboards and original variations in boards/. Preserve the references; never overwrite them with generated versions.
6. Translate the approved direction into reusable colors, type, backgrounds and layout rules for the relevant Pulsify surface. Check the app's current design system before implementation.

The profile and notes are portable context for any AI. Supply the actual reference images too; descriptions alone cannot preserve the visual detail.

## Files

- [Inbox](inbox/) - save all new images here.
- [Reference notes](reference-notes.md) - what each reference contributes.
- [Taste profile](taste-profile.md) - the growing summary of your preferences.
- [Boards](boards/) - moodboards, experiments and approved variations.

## Existing collections

Keep these originals where they are; link relevant references rather than duplicating them:
- ../outreach/packaging-references/Packaging examples.md - YouTube packaging examples.
- ../raw-sources/inspiration/dustin-varano-infoos/ - InfoOS reference screenshots.
- ../raw-sources/inspiration/design/ - earlier design references.

## Scope

Founder requested this library on 2026-09-29 to learn his taste and develop a coherent Pulsify aesthetic. This is a shared collection, not a replacement design system. Current app implementation guidance lives in C:/Users/Abdullah/Desktop/pulsify-saas/docs/DESIGN.md. Landing pages have their own locked standard in ../DESIGN.md. Explore freely in boards; reconcile approved changes with the relevant system before applying them.
