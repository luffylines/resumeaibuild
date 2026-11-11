/** Server-only Gemini text/audio model selection.
 * Prefer the lower-cost Flash-Lite model instead of the busy Flash model.
 * GEMINI_MODEL can override the preference; fallback remains available.
 */
const DEFAULT_MODEL='gemini-3.5-flash-lite';
const FALLBACK_MODEL='gemini-3.8-flash';
function validModel(value:string|undefined):string|null{
 const normalized=(value||'').trim().replace(/^models\//,'');
 return /^[a-zA-Z0-9._-]{4,70}$/.test(normalized)?normalized:null;
}
export function geminiModel():string{
 const configured=validModel(process.env.GEMINI_MODEL);
 // Retired versions must not silently keep breaking new deployments.
 return !configured||configured==='gemini-2.5-flash'||configured==='gemini-2.5-flash-lite'
  ?DEFAULT_MODEL:configured;
}
export function geminiModels():string[]{
 const primary=geminiModel();
 const extra=validModel(process.env.GEMINI_FALLBACK_MODEL);
 return Array.from(new Set([primary,extra,DEFAULT_MODEL,FALLBACK_MODEL].filter((x):x is string=>!!x)));
}
