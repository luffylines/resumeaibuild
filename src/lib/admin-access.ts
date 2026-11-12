import {createClient} from '@supabase/supabase-js';
import {serverSupabase} from '@/lib/supabase-server';
export async function adminAccess(){
 const sb=await serverSupabase();
 if(!sb)return {status:503 as const,error:'Dedicated ResumeBuilder Supabase project is not configured.'};
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)return {status:401 as const,error:'Sign in at /admin/login.'};
 const role=await (sb as any).from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(role.error){
  console.error('[admin-access] Role lookup failed',{code:role.error.code||'UNKNOWN'});
  return {status:503 as const,error:'Could not verify administrator access. Check admin_users table, SELECT RLS policy and ResumeBuilder Supabase project configuration.'};
 }
 if(!role.data)return {status:403 as const,error:'Your account has not been granted administrator access in the ResumeBuilder database.'};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return {status:503 as const,error:'Admin database is not configured. Add SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) for the exact ResumeBuilder Supabase project in Vercel server environment variables.'};
 return {admin:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),user};
}
