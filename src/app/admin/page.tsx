import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminPanel from '@/components/admin-panel';
import {serverSupabase} from '@/lib/supabase-server';
export const metadata={title:'Admin Dashboard | ResumeBuilder'};
export default async function Admin(){
 const sb=await serverSupabase();
 if(!sb)redirect('/admin/login');
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/admin/login');
 const {data,error}=await (sb as any).from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error)redirect('/admin/login?error=admin_role_unavailable');
 if(!data)redirect('/admin/login?error=not_admin');
 return <AdminPanel demo={false}/>;
}
