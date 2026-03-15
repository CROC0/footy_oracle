import Link from 'next/link';
import { getTeams } from '@/lib/squiggle';
import FavouriteTeamPicker from './FavouriteTeamPicker';

const navLinks = [
  { href: '/', label: 'Upcoming' },
  { href: '/results', label: 'Results' },
  { href: '/ladder', label: 'Ladder' },
  { href: '/teams', label: 'Teams' },
];

export default async function Navbar() {
  const teams = await getTeams();

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-gold-500 font-bold text-xl tracking-tight">Footy Oracle</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-gold-500 hover:bg-slate-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Team picker */}
        <FavouriteTeamPicker teams={teams} />
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden flex border-t border-slate-700">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-1 text-center py-2 text-xs text-slate-400 hover:text-gold-500 hover:bg-slate-800 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
