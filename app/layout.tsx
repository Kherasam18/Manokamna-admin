export const metadata = {
  title: 'Manokamna Admin',
  description: 'Admin panel for Manokamna',
};

import '../styles/globals.css';
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black dark:bg-black dark:text-white">
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden md:block border-r border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-lg font-semibold mb-4">Manokamna</div>
            <nav className="space-y-1 text-sm">
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/">Dashboard</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/users">Users</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/products">Products</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/categories">Categories</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/orders">Orders</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/flash-sale">Flash Sale</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/hero-banner">Hero Banner</Link>
              <Link className="block px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/requested-products">Requested Products</Link>
            </nav>
          </aside>
          <div className="flex flex-col min-h-screen">
            <header className="border-b border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold">Admin</h1>
              <span className="text-sm opacity-70">Your Beauty, Your Town</span>
            </header>
            <main className="p-6 max-w-6xl w-full mx-auto flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
