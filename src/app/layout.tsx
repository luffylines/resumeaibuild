import type { Metadata, Viewport } from 'next';
import './globals.css';
import './ui.css';
import './resume-templates.css';
import './template-gallery.css';
import './mobile-modern.css';
import GlobalToastHost from '@/components/global-toast-host';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
export const metadata: Metadata = {
  title: 'ResumeBuilder — AI Resume Builder & Professional Templates',
  description: 'Create professional photo-ready resumes, check ATS readiness, generate cover letters and practice interviews.',
  icons: {icon:'/images/logo.png',shortcut:'/images/logo.png',apple:'/images/logo.png'}
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<GlobalToastHost/></body></html>;
}
