'use client';

import { useFavouriteTeam } from '@/hooks/useFavouriteTeam';
import type { Team } from '@/lib/types';

interface Props {
  teams: Team[];
}

export default function FavouriteTeamPicker({ teams }: Props) {
  const { favouriteTeam, setFavouriteTeam } = useFavouriteTeam();

  return (
    <div className="relative">
      <select
        value={favouriteTeam ?? ''}
        onChange={(e) => setFavouriteTeam(e.target.value || null)}
        className="bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 appearance-none cursor-pointer"
        aria-label="Select favourite team"
      >
        <option value="">My Team</option>
        {teams.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {favouriteTeam && (
        <button
          onClick={() => setFavouriteTeam(null)}
          className="ml-2 text-slate-400 hover:text-gold-500 text-xs"
          aria-label="Clear favourite team"
        >
          ✕
        </button>
      )}
    </div>
  );
}
