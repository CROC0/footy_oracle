'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const SEASONS = [2026, 2025, 2024, 2023];

interface Props {
  currentYear: number;
}

export default function SeasonSelector({ currentYear }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setYear = (year: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(year));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 mb-6" role="tablist" aria-label="Season selector">
      {SEASONS.map((year) => (
        <button
          key={year}
          role="tab"
          aria-selected={year === currentYear}
          onClick={() => setYear(year)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            year === currentYear
              ? 'bg-gold-500 text-slate-900'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
