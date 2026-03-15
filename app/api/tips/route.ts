import { NextRequest, NextResponse } from 'next/server';
import { getTips } from '@/lib/squiggle';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') ?? '2026', 10);
  const round = parseInt(searchParams.get('round') ?? '1', 10);

  const tips = await getTips(year, round);
  return NextResponse.json({ tips });
}
