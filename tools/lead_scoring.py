#!/usr/bin/env python3
"""
lead_scoring.py — single source of truth for scoring/cleaning scraped YT leads.

Used by inject_yt_leads.py to enrich the lead data baked into the dashboard so the
CRM shows real tiers + clean handles instead of raw subscriber counts and
mislabeled email domains. Mirrors the logic in the outreach scorer
(outreach/lead-crm.md generator) so the dashboard and the markdown CRM agree.

enrich_leads(leads, scrape_date) returns the same list with these fields added
per lead (raw scrape fields left intact):
    ig        cleaned IG handle ("" if the scraped value was an email/domain)
    email     the email/website fragment, if that's what `ig` actually held
    niche     trading | ecom | tiktok shop | fba | operator | other
    score     0-100 actionability score
    tier      A | B | C
    wound     provisional five-wound diagnosis (confirm in research)
"""
import datetime
import re

EMAIL_PROVIDERS = {"gmail.com", "icloud.com", "yahoo.com", "hotmail.com", "outlook.com",
                   "proton.me", "protonmail.com", "aol.com", "gmx.com", "mail.com",
                   "live.com", "me.com", "ymail.com"}
TLDS = (".com", ".net", ".org", ".io", ".co", ".me", ".info", ".biz", ".shop",
        ".store", ".gg", ".trading", ".fx", ".us", ".uk", ".ca", ".in", ".de")

STRONG = ["case study", "students", "student", "mentorship", "program", "course",
          "funded", "payout", "my exact", "exact strategy", "exact method",
          "step by step", "results", "copy me", "passed", "client", "launch", "challenge"]
MEDIUM = ["i made", "my first", "0 to 10k", "per day", "here's how", "heres how",
          "easiest way", "i tried", "my strategy", "30 days", "first month", "no experience"]


def clean_contact(raw):
    """Return (ig_handle|"", email_or_site|"")."""
    s = (raw or "").strip().lstrip("@")
    if not s:
        return "", ""
    low = s.lower()
    if low in EMAIL_PROVIDERS or "@" in low:
        return "", s
    if low.endswith(TLDS):
        return "", s
    if re.fullmatch(r"[A-Za-z0-9_.]{1,30}", s):
        return s, ""
    return "", ""


def niche_of(sq):
    s = (sq or "").lower()
    if any(k in s for k in ("trading", "prop firm", "day trading", "forex", "funded")):
        return "trading", 10
    if any(k in s for k in ("dropship", "ecommerce", "ecom")):
        return "ecom", 9
    if "tiktok shop" in s:
        return "tiktok shop", 8
    if "amazon fba" in s or "fba" in s:
        return "fba", 8
    if "online business" in s:
        return "operator", 7
    return "other", 5


def _monetization(text):
    t = (text or "").lower()
    if any(k in t for k in STRONG):
        return 25, "strong"
    if any(k in t for k in MEDIUM):
        return 16, "medium"
    return 8, "weak"


def _subs_score(s):
    if s < 2000:  return 8
    if s < 5000:  return 16
    if s < 10000: return 22
    if s < 25000: return 30
    if s < 50000: return 27
    return 20


def _recency(pd, scrape_date):
    try:
        days = (scrape_date - datetime.date.fromisoformat(pd)).days
    except Exception:
        return 1
    if days <= 30: return 5
    if days <= 60: return 3
    return 1


def _wound(sig, subs):
    if sig == "strong":
        return "backend"
    if sig == "medium":
        return "sales-infra" if subs >= 5000 else "lead-flow"
    return "content"


def _tier(total):
    return "A" if total >= 68 else ("B" if total >= 50 else "C")


def enrich_leads(leads, scrape_date=None):
    if scrape_date is None:
        scrape_date = datetime.date.today()
    elif isinstance(scrape_date, str):
        try:
            scrape_date = datetime.date.fromisoformat(scrape_date)
        except Exception:
            scrape_date = datetime.date.today()

    for x in leads:
        subs = x.get("s", 0) or 0
        ig, email = clean_contact(x.get("ig"))
        niche, niche_pts = niche_of(x.get("sq", ""))
        mon_pts, mon_sig = _monetization(f"{x.get('vt','')} {x.get('sq','')}")
        rec_pts = _recency(x.get("pd", ""), scrape_date)
        reach = 30 if ig else (15 if email else 0)
        total = _subs_score(subs) + mon_pts + niche_pts + rec_pts + reach
        x["ig"] = ig
        x["email"] = email
        x["niche"] = niche
        x["score"] = total
        x["tier"] = _tier(total)
        x["wound"] = _wound(mon_sig, subs)
    return leads
