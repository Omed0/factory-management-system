import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function useSetQuery(delay = 500) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // State to cache search parameters
  const [cachedSearchParams, setCachedSearchParams] = useState(searchParams.toString());

  // Keep cachedSearchParams in sync with actual searchParams
  useEffect(() => {
    setCachedSearchParams(searchParams.toString());
  }, [searchParams]);

  // Memoize the pathname to prevent unnecessary recalculations
  const memoizedPathname = useMemo(() => pathname, [pathname]);

  const setQuery = useDebouncedCallback(
    (key: string, value: string, deleteArrayKeys?: string[]) => {
      // Start with the latest searchParams, not just the cached version
      const newSearchParams = new URLSearchParams(searchParams.toString());

      if (key && value) {
        newSearchParams.set(key, value);
      } else if (key) {
        newSearchParams.delete(key);
      }

      if (deleteArrayKeys && deleteArrayKeys.length) {
        deleteArrayKeys.forEach((item) => newSearchParams.delete(item));
      }

      // Update cached search parameters
      setCachedSearchParams(newSearchParams.toString());

      // Push the new query to the URL
      replace(`${memoizedPathname}?${newSearchParams.toString()}`);
    },
    delay
  );

  return {
    searchParams,
    setQuery,
  };
}
