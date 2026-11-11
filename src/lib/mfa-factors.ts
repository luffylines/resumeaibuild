export type MfaFactor={id:string;friendly_name?:string;status?:string;factor_type?:string};
export type MfaFactorList={all?:MfaFactor[];totp:MfaFactor[]};

/** The SDK's .totp can contain only active factors. Use .all to find
 * in-progress, unverified attempts that cause "factor already exists".
 */
export function classifyFactors(data:MfaFactorList){
 const all=Array.isArray(data.all)?data.all:data.totp;
 const totp=all.filter(f=>f.factor_type==='totp'||(!f.factor_type&&data.totp.some(x=>x.id===f.id)));
 return {
  verified:totp.filter(f=>f.status==='verified'),
  unverified:totp.filter(f=>f.status==='unverified')
 };
}
export function requiresMfaChallenge(data:MfaFactorList,currentLevel:string|null|undefined){
 return classifyFactors(data).verified.length>0&&currentLevel!=='aal2';
}
