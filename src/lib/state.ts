import { useSuspenseQuery } from '@tanstack/react-query';

import { getQueryClient } from '@/components/layout/provider-react-query';

export function createGlobalState<T>(queryKey: unknown, initialData: T) {
  return function () {
    const queryClient = getQueryClient();

    const { data } = useSuspenseQuery({
      queryKey: [queryKey],
      queryFn: () => Promise.resolve(initialData),
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchIntervalInBackground: false,
    });

    function setData(data: Partial<T>) {
      queryClient.setQueryData([queryKey], data);
    }

    function resetData() {
      queryClient.invalidateQueries({
        queryKey: [queryKey],
      });
      queryClient.refetchQueries({
        queryKey: [queryKey],
      });
    }

    return { data, setData, resetData };
  };
}
