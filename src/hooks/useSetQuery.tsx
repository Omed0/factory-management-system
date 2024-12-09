import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function useSetQuery(delay = 500) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // New state to cache search parameters
  const [cachedSearchParams, setCachedSearchParams] = useState(
    searchParams.toString()
  );

  // Memoize the searchParams and pathname to prevent unnecessary recalculations
  const memoizedSearchParams = useMemo(
    () => cachedSearchParams,
    [cachedSearchParams]
  );
  const memoizedPathname = useMemo(() => pathname, [pathname]);

  const setQuery = useDebouncedCallback(
    (key: string, value: string, deleteArrayKeys?: string[]) => {
      const newSearchParams = new URLSearchParams(memoizedSearchParams);

      if (key && value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }

      if (deleteArrayKeys && deleteArrayKeys.length) {
        deleteArrayKeys.forEach((item) => newSearchParams.delete(item));
      }

      // Update cached search parameters
      setCachedSearchParams(newSearchParams.toString());
      replace(`${memoizedPathname}?${newSearchParams.toString()}`);
    },
    delay
  );

  return {
    searchParams,
    setQuery,
  };
}
