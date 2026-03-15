import { Suspense } from 'react';
import { getTeams, getGames, computeStandings } from '@/lib/squiggle';
import TeamsGrid from '@/components/TeamsGrid';

async function TeamsContent() {
  const [teams, games] = await Promise.all([getTeams(), getGames(2026)]);
  const ladder = computeStandings(games);

  return <TeamsGrid teams={teams} games={games} ladder={ladder} />;
}

export default function TeamsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Teams</h1>
        <p className="text-slate-400 mt-1">2026 season overview</p>
      </div>
      <Suspense
        fallback={
          <div className="text-center py-16 text-slate-500">Loading teams...</div>
        }
      >
        <TeamsContent />
      </Suspense>
    </div>
  );
}
