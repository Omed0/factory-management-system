import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useMemo } from "react";

export default function useSetQuery(delay = 500) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Memoize the searchParams and pathname to prevent unnecessary recalculations
  const memoizedSearchParams = useMemo(() => searchParams.toString(), [searchParams]);
  const memoizedPathname = useMemo(() => pathname, [pathname]);

  const setQuery = useDebouncedCallback(
    (
      key: string,
      value: string,
      deleteArrayKeys?: string[]
    ) => {
      const newSearchParams = new URLSearchParams(memoizedSearchParams);

      if (key && value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }

      if (deleteArrayKeys && deleteArrayKeys.length) {
        deleteArrayKeys.forEach((item) => newSearchParams.delete(item));
      }

      replace(`${memoizedPathname}?${newSearchParams.toString()}`);
    },
    delay
  );

  return {
    searchParams,
    setQuery,
  };
}
