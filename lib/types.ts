// Squiggle API types

export interface Game {
  id: number;
  round: number;
  year: number;
  roundname: string;
  date: string; // ISO datetime string
  tz: string;
  hteam: string;
  ateam: string;
  hteamid: number;
  ateamid: number;
  hscore: number | null;
  ascore: number | null;
  winner: string | null;
  winnerteamid: number | null;
  venue: string;
  complete: number; // 0–100, percentage complete
  is_final: number;
  is_grand_final: number;
}

export interface Team {
  id: number;
  name: string;
  abbrev: string;
  logo: string;
  debut: number;
  retirement: number | null; // 9999 = still active
}

export interface Tip {
  id: number;
  round: number;
  year: number;
  gameid: number;
  sourceid: number;
  source: string;
  hteam: string;
  ateam: string;
  hteamid: number;
  ateamid: number;
  tip: string;
  tipteamid: number;
  margin: number | null;
  hconfidence: number | null; // 0–100
  correct: number | null; // 1 = correct, 0 = wrong, null = unplayed
}

export interface LadderEntry {
  rank: number;
  team: string;
  teamid: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  for: number;
  against: number;
  percentage: number;
  pts: number;
}

/** Raw Squiggle probabilistic ladder entry (predicted final standings) */
export interface SquiggleLadderEntry {
  team: string;
  teamid: number;
  rank: number;        // predicted final rank (integer)
  mean_rank: string;   // mean predicted rank (float string, e.g. "4.7988")
  wins: string;        // predicted final wins (float string, e.g. "14.80")
  percentage: string;  // predicted final percentage (float string)
}

export interface Source {
  id: number;
  name: string;
  url: string;
  icon: string;
  description: string;
}

// App-specific types

export interface Prediction {
  homeWinProbability: number; // 0–1
  awayWinProbability: number; // 0–1
  factors: {
    recentForm: { home: number; away: number };
    elo: { home: number; away: number };
    homeAdvantage: { home: number; away: number };
    headToHead: { home: number; away: number };
  };
}

export interface SquiggleTipSummary {
  tipCount: number; // total models
  homeTips: number;
  awayTips: number;
  homeConfidence: number | null; // average hconfidence from Squiggle community model
}

export type FormResult = 'W' | 'L' | 'D';

export interface GameOdds {
  homeOdds: number;          // decimal odds (e.g. 1.85)
  awayOdds: number;
  homeImpliedProb: number;   // normalised (overround removed), 0–1
  awayImpliedProb: number;
  bookmaker: string;         // e.g. "Sportsbet"
}
