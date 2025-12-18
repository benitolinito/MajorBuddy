import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string) => {
  const getMatches = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    const media = typeof window !== 'undefined' ? window.matchMedia(query) : null;
    if (!media) {
      setMatches(false);
      return;
    }

    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener('change', listener);
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
};
