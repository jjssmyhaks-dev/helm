import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Helm — AI Operating System for Solo Founders',
  description: 'Your AI-powered virtual team. Research, marketing, operations, and finance — all coordinated.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
