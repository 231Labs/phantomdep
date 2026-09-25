import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PhantomDep Gate — block hallucinated npm deps',
  description:
    'Fail-closed GitHub Action: new npm deps must exist on the registry (and optionally on your allowlist). Engineering findings, not an SCA suite.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
