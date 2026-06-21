---
type: playbook
tags: [content, outreach, lead-sourcing, youtube, seo]
sources: [[raw-sources/sops/Lead Sourcing & Outreach SOP.pdf]], [[raw-sources/scripts/AI-Outreach-Framework-Grant-Garcia.md]]
created: 2026-05-22
updated: 2026-06-15
---

# YouTube lead sourcing — niche query bank

This page exists for one purpose: find small YouTube channels where a biz-op coach is clearly selling a high-ticket mentorship, has built enough content to have social proof, but has not yet figured out how to grow or convert at scale. That is Pulsify's ICP. The queries below are designed to surface those channels via YouTube search.

## Why this matters for Pulsify

YouTube search is the most underrated sourcing channel for Pulsify's outreach. Every coach who has posted 10+ videos with dollar figures, timelines, and mechanism-specific titles has already demonstrated:
- They believe in content as a distribution channel
- They have an offer (or the bones of one)
- They are not yet getting the result their content promises

That gap is the sales conversation. These are not cold leads. They are warm by the time Pulsify finds them.

## Lead qualification criteria (apply before DM)

A channel qualifies as a Pulsify prospect if it hits at least 4 of the following 7 signals:

1. Subscriber count between 500 and 75,000 — below this, no social proof. Above this, wrong pricing tier or already has infrastructure.
2. Dollar figures in video titles — proves they are selling, not just creating.
3. Consistent posting cadence — at least 1 video per month over 3+ months.
4. Single-niche focus — not a lifestyle channel, a coaching channel.
5. Link in bio or pinned comment pointing to a booking or VSL page.
6. Videos under 50K views on average — high view counts mean they are growing fine on their own or already signed elsewhere.
7. No agency watermark or obvious white-label production — they are doing it themselves.

---

## Use COMMON terminology — the language creators actually title with

The #1 reason a scrape returns dog-water leads: querying offer jargon (`course`, `mentorship`) or over-specified phrase combos (`"dropshipping" "made $"`) instead of **the words creators actually put in their video titles**. A trader does not title a video "trading course" — they title it `making 10k a month trading`, `passing my funded challenge`, `how I'd start trading from zero`, `how to read trend lines`. Match that real language; let the scorer ([[tools/score_leads.py]]) filter for coach signals (offer in bio, dollar figures, students).

### Target the IMMERSED practitioner's PAIN — not the money-curious beginner

We do NOT want the "how to make money online / passive income" crowd — that's the money-curious beginner who isn't committed to anything. We want the person **already in the niche, searching to fix what's broken** in their trading/store/listing. They search their STRUGGLE, and the coaches we want have built their entire library answering exactly those struggles. So **pain queries lead.** Pain also self-filters for buyers: someone frustrated enough to search "why I keep losing money trading" is far closer to paying than someone watching "investing for beginners."

### The buckets, in priority order (repeat across every niche)

| Priority | Bucket | Trading | FBA | Dropship/ecom | TikTok shop |
|---|--------|---------|-----|---------------|-------------|
| **1 — PAIN** | the struggle they're solving | revenge trading · why you keep losing · can't pass the challenge · no consistency | product won't sell · ppc not converting · won't rank · margins too low | store not selling · ads not converting · can't find a winning product | views but no sales · no orders · can't get affiliates |
| 2 — Achievement/milestone | the win | passing a funded account · making 10k a month | making 10k a month fba | making 10k a month | tiktok shop commission |
| 3 — Craft/strategy | core skill / their system | how to read trend lines · my day trading strategy | product research · my fba strategy | how to find winning products · my dropshipping strategy | affiliate strategy |
| 4 — Offer-intent | branding catch | forex mentorship | amazon fba mentorship | dropshipping mentorship | tiktok shop course |

Pain leads, the rest backs it up. Breadth in real struggle-language finds the channels; the scorer ranks the best of them. Mirrored 1:1 in `tools/scrape_yt_leads.py`.

---

## Query bank by niche

Every query below is designed for YouTube's search bar and the YouTube Data API `q` parameter. They are written to surface coaches, not entertainers. Dollar figures and mechanism words are deliberate — they filter out noise.

---

### Trading

**Queries (pain-first, by bucket)**
- *PAIN — psychology:* `trading psychology` · `how to stop revenge trading` · `how to stop overtrading` · `trading discipline`
- *PAIN — consistency/losing:* `how to be a consistent trader` · `why you keep losing money trading` · `why 90% of traders fail`
- *PAIN — edge/execution:* `how to find your trading edge` · `taking profit too early trading`
- *PAIN — faked out:* `stop loss hunting explained` · `smart money concepts trading`
- *PAIN — prop firm:* `how to pass a prop firm challenge` · `why i keep failing prop firm challenge`
- *milestone/craft/strategy:* `making 10k a month trading` · `how to read trend lines` · `my day trading strategy`
- *offer-intent:* `forex mentorship`

**Signal keywords to add for refinement**
`mentorship` / `coaching program` / `apply` / `funded` / `prop firm` / `signals` / `my students`

**Niche vocabulary to recognize in titles**
signals, system, live trades, funded account, prop firm, challenge, price action, scalping, swing trading, consistency

---

### Ecommerce / Dropshipping (+ TikTok Shop)

**Queries (pain-first, by bucket)**
- *PAIN — traffic/conversion:* `why my dropshipping store isnt selling` · `getting traffic but no sales shopify` · `low conversion rate shopify`
- *PAIN — ads/scaling:* `facebook ads not converting dropshipping` · `tiktok ads not profitable dropshipping` · `why my dropshipping ads not working` · `how to scale dropshipping ads` · `dropshipping ads stopped working`
- *PAIN — winning product:* `cant find a winning product` · `how to find winning products that sell` · `dropshipping product testing not working`
- *PAIN — tiktok shop:* `tiktok shop views but no sales` · `tiktok shop no orders` · `how to get affiliates tiktok shop` · `how to increase tiktok shop sales`
- *milestone/strategy:* `making 10k a month dropshipping` · `my dropshipping strategy` · `tiktok shop affiliate strategy`
- *offer-intent:* `dropshipping mentorship`

**Signal keywords**
`my store` / `ad spend` / `ROAS` / `students` / `mentorship` / `product research` / `apply now`

**Niche vocabulary**
store, ad spend, ROAS, winning product, supplier, shopify, ads, conversion rate, margins

---

### Amazon FBA

**Queries (pain-first, by bucket)**
- *PAIN — no sales/ranking:* `why my amazon product isnt selling` · `amazon product not ranking` · `how to rank amazon products`
- *PAIN — ppc:* `amazon ppc not converting` · `how to lower acos amazon`
- *PAIN — margins/competition:* `amazon fba margins too low` · `amazon fba too competitive`
- *PAIN — launch/account/reviews:* `amazon product launch failed` · `amazon listing suppressed` · `how to get reviews on amazon fba`
- *milestone/craft/strategy:* `making 10k a month amazon fba` · `amazon fba product research` · `my amazon fba strategy`
- *offer-intent:* `amazon fba mentorship`

**Signal keywords**
`my students` / `case study` / `coaching` / `private label` / `BSR` / `sourcing` / `PPC`

**Niche vocabulary**
listing, PPC, BSR, private label, sourcing, supplier, rank, launch, review velocity

---

### Airbnb / Short-Term Rental

**Primary queries**
- `how i make $X per month airbnb`
- `my airbnb business made $X` — Formula A
- `watch me set up an airbnb from scratch`
- `exposing my short term rental income`
- `airbnb hosting system $X` — Formula E
- `how i get $X per night on airbnb`
- `don't start airbnb without this`
- `short term rental $X occupancy system`
- `STR coaching results $X`

**Signal keywords**
`bookings` / `occupancy` / `per night` / `listing` / `case study` / `coaching` / `students`

**Niche vocabulary**
bookings, occupancy, per night, listing, STR, Airbnb arbitrage, co-hosting, pricing strategy

---

### TikTok Shop / Creator Commerce

> Note: in the scraper, TikTok Shop queries live inside the `ecom` niche list (see the Ecommerce / Dropshipping section above). Kept here for vocabulary reference.

**Queries (pain-first, by bucket)**
- *PAIN:* `tiktok shop views but no sales` · `tiktok shop no orders` · `how to get affiliates tiktok shop` · `how to increase tiktok shop sales`
- *milestone:* `making money on tiktok shop` · `tiktok shop commission`
- *strategy:* `tiktok shop affiliate strategy`
- *offer-intent:* `tiktok shop course`

**Signal keywords**
`commission` / `affiliate` / `views to sales` / `creator marketplace` / `students` / `coaching`

**Niche vocabulary**
commission, affiliate, views to sales, creator marketplace, product seeding, ugc, live shopping

---

### General biz-op / "Make money online"

These queries surface coaches who have not yet micro-niched — still valid leads, potentially easier to sign because their content is not yet working as hard as it could.

**Primary queries**
- `how i made $X online coaching`
- `my online coaching business $X per month`
- `online coaching mentorship results`
- `how to sell high ticket coaching $X`
- `i made $X from my coaching program`
- `exposing my coaching funnel step by step`
- `watch me close a $X coaching sale`
- `online coach $X case study`

**Signal keywords**
`application` / `book a call` / `DM me` / `link in bio` / `VSL` / `enrollment open`

---

## How to read the channel before outreach

Before the DM goes out, pull up the channel and check these four things:

**Titles** — Are they using dollar figures and timeframes? Yes = they are selling. No = content creator, not a coach.

**Description / links** — Is there a Calendly, typeform, Stan Store, or Linktree link? Yes = active offer. No = either they hide the funnel in comments or they do not have one yet (both can still be leads).

**Comments** — Scroll the last 3 videos. Are there comments asking "how do I work with you" or "link?" Yes = organic demand they are probably under-converting.

**Upload frequency** — Consistent monthly posting over 6+ months = they are committed to the channel. Irregular posting = either testing or stalling, still worth contacting but lower priority.

---

## Query combinations for Claude Code (API format)

The script leads with PAIN-point queries, then milestone/craft/strategy, then a catch-all offer-intent term. This mirrors the grouped lists in `tools/scrape_yt_leads.py` (truncated here — see the file for the full set):

```python
QUERIES = {
    "trading": [
        # PAIN
        "trading psychology", "how to stop revenge trading", "trading discipline",
        "how to be a consistent trader", "why you keep losing money trading",
        "how to find your trading edge", "stop loss hunting explained",
        "how to pass a prop firm challenge", "why i keep failing prop firm challenge",
        # milestone / craft / strategy / offer-intent
        "making 10k a month trading", "how to read trend lines",
        "my day trading strategy", "forex mentorship",
    ],
    "fba": [
        # PAIN
        "why my amazon product isnt selling", "amazon product not ranking",
        "amazon ppc not converting", "how to lower acos amazon",
        "amazon fba margins too low", "amazon product launch failed",
        "how to get reviews on amazon fba",
        # milestone / craft / strategy / offer-intent
        "making 10k a month amazon fba", "amazon fba product research",
        "my amazon fba strategy", "amazon fba mentorship",
    ],
    "ecom": [   # dropshipping + tiktok shop
        # PAIN
        "why my dropshipping store isnt selling", "getting traffic but no sales shopify",
        "facebook ads not converting dropshipping", "why my dropshipping ads not working",
        "cant find a winning product", "dropshipping product testing not working",
        "tiktok shop views but no sales", "tiktok shop no orders",
        "how to get affiliates tiktok shop",
        # milestone / strategy / offer-intent
        "making 10k a month dropshipping", "my dropshipping strategy",
        "tiktok shop affiliate strategy", "dropshipping mentorship",
    ],
}
# Pain leads. Breadth in real struggle-language finds channels;
# score_leads.py filters for coach signals and ranks the best.
```

---

## Connections

- [[playbooks/lead-sourcing-outreach]] — the outreach SOP that follows this sourcing step
- [[people/marcus-avatar]] — the ICP these queries are hunting for
- [[concepts/micro-niche-youtube]] — why small channels with dollar figures are the right target
- [[concepts/trust-recession]] — why these coaches need Pulsify's approach specifically

## Open questions / gaps

- No data yet on which niche returns the highest signal-to-noise ratio via YouTube search. Trading appears to be the densest based on channel landscape, but this needs 2–3 weeks of sourcing data to confirm.
- Query performance will degrade over time as the niche saturates with noise content. Refresh this page every 90 days or after 500 contacts.

## Source trail

- Lead Sourcing & Outreach SOP — defines the ICP and qualifying criteria Pulsify uses
- Grant Garcia AI Outreach Framework — informed the "build before you DM" logic that this sourcing feeds into
- Titles + Thumbnails Generator skill — source of all 5 title formulas translated into niche-specific queries
