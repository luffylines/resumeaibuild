/** Canonical public production origin for Supabase OAuth and email links. */
export function authReturnUrl(path:'/auth/callback'|'/auth/reset'):string{
 const configured=(process.env.NEXT_PUBLIC_SITE_URL||'').trim();
 if(configured){
  try{
   const url=new URL(configured);
   const local=url.hostname==='localhost'||url.hostname==='127.0.0.1';
   if(url.protocol==='https:'||(local&&url.protocol==='http:'))return url.origin+path;
  }catch{/* Invalid origin: fall back below. */}
 }
 if(typeof window!=='undefined')return window.location.origin+path;
 return path;
}
