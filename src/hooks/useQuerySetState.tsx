import { QueryClient, useSuspenseQuery } from '@tanstack/react-query';

type QueryKey = string[];


export default function useQuerySetState<T>(queryKey: QueryKey, data?: T) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                enabled: queryKey.length > 0
            }
        }
    });

    !!data && queryClient.setQueryData(queryKey, data);

    const res = useSuspenseQuery<T>({
        queryKey: queryKey,

    })

    return { ...res, queryClient }
}

