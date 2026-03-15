import type { FormResult } from '@/lib/types';

interface Props {
  results: FormResult[];
}

const dotStyles: Record<FormResult, string> = {
  W: 'bg-emerald-500 text-white',
  L: 'bg-red-500 text-white',
  D: 'bg-slate-500 text-white',
};

export default function FormGuide({ results }: Props) {
  if (results.length === 0) {
    return <span className="text-slate-500 text-xs">No data</span>;
  }

  return (
    <div className="flex gap-1 items-center" aria-label="Recent form">
      {results.map((r, i) => (
        <span
          key={i}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${dotStyles[r]}`}
          title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
