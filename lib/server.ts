import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { canSeeRecord, type Entry } from './core';
export const db=()=>env.DB!;
export async function context(){const user=await getChatGPTUser();if(!user)throw new Error('401:Please sign in to open your workspace.');const w:any=await db().prepare('SELECT * FROM workspace WHERE id = ?').bind('main').first();if(!w)return {user,role:'uninitialized',projectIds:[],settings:{},setupAllowed:!!env.WORKSPACE_OWNER_EMAIL&&env.WORKSPACE_OWNER_EMAIL.trim().toLowerCase()===user.email.trim().toLowerCase()};
if(w.owner_id===user.userId)return {user,role:'contractor',projectIds:[] as string[],settings:JSON.parse(w.data)};
const member:any=await db().prepare('SELECT * FROM members WHERE email = ?').bind(user.email.toLowerCase()).first();if(!member)throw new Error('403:Your account has not been added to this workspace.');return {user,role:member.role as string,projectIds:JSON.parse(member.project_ids) as string[],settings:JSON.parse(w.data)};}
export function allowed(c:any,id:string){return c.role==='contractor'||c.projectIds.includes(id);}
export function failure(e:unknown){
  const error=e as {message?:string;issues?:{path:(string|number)[];message:string}[]};
  const validation=error?.issues?.[0];
  const message=validation?`${validation.path.join('.')}: ${validation.message}`:error?.message||'Request could not be completed.';
  const match=message.match(/^(400|401|403|404|409|413|415|429|503):(.*)/);
  const internal=/D1_|SQLITE_|R2_|binding|SQL syntax|no such (table|column)/i.test(message);
  if(internal)console.error('Workspace request failed:',message);
  return Response.json({error:internal?'Internal server error. Please try again later.':match?match[2]:message},{status:internal?500:match?Number(match[1]):400,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(req.headers.get('sec-fetch-site')==='cross-site'||origin&&origin!==new URL(req.url).origin)throw new Error('403:This request is not allowed.');}
export async function readJson(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('415:JSON request required.');if(Number(req.headers.get('content-length')||0)>262144)throw new Error('413:Request is too large.');const text=await req.text();if(new TextEncoder().encode(text).length>262144)throw new Error('413:Request is too large.');try{return JSON.parse(text)}catch{throw new Error('400:Invalid JSON request.');}}
export function auditStatement(c:any,action:string,entityId:string,details:unknown){return db().prepare('INSERT INTO audit_log (id,actor_id,actor_email,action,entity_id,details,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,c.user.email,action,entityId,JSON.stringify(details),new Date().toISOString());}
export async function rateLimit(req:Request){
  const address=req.headers.get('cf-connecting-ip')||'unknown';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(address));
  const key=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')+':'+Math.floor(Date.now()/600000);
  const row:any=await db().prepare('INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,Date.now()+600000).first();
  if(row.count>5)throw new Error('429:Too many enquiries received. Please try again after 10 minutes.');
  await db().prepare('DELETE FROM request_limits WHERE expires_at < ?').bind(Date.now()).run();
}
export async function getState(c:any){const p=await db().prepare('SELECT * FROM projects').all<any>();const all=await db().prepare('SELECT * FROM records ORDER BY created_at DESC').all<any>();const f=await db().prepare('SELECT * FROM files').all<any>();return {role:c.role,email:c.user.email,settings:c.settings,setupAllowed:c.setupAllowed||false,projects:p.results.map(x=>JSON.parse(x.data)).filter(x=>allowed(c,x.id)),records:all.results.map(x=>({id:x.id,projectId:x.project_id,kind:x.kind,data:JSON.parse(x.data),createdAt:x.created_at} as Entry)).filter(x=>allowed(c,x.projectId)&&canSeeRecord(c.role,x)),files:f.results.filter(x=>allowed(c,x.project_id)&&(c.role!=='client'||x.shared)),members:c.role==='contractor'?(await db().prepare('SELECT * FROM members').all<any>()).results.map(x=>({email:x.email,role:x.role,projectIds:JSON.parse(x.project_ids)})):[],audit:c.role==='contractor'?(await db().prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100').all<any>()).results:[],enquiries:c.role==='contractor'?(await db().prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all<any>()).results.map(x=>({id:x.id,...JSON.parse(x.data),createdAt:x.created_at})):[]};}
