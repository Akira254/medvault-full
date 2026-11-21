import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'MedVault — Medical Revision Questions Bank',
    template: '%s | MedVault',
  },
  description:
    'Access curated MCQs, SAQs, and Essays categorized by units and topics for structured medical revision.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-navy-900 text-white">{children}</body>
    </html>
  );
}