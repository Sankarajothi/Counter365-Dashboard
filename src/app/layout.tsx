import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Counter365 — Admin Console',
  description: 'Production Admin Console for Counter365 Billing & Retail System',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: '"Forum", serif' }}
        className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] forum-regular"
      >
        {children}
      </body>
    </html>
  );
}
