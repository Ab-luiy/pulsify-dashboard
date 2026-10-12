// Generated copy is shown as plain text (founder 2026-10-12: a reel came back with **Hook** and
// *(look into camera)* on screen). The prompts already ask for plain text; models still slip, so the
// server removes markdown before the client sees it. Words are never changed, only the symbols.
export function plainText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,:;!?]|$)/gm, "$1$2")
    .replace(/^[ \t]*[-*][ \t]{1,3}(?=\S)/gm, "- ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
