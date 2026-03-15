import type { Game, LadderEntry, Prediction } from './types';
import { completedGames, gamesForTeam } from './squiggle';

const WEIGHTS = {
  recentForm: 0.35,
  ladderPosition: 0.30,
  homeAdvantage: 0.25,
  headToHead: 0.10,
};

const TOTAL_TEAMS = 18;

/**
 * Calculate recent form score (0–1) for a team based on last N completed games.
 * Returns win percentage.
 */
function recentFormScore(
  teamName: string,
  games: Game[],
  n = 5
): number {
  const played = completedGames(gamesForTeam(games, teamName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, n);

  if (played.length === 0) return 0.5; // no data → neutral

  const wins = played.filter((g) => g.winner === teamName).length;
  const draws = played.filter(
    (g) => g.complete === 100 && g.winner === null
  ).length;
  return (wins + draws * 0.5) / played.length;
}

/**
 * Calculate ladder position score (0–1).
 * Rank 1 → 1.0, Rank 18 → 0.0
 */
function ladderPositionScore(
  teamName: string,
  ladder: LadderEntry[]
): number {
  const entry = ladder.find((e) => e.team === teamName);
  if (!entry) return 0.5;
  // rank is 1-based; invert so top team = 1.0
  return (TOTAL_TEAMS - entry.rank) / (TOTAL_TEAMS - 1);
}

/**
 * Home/away advantage base scores.
 * Home team gets a structural 0.6 vs away 0.4 (normalised later).
 */
function homeAdvantageScores(): { home: number; away: number } {
  return { home: 0.6, away: 0.4 };
}

/**
 * Head-to-head score based on historical games from given seasons.
 * Returns proportion of games the home team won vs the away team.
 */
function headToHeadScore(
  homeTeam: string,
  awayTeam: string,
  historicalGames: Game[]
): { home: number; away: number } {
  const h2h = historicalGames.filter(
    (g) =>
      (g.hteam === homeTeam && g.ateam === awayTeam) ||
      (g.hteam === awayTeam && g.ateam === homeTeam)
  );

  if (h2h.length === 0) return { home: 0.5, away: 0.5 };

  const homeWins = h2h.filter((g) => g.winner === homeTeam).length;
  const draws = h2h.filter((g) => g.complete === 100 && g.winner === null).length;
  const homeScore = (homeWins + draws * 0.5) / h2h.length;
  return { home: homeScore, away: 1 - homeScore };
}

/**
 * Normalise a pair of raw scores to sum to 1.
 */
function normalise(home: number, away: number): [number, number] {
  const total = home + away;
  if (total === 0) return [0.5, 0.5];
  return [home / total, away / total];
}

/**
 * Main prediction function.
 *
 * @param game           The upcoming game to predict
 * @param currentGames   2026 games (for recent form)
 * @param ladder         Current AFL ladder
 * @param historicalGames Games from 2023–2025 (for H2H)
 */
export function predictGame(
  game: Game,
  currentGames: Game[],
  ladder: LadderEntry[],
  historicalGames: Game[]
): Prediction {
  const homeTeam = game.hteam;
  const awayTeam = game.ateam;

  // Factor 1: Recent form
  const homeForm = recentFormScore(homeTeam, currentGames);
  const awayForm = recentFormScore(awayTeam, currentGames);
  const [normHomeForm, normAwayForm] = normalise(homeForm, awayForm);

  // Factor 2: Ladder position
  const homeLadder = ladderPositionScore(homeTeam, ladder);
  const awayLadder = ladderPositionScore(awayTeam, ladder);
  const [normHomeLadder, normAwayLadder] = normalise(homeLadder, awayLadder);

  // Factor 3: Home/away advantage
  const ha = homeAdvantageScores();
  const [normHomeHA, normAwayHA] = normalise(ha.home, ha.away);

  // Factor 4: Head-to-head
  const h2h = headToHeadScore(homeTeam, awayTeam, historicalGames);
  const [normHomeH2H, normAwayH2H] = normalise(h2h.home, h2h.away);

  // Combine weighted scores
  const rawHome =
    normHomeForm * WEIGHTS.recentForm +
    normHomeLadder * WEIGHTS.ladderPosition +
    normHomeHA * WEIGHTS.homeAdvantage +
    normHomeH2H * WEIGHTS.headToHead;

  const rawAway =
    normAwayForm * WEIGHTS.recentForm +
    normAwayLadder * WEIGHTS.ladderPosition +
    normAwayHA * WEIGHTS.homeAdvantage +
    normAwayH2H * WEIGHTS.headToHead;

  const [finalHome, finalAway] = normalise(rawHome, rawAway);

  return {
    homeWinProbability: Math.round(finalHome * 1000) / 1000,
    awayWinProbability: Math.round(finalAway * 1000) / 1000,
    factors: {
      recentForm: { home: normHomeForm, away: normAwayForm },
      ladderPosition: { home: normHomeLadder, away: normAwayLadder },
      homeAdvantage: { home: normHomeHA, away: normAwayHA },
      headToHead: { home: normHomeH2H, away: normAwayH2H },
    },
  };
}
