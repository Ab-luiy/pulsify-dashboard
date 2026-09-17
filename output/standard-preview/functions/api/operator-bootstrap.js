import {checkAdmin,json} from '../_shared/common.js';
import {operatorIdentity} from '../_shared/access.js';
import {onRequestGet as overview} from './operator-overview.js';
import {onRequestGet as clients} from './clients.js';
export async function onRequestGet(context){
 const denied=checkAdmin(context.request,context.env);if(denied)return denied;
 const [a,b]=await Promise.all([overview(context),clients(context)]);
 if(!a.ok||!b.ok)return json({ok:false,error:'Workspace data unavailable'},503);
 return json({ok:true,operator:operatorIdentity(context.request),overview:await a.json(),clients:(await b.json()).clients,version:1});
}
