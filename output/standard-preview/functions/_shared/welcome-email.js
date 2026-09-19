// Welcome email. The copy lives in shared/email/welcome.md so it is edited,
// not coded. This module carries the same text as a fallback so a missing
// asset can never block provisioning, and renders text plus a plain HTML body.
import { escapeHtml } from "./common.js";

export const WELCOME_TEMPLATE = `subject: Your Pulsify workspace is ready

Hey {{first_name}},

Your workspace is set up. Here is the link to create your password and get in:

{{setup_link}}

It works once and expires in 48 hours. If it runs out, reply to this email and we will send a fresh one.

What happens next, in order:

1. You record a two-minute voice note on what you sell and who buys it. We turn that into your brain, so every sequence and title we produce sounds like you.
2. You connect Instagram and YouTube. Read-only. This is how we see what is working.
3. We build your first sequence from a real student result, you approve it, you post it.

That is the whole first week. Nothing else is needed from you yet.

{{booking_line}}

Abdul
Pulsify`;

export function welcomeEmail({ firstName, setupLink, bookingLine = "", template = WELCOME_TEMPLATE }) {
  const [subjectLine, ...rest] = template.split("\n");
  const subject = subjectLine.replace(/^subject:\s*/i, "").trim();
  const body = rest.join("\n").trim()
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{setup_link\}\}/g, setupLink)
    .replace(/\{\{booking_line\}\}/g, bookingLine)
    .replace(/\n{3,}/g, "\n\n");
  const paragraph = (p) => p.trim() === setupLink
    ? `<p style="margin:0 0 16px"><a href="${escapeHtml(setupLink)}">${escapeHtml(setupLink)}</a></p>`
    : `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`;
  const html = `<div style="font:15px/1.6 Inter,system-ui,sans-serif;color:#1f1f1f;max-width:560px">${body.split("\n\n").map(paragraph).join("")}</div>`;
  return { subject, text: body, html };
}
