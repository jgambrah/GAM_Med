
'use client';

import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state

  useEffect(() => {
    // This effect runs only once on the client after mount
    try {
      const item = window.localStorage.getItem(key);
      setStoredValue(item ? JSON.parse(item) : initialValue);
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      setStoredValue(initialValue);
    } finally {
      setIsLoading(false); // Set loading to false after attempting to load
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    if (typeof window === 'undefined') {
      console.warn(`Tried to set localStorage key “${key}” from the server.`);
      return;
    }

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [storedValue, setValue, isLoading];
}

export { useLocalStorage };
