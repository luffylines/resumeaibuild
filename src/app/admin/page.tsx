import Link from 'next/link';
import {ArrowLeft,LockKeyhole,ShieldAlert,ShieldCheck} from 'lucide-react';
import AdminPanel from '@/components/admin-panel';
import {serverSupabase} from '@/lib/supabase-server';
import {redirect} from 'next/navigation';

export const metadata={title:'Admin Dashboard | ResumeBuilder',description:'Restricted ResumeBuilder administrative workspace'};
export default async function Admin(){
 const sb=await serverSupabase();
 if(!sb)return <AdminPanel demo/>;
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/login');
 const {data,error}=await (sb as any).from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error||!data)return <main className="admin-denied-page"><section className="admin-denied-panel">
   <span className="admin-denied-icon"><LockKeyhole size={28}/></span>
   <span className="admin-denied-eyebrow"><ShieldAlert size={15}/> RESTRICTED WORKSPACE</span>
   <h1>Admin access required</h1>
   <p>You are signed in to ResumeBuilder, but this account does not have administrator privileges. Regular users cannot view the administrator's data.</p>
   <div className="admin-denied-info"><ShieldCheck size={21}/><span>For the project owner: set up the <strong>separate ResumeBuilder Supabase project</strong>, then add your authenticated user ID to <code>public.admin_users</code> using the Supabase SQL Editor. Do not grant access by editing browser storage.</span></div>
   <Link className="admin-denied-back" href="/app"><ArrowLeft size={17}/> Return to user dashboard</Link>
  </section></main>;
 return <AdminPanel demo={false}/>;
}
