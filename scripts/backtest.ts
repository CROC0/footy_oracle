/**
 * Backtest the trained prediction model against 2025 season results.
 *
 * For each completed 2025 game in round R, the model is given only data
 * that would have been available at that point:
 *   - Recent form: completed games from 2025 rounds < R
 *   - Elo:         running Elo updated after each completed game
 *   - H2H:         games from 2024 only (1yr window)
 */

import { predictGame, buildEloRatings } from '../lib/prediction';
import { completedGames, gamesForTeam, getRounds } from '../lib/squiggle';
import type { Game } from '../lib/types';

const BASE = 'https://api.squiggle.com.au/';
const UA = 'FootyOracle/1.0 (backtest)';

async function fetchGames(year: number): Promise<Game[]> {
  const res = await fetch(`${BASE}?q=games;year=${year}`, { headers: { 'User-Agent': UA } });
  const data = await res.json() as { games: Game[] };
  return data.games ?? [];
}

function predictedWinner(game: Game, pred: ReturnType<typeof predictGame>): string {
  return pred.homeWinProbability >= pred.awayWinProbability ? game.hteam : game.ateam;
}

async function main() {
  console.log('Fetching game data...');
  const [games2025, games2024, games2023, games2022] = await Promise.all([
    fetchGames(2025),
    fetchGames(2024),
    fetchGames(2023),
    fetchGames(2022),
  ]);

  // H2H: 1yr window (2024 only, per trained config)
  const historical = [...games2022, ...games2023, ...games2024];
  const rounds = getRounds(completedGames(games2025));

  console.log(`Backtesting ${completedGames(games2025).length} completed 2025 games across ${rounds.length} rounds...\n`);

  let totalPredicted = 0, totalCorrect = 0, totalDraws = 0;
  const roundResults: { round: number; correct: number; total: number; pct: string }[] = [];
  const teamStats = new Map<string, { predicted: number; correct: number }>();

  // Running Elo seeded from 2022–2024 (3 years), updated as 2025 games complete
  const runningElo = buildEloRatings([...games2022, ...games2023, ...games2024]);

  for (const round of rounds) {
    const priorGames = completedGames(games2025).filter(g => g.round < round);
    const roundGames = completedGames(games2025).filter(g => g.round === round);
    let roundCorrect = 0;

    for (const game of roundGames) {
      if (game.winner === null) { totalDraws++; continue; }

      const pred = predictGame(game, priorGames, historical, runningElo, 2025);
      const tip = predictedWinner(game, pred);
      const correct = tip === game.winner;

      if (correct) { totalCorrect++; roundCorrect++; }
      totalPredicted++;

      for (const team of [game.hteam, game.ateam]) {
        if (!teamStats.has(team)) teamStats.set(team, { predicted: 0, correct: 0 });
        const s = teamStats.get(team)!;
        s.predicted++;
        if (correct) s.correct++;
      }

      // Update running Elo after the game
      const ELO_K = 40;
      const ra = runningElo.get(game.hteamid) ?? 1500;
      const rb = runningElo.get(game.ateamid) ?? 1500;
      const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
      const margin = Math.abs((game.hscore ?? 0) - (game.ascore ?? 0));
      const k = ELO_K * (1 + Math.min(margin / 60, 1));
      const sa = game.winner === game.hteam ? 1 : 0;
      runningElo.set(game.hteamid, ra + k * (sa - ea));
      runningElo.set(game.ateamid, rb + k * ((1 - sa) - (1 - ea)));
    }

    const nonDraws = roundGames.filter(g => g.winner !== null).length;
    roundResults.push({
      round, correct: roundCorrect, total: nonDraws,
      pct: nonDraws > 0 ? `${((roundCorrect / nonDraws) * 100).toFixed(0)}%` : 'N/A',
    });
  }

  // ── Overall ──────────────────────────────────────────────────────────────
  const overallPct = ((totalCorrect / totalPredicted) * 100).toFixed(1);
  console.log('━'.repeat(52));
  console.log(`  OVERALL: ${totalCorrect}/${totalPredicted} correct  →  ${overallPct}%`);
  if (totalDraws > 0) console.log(`  (${totalDraws} drawn games excluded)`);
  console.log('━'.repeat(52));

  // ── Round breakdown ───────────────────────────────────────────────────────
  console.log('\nRound-by-round:');
  console.log('  Round  Correct  Total   %');
  for (const r of roundResults) {
    console.log(`  R${String(r.round).padEnd(5)} ${String(r.correct).padEnd(9)}${String(r.total).padEnd(8)}${r.pct}`);
  }

  // ── Per-team ──────────────────────────────────────────────────────────────
  const teamList = [...teamStats.entries()]
    .map(([team, s]) => ({ team, ...s, pct: (s.correct / s.predicted) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  console.log('\nPer-team accuracy:');
  console.log('  Team                          Correct  Total   %');
  for (const t of teamList) {
    console.log(`  ${t.team.padEnd(30)} ${String(t.correct).padEnd(9)}${String(t.predicted).padEnd(8)}${t.pct.toFixed(0)}%`);
  }

  // ── Favourite/underdog ────────────────────────────────────────────────────
  let favCorrect = 0, favTotal = 0;
  const elo2 = buildEloRatings([...games2022, ...games2023, ...games2024]);
  for (const round of rounds) {
    const priorGames = completedGames(games2025).filter(g => g.round < round);
    for (const game of completedGames(games2025).filter(g => g.round === round)) {
      if (game.winner === null) continue;
      const pred = predictGame(game, priorGames, historical, elo2, 2025);
      favTotal++;
      const fav = pred.homeWinProbability >= 0.5 ? game.hteam : game.ateam;
      if (game.winner === fav) favCorrect++;
      const ra = elo2.get(game.hteamid) ?? 1500, rb = elo2.get(game.ateamid) ?? 1500;
      const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
      const margin = Math.abs((game.hscore ?? 0) - (game.ascore ?? 0));
      const k = 40 * (1 + Math.min(margin / 60, 1));
      const sa = game.winner === game.hteam ? 1 : 0;
      elo2.set(game.hteamid, ra + k * (sa - ea));
      elo2.set(game.ateamid, rb + k * ((1 - sa) - (1 - ea)));
    }
  }
  console.log('\nFavourite vs underdog:');
  console.log(`  Favourite won: ${favCorrect}/${favTotal} (${((favCorrect/favTotal)*100).toFixed(1)}%)`);
  console.log(`  Upset wins:    ${favTotal - favCorrect}/${favTotal} (${(((favTotal-favCorrect)/favTotal)*100).toFixed(1)}%)`);
}

main().catch(console.error);
