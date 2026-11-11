import type {NextRequest} from 'next/server';
import {isIP} from 'node:net';
import type {User} from '@supabase/supabase-js';

export function requestIp(req:NextRequest):string|null{
 // Platform/proxy forwarded headers are best-effort and must never be used for
 // authorization, rate limits or geolocation. Validate before storing as inet.
 const forwarded=req.headers.get('x-vercel-forwarded-for')
  ||req.headers.get('x-forwarded-for')
  ||req.headers.get('x-real-ip')
  ||'';
 const candidate=forwarded.split(',')[0]?.trim().replace(/^\[|\]$/g,'')||'';
 return isIP(candidate)?candidate:null;
}
export function requestAgent(req:NextRequest){return (req.headers.get('user-agent')||'').slice(0,300)||null;}
export async function writeAudit(db:any,req:NextRequest,actor:Pick<User,'id'|'email'>,action:string,details:Record<string,unknown>={}){
 const record={actor_id:actor.id,action,details:{...details,actor_email:actor.email||null},ip_address:requestIp(req),user_agent:requestAgent(req)};
 const {error}=await db.from('activity_logs').insert(record);
 if(error)console.error('Audit write failed:',error.message);
 return !error;
}
