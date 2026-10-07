"""Build a local, source-linked reader for the inspected story archive.

Does not modify, crop, recolor or copy the source images. Re-run after editing
observations.json. The SHA-256 manifest describes source bytes, not verification
of the business claims depicted in them.
"""
from pathlib import Path
import hashlib
import html
import json
import re
import struct
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SOURCE = ROOT / "raw-sources/inspiration/story-sequences"
REPORT = ROOT / "wiki/synthesis/story-reference-forensic-audit-2026-10-08.md"
GROUPS = [
    ("B", "Brez", "brez-scales story sequence", 8),
    ("N2-", "Niksetting: sequence 2", "niksetting/story-sequence-2", 5),
    ("N3-", "Niksetting: sequence 3", "niksetting/story-sequence-3", 10),
    ("NA", "Niksetting: another sequence", "niksetting/another-story-sequence", 4),
    ("NH", "Niksetting: new here", "niksetting/new-here", 18),
    ("S", "Siggyfoss", "siggyfoss", 8),
    ("K", "Kobey Nguyen on Shelby Sapp", "shelby-sapp", 4),
]

def dimensions(path):
    data = path.read_bytes()
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":
        pos = 2
        while pos < len(data):
            if data[pos] != 0xFF:
                pos += 1
                continue
            while data[pos] == 0xFF:
                pos += 1
            marker = data[pos]
            pos += 1
            if marker in [0xD8, 0xD9] or 0xD0 <= marker <= 0xD7:
                continue
            size = int.from_bytes(data[pos:pos+2], "big")
            if marker in [0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF]:
                height, width = struct.unpack(">HH", data[pos+3:pos+7])
                return width, height
            pos += size
    raise ValueError(f"Unsupported or invalid image: {path}")

observations = json.loads((HERE / "observations.json").read_text(encoding="utf-8"))
by_id = {entry["id"]: entry for entry in observations}
assert len(by_id) == len(observations) == 57
entries, sections, ledger = [], [], []
for prefix, title, directory, count in GROUPS:
    files = sorted((SOURCE / directory).iterdir(), key=lambda p: int(re.match(r"\d+", p.name).group()))
    files = [p for p in files if p.suffix.lower() in (".jpg", ".jpeg", ".png")]
    assert len(files) == count, (directory, len(files))
    cards = []
    ledger += [f"### {title}", "", "| ID / original | Visible construction | Narrative role and transition | Transfer / limitation |", "|---|---|---|---|"]
    for i, path in enumerate(files, 1):
        ident = f"{prefix}{i}"
        entry = dict(by_id[ident])
        relative = path.relative_to(ROOT).as_posix()
        width, height = dimensions(path)
        entry.update(sequence=title, source=relative, width=width, height=height,
                     sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                     inspected="2026-10-08: individual source image opened and visually reviewed")
        entries.append(entry)
        url = "../../" + quote(relative, safe="/")
        esc = html.escape
        cards.append(f'''<article id="{ident}" data-group="{esc(title)}">
<a class="image" href="{url}" target="_blank" rel="noopener" title="Open original at full size"><img src="{url}" loading="lazy" alt="{ident}: {esc(title)} original story capture" width="{width}" height="{height}"></a>
<div class="notes"><p class="eyebrow">{esc(title)} / {ident}</p>
<h3>What is visible</h3><p>{esc(entry['visual'])}</p>
<h3>Story and transition</h3><p>{esc(entry['story'])}</p>
<h3>What to take from it</h3><p>{esc(entry['lesson'])}</p>
<a href="{url}" target="_blank" rel="noopener">Open original · {width} × {height}</a>
<p class="path">{esc(relative)}</p></div></article>''')
        ledger.append(f"| [{ident}](<{url}>) | {entry['visual']} | {entry['story']} | {entry['lesson']} |")
    ledger.append("")
    sections.append("\n".join(cards))

all_sources = {p.relative_to(ROOT).as_posix() for p in SOURCE.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg")}
assert all_sources == {e["source"] for e in entries}, "Source coverage mismatch"
(HERE / "manifest.json").write_text(json.dumps({"review_date":"2026-10-08", "source_count":57,
    "scope":"All images under raw-sources/inspiration/story-sequences; screenshot claims not independently verified",
    "entries":entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
report = REPORT.read_text(encoding="utf-8").split("<!-- SLIDE_LEDGER -->")[0]
REPORT.write_text(report + "<!-- SLIDE_LEDGER -->\n\n" + "\n".join(ledger) + "\n", encoding="utf-8")
options = ''.join(f'<option>{html.escape(title)}</option>' for _, title, _, _ in GROUPS)
page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pulsify · 57 story reference audit</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101113;color:#f1f1ee;font:17px/1.6 Arial,Helvetica,sans-serif}
header,main{max-width:1280px;margin:auto;padding:36px 32px}header{padding-bottom:22px}h1{font-size:clamp(32px,5vw,58px);line-height:1.07;letter-spacing:-.04em;margin:15px 0 24px;max-width:900px}
header p{max-width:860px;color:#c2c3c5}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#bba59e}
a{color:#e6c1af;text-underline-offset:4px}nav{display:flex;gap:20px;flex-wrap:wrap}label{display:flex;flex-direction:column;font-size:13px;gap:5px}select,input{background:#242529;border:1px solid #66686d;color:#fff;border-radius:6px;padding:11px 12px;font:16px Arial;min-height:44px}input{width:min(330px,80vw)}
.filters{display:flex;gap:16px;flex-wrap:wrap;margin-top:26px;align-items:end}#count{color:#b7b7bc;font-size:14px;margin:0 0 10px}article{display:grid;grid-template-columns:minmax(250px,420px) minmax(280px,1fr);gap:40px;padding:32px 0 48px;border-top:1px solid #3b3d42;scroll-margin-top:20px}article[hidden]{display:none}
.image{display:block;align-self:start;background:#080809;border-radius:12px;overflow:hidden}.image img{display:block;width:100%;height:auto}.notes{padding:10px 0;max-width:670px}.notes h3{font-size:18px;margin:25px 0 8px;letter-spacing:-.01em}.notes p{margin:0 0 14px}.notes .eyebrow{margin-bottom:30px}.path{overflow-wrap:anywhere;font-size:12px;color:#999ca3;margin-top:16px!important}
footer{border-top:1px solid #3b3d42;padding:30px 32px;color:#aaa;text-align:center;font-size:14px}@media(max-width:730px){header,main{padding:24px 18px}article{grid-template-columns:1fr;gap:10px}.image{width:min(100%,420px);margin:auto}.notes{max-width:none}h1{font-size:38px}}
</style></head><body><header><p class="eyebrow">Pulsify reference study · 8 October 2026</p><h1>57 slides.<br>Every visual choice has a job.</h1>
<p>All seven stored sequences, individually examined. Each original sits beside observations on composition, copy, the next-slide transition and the useful lesson. Click any image for the untouched source at full size.</p>
<p>Business outcomes shown are the creators' claims. These screenshots do not supply conversion results, exact source fonts, layer files or animation timing.</p>
<nav><a href="../../wiki/synthesis/story-reference-forensic-audit-2026-10-08.md">Full analysis and Pulsify standard</a><a href="manifest.json">Complete source manifest</a></nav>
<div class="filters"><label>Sequence<select id="group"><option value="">All seven sequences</option>OPTIONS</select></label><label>Find a detail<input id="query" type="search" placeholder="Try profile, layering, proof, CTA"></label><p id="count" aria-live="polite">57 of 57 slides</p></div>
</header><main>CARDS</main><footer>Originals unchanged · Analysis by Codex · No artwork rebuilt or published</footer>
<script>
const cards=[...document.querySelectorAll('article')],group=document.querySelector('#group'),query=document.querySelector('#query'),count=document.querySelector('#count');
function filter(){const q=query.value.trim().toLowerCase();let n=0;for(const card of cards){const show=(!group.value||card.dataset.group===group.value)&&(!q||(card.id+' '+card.textContent).toLowerCase().includes(q));card.hidden=!show;if(show)n++}count.textContent=n+' of 57 slides'}
group.addEventListener('change',filter);query.addEventListener('input',filter);
</script></body></html>'''
page = page.replace("OPTIONS", options).replace("CARDS", "\n".join(sections))
(HERE / "atlas.html").write_text(page, encoding="utf-8")
print(json.dumps({"sources":len(entries),"sequences":len(GROUPS),"report_words":len(REPORT.read_text(encoding='utf-8').split()),"all_sources_accounted_for":True}))
