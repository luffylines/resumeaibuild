import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {serverSupabase} from '@/lib/supabase-server';
import {writeAudit} from '@/lib/audit';
export const runtime='nodejs';
const actions=new Set(['resume_saved','resume_deleted','application_saved','application_deleted','ats_checked','ai_generated']);
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Invalid request origin'},{status:403});
 const sb=await serverSupabase();if(!sb)return NextResponse.json({error:'Database not configured'},{status:503});
 const {data:{user}}=await sb.auth.getUser();
 if(!user)return NextResponse.json({error:'Not signed in'},{status:401});
 let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const b=body as {action?:unknown;detail?:unknown};
 if(!b||typeof b!=='object'||typeof b.action!=='string'||!actions.has(b.action))return NextResponse.json({error:'Invalid activity type'},{status:400});
 // Client-originated events are descriptive and explicitly labeled as client-reported.
 // Do not accept an actor, IP address, or any unrestricted user fields.
 const details:Record<string,unknown>={source:'client_reported'};
 if(typeof b.detail==='string')details.summary=b.detail.slice(0,140);
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)return NextResponse.json({error:'Server audit key missing'},{status:503});
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const ok=await writeAudit(admin,req,user,b.action,details);
 return NextResponse.json({ok},{status:ok?200:503,headers:{'Cache-Control':'no-store'}});
}
