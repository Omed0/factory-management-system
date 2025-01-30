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

  // Get the current query parameters as an object
  const getQueryParams = useMemo(() => {
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  const setQuery = useDebouncedCallback(
    (key: string, value: string | null, deleteArrayKeys?: string[]) => {
      // Start with the latest searchParams, not just the cached version
      const newSearchParams = new URLSearchParams(searchParams.toString());

      // Add or update query parameters
      if (value === null || value === '') {
        newSearchParams.delete(key); // Remove the query parameter if the value is null
      } else {
        newSearchParams.set(key, value); // Set the query parameter
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
    getQueryParams,
    cachedSearchParams,
    setQuery,
    pathname
  };
}
