import {redirect} from 'next/navigation';
import AdminPanel from '@/components/admin-panel';
import {serverSupabase} from '@/lib/supabase-server';
export default async function Admin(){
 const sb=await serverSupabase();
 if(!sb)return <AdminPanel demo/>;
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/login');
 const {data,error}=await (sb as any).from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error||!data)return <main className="admin-denied"><h1>Administrator access required</h1><p>This page is restricted to verified ResumeBuilder administrators. A new account does not automatically become an admin.</p><a href="/app">Return to my dashboard</a></main>;
 return <AdminPanel demo={false}/>;
}
