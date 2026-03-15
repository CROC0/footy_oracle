import { Suspense } from 'react';
import { getGames, getTips, detectCurrentRound } from '@/lib/squiggle';
import { buildEloRatings } from '@/lib/prediction';
import HomeGamesView from '@/components/HomeGamesView';

const CURRENT_YEAR = 2026;

async function GamesContent() {
  const [games2026, games2023, games2024, games2025] = await Promise.all([
    getGames(CURRENT_YEAR),
    getGames(2023),
    getGames(2024),
    getGames(2025),
  ]);

  const currentRound = detectCurrentRound(games2026);
  const tips = await getTips(CURRENT_YEAR, currentRound);

  // Build Elo with season carry-over (matches training config: K=20, carryover=0.55)
  const eloRatings = buildEloRatings([games2023, games2024, games2025, games2026]);

  // Cross-season form: pass 2025 games alongside 2026 so early-round predictions
  // can fall back to prior season form when few 2026 games are completed.
  // H2H is unused (weight=0) but historicalGames kept for API compat.
  const historicalGames = [...games2023, ...games2024, ...games2025];

  // Serialise Map to array of entries for RSC → Client Component prop passing
  const eloEntries = [...eloRatings.entries()] as [number, number][];

  return (
    <HomeGamesView
      games2026={games2026}
      formGames={[...games2025, ...games2026]}
      historicalGames={historicalGames}
      eloRatings={eloEntries}
      tips={tips}
      currentYear={CURRENT_YEAR}
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
        fallback={<div className="text-center py-16 text-slate-500">Loading games...</div>}
      >
        <GamesContent />
      </Suspense>
    </div>
  );
}
