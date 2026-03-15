import type { LadderEntry, Game, SquiggleLadderEntry } from '@/lib/types';
import { gamesForTeam, completedGames } from '@/lib/squiggle';
import FormGuide from './FormGuide';
import type { FormResult } from '@/lib/types';

interface Props {
  ladder: LadderEntry[];
  games: Game[];
  favouriteTeam?: string | null;
  predictions?: SquiggleLadderEntry[];
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

export default function LadderTable({ ladder, games, favouriteTeam, predictions }: Props) {
  const hasPredictions = predictions && predictions.length > 0;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-3 py-3 text-slate-400 font-medium w-8">#</th>
            <th className="text-left px-3 py-3 text-slate-400 font-medium">Team</th>
            <th className="text-center px-2 py-3 text-slate-400 font-medium">P</th>
            <th className="text-center px-2 py-3 text-slate-400 font-medium">W</th>
            <th className="text-center px-2 py-3 text-slate-400 font-medium">L</th>
            <th className="text-center px-2 py-3 text-slate-400 font-medium">D</th>
            <th className="text-center px-2 py-3 text-slate-400 font-medium hidden sm:table-cell">%</th>
            <th className="text-center px-2 py-3 text-slate-400 font-medium">Pts</th>
            {hasPredictions && (
              <th
                className="text-center px-2 py-3 font-medium hidden lg:table-cell"
                title="Squiggle predicted final wins and rank"
              >
                <span className="text-gold-500">Predicted</span>
              </th>
            )}
            <th className="text-left px-3 py-3 text-slate-400 font-medium hidden md:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {ladder.map((entry, idx) => {
            const isFav = entry.team === favouriteTeam;
            const pred = predictions?.find((p) => p.teamid === entry.teamid);
            return (
              <tr
                key={entry.teamid}
                className={`border-b border-slate-700/50 transition-colors ${
                  isFav
                    ? 'bg-gold-500/10 border-gold-500/20'
                    : idx % 2 === 0
                    ? 'bg-slate-800/30'
                    : ''
                } hover:bg-slate-700/40`}
              >
                <td className="px-3 py-2.5 text-slate-500">{entry.rank}</td>
                <td className="px-3 py-2.5 font-medium">
                  <span className={isFav ? 'text-gold-400' : 'text-slate-100'}>
                    {entry.team}
                    {isFav && <span className="ml-1 text-gold-500 text-xs">★</span>}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center text-slate-400">{entry.played}</td>
                <td className="px-2 py-2.5 text-center text-emerald-400">{entry.wins}</td>
                <td className="px-2 py-2.5 text-center text-red-400">{entry.losses}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{entry.draws}</td>
                <td className="px-2 py-2.5 text-center text-slate-400 hidden sm:table-cell">
                  {Number(entry.percentage).toFixed(1)}
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-100">{entry.pts}</td>
                {hasPredictions && (
                  <td className="px-2 py-2.5 text-center hidden lg:table-cell">
                    {pred ? (
                      <span className="text-gold-400 font-medium" title={`Predicted rank: #${pred.rank}`}>
                        #{Number(pred.mean_rank).toFixed(1)}
                        <span className="text-slate-500 font-normal ml-1 text-xs">
                          ({Number(pred.wins).toFixed(1)}W)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <FormGuide results={getTeamForm(entry.team, games)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasPredictions && (
        <p className="px-3 py-2 text-xs text-slate-600 border-t border-slate-700">
          Predicted = Squiggle mean final rank + expected wins at season end
        </p>
      )}
    </div>
  );
}
