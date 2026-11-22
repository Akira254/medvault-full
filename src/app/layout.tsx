import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'MedVault — Medical Revision Questions Bank',
  description: 'Access curated MCQs, SAQs, and essays categorized by units and topics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden max-w-full">
      <body className="min-h-screen w-full max-w-full overflow-x-hidden bg-navy-950 text-white antialiased">
        <div className="w-full max-w-full overflow-x-clip min-w-0">
          {children}
        </div>
      </body>
    </html>
  );
}