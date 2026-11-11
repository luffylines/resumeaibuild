const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/lib/mfa-factors.ts','utf8');
const output=ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const moduleRef={exports:{}};
vm.runInNewContext(output,{module:moduleRef,exports:moduleRef.exports});
const {classifyFactors,requiresMfaChallenge}=moduleRef.exports;
const stale={id:'unverified-old',factor_type:'totp',status:'unverified',friendly_name:'ResumeBuilder Authenticator'};
const active={id:'verified-current',factor_type:'totp',status:'verified',friendly_name:'ResumeBuilder Authenticator'};
const sms={id:'phone-verified',factor_type:'phone',status:'verified'};
let classified=classifyFactors({all:[stale],totp:[]});
assert.deepEqual([...classified.verified],[]);
assert.deepEqual([...classified.unverified].map(x=>x.id),['unverified-old']);
assert.equal(requiresMfaChallenge({all:[stale],totp:[]},'aal1'),false);
classified=classifyFactors({all:[stale,active,sms],totp:[active]});
assert.deepEqual([...classified.verified].map(x=>x.id),['verified-current']);
assert.deepEqual([...classified.unverified].map(x=>x.id),['unverified-old']);
assert.equal(requiresMfaChallenge({all:[stale,active,sms],totp:[active]},'aal1'),true);
assert.equal(requiresMfaChallenge({all:[stale,active,sms],totp:[active]},'aal2'),false);
assert.equal(requiresMfaChallenge({all:[sms],totp:[]},'aal1'),false);
assert.deepEqual([...classifyFactors({totp:[active]}).verified].map(x=>x.id),['verified-current']);
console.log('PASS verified and unverified MFA factors are distinct, stale setup does not lock users out, only verified TOTP requires challenge');
