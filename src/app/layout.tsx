import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '30916 San Francisco de Asís',
    template: '%s | 30916 San Francisco de Asís',
  },
  description: 'Sistema de control de asistencia escolar - I.E. 30916 San Francisco de Asís',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Asistencia',
  },
};

export const viewport: Viewport = {
  themeColor: '#8B6914',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <TooltipProvider delayDuration={200} skipDelayDuration={400}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: 'var(--radius)',
                background: 'var(--card)',
                color: 'var(--card-foreground)',
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-card-hover)',
              },
              success: {
                iconTheme: { primary: '#8B6914', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: '#c0392b', secondary: '#ffffff' },
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
