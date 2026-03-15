/**
 * Training script v5 — community tips as a model feature.
 *
 * Tests whether blending our Elo+form model with the Squiggle community
 * tips (40+ models) improves accuracy beyond 73.5%.
 *
 * Community tips encode information we don't have: betting odds, injury news,
 * team selection. If the community aggregate adds unique signal, blending helps.
 *
 * Model: P(home) = w_model * modelProb + w_tips * communityHomeTipFrac
 *
 * Training: 2022–2024.  Validation: 2025.
 */

import { completedGames, gamesForTeam, getRounds } from '../lib/squiggle';
import type { Game, Tip } from '../lib/types';

const BASE = 'https://api.squiggle.com.au/';
const UA = 'FootyOracle/1.0 (training-v5)';

async function fetchGames(year: number): Promise<Game[]> {
  const res = await fetch(`${BASE}?q=games;year=${year}`, { headers: { 'User-Agent': UA } });
  const data = await res.json() as { games: Game[] };
  return data.games ?? [];
}

async function fetchTips(year: number): Promise<Tip[]> {
  const res = await fetch(`${BASE}?q=tips;year=${year}`, { headers: { 'User-Agent': UA } });
  const data = await res.json() as { tips: Tip[] };
  return data.tips ?? [];
}

/** Build gameid → home tip fraction map from raw tips. Returns null fraction if no tips available. */
function buildTipFractions(tips: Tip[], games: Game[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const game of games) {
    const gameTips = tips.filter(t => t.gameid === game.id);
    if (gameTips.length === 0) continue;
    const homeTips = gameTips.filter(t => t.tip === game.hteam).length;
    map.set(game.id, homeTips / gameTips.length);
  }
  return map;
}

// ─── Elo ─────────────────────────────────────────────────────────────────────

const ELO_START    = 1500;
const ELO_K        = 20;
const ELO_CARRYOVER = 0.55;

function eloExpected(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function processSeason(games: Game[], ratings: Map<number, number>): Map<number, number> {
  const r = new Map(ratings);
  const sorted = [...completedGames(games)].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (const g of sorted) {
    const ra = r.get(g.hteamid) ?? ELO_START;
    const rb = r.get(g.ateamid) ?? ELO_START;
    const ea = eloExpected(ra, rb);
    const margin = Math.abs((g.hscore ?? 0) - (g.ascore ?? 0));
    const k = ELO_K * (1 + Math.min(margin / 60, 1));
    const sa = g.winner === g.hteam ? 1 : g.winner === null ? 0.5 : 0;
    r.set(g.hteamid, ra + k * (sa - ea));
    r.set(g.ateamid, rb + k * ((1 - sa) - (1 - ea)));
  }
  return r;
}

function applyCarryover(ratings: Map<number, number>): Map<number, number> {
  const r = new Map<number, number>();
  for (const [id, v] of ratings) r.set(id, ELO_START + (v - ELO_START) * ELO_CARRYOVER);
  return r;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const FORM_WINDOW = 8;

function formScore(teamName: string, games: Game[]): number {
  const played = completedGames(gamesForTeam(games, teamName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, FORM_WINDOW);
  if (played.length === 0) return 0.5;
  let score = 0, totalWeight = 0;
  played.forEach((g, i) => {
    const w = FORM_WINDOW - i;
    totalWeight += w;
    const isHome = g.hteam === teamName;
    const tf = isHome ? (g.hscore ?? 0) : (g.ascore ?? 0);
    const ta = isHome ? (g.ascore ?? 0) : (g.hscore ?? 0);
    const sum = tf + ta;
    score += w * (sum > 0 ? tf / sum : (g.winner === teamName ? 1 : g.winner === null ? 0.5 : 0));
  });
  return score / totalWeight;
}

function normalise(a: number, b: number): [number, number] {
  const t = a + b;
  return t === 0 ? [0.5, 0.5] : [a / t, b / t];
}

/** Compute model probability for home team (0–1). */
function modelHomeProb(
  game: Game,
  priorGames: Game[],
  eloMap: Map<number, number>,
  wForm: number,
  wElo: number,
  wHA: number
): number {
  const hForm = formScore(game.hteam, priorGames);
  const aForm = formScore(game.ateam, priorGames);
  const [nHForm, nAForm] = normalise(hForm, aForm);

  const hElo = eloMap.get(game.hteamid) ?? ELO_START;
  const aElo = eloMap.get(game.ateamid) ?? ELO_START;
  const [nHElo, nAElo] = normalise(hElo, aElo);

  const rawH = nHForm * wForm + 0.6 * wHA + nHElo * wElo;
  const rawA = nAForm * wForm + 0.4 * wHA + nAElo * wElo;
  return normalise(rawH, rawA)[0];
}

function evaluate(
  seasonGames: Game[],
  prevSeasonGames: Game[],
  startingElo: Map<number, number>,
  tipFractions: Map<number, number>,
  wForm: number,
  wElo: number,
  wHA: number,
  wTips: number  // weight for community tips; (1-wTips) goes to model
): number {
  const runningElo = new Map(startingElo);
  const rounds = getRounds(completedGames(seasonGames));
  let correct = 0, total = 0;

  for (const round of rounds) {
    const priorGames = [...prevSeasonGames, ...completedGames(seasonGames).filter(g => g.round < round)];
    const roundGames = completedGames(seasonGames).filter(g => g.round === round);

    for (const game of roundGames) {
      if (game.winner === null) continue;

      const pModel = modelHomeProb(game, priorGames, runningElo, wForm, wElo, wHA);
      const tipFrac = tipFractions.get(game.id);

      let pHome: number;
      if (tipFrac !== undefined && wTips > 0) {
        pHome = (1 - wTips) * pModel + wTips * tipFrac;
      } else {
        pHome = pModel;
      }

      const tip = pHome >= 0.5 ? game.hteam : game.ateam;
      if (tip === game.winner) correct++;
      total++;

      const ra = runningElo.get(game.hteamid) ?? ELO_START;
      const rb = runningElo.get(game.ateamid) ?? ELO_START;
      const ea = eloExpected(ra, rb);
      const margin = Math.abs((game.hscore ?? 0) - (game.ascore ?? 0));
      const k = ELO_K * (1 + Math.min(margin / 60, 1));
      const sa = game.winner === game.hteam ? 1 : 0;
      runningElo.set(game.hteamid, ra + k * (sa - ea));
      runningElo.set(game.ateamid, rb + k * ((1 - sa) - (1 - ea)));
    }
  }
  return total > 0 ? correct / total : 0;
}

async function main() {
  console.log('Fetching 2021–2025 games + tips...');
  const [g21, g22, g23, g24, g25, t22, t23, t24, t25] = await Promise.all([
    fetchGames(2021),
    fetchGames(2022),
    fetchGames(2023),
    fetchGames(2024),
    fetchGames(2025),
    fetchTips(2022),
    fetchTips(2023),
    fetchTips(2024),
    fetchTips(2025),
  ]);

  console.log(`Tips loaded: 2022=${t22.length}, 2023=${t23.length}, 2024=${t24.length}, 2025=${t25.length}`);

  const tf22 = buildTipFractions(t22, g22);
  const tf23 = buildTipFractions(t23, g23);
  const tf24 = buildTipFractions(t24, g24);
  const tf25 = buildTipFractions(t25, g25);
  console.log(`Tip fractions computed: 2022=${tf22.size}, 2023=${tf23.size}, 2024=${tf24.size}, 2025=${tf25.size} games`);

  // Pre-compute starting Elos (using current best: K=20, carryover=0.55)
  const seedSeasons = [g21];  // use 2021 as seed; can extend if needed
  let state = new Map<number, number>();
  for (const season of seedSeasons) {
    state = applyCarryover(state);
    state = processSeason(season, state);
  }
  const start22 = applyCarryover(state);
  const end22   = processSeason(g22, start22);
  const start23 = applyCarryover(end22);
  const end23   = processSeason(g23, start23);
  const start24 = applyCarryover(end23);
  const end24   = processSeason(g24, start24);
  const start25 = applyCarryover(end24);

  // Best base model weights from v4
  const wForm = 0.40, wElo = 0.45, wHA = 0.15;

  // Test tip blend weights
  const tipWeights = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50];

  console.log('\nBase model (no tips):');
  const baseAcc = (
    evaluate(g22, g21, start22, tf22, wForm, wElo, wHA, 0) +
    evaluate(g23, g22, start23, tf23, wForm, wElo, wHA, 0) +
    evaluate(g24, g23, start24, tf24, wForm, wElo, wHA, 0)
  ) / 3;
  const baseVal = evaluate(g25, g24, start25, tf25, wForm, wElo, wHA, 0);
  console.log(`  train=${(baseAcc*100).toFixed(1)}%  val2025=${(baseVal*100).toFixed(1)}%`);

  console.log('\nTips blend results:');
  console.log('  wTips   Train    Val-25   Games with tips (2025)');

  let bestVal = baseVal;
  let bestWTips = 0;

  for (const wTips of tipWeights) {
    if (wTips === 0) continue;
    const trainAcc = (
      evaluate(g22, g21, start22, tf22, wForm, wElo, wHA, wTips) +
      evaluate(g23, g22, start23, tf23, wForm, wElo, wHA, wTips) +
      evaluate(g24, g23, start24, tf24, wForm, wElo, wHA, wTips)
    ) / 3;
    const val = evaluate(g25, g24, start25, tf25, wForm, wElo, wHA, wTips);
    const flag = val > bestVal ? ' ◄ best' : '';
    console.log(`  ${wTips.toFixed(2)}    ${(trainAcc*100).toFixed(1)}%    ${(val*100).toFixed(1)}%${flag}`);
    if (val > bestVal) { bestVal = val; bestWTips = wTips; }
  }

  // Also try: pure community tips (no model at all)
  const pureVal = evaluate(g25, g24, start25, tf25, wForm, wElo, wHA, 1.0);
  console.log(`  1.00    (pure tips)    ${(pureVal*100).toFixed(1)}%`);

  console.log('\n' + '━'.repeat(60));
  if (bestWTips > 0) {
    console.log(`Best blend: wTips=${bestWTips}  →  val2025=${(bestVal*100).toFixed(1)}%`);
    console.log(`Improvement over no-tips: +${((bestVal - baseVal)*100).toFixed(1)}pp`);
  } else {
    console.log(`Community tips do NOT improve predictions on 2025.`);
    console.log(`Best remains: no tips  →  val2025=${(baseVal*100).toFixed(1)}%`);
  }

  // Coverage check: how many 2025 games have tip data?
  const gamesWithTips = completedGames(g25).filter(g => tf25.has(g.id)).length;
  const totalGames = completedGames(g25).length;
  console.log(`\nTip data coverage (2025): ${gamesWithTips}/${totalGames} games`);
}

main().catch(console.error);
