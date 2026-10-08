"""Local schema + semantic preflight. Not a renderer or visual sign-off.

Dependencies: jsonschema, Pillow. Resolve local asset paths relative to the job.
Remote production assets require a server-side equivalent with authenticated
asset retrieval. This tool deliberately does not fetch URLs or read secrets.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys
from jsonschema import Draft202012Validator
from PIL import Image

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent
PROFILE=json.loads((ROOT/'wiki/content-engine/reference-replication-profile.json').read_text(encoding='utf-8'))
SCHEMA=json.loads((HERE/'job.schema.json').read_text(encoding='utf-8'))

def schema_errors(job):
    return [f"schema {'.'.join(map(str,e.absolute_path))}: {e.message}" for e in Draft202012Validator(SCHEMA).iter_errors(job)]

def overlap(a,b):
    return min(a[0]+a[2],b[0]+b[2])>max(a[0],b[0]) and min(a[1]+a[3],b[1]+b[3])>max(a[1],b[1])

def validate(job, base=HERE, check_files=True):
    errors=schema_errors(job)
    if errors: return errors
    assets={v['id']:v for v in job['assets']}
    claims={v['id']:v for v in job['claims']}
    slides={v['id']:v for v in job['slides']}
    references={v['id']:v for v in PROFILE['reference_catalog']}
    recipes={v['id'] for v in PROFILE['recipes']}
    if len(assets)!=len(job['assets']):errors.append('duplicate asset IDs')
    if len(claims)!=len(job['claims']):errors.append('duplicate claim IDs')
    if len(slides)!=len(job['slides']):errors.append('duplicate slide IDs')
    if job['family_id'] not in {v['id'] for v in PROFILE['families']}:errors.append('unknown family')
    expected=PROFILE['formats'][job['format']]
    if job['canvas']!={'width':expected['width'],'height':expected['height']}:errors.append('canvas differs from declared format adapter')
    for asset in assets.values():
        ident=asset['id']
        if asset['kind'] in ('photo','mask','proof','profile','device') and not all(k in asset for k in ('width','height')):errors.append(f'{ident}: image dimensions missing')
        if asset['kind']=='mask':
            source=assets.get(asset.get('mask_of'))
            if not source or source['kind']!='photo':errors.append(f'{ident}: mask_of must reference a registered photo')
            elif (asset.get('width'),asset.get('height'))!=(source.get('width'),source.get('height')):errors.append(f'{ident}: source/mask dimensions differ')
        if check_files:
            path=Path(asset['path'])
            if not path.is_absolute():path=base/path
            if not path.is_file():errors.append(f'{ident}: actual asset file unavailable');continue
            if hashlib.sha256(path.read_bytes()).hexdigest()!=asset['sha256']:errors.append(f'{ident}: asset hash mismatch')
            if asset['kind'] in ('photo','mask','proof','profile','device'):
                try:
                    with Image.open(path) as im:
                        im.load()
                        if im.size!=(asset.get('width'),asset.get('height')):errors.append(f'{ident}: decoded dimensions mismatch')
                        if asset['kind']=='mask':
                            if im.mode=='RGBA':alpha=im.getchannel('A')
                            elif im.mode=='L':alpha=im
                            else:errors.append(f'{ident}: mask requires grayscale or RGBA alpha');continue
                            lo,hi=alpha.getextrema()
                            if lo==hi:errors.append(f'{ident}: mask has no usable foreground/background variation')
                except Exception as exc:errors.append(f'{ident}: invalid image: {exc}')
    for claim in claims.values():
        ident=claim['id']
        if job['mode']=='client-production' and claim['verification'] not in ('verified','illustrative'):errors.append(f'{ident}: unsupported production claim')
        if claim['verification']=='verified' and not claim['evidence_ids']:errors.append(f'{ident}: verified claim lacks evidence')
        for eid in claim['evidence_ids']:
            if eid not in assets:errors.append(f'{ident}: evidence asset missing: {eid}')
        calculation=claim.get('calculation')
        if calculation:
            inputs=calculation['inputs']
            if calculation['kind']=='ratio':
                if len(inputs)!=2:errors.append(f'{ident}: ratio requires [ending, starting]');continue
                if inputs[1]==0:errors.append(f'{ident}: multiplier denominator is zero');continue
                result=inputs[0]/inputs[1]
            else:result=sum(inputs)
            if not math.isclose(result,claim['value'],rel_tol=0,abs_tol=calculation.get('rounding_tolerance',1e-8)):errors.append(f'{ident}: calculation does not reconcile')
    for slide in slides.values():
        sid=slide['id'];layers={v['id']:v for v in slide['layers']};graphs={v['id']:v for v in slide['graphs']}
        if len(layers)!=len(slide['layers']):errors.append(f'{sid}: duplicate layer IDs')
        if len(graphs)!=len(slide['graphs']):errors.append(f'{sid}: duplicate graph IDs')
        if len({v['z'] for v in layers.values()})!=len(layers):errors.append(f'{sid}: ambiguous layer z order')
        if slide['recipe_id'] not in recipes:errors.append(f'{sid}: unknown recipe')
        for rid in slide['reference_ids']:
            if rid not in references or references[rid]['status']=='broken-fragment':errors.append(f'{sid}: unknown or incomplete reference {rid}')
        payoff=slide['copy']['payoff_slide']
        if payoff and payoff not in slides:errors.append(f'{sid}: missing payoff slide')
        if slide['copy']['next_question'] and payoff is None and job['render_status']!='unbound-template':errors.append(f'{sid}: unanswered next question')
        for eid in slide['copy']['evidence_ids']:
            if eid not in assets:errors.append(f'{sid}: missing copy evidence {eid}')
        for layer in layers.values():
            lid=f"{sid}/{layer['id']}"
            box=layer['box']
            if box[2]<=0 or box[3]<=0:errors.append(f'{lid}: empty bounds')
            if layer['essential']:
                safe=expected['safe_box']
                if box[0]<safe[0]-1e-8 or box[1]<safe[1]-1e-8 or box[0]+box[2]>safe[0]+safe[2]+1e-8 or box[1]+box[3]>safe[1]+safe[3]+1e-8:errors.append(f'{lid}: essential content outside safe box')
            aid=layer.get('asset_id')
            if aid and aid not in assets:errors.append(f'{lid}: asset missing')
            component=layer['component']
            if component in ('photo','subject-restore'):
                if not aid or assets.get(aid,{}).get('kind')!='photo':errors.append(f'{lid}: registered photo required')
                if 'transform' not in layer:errors.append(f'{lid}: explicit photo transform required')
            if component=='app-icon' and assets.get(aid,{}).get('kind')!='icon':errors.append(f'{lid}: registered actual icon required')
            if component in ('text','cta'):
                if not layer.get('text'):errors.append(f'{lid}: text missing')
                font=layer.get('style',{}).get('font_id')
                if assets.get(font,{}).get('kind')!='font':errors.append(f'{lid}: registered font required')
            for cid in layer.get('claim_ids',[]):
                if cid not in claims:errors.append(f'{lid}: missing claim {cid}')
                elif claims[cid]['verification']=='illustrative' and not layer.get('illustrative_label'):errors.append(f'{lid}: illustrative claim label missing')
            if layer.get('graph_id') and layer['graph_id'] not in graphs:errors.append(f'{lid}: graph missing')
            if layer.get('target_layer_id') and layer['target_layer_id'] not in layers:errors.append(f'{lid}: annotation target missing')
            if component=='subject-restore':
                source=layers.get(layer.get('same_transform_as'))
                mask=assets.get(layer.get('mask_id'))
                if not source or source['component']!='photo':errors.append(f'{lid}: restore must bind base photo layer')
                elif source.get('asset_id')!=aid or source.get('transform')!=layer.get('transform') or source['box']!=box:errors.append(f'{lid}: photo/mask transform or source registration differs')
                elif source['z']>=layer['z']:errors.append(f'{lid}: restore must follow base')
                if not mask or mask['kind']!='mask' or mask.get('mask_of')!=aid:errors.append(f'{lid}: registered matching mask required')
                subject=slide.get('subject_box')
                if not subject:errors.append(f'{lid}: subject bounds needed for occlusion preflight')
                else:
                    for other in layers.values():
                        if other['essential'] and other['z']<layer['z'] and overlap(other['box'],subject):errors.append(f"{sid}/{other['id']}: essential content potentially hidden behind subject")
        for graph in graphs.values():
            gid=f"{sid}/{graph['id']}";nodes={v['id']:v for v in graph['nodes']}
            if len(nodes)!=len(graph['nodes']):errors.append(f'{gid}: duplicate node IDs')
            if len({e['id'] for e in graph['edges']})!=len(graph['edges']):errors.append(f'{gid}: duplicate edge IDs')
            for edge in graph['edges']:
                for end in ('from','to'):
                    node=nodes.get(edge[end])
                    if not node or edge[end+'_port'] not in node['ports']:errors.append(f'{gid}: dangling edge or port')
            for node in nodes.values():
                if 'icon_asset_id' in node and assets.get(node['icon_asset_id'],{}).get('kind')!='icon':errors.append(f'{gid}: node icon asset missing')
            for aid in graph['source_asset_ids']:
                if aid not in assets:errors.append(f'{gid}: graph source missing')
            if graph['status']=='measured':
                if not graph['data'] or not graph['source_asset_ids'] or not all(graph.get(k) for k in ('metric','unit','window')):errors.append(f'{gid}: measured chart requires data, source, metric, unit and window')
            if graph['status']=='conceptual' and graph['data']:errors.append(f'{gid}: conceptual graph cannot imply numeric measured data')
            if graph['status']=='source-capture' and not graph['source_asset_ids']:errors.append(f'{gid}: source capture needs original asset')
    return errors

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('job',type=Path)
    parser.add_argument('--schema-only',action='store_true',help='Structure only; does not make an asset-ready claim')
    args=parser.parse_args()
    job=json.loads(args.job.read_text(encoding='utf-8'))
    errors=schema_errors(job) if args.schema_only else validate(job,args.job.resolve().parent)
    print(json.dumps({'stage':'schema-only' if args.schema_only else 'preflight','passed':not errors,'errors':errors,'visual_signoff':False},indent=2))
    sys.exit(bool(errors))
