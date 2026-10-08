"""Register the actual trial assets and semantic scene in the shared job schema."""
from pathlib import Path
import hashlib, json
from PIL import Image

HERE = Path(__file__).resolve().parent
scene = json.loads((HERE / 'scene.json').read_text(encoding='utf-8'))
email = HERE / 'assets/email.svg'
email.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 58"><g fill="none" stroke="#f8f5f0" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><rect width="74" height="58" rx="9"/><path d="M4 7 37 31 70 7"/></g></svg>', encoding='utf-8')
names = ['cafe', 'reference', 'pulsify', 'arial', 'arial_bold', 'instagram', 'youtube']
kinds = ['photo', 'photo', 'brand', 'font', 'font', 'icon', 'icon']
assets = []
for name, kind, src in zip(names, kinds, scene['assets']):
    a = dict(id=name, kind=kind, path=src['file'], sha256=src['sha256'], source_note=src['source'])
    if kind == 'photo':
        a['width'], a['height'] = Image.open(HERE / a['path']).size
    assets.append(a)
assets.append(dict(id='email', kind='icon', path='assets/email.svg', sha256=hashlib.sha256(email.read_bytes()).hexdigest(), source_note='Original generic envelope vector; same geometry as inline slide symbol.'))

def box(x, y, w, h):
    return [x / 1080, y / 1350, w / 1080, h / 1350]

layers = []
def layer(id, component, bounds, essential=True, **extra):
    layers.append(dict(id=id, component=component, z=len(layers), box=box(*bounds), essential=essential, **extra))

def text(id, value, bounds, size, bold=False, align='left', essential=True):
    layer(id, 'text', bounds, essential, text=value, style=dict(font_id='arial_bold' if bold else 'arial', weight=700 if bold else 400, size_px=size, line_height=1.13, alignment=align, fill='#faf7f1'))

pw, ph = assets[0]['width'], assets[0]['height']
scale = max(1080 / pw, 1350 / ph)
rw, rh = pw * scale, ph * scale
layer('photo', 'photo', (0,0,1080,1350), False, asset_id='cafe', photo_effect='none', transform=dict(scale=scale, translate=[(1080-rw)/2,(1350-rh)/2], crop=[(rw-1080)/rw/2,(rh-1350)/rh/2,1080/rw,1350/rh]))
layer('top_contrast', 'local-contrast', (0,0,1080,540), False)
layer('diagram_contrast', 'local-contrast', (0,419,1080,931), False)
layer('brand', 'brand-object', (65,53,139,40), False, asset_id='pulsify')
text('ordinal', '[01]', (956,59,59,28), 24, True)
layer('red_backing', 'annotation', (50,219,420,94), False)
text('headline', 'Give every channel\na clear job.', (65,128,740,185), 80, True)
text('intro', 'One offer. Different ways to reach it.', (65,337,700,42), 33)

nodes = [dict(id='routes', label='One offer. Different ways to reach it.', box=box(65,337,700,42), ports=['out'])]
edges = []
for c in scene['channels']:
    k, x = c['id'], c['center']
    node = dict(id=k, label=c['name'], box=box(x-126,530,252,216), ports=['in','out'], icon_asset_id=k)
    nodes.append(node)
    edges.append(dict(id='route_'+k, **{'from':'routes','from_port':'out','to':k,'to_port':'in'}))
layer('branch_connectors', 'graph', (215,405,650,116), graph_id='channel_routes', svg_path='elements.svg#branch-connectors')
graphs = [dict(id='channel_routes', kind='flow', status='conceptual', nodes=nodes, edges=edges, data=[], source_asset_ids=[], scale_semantics='Branches enumerate channel roles; they encode no measured volume or attribution.')]
for c in scene['channels']:
    k, x = c['id'], c['center']
    layer(k+'_icon', 'app-icon', (x-38,530,76,76), asset_id=k, svg_path='elements.svg#'+('email-symbol' if k=='email' else k+'-glyph'))
    text(k+'_name', c['name'], (x-133,610,266,49), 43, True, 'center')
    text(k+'_caption', '\n'.join(c['description']), (x-140,682,280,70), 29, False, 'center')
    ns = []
    es = []
    stages = [(792,141),(940,81),(1023,74)]
    for i, (label, (y,h)) in enumerate(zip(c['stages'], stages)):
        ns.append(dict(id=k+'_'+str(i), label=label, box=box(x-126,y,252,h), ports=['in','out']))
        if i:
            es.append(dict(id=k+'_step_'+str(i), **{'from':k+'_'+str(i-1),'from_port':'out','to':k+'_'+str(i),'to_port':'in'}))
    graphs.append(dict(id=k+'_path', kind='funnel', status='conceptual', nodes=ns, edges=es, data=[], source_asset_ids=[], scale_semantics='Detached tapered bands communicate discovery, consideration and action; widths are categorical, not conversion rates.'))
    layer(k+'_funnel', 'funnel', (x-126,792,252,305), graph_id=k+'_path', svg_path='elements.svg#'+k+'-funnel')
    for i,(label,y,size) in enumerate(zip(c['stages'],[864,959,1038],[31,30,27])):
        text(k+'_stage_'+str(i),label,(x-110,y,220,36),size,True,'center')
text('close','Attention needs a path\nto your offer.',(65,1155,700,96),42,True)
text('footer','CONCEPTUAL CONTENT PATH',(65,1276,420,25),22,essential=False)

job = dict(schema_version='1.0.0', profile_version='1.0.0', job_id='channel-ecosystem-2026-10-08', mode='client-production', family_id='red-case-system', format='carousel', canvas=dict(width=1080,height=1350), brief=dict(question='What job should each content channel do?',topic='Three channels leading toward one offer',audience_state='Coach or creator using multiple channels without distinct roles',purpose='Show a simple conceptual content path',belief_to_change='Every channel should repeat the same job',offer_fit='High-ticket coaching content ecosystem; no performance promise',action='Give each channel a role and a next step',delivery='One editable draft slide and rendered preview'), assets=assets, claims=[], slides=[dict(id='slide_1',role='standalone explanation',reference_ids=['K1-4'],recipe_id='three-platform-funnels',copy=dict(question='What job should each content channel do?',answer='Give every channel a clear job. Attention needs a path to your offer.',evidence_ids=[],next_question='',payoff_slide=None),layers=layers,graphs=graphs,qa_notes=['Master and phone render visually inspected. Structural preflight is separate from aesthetic judgment.','Source fonts/layers unknown; Arial is a verified local approximation.','Generic email replaces Kit. All paths are conceptual; there are no measured claims.','Small footer and brand are nonessential decorative edge elements.','Photo library sync failed7403; existing local cafe photo used.']),],render_status='reviewed')
(HERE / 'job.json').write_text(json.dumps(job,indent=2),encoding='utf-8')
print('Registered job.json with actual assets, editable layers and conceptual graphs')
