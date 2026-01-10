import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-secondary to-white/40 dark:from-black dark:to-neutral-900">
        <h2 className="text-2xl font-semibold">Welcome to Manokamna Admin</h2>
        <p className="opacity-80 mt-2">Manage products, categories, stock and orders. Branding: Royal, minimal, premium.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card href="/users" title="Users" desc="View users and open their orders" />
        <Card href="/products" title="Products" desc="Add/Edit/Delete products" />
        <Card href="/categories" title="Categories" desc="Manage visibility and order" />
        <Card href="/orders" title="Orders" desc="Preview and manage customer orders" />
        <Card href="/flash-sale" title="Flash Sale" desc="Configure flash sale status, title and end time" />
        <Card href="/hero-banner" title="Hero Banner" desc="Manage homepage hero banner text, image and visibility" />
        <Card href="/requested-products" title="Requested Products" desc="Review and manage customer product requests" />
      </div>
    </div>
  );
}

function Card({ href = '#', title, desc }: { href?: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:shadow hover:border-accent transition focus:outline-none focus:ring-2 focus:ring-accent">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm opacity-75 mt-1">{desc}</p>
    </Link>
  );
}
