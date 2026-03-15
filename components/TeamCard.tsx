import Link from 'next/link';
import type { Team, LadderEntry, Game, FormResult } from '@/lib/types';
import { gamesForTeam, completedGames, upcomingGames } from '@/lib/squiggle';
import FormGuide from './FormGuide';

interface Props {
  team: Team;
  ladderEntry?: LadderEntry;
  games: Game[];
  isFavourite?: boolean;
}

function getTeamForm(teamName: string, games: Game[]): FormResult[] {
  return completedGames(gamesForTeam(games, teamName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .reverse()
    .map((g): FormResult => {
      if (g.winner === teamName) return 'W';
      if (g.complete === 100 && g.winner === null) return 'D';
      return 'L';
    });
}

function getNextFixture(teamName: string, games: Game[]): Game | undefined {
  return upcomingGames(gamesForTeam(games, teamName)).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];
}

export default function TeamCard({ team, ladderEntry, games, isFavourite }: Props) {
  const form = getTeamForm(team.name, games);
  const nextGame = getNextFixture(team.name, games);
  const opponent = nextGame
    ? nextGame.hteam === team.name
      ? nextGame.ateam
      : nextGame.hteam
    : null;

  return (
    <Link href={`/teams/${team.id}`}>
      <div
        className={`rounded-xl border p-4 h-full hover:border-gold-500/50 transition-all cursor-pointer ${
          isFavourite
            ? 'border-gold-500 bg-slate-800/80 shadow-gold-500/20 shadow'
            : 'border-slate-700 bg-slate-800/50'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-bold text-base leading-tight ${isFavourite ? 'text-gold-400' : 'text-slate-100'}`}>
            {team.name}
            {isFavourite && <span className="ml-1 text-gold-500">★</span>}
          </h3>
          {ladderEntry && (
            <span className="text-slate-500 text-xs shrink-0 ml-2">
              #{ladderEntry.rank}
            </span>
          )}
        </div>

        {ladderEntry && (
          <p className="text-xs text-slate-500 mb-2">
            {ladderEntry.wins}W {ladderEntry.losses}L {ladderEntry.draws}D
            {' · '}{ladderEntry.pts} pts
          </p>
        )}

        <div className="mb-2">
          <FormGuide results={form} />
        </div>

        {nextGame && opponent && (
          <p className="text-xs text-slate-500 mt-2">
            Next: vs {opponent} (R{nextGame.round})
          </p>
        )}
        {!nextGame && (
          <p className="text-xs text-slate-500 mt-2">No upcoming games</p>
        )}
      </div>
    </Link>
  );
}
