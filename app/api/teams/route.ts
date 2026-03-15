import { NextResponse } from 'next/server';
import { getTeams } from '@/lib/squiggle';

export async function GET() {
  const teams = await getTeams();
  return NextResponse.json({ teams });
}
