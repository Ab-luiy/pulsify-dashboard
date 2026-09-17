import {accessToken,validateAccess,rememberOperator} from './_shared/access.js';
export async function onRequest(context) {
 const {request,env}=context,url=new URL(request.url);
 if(url.hostname!=='ops.pulsify-ai.com'&&!['localhost','127.0.0.1'].includes(url.hostname)) return Response.redirect('https://ops.pulsify-ai.com'+url.pathname+url.search,302);
 if(/^\/(?:\.git|\.wrangler|\.dev\.vars|tests)(?:\/|$)/.test(url.pathname))return new Response('Not found',{status:404});
 const token=accessToken(request),operator=await validateAccess(token,env.ACCESS_AUD);
 if(!operator)return new Response('Operator sign-in required',{status:401,headers:{'cache-control':'no-store'}});
 if(!['GET','HEAD','OPTIONS'].includes(request.method)){
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return new Response('Forbidden',{status:403});
 }
 context.data.operator=operator;rememberOperator(request,operator);
 let response;
 if(url.pathname.startsWith('/api/')){
  // Same-origin bridge: browser never stores or sends an admin key.
  const target=new URL(url.pathname+url.search,'https://pulsify-ai.com');
  const headers=new Headers({'Cf-Access-Jwt-Assertion':token,'origin':target.origin,'x-pulsify-operator':'1'});
  if(request.headers.has('content-type'))headers.set('content-type',request.headers.get('content-type'));
  response=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'});
 }else response=await context.next();
 const headers=new Headers(response.headers);headers.set('cache-control','no-store');
 return new Response(response.body,{status:response.status,headers});
}
