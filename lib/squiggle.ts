import type { Game, Team, Tip, LadderEntry, SquiggleLadderEntry, Source } from './types';

const BASE_URL = 'https://api.squiggle.com.au/';
const USER_AGENT = 'FootyOracle/1.0 (footy-oracle; predict.compare.win)';

async function squiggleFetch<T>(
  query: string,
  revalidate: number
): Promise<T> {
  const url = `${BASE_URL}?${query}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Squiggle API error ${res.status} for query: ${query}`);
  }
  return res.json() as Promise<T>;
}

// --- Games ---

export async function getGames(year: number): Promise<Game[]> {
  const revalidate = year === new Date().getFullYear() ? 300 : 86400;
  const data = await squiggleFetch<{ games: Game[] }>(
    `q=games;year=${year}`,
    revalidate
  );
  return data.games ?? [];
}

export async function getGamesForRound(year: number, round: number): Promise<Game[]> {
  const revalidate = year === new Date().getFullYear() ? 300 : 86400;
  const data = await squiggleFetch<{ games: Game[] }>(
    `q=games;year=${year};round=${round}`,
    revalidate
  );
  return data.games ?? [];
}

// --- Tips ---

export async function getTips(year: number, round: number): Promise<Tip[]> {
  const data = await squiggleFetch<{ tips: Tip[] }>(
    `q=tips;year=${year};round=${round}`,
    3600
  );
  return data.tips ?? [];
}

// --- Squiggle probabilistic ladder ---

export async function getSquiggleLadder(year: number): Promise<SquiggleLadderEntry[]> {
  const revalidate = year === new Date().getFullYear() ? 3600 : 86400;
  const data = await squiggleFetch<{ ladder: SquiggleLadderEntry[] }>(
    `q=ladder;year=${year}`,
    revalidate
  );
  return data.ladder ?? [];
}

// --- Standings (computed from game results) ---

/** Compute actual AFL standings from completed game results. */
export function computeStandings(games: Game[]): LadderEntry[] {
  const done = completedGames(games);
  const map = new Map<number, LadderEntry>();

  for (const g of done) {
    const sides: [string, number, number, number][] = [
      [g.hteam, g.hteamid, g.hscore ?? 0, g.ascore ?? 0],
      [g.ateam, g.ateamid, g.ascore ?? 0, g.hscore ?? 0],
    ];
    for (const [teamName, teamId, scored, conceded] of sides) {
      if (!map.has(teamId)) {
        map.set(teamId, {
          rank: 0, team: teamName, teamid: teamId,
          played: 0, wins: 0, losses: 0, draws: 0,
          for: 0, against: 0, percentage: 0, pts: 0,
        });
      }
      const e = map.get(teamId)!;
      e.played++;
      e.for += scored;
      e.against += conceded;
      if (g.winner === teamName) e.wins++;
      else if (g.winner === null) e.draws++;
      else e.losses++;
    }
  }

  const entries = [...map.values()].map((e) => ({
    ...e,
    pts: e.wins * 4 + e.draws * 2,
    percentage: e.against > 0 ? (e.for / e.against) * 100 : 100,
  }));

  entries.sort((a, b) => b.pts - a.pts || b.percentage - a.percentage);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}

// --- Teams ---

export async function getTeams(): Promise<Team[]> {
  const data = await squiggleFetch<{ teams: Team[] }>(`q=teams`, 86400);
  return data.teams ?? [];
}

// --- Sources ---

export async function getSources(): Promise<Source[]> {
  const data = await squiggleFetch<{ sources: Source[] }>(`q=sources`, 86400);
  return data.sources ?? [];
}

// --- Helper utilities ---

/** Returns the current round number (first round with incomplete games, else last round). */
export function detectCurrentRound(games: Game[]): number {
  const upcoming = games.filter((g) => g.complete < 100);
  if (upcoming.length > 0) {
    return Math.min(...upcoming.map((g) => g.round));
  }
  // All complete — return last round
  return Math.max(...games.map((g) => g.round));
}

/** Returns all unique rounds in the game list, sorted ascending. */
export function getRounds(games: Game[]): number[] {
  return [...new Set(games.map((g) => g.round))].sort((a, b) => a - b);
}

/** Filter games to a specific round. */
export function gamesByRound(games: Game[], round: number): Game[] {
  return games.filter((g) => g.round === round);
}

/** Games involving a specific team (by name). */
export function gamesForTeam(games: Game[], teamName: string): Game[] {
  return games.filter(
    (g) => g.hteam === teamName || g.ateam === teamName
  );
}

/** Completed games only (complete === 100). */
export function completedGames(games: Game[]): Game[] {
  return games.filter((g) => g.complete === 100);
}

/** Upcoming games only (complete < 100). */
export function upcomingGames(games: Game[]): Game[] {
  return games.filter((g) => g.complete < 100);
}
