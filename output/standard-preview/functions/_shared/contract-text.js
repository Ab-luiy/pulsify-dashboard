// The contract the booked pipeline sends through DocuSign (ticket #80).
// Built from the service agreement the founder already uses (FITFO structure,
// clients/tb-tradez/contract-draft.md) with the three filled-in terms from the
// popup: the revenue share, the starting monthly revenue, and the approved
// guarantee wording. Every value is escaped; nothing from the popup is trusted
// as markup. DocuSign places the signature at the two anchor strings.
import { escapeHtml } from "./common.js";

export const GUARANTEE_TEXT =
  "Your workspace is live and tailored to you the day you finish onboarding, and your first video package and story sequence follow right after. If anything we promised isn't delivered, we keep working at no extra cost until it is. No refunds.";

export const CLIENT_ANCHOR = "/pulsify_client_sign/";
export const OPERATOR_ANCHOR = "/pulsify_operator_sign/";

export function dollars(cents) {
  const whole = Math.round(Number(cents || 0)) / 100;
  return "$" + whole.toLocaleString("en-US", { minimumFractionDigits: whole % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

const hidden = (text) => `<span style="color:#ffffff;font-size:1px">${text}</span>`;

// Founder 2026-10-26: setters and closers are paid out of our share, 10% closer and 5% setter, the
// rest is ours (FITFO and TB Tradez structure). A share below 15% cannot fund them, so that case
// leaves their pay to be agreed in writing.
export function salesTeamClause(feePercent) {
  if (!(feePercent >= 15)) {
    return "<p><strong>Sales team:</strong> where setters and closers are engaged, how they are paid is agreed in writing before they start.</p>";
  }
  const kept = feePercent - 15;
  return `<p><strong>Sales team:</strong> where setters and closers are engaged, the Operator's ${feePercent}% share pays for them: ten percent (10%) to the closer, five percent (5%) to the setter, and ${kept}% kept by the Operator. The Client pays nothing extra for the sales team. Until a sales team is engaged, the Operator performs these functions and keeps the full ${feePercent}%.</p>`;
}

export function contractTitle(deal) {
  return `Pulsify service agreement for ${deal.first_name} ${deal.last_name}`.trim();
}

export function buildContractHtml(deal, { operatorName = "Pulsify", countersign = false, today = new Date() } = {}) {
  const e = escapeHtml;
  const client = `${deal.first_name} ${deal.last_name}`.trim();
  const upfront = Number(deal.upfront_cents) > 0
    ? `<p><strong>Setup fee:</strong> ${e(dollars(deal.upfront_cents))} (USD), due when this Agreement is signed.</p>`
    : "<p>No upfront fee is payable.</p>";
  const salesTeam = salesTeamClause(Number(deal.fee_percent));
  const notes = deal.notes ? `<h2>Additional terms</h2><p>${e(deal.notes).replace(/\n/g, "<br>")}</p>` : "";
  const date = today.toISOString().slice(0, 10);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${e(contractTitle(deal))}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;color:#111111">
<h1>${e(operatorName)} service agreement</h1>
<p>This Service Agreement (the "Agreement") is made on ${e(date)} between <strong>${e(operatorName)}</strong> (the "Operator") and <strong>${e(client)}</strong>, ${e(deal.email)} (the "Client"). Together they are the "Parties".</p>

<h2>I. The services</h2>
<p>The Operator provides growth operations and content systems for the Client's creator business. This covers offer development and positioning, packaging and structuring the Client's YouTube content, optimizing the Client's Instagram profile with story sequences and carousels, a client portal for content tracking and planning, payment-processor setup, funnel development, and weekly reporting.</p>
<p>It also covers building the Client's paid program (the curriculum, how the Client runs one-to-one calls, teaching material, tracking who has paid, and setting up the platform it is hosted on); recruiting, training and managing setters and closers when the offer is ready to scale; and planning and managing paid advertising as a later phase of the engagement, or earlier if the Client wants to scale faster.</p>
<p>The Client records and publishes all videos. Deliverables may be adjusted for unforeseen circumstances or changes in the Client's needs.</p>
<p>The Client keeps up the agreed content cadence, answers requests in good time, stays available for scheduled calls, provides account access when it is needed for setup and tracking, and delivers the program to the Client's own students.</p>

<h2>II. Fees</h2>
${upfront}
<p><strong>Revenue share:</strong> the Operator receives ${e(String(deal.fee_percent))}% of all revenue collected by the Client from the offer(s) developed under this Agreement, and the Client keeps the rest. The Operator's share is due within five (5) business days after the revenue is received by the Client. "Revenue" means cash actually collected by the Client, net of refunds and chargebacks.</p>
${salesTeam}
<p><strong>Starting monthly revenue:</strong> the Parties record the Client's monthly revenue at the start of this Agreement as <strong>${e(dollars(deal.start_revenue_cents))} per month</strong>.</p>
<p>All amounts are in USD. Late or failed payments pause the Operator's work until the payment is resolved.</p>

<h2>III. Guarantee</h2>
<p>${e(GUARANTEE_TEXT)}</p>

<h2>IV. Term and termination</h2>
<p>This Agreement starts when both Parties have signed and continues until either Party ends it by written notice (a message counts). No notice period and no termination penalty applies. The Client keeps the systems and deliverables built during the engagement. Revenue from any opportunity already in active progress when the Agreement ends, and collected within thirty (30) days after that, remains subject to the revenue share in Section II.</p>

<h2>V. Refunds</h2>
<p>All payments are non-refundable, because they are tied to work already performed and revenue already collected.</p>

<h2>VI. Confidentiality</h2>
<p>Both Parties keep confidential the funnel strategies, revenue data, client lists and other materials shared during the engagement, unless the law requires disclosure or the other Party agrees in writing. The Operator may use results and content produced through the engagement as case studies, and the Client may ask for specific personal details to be withheld.</p>

<h2>VII. General</h2>
<p>This Agreement is personal to the Client and may not be assigned without the Operator's written consent. Each Party holds the other harmless from claims arising from its own negligence or misconduct. This Agreement is the whole agreement between the Parties. The Parties will try to settle any dispute in good faith first, and then in a forum they agree on at that time.</p>
${notes}
<p><strong>By signing below, each Party confirms it understands and agrees to these terms, including the fees, the guarantee, the refund terms and confidentiality.</strong></p>
<table style="width:100%"><tr>
<td style="width:50%;vertical-align:top"><p><strong>Client</strong></p><p>${e(client)}</p><p>Signature: ${hidden(CLIENT_ANCHOR)}</p></td>
<td style="width:50%;vertical-align:top"><p><strong>Operator</strong></p><p>${e(operatorName)}</p>${countersign ? `<p>Signature: ${hidden(OPERATOR_ANCHOR)}</p>` : "<p>Accepted by sending this Agreement.</p>"}</td>
</tr></table>
</body></html>`;
}
