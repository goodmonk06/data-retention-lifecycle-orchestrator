import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Retention Orchestrator',
  description: 'Manage data retention policies and compliance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <nav className="navbar">
            <div className="nav-brand">
              <Link href="/">🗃️ Retention Orchestrator</Link>
            </div>
            <div className="nav-links">
              <Link href="/">Dashboard</Link>
              <Link href="/data-sources">Data Sources</Link>
              <Link href="/retention-rules">Retention Rules</Link>
              <Link href="/retention-jobs">Job History</Link>
            </div>
          </nav>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
