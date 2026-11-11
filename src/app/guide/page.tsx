import Link from 'next/link';
import {ArrowLeft,ArrowRight,Check,CheckCircle2,FileText,Lock,Mail,MousePointer2,ShieldCheck,Sparkles,UserRound} from 'lucide-react';
const number=(n:number)=><span className="guide-step-number">{n}</span>;
function MiniNav(){return <div className="guide-mini-nav"><span><FileText size={12}/> ResumeBuilder</span><span>Home</span><span>Features</span><Link href="/login">Log In</Link><Link href="/signup">Sign Up Free</Link></div>;}
function MiniSignup(){return <div className="guide-mini-form"><div className="guide-mini-form-icon"><Mail size={17}/></div><strong>Create an Account</strong><small>Get started with ResumeBuilder</small><Link href="/signup" className="mini-google"><span>G</span> Continue with Google</Link><em>or</em><label>Email Address</label><div className="guide-mini-fake-input">you@example.com</div><Link href="/signup" className="guide-mini-primary">Send OTP Code</Link></div>;}
function MiniVerify(){return <div className="guide-mini-form"><div className="guide-mini-form-icon"><Mail size={17}/></div><strong>Verify Your Email</strong><small>Enter the 6-digit code from your inbox</small><div className="guide-mini-otp">{[0,0,0,0,0,0].map((n,i)=><span key={i}>{n}</span>)}</div><Link href="/signup" className="guide-mini-primary">Verify Account</Link></div>;}
function MiniLogin(){return <div className="guide-mini-form"><div className="guide-mini-form-icon"><Lock size={17}/></div><strong>Log In to ResumeBuilder</strong><small>Welcome back! Please log in.</small><Link href="/login" className="mini-google"><span>G</span> Continue with Google</Link><em>or</em><div className="guide-mini-fake-input">you@example.com</div><div className="guide-mini-fake-input">••••••••</div><Link href="/login" className="guide-mini-primary">Log In</Link></div>;}
export default function Guide(){return <main className="public-site guide-page"><div className="public-container">
 <nav className="guide-nav"><Link href="/" className="public-logo"><span className="public-logo-mark"><FileText size={18}/></span>ResumeBuilder</Link><Link href="/" className="public-outline"><ArrowLeft size={16}/> Back to Homepage</Link></nav>
 <div className="public-section-head guide-heading"><span>GET STARTED IN MINUTES</span><h1>How to <em>Register and Log In</em></h1><p>Create your account in just a few steps and start building your resume.</p></div>
 <div className="guide-walkthrough">
 <section className="guide-large-step">{number(1)}<div className="guide-step-copy"><h2>Go to the Homepage</h2><p>Visit ResumeBuilder and click “Sign Up Free” to create a new account.</p></div><div className="guide-mini-window"><MiniNav/><MousePointer2 className="guide-mouse" size={22}/></div></section>
 <div className="guide-two-grid">
 <section className="guide-explain-card">{number(2)}<div className="guide-step-copy"><h2>Create Your Account</h2><p>Sign up using Google or Email (with OTP verification).</p></div><MiniSignup/></section>
 <section className="guide-explain-card">{number(3)}<div className="guide-step-copy"><h2>Verify Your Email (OTP)</h2><p>Check your inbox for the 6-digit code, enter it, and verify your account.</p></div><MiniVerify/></section>
 </div>
 <div className="guide-two-grid">
 <section className="guide-explain-card">{number(4)}<div className="guide-step-copy"><h2>Log In to Your Account</h2><p>After registration, click “Log In” and use Google or your email credentials.</p></div><MiniLogin/></section>
 <section className="guide-ready-card"><span className="guide-ready-icon"><Check size={32}/></span><h2>You're Ready!</h2><p>Once logged in, you can now build your resume, review your ATS score, find job matches, and access all AI career tools.</p><Link href="/app" className="public-primary">Go to Dashboard <ArrowRight size={16}/></Link></section>
 </div>
 </div>
 <p className="guide-disclaimer"><ShieldCheck size={15}/> The smaller form previews are illustrations. Use the linked real forms to register, verify or sign in. Authentication requires your separate ResumeBuilder Supabase project.</p>
 </div></main>;}
