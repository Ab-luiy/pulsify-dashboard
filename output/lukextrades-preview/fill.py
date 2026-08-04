"""Fill variant-02 with Luke's copy for a preview screenshot. Content only, no design changes."""
import os
import shutil

SRC = r"C:\Users\Lenovoi\Downloads\Pulsify-Brain\assets\landing-page-standard\variant-02"
DST = r"C:\Users\Lenovoi\Downloads\Pulsify-Brain\output\lukextrades-preview"

TOKENS = {
    "PAGE_TITLE": "LukexTrades 1 on 1 Mentorship",
    "META_DESCRIPTION": "Three months, one on one, for traders who keep failing evals with a "
                        "strategy that already works.",
    "OG_URL": "https://pulsify-funnels.pages.dev/lukextrades",
    "OG_IMAGE_URL": "https://pulsify-funnels.pages.dev/og-card.png",
    "CLIENT_SLUG": "lukextrades",

    "BRAND_MARK": "LUKEX TRADES",
    "BRAND_NOTE": "NQ futures",

    "AUDIENCE_PILL": "For funded traders who keep failing the last step",

    "HEADLINE_LINE_ONE": "I passed a 50K eval in one trade.",
    "HEADLINE_EMPHASIS": "Now I sit with six people at a time and get them there.",
    "HERO_SUBHEAD": "Three months, one on one. If your strategy already works in sim and the "
                    "funded account still keeps dying, that gap is the whole thing we fix.",

    "HERO_CTA": "Apply for a spot",
    "MICRO_NOTE": "Six questions. Two minutes. I read every one myself.",

    "VIDEO_NOTE_PRIMARY": "Watch this first",
    "VIDEO_NOTE_SECONDARY": "8 minutes",

    "APPLY_STEP_LABEL": "Step one",
    "APPLY_HEADING": "Tell me where you actually are",
    "APPLY_INTRO": "I take a handful of people at a time, so this is not a form that everyone "
                   "gets through. Answer it honestly and I will tell you straight whether I can "
                   "help or not.",
    "FORM_FRAME_LABEL": "Application",
    "FORM_FRAME_NOTE": "Roughly 2 minutes",

    "PROOF_KICKER": "Receipts",
    "PROOF_INTRO": "Funded accounts, payouts, and the traders who got there. Every one of these "
                   "is a real screenshot, not a graphic.",

    "CLOSING_CTA": "Apply for a spot",

    "FOOTER_LABEL": "LukexTrades",
    "FOOTER_DISCLAIMER": "Trading futures involves risk of loss. Results vary and nothing here "
                         "is a guarantee of performance.",
}

os.makedirs(os.path.join(DST, "css"), exist_ok=True)
shutil.copy2(os.path.join(SRC, "css", "style.css"), os.path.join(DST, "css", "style.css"))

with open(os.path.join(SRC, "index.html"), encoding="utf-8") as f:
    html = f.read()

for k, v in TOKENS.items():
    html = html.replace("{{" + k + "}}", v)

# the live integration script is not reachable offline; drop it for the preview only
html = html.replace(
    '<script src="https://pulsify-funnels.pages.dev/js/funnel-integrations.js"></script>', "")

leftover = [t for t in TOKENS if "{{" + t + "}}" in html]
import re
unfilled = re.findall(r"\{\{[A-Z0-9_]+\}\}", html)

out = os.path.join(DST, "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

print("wrote:", out)
print("unfilled tokens:", unfilled if unfilled else "none")
