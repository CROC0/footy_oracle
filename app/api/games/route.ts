import { NextRequest, NextResponse } from 'next/server';
import { getGames } from '@/lib/squiggle';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') ?? '2026', 10);

  const games = await getGames(year);
  return NextResponse.json({ games });
}
