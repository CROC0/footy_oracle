import { Suspense } from 'react';
import { getGames, completedGames, getRounds, gamesByRound } from '@/lib/squiggle';
import GameCard from '@/components/GameCard';
import SeasonSelector from '@/components/SeasonSelector';

interface Props {
  searchParams: Promise<{ year?: string }>;
}

async function ResultsContent({ year }: { year: number }) {
  const games = await getGames(year);
  const done = completedGames(games);
  const rounds = getRounds(done).reverse(); // newest first

  if (done.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No completed games for the {year} season.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {rounds.map((round) => {
        const roundGames = gamesByRound(done, round);
        return (
          <section key={round}>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 border-b border-slate-700 pb-2">
              Round {round}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roundGames.map((game) => (
                <GameCard key={game.id} game={game} showScore />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default async function ResultsPage({ searchParams }: Props) {
  const { year: yearParam } = await searchParams;
  const year = parseInt(yearParam ?? '2026', 10);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Results</h1>
        <p className="text-slate-400 mt-1">{year} AFL Season</p>
      </div>
      <Suspense fallback={null}>
        <SeasonSelector currentYear={year} />
      </Suspense>
      <Suspense
        fallback={
          <div className="text-center py-16 text-slate-500">Loading results...</div>
        }
      >
        <ResultsContent year={year} />
      </Suspense>
    </div>
  );
}
