"""Build the strict scene-job schema and an intentionally unbound template."""
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
def obj(properties, required=None):
    return {'type':'object','additionalProperties':False,'properties':properties,'required':list(properties) if required is None else required}
def arr(item, minimum=0):
    return {'type':'array','items':item,'minItems':minimum}
def enum(*values):
    return {'type':'string','enum':list(values)}
def ref(name):
    return {'$ref':'#/$defs/'+name}
S={'type':'string','minLength':1}
N={'type':'number'}
B={'type':'boolean'}
BOX={'type':'array','prefixItems':[{'type':'number','minimum':0,'maximum':1}]*4,'items':False,'minItems':4,'maxItems':4}
PAIR={'type':'array','prefixItems':[N,N],'items':False,'minItems':2,'maxItems':2}
T=obj({'scale':{'type':'number','exclusiveMinimum':0},'translate':PAIR,'crop':BOX})
defs={
    'asset':obj({'id':S,'kind':enum('photo','mask','proof','profile','icon','font','brand','device'),'path':S,'sha256':{'type':'string','pattern':'^[0-9a-f]{64}$'},'width':{'type':'integer','minimum':1},'height':{'type':'integer','minimum':1},'mask_of':S,'source_note':S},['id','kind','path','sha256','source_note']),
    'claim':obj({'id':S,'entity':S,'metric':S,'value':N,'unit':S,'window':S,'evidence_ids':arr(S),'verification':enum('verified','illustrative','source-presented','unverified'),'calculation':obj({'kind':enum('ratio','sum'),'inputs':arr(N,2),'rounding_tolerance':{'type':'number','minimum':0}},['kind','inputs'])},['id','entity','metric','value','unit','window','evidence_ids','verification']),
    'style':obj({'font_id':S,'weight':{'type':'integer','minimum':100,'maximum':900},'size_px':{'type':'number','exclusiveMinimum':0},'line_height':{'type':'number','exclusiveMinimum':0},'tracking_px':N,'alignment':enum('left','center','right'),'fill':S,'stroke':S,'stroke_px':{'type':'number','minimum':0},'opacity':{'type':'number','minimum':0,'maximum':1},'radius_px':{'type':'number','minimum':0},'gradient_stops':arr(obj({'offset':{'type':'number','minimum':0,'maximum':1},'color':S}))},[]),
    'layer':obj({'id':S,'component':enum('photo','local-contrast','subject-restore','text','source-crop','glass-pill','report-card','profile-panel','phone-frame','proof-wall','app-icon','funnel','graph','annotation','magnifier','brand-object','cta'),'z':{'type':'integer'},'box':BOX,'essential':B,'asset_id':S,'mask_id':S,'same_transform_as':S,'transform':T,'text':S,'line_breaks':arr(S),'style':ref('style'),'source_box':BOX,'graph_id':S,'target_layer_id':S,'svg_path':S,'claim_ids':arr(S),'illustrative_label':S,'photo_effect':enum('none','approved-local-scrim')},['id','component','z','box','essential']),
    'node':obj({'id':S,'label':S,'box':BOX,'icon_asset_id':S,'ports':arr(S)},['id','label','box','ports']),
    'edge':obj({'id':S,'from':S,'from_port':S,'to':S,'to_port':S,'label':S},['id','from','from_port','to','to_port']),
    'datum':obj({'label':S,'value':N}),
    'graph':obj({'id':S,'kind':enum('flow','funnel','donut','line','bar'),'status':enum('conceptual','measured','source-capture'),'nodes':arr(ref('node')),'edges':arr(ref('edge')),'data':arr(ref('datum')),'metric':S,'unit':S,'window':S,'source_asset_ids':arr(S),'scale_semantics':S},['id','kind','status','nodes','edges','data','source_asset_ids','scale_semantics']),
    'copy':obj({'question':S,'answer':S,'evidence_ids':arr(S),'next_question':{'type':'string'},'payoff_slide':{'type':['string','null']}}),
    'slide':obj({'id':S,'role':S,'reference_ids':arr(S,1),'recipe_id':S,'copy':ref('copy'),'subject_box':BOX,'layers':arr(ref('layer'),1),'graphs':arr(ref('graph')),'qa_notes':arr(S)},['id','role','reference_ids','recipe_id','copy','layers','graphs','qa_notes']),
}
job=obj({'schema_version':{'const':'1.0.0'},'profile_version':{'const':'1.0.0'},'job_id':S,'mode':enum('reference-study','client-production'),'family_id':S,'format':enum('carousel','story'),'canvas':obj({'width':{'type':'integer','minimum':1},'height':{'type':'integer','minimum':1}}),'brief':obj({key:S for key in ['question','topic','audience_state','purpose','belief_to_change','offer_fit','action','delivery']}),'assets':arr(ref('asset'),1),'claims':arr(ref('claim')),'slides':arr(ref('slide'),1),'render_status':enum('unbound-template','draft','validated','rendered','reviewed','approved','exported')})
job.update({'$schema':'https://json-schema.org/draft/2020-12/schema','title':'Pulsify reference composition job 1.0.0','$defs':defs})

transform={'scale':1,'translate':[0,0],'crop':[0,0,1,1]}
template={
    'schema_version':'1.0.0','profile_version':'1.0.0','job_id':'bind-real-assets-before-rendering','mode':'client-production','family_id':'assistant-features','format':'carousel','canvas':{'width':1080,'height':1350},
    'brief':{'question':'Which recurring work should this set explain?','topic':'Replace with the actual topic','audience_state':'Replace with a documented buyer situation','purpose':'Explain a fitting, verified capability','belief_to_change':'Replace with the specific belief','offer_fit':'Define the appropriate audience and boundary','action':'Set the actual requested action','delivery':'Name the existing deliverable and fulfillment'},
    'assets':[
        {'id':'photo_1','kind':'photo','path':'BIND_ACTUAL_PHOTO','sha256':'0'*64,'width':1080,'height':1350,'source_note':'Actual approved operator photo; preserve environment'},
        {'id':'mask_1','kind':'mask','path':'BIND_REGISTERED_ALPHA_MASK','sha256':'0'*64,'width':1080,'height':1350,'mask_of':'photo_1','source_note':'Same source dimensions and transform; visual registration must pass'},
        {'id':'font_1','kind':'font','path':'BIND_PERMITTED_FONT_FILE','sha256':'0'*64,'source_note':'Actual font file, do not assume source font identity'},
    ],'claims':[],
    'slides':[{'id':'slide_1','role':'introduction','reference_ids':['G1-1'],'recipe_id':'outlined-name-behind-subject','copy':{'question':'What is this about?','answer':'Bind approved introduction copy','evidence_ids':[],'next_question':'Which output can I inspect?','payoff_slide':None},'subject_box':[.4,.28,.45,.68],
        'layers':[
            {'id':'base','component':'photo','z':0,'box':[0,0,1,1],'essential':False,'asset_id':'photo_1','transform':transform,'photo_effect':'none'},
            {'id':'rear_name','component':'text','z':20,'box':[.05,.22,.9,.3],'essential':False,'text':'Bind actual display name','style':{'font_id':'font_1','weight':300,'size_px':180,'line_height':1,'tracking_px':-3,'alignment':'center','fill':'#f1f1ee','opacity':.7}},
            {'id':'restore','component':'subject-restore','z':30,'box':[0,0,1,1],'essential':False,'asset_id':'photo_1','mask_id':'mask_1','same_transform_as':'base','transform':transform},
            {'id':'meaning','component':'text','z':40,'box':[.06,.08,.88,.1],'essential':True,'text':'Bind the approved promise','style':{'font_id':'font_1','weight':400,'size_px':46,'line_height':1.2,'alignment':'left','fill':'#f1f1ee'}},
        ],'graphs':[],'qa_notes':['Unbound template: no original assets or final topic/copy supplied here.','Geometry is an estimated demonstration and must be calibrated to the actual photo.','No rendered or deployed output is claimed.']}],
    'render_status':'unbound-template'
}
for filename,value in [('job.schema.json',job),('job-template.json',template)]:
    (HERE/filename).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote strict job schema and intentionally blocked real-asset template.')
