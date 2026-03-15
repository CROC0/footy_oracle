import type { Game, Prediction } from './types';
import { completedGames, gamesForTeam } from './squiggle';

/**
 * Trained weights (grid search on 2022–2024, validated on 2025).
 * Backtest accuracy: ~73.5% on 2025 season.
 *
 * Key findings:
 *  - Cross-season form (prior season fallback for early rounds) is a big win
 *  - Lower K (20 vs 40) with stronger carry-over regression (0.55) improves Elo stability
 *  - Recency-weighted form over 8 games beats simple margin or short windows
 *  - H2H and ladder add no signal; home advantage is small (15%)
 */
const WEIGHTS = {
  recentForm:    0.40,
  elo:           0.45,
  homeAdvantage: 0.15,
};

const ELO_START      = 1500;
const ELO_K          = 20;
const ELO_CARRYOVER  = 0.55;  // regress toward mean between seasons
const FORM_WINDOW    = 8;

// ─── Elo ─────────────────────────────────────────────────────────────────────

function eloExpected(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function applyCarryover(ratings: Map<number, number>, factor: number): Map<number, number> {
  const r = new Map<number, number>();
  for (const [id, v] of ratings) r.set(id, ELO_START + (v - ELO_START) * factor);
  return r;
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

/**
 * Build Elo ratings by processing seasons in chronological order.
 * Between seasons, ratings regress toward ELO_START by ELO_CARRYOVER.
 *
 * @param seasons  Array of seasons in chronological order (e.g. [games2022, games2023, games2024, games2026])
 */
export function buildEloRatings(seasons: Game[][]): Map<number, number> {
  let ratings = new Map<number, number>();
  for (const season of seasons) {
    ratings = applyCarryover(ratings, ELO_CARRYOVER);
    ratings = processSeason(season, ratings);
  }
  return ratings;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

/**
 * Recency-weighted form over the last FORM_WINDOW games.
 * Cross-season: if fewer than FORM_WINDOW current-season games exist,
 * the caller should include prior-season games in `games` (pass [...prevSeason, ...currentSeason]).
 * Since games are sorted newest-first, prior-season games naturally fill the gaps.
 */
function recentFormScore(teamName: string, games: Game[]): number {
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

function normalise(home: number, away: number): [number, number] {
  const t = home + away;
  return t === 0 ? [0.5, 0.5] : [home / t, away / t];
}

// ─── Main predict ─────────────────────────────────────────────────────────────

/**
 * Predict win probabilities for a game.
 *
 * @param game                 The game to predict
 * @param currentGames         Games for recent form. Pass [...prevSeasonGames, ...currentSeason]
 *                             for cross-season form fallback in early rounds.
 * @param eloRatings           Pre-built Elo map from buildEloRatings()
 * @param communityTipFrac     Optional: fraction of community models tipping the home team (0–1).
 *                             When provided, blended at 5% weight for a small accuracy boost.
 */
export function predictGame(
  game: Game,
  currentGames: Game[],
  _historicalGames: Game[], // kept for API compatibility; H2H weight is 0
  eloRatings: Map<number, number>,
  _currentYear?: number,
  communityTipFrac?: number
): Prediction {
  const homeTeam = game.hteam;
  const awayTeam = game.ateam;

  const hForm = recentFormScore(homeTeam, currentGames);
  const aForm = recentFormScore(awayTeam, currentGames);
  const [normHForm, normAForm] = normalise(hForm, aForm);

  const hElo = eloRatings.get(game.hteamid) ?? ELO_START;
  const aElo = eloRatings.get(game.ateamid) ?? ELO_START;
  const [normHElo, normAElo] = normalise(hElo, aElo);

  const [normHHA, normAHA] = [0.6, 0.4];

  const rawHome =
    normHForm * WEIGHTS.recentForm +
    normHElo  * WEIGHTS.elo +
    normHHA   * WEIGHTS.homeAdvantage;

  const rawAway =
    normAForm * WEIGHTS.recentForm +
    normAElo  * WEIGHTS.elo +
    normAHA   * WEIGHTS.homeAdvantage;

  let [finalHome, finalAway] = normalise(rawHome, rawAway);

  // Blend community tips at 5% weight when available (adds ~0.5pp from external information)
  if (communityTipFrac !== undefined) {
    finalHome = 0.95 * finalHome + 0.05 * communityTipFrac;
    finalAway = 0.95 * finalAway + 0.05 * (1 - communityTipFrac);
  }

  return {
    homeWinProbability: Math.round(finalHome * 1000) / 1000,
    awayWinProbability: Math.round(finalAway * 1000) / 1000,
    factors: {
      recentForm:    { home: normHForm, away: normAForm },
      elo:           { home: normHElo,  away: normAElo  },
      homeAdvantage: { home: normHHA,   away: normAHA   },
      headToHead:    { home: 0.5,       away: 0.5       }, // kept for type compatibility
    },
  };
}
