import { Suspense } from 'react';
import { getGames, computeStandings, getSquiggleLadder } from '@/lib/squiggle';
import LadderWithFavourite from '@/components/LadderWithFavourite';
import SeasonSelector from '@/components/SeasonSelector';

interface Props {
  searchParams: Promise<{ year?: string }>;
}

async function LadderContent({ year }: { year: number }) {
  const [games, predictions] = await Promise.all([
    getGames(year),
    getSquiggleLadder(year),
  ]);
  const ladder = computeStandings(games);

  if (ladder.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No results available for the {year} season yet.
      </div>
    );
  }

  return <LadderWithFavourite ladder={ladder} games={games} predictions={predictions} />;
}

export default async function LadderPage({ searchParams }: Props) {
  const { year: yearParam } = await searchParams;
  const year = parseInt(yearParam ?? '2026', 10);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">AFL Ladder</h1>
        <p className="text-slate-400 mt-1">{year} Season Standings</p>
      </div>
      <Suspense fallback={null}>
        <SeasonSelector currentYear={year} />
      </Suspense>
      <Suspense
        fallback={
          <div className="text-center py-16 text-slate-500">Loading ladder...</div>
        }
      >
        <LadderContent year={year} />
      </Suspense>
    </div>
  );
}
