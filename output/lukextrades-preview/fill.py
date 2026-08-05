"""Fill the landing-page templates with Luke's copy for preview screenshots.

Builds two skins: monochrome variant-02 and the retained gold variant.
Content only. No design changes to either template.
"""
import os
import re
import shutil

ROOT = r"C:\Users\Lenovoi\Downloads\Pulsify-Brain"
SKINS = {
    "mono": os.path.join(ROOT, r"assets\landing-page-standard\variant-02"),
    "gold": os.path.join(ROOT, r"assets\landing-page-standard\variant-02-gold-preview"),
}
DST = os.path.join(ROOT, r"output\lukextrades-preview")

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

INTEGRATION = ('<script src="https://pulsify-funnels.pages.dev/js/'
               'funnel-integrations.js"></script>')

for skin, src in SKINS.items():
    out_dir = os.path.join(DST, skin)
    os.makedirs(os.path.join(out_dir, "css"), exist_ok=True)

    for f in os.listdir(os.path.join(src, "css")):
        shutil.copy2(os.path.join(src, "css", f), os.path.join(out_dir, "css", f))
    if os.path.isdir(os.path.join(src, "assets")):
        shutil.copytree(os.path.join(src, "assets"),
                        os.path.join(out_dir, "assets"), dirs_exist_ok=True)

    with open(os.path.join(src, "index.html"), encoding="utf-8") as f:
        html = f.read()

    # the gold skin ships its own extra stylesheet on the mockup, not the template
    if skin == "gold" and os.path.exists(os.path.join(src, "css", "mockup.css")):
        html = html.replace('<link rel="stylesheet" href="css/style.css">',
                            '<link rel="stylesheet" href="css/style.css">\n'
                            '  <link rel="stylesheet" href="css/mockup.css">')

    for k, v in TOKENS.items():
        html = html.replace("{{" + k + "}}", v)
    html = html.replace(INTEGRATION, "")

    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    # a second copy with the hero hidden, so the application section can be shot directly
    with open(os.path.join(out_dir, "_apply.html"), "w", encoding="utf-8") as f:
        f.write(html.replace("</head>",
                             "<style>.hero{display:none!important}</style></head>"))

    unfilled = re.findall(r"\{\{[A-Z0-9_]+\}\}", html)
    print(f"{skin:>5}: {out_dir}  unfilled={unfilled if unfilled else 'none'}")
