import type { Game, Prediction, SquiggleTipSummary } from '@/lib/types';
import PredictionPanel from './PredictionPanel';

interface Props {
  game: Game;
  prediction?: Prediction;
  squiggleTips?: SquiggleTipSummary;
  isFavouriteGame?: boolean;
  showScore?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Perth',
  });
}

export default function GameCard({
  game,
  prediction,
  squiggleTips,
  isFavouriteGame = false,
  showScore = false,
}: Props) {
  const isComplete = game.complete === 100;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isFavouriteGame
          ? 'border-gold-500 bg-slate-800/80 shadow-gold-500/20 shadow-lg'
          : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      {/* Header: venue + round */}
      <div className="flex justify-between items-start mb-3 text-xs text-slate-500">
        <span>{game.roundname}</span>
        <span>{game.venue}</span>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex-1 text-left">
          <p className={`font-bold text-lg leading-tight ${game.winner === game.hteam ? 'text-emerald-400' : isComplete ? 'text-slate-400' : 'text-slate-100'}`}>
            {game.hteam}
          </p>
          {showScore && isComplete ? (
            <p className="text-3xl font-bold mt-1 text-slate-100">{game.hscore ?? '—'}</p>
          ) : null}
        </div>

        {/* VS / score divider */}
        <div className="text-slate-600 font-bold text-sm shrink-0">
          {isComplete && showScore ? (
            <span className="text-slate-500">vs</span>
          ) : (
            <span>vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 text-right">
          <p className={`font-bold text-lg leading-tight ${game.winner === game.ateam ? 'text-emerald-400' : isComplete ? 'text-slate-400' : 'text-slate-100'}`}>
            {game.ateam}
          </p>
          {showScore && isComplete ? (
            <p className="text-3xl font-bold mt-1 text-slate-100">{game.ascore ?? '—'}</p>
          ) : null}
        </div>
      </div>

      {/* Date/time */}
      <p className="text-xs text-slate-500 mt-2 text-center">
        {formatDate(game.date)} AWST
      </p>

      {/* Favourite badge */}
      {isFavouriteGame && (
        <div className="mt-2 text-center">
          <span className="inline-block px-2 py-0.5 text-xs bg-gold-500/20 text-gold-400 rounded-full border border-gold-500/30">
            ★ Your team
          </span>
        </div>
      )}

      {/* Prediction panel — only for upcoming games */}
      {!isComplete && prediction && (
        <PredictionPanel
          homeTeam={game.hteam}
          awayTeam={game.ateam}
          prediction={prediction}
          squiggleTips={squiggleTips}
        />
      )}

      {/* Result summary for completed games */}
      {isComplete && game.winner && (
        <div className="mt-3 pt-3 border-t border-slate-700 text-center">
          <span className="text-emerald-400 font-semibold text-sm">
            {game.winner} won
          </span>
          {game.hscore !== null && game.ascore !== null && (
            <span className="text-slate-500 text-sm ml-2">
              by {Math.abs(game.hscore - game.ascore)} pts
            </span>
          )}
        </div>
      )}
      {isComplete && !game.winner && game.complete === 100 && (
        <div className="mt-3 pt-3 border-t border-slate-700 text-center">
          <span className="text-slate-400 text-sm">Draw</span>
        </div>
      )}
    </div>
  );
}
