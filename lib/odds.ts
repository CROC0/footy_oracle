import type { GameOdds } from './types';

// The Odds API team name → Squiggle team name
const ODDS_TO_SQUIGGLE: Record<string, string> = {
  'Adelaide Crows':              'Adelaide',
  'Brisbane Lions':              'Brisbane',
  'Carlton Blues':               'Carlton',
  'Collingwood Magpies':         'Collingwood',
  'Essendon Bombers':            'Essendon',
  'Fremantle Dockers':           'Fremantle',
  'Geelong Cats':                'Geelong',
  'Gold Coast Suns':             'Gold Coast',
  'Greater Western Sydney Giants': 'Greater Western Sydney',
  'GWS Giants':                  'Greater Western Sydney',
  'Hawthorn Hawks':              'Hawthorn',
  'Melbourne Demons':            'Melbourne',
  'North Melbourne Kangaroos':   'North Melbourne',
  'Port Adelaide Power':         'Port Adelaide',
  'Richmond Tigers':             'Richmond',
  'St Kilda Saints':             'St Kilda',
  'Sydney Swans':                'Sydney',
  'West Coast Eagles':           'West Coast',
  'Western Bulldogs':            'Western Bulldogs',
};

interface OddsEvent {
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
}

function normalise(a: number, b: number): [number, number] {
  const t = a + b;
  return t === 0 ? [0.5, 0.5] : [a / t, b / t];
}

/** Stable lookup key — sorted so home/away order doesn't matter. */
function oddsKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/**
 * Fetch AFL h2h odds from The Odds API.
 * Returns a Map keyed by sorted "TeamA|TeamB" using Squiggle team names.
 * Prefers Sportsbet, falls back to any AU bookmaker.
 * Returns an empty Map when ODDS_API_KEY is not configured or on any error.
 */
export async function getOdds(): Promise<Map<string, GameOdds>> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return new Map();

  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/aussierules_afl/odds/?apiKey=${apiKey}&regions=au&markets=h2h`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      console.warn(`Odds API error: ${res.status}`);
      return new Map();
    }

    const events = await res.json() as OddsEvent[];
    const map = new Map<string, GameOdds>();

    for (const event of events) {
      const hTeam = ODDS_TO_SQUIGGLE[event.home_team] ?? event.home_team;
      const aTeam = ODDS_TO_SQUIGGLE[event.away_team] ?? event.away_team;

      // Prefer Sportsbet, else first available bookmaker
      const bookmaker =
        event.bookmakers.find(b => b.key === 'sportsbet') ??
        event.bookmakers[0];
      if (!bookmaker) continue;

      const market = bookmaker.markets.find(m => m.key === 'h2h');
      if (!market) continue;

      const homeOutcome = market.outcomes.find(o => o.name === event.home_team);
      const awayOutcome = market.outcomes.find(o => o.name === event.away_team);
      if (!homeOutcome || !awayOutcome) continue;

      // Normalise implied probabilities to remove bookmaker overround
      const [homeImpliedProb, awayImpliedProb] = normalise(
        1 / homeOutcome.price,
        1 / awayOutcome.price
      );

      map.set(oddsKey(hTeam, aTeam), {
        homeOdds: homeOutcome.price,
        awayOdds: awayOutcome.price,
        homeImpliedProb,
        awayImpliedProb,
        bookmaker: bookmaker.title,
      });
    }

    return map;
  } catch (err) {
    console.warn('Failed to fetch odds:', err);
    return new Map();
  }
}
