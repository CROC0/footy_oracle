'use client';

import { useEffect, useState } from 'react';

interface Props {
  dateStr: string;
}

function format(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Perth',
  });
}

export default function GameDate({ dateStr }: Props) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(format(dateStr));
  }, [dateStr]);

  if (!formatted) return null;
  return <>{formatted} AWST</>;
}
