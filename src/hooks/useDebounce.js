import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value that delays updating
 * until `delay` milliseconds have elapsed since the last change.
 */
export function useDebounce(value, delay = 150) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
