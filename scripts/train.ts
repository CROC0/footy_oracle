/**
 * Training script for the Footy Oracle prediction model.
 *
 * Grid-searches over weights and feature variants.
 * Training set: 2022–2024.  Validation set: 2025.
 */

import { computeStandings, completedGames, gamesForTeam, getRounds } from '../lib/squiggle';
import type { Game, LadderEntry } from '../lib/types';

const BASE = 'https://api.squiggle.com.au/';
const UA = 'FootyOracle/1.0 (training)';

async function fetchGames(year: number): Promise<Game[]> {
  const res = await fetch(`${BASE}?q=games;year=${year}`, { headers: { 'User-Agent': UA } });
  const data = await res.json() as { games: Game[] };
  return data.games ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Elo rating engine
// ─────────────────────────────────────────────────────────────────────────────

const ELO_START = 1500;
const ELO_K = 40;

function eloExpected(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

/** Build a map of teamid → elo after processing all provided games in date order. */
function buildElo(games: Game[]): Map<number, number> {
  const ratings = new Map<number, number>();
  const get = (id: number) => ratings.get(id) ?? ELO_START;

  const sorted = [...completedGames(games)].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const g of sorted) {
    const ra = get(g.hteamid);
    const rb = get(g.ateamid);
    const ea = eloExpected(ra, rb);
    const margin = Math.abs((g.hscore ?? 0) - (g.ascore ?? 0));
    // Scale K by margin (diminishing returns above 60 pts)
    const kScale = 1 + Math.min(margin / 60, 1);
    const k = ELO_K * kScale;

    let sa: number;
    if (g.winner === g.hteam) sa = 1;
    else if (g.winner === null) sa = 0.5;
    else sa = 0;

    ratings.set(g.hteamid, ra + k * (sa - ea));
    ratings.set(g.ateamid, rb + k * ((1 - sa) - (1 - ea)));
  }
  return ratings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature calculations
// ─────────────────────────────────────────────────────────────────────────────

type FormMethod = 'simple' | 'margin' | 'recency';

function formScore(
  teamName: string,
  games: Game[],
  window: number,
  method: FormMethod
): number {
  const played = completedGames(gamesForTeam(games, teamName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, window);

  if (played.length === 0) return 0.5;

  if (method === 'simple') {
    const wins = played.filter(g => g.winner === teamName).length;
    const draws = played.filter(g => g.winner === null).length;
    return (wins + draws * 0.5) / played.length;
  }

  if (method === 'margin') {
    // Score each game as team_pts / (team_pts + opp_pts) — margin-aware
    let total = 0;
    for (const g of played) {
      const isHome = g.hteam === teamName;
      const tf = isHome ? (g.hscore ?? 0) : (g.ascore ?? 0);
      const ta = isHome ? (g.ascore ?? 0) : (g.hscore ?? 0);
      const sum = tf + ta;
      total += sum > 0 ? tf / sum : 0.5;
    }
    return total / played.length;
  }

  // recency: weight most recent game highest (window, window-1, ..., 1)
  let score = 0, totalWeight = 0;
  played.forEach((g, i) => {
    const w = window - i;
    totalWeight += w;
    const isHome = g.hteam === teamName;
    const tf = isHome ? (g.hscore ?? 0) : (g.ascore ?? 0);
    const ta = isHome ? (g.ascore ?? 0) : (g.hscore ?? 0);
    const sum = tf + ta;
    score += w * (sum > 0 ? tf / sum : (g.winner === teamName ? 1 : g.winner === null ? 0.5 : 0));
  });
  return score / totalWeight;
}

function ladderScore(teamName: string, ladder: LadderEntry[]): number {
  const entry = ladder.find(e => e.team === teamName);
  if (!entry) return 0.5;
  return (18 - entry.rank) / 17;
}

function h2hScore(
  homeTeam: string,
  awayTeam: string,
  historical: Game[],
  yearsBack: number,
  currentYear: number
): { home: number; away: number } {
  const cutoff = currentYear - yearsBack;
  const games = historical.filter(
    g => g.year >= cutoff &&
      ((g.hteam === homeTeam && g.ateam === awayTeam) ||
       (g.hteam === awayTeam && g.ateam === homeTeam))
  );
  if (games.length === 0) return { home: 0.5, away: 0.5 };
  const homeWins = games.filter(g => g.winner === homeTeam).length;
  const draws = games.filter(g => g.winner === null).length;
  const h = (homeWins + draws * 0.5) / games.length;
  return { home: h, away: 1 - h };
}

function eloFactorScore(
  teamId: number,
  eloMap: Map<number, number>
): number {
  return eloMap.get(teamId) ?? ELO_START;
}

function normalise(a: number, b: number): [number, number] {
  const t = a + b;
  return t === 0 ? [0.5, 0.5] : [a / t, b / t];
}

// ─────────────────────────────────────────────────────────────────────────────
// Model config + evaluation
// ─────────────────────────────────────────────────────────────────────────────

interface Weights {
  form: number;
  ladder: number;
  homeAdv: number;
  h2h: number;
  elo: number;
}

interface Config {
  weights: Weights;
  formWindow: number;
  formMethod: FormMethod;
  h2hYears: number;
}

function predictWinner(
  game: Game,
  priorGames: Game[],
  ladder: LadderEntry[],
  historical: Game[],
  eloMap: Map<number, number>,
  cfg: Config,
  currentYear: number
): string | null {
  const { weights: w, formWindow, formMethod, h2hYears } = cfg;

  const hForm = formScore(game.hteam, priorGames, formWindow, formMethod);
  const aForm = formScore(game.ateam, priorGames, formWindow, formMethod);
  const [nHForm, nAForm] = normalise(hForm, aForm);

  const hLad = ladderScore(game.hteam, ladder);
  const aLad = ladderScore(game.ateam, ladder);
  const [nHLad, nALad] = normalise(hLad, aLad);

  const [nHHA, nAHA] = [0.6, 0.4]; // home advantage (constant)

  const h2h = h2hScore(game.hteam, game.ateam, historical, h2hYears, currentYear);
  const [nHH2H, nAH2H] = normalise(h2h.home, h2h.away);

  const hElo = eloFactorScore(game.hteamid, eloMap);
  const aElo = eloFactorScore(game.ateamid, eloMap);
  const [nHElo, nAElo] = normalise(hElo, aElo);

  const rawH = nHForm * w.form + nHLad * w.ladder + nHHA * w.homeAdv + nHH2H * w.h2h + nHElo * w.elo;
  const rawA = nAForm * w.form + nALad * w.ladder + nAHA * w.homeAdv + nAH2H * w.h2h + nAElo * w.elo;

  return rawH >= rawA ? game.hteam : game.ateam;
}

function evaluate(
  seasonGames: Game[],
  historical: Game[],
  eloSeed: Game[],    // games used to seed Elo before this season starts
  cfg: Config,
  currentYear: number
): number {
  const rounds = getRounds(completedGames(seasonGames));
  let correct = 0, total = 0;

  // Elo is seeded from prior seasons then updated as the current season progresses
  const runningElo = buildElo(eloSeed);

  for (const round of rounds) {
    const priorGames = completedGames(seasonGames).filter(g => g.round < round);
    const ladder = computeStandings(priorGames);
    const roundGames = completedGames(seasonGames).filter(g => g.round === round);

    for (const game of roundGames) {
      if (game.winner === null) continue;

      const tip = predictWinner(game, priorGames, ladder, historical, runningElo, cfg, currentYear);
      if (tip === game.winner) correct++;
      total++;

      // Update Elo after the game
      const ra = runningElo.get(game.hteamid) ?? ELO_START;
      const rb = runningElo.get(game.ateamid) ?? ELO_START;
      const ea = eloExpected(ra, rb);
      const margin = Math.abs((game.hscore ?? 0) - (game.ascore ?? 0));
      const kScale = 1 + Math.min(margin / 60, 1);
      const k = ELO_K * kScale;
      const sa = game.winner === game.hteam ? 1 : game.winner === null ? 0.5 : 0;
      runningElo.set(game.hteamid, ra + k * (sa - ea));
      runningElo.set(game.ateamid, rb + k * ((1 - sa) - (1 - ea)));
    }
  }

  return total > 0 ? correct / total : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid search
// ─────────────────────────────────────────────────────────────────────────────

function* weightCombinations(step: number): Generator<Weights> {
  const steps = Math.round(1 / step);
  for (let f = 0; f <= steps; f++) {
    for (let l = 0; l <= steps - f; l++) {
      for (let h = 0; h <= steps - f - l; h++) {
        for (let t = 0; t <= steps - f - l - h; t++) {
          const e = steps - f - l - h - t;
          yield {
            form: f * step,
            ladder: l * step,
            homeAdv: h * step,
            h2h: t * step,
            elo: e * step,
          };
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching data...');
  const [g2021, g2022, g2023, g2024, g2025] = await Promise.all([
    fetchGames(2021),
    fetchGames(2022),
    fetchGames(2023),
    fetchGames(2024),
    fetchGames(2025),
  ]);

  // Training: evaluate each config across 2022, 2023, 2024 (avg accuracy)
  // Validation: 2025
  const trainSeasons = [
    { games: g2022, historical: [...g2021], eloSeed: [...g2021], year: 2022 },
    { games: g2023, historical: [...g2021, ...g2022], eloSeed: [...g2021, ...g2022], year: 2023 },
    { games: g2024, historical: [...g2021, ...g2022, ...g2023], eloSeed: [...g2021, ...g2022, ...g2023], year: 2024 },
  ];

  const formMethods: FormMethod[] = ['simple', 'margin', 'recency'];
  const formWindows = [5, 8];
  const h2hYears = [1, 2, 3];

  const results: { cfg: Config; trainAcc: number; label: string }[] = [];
  let tested = 0;

  console.log('Running grid search (this may take a minute)...\n');

  for (const formMethod of formMethods) {
    for (const formWindow of formWindows) {
      for (const h2hYear of h2hYears) {
        for (const weights of weightCombinations(0.10)) {
          tested++;
          const cfg: Config = { weights, formWindow, formMethod, h2hYears: h2hYear };

          // Average accuracy over training seasons
          let totalAcc = 0;
          for (const s of trainSeasons) {
            totalAcc += evaluate(s.games, s.historical, s.eloSeed, cfg, s.year);
          }
          const trainAcc = totalAcc / trainSeasons.length;

          results.push({
            cfg,
            trainAcc,
            label: `form=${formMethod}/${formWindow} h2h=${h2hYear}yr w=[${weights.form.toFixed(1)},${weights.ladder.toFixed(1)},${weights.homeAdv.toFixed(1)},${weights.h2h.toFixed(1)},${weights.elo.toFixed(1)}]`,
          });
        }
      }
    }
  }

  // Sort by training accuracy descending
  results.sort((a, b) => b.trainAcc - a.trainAcc);

  console.log(`Tested ${tested.toLocaleString()} configurations.\n`);
  console.log('Top 10 configs by training accuracy (2022–2024):');
  console.log('─'.repeat(80));

  // Validate top 20 on 2025 to pick the best generalising config
  const top20 = results.slice(0, 20);
  const validationResults: { label: string; trainAcc: number; val2025: number; cfg: Config }[] = [];

  for (const r of top20) {
    const val = evaluate(
      g2025,
      [...g2022, ...g2023, ...g2024],
      [...g2022, ...g2023, ...g2024],
      r.cfg,
      2025
    );
    validationResults.push({ label: r.label, trainAcc: r.trainAcc, val2025: val, cfg: r.cfg });
  }

  validationResults.sort((a, b) => b.val2025 - a.val2025);

  console.log('\nTop 10 by 2025 validation accuracy:');
  console.log('─'.repeat(90));
  console.log('  Train    Val-25   Config');
  for (const r of validationResults.slice(0, 10)) {
    console.log(`  ${(r.trainAcc * 100).toFixed(1)}%    ${(r.val2025 * 100).toFixed(1)}%     ${r.label}`);
  }

  // Best config
  const best = validationResults[0];
  console.log('\n' + '━'.repeat(90));
  console.log(`BEST CONFIG  →  train: ${(best.trainAcc * 100).toFixed(1)}%  |  2025 validation: ${(best.val2025 * 100).toFixed(1)}%`);
  console.log('━'.repeat(90));
  console.log('\nWeights:');
  console.log(`  form (${best.cfg.formMethod}, window=${best.cfg.formWindow}): ${(best.cfg.weights.form * 100).toFixed(0)}%`);
  console.log(`  ladder:           ${(best.cfg.weights.ladder * 100).toFixed(0)}%`);
  console.log(`  homeAdvantage:    ${(best.cfg.weights.homeAdv * 100).toFixed(0)}%`);
  console.log(`  headToHead (${best.cfg.h2hYears}yr): ${(best.cfg.weights.h2h * 100).toFixed(0)}%`);
  console.log(`  elo:              ${(best.cfg.weights.elo * 100).toFixed(0)}%`);

  // Compare to baseline (original weights, no Elo)
  const baseline: Config = {
    weights: { form: 0.35, ladder: 0.30, homeAdv: 0.25, h2h: 0.10, elo: 0.00 },
    formWindow: 5,
    formMethod: 'simple',
    h2hYears: 3,
  };
  const baselineVal = evaluate(
    g2025,
    [...g2022, ...g2023, ...g2024],
    [...g2022, ...g2023, ...g2024],
    baseline,
    2025
  );
  console.log(`\nBaseline (original model, no Elo): ${(baselineVal * 100).toFixed(1)}%`);
  console.log(`Improvement: +${((best.val2025 - baselineVal) * 100).toFixed(1)}pp`);
}

main().catch(console.error);
