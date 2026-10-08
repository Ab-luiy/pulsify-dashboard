"""Meaningful positive/negative preflight checks and source-integrity audit."""
from pathlib import Path
import copy
import hashlib
import json
import tempfile
from PIL import Image, ImageDraw
from jsonschema import Draft202012Validator
from validate_job import validate, schema_errors, PROFILE, ROOT, HERE

def read(path):return json.loads(path.read_text(encoding='utf-8'))

Draft202012Validator.check_schema(read(HERE/'job.schema.json'))
profile_schema=read(ROOT/'wiki/content-engine/reference-replication-profile.schema.json')
Draft202012Validator.check_schema(profile_schema)
Draft202012Validator(profile_schema).validate(PROFILE)
manifest=read(HERE/'manifest.json')
assert len(manifest['entries'])==len({v['source'] for v in manifest['entries']})==76
assert sum(v['status']=='broken-fragment' for v in manifest['entries'])==1
assert all(hashlib.sha256((ROOT/v['source']).read_bytes()).hexdigest()==v['sha256'] for v in manifest['entries'])
refs={v['id'] for v in manifest['entries']}
story_refs={v['id'] for v in read(ROOT/'output/story-reference-audit-2026-10-08/manifest.json')['entries']}
for recipe in PROFILE['recipes']:
    for anchor in recipe['anchors']:
        assert anchor in refs or (anchor.startswith('story:') and anchor[6:] in story_refs),anchor
    for box in recipe['estimated_boxes'].values():
        assert len(box)==4 and all(0<=v<=1 for v in box) and box[2]>0 and box[3]>0

template=read(HERE/'job-template.json')
assert not schema_errors(template)
template_errors=validate(template)
assert sum('actual asset file unavailable' in e for e in template_errors)==3
results={}
with tempfile.TemporaryDirectory(prefix='pulsify-reference-preflight-') as directory:
    base=Path(directory)
    # Synthetic assets exist only to exercise registration checks. These are not
    # rendered marketing assets or fabricated client proof.
    photo=Image.new('RGB',(1080,1350),(70,60,50));photo.save(base/'photo.png')
    mask=Image.new('L',(1080,1350),0);ImageDraw.Draw(mask).rectangle((430,380,890,1250),fill=255);mask.save(base/'mask.png')
    (base/'font.fixture').write_bytes(b'preflight fixture only; real font loading is renderer QA')
    job=copy.deepcopy(template)
    for asset,path in zip(job['assets'],[base/'photo.png',base/'mask.png',base/'font.fixture']):
        asset['path']=str(path);asset['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    job['render_status']='draft'
    job['slides'][0]['copy']['next_question']=''
    assert not validate(job,base),validate(job,base)
    results['registered_asset_fixture_passes']=True
    # A valid three-channel conceptual graph checks semantic ports and routes.
    graph={'id':'routes','kind':'flow','status':'conceptual','nodes':[{'id':'ig','label':'Instagram','box':[.1,.3,.2,.1],'ports':['out']},{'id':'yt','label':'YouTube','box':[.4,.3,.2,.1],'ports':['out']},{'id':'call','label':'Sales call','box':[.3,.6,.3,.1],'ports':['in']}], 'edges':[{'id':'a','from':'ig','from_port':'out','to':'call','to_port':'in'},{'id':'b','from':'yt','from_port':'out','to':'call','to_port':'in'}],'data':[],'source_asset_ids':[],'scale_semantics':'Conceptual route; positions do not encode conversion counts'}
    flow=copy.deepcopy(job);flow['slides'][0]['graphs']=[graph]
    assert not validate(flow,base)
    results['conceptual_graph_passes']=True
    def reject(name,source,mutate,expected):
        candidate=copy.deepcopy(source);mutate(candidate)
        errors=validate(candidate,base)
        assert any(expected in e for e in errors),(name,errors)
        results[name]=True
    reject('missing_asset_rejected',job,lambda j:j['assets'][0].update(path='absent.png'),'actual asset file unavailable')
    reject('hash_change_rejected',job,lambda j:j['assets'][0].update(sha256='1'*64),'asset hash mismatch')
    reject('mask_dimension_mismatch_rejected',job,lambda j:j['assets'][1].update(width=540),'dimensions differ')
    reject('missing_mask_rejected',job,lambda j:j['slides'][0]['layers'][2].update(mask_id='absent'),'matching mask required')
    reject('shifted_mask_transform_rejected',job,lambda j:j['slides'][0]['layers'][2].update(transform={'scale':1,'translate':[.1,0],'crop':[0,0,1,1]}),'registration differs')
    reject('hidden_essential_copy_rejected',job,lambda j:j['slides'][0]['layers'][1].update(essential=True),'potentially hidden')
    reject('forbidden_blur_rejected',job,lambda j:j['slides'][0]['layers'][0].update(photo_effect='global-blur'),'schema')
    reject('unknown_icon_rejected',job,lambda j:j['slides'][0]['layers'].append({'id':'icon','component':'app-icon','z':50,'box':[.1,.6,.1,.1],'essential':False,'asset_id':'absent'}),'actual icon required')
    reject('broken_reference_rejected',job,lambda j:j['slides'][0].update(reference_ids=['NT-9']),'incomplete reference')
    reject('dangling_graph_port_rejected',flow,lambda j:j['slides'][0]['graphs'][0]['edges'][0].update(to_port='absent'),'dangling edge')
    reject('measured_chart_without_data_rejected',flow,lambda j:j['slides'][0]['graphs'][0].update(status='measured'),'requires data')
    reject('invented_conceptual_values_rejected',flow,lambda j:j['slides'][0]['graphs'][0].update(data=[{'label':'Conversion','value':35}]),'cannot imply numeric')
    reject('unanswered_payoff_rejected',job,lambda j:j['slides'][0]['copy'].update(next_question='How does this work?'),'unanswered next question')
    def add_claim(j,value=10,baseline=20,verification='illustrative',label=True):
        j['claims']=[{'id':'ratio','entity':'test fixture','metric':'monthly amount ratio','value':value,'unit':'times','window':'fixture','evidence_ids':[],'verification':verification,'calculation':{'kind':'ratio','inputs':[200,baseline]}}]
        j['slides'][0]['layers'][3]['claim_ids']=['ratio']
        if label:j['slides'][0]['layers'][3]['illustrative_label']='Illustrative fixture'
    calculated=copy.deepcopy(job);add_claim(calculated)
    assert not validate(calculated,base)
    results['valid_illustrative_arithmetic_passes']=True
    reject('zero_denominator_rejected',job,lambda j:add_claim(j,baseline=0),'denominator is zero')
    reject('mismatched_multiplier_rejected',job,lambda j:add_claim(j,value=6),'does not reconcile')
    reject('unverified_production_claim_rejected',job,lambda j:add_claim(j,verification='unverified'),'unsupported production claim')
    reject('unlabeled_illustration_rejected',job,lambda j:add_claim(j,label=False),'illustrative claim label missing')
    reject('story_safe_zone_rejected',job,lambda j:j.update(format='story',canvas={'width':1080,'height':1920}),'outside safe box')

report={'source_count':76,'source_hashes_unchanged':True,'profile_schema_valid':True,'job_schema_valid':True,'recipe_anchors_resolve':True,'template_schema_valid':True,'template_intentionally_blocked':template_errors,'checks':results,'visual_signoff':False,'live_app_integrated':False}
(HERE/'contract-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
