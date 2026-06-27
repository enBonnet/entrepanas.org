import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute — fresh by default, lets Query manage cache
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
