"""Build the source reader and portable profiles. Never modifies source images."""
from pathlib import Path
from urllib.parse import quote
import csv
import hashlib
import html
import json
import re
import colorsys
from collections import Counter
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROFILE = ROOT / 'wiki/content-engine/reference-replication-profile.json'
REPORT = ROOT / 'wiki/synthesis/carousel-reference-forensic-audit-2026-10-08.md'
GROUPS = [
    ('G1-', 'Viktor features', 'Good carousel design/#1', 8, 'assistant-features'),
    ('G2-', 'Viktor invitation and case tiles', 'Good carousel design/#2', 14, 'dotted-results'),
    ('G3-', 'Mixed proof close and Bram chronicle', 'Good carousel design/#3', 10, 'personal-chronicle'),
    ('K1-', 'Kobey case and system', 'carousel kobenguyen/#1', 8, 'red-case-system'),
    ('K2-', 'Kobey six lessons', 'carousel kobenguyen/#2', 9, 'cyan-lessons'),
    ('NG-', 'Niksetting onboarding', 'niksetting/grow-acquisition-onboarding', 9, 'warm-method'),
    ('NT-', 'Niksetting story taxonomy', 'niksetting/964k-story-sequences', 10, 'white-taxonomy'),
    ('NP-', 'Niksetting concept lessons', 'niksetting/7-lessons-content', 8, 'concept-words'),
]

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def build_sources():
    with (HERE / 'observations.tsv').open(encoding='utf-8', newline='') as f:
        observations = list(csv.DictReader(f, delimiter='\t'))
    by_id = {v['id']: v for v in observations}
    assert len(by_id) == len(observations) == 76
    entries, cards, ledger = [], [], ['## Slide ledger', '', 'Each file was opened individually. Construction is observation; story/transfer are bounded interpretation and production guidance.', '']
    for prefix, title, folder, count, family in GROUPS:
        files = sorted((ROOT / 'raw-sources/inspiration/carousels' / folder).iterdir(), key=lambda p: int(re.match(r'\d+', p.name).group()) if re.match(r'\d+', p.name) else 999)
        files = [p for p in files if p.suffix.lower() in ('.jpg', '.jpeg', '.png')]
        assert len(files) == count, (folder, len(files))
        ledger += [f'### {title}', '', '| ID / original | Construction | Copy and transition | Transfer / limitation |', '|---|---|---|---|']
        for i, path in enumerate(files, 1):
            ident = f'{prefix}{i}'
            entry = dict(by_id[ident])
            with Image.open(path) as source_image:
                source_image.load()
                width, height = source_image.size
            rel = path.relative_to(ROOT).as_posix()
            status = 'broken-fragment' if ident == 'NT-9' else 'full-capture'
            entry.update(group=title, family='proof-wall-close' if ident == 'G3-1' else family,
                         source=rel, width=width, height=height,
                         sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                         status=status, inspected='2026-10-08; individually opened and visually examined',
                         ordering='mixed-or-unverified' if prefix in ('G2-', 'G3-') else 'stored-order-preserved',
                         outer_chrome='desktop-instagram; artwork is left panel' if prefix in ('NG-', 'NT-', 'NP-') and status != 'broken-fragment' else 'no-outer-chrome-observed')
            entries.append(entry)
            url = '../../' + quote(rel, safe='/')
            esc = html.escape
            cards.append(f'''<article id="{ident}" data-group="{esc(title)}"><a class="source" href="{url}" target="_blank" rel="noopener"><img loading="lazy" src="{url}" width="{width}" height="{height}" alt="{ident}: {esc(entry['subject'])}"></a><div class="notes"><p class="eyebrow">{ident} · {esc(title)} · {status}</p><h2>{esc(entry['subject'])}</h2><h3>Construction</h3><p>{esc(entry['visual'])}</p><h3>Copy and continuation</h3><p>{esc(entry['story'])}</p><h3>Transfer and limits</h3><p>{esc(entry['lesson'])}</p><a href="{url}" target="_blank" rel="noopener">Full original · {width} × {height}</a><p class="path">{esc(rel)}</p></div></article>''')
            ledger.append(f"| [{ident}](<{url}>) | {entry['visual']} | {entry['story']} | {entry['lesson']} |")
        ledger.append('')
    sources = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'raw-sources/inspiration/carousels').rglob('*') if p.suffix.lower() in ('.jpg', '.jpeg', '.png')}
    assert sources == {e['source'] for e in entries}, 'Source coverage changed; examine new sources before updating.'
    write_json(HERE / 'observations.json', observations)
    write_json(HERE / 'manifest.json', {'version':'1.0.0','date':'2026-10-08','source_count':76,'full_captures':75,'broken_fragments':1,'scope':'All stored carousel image files; source claims not independently verified','entries':entries})
    REPORT.write_text(REPORT.read_text(encoding='utf-8').split('<!-- SLIDE_LEDGER -->')[0] + '<!-- SLIDE_LEDGER -->\n\n' + '\n'.join(ledger) + '\n', encoding='utf-8')
    options = ''.join(f'<option>{html.escape(title)}</option>' for _, title, *_ in GROUPS)
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Carousel reference examination · Pulsify</title><style>
    *{box-sizing:border-box}body{margin:0;background:#111214;color:#eee;font:16px/1.55 system-ui,sans-serif}header{padding:36px max(20px,5vw);border-bottom:1px solid #36383d}h1{font-size:clamp(28px,4vw,48px);line-height:1.1;margin:0 0 16px}header p{max-width:900px;color:#b8b9bf}nav{display:flex;gap:16px;flex-wrap:wrap}a{color:#b9d7ff}input,select{font:inherit;background:#23252b;color:white;border:1px solid #555;border-radius:8px;padding:10px;max-width:100%}.filters{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}main{padding:20px max(16px,4vw)}article{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);max-width:1460px;margin:24px auto 60px;border:1px solid #393b42;border-radius:12px;overflow:hidden;background:#191b20}article[hidden]{display:none}.source{display:block;background:#090a0c}.source img{display:block;width:100%;height:auto}.notes{padding:clamp(20px,3vw,40px);min-width:0}h2{font-size:28px;line-height:1.2}h3{font-size:15px;text-transform:uppercase;letter-spacing:.04em;color:#d0b8e6;margin-top:26px}.eyebrow{font-size:13px;color:#b3b4ba}.path{font:12px/1.5 monospace;color:#989ca8;overflow-wrap:anywhere}@media(max-width:780px){article{grid-template-columns:1fr}header{padding:24px 18px}main{padding:12px}.notes{padding:22px}input,select{width:100%}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
    </style><header><h1>76 carousel references.<br>Every file examined.</h1><p>75 full captures and one broken fragment. Original images stay intact. Reference copy and results are attributed source material, not verified Pulsify claims. Preserve the source craft; use the shared profile for stories and carousels.</p><nav><a href="../../wiki/synthesis/carousel-reference-forensic-audit-2026-10-08.md">Full examination</a><a href="../../wiki/content-engine/reference-replication-profile.md">Shared design profile</a><a href="manifest.json">Source manifest</a></nav><div class="filters"><label>Collection <select id="group"><option value="">All collections</option>__OPTIONS__</select></label><label>Find a design move <input id="query" type="search" placeholder="mask, funnel, profile, arithmetic…"></label><output id="count" aria-live="polite"></output></div></header><main>__CARDS__</main><script>
    const group=document.querySelector('#group'), query=document.querySelector('#query'), cards=[...document.querySelectorAll('article')], count=document.querySelector('#count');function filter(){let n=0;for(const card of cards){const keep=(!group.value||card.dataset.group===group.value)&&card.textContent.toLowerCase().includes(query.value.toLowerCase());card.hidden=!keep;if(keep)n++}count.textContent=n+' / 76 files'}group.addEventListener('change',filter);query.addEventListener('input',filter);filter();
    </script></html>'''.replace('__OPTIONS__', options).replace('__CARDS__', '\n'.join(cards))
    (HERE / 'atlas.html').write_text(page, encoding='utf-8')
    return entries

def build_profile(entries):
    by_id={e['id']:e for e in entries}
    # A reproducible raster observation, not a claim to recover original brand
    # tokens. Region candidates are filtered to the indicated accent family.
    color_specs=[(f'G1-{i}',[.02,.02,.98,.30],'headline-accent','any') for i in range(2,9)] + [
        ('K1-1',[.05,.02,.95,.23],'red-emphasis','red'),
        ('K2-3',[.08,.18,.17,.225],'cyan-ordinal','cyan'),
    ]
    color_samples=[]
    for ident,region,role,hue_family in color_specs:
        entry=by_id[ident]
        with Image.open(ROOT/entry['source']) as im:
            im=im.convert('RGB');w,h=im.size
            crop=im.crop(tuple(round(v*n) for v,n in zip(region,[w,h,w,h])))
            pixels=crop.getcolors(maxcolors=crop.width*crop.height)
            bins=Counter()
            for count,rgb in pixels:
                hue,sat,val=colorsys.rgb_to_hsv(*(v/255 for v in rgb))
                if sat<.2 or val<.55:continue
                if hue_family=='red' and not (hue<.065 or hue>.96):continue
                if hue_family=='cyan' and not (.45<hue<.65):continue
                bins[tuple(min(255,(v//8)*8+4) for v in rgb)]+=count
            top=bins.most_common(3)
        color_samples.append({'reference_id':ident,'role':role,'normalized_region_xyxy':region,
            'method':'Most frequent 8-level RGB bins, saturation >= .2 and value >= .55; optional hue filter. Compressed raster samples, not native design tokens.',
            'candidates':[{'hex':'#'+''.join(f'{v:02x}' for v in rgb),'qualifying_pixel_count':count} for rgb,count in top]})
    write_json(HERE/'color-samples.json',color_samples)
    families = [
        ('assistant-features','G1-1–8','Thin feature verbs, outputs, peach-to-violet progression',['light-sans','white-body','dark-report','violet-connectors','aligned-subject-depth'],['peach','pink','lilac','violet'],['outlined-name-behind-subject','feature-three-artifacts','paired-work-states']),
        ('dotted-results','G2-2–14','Case identity, result and bounded timeframe',['dot-matrix-display','italic-serif-identity','glass-metric-pill','rear-type'],['white','environmental-tint'],['dotted-case-result']),
        ('proof-wall-close','G3-1; NG-1; NP-2','A real archive supports a readable argument',['source-thumbnail-grid','speaker-foreground','count-or-thesis'],['white','photo-neutral'],['proof-wall-speaker']),
        ('personal-chronicle','G3-2–10','Sourced personal chapters and diagnostic resolution',['white-sans','selective-bold','blue-underline','small-handle','top-bottom-copy'],['white','blue','photo-neutral'],['personal-top-bottom']),
        ('red-case-system','K1-1–8','Outcome, diagnosis, staged system reveal, evidence',['red-headline-block','white-bold','bracket-ordinal','actual-proof','white-routes','cyan-cta'],['white','red','cyan','platform-colors'],['red-case-proof','three-platform-funnels','hybrid-route-map']),
        ('cyan-lessons','K2-1–9','Result bridge, finite lessons, bounded asset',['cyan-word','glowing-bracket','gray-handle','white-copy','scene-sensitive-alignment'],['white','cyan','gray'],['cyan-lesson']),
        ('warm-method','NG-1–9','Diagnosis through seven visible work stages',['pale-serif-ordinal','white-title','vertical-rule','rear-wall-artifact','foreground-people'],['white','warm-gray','photo-amber'],['warm-method-wall']),
        ('white-taxonomy','NT-2–8','Definition, informational chips and actual format examples',['black-sans','pale-serif-ordinal','white-canvas','phone-collage','axis-chips'],['black','white','pale-gray','purple','gray','mint'],['white-phone-taxonomy']),
        ('concept-words','NP-1–8','One concept and its useful belief change',['giant-shadowed-word','photo-responsive-black-or-white-body','work-scene','optional-archive'],['black','white','photo-neutral'],['concept-word-scene']),
    ]
    recipes = [
        ('outlined-name-behind-subject',['G1-1','G2-1'],{'rear_display':[.04,.2,.92,.28],'body':[.06,.44,.4,.27],'icon':[.76,.48,.15,.12]},'base > rear outlined/filled type > subject restore > tasks/CTA','The subject hides redundant letter areas; complete name remains recognizable.'),
        ('feature-three-artifacts',['G1-2','G1-3','G1-5','G1-8'],{'headline':[.05,.05,.9,.1],'body':[.06,.16,.88,.12],'artifact_a':[.06,.31,.38,.17],'artifact_b':[.56,.45,.38,.17],'artifact_c':[.07,.68,.4,.17]},'base > report crops/routes > subject restore > essential copy','Reposition all artifacts to the actual subject; connectors describe real work relationships.'),
        ('paired-work-states',['G1-4','G1-6'],{'headline':[.05,.06,.9,.1],'body':[.07,.17,.86,.14],'state_a':[.07,.34,.41,.23],'state_b':[.52,.34,.41,.23]},'base > labeled pair > subject restore if needed > essential labels','Labels distinguish different states or artifact types; use actual records.'),
        ('dotted-case-result',[e['id'] for e in entries if e['id'].startswith('G2-') and e['id']!='G2-1'],{'display':[.02,.07,.96,.27],'identity':[.05,.27,.9,.22],'endpoint':[.08,.71,.55,.075],'duration':[.66,.71,.26,.075]},'base > dotted display > subject restore > serif identity and glass qualifiers','Check finite nonzero denominator; keep metric, unit and timeframe visible.'),
        ('proof-wall-speaker',['G3-1','NG-1','NP-2'],{'archive':[.03,.22,.63,.62],'argument':[.66,.14,.29,.57]},'base > wall-plane actual thumbnail assets > people/furniture restore > argument','Wall shape varies by anchor; count only actual registered items.'),
        ('personal-top-bottom',[f'G3-{i}' for i in range(2,11)],{'upper_copy':[.09,.1,.82,.23],'lower_copy':[.09,.64,.82,.24],'handle':[.07,.92,.22,.03]},'base > local approved contrast > prose and underlines','The central scene remains visible; history and causal claims stay source-bounded.'),
        ('red-case-proof',['K1-1','K1-2','K1-8'],{'headline':[.06,.06,.88,.17],'proof_a':[.05,.3,.42,.37],'proof_b':[.53,.3,.42,.37],'cta':[.1,.78,.8,.12]},'base > rear proof where chosen > subject restore > optional front proof > CTA','Front-proof close and rear-proof cover are deliberate variants, not interchangeable defaults.'),
        ('three-platform-funnels',['K1-4'],{'header':[.05,.05,.9,.13],'column_a':[.06,.25,.27,.58],'column_b':[.365,.25,.27,.58],'column_c':[.67,.25,.27,.58]},'base > subdued prior context > vector branches/apps/funnel bands > labels','All stages are conceptual unless true counts/data are supplied.'),
        ('hybrid-route-map',['K1-6'],{'heading':[.05,.06,.9,.14],'graph':[.07,.25,.86,.49],'cta':[.08,.8,.84,.12]},'base > glass nodes and routed edges > subject restore > essential node labels and CTA','Do not inherit unreadable/hidden source middle-node labels; retain declared topology.'),
        ('cyan-lesson',[f'K2-{i}' for i in range(3,9)],{'ordinal':[.05,.04,.18,.09],'heading':[.07,.15,.84,.12],'body':[.08,.29,.66,.48]},'base > approved local contrast > ordinal/title/body','Change copy width and side to actual photo; no mandatory proof card.'),
        ('warm-method-wall',[f'NG-{i}' for i in range(2,9)],{'ordinal':[.07,.1,.17,.17],'heading':[.19,.12,.74,.1],'body':[.21,.23,.7,.17],'artifact':[.1,.43,.8,.35]},'base > rear wall artifact > people/furniture restore > title/rule/body','Source art is the left panel of desktop captures; calibrate after excluding outer UI.'),
        ('white-phone-taxonomy',[f'NT-{i}' for i in range(2,9)],{'ordinal':[.3,.06,.32,.25],'heading':[.1,.14,.8,.13],'definition':[.1,.28,.8,.12],'phones':[.02,.47,.96,.53]},'white canvas > pale ordinal > actual phone/screenshot assets > title/definition/chips','Top/bottom/central/staggered variants match the chosen source; do not reduce all to two cards.'),
        ('concept-word-scene',[f'NP-{i}' for i in range(2,9)],{'concept':[.04,.05,.92,.18],'body_upper':[.06,.27,.88,.23],'body_lower':[.06,.72,.88,.2]},'base > optional rear archive/type > subject restore > readable explanation','Select body black/white per region; no mandatory ordinal or commercial close.'),
        ('source-detail-lens',['story:S2','NG-8'],{'source':[.05,.28,.64,.4],'lens':[.65,.56,.28,.23],'label':[.6,.81,.35,.06]},'base > authentic source > exact-pixel lens/ring/connector > labels','Do not redraw the metric; retain its source region, unit, period and definition.'),
    ]
    components = [
        ('photo','Registered real environment','Original pixels, focus crop, no global blur/extension'),
        ('subject-restore','Depth occlusion','Same source/transform as base; registered alpha; original RGB restored'),
        ('text','Editable exact copy','Actual font ID, weight, bounds, line height, tracking, phrase breaks'),
        ('source-crop','Evidence or real work','Asset crop, capture date, source claim link, readable decisive detail'),
        ('glass-pill','Bounded qualifier/metric','Thin border, padding, translucent tint, no false unit'),
        ('report-card','Work output','Labeled actual capture or explicitly illustrative structured output'),
        ('profile-panel','Profile visitor route','Avatar/handle, bio, link, highlights, pinned regions; capture date'),
        ('phone-frame','Format demonstration','Separate actual screenshot/device shell; maintain inner aspect'),
        ('proof-wall','Body of work','Real asset list; perspective where needed; no fabricated proof count'),
        ('app-icon','Recognizable platform identity','Actual permitted SVG/PNG, registered source; not an integration claim'),
        ('funnel','Conceptual stages or measured conversion','Named bands; dataset required for measured widths'),
        ('graph','Routes or measured chart','Nodes/edges or numeric series, metric/unit/window/scale'),
        ('annotation','Focused emphasis/direction','Explicit phrase/asset/port target; deterministic path'),
        ('magnifier','Read exact source detail','Exact crop reused; ring/connector; original label preserved'),
        ('brand-object','Purposeful identity/reveal','Canonical mark/object, permitted placement, scene-depth plan'),
        ('cta','Bounded next action','Actual destination/asset/fulfillment; one primary action'),
    ]
    profile = {
        '$schema':'./reference-replication-profile.schema.json','profile_version':'1.0.0','id':'pulsify-shared-reference-replication','date':'2026-10-08',
        'scope':{'carousel_images_individually_examined':76,'usable_full_captures':75,'broken_fragments':1,'source_directories':8,'visual_families':9,'existing_story_audit_images':57,'story_audit_reopened_this_pass':False,'live_app_integrated':False,'pixel_identity_guaranteed':False},
        'evidence_policy':{'observation':'Visible in supplied image','inference':'Bounded interpretation of visual/narrative job','production_rule':'Explicit founder direction or proposed engineering gate','geometry':'Estimated starting coordinates; calibrate with original','source_claims':'Attributed, not independently verified','unknowns':['exact source fonts','layer files and many original photographs','uninterrupted G2/G3 campaign order','occluded/tiny UI labels','donut segment values','measured retention/conversion']},
        'precedence':['current explicit job/founder/client decisions','locked copy and banned asset registry','mode and family','selected image/recipe anchors','estimated defaults'],
        'modes':{'reference-study':'Preserve original reference look for internal calibration, source claims remain attributed','client-production':'Preserve craft with real registered client assets, truthful copy and active brand overrides'},
        'invariants':['copy and communication purpose before artwork','preserve recognizable actual environment','never globally blur or mirror/blur-extend for text space','do not generate personal identity, receipts or final typography','photo and mask share one exact transform','essential text/units/timeframes/CTA remain visible','real glyph assets identify apps; connections require separate authenticated records','graphs declare conceptual/source-capture/measured status','same craft for stories and carousels with separate geometry','no hard gate can be offset by an aesthetic score'],
        'pulsify_overrides':{'scope':'Current SaaS highlight; does not globally replace source-study palettes or app UI','palette':{'graphite':'#0b0c0d','warm_white':'#f1f1ee','silver':'#efeee9','red_underline':'#e5322d','good_number_emerald':'#5fd6a4'},'fonts':['registered Helvetica family; current local choice','Georgia only when an approved serif role is wanted'],'banned_photo_ids':['9 / IMG_8529'],'photo':'Natural scene and exposure; useful deliberate crop; no manufactured top fill','brand':'Purposeful canonical coin; once/twice in current highlight, not watermark every frame','no_saturated_blue_in_active_highlight':True},
        'formats':{'carousel':{'width':1080,'height':1350,'safe_box':[.05,.04,.9,.92],'status':'proposed working 4:5 canvas; actual source aspect varies'},'story':{'width':1080,'height':1920,'safe_box':[.05,250/1920,.9,(1920-250-340)/1920],'status':'inherited active project reserves, not verified platform specification'},'adaptation':'Recompose photo, text, nodes and edges separately for each format; never stretch or blindly scale entire frame'},
        'layer_stack':['base-photo','approved-local-contrast','rear-artwork','original-photo-subject-restore','critical-foreground-copy-labels','annotations-brand-cta'],
        'material_defaults':{'status':'Proposed 1080px-wide starting values; visually calibrate selected source, not exact recovered source parameters',
            'glass_pill':{'border_px':[1,2],'radius_px':[18,32],'background_opacity':[.12,.3],'padding_px':[14,24],'shadow':'subtle local lift, not background blur'},
            'dark_report':{'border_px':[0,1.5],'radius_px':[16,28],'background_opacity':[.85,1],'padding_px':[16,28]},
            'graph_route':{'stroke_px':[2,4],'corner_radius_px':[12,24],'arrow_tip':'match named endpoint; route behind nonessential edges, essential labels in front'},
            'editorial_arrow':{'stroke_px':[2,5],'curve':'explicit SVG cubic control points; subtle deliberate hand variation'},
            'marker_underline':{'stroke_px':[3,7],'placement':'phrase baseline with a small gap; fitted actual rendered width'},
            'photo_depth':{'alpha':'Registered grayscale/RGBA source-sized mask','transform':'same crop, scale, translation as base','restore_rgb':'original photo pixels','check':'hair/hands/furniture intersections at full size and zoom'},
            'type':{'side_margin_fraction':[.05,.07],'standard_headline_px':[64,100],'body_px':[34,46],'status':'font/phrase dependent; phone readability overrides range'}},
        'raster_color_evidence':color_samples,
        'families':[{'id':i,'anchors':a,'job':j,'signature':s,'observed_color_roles':c,'color_status':'approximate visual families, not recovered source hex tokens','recipes':r} for i,a,j,s,c,r in families],
        'components':[{'id':i,'job':j,'construction':c} for i,j,c in components],
        'recipes':[{'id':i,'anchors':a,'estimated_boxes':b,'geometry_status':'estimate; calibrate selected original','stack':s,'acceptance':q} for i,a,b,s,q in recipes],
        'copy_contract':{'brief_fields':['question','topic','audience_state','purpose','belief_to_change','offer_fit','proof_available','action','delivery'],'slide_fields':['question','answer','evidence','next_question','payoff_slide'],'continuity_options':['setup to diagram','principle to evidence','task to output','mistake to consequence to diagnosis','objection to demonstration','finite set','bounded asset invitation'],'voice':'Pulsify direct, specific and varied; no filler, invented history, false suspense or source copy pasted as own'},
        'proof_contract':{'fields':['entity','metric','value','unit','window','evidence_ids','verification_state'],'forbidden':['multiplier from zero','unsupported causal lift','invented client receipt','mislabeling revenue as cash/profit','arbitrary measured chart','scarcity without actual constraint'],'profile_regions':['avatar_handle','bio','link','highlights','pinned_posts'],'source_defects':['G2-5 and G2-7 zero denominator','G2-14 multiplier mismatch','K2-2 visible totals do not fully reconcile cover','K1-7 day 11 overlap','NT-9 fragment','hidden K1-6 nodes','NP-4/8 fragmented or low-contrast copy']},
        'app_contract':{'status':'specified, not deployed','provider':'configured server-side, capability-checked; no hardcoded unverified model','stages':['brief','copy','assets','plan','validate','render','review','approved','exported'],'credentials_in_payload':False,'rendering':'Deterministic type/SVG/source assets; registered photo-mask composition','current_gap':'Inspected carousel sanitizer keeps four short layout kinds and design hints; no mask/layer/graph geometry','artifacts':['output/carousel-reference-audit-2026-10-08/job.schema.json','output/carousel-reference-audit-2026-10-08/job-template.json','output/carousel-reference-audit-2026-10-08/validate_job.py']},
        'quality':{'hard_gates':['photo environment/identity','locked copy','clean registered mask','essential labels unobscured','proof provenance and arithmetic','graph meaning/data','selected family consistency','phone first-read','correct format/delivery'],'views':['phone width','full size','zoomed intersections','whole set/contact sheet','source comparison'],'fidelity_dimensions':['hierarchy','photo mass','type silhouette','materials','spacing','depth','annotation hand','color role','story job'],'performance':'Measure available platform and downstream qualified demand; no unlimited-profit promise'},
        'reference_catalog':entries,
        'related':['wiki/synthesis/carousel-reference-forensic-audit-2026-10-08.md','wiki/synthesis/story-reference-forensic-audit-2026-10-08.md','wiki/content-engine/reference-replication-profile.md','wiki/playbooks/reference-replication-sop.md']
    }
    write_json(PROFILE, profile)
    build_profile_schema(profile)

def build_profile_schema(profile):
    # The operational scene has a separate stricter schema. This schema validates
    # the portable profile catalog and required profile sections.
    fields = {}
    for key, value in profile.items():
        typ = 'string' if isinstance(value,str) else 'array' if isinstance(value,list) else 'object'
        fields[key]={'type':typ}
    fields['profile_version']['const']='1.0.0'
    fields['reference_catalog']={'type':'array','minItems':76,'maxItems':76,'items':{'type':'object','additionalProperties':False,'required':list(profile['reference_catalog'][0]),'properties':{k:{'type':'integer' if isinstance(v,int) else 'string'} for k,v in profile['reference_catalog'][0].items()}}}
    for key in ('families','components','recipes'):
        sample=profile[key][0]
        props={}
        for k,v in sample.items():
            props[k]={'type':'string' if isinstance(v,str) else 'array' if isinstance(v,list) else 'object'}
        fields[key]={'type':'array','minItems':len(profile[key]),'maxItems':len(profile[key]),'items':{'type':'object','additionalProperties':False,'required':list(sample),'properties':props}}
    schema={'$schema':'https://json-schema.org/draft/2020-12/schema','title':'Pulsify portable reference profile 1.0.0','type':'object','additionalProperties':False,'required':list(profile),'properties':fields}
    write_json(PROFILE.with_name('reference-replication-profile.schema.json'),schema)

if __name__ == '__main__':
    entries=build_sources()
    build_profile(entries)
    print('Built 76-source manifest/atlas, individual ledger, 9-family/14-recipe JSON profile and profile schema.')
