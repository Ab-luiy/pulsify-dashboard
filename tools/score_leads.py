#!/usr/bin/env python3
"""
score_leads.py — turn yt_leads.json into a tiered, workable outreach CRM.

Scores every scraped YouTube lead on the dimensions that actually decide whether
a Pulsify cold-outreach touch is worth sending TODAY:

  reachability (real IG > email/site > none)  x  subs sweet-spot
  x  monetization signal  x  niche  x  recency

NOTE on data quality: the scraped `ig` field is dirty — ~half the values are
contact emails (@gmail.com) or domains, not Instagram handles. This script
cleans them: a real handle scores top reachability; an email/website still
counts (reachable, just not the preferred IG-DM channel); junk is dropped.

Outputs outreach/lead-crm.md:
  - "Today's 10" — best leads with a REAL IG handle, each pre-staged with a
    provisional wound, the asset to build, and a drafted Format-A DM opener
  - "Find the contact" — high-fit leads with no usable handle (2-min lookup)
  - Full tiered, ranked pipeline table (the missing tracker)

Run: python tools/score_leads.py   (uses -X utf8 internally for console safety)
Grounded in wiki/playbooks/pulse-system-outreach.md (the active outreach SOP).
"""
import json, datetime, re, sys
from pathlib import Path

# console-safe on Windows cp1252
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "yt_leads.json"
META = ROOT / "yt_leads_meta.json"
OUT = ROOT / "outreach" / "lead-crm.md"

leads = json.loads(SRC.read_text(encoding="utf-8"))
try:
    scrape_date = datetime.date.fromisoformat(json.loads(META.read_text(encoding="utf-8"))["scrapedAt"])
except Exception:
    scrape_date = datetime.date.today()

# ---------- clean the dirty ig field ----------
EMAIL_PROVIDERS = {"gmail.com", "icloud.com", "yahoo.com", "hotmail.com", "outlook.com",
                   "proton.me", "protonmail.com", "aol.com", "gmx.com", "mail.com",
                   "live.com", "me.com", "ymail.com"}
TLDS = (".com", ".net", ".org", ".io", ".co", ".me", ".info", ".biz", ".shop",
        ".store", ".gg", ".trading", ".fx", ".us", ".uk", ".ca", ".in", ".de")

def classify_contact(raw):
    """Return (ig_handle|None, email_or_site|None)."""
    s = (raw or "").strip().lstrip("@")
    if not s:
        return None, None
    low = s.lower()
    if low in EMAIL_PROVIDERS or "@" in low:
        return None, s            # an email address fragment
    if low.endswith(TLDS):
        return None, s            # a domain / website
    # plausible IG handle: letters, numbers, _ and . only, <=30 chars
    if re.fullmatch(r"[A-Za-z0-9_.]{1,30}", s):
        return s, None
    return None, None

# ---------- niche classification ----------
def niche_of(sq):
    s = sq.lower()
    if any(k in s for k in ["trading", "prop firm", "day trading", "forex", "funded"]):
        return ("trading", 10)
    if any(k in s for k in ["dropship", "ecommerce", "ecom"]):
        return ("ecom", 9)
    if "tiktok shop" in s:
        return ("tiktok shop", 8)
    if "amazon fba" in s or "fba" in s:
        return ("fba", 8)
    if "online business" in s:
        return ("operator", 7)
    return ("other", 5)

# ---------- monetization signal ----------
STRONG = ["case study", "students", "student", "mentorship", "program", "course",
          "funded", "payout", "my exact", "exact strategy", "exact method",
          "step by step", "results", "copy me", "passed", "client", "launch", "challenge"]
MEDIUM = ["i made", "my first", "0 to 10k", "per day", "here's how", "heres how",
          "easiest way", "i tried", "my strategy", "30 days", "first month", "no experience"]

def monetization_score(text):
    t = text.lower()
    if any(k in t for k in STRONG):
        return 25, "strong"
    if any(k in t for k in MEDIUM):
        return 16, "medium"
    return 8, "weak"

def subs_score(s):
    if s < 2000:  return 8
    if s < 5000:  return 16
    if s < 10000: return 22
    if s < 25000: return 30
    if s < 50000: return 27
    return 20

def recency_score(pd):
    try:
        days = (scrape_date - datetime.date.fromisoformat(pd)).days
    except Exception:
        return 1, "?"
    if days <= 30: return 5, f"{days}d"
    if days <= 60: return 3, f"{days}d"
    return 1, f"{days}d"

# ---------- provisional wound + asset (five-wound diagnostic) ----------
WOUND_ASSET = {
    "backend":     ("Backend stall (confirm)",    "Rebuilt landing page + 6-email pre-call sequence"),
    "sales-infra": ("Sales-infra stall (confirm)","Optimized Typeform + pre-call asset page (45s objection vids)"),
    "content":     ("Content stall (confirm)",    "5-video pillar map + 3 packaged title/thumb pairs"),
    "lead-flow":   ("Lead-flow stall (confirm)",  "Rebuilt IG bio + 7-day story sequence + ManyChat flow"),
}
def wound_for(sig, subs):
    if sig == "strong":
        return "backend"
    if sig == "medium":
        return "sales-infra" if subs >= 5000 else "lead-flow"
    return "content"

NICHE_WORD = {"trading": "trading", "ecom": "ecom", "tiktok shop": "TikTok Shop",
              "fba": "Amazon FBA", "operator": "online business", "other": "your"}

_BRANDISH = {"the", "official", "trading", "trader", "ecom", "ecommerce", "fx", "live",
             "tv", "channel", "academy", "capital", "markets", "fund", "funded", "money"}
def first_name(n):
    """First clean person-name token. Strips emojis/symbols; skips brand words.
    Falls back to 'there' so the DM never opens with a brand fragment or emoji."""
    n = re.sub(r"[^A-Za-z'\- ]", " ", n or "")              # drop emojis/punctuation/digits
    for tok in n.split():
        if len(tok) >= 2 and tok.lower() not in _BRANDISH:
            return tok.capitalize()
    return "there"

def clip(t, n=70):
    t = re.sub(r"\s+", " ", t or "").strip()
    return (t[:n] + "…") if len(t) > n else t

def draft_dm(lead, wound, niche):
    fn = first_name(lead["n"]); nw = NICHE_WORD.get(niche, "your"); vid = clip(lead["vt"], 55)
    if wound == "backend":
        return (f"Yo {fn} — went through your {nw} funnel after your '{vid}' video. "
                f"The proof's there but the backend isn't catching it: no real VSL, no pre-call email sequence. "
                f"Built you a rebuilt lander + 6-email sequence around your offer. Sending now → [asset]")
    if wound == "sales-infra":
        return (f"Yo {fn} — submitted your {nw} funnel as a lead. Speed-to-lead is slow and the form's "
                f"letting unqualified people through. Rebuilt your Typeform + a 45-sec pre-call objection page → [asset]")
    if wound == "content":
        return (f"Yo {fn} — pulled your last few {nw} videos through Claude. You're posting case studies but "
                f"no concept-breakdown (TOF) content, which is why search traffic stays flat. Mapped 5 videos "
                f"for next month, packaged with titles + thumb specs → [asset]")
    return (f"Yo {fn} — went through your {nw} profile. Content gets engagement but there's no profile funnel "
            f"catching it (no story sequence, no DM trigger). Rebuilt your bio + a 7-day story arc + a ManyChat flow → [asset]")

# ---------- score everything ----------
rows = []
for x in leads:
    subs = x.get("s", 0) or 0
    niche, niche_pts = niche_of(x.get("sq", ""))
    mon_pts, mon_sig = monetization_score(f"{x.get('vt','')} {x.get('sq','')}")
    rec_pts, rec_lbl = recency_score(x.get("pd", ""))
    ig, email_site = classify_contact(x.get("ig"))
    if not email_site:
        email_site = (x.get("ol") or "").strip() or (x.get("lt") or "").strip() or None
    reach = 30 if ig else (15 if email_site else 0)
    fit = subs_score(subs) + mon_pts + niche_pts + rec_pts          # max 70
    total = fit + reach                                              # max 100
    wound = wound_for(mon_sig, subs)
    rows.append({"n": x.get("n", ""), "ig": ig, "email_site": email_site, "cu": x.get("cu", ""),
                 "niche": niche, "subs": subs, "mon": mon_sig, "rec": rec_lbl,
                 "vt": x.get("vt", ""), "vu": x.get("vu", ""),
                 "fit": fit, "reach": reach, "total": total, "wound": wound})

rows.sort(key=lambda r: (r["total"], r["fit"]), reverse=True)
def tier(t): return "A" if t >= 68 else ("B" if t >= 50 else "C")
def igcell(r): return f"[@{r['ig']}](https://instagram.com/{r['ig']})" if r["ig"] else "—"
def k(n): return f"{n/1000:.1f}k" if n >= 1000 else str(n)

reachable_ig = [r for r in rows if r["ig"]]
today10 = reachable_ig[:10]
find_contact = [r for r in rows if not r["ig"] and not r["email_site"]][:12]

# ---------- write CRM ----------
L = []
L.append("# Lead CRM — scored outreach pipeline")
L.append("")
L.append(f"_Generated by `tools/score_leads.py` from `yt_leads.json` ({len(rows)} leads, scraped {scrape_date}). "
         "Re-run after each scrape. Scoring: reachability × subs sweet-spot × monetization signal × niche × recency._")
L.append("")
L.append(f"**{len(reachable_ig)} have a usable IG handle (DM today). "
         f"{sum(1 for r in rows if r['email_site'] and not r['ig'])} have only email/website. "
         f"{len(find_contact)}+ need a contact lookup.** "
         "Data note: the scrape mislabeled many emails as IG — those are cleaned out here. "
         "Work Tier A top-down. Asset-first: diagnose the wound (15-min protocol), build ONE asset, then send the drafted DM.")
L.append("")

L.append("## Today's 10 — real IG handle, highest score, ready to work")
L.append("")
L.append("Each is pre-staged with a PROVISIONAL wound (confirm in the 15-min research protocol) and a drafted "
         "Format-A opener. The opener ships only after the asset is built and linked. Verify the handle resolves before sending.")
L.append("")
for i, r in enumerate(today10, 1):
    wlabel, asset = WOUND_ASSET[r["wound"]]
    L.append(f"### {i}. {r['n']} — {igcell(r)}  ·  {r['niche']}  ·  {k(r['subs'])} subs  ·  score {r['total']}")
    L.append(f"- **Video referenced:** [{clip(r['vt'])}]({r['vu']})")
    L.append(f"- **Provisional wound:** {wlabel}  →  **build:** {asset}")
    L.append(f"- **DM (Format A):** {draft_dm(r, r['wound'], r['niche'])}")
    L.append("")

L.append("## Find the contact — high fit, no usable handle (2-min lookup each)")
L.append("")
L.append("| # | name | niche | subs | fit | channel | video |")
L.append("|---|---|---|---|---|---|---|")
for i, r in enumerate(find_contact, 1):
    L.append(f"| {i} | {r['n']} | {r['niche']} | {k(r['subs'])} | {r['fit']} | [yt]({r['cu']}) | {clip(r['vt'],45)} |")
L.append("")

L.append("## Full ranked pipeline")
L.append("")
L.append("| # | tier | score | name | IG | other contact | niche | subs | signal | recency | wound (prov.) | video |")
L.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
for i, r in enumerate(rows, 1):
    other = (r["email_site"] or "—")
    L.append(f"| {i} | {tier(r['total'])} | {r['total']} | {r['n']} | {igcell(r)} | {other} | {r['niche']} | "
             f"{k(r['subs'])} | {r['mon']} | {r['rec']} | {WOUND_ASSET[r['wound']][0].replace(' (confirm)','')} | "
             f"[{clip(r['vt'],40)}]({r['vu']}) |")
L.append("")
OUT.write_text("\n".join(L), encoding="utf-8")

# ---------- console summary (ascii-safe) ----------
ca = sum(1 for r in rows if tier(r["total"]) == "A")
cb = sum(1 for r in rows if tier(r["total"]) == "B")
cc = sum(1 for r in rows if tier(r["total"]) == "C")
print(f"Wrote {OUT.relative_to(ROOT)}")
print(f"Tiers: A={ca}  B={cb}  C={cc} | real-IG={len(reachable_ig)} | email/site-only="
      f"{sum(1 for r in rows if r['email_site'] and not r['ig'])}")
print("Today's 10 (real IG):")
for i, r in enumerate(today10, 1):
    nm = r["n"].encode("ascii", "replace").decode()
    print(f"  {i:2}. @{r['ig']:<22} {nm[:22]:22} {r['niche'][:8]:8} {k(r['subs']):>6} sc{r['total']} {r['mon']}")
