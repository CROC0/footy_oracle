'use client';

import { useFavouriteTeam } from '@/hooks/useFavouriteTeam';
import TeamCard from './TeamCard';
import type { Team, LadderEntry, Game } from '@/lib/types';

interface Props {
  teams: Team[];
  games: Game[];
  ladder: LadderEntry[];
}

export default function TeamsGrid({ teams, games, ladder }: Props) {
  const { isFavourite } = useFavouriteTeam();

  // Only current AFL teams — Squiggle uses 9999 as "still active" sentinel
  const activeTeams = teams.filter((t) => !t.retirement || t.retirement > new Date().getFullYear());

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {activeTeams.map((team) => {
        const ladderEntry = ladder.find((e) => e.teamid === team.id);
        return (
          <TeamCard
            key={team.id}
            team={team}
            ladderEntry={ladderEntry}
            games={games}
            isFavourite={isFavourite(team.name)}
          />
        );
      })}
    </div>
  );
}
