import { useState, useEffect } from 'react';

/**
 * Hook para aplicar debounce a un valor
 * @param value - El valor a debouncear
 * @param delay - Tiempo de espera en milisegundos (default: 300ms)
 * @returns El valor debounceado
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
