'use client';

interface Props {
  rounds: number[];
  currentRound: number;
  onSelect: (round: number) => void;
}

export default function RoundSelector({ rounds, currentRound, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1 mb-6" role="tablist" aria-label="Round selector">
      {rounds.map((r) => (
        <button
          key={r}
          role="tab"
          aria-selected={r === currentRound}
          onClick={() => onSelect(r)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            r === currentRound
              ? 'bg-gold-500 text-slate-900'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          R{r}
        </button>
      ))}
    </div>
  );
}
