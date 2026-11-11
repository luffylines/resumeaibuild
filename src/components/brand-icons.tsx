import type {SVGProps} from 'react';

type IconProps=SVGProps<SVGSVGElement>&{size?:number};

/** Official-style four-color Google G, used consistently in OAuth affordances. */
export function GoogleIcon({size=20,...props}:IconProps){
 return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" {...props}>
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6c4.51-4.17 7.07-10.33 7.07-17.65Z"/>
  <path fill="#FBBC05" d="M10.53 28.59A14.66 14.66 0 0 1 9.78 24c0-1.64.27-3.16.75-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/>
 </svg>;
}

/** Simple white document + sparkle glyph for the ResumeBuilder mark. */
export function BrandMark({size=21,...props}:IconProps){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
  <path d="M6.8 3.5h7.1l3.7 3.7v12.1c0 .8-.6 1.4-1.4 1.4H6.8c-.8 0-1.4-.6-1.4-1.4V4.9c0-.8.6-1.4 1.4-1.4Z"/>
  <path d="M13.8 3.8V7h3.4M8.2 11.1h4.5M8.2 14.2h4.2M8.2 17.3h2.6"/>
  <path d="m17.9 10.5.55 1.65 1.65.55-1.65.55-.55 1.65-.55-1.65-1.65-.55 1.65-.55.55-1.65Z" fill="currentColor" stroke="none"/>
 </svg>;
}
