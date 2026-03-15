import { Suspense } from 'react';
import { getGames, getTips, detectCurrentRound, computeStandings } from '@/lib/squiggle';
import HomeGamesView from '@/components/HomeGamesView';

async function GamesContent() {
  const [games2026, games2023, games2024, games2025] = await Promise.all([
    getGames(2026),
    getGames(2023),
    getGames(2024),
    getGames(2025),
  ]);
  const ladder = computeStandings(games2026);

  const currentRound = detectCurrentRound(games2026);
  const tips = await getTips(2026, currentRound);
  const historicalGames = [...games2023, ...games2024, ...games2025];

  return (
    <HomeGamesView
      games2026={games2026}
      historicalGames={historicalGames}
      ladder={ladder}
      tips={tips}
    />
  );
}

export default function HomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gold-500">Footy Oracle</h1>
        <p className="text-slate-400 mt-1">Predict. Compare. Win. — 2026 AFL Season</p>
      </div>
      <Suspense
        fallback={
          <div className="text-center py-16 text-slate-500">
            Loading games...
          </div>
        }
      >
        <GamesContent />
      </Suspense>
    </div>
  );
}
