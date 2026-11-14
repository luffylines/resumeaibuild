const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

const local=new Map();
const fake={
 owner:'person-one',
 mode:'ok',
 puts:0,
 reads:0,
 signed:0,
 removes:0,
 signal:0
};
const store={
 getItem:key=>local.get(key)||null,
 setItem:(key,value)=>{local.set(key,value);},
 removeItem:key=>{local.delete(key);}
};
const supabase={
 auth:{getUser:async()=>({data:{user:{id:fake.owner}},error:null})},
 storage:{from:bucket=>{
  assert.equal(bucket,'profile-avatars');
  return {
   upload:async(path,blob,options)=>{
    fake.puts++;
    assert.equal(path,fake.owner+'/avatar.jpg');
    assert.equal(options.contentType,'image/jpeg');
    assert.equal(options.upsert,true);
    assert.ok(blob.size>0);
    if(fake.mode==='no-bucket')return {error:new Error('Bucket not found')};
    if(fake.mode==='rls')return {error:new Error('new row violates row level security policy')};
    return {data:{path},error:null};
   },
   download:async path=>{
    fake.reads++;
    if(fake.mode==='cannot-read')return {data:null,error:new Error('permission denied')};
    assert.equal(path,fake.owner+'/avatar.jpg');
    return {data:new Blob(['jpeg-data'],{type:'image/jpeg'}),error:null};
   },
   createSignedUrl:async path=>{
    fake.signed++;
    return {data:{signedUrl:'https://private.example.test/object/sign/'+path+'?token=example'},error:null};
   },
   remove:async path=>{
    fake.removes++;
    if(fake.mode==='rls')return {error:new Error('permission denied')};
    return {data:[{name:path}],error:null};
   }
  };
 }}
};
const raw=fs.readFileSync('src/lib/profile-photo.ts','utf8');
const compiled=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const moduleRef={exports:{}};
const context={
 module:moduleRef,exports:moduleRef.exports,
 require:()=>({browserSupabase:()=>supabase}),
 window:{dispatchEvent:()=>{fake.signal++;}},
 localStorage:store,
 document:{createElement:()=>({
  width:0,height:0,
  getContext:()=>({fillStyle:'',fillRect:()=>{},drawImage:()=>{}}),
  toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from('jpeg-data').toString('base64')
 })},
 FileReader:class{
  result=null;
  onload=null;
  onerror=null;
  readAsDataURL(file){
   this.result='data:'+file.type+';base64,'+Buffer.from('jpeg-data').toString('base64');
   queueMicrotask(()=>this.onload?.());
  }
 },
 Image:class{
  naturalWidth=400;naturalHeight=200;
  set src(_){queueMicrotask(()=>this.onload?.());}
 },
 URL:{createObjectURL:()=> 'blob:local',
 revokeObjectURL:()=>{}},
 Event:class{constructor(type){this.type=type;}},
 fetch:async url=>{
  if(typeof url==='string'&&url.startsWith('/api/profile/avatar'))return {ok:false,status:503,json:async()=>({error:'Server-only Supabase key is not configured.'})};
  return {ok:true,blob:async()=>new Blob(['jpeg-data'],{type:'image/jpeg'})};
 },
 FormData:class{append(){}},
 Blob,Buffer,Map,Set,Date,Error,Promise,queueMicrotask,console
};
vm.runInNewContext(compiled,context);
const {photoKey,photoPendingKey,readProfilePhoto,isProfilePhotoPending,loadProfilePhoto,saveProfilePhoto,retryProfilePhotoSync,removeProfilePhoto,accountAvatar}=moduleRef.exports;
const input={type:'image/jpeg',size:100};
(async()=>{
 assert.equal(accountAvatar(null,[]),'/images/avatar.png');
 const first=await loadProfilePhoto(fake.owner);
 assert.match(first,/^https:\/\/private\.example\.test/);
 fake.mode='no-bucket';
 let preview='';
 const failed=await saveProfilePhoto(fake.owner,input,image=>{preview=image;});
 assert.equal(failed.cloudSaved,false);
 assert.equal(failed.localSaved,true);
 assert.match(failed.detail,/bucket is missing/);
 assert.ok(preview.startsWith('data:image/jpeg;base64,'));
 assert.equal(preview,failed.image,'Selected photo must be displayed without waiting for Storage');
 assert.equal(local.has(photoKey(fake.owner)),true);
 assert.equal(isProfilePhotoPending(fake.owner),true);
 const signedCount=fake.signed;
 const unsynced=await loadProfilePhoto(fake.owner);
 assert.equal(unsynced,preview,'Unsynced local photo must win over stale signed URL');
 assert.equal(fake.signed,signedCount,'Do not fetch old cloud image while local changes are pending');
 fake.mode='rls';
 await assert.rejects(()=>retryProfilePhotoSync(fake.owner),/SELECT, INSERT and UPDATE/);
 assert.equal(isProfilePhotoPending(fake.owner),true);
 fake.mode='cannot-read';
 const cannotRead=await retryProfilePhotoSync(fake.owner).catch(e=>e);
 assert.ok(cannotRead instanceof Error);
 assert.equal(isProfilePhotoPending(fake.owner),true,'Do not call an unverified write synced');
 fake.mode='ok';
 const synced=await retryProfilePhotoSync(fake.owner);
 assert.equal(synced.cloudSaved,true);
 assert.equal(isProfilePhotoPending(fake.owner),false);
 const remote=await loadProfilePhoto(fake.owner);
 assert.match(remote,/token=example&rbv=/,'Fresh signed URLs must be cache-busted');
 fake.mode='rls';
 const removal=await removeProfilePhoto(fake.owner);
 assert.equal(removal.localRemoved,false,'Failed cloud deletion must keep existing picture');
 assert.ok(readProfilePhoto(fake.owner));
 fake.mode='ok';
 const removed=await removeProfilePhoto(fake.owner);
 assert.equal(removed.cloudRemoved,true);
 assert.equal(readProfilePhoto(fake.owner),'');
 const cloudSaved=await saveProfilePhoto(fake.owner,input);
 assert.equal(cloudSaved.cloudSaved,true);
 assert.ok(fake.reads>=3,'Successful upload must be verified by authenticated download');
 assert.ok(fake.puts>=4);
 console.log('PASS avatar: local image before sync, RLS/bucket failures, verified cloud persistence, retry, signed URL invalidation, safe deletion');
})().catch(e=>{console.error(e);process.exitCode=1;});
