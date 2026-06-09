import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

// Simple GET hook with loading/error/refetch.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get(url)
      .then((r) => active && setData(r.data))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    const cancel = refetch();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch, setData };
}

// Loads the user-options list for assignee/manager dropdowns.
export function useUserOptions() {
  const { data } = useFetch('/users/options', []);
  return data || [];
}
