// The level of writing the Copywriter is held to (pulsify-saas #18). One worked example per kind of writing,
// shown to the model so it matches the rhythm and care of the best assistants instead of the average draft.
// Every fact is left as a [bracket] on purpose: the model learns to leave a visible gap rather than invent a
// number, and it cannot copy a real claim into a client's piece. The reply shape here (the piece first, one
// "Assumed:" line when a guess was made, at most one "Next:" line) is the shape every reply should have.

export const EXEMPLARS = {
  // Reels are unscripted (founder 2026-10-15): hooks to open with and notes to talk from, never lines to read.
  reel: `Request: A reel for new traders about sizing up after a loss. End by asking them to follow.

Reply:
Hooks:
1. Most blown accounts start with one decision, made right after a loss.
2. The trade after a red one is the most expensive trade you'll take.
3. I stopped doubling up after losses. This is the rule I use instead.
Talk about:
- the urge to win it back the same day
- doubling size is how a small red day becomes a dead account
- the rule: same size or smaller for 24 hours after a loss
- [one real example from you or a student, with the real result]
Show: you at your desk, then the chart of a trade you took right after a loss
End with: follow for the next rule
Caption: The trade after a loss decides your week. Same size or smaller for 24 hours.
Next: Send me one real example and I'll put it in the fourth note.`,

  email: `Request: An email to people who watched my last video but have not booked a call.

Reply:
Subject: The one thing from the video

Hi [first name],

You watched the video on sizing after a loss, so you know the rule. The hard part is following it on a bad day, when it feels wrong.

Try this for your next five trades: write your position size down before you open the chart. If you change it after a loss, note why.

Most people see their own pattern inside a week.

If you want help building the rule around your account, reply with the size you trade today and I will tell you what I would change.

[Your first name]

Assumed: the video was about position sizing.`,

  dm: `Request: Summarize this conversation and tell me the next step. (The lead said he blew two accounts, likes the idea, and asked what it costs.)

Reply:
What they want: to stop blowing accounts and trade consistently.
Still open: price. He asked but has not said what he can spend.
Agreed: nothing yet.
Next step: find out what consistent trading is worth to him over a year, then offer a call.

Draft reply:
Two blown accounts is rough, and most traders I work with started exactly there. Before I talk about price, what would trading consistently be worth to you over the next year?`,

  story: `Request: A 5-slide credibility story for new traders. Finish with: DM me RULES.

Reply:
Slide 1: [Real result] in [real time]. Here is what changed.
Photo: a clean screenshot of [the real result], cropped tight.
Slide 2: Six months before that, I [real low point, one sentence]. I was doing what everyone does.
Photo: a plain photo of [your workspace at that time], no staging.
Slide 3: The turning point was one rule: [the rule, in plain words].
Photo: you, to camera, mid-sentence.
Slide 4: [A student or client result that came from the same rule, with permission.]
Photo: their message or result, with their name hidden if they asked.
Slide 5: I wrote the rule down as a one-page checklist. DM me RULES and I will send it.
Photo: the checklist on a desk.
Assumed: your own result, not a student's, opens the sequence.
Next: Send me the real result and I will tighten slide 1.`,

  youtube: `Request: A title, thumbnail text and opening for a video about a risk rule.

Reply:
Title: Stop Revenge Trading Today
Thumbnail text: SIZE DOWN
Opening, first 20 seconds:
Every blown account I have seen ends the same way: one loss, then a bigger trade to win it back. In this video I will show you the single rule that stops that, and the exact size I use after a red trade. Stay to the end, because the rule only works if you set it before you trade.
[One line on your own proof, for example your real result.]
Next: Tell me the real result and I will place it before the rule.`,

  rewrite: `Request: Make this shorter and less formal.
Draft: In today's fast-paced market, it is crucial to leverage proper risk management strategies in order to unlock consistent profitability over time.

Reply:
Risk the same small amount on every trade. That is what keeps you in the game long enough to get good.`,
};

export function exemplarFor(format) {
  return EXEMPLARS[format] || "";
}
