import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase-server';
import {checkAdminRole} from '@/lib/admin-role';

export const runtime='nodejs';
export async function GET(){
 const sb=await serverSupabase();
 if(!sb)return NextResponse.json({authorized:false,error:'ResumeBuilder authentication is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)return NextResponse.json({authorized:false,error:'Sign in with an existing ResumeBuilder account first.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const result=await checkAdminRole(sb,user.id);
 if(result.status==='unavailable')return NextResponse.json({authorized:false,error:result.message},{status:503,headers:{'Cache-Control':'no-store'}});
 if(result.status==='not_admin')return NextResponse.json({authorized:false,error:'This account is signed in but has not been granted administrator access. Contact the ResumeBuilder owner to assign this account in admin_users.'},{status:403,headers:{'Cache-Control':'no-store'}});
 return NextResponse.json({authorized:true},{headers:{'Cache-Control':'private, no-store'}});
}
