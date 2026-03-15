import type { Prediction, SquiggleTipSummary, GameOdds } from '@/lib/types';

// Edge threshold (pp) at which we flag a value bet
const VALUE_THRESHOLD = 0.08;

interface Props {
  homeTeam: string;
  awayTeam: string;
  prediction: Prediction;
  squiggleTips?: SquiggleTipSummary;
  odds?: GameOdds;
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

export default function PredictionPanel({ homeTeam, awayTeam, prediction, squiggleTips, odds }: Props) {
  const homePct = Math.round(prediction.homeWinProbability * 100);
  const awayPct = Math.round(prediction.awayWinProbability * 100);

  // Value detection: model edge over bookmaker normalised implied probability
  const homeEdge = odds ? prediction.homeWinProbability - odds.homeImpliedProb : 0;
  const awayEdge = odds ? prediction.awayWinProbability - odds.awayImpliedProb : 0;
  const homeValue = homeEdge >= VALUE_THRESHOLD;
  const awayValue = awayEdge >= VALUE_THRESHOLD;

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

      {/* Sportsbet odds + value indicator */}
      {odds && (
        <div className="border-t border-slate-700 pt-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            {odds.bookmaker} odds
          </p>
          <div className="flex justify-between items-center text-xs">
            {/* Home */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-slate-200">${odds.homeOdds.toFixed(2)}</span>
              <span className="text-slate-500">({Math.round(odds.homeImpliedProb * 100)}%)</span>
              {homeValue && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-semibold border border-emerald-500/30">
                  VALUE +{Math.round(homeEdge * 100)}pp
                </span>
              )}
            </div>
            {/* Away */}
            <div className="flex items-center gap-1.5">
              {awayValue && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-semibold border border-emerald-500/30">
                  VALUE +{Math.round(awayEdge * 100)}pp
                </span>
              )}
              <span className="text-slate-500">({Math.round(odds.awayImpliedProb * 100)}%)</span>
              <span className="font-mono text-slate-200">${odds.awayOdds.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
