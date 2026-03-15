import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  getTeams,
  getGames,
  computeStandings,
  gamesForTeam,
  completedGames,
} from '@/lib/squiggle';
import type { Game, FormResult } from '@/lib/types';
import FormGuide from '@/components/FormGuide';
import GameCard from '@/components/GameCard';

interface Props {
  params: Promise<{ teamId: string }>;
}

function getForm(teamName: string, games: Game[]): FormResult[] {
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Australia/Perth',
  });
}

async function TeamDetailContent({ teamId }: { teamId: number }) {
  const [teams, games2026, games2023, games2024, games2025] = await Promise.all([
    getTeams(),
    getGames(2026),
    getGames(2023),
    getGames(2024),
    getGames(2025),
  ]);
  const ladder = computeStandings(games2026);

  const team = teams.find((t) => t.id === teamId);
  if (!team) return notFound();

  const ladderEntry = ladder.find((e) => e.teamid === team.id);
  const teamGames2026 = gamesForTeam(games2026, team.name);
  const completedTeamGames = completedGames(teamGames2026).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const recentGames = completedTeamGames.slice(0, 5);
  const form = getForm(team.name, games2026);

  // Head-to-head stats vs all opponents
  const historicalGames = [...games2023, ...games2024, ...games2025];
  const h2hMap = new Map<string, { wins: number; losses: number; draws: number }>();

  for (const g of completedGames(historicalGames)) {
    const isHome = g.hteam === team.name;
    const isAway = g.ateam === team.name;
    if (!isHome && !isAway) continue;

    const opponent = isHome ? g.ateam : g.hteam;
    if (!h2hMap.has(opponent)) {
      h2hMap.set(opponent, { wins: 0, losses: 0, draws: 0 });
    }
    const record = h2hMap.get(opponent)!;

    if (g.winner === team.name) record.wins++;
    else if (g.winner === null) record.draws++;
    else record.losses++;
  }

  const h2hEntries = [...h2hMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-8">
      {/* Team header */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h1 className="text-3xl font-bold text-gold-500 mb-1">{team.name}</h1>
        <p className="text-slate-400 text-sm mb-4">2026 AFL Season</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {ladderEntry ? (
            <>
              <Stat label="Ladder" value={`#${ladderEntry.rank}`} />
              <Stat label="Record" value={`${ladderEntry.wins}W ${ladderEntry.losses}L ${ladderEntry.draws}D`} />
              <Stat label="Points" value={String(ladderEntry.pts)} />
              <Stat label="%" value={Number(ladderEntry.percentage).toFixed(1)} />
            </>
          ) : (
            <p className="text-slate-500 col-span-4">No ladder data yet.</p>
          )}
        </div>

        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Recent Form</p>
          <FormGuide results={form} />
        </div>
      </div>

      {/* Recent games */}
      {recentGames.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent Games</h2>
          <div className="space-y-3">
            {recentGames.map((g) => (
              <div key={g.id} className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center gap-4">
                <span className="text-xs text-slate-500 w-16 shrink-0">{formatDate(g.date)}</span>
                <span className="text-sm text-slate-400 w-12 shrink-0">R{g.round}</span>
                <div className="flex-1 text-sm">
                  <span className={g.winner === g.hteam ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                    {g.hteam}
                  </span>
                  <span className="text-slate-600 mx-1">{g.hscore}–{g.ascore}</span>
                  <span className={g.winner === g.ateam ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                    {g.ateam}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  g.winner === team.name
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : g.winner === null
                    ? 'bg-slate-600/40 text-slate-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {g.winner === team.name ? 'W' : g.winner === null ? 'D' : 'L'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Head-to-head */}
      {h2hEntries.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">
            Head-to-Head (2023–2025)
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Opponent</th>
                  <th className="text-center px-3 py-3 text-emerald-400 font-medium">W</th>
                  <th className="text-center px-3 py-3 text-red-400 font-medium">L</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium">D</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium">Win%</th>
                </tr>
              </thead>
              <tbody>
                {h2hEntries.map(([opponent, record]) => {
                  const total = record.wins + record.losses + record.draws;
                  const winPct = total > 0 ? Math.round((record.wins / total) * 100) : 0;
                  return (
                    <tr key={opponent} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 text-slate-200">{opponent}</td>
                      <td className="px-3 py-2.5 text-center text-emerald-400">{record.wins}</td>
                      <td className="px-3 py-2.5 text-center text-red-400">{record.losses}</td>
                      <td className="px-3 py-2.5 text-center text-slate-400">{record.draws}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-medium ${winPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {winPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}

export default async function TeamDetailPage({ params }: Props) {
  const { teamId } = await params;
  const id = parseInt(teamId, 10);
  if (isNaN(id)) notFound();

  return (
    <Suspense
      fallback={
        <div className="text-center py-16 text-slate-500">Loading team...</div>
      }
    >
      <TeamDetailContent teamId={id} />
    </Suspense>
  );
}
