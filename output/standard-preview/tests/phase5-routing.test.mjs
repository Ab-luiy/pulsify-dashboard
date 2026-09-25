import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/[slug].js';

const context = (slug, row = null) => ({
  request: new Request('https://pulsify-ai.com/' + slug), params: {slug},
  next: () => new Response('gateway', {status:200}),
  env: {
    DB: {prepare(){return {bind(){return this},async first(){return row}}}},
    ASSETS: {async fetch(req){return new Response(new URL(req.url).pathname === '/404.html' ? '<h1>Page not found</h1>' : '<h1>gateway</h1>', {headers:{'content-type':'text/html'}})}}
  }
});
test('unknown client slugs return branded 404 instead of the SPA fallback', async()=>{
  const r=await onRequestGet(context('missing-client'));
  assert.equal(r.status,404);assert.match(await r.text(),/Page not found/);
});
test('inactive clients remain unavailable and protected aliases pass to their own handlers', async()=>{
  assert.equal((await onRequestGet(context('archived',{page_active:0}))).status,404);
  assert.equal(await (await onRequestGet(context('admin'))).text(),'gateway');
});
test('retired /optin answers not found even while the static layer still has the old page', async()=>{
  for(const slug of ['optin','optin.html','OPTIN']){
    const r=await onRequestGet(context(slug));
    assert.equal(r.status,404);assert.equal(await r.text(),'<h1>Page not found</h1>');
  }
});
test('database failure is not disguised as a successful gateway response', async()=>{
  const c=context('missing-client');c.env.DB=null;
  assert.equal((await onRequestGet(c)).status,503);
});


import {pulsifyMiddleware as middleware} from '../functions/_middleware.js';
test('retired client surface redirects to authenticated portal',async()=>{
  for(const path of ['/client','/client.html']){
    const r=await middleware({request:new Request('https://pulsify-ai.com'+path),env:{},data:{},next:()=>new Response('old')});
    assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://pulsify-ai.com/portal');
  }
});
