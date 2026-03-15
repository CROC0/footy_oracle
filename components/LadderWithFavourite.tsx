'use client';

import { useFavouriteTeam } from '@/hooks/useFavouriteTeam';
import LadderTable from './LadderTable';
import type { LadderEntry, Game, SquiggleLadderEntry } from '@/lib/types';

interface Props {
  ladder: LadderEntry[];
  games: Game[];
  predictions?: SquiggleLadderEntry[];
}

export default function LadderWithFavourite({ ladder, games, predictions }: Props) {
  const { favouriteTeam } = useFavouriteTeam();
  return <LadderTable ladder={ladder} games={games} favouriteTeam={favouriteTeam} predictions={predictions} />;
}
