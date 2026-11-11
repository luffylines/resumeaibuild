/** Server-only Gemini model selector. Legacy 2.5 Flash is unavailable on newly created keys. */
export function geminiModel(){
 const model=(process.env.GEMINI_MODEL||'').trim().replace(/^models\//,'');
 if(!model||model==='gemini-2.5-flash')return 'gemini-3.8-flash';
 return /^[a-zA-Z0-9._-]{4,70}$/.test(model)?model:'gemini-3.8-flash';
}
