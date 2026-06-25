import { useState, useEffect, useCallback } from 'react';
import { getStores } from '../api';
import { DEV_BYPASS_AUTH, MOCK_STORES } from '../dev';

export function useStores() {
  const [stores, setStores] = useState(DEV_BYPASS_AUTH ? MOCK_STORES : []);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!DEV_BYPASS_AUTH);

  const fetchStores = useCallback(async () => {
    if (DEV_BYPASS_AUTH) return;
    try {
      const data = await getStores();
      setStores(data);
      setError(null);
    } catch {
      setError('Failed to fetch stores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    fetchStores();
    const id = setInterval(fetchStores, 10000);
    return () => clearInterval(id);
  }, [fetchStores]);

  return { stores, setStores, error, setError, loading, fetchStores };
}
