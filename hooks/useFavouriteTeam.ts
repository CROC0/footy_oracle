'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'footy-oracle-favourite-team';

export function useFavouriteTeam() {
  const [favouriteTeam, setFavouriteTeamState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavouriteTeamState(stored);
    } catch {
      // localStorage unavailable (SSR / private browsing)
    }
  }, []);

  const setFavouriteTeam = (teamName: string | null) => {
    setFavouriteTeamState(teamName);
    try {
      if (teamName) {
        localStorage.setItem(STORAGE_KEY, teamName);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const isFavourite = (teamName: string) => teamName === favouriteTeam;

  return { favouriteTeam, setFavouriteTeam, isFavourite };
}
