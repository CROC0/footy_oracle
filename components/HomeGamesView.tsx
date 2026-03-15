'use client';

import { useState } from 'react';
import type { Game, Tip } from '@/lib/types';
import { gamesByRound, getRounds, detectCurrentRound } from '@/lib/squiggle';
import { predictGame } from '@/lib/prediction';
import { useFavouriteTeam } from '@/hooks/useFavouriteTeam';
import RoundSelector from './RoundSelector';
import GameCard from './GameCard';
import type { SquiggleTipSummary } from '@/lib/types';

interface Props {
  games2026: Game[];
  formGames: Game[];       // [...prevSeason, ...games2026] for cross-season form fallback
  historicalGames: Game[];
  eloRatings: [number, number][]; // serialised Map entries [teamid, rating]
  tips: Tip[];
  currentYear: number;
}

function buildTipSummary(gameid: number, tips: Tip[], homeTeam: string, awayTeam: string): SquiggleTipSummary {
  const gameTips = tips.filter((t) => t.gameid === gameid);
  if (gameTips.length === 0) return { tipCount: 0, homeTips: 0, awayTips: 0, homeConfidence: null };

  const homeTips = gameTips.filter((t) => t.tip === homeTeam).length;
  const awayTips = gameTips.filter((t) => t.tip === awayTeam).length;
  const confidences = gameTips
    .map((t) => Number(t.hconfidence))
    .filter((n) => !isNaN(n) && n > 0);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : null;

  return { tipCount: gameTips.length, homeTips, awayTips, homeConfidence: avgConfidence };
}

export default function HomeGamesView({ games2026, formGames, historicalGames, eloRatings, tips, currentYear }: Props) {
  const rounds = getRounds(games2026);
  const defaultRound = detectCurrentRound(games2026);
  const [selectedRound, setSelectedRound] = useState(defaultRound);
  const { isFavourite } = useFavouriteTeam();

  // Reconstruct Map from serialised entries (Maps can't be passed as RSC props)
  const eloMap = new Map<number, number>(eloRatings);

  const roundGames = gamesByRound(games2026, selectedRound);
  const upcomingRoundGames = roundGames.filter((g) => g.complete < 100);
  const completedRoundGames = roundGames.filter((g) => g.complete === 100);

  return (
    <>
      <RoundSelector rounds={rounds} currentRound={selectedRound} onSelect={setSelectedRound} />

      {upcomingRoundGames.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Upcoming — Round {selectedRound}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingRoundGames.map((game) => {
              const squiggleTips = buildTipSummary(game.id, tips, game.hteam, game.ateam);
              const communityTipFrac = squiggleTips.tipCount > 0
                ? squiggleTips.homeTips / squiggleTips.tipCount
                : undefined;
              const prediction = predictGame(game, formGames, historicalGames, eloMap, currentYear, communityTipFrac);
              const favGame = isFavourite(game.hteam) || isFavourite(game.ateam);
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  prediction={prediction}
                  squiggleTips={squiggleTips}
                  isFavouriteGame={favGame}
                />
              );
            })}
          </div>
        </section>
      )}

      {completedRoundGames.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Completed — Round {selectedRound}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedRoundGames.map((game) => {
              const favGame = isFavourite(game.hteam) || isFavourite(game.ateam);
              return (
                <GameCard key={game.id} game={game} isFavouriteGame={favGame} showScore />
              );
            })}
          </div>
        </section>
      )}

      {roundGames.length === 0 && (
        <p className="text-slate-500 text-center py-12">No games for Round {selectedRound}</p>
      )}
    </>
  );
}
