import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';
const sourceURL = text => 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const coreURL=sourceURL(fs.readFileSync('lib/core.ts','utf8'));
const core=await import(coreURL);
assert.equal(core.paise('1.005'),101);
assert.equal(core.paise('999.99'),99999);
assert.throws(()=>core.paise('-1'));
assert.deepEqual(core.quotationTotal([{qty:1,rate:90000}],2.5),{subtotal:90000,taxAmount:2250,total:92250});
assert.deepEqual(core.quotationTotal([{qty:120,rate:18000},{qty:120,rate:6500}],0),{subtotal:2940000,taxAmount:0,total:2940000});
assert.equal(core.quotationTotal([{qty:.125,rate:100}],0).total,13);
const sqlite=new DatabaseSync(':memory:');for(const p of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+p,'utf8'));
const DB={async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}},prepare(sql){return {bind(...args){const s=sqlite.prepare(sql);return {async first(){return s.get(...args)||null},async all(){return {results:s.all(...args)}},async run(){return s.run(...args)}}},async all(){return {results:sqlite.prepare(sql).all()}}}}};
const objects=new Map();
globalThis.TEST_ENV={WORKSPACE_OWNER_EMAIL:'owner@example.com',DB,BUCKET:{async put(id,data,meta){objects.set(id,{body:data,...meta})},async get(id){return objects.get(id)||null},async delete(id){objects.delete(id)}}};
globalThis.TEST_USER={userId:'owner-id',email:'owner@example.com',displayName:'Owner'};
let server=fs.readFileSync('lib/server.ts','utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.TEST_ENV;").replace("import { getChatGPTUser } from '../app/chatgpt-auth';","async function getChatGPTUser(){return globalThis.TEST_USER}").replace("'./core'",JSON.stringify(coreURL));
const serverURL=sourceURL(server);
const zodURL = import.meta.resolve('zod');
function route(path){return sourceURL(fs.readFileSync(path,'utf8').replace("'zod'",JSON.stringify(zodURL)).replace("'../../../lib/server'",JSON.stringify(serverURL)).replace("'../../../lib/core'",JSON.stringify(coreURL)).replace("import { env } from 'cloudflare:workers';","const env=globalThis.TEST_ENV;"))}
const api=await import(route('app/api/workspace/route.ts'));
const portfolio=await import(route('app/api/portfolio/route.ts'));
const fileApi=await import(route('app/api/files/route.ts'));
const post=body=>api.POST(new Request('https://example.com/api/workspace',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify(body)}));
assert.equal((await api.GET()).status,200);
globalThis.TEST_USER={userId:'stranger',email:'stranger@example.com'};assert.equal((await post({action:'initialize',name:'Stolen workspace',location:'Kota'})).status,403);
globalThis.TEST_USER={userId:'owner-id',email:'owner@example.com',displayName:'Owner'};
assert.equal((await (await post({action:'initialize',name:'Test Build',location:'Kota'})).json()).role,'contractor');
let response=await post({action:'project',data:{...core.demoProjects[0],id:'p1'}});assert.equal(response.status,200);
await post({action:'project',data:{...core.demoProjects[1],id:'p2'}});
assert.equal((await post({action:'record',projectId:'p1',kind:'expense',data:{title:'Cement',date:'2026-10-18',amount:10000,paid:11000}})).status,400);
assert.equal((await post({action:'record',projectId:'p1',kind:'payment',data:{title:'Stage 1',date:'2026-10-18',amount:10000,paid:5000}})).status,200);
assert.equal((await post({action:'record',projectId:'p1',kind:'expense',data:{title:'Cement',date:'2026-10-18',amount:10000,paid:5000}})).status,200);
assert.equal((await post({action:'record',projectId:'p2',kind:'payment',data:{title:'Private project 2',date:'2026-10-18',amount:10000,paid:5000}})).status,200);
await post({action:'member',data:{email:'client@example.com',role:'client',projectIds:['p1']}});
await post({action:'member',data:{email:'supervisor@example.com',role:'supervisor',projectIds:['p1']}});
globalThis.TEST_USER={userId:'client-id',email:'client@example.com'};
let state=await (await api.GET()).json();assert.equal(state.role,'client');assert.equal(state.projects.length,1);assert.equal(state.projects[0].id,'p1');assert.equal(state.records.length,1);assert.equal(state.records[0].kind,'payment');assert.equal(state.members.length,0);
assert.equal((await post({action:'record',projectId:'p1',kind:'payment',data:{}})).status,403);
assert.equal((await post({action:'settings',data:{}})).status,403);
globalThis.TEST_USER={userId:'supervisor-id',email:'supervisor@example.com'};
assert.equal((await post({action:'record',projectId:'p1',kind:'update',data:{title:'Brickwork',date:'2026-10-18',notes:'Complete'}})).status,200);
assert.equal((await post({action:'record',projectId:'p2',kind:'update',data:{title:'Wrong project',date:'2026-10-18'}})).status,403);
assert.equal((await post({action:'record',projectId:'p1',kind:'payment',data:{}})).status,403);
assert.equal((await post({action:'project',data:core.demoProjects[0]})).status,403);
// Shared and private file permission boundaries.
const form=new FormData();form.set('projectId','p1');form.set('file',new File([new Uint8Array([255,216,255,224,0,0])],'site.jpg',{type:'image/jpeg'}));form.set('shared','false');
assert.equal((await fileApi.POST(new Request('https://example.com/api/files',{method:'POST',body:form}))).status,200);
const file=sqlite.prepare('SELECT * FROM files').get();
globalThis.TEST_USER={userId:'client-id',email:'client@example.com'};
assert.equal((await fileApi.GET(new Request('https://example.com/api/files?id='+file.id))).status,404);
assert.equal((await portfolio.GET(new Request('https://example.com/api/portfolio?image='+file.id))).status,404);
globalThis.TEST_USER={userId:'owner-id',email:'owner@example.com'};
await post({action:'project',data:{...core.demoProjects[0],id:'p1',status:'Completed',progress:100,isPublic:true,image:'/api/files?id='+file.id}});
let publicData=await (await portfolio.GET(new Request('https://example.com/api/portfolio'))).json();assert.equal(publicData.projects.length,1);assert.equal(publicData.projects[0].client,undefined);assert.equal(publicData.projects[0].budget,undefined);
assert.equal((await portfolio.GET(new Request('https://example.com/api/portfolio?image='+file.id))).status,200);
assert.equal((await post({action:'settings',data:{name:'Updated Name',location:'Kota',phone:'919999999999',about:''}})).status,200);
assert.equal((await (await api.GET()).json()).settings.name,'Updated Name');
// Cross-origin writes and uninvited identities are blocked.
assert.equal((await api.POST(new Request('https://example.com/api/workspace',{method:'POST',headers:{Origin:'https://attacker.example'},body:JSON.stringify({action:'settings'})}))).status,403);
globalThis.TEST_USER={userId:'stranger',email:'stranger@example.com'};assert.equal((await api.GET()).status,403);
globalThis.TEST_USER=null;assert.equal((await api.GET()).status,401);
assert.ok(sqlite.prepare('SELECT count(*) as n FROM audit_log').get().n>=3);
console.log('PASS: decimal amounts, itemised estimates, workspace setup, persisted records, project isolation, client and supervisor permissions, private files, restricted owner setup, audit history, explicit public covers, settings, cross-origin checks and unauthenticated access.');

// Content spoofing, impossible dates, excessive precision and enquiry floods are rejected.
globalThis.TEST_USER={userId:'owner-id',email:'owner@example.com'};
assert.equal((await post({action:'record',projectId:'p1',kind:'payment',data:{title:'Bad date',date:'2026-02-30',amount:100,paid:0}})).status,400);
assert.equal((await post({action:'record',projectId:'p1',kind:'quotation',data:{title:'Bad precision',date:'2026-10-18',lines:[{description:'Item',qty:0.0001,unit:'m',rate:100}],tax:0}})).status,400);
const badForm=new FormData();badForm.set('projectId','p1');badForm.set('file',new File(['<script>alert(1)</script>'],'image.jpg',{type:'image/jpeg'}));
assert.equal((await fileApi.POST(new Request('https://example.com/api/files',{method:'POST',body:badForm}))).status,415);
const sendEnquiry=(phone)=>portfolio.POST(new Request('https://example.com/api/portfolio',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'127.0.0.2'},body:JSON.stringify({name:'Test client',phone,city:'Kota',type:'Home',details:'Test',website:''})}));
for(let i=0;i<5;i++)assert.equal((await sendEnquiry('999999990'+i)).status,200);
assert.equal((await sendEnquiry('9999999999')).status,429);
assert.equal((await api.POST(new Request('https://example.com/api/workspace',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'}))).status,415);
console.log('PASS: upload signature validation, calendar dates, quotation precision, enquiry throttling and JSON request limits.');

// Full record lifecycle: computed totals, immutability of project ownership, history and revocation.
const owner={userId:'owner-id',email:'owner@example.com'};
globalThis.TEST_USER=owner;
const createRecord=async(kind,data)=>{const before=sqlite.prepare('SELECT count(*) n FROM records').get().n;const result=await post({action:'record',projectId:'p1',kind,data:{title:'Lifecycle '+kind,date:'2026-10-19',...data}});assert.equal(result.status,200,await result.clone().text());assert.equal(sqlite.prepare('SELECT count(*) n FROM records').get().n,before+1);return (await result.json()).records.find(r=>r.data.title==='Lifecycle '+kind)};
const quote=await createRecord('quotation',{lines:[{description:'Masonry',qty:1.005,rate:100,unit:'m'}],tax:18});assert.equal(quote.data.subtotal,101);assert.equal(quote.data.total,119);
const labour=await createRecord('labour',{days:1.5,rate:90000,advance:20000,paid:50000});assert.equal(labour.data.amount,135000);
await createRecord('agreement',{scope:'Foundation and structure',terms:'Stage payments',status:'Draft'});
const edited={...quote.data,title:'Revised quote'};
assert.equal((await post({action:'record',id:quote.id,projectId:'p2',kind:'quotation',data:edited})).status,403);
assert.equal((await post({action:'record',id:quote.id,projectId:'p1',kind:'quotation',data:edited})).status,200);
const updateAudit=sqlite.prepare("SELECT details FROM audit_log WHERE entity_id=? AND action='record.updated'").get(quote.id);assert.equal(JSON.parse(updateAudit.details).before.title,'Lifecycle quotation');assert.equal(JSON.parse(updateAudit.details).after.title,'Revised quote');
assert.equal((await post({action:'deleteRecord',id:quote.id})).status,200);assert.equal(sqlite.prepare('SELECT id FROM records WHERE id=?').get(quote.id),undefined);assert.ok(sqlite.prepare("SELECT id FROM audit_log WHERE entity_id=? AND action='record.deleted'").get(quote.id));
// Real bytes round-trip through the route, shared-client access and missing-object handling.
const pdf=new TextEncoder().encode('%PDF-1.7\nTest document\n%%EOF');const shared=new FormData();shared.set('projectId','p1');shared.set('shared','true');shared.set('file',new File([pdf],'bill.pdf',{type:'application/pdf'}));
assert.equal((await fileApi.POST(new Request('https://example.com/api/files',{method:'POST',body:shared}))).status,200);const sharedFile=sqlite.prepare("SELECT * FROM files WHERE name='bill.pdf'").get();
globalThis.TEST_USER={userId:'client-id',email:'client@example.com'};let download=await fileApi.GET(new Request('https://example.com/api/files?id='+sharedFile.id));assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.deepEqual(new Uint8Array(await download.arrayBuffer()),pdf);
assert.equal((await fileApi.POST(new Request('https://example.com/api/files',{method:'POST',body:shared}))).status,403);
assert.equal((await post({action:'deleteRecord',id:labour.id})).status,403);
globalThis.TEST_USER=owner;await post({action:'removeMember',email:'client@example.com'});globalThis.TEST_USER={userId:'client-id',email:'client@example.com'};assert.equal((await api.GET()).status,403);assert.equal((await fileApi.GET(new Request('https://example.com/api/files?id='+sharedFile.id))).status,403);
// Public covers become unavailable immediately when a project is unpublished.
globalThis.TEST_USER=owner;await post({action:'project',data:{...core.demoProjects[0],id:'p1',isPublic:false,image:'/api/files?id='+file.id}});assert.equal((await portfolio.GET(new Request('https://example.com/api/portfolio?image='+file.id))).status,404);
// Indian number normalization prevents formatted-number duplicate enquiries.
const enquiry=phone=>portfolio.POST(new Request('https://example.com/api/portfolio',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'127.0.0.9'},body:JSON.stringify({name:'Client',phone,city:'Kota',type:'Home',details:'',website:''})}));
assert.equal((await enquiry('          ')).status,400);assert.equal((await enquiry('98765 43210')).status,200);assert.equal((await enquiry('+91-9876543210')).status,400);
assert.equal(sqlite.prepare("SELECT count(*) n FROM enquiries WHERE json_extract(data,'$.phone')='+919876543210'").get().n,1);
console.log('PASS: quotation/agreement/labour lifecycle, edit/delete history, cross-project edit rejection, PDF byte round-trip, client upload/delete denial, immediate access revocation, cover unpublishing and normalized enquiry deduplication.');
