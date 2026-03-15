import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Footy Oracle — Predict. Compare. Win.',
  description: 'AFL game predictions, ladder standings, and team stats for the 2026 season.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-slate-700 mt-12 py-6 text-center text-slate-500 text-sm">
          <p>
            Data courtesy of{' '}
            <a
              href="https://squiggle.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-500 hover:underline"
            >
              Squiggle (squiggle.com.au)
            </a>
          </p>
          <p className="mt-1">Footy Oracle — Predict. Compare. Win.</p>
        </footer>
      </body>
    </html>
  );
}
