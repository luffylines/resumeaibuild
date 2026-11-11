import {createClient} from '@supabase/supabase-js';
import {serverSupabase} from '@/lib/supabase-server';
export async function adminAccess(){
 const sb=await serverSupabase();
 if(!sb)return {status:503 as const,error:'Dedicated ResumeBuilder Supabase project is not configured.'};
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)return {status:401 as const,error:'Sign in at /admin/login.'};
 const role=await (sb as any).from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(role.error||!role.data)return {status:403 as const,error:'This account is not authorized as an administrator.'};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return {status:503 as const,error:'Add a private server-side Supabase secret key from your separate project.'};
 return {admin:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),user};
}
