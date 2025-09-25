
'use client';

import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // State to store our value. Initialize with a function to avoid running on server.
  const [storedValue, setStoredValue] = useState<T>(() => initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // This code only runs on the client-side, after the component has mounted.
    if (isMounted) {
        try {
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            setStoredValue(item ? JSON.parse(item) : initialValue);
        } catch (error) {
            // If error also return initialValue
            console.warn(`Error reading localStorage key “${key}”:`, error);
            setStoredValue(initialValue);
        }
    }
  // The dependency array should be stable. We only re-run this if the key changes,
  // which is a rare edge case but good practice.
  }, [key, isMounted, initialValue]);


  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    if (typeof window === 'undefined') {
        console.warn(`Tried to set localStorage key “${key}” from the server.`);
        return;
    }

    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };
  
  return [storedValue, setValue];
}

export { useLocalStorage };
