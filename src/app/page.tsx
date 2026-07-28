import Link from 'next/link'

export default function Home() {
  const links = [
    { href: '/order', label: 'Take orders' },
    { href: '/kitchen', label: 'Kitchen' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Food Stand Control</h1>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="w-full max-w-xs text-center bg-black text-white py-4 rounded-lg text-lg font-medium"
        >
          {l.label}
        </Link>
      ))}
    </main>
  )
}
