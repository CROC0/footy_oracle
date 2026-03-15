import type { Prediction, SquiggleTipSummary } from '@/lib/types';

interface Props {
  homeTeam: string;
  awayTeam: string;
  prediction: Prediction;
  squiggleTips?: SquiggleTipSummary;
}

function FactorBar({ label, homeScore, awayScore }: { label: string; homeScore: number; awayScore: number }) {
  const homePct = Math.round(homeScore * 100);
  const awayPct = Math.round(awayScore * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
        <span>{homePct}%</span>
        <span className="text-slate-500">{label}</span>
        <span>{awayPct}%</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-700">
        <div className="bg-gold-500 transition-all" style={{ width: `${homePct}%` }} />
        <div className="bg-slate-500 transition-all" style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  );
}

export default function PredictionPanel({ homeTeam, awayTeam, prediction, squiggleTips }: Props) {
  const homePct = Math.round(prediction.homeWinProbability * 100);
  const awayPct = Math.round(prediction.awayWinProbability * 100);

  return (
    <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
      {/* Main probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm font-semibold mb-1">
          <span className="text-gold-400">{homeTeam}: {homePct}%</span>
          <span className="text-slate-400">{awayTeam}: {awayPct}%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
          <div className="bg-gold-500 transition-all" style={{ width: `${homePct}%` }} />
          <div className="bg-slate-500 transition-all" style={{ width: `${awayPct}%` }} />
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="border-t border-slate-700 pt-2 mb-2">
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Prediction factors</p>
        <FactorBar
          label="Recent Form (40%)"
          homeScore={prediction.factors.recentForm.home}
          awayScore={prediction.factors.recentForm.away}
        />
        <FactorBar
          label="Elo Rating (45%)"
          homeScore={prediction.factors.elo.home}
          awayScore={prediction.factors.elo.away}
        />
        <FactorBar
          label="Home Advantage (15%)"
          homeScore={prediction.factors.homeAdvantage.home}
          awayScore={prediction.factors.homeAdvantage.away}
        />
      </div>

      {/* Squiggle community tips */}
      {squiggleTips && squiggleTips.tipCount > 0 && (
        <div className="border-t border-slate-700 pt-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Community models ({squiggleTips.tipCount} sources)
          </p>
          <div className="flex gap-2 text-xs">
            <span className="text-emerald-400">
              {squiggleTips.homeTips} tip {homeTeam}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              {squiggleTips.awayTips} tip {awayTeam}
            </span>
            {squiggleTips.homeConfidence !== null && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">
                  Avg confidence: {Math.round(squiggleTips.homeConfidence)}%
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
